/**
 * Booking lifecycle (server side). Clients may only *create* pending bookings (rules-validated,
 * inside a transaction). Every later transition happens here with the Admin SDK.
 */
import { randomInt } from "node:crypto";
import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { adminAuth, db } from "../admin";

export const HOLD_MINUTES = 10; // unpaid holds are released after this
const IST_OFFSET_MIN = 330;

type BookingDoc = {
  groupId: string;
  groupSlots: string[];
  chargerId: string;
  chargerTitle: string;
  area: string;
  renterId: string;
  renterName: string;
  ownerId: string;
  date: string;
  slot: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: string;
  ratePerKwh: number;
  powerKw: number;
};

export const slotInstant = (date: string, slot: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) - IST_OFFSET_MIN) * 60_000);
};

export async function loadGroup(groupId: string) {
  const snap = await db.collection("bookings").where("groupId", "==", groupId).get();
  if (snap.empty) throw new HttpsError("not-found", "Booking not found.");
  const docs = snap.docs.map((d) => ({ ref: d.ref, data: d.data() as BookingDoc }));
  docs.sort((a, b) => a.data.slot.localeCompare(b.data.slot));
  return docs;
}

const pin4 = () => String(randomInt(0, 10_000)).padStart(4, "0");

/** Grant (or extend) the renter's access to the charger's private details until their slot ends. */
async function grantAccess(chargerId: string, renterId: string, ownerId: string, groupId: string, until: Timestamp) {
  const ref = db.doc(`renterAccess/${chargerId}_${renterId}`);
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const prev = cur.exists ? (cur.data()!.expiresAt as Timestamp) : null;
    tx.set(
      ref,
      {
        chargerId,
        renterId,
        ownerId,
        groupIds: FieldValue.arrayUnion(groupId),
        expiresAt: prev && prev.toMillis() > until.toMillis() ? prev : until,
        updatedAt: FieldValue.serverTimestamp(),
        ...(cur.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
  });
}

/** Remove the renter's access unless they still hold another live booking at this charger. */
export async function revokeAccessIfUnused(chargerId: string, renterId: string, exceptGroupId?: string) {
  const live = await db
    .collection("bookings")
    .where("renterId", "==", renterId)
    .where("chargerId", "==", chargerId)
    .where("status", "in", ["confirmed", "active"])
    .get();
  const now = Date.now();
  const stillLive = live.docs.some((d) => d.data().groupId !== exceptGroupId && (d.data().endAt as Timestamp).toMillis() > now);
  if (!stillLive) await db.doc(`renterAccess/${chargerId}_${renterId}`).delete();
}

/** Move a group out of `bookings` (freeing its slot IDs) into `bookingHistory`. */
async function archiveGroup(group: { ref: DocumentReference; data: BookingDoc }[], status: "cancelled" | "expired", by: string) {
  const { slot: _firstSlot, ...first } = group[0].data;
  const batch = db.batch();
  batch.set(db.doc(`bookingHistory/${first.groupId}`), {
    ...first,
    status,
    endAt: group[group.length - 1].data.endAt,
    closedBy: by,
    closedAt: FieldValue.serverTimestamp(),
  });
  for (const g of group) {
    batch.delete(g.ref);
    batch.delete(db.doc(`slots/${g.ref.id}`));
  }
  await batch.commit();
}

/**
 * Mock payment confirmation (Razorpay test mode would verify the payment signature here first).
 * pending -> confirmed, issues the 4-digit check-in PIN and grants address access.
 */
export const confirmBooking = onCall<{ groupId: string; paymentRef?: string }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const group = await loadGroup(String(req.data?.groupId ?? ""));
  const b = group[0].data;
  if (b.renterId !== req.auth.uid) throw new HttpsError("permission-denied", "Not your booking.");
  if (group.some((g) => g.data.status === "confirmed")) return { status: "confirmed" };
  if (group.some((g) => g.data.status !== "pending")) throw new HttpsError("failed-precondition", "Booking can't be confirmed.");

  const pin = pin4();
  const batch = db.batch();
  for (const g of group) {
    batch.update(g.ref, {
      status: "confirmed",
      pin,
      confirmedAt: FieldValue.serverTimestamp(),
      paymentRef: req.data.paymentRef ?? `mock_${Date.now().toString(36)}`,
    });
    batch.update(db.doc(`slots/${g.ref.id}`), { status: "booked" });
  }
  await batch.commit();
  await grantAccess(b.chargerId, b.renterId, b.ownerId, b.groupId, group[group.length - 1].data.endAt);
  return { status: "confirmed" };
});

/** Renter, host or admin cancels a booking that hasn't started. Frees the slots instantly. */
export const cancelBooking = onCall<{ groupId: string }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const group = await loadGroup(String(req.data?.groupId ?? ""));
  const b = group[0].data;
  const uid = req.auth.uid;
  if (uid !== b.renterId && uid !== b.ownerId && req.auth.token.admin !== true)
    throw new HttpsError("permission-denied", "Not your booking.");
  if (!group.every((g) => ["pending", "confirmed"].includes(g.data.status)))
    throw new HttpsError("failed-precondition", "Only upcoming bookings can be cancelled.");
  if (b.status === "confirmed" && b.startAt.toMillis() <= Date.now())
    throw new HttpsError("failed-precondition", "This booking has already started.");
  await archiveGroup(group, "cancelled", uid === b.renterId ? "renter" : uid === b.ownerId ? "host" : "admin");
  await revokeAccessIfUnused(b.chargerId, b.renterId, b.groupId);
  return { status: "cancelled" };
});

/**
 * Concurrency demo: a second user ("Rival Driver") tries to book the same slot at the same moment
 * as the caller, through an independent Admin-SDK transaction. Exactly one of the two can win.
 */
export const simulateRivalBooking = onCall<{ chargerId: string; date: string; slot: string }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { chargerId, date, slot } = req.data ?? ({} as never);
  if (!/^[\w-]+$/.test(chargerId ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d{4}$/.test(slot ?? ""))
    throw new HttpsError("invalid-argument", "Bad slot.");

  let rival;
  try {
    rival = await adminAuth.getUserByEmail("rival@demo.com");
  } catch {
    rival = await adminAuth.createUser({ email: "rival@demo.com", displayName: "Rival Driver", password: `r-${Date.now()}` });
  }

  const id = `${chargerId}_${date}_${slot}`;
  const charger = (await db.doc(`chargers/${chargerId}`).get()).data();
  if (!charger) throw new HttpsError("not-found", "Charger not found.");
  const start = slotInstant(date, slot);

  try {
    await db.runTransaction(async (tx) => {
      const lock = await tx.get(db.doc(`slots/${id}`));
      if (lock.exists) throw new Error("TAKEN");
      tx.create(db.doc(`bookings/${id}`), {
        groupId: id,
        groupSlots: [slot],
        chargerId,
        chargerTitle: charger.title,
        area: charger.area,
        renterId: rival!.uid,
        renterName: "Rival Driver",
        ownerId: charger.ownerId,
        date,
        slot,
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromMillis(start.getTime() + 30 * 60_000),
        status: "pending",
        ratePerKwh: charger.ratePerKwh,
        powerKw: charger.powerKw,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(db.doc(`slots/${id}`), { chargerId, date, slot, status: "held" });
    });
    return { won: true };
  } catch (e) {
    // tx.create() fails with ALREADY_EXISTS if the client's transaction committed first.
    const msg = (e as Error).message;
    if (msg === "TAKEN" || /ALREADY_EXISTS|already exists/i.test(msg)) return { won: false };
    throw e;
  }
});

/** Release unpaid holds so abandoned checkouts don't block slots. */
export async function releaseExpired() {
  const cutoff = Timestamp.fromMillis(Date.now() - HOLD_MINUTES * 60_000);
  const snap = await db.collection("bookings").where("status", "==", "pending").where("createdAt", "<", cutoff).get();
  const groups = new Set(snap.docs.map((d) => d.data().groupId as string));
  for (const g of groups) await archiveGroup(await loadGroup(g), "expired", "system");
  return groups.size;
}
export const releaseExpiredHolds = onSchedule({ schedule: "every 5 minutes", timeZone: "Asia/Kolkata" }, async () => {
  await releaseExpired();
});
