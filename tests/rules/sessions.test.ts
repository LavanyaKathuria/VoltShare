import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { makeEnv } from "./setup";

let env: RulesTestEnvironment;
beforeAll(async () => (env = await makeEnv()));
afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "renterAccess", "c1_riya"), { chargerId: "c1", renterId: "riya", ownerId: "hostA" });
    await setDoc(doc(db, "hostStats", "hostA"), { totalEarnings: 120 });
  });
});

describe("renterAccess grants", () => {
  it("a renter can check their own grant (existing or not) but never someone else's", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("riya").firestore(), "renterAccess", "c1_riya")));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("kabir").firestore(), "renterAccess", "c1_kabir"))); // not yet granted
    await assertFails(getDoc(doc(env.authenticatedContext("kabir").firestore(), "renterAccess", "c1_riya")));
  });
  it("nobody can forge a grant from the client", async () => {
    await assertFails(setDoc(doc(env.authenticatedContext("kabir").firestore(), "renterAccess", "c1_kabir"), { chargerId: "c1", renterId: "kabir", ownerId: "hostA" }));
  });
});

describe("earnings", () => {
  it("hosts read only their own stats and nobody writes them from the client", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("hostA", { host: true }).firestore(), "hostStats", "hostA")));
    await assertFails(getDoc(doc(env.authenticatedContext("hostB", { host: true }).firestore(), "hostStats", "hostA")));
    await assertFails(setDoc(doc(env.authenticatedContext("hostA", { host: true }).firestore(), "hostStats", "hostA"), { totalEarnings: 1e9 }));
    await assertFails(getDoc(doc(env.authenticatedContext("riya").firestore(), "platformStats", "global")));
  });
});
