import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { makeEnv } from "./setup";

let env: RulesTestEnvironment;
beforeAll(async () => (env = await makeEnv()));
afterAll(async () => env.cleanup());
beforeEach(async () => env.clearFirestore());

const renterProfile = () => ({
  name: "Riya",
  email: "riya@x.com",
  photo: null,
  roles: ["renter"],
  verifiedHost: false,
  createdAt: serverTimestamp(),
});

async function seedProfile(uid: string, extra: Record<string, unknown> = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", uid), { ...renterProfile(), ...extra });
  });
}

describe("users/{uid}", () => {
  it("a user can create their own plain renter profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "users", "alice"), renterProfile()));
  });

  it("a user cannot self-assign host/admin roles on create", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users", "alice"), { ...renterProfile(), roles: ["renter", "admin"] }));
    await assertFails(setDoc(doc(db, "users", "alice"), { ...renterProfile(), verifiedHost: true }));
  });

  it("a user cannot create someone else's profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users", "bob"), renterProfile()));
  });

  it("owner can rename but cannot escalate roles or verification", async () => {
    await seedProfile("alice");
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(updateDoc(doc(db, "users", "alice"), { name: "Alice R" }));
    await assertFails(updateDoc(doc(db, "users", "alice"), { roles: ["renter", "host"] }));
    await assertFails(updateDoc(doc(db, "users", "alice"), { verifiedHost: true }));
  });

  it("profiles are private: other users can't read them, admins can", async () => {
    await seedProfile("alice");
    await assertFails(getDoc(doc(env.authenticatedContext("bob").firestore(), "users", "alice")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users", "alice")));
    await assertSucceeds(getDoc(doc(env.authenticatedContext("boss", { admin: true }).firestore(), "users", "alice")));
  });

  it("a forged roles field in the doc grants nothing — only token claims count", async () => {
    await seedProfile("mallory", { roles: ["renter", "admin"] });
    await seedProfile("alice");
    const db = env.authenticatedContext("mallory").firestore();
    await assertFails(getDoc(doc(db, "users", "alice")));
  });
});
