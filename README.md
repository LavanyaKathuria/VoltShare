# VoltShare

Peer-to-peer EV charger booking for Indian cities: hosts list idle chargers in 30-minute slots, renters find, book, self check-in and pay per kWh.

**Stack:** Next.js (App Router) + TypeScript + Tailwind · Firebase Auth, Firestore, Storage, Cloud Functions v2 · Vercel.

## Run locally (Firebase Emulator Suite — no keys needed)

Requires Node 22 and Java 17+ (for the emulators).

```bash
npm install                 # also installs functions/ deps
cp .env.example .env.local  # NEXT_PUBLIC_USE_EMULATORS=true
npm run emulators           # terminal 1 — Emulator UI at http://127.0.0.1:4000
npm run seed                # terminal 2 — demo accounts
npm run dev                 # terminal 2 — http://localhost:3000
```

Demo accounts (password `demo1234`): `renter@demo.com`, `host@demo.com`, `admin@demo.com`.

## Tests

```bash
npm run test:rules          # Firestore security rules tests (starts emulators itself)
```

## Roles

Roles are Firebase Auth **custom claims** (`host`, `admin`), set only by Cloud Functions (`becomeHost`, `adminSetUserRoles`) and mirrored to `users/{uid}.roles` for display. Security rules trust the token claims only. When a function changes a user's claims it bumps `users/{uid}.claimsUpdatedAt`; the open client sees that via `onSnapshot` and force-refreshes its ID token, so role changes apply instantly without signing out.

_Full setup, architecture diagram and deploy steps are added at the end of the build._
