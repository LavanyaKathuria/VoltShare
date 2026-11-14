/**
 * Self check-in / check-out and billing.
 *  checkIn   (callable)  PIN + time window + ≤100 m geofence  -> status "active", charger pin turns amber
 *  checkOut  (callable)  validated kWh reading (+ meter photo) -> status "completed", access revoked
 *  billOnComplete (Firestore trigger) computes kWh × rate + 15 % fee and aggregates host earnings
 *  revokeExpiredAccess (scheduled) deletes renterAccess grants whose slot has ended
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../admin";
import { loadGroup, revokeAccessIfUnused } from "./index";

export const GEOFENCE_M = 100;
export const PLATFORM_FEE = 0.15;
const EARLY_CHECKIN_MIN = 10;
const MAX_SESSION_KWH = 100;

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const dayKeyIST = (d = new Date()) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);

export const checkIn = onCall<{ groupId: string; pin: string; lat: number; lng: number; accuracy?: number }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { groupId, pin, lat, lng } = req.data ?? ({} as never);
  if (typeof lat !== "number" || typeof lng !== "number") throw new HttpsError("invalid-argument", "Location is required to check in.");

  const group = await loadGroup(String(groupId ?? ""));
  const b = group[0].data;
  if (b.renterId !== req.auth.uid) throw new HttpsError("permission-denied", "Not your booking.");
  if (b.status === "active") return { status: "active" };
  if (b.status !== "confirmed") throw new HttpsError("failed-precondition", "Only confirmed bookings can be checked in.");

  const now = Date.now();
  const start = b.startAt.toMillis();
  const end = group[group.length - 1].data.endAt.toMillis();
  if (now < start - EARLY_CHECKIN_MIN * 60_000) throw new HttpsError("failed-precondition", `Check-in opens ${EARLY_CHECKIN_MIN} minutes before your slot.`);
  if (now >= end) throw new HttpsError("failed-precondition", "Your booked slot has ended.");

  const bookingPin = (group[0].data as unknown as { pin?: string }).pin;
  if (!bookingPin || String(pin) !== bookingPin) throw new HttpsError("permission-denied", "Incorrect PIN.");

  const details = (await db.doc(`chargers/${b.chargerId}/private/details`).get()).data();
  if (!details) throw new HttpsError("failed-precondition", "Charger location unavailable.");
  const dist = haversineM({ lat, lng }, { lat: details.exactLat, lng: details.exactLng });
  if (dist > GEOFENCE_M)
    throw new HttpsError("failed-precondition", `You're ${Math.round(dist)} m away — get within ${GEOFENCE_M} m of the charger to check in.`);

  const batch = db.batch();
  for (const g of group)
    batch.update(g.ref, { status: "active", checkedInAt: FieldValue.serverTimestamp(), checkInDistanceM: Math.round(dist) });
  batch.update(db.doc(`chargers/${b.chargerId}`), { liveStatus: "charging", updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { status: "active", distanceM: Math.round(dist) };
});

export const checkOut = onCall<{ groupId: string; kwh: number; photoPath?: string }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const { groupId, kwh, photoPath } = req.data ?? ({} as never);
  const group = await loadGroup(String(groupId ?? ""));
  const b = group[0].data;
  if (b.renterId !== req.auth.uid) throw new HttpsError("permission-denied", "Not your booking.");
  if (b.status === "completed") return { status: "completed" };
  if (b.status !== "active") throw new HttpsError("failed-precondition", "Check in before checking out.");

  // Sanity bound: can't draw more than the charger's rated power over the booked time (+10 % slack).
  const bookedHours = group.length / 2;
  const maxKwh = Math.min(MAX_SESSION_KWH, b.powerKw * bookedHours * 1.1 + 0.5);
  if (typeof kwh !== "number" || !isFinite(kwh) || kwh <= 0 || kwh > maxKwh)
    throw new HttpsError("invalid-argument", `Enter a reading between 0 and ${maxKwh.toFixed(1)} kWh.`);
  if (photoPath !== undefined && !String(photoPath).startsWith(`checkout/${req.auth.uid}/${b.groupId}/`))
    throw new HttpsError("invalid-argument", "Bad photo path.");

  const batch = db.batch();
  for (const g of group)
    batch.update(g.ref, {
      status: "completed",
      checkedOutAt: FieldValue.serverTimestamp(),
      // The reading belongs to the whole session; it's stored on the primary doc (id == groupId).
      ...(g.ref.id === b.groupId ? { kwh: round2(kwh), meterPhotoPath: photoPath ?? null } : {}),
    });
  batch.update(db.doc(`chargers/${b.chargerId}`), { liveStatus: "available", updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  await revokeAccessIfUnused(b.chargerId, b.renterId, b.groupId);
  return { status: "completed" };
});

/**
 * Billing + host earnings, computed server-side when a session's primary doc becomes "completed".
 * Runs in a transaction guarded by `billedAt`, so retries/duplicate events never double-count.
 */
export const billOnComplete = onDocumentUpdated("bookings/{bookingId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (event.params.bookingId !== after.groupId) return; // primary doc only
  if (before.status === "completed" || after.status !== "completed") return;

  const ref = event.data!.after.ref;
  await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const d = cur.data()!;
    if (d.billedAt) return;
    const kwh = Number(d.kwh ?? 0);
    const energyCost = round2(kwh * d.ratePerKwh);
    const platformFee = round2(energyCost * PLATFORM_FEE);
    const amount = round2(energyCost + platformFee);
    tx.update(ref, { energyCost, platformFee, amount, hostEarning: energyCost, billedAt: FieldValue.serverTimestamp() });

    const day = dayKeyIST((d.checkedOutAt as Timestamp | undefined)?.toDate() ?? new Date());
    tx.set(
      db.doc(`hostStats/${d.ownerId}`),
      {
        ownerId: d.ownerId,
        totalEarnings: FieldValue.increment(energyCost),
        totalKwh: FieldValue.increment(kwh),
        sessions: FieldValue.increment(1),
        byDay: { [day]: FieldValue.increment(energyCost) },
        byCharger: { [d.chargerId]: FieldValue.increment(energyCost) },
        lastSessionAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(
      db.doc("platformStats/global"),
      { platformRevenue: FieldValue.increment(platformFee), totalKwh: FieldValue.increment(kwh), sessions: FieldValue.increment(1) },
      { merge: true },
    );
  });
});

/** Privacy: address/gate-code access ends when the renter's slot ends. */
export async function revokeExpired() {
  const snap = await db.collection("renterAccess").where("expiresAt", "<", Timestamp.now()).get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
  return snap.size;
}

/**
 * Sessions the renter forgot to check out of are closed 30 min after the slot ends, billed at the
 * estimated energy (rated power × 90 % × booked time) and flagged `autoClosed` for host/admin review.
 * The billing trigger then runs exactly as for a normal check-out.
 */
export async function closeStaleSessions() {
  const cutoff = Timestamp.fromMillis(Date.now() - 30 * 60_000);
  const snap = await db.collection("bookings").where("status", "==", "active").where("endAt", "<", cutoff).get();
  const groups = new Set(snap.docs.map((d) => d.data().groupId as string));
  for (const gid of groups) {
    const group = await loadGroup(gid);
    const b = group[0].data;
    if (!group.every((g) => g.data.endAt.toMillis() < cutoff.toMillis())) continue;
    const kwh = round2(Math.min(40, b.powerKw * 0.9 * (group.length / 2)));
    const batch = db.batch();
    for (const g of group)
      batch.update(g.ref, {
        status: "completed",
        autoClosed: true,
        checkedOutAt: FieldValue.serverTimestamp(),
        ...(g.ref.id === b.groupId ? { kwh, meterPhotoPath: null } : {}),
      });
    batch.update(db.doc(`chargers/${b.chargerId}`), { liveStatus: "available", updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    await revokeAccessIfUnused(b.chargerId, b.renterId, b.groupId);
  }
  return groups.size;
}

export const revokeExpiredAccess = onSchedule({ schedule: "every 10 minutes", timeZone: "Asia/Kolkata" }, async () => {
  await revokeExpired();
  await closeStaleSessions();
});
