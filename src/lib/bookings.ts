import { db, functions } from "@/lib/firebase/client";
import { bookingId, slotEnd, slotStart } from "@/lib/time";
import type { Charger } from "@/types";
import { doc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export class SlotTakenError extends Error {
  constructor(public slot: string) {
    super("Slot just taken!");
  }
}

/**
 * Atomically books one or more contiguous 30-min slots.
 * 1. Reads every slot's public lock doc inside the transaction — if any exists, abort.
 * 2. Writes bookings/{chargerId_date_HHmm} + slots/{same id} for every slot.
 * Firestore transactions are optimistic: if another client commits any of these docs between our
 * read and our commit, our commit is rejected and retried, the retry sees the lock, and we throw
 * SlotTakenError. Security rules additionally refuse to create a booking whose ID already exists.
 */
export async function bookSlots(c: Charger, date: string, slots: string[], renter: { uid: string; name: string }) {
  const sorted = [...slots].sort();
  const groupId = bookingId(c.id, date, sorted[0]);
  await runTransaction(db, async (tx) => {
    const locks = await Promise.all(sorted.map((s) => tx.get(doc(db, "slots", bookingId(c.id, date, s)))));
    const taken = locks.findIndex((l) => l.exists());
    if (taken !== -1) throw new SlotTakenError(sorted[taken]);

    for (const s of sorted) {
      const id = bookingId(c.id, date, s);
      tx.set(doc(db, "bookings", id), {
        groupId,
        groupSlots: sorted,
        chargerId: c.id,
        chargerTitle: c.title,
        area: c.area,
        renterId: renter.uid,
        renterName: renter.name,
        ownerId: c.ownerId,
        date,
        slot: s,
        startAt: Timestamp.fromDate(slotStart(date, s)),
        endAt: Timestamp.fromDate(slotEnd(date, s)),
        status: "pending",
        ratePerKwh: c.ratePerKwh,
        powerKw: c.powerKw,
        createdAt: serverTimestamp(),
      });
      tx.set(doc(db, "slots", id), { chargerId: c.id, date, slot: s, status: "held" });
    }
  });
  return groupId;
}

export const confirmBooking = (groupId: string, paymentRef?: string) =>
  httpsCallable<{ groupId: string; paymentRef?: string }, { status: string }>(functions, "confirmBooking")({ groupId, paymentRef });

export const cancelBooking = (groupId: string) =>
  httpsCallable<{ groupId: string }, { status: string }>(functions, "cancelBooking")({ groupId });

export const simulateRival = (chargerId: string, date: string, slot: string) =>
  httpsCallable<{ chargerId: string; date: string; slot: string }, { won: boolean }>(functions, "simulateRivalBooking")({ chargerId, date, slot });

export function friendlyBookingError(e: unknown) {
  if (e instanceof SlotTakenError) return "Slot just taken! Pick another time.";
  const code = (e as { code?: string })?.code ?? "";
  if (code === "permission-denied") return "That slot can't be booked (it may have just been taken or is outside opening hours).";
  if (code === "failed-precondition" || code === "aborted") return "Slot just taken! Pick another time.";
  return (e as Error)?.message ?? "Booking failed.";
}
