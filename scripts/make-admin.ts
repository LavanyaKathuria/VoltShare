/**
 * Give an existing account the admin (and host) role — e.g. your own Google account.
 *   npm run make-admin -- you@example.com                                     (emulators)
 *   npm run make-admin -- you@example.com --prod --project <id> --key <sa.json> --yes
 * The user must have signed in to the app once first. They'll see the change instantly
 * (the app refreshes its ID token when users/{uid}.claimsUpdatedAt changes).
 */
import { FieldValue } from "firebase-admin/firestore";
import { auth, db, positional, projectId } from "./_admin";

async function main() {
  const email = positional[0];
  if (!email) throw new Error("Usage: npm run make-admin -- <email> [--prod --project <id> --key <sa.json> --yes]");
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}), host: true, admin: true };
  await auth.setCustomUserClaims(user.uid, claims);
  await db.doc(`users/${user.uid}`).set(
    { roles: ["renter", "host", "admin"], verifiedHost: true, claimsUpdatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log(`✓ ${email} is now admin + verified host on ${projectId}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
