/**
 * Shared Admin SDK setup for scripts.
 *   default:  local Emulator Suite (project demo-voltshare)
 *   --prod --project <id> --key <service-account.json>   real Firebase project
 */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
export const flag = (name: string) => args.includes(`--${name}`);
export const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
export const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && ["project", "key"].includes(args[i - 1].slice(2))));

export const PROD = flag("prod");
export const projectId = PROD ? opt("project") : "demo-voltshare";

if (PROD) {
  const key = opt("key");
  if (!projectId || !key) {
    console.error("Usage: … --prod --project <firebase-project-id> --key <path/to/service-account.json> [--yes]");
    process.exit(1);
  }
  if (!flag("yes")) {
    console.error(`Refusing to write to the REAL project "${projectId}" without --yes.`);
    process.exit(1);
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(key, "utf8"))), projectId });
} else {
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= "127.0.0.1:9199";
  initializeApp({ projectId });
}

export const auth = getAuth();
export const db = getFirestore();
