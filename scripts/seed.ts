/**
 * Seeds demo data. By default targets the local Emulator Suite (safe).
 *   npm run seed                 -> emulators (start them first: npm run emulators)
 *   SEED_PROD=1 npm run seed     -> real project, using GOOGLE_APPLICATION_CREDENTIALS
 *
 * Phase 2: demo accounts + roles. Chargers are added in a later phase.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROD = process.env.SEED_PROD === "1";
const projectId = process.env.FIREBASE_PROJECT_ID || "demo-voltshare";
if (!PROD) {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

export const DEMO_PASSWORD = "demo1234";
const DEMO_USERS = [
  { email: "renter@demo.com", name: "Riya Sharma", claims: {}, verifiedHost: false },
  { email: "host@demo.com", name: "Arjun Mehta", claims: { host: true }, verifiedHost: true },
  { email: "admin@demo.com", name: "Admin", claims: { host: true, admin: true }, verifiedHost: true },
] as const;

async function upsertUser(email: string, name: string) {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { displayName: name, password: DEMO_PASSWORD });
    return u.uid;
  } catch {
    const u = await auth.createUser({ email, password: DEMO_PASSWORD, displayName: name, emailVerified: true });
    return u.uid;
  }
}

async function seedUsers() {
  const uids: Record<string, string> = {};
  for (const d of DEMO_USERS) {
    const uid = await upsertUser(d.email, d.name);
    await auth.setCustomUserClaims(uid, d.claims);
    const c = d.claims as { host?: boolean; admin?: boolean };
    await db.doc(`users/${uid}`).set(
      {
        name: d.name,
        email: d.email,
        photo: null,
        roles: ["renter", ...(c.host ? ["host"] : []), ...(c.admin ? ["admin"] : [])],
        verifiedHost: d.verifiedHost,
        createdAt: FieldValue.serverTimestamp(),
        claimsUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    uids[d.email] = uid;
    console.log(`  ✓ ${d.email.padEnd(18)} ${uid}`);
  }
  return uids;
}

async function main() {
  console.log(`Seeding ${PROD ? "PRODUCTION project " + projectId : "emulators (" + projectId + ")"}…`);
  await seedUsers();
  console.log(`Done. Demo password: ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
