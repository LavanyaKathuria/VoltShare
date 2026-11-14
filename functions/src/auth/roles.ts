/**
 * Role management. Roles live in two places:
 *  - Firebase Auth custom claims  -> what Security Rules trust (request.auth.token.host / .admin)
 *  - users/{uid}.roles            -> what the UI displays (clients can never write this field)
 * Only these Cloud Functions (Admin SDK) change either one.
 */
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { adminAuth, db } from "../admin";

export type Role = "renter" | "host" | "admin";
type Claims = { host?: boolean; admin?: boolean };

function requireAuth(req: CallableRequest) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return req.auth;
}

function requireAdmin(req: CallableRequest) {
  const a = requireAuth(req);
  if (a.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
  return a;
}

export function rolesFromClaims(c: Claims): Role[] {
  return ["renter", ...(c.host ? (["host"] as const) : []), ...(c.admin ? (["admin"] as const) : [])];
}

/** Merge claims, mirror them onto users/{uid}, and bump claimsUpdatedAt so open clients refresh their ID token. */
export async function applyClaims(uid: string, patch: Claims, extra: Record<string, unknown> = {}) {
  const user = await adminAuth.getUser(uid);
  const claims: Claims = { ...(user.customClaims as Claims | undefined), ...patch };
  await adminAuth.setCustomUserClaims(uid, claims);
  await db.doc(`users/${uid}`).set(
    {
      roles: rolesFromClaims(claims),
      claimsUpdatedAt: FieldValue.serverTimestamp(),
      ...extra,
    },
    { merge: true },
  );
  return claims;
}

/** Any signed-in user can opt in to hosting. Verification is a separate admin step. */
export const becomeHost = onCall(async (req) => {
  const { uid } = requireAuth(req);
  const claims = await applyClaims(uid, { host: true });
  return { roles: rolesFromClaims(claims) };
});

/** Admin: grant/revoke host or admin, and/or mark a host as verified. */
export const adminSetUserRoles = onCall(
  async (req: CallableRequest<{ uid: string; host?: boolean; admin?: boolean; verifiedHost?: boolean }>) => {
    const caller = requireAdmin(req);
    const { uid, host, admin, verifiedHost } = req.data ?? ({} as never);
    if (typeof uid !== "string" || !uid) throw new HttpsError("invalid-argument", "uid is required.");
    if (uid === caller.uid && admin === false) throw new HttpsError("failed-precondition", "You can't remove your own admin role.");

    const patch: Claims = {};
    if (typeof host === "boolean") patch.host = host;
    if (typeof admin === "boolean") patch.admin = admin;
    const extra: Record<string, unknown> = {};
    if (typeof verifiedHost === "boolean") extra.verifiedHost = verifiedHost;
    if (patch.host === false) extra.verifiedHost = false;

    const claims = await applyClaims(uid, patch, extra);

    // Keep the verified badge on the host's listings in sync (denormalised for public cards).
    if ("verifiedHost" in extra) {
      const snap = await db.collection("chargers").where("ownerId", "==", uid).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.update(d.ref, { hostVerified: extra.verifiedHost }));
      if (!snap.empty) await batch.commit();
    }
    return { roles: rolesFromClaims(claims) };
  },
);
