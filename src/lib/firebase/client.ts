import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
const isBrowser = typeof window !== "undefined";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-voltshare",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-voltshare.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(config);

/*
 * The Firebase web SDK is used only in the browser: every page that reads data is a client
 * component and touches these inside effects/handlers. During server prerender they are null.
 */
export const auth = (isBrowser ? getAuth(app) : null) as Auth;
export const db = (isBrowser ? getFirestore(app) : null) as Firestore;
export const storage = (isBrowser ? getStorage(app) : null) as FirebaseStorage;
export const functions = (isBrowser ? getFunctions(app, "asia-south1") : null) as Functions;

// Connect once per page load (guards against HMR double-connecting).
const g = globalThis as unknown as { __vsEmulators?: boolean };
if (useEmulators && isBrowser && !g.__vsEmulators) {
  g.__vsEmulators = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
