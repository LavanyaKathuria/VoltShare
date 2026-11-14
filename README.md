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
`npm run seed` also creates 15 chargers across Bengaluru (fixed IDs, e.g. `/chargers/blr-koramangala-01`) and resets the emulator to that state each time.
Demo listing art lives in `public/demo/` (regenerate with `node scripts/gen-demo-art.mjs`).

## Tests

```bash
npm run test:rules          # Firestore security rules tests (starts emulators itself)
```

## Roles

Roles are Firebase Auth **custom claims** (`host`, `admin`), set only by Cloud Functions (`becomeHost`, `adminSetUserRoles`) and mirrored to `users/{uid}.roles` for display. Security rules trust the token claims only. When a function changes a user's claims it bumps `users/{uid}.claimsUpdatedAt`; the open client sees that via `onSnapshot` and force-refreshes its ID token, so role changes apply instantly without signing out.

## Location privacy

Public `chargers/{id}` docs only hold an approximate point — the real location moved 120–250 m in a random direction — plus a geohash for range queries. The map draws a 300 m circle around it. The exact address, coordinates and gate code live in `chargers/{id}/private/details`, which rules allow only the host, admins, or a renter holding a `renterAccess/{chargerId_uid}` grant (created and revoked by Cloud Functions around a confirmed booking).

## Double-booking-proof slots

- One Firestore doc per 30-minute slot: `bookings/{chargerId}_{YYYY-MM-DD}_{HHmm}`. A multi-slot booking writes all its slot docs in **one transaction** (shared `groupId`).
- Each booking has a public twin `slots/{same id}` (no personal data) that drives the live slot pills via `onSnapshot`; bookings themselves are private to renter, host and admins.
- The client transaction (`src/lib/bookings.ts`) reads the slot locks first and aborts with *“Slot just taken!”* if any exists. Firestore's optimistic concurrency rejects the loser of any race; rules additionally refuse to create a booking whose ID already exists, and cross-check the booking/lock pair.
- New bookings are `pending` (held for 10 min). Payment (mocked, test mode) calls the `confirmBooking` function → `confirmed`, issues the 4-digit PIN and grants address access. `cancelBooking` and the scheduled `releaseExpiredHolds` archive to `bookingHistory` and free the slots.
- **Concurrency demo:** on any charger page, *Simulate concurrent booking* fires your transaction and a “Rival Driver” transaction (server-side, via `simulateRivalBooking`) for the same slot at the same instant — exactly one wins. Or open the same charger in two tabs and book the same slot.

## Self check-in, live session, check-out & billing

- **Address reveal:** once confirmed, *My bookings* and the charger page show the exact address and gate notes, readable only through the `renterAccess` grant.
- **Check-in** (`checkIn` function): PIN + time window (from 10 min before the slot until it ends) + **≤100 m geofence verified on the server** against the private coordinates. Sets the booking `active` and the charger's map pin to amber. For demos away from Bengaluru, the dialog has a clearly labelled *“Demo: pretend I'm at the charger”* option.
- **Live session:** dark telemetry card with a kWh progress ring, elapsed/remaining time and running cost (simulated meter: rated power × 90% × time).
- **Check-out** (`checkOut` function): kWh reading (sanity-capped by charger power × booked time) + optional meter photo in Storage (`checkout/{uid}/{bookingId}/…`, readable by renter, host and admins).
- **Billing** (`billOnComplete` Firestore trigger): `kWh × rate + 15% platform fee`, written to the booking, plus atomic increments to `hostStats/{ownerId}` (earnings, kWh, sessions, per-day, per-charger). Guarded by `billedAt`, so retries never double-count.
- **Scheduled** `revokeExpiredAccess` (every 10 min): deletes access grants whose slot has ended, and auto-closes sessions nobody checked out of 30 min after the slot (flagged `autoClosed`).

## Map

`src/components/map/MapView.tsx` is a provider-neutral wrapper (`types.ts` defines the contract). Today it lazy-loads `LeafletMap` (CARTO Voyager tiles, no key). To switch to Google Maps, implement the same props in a `GoogleMap.tsx` and change the one dynamic import.

_Full setup, architecture diagram and deploy steps are added at the end of the build._
