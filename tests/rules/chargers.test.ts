import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { makeEnv } from "./setup";

let env: RulesTestEnvironment;
beforeAll(async () => (env = await makeEnv()));
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const HOST = { host: true };
const charger = (ownerId: string, extra: Record<string, unknown> = {}) => ({
  ownerId,
  hostName: "Arjun",
  hostPhoto: null,
  hostVerified: false,
  title: "Sunny driveway",
  description: "",
  photos: [],
  connector: "TYPE2",
  powerKw: 7.4,
  ratePerKwh: 14,
  accessType: "PUBLIC_DRIVEWAY",
  rules: [],
  openTime: "08:00",
  closeTime: "22:00",
  approxLat: 12.97,
  approxLng: 77.64,
  geohash: "tdr1y",
  area: "Indiranagar",
  city: "Bengaluru",
  online: true,
  liveStatus: "available",
  meterVerified: false,
  rating: 0,
  reviewCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...extra,
});
const details = { address: "#214, 12th Main", exactLat: 12.9784, exactLng: 77.6408, accessNotes: "Gate code 4821" };

async function seed(fn: (db: ReturnType<ReturnType<RulesTestEnvironment["authenticatedContext"]>["firestore"]>) => Promise<unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as never);
  });
}
async function seedCharger(id = "c1", owner = "hostA", extra: Record<string, unknown> = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, "users", owner), { name: "Arjun", roles: ["renter", "host"], verifiedHost: false });
    await setDoc(doc(db, "chargers", id), charger(owner, extra));
    await setDoc(doc(db, "chargers", id, "private", "details"), details);
  });
}

describe("public charger listings", () => {
  it("anyone, even signed out, can read a listing", async () => {
    await seedCharger();
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), "chargers", "c1")));
  });

  it("a host can create a listing + private details in one batch", async () => {
    await seed((db) => setDoc(doc(db, "users", "hostA"), { name: "Arjun", roles: ["renter", "host"], verifiedHost: false }));
    const db = env.authenticatedContext("hostA", HOST).firestore();
    const b = writeBatch(db);
    b.set(doc(db, "chargers", "new1"), charger("hostA"));
    b.set(doc(db, "chargers", "new1", "private", "details"), details);
    await assertSucceeds(b.commit());
  });

  it("a renter (no host claim) cannot create a listing", async () => {
    await seed((db) => setDoc(doc(db, "users", "riya"), { name: "Riya", roles: ["renter"], verifiedHost: false }));
    const db = env.authenticatedContext("riya").firestore();
    await assertFails(setDoc(doc(db, "chargers", "x"), charger("riya")));
  });

  it("a host cannot create a listing for someone else or award themselves badges", async () => {
    await seed((db) => setDoc(doc(db, "users", "hostA"), { name: "Arjun", roles: ["renter", "host"], verifiedHost: false }));
    const db = env.authenticatedContext("hostA", HOST).firestore();
    await assertFails(setDoc(doc(db, "chargers", "x1"), charger("hostB")));
    await assertFails(setDoc(doc(db, "chargers", "x2"), charger("hostA", { hostVerified: true })));
    await assertFails(setDoc(doc(db, "chargers", "x3"), charger("hostA", { meterVerified: true })));
    await assertFails(setDoc(doc(db, "chargers", "x4"), charger("hostA", { rating: 5, reviewCount: 200 })));
  });

  it("rejects invalid listing data (rate out of range)", async () => {
    await seed((db) => setDoc(doc(db, "users", "hostA"), { name: "Arjun", roles: ["renter", "host"], verifiedHost: false }));
    const db = env.authenticatedContext("hostA", HOST).firestore();
    await assertFails(setDoc(doc(db, "chargers", "x5"), charger("hostA", { ratePerKwh: 500 })));
  });

  it("owner can edit details & go offline, but not ownership, rating or meter badge", async () => {
    await seedCharger();
    const db = env.authenticatedContext("hostA", HOST).firestore();
    await assertSucceeds(updateDoc(doc(db, "chargers", "c1"), { online: false, ratePerKwh: 15 }));
    await assertFails(updateDoc(doc(db, "chargers", "c1"), { ownerId: "someoneElse" }));
    await assertFails(updateDoc(doc(db, "chargers", "c1"), { rating: 5 }));
    await assertFails(updateDoc(doc(db, "chargers", "c1"), { meterVerified: true }));
  });

  it("another host cannot edit or delete my listing", async () => {
    await seedCharger();
    const db = env.authenticatedContext("hostB", HOST).firestore();
    await assertFails(updateDoc(doc(db, "chargers", "c1"), { ratePerKwh: 5 }));
    await assertFails(deleteDoc(doc(db, "chargers", "c1")));
  });

  it("admin can moderate (offline / meter verified) but not rewrite the listing", async () => {
    await seedCharger();
    const db = env.authenticatedContext("boss", { admin: true }).firestore();
    await assertSucceeds(updateDoc(doc(db, "chargers", "c1"), { meterVerified: true, online: false }));
    await assertFails(updateDoc(doc(db, "chargers", "c1"), { ratePerKwh: 49 }));
  });
});

describe("private details (exact address, gate code)", () => {
  it("a renter cannot read private details without a booking", async () => {
    await seedCharger();
    await assertFails(getDoc(doc(env.authenticatedContext("riya").firestore(), "chargers", "c1", "private", "details")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "chargers", "c1", "private", "details")));
  });

  it("a renter with a renterAccess grant can read them", async () => {
    await seedCharger();
    await seed((db) => setDoc(doc(db, "renterAccess", "c1_riya"), { renterId: "riya", ownerId: "hostA", chargerId: "c1" }));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("riya").firestore(), "chargers", "c1", "private", "details")));
  });

  it("a grant for one renter does not leak to another", async () => {
    await seedCharger();
    await seed((db) => setDoc(doc(db, "renterAccess", "c1_riya"), { renterId: "riya", ownerId: "hostA", chargerId: "c1" }));
    await assertFails(getDoc(doc(env.authenticatedContext("kabir").firestore(), "chargers", "c1", "private", "details")));
  });

  it("the host and admins can read them; other hosts cannot write them", async () => {
    await seedCharger();
    await assertSucceeds(getDoc(doc(env.authenticatedContext("hostA", HOST).firestore(), "chargers", "c1", "private", "details")));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("boss", { admin: true }).firestore(), "chargers", "c1", "private", "details")));
    await assertFails(setDoc(doc(env.authenticatedContext("hostB", HOST).firestore(), "chargers", "c1", "private", "details"), details));
  });

  it("clients can never write renterAccess grants (Cloud Functions only)", async () => {
    await seedCharger();
    const db = env.authenticatedContext("riya").firestore();
    await assertFails(setDoc(doc(db, "renterAccess", "c1_riya"), { renterId: "riya", ownerId: "hostA", chargerId: "c1" }));
  });
});
