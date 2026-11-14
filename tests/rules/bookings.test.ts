import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch, type Firestore } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeEnv } from "./setup";

let env: RulesTestEnvironment;
beforeAll(async () => (env = await makeEnv()));
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const base = { ownerId: "hostA", title: "Driveway", area: "Indiranagar", online: true, ratePerKwh: 14, powerKw: 7.4, openTime: "08:00", closeTime: "22:00" };
    await setDoc(doc(db, "chargers", "c1"), base);
    await setDoc(doc(db, "chargers", "off"), { ...base, online: false });
  });
});

// Tomorrow in IST, so slots are always in the future.
const DATE = new Date(Date.now() + 330 * 60_000 + 86_400_000).toISOString().slice(0, 10);
const start = (slot: string) => {
  const [y, m, d] = DATE.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + (Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) - 330) * 60_000);
};
const id = (slot: string, charger = "c1") => `${charger}_${DATE}_${slot}`;

function booking(renterId: string, slot: string, group = [slot], extra: Record<string, unknown> = {}) {
  const charger = (extra.chargerId as string) ?? "c1";
  return {
    groupId: id(group[0], charger),
    groupSlots: group,
    chargerId: charger,
    chargerTitle: "Driveway",
    area: "Indiranagar",
    renterId,
    renterName: "Riya",
    ownerId: "hostA",
    date: DATE,
    slot,
    startAt: Timestamp.fromDate(start(slot)),
    endAt: Timestamp.fromDate(new Date(start(slot).getTime() + 30 * 60_000)),
    status: "pending",
    ratePerKwh: 14,
    powerKw: 7.4,
    createdAt: serverTimestamp(),
    ...extra,
  };
}

/** The same writes the app's transaction makes. */
function bookBatch(db: Firestore, renterId: string, slots: string[], extra: Record<string, unknown> = {}) {
  const b = writeBatch(db);
  const charger = (extra.chargerId as string) ?? "c1";
  for (const s of slots) {
    b.set(doc(db, "bookings", id(s, charger)), booking(renterId, s, slots, extra));
    b.set(doc(db, "slots", id(s, charger)), { chargerId: charger, date: DATE, slot: s, status: "held" });
  }
  return b.commit();
}

const riya = () => env.authenticatedContext("riya").firestore();
const kabir = () => env.authenticatedContext("kabir").firestore();

describe("creating bookings", () => {
  it("a renter can book a free slot (booking + public lock together)", async () => {
    await assertSucceeds(bookBatch(riya(), "riya", ["1000"]));
  });

  it("a multi-slot booking (8 × 30 min) is written atomically", async () => {
    await assertSucceeds(bookBatch(riya(), "riya", ["1000", "1030", "1100", "1130", "1200", "1230", "1300", "1330"]));
  });

  it("works inside a real client transaction", async () => {
    const db = riya();
    await assertSucceeds(
      runTransaction(db, async (tx) => {
        const lock = await tx.get(doc(db, "slots", id("1500")));
        expect(lock.exists()).toBe(false);
        tx.set(doc(db, "bookings", id("1500")), booking("riya", "1500"));
        tx.set(doc(db, "slots", id("1500")), { chargerId: "c1", date: DATE, slot: "1500", status: "held" });
      }),
    );
  });

  it("NOBODY can create a booking for a slot that is already taken", async () => {
    await bookBatch(riya(), "riya", ["1000"]);
    await assertFails(bookBatch(kabir(), "kabir", ["1000"])); // another renter
    await assertFails(bookBatch(riya(), "riya", ["1000"])); // even the same renter can't overwrite it
    await assertFails(bookBatch(kabir(), "kabir", ["0930", "1000"])); // nor sneak it into a multi-slot booking
  });

  it("a renter cannot write a booking in someone else's name", async () => {
    await assertFails(bookBatch(riya(), "kabir", ["1100"]));
  });

  it("a renter cannot modify or delete another user's (or their own) booking directly", async () => {
    await bookBatch(kabir(), "kabir", ["1100"]);
    await assertFails(updateDoc(doc(riya(), "bookings", id("1100")), { status: "cancelled" }));
    await assertFails(deleteDoc(doc(riya(), "bookings", id("1100"))));
    await assertFails(updateDoc(doc(kabir(), "bookings", id("1100")), { status: "confirmed", pin: "0000" }));
    await assertFails(deleteDoc(doc(kabir(), "slots", id("1100"))));
  });

  it("can't self-confirm, fake the price, book your own charger, or book offline chargers", async () => {
    await assertFails(bookBatch(riya(), "riya", ["1200"], { status: "confirmed" }));
    await assertFails(bookBatch(riya(), "riya", ["1200"], { ratePerKwh: 1 }));
    await assertFails(bookBatch(env.authenticatedContext("hostA", { host: true }).firestore(), "hostA", ["1200"]));
    await assertFails(bookBatch(riya(), "riya", ["1200"], { chargerId: "off" }));
  });

  it("can't book outside opening hours, in the past, or with a mismatched doc ID / timestamps", async () => {
    await assertFails(bookBatch(riya(), "riya", ["2200"])); // closes 22:00
    await assertFails(bookBatch(riya(), "riya", ["0700"])); // opens 08:00
    await assertFails(bookBatch(riya(), "riya", ["1000"], { startAt: Timestamp.fromDate(start("1400")) }));
    const yesterday = new Date(Date.now() + 330 * 60_000 - 86_400_000).toISOString().slice(0, 10);
    await assertFails(bookBatch(riya(), "riya", ["1000"], { date: yesterday }));
  });

  it("can't create a slot lock without its booking (no griefing slots)", async () => {
    await assertFails(setDoc(doc(riya(), "slots", id("1600")), { chargerId: "c1", date: DATE, slot: "1600", status: "held" }));
  });
});

describe("reading bookings", () => {
  it("renter and host can read a booking; other users cannot; slot locks are public", async () => {
    await bookBatch(riya(), "riya", ["1000"]);
    await assertSucceeds(getDoc(doc(riya(), "bookings", id("1000"))));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("hostA", { host: true }).firestore(), "bookings", id("1000"))));
    await assertFails(getDoc(doc(kabir(), "bookings", id("1000"))));
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "slots", id("1000"))));
  });
});
