"use client";

import { auth, db, functions } from "@/lib/firebase/client";
import type { Role, UserProfile } from "@/types";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type Claims = { host: boolean; admin: boolean };

type AuthCtx = {
  user: User | null;
  profile: UserProfile | null;
  claims: Claims;
  roles: Role[];
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  becomeHost: () => Promise<void>;
  refreshClaims: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
const NO_CLAIMS: Claims = { host: false, admin: false };

/** Create users/{uid} on first sign-in. Rules only allow a plain renter profile. */
const ensured = new Map<string, Promise<void>>();
function ensureProfile(u: User, nameOverride?: string) {
  if (!ensured.has(u.uid)) ensured.set(u.uid, createProfileIfMissing(u, nameOverride).catch((e) => { ensured.delete(u.uid); throw e; }));
  return ensured.get(u.uid)!;
}
async function createProfileIfMissing(u: User, nameOverride?: string) {
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    name: (nameOverride || u.displayName || u.email?.split("@")[0] || "EV driver").slice(0, 80),
    email: u.email,
    photo: u.photoURL,
    roles: ["renter"],
    verifiedHost: false,
    createdAt: serverTimestamp(),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [claims, setClaims] = useState<Claims>(NO_CLAIMS);
  const [loading, setLoading] = useState(true);
  const pendingName = useRef<string | undefined>(undefined);
  const lastClaimsStamp = useRef<number | null>(null);

  const readClaims = useCallback(async (u: User, force = false) => {
    const t = await u.getIdTokenResult(force);
    setClaims({ host: t.claims.host === true, admin: t.claims.admin === true });
  }, []);

  // Auth state + custom claims
  useEffect(() => {
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setClaims(NO_CLAIMS);
        setProfile(null);
        setLoading(false);
        return;
      }
      await readClaims(u);
      try {
        await ensureProfile(u, pendingName.current);
      } catch (e) {
        console.error("Could not create profile", e);
      }
      setLoading(false);
    });
  }, [readClaims]);

  // Live profile. When a Cloud Function changes our claims it bumps claimsUpdatedAt,
  // so we force-refresh the ID token and role changes apply instantly (no re-login).
  useEffect(() => {
    if (!user) return;
    lastClaimsStamp.current = null;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = { uid: snap.id, ...(snap.data() as Omit<UserProfile, "uid">) };
      setProfile(data);
      const stamp = data.claimsUpdatedAt?.toMillis() ?? 0;
      if (lastClaimsStamp.current !== null && stamp !== lastClaimsStamp.current) void readClaims(user, true);
      lastClaimsStamp.current = stamp;
    });
  }, [user, readClaims]);

  const value = useMemo<AuthCtx>(() => {
    const roles: Role[] = ["renter", ...(claims.host ? (["host"] as Role[]) : []), ...(claims.admin ? (["admin"] as Role[]) : [])];
    return {
      user,
      profile,
      claims,
      roles,
      loading,
      signInEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUpEmail: async (name, email, password) => {
        pendingName.current = name;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      },
      signInGoogle: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
      },
      signOut: () => fbSignOut(auth),
      becomeHost: async () => {
        await httpsCallable(functions, "becomeHost")();
        if (auth.currentUser) await readClaims(auth.currentUser, true);
      },
      refreshClaims: async () => {
        if (auth.currentUser) await readClaims(auth.currentUser, true);
      },
    };
  }, [user, profile, claims, loading, readClaims]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "No account with that email.",
    "auth/email-already-in-use": "An account with this email already exists — try signing in.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/network-request-failed": "Network error — is the Firebase emulator running?",
  };
  return map[code] ?? (e as Error)?.message ?? "Something went wrong.";
}
