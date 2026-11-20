/**
 * Seeds FICTIONAL demo data (accounts, 15 Bengaluru chargers, a week of sessions).
 *   npm run seed                                   -> local emulators (wipes & resets the demo)
 *   npm run seed -- --prod --project <id> --key <service-account.json> --yes
 *                                                  -> real project (never deletes anything;
 *                                                     booking history is added only once)
 */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { fuzzLocation, geohash } from "../src/lib/geo";
import { auth, db, PROD, projectId } from "./_admin";

export const DEMO_PASSWORD = "demo1234";
const DEMO_USERS = [
  { email: "renter@demo.com", name: "Riya Sharma", claims: {}, verifiedHost: false },
  { email: "host@demo.com", name: "Arjun Mehta", claims: { host: true }, verifiedHost: true },
  { email: "admin@demo.com", name: "Admin", claims: { host: true, admin: true }, verifiedHost: true },
  // Extra hosts so the map has variety (not advertised on the login page)
  { email: "priya@demo.com", name: "Priya Nair", claims: { host: true }, verifiedHost: true },
  { email: "sanjay@demo.com", name: "Sanjay Kulkarni", claims: { host: true }, verifiedHost: false },
  { email: "meera@demo.com", name: "Meera Iyer", claims: { host: true }, verifiedHost: true },
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

type Seed = {
  id: string; host: string; title: string; area: string; lat: number; lng: number;
  connector: "TYPE2" | "CCS2" | "SOCKET15A"; kw: number; rate: number;
  access: "PUBLIC_DRIVEWAY" | "GATED_SOCIETY" | "BUSINESS"; photos: string[];
  status?: "available" | "charging" | "busy"; online?: boolean; meter?: boolean;
  rating?: number; reviews?: number; open?: string; close?: string;
  address: string; notes: string; desc: string; rules?: string[]; city?: string;
};

const P = (...n: string[]) => n.map((x) => `/demo/${x}.svg`);
const H1 = "host@demo.com", H2 = "priya@demo.com", H3 = "sanjay@demo.com", H4 = "meera@demo.com";

const CHARGERS: Seed[] = [
  { id: "blr-indiranagar-01", host: H1, title: "Sunny driveway off 100 Ft Road", area: "Indiranagar", lat: 12.9784, lng: 77.6408, connector: "TYPE2", kw: 7.4, rate: 14.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-1", "closeup-1"), meter: true, rating: 4.9, reviews: 38, address: "Demo address — driveway off 12th Main, HAL 2nd Stage, Indiranagar", notes: "Demo notes: driveway on the left of the white gate; charger on the garage wall.", desc: "Wide, shaded driveway two minutes from 100 Ft Road. Wall-mounted 7.4 kW charger with a 5 m cable — reaches any parking position." },
  { id: "blr-koramangala-01", host: H2, title: "Corner café fast charger, 5th Block", area: "Koramangala", lat: 12.9352, lng: 77.6245, connector: "CCS2", kw: 30, rate: 18, access: "BUSINESS", photos: P("cafe-1", "closeup-2"), status: "charging", meter: true, rating: 4.8, reviews: 112, open: "07:00", close: "23:00", address: "Demo address — café frontage, 80 Ft Road, 5th Block, Koramangala", notes: "Demo notes: EV bay right in front of the café. Show your PIN at the counter.", desc: "DC fast charging while you grab a coffee. 30 kW CCS2 — add ~100 km of range in under an hour." },
  { id: "blr-hsr-01", host: H1, title: "Gated society bay, Sector 2", area: "HSR Layout", lat: 12.9116, lng: 77.6474, connector: "TYPE2", kw: 7.4, rate: 12, access: "GATED_SOCIETY", photos: P("basement-1", "closeup-1"), rating: 4.7, reviews: 21, address: "Demo address — gated society, 27th Main, Sector 2, HSR Layout", notes: "Demo notes: tell security you're here for EV bay B-12. Gate code 4821.", desc: "Covered basement bay in a gated society. Security on duty 24×7. Ideal for overnight or long top-ups." },
  { id: "blr-whitefield-01", host: H4, title: "Tech park visitor charging", area: "Whitefield", lat: 12.9698, lng: 77.7500, connector: "CCS2", kw: 50, rate: 17, access: "BUSINESS", photos: P("techpark-1", "closeup-2"), meter: true, rating: 4.6, reviews: 64, open: "06:00", close: "23:30", address: "Demo address — tech park visitor lot P2, Whitefield Main Road", notes: "Demo notes: enter via Gate 3, take a visitor token, follow green EV signs to P2.", desc: "50 kW DC fast charger in a secure tech-park visitor lot. Great for cab and delivery drivers between trips." },
  { id: "blr-jayanagar-01", host: H2, title: "Quiet home driveway near 4th Block", area: "Jayanagar", lat: 12.9250, lng: 77.5938, connector: "TYPE2", kw: 3.3, rate: 11, access: "PUBLIC_DRIVEWAY", photos: P("driveway-2"), rating: 4.9, reviews: 17, address: "Demo address — home driveway near 30th Cross, 4th Block, Jayanagar", notes: "Demo notes: red gate, park facing the house. Ring the bell if the gate is locked.", desc: "Calm residential street, tree-lined. Slower 3.3 kW AC — perfect for a relaxed 2–3 hour top-up." },
  { id: "blr-malleshwaram-01", host: H3, title: "Heritage home 15A socket", area: "Malleshwaram", lat: 13.0035, lng: 77.5710, connector: "SOCKET15A", kw: 3.0, rate: 10, access: "PUBLIC_DRIVEWAY", photos: P("driveway-3"), status: "busy", rating: 4.5, reviews: 9, address: "Demo address — home near 8th Cross, Malleshwaram", notes: "Demo notes: bring your own portable charger cable for the 15A socket.", desc: "Budget-friendly 15A socket for two-wheelers and cars with a portable charger. Lowest rate in the area." },
  { id: "blr-jpnagar-01", host: H1, title: "Covered parking, JP Nagar 6th Phase", area: "JP Nagar", lat: 12.9063, lng: 77.5857, connector: "TYPE2", kw: 11, rate: 13.5, access: "GATED_SOCIETY", photos: P("basement-2", "closeup-1"), rating: 4.4, reviews: 12, address: "Demo address — society basement near 15th Cross, JP Nagar 6th Phase", notes: "Demo notes: gate code 2290. Visitor bay V-3, charger on the pillar.", desc: "11 kW AC in a secure society basement with CCTV. Easy access from the Outer Ring Road." },
  { id: "blr-hebbal-01", host: H4, title: "Lakeside hotel porch charger", area: "Hebbal", lat: 13.0358, lng: 77.5970, connector: "TYPE2", kw: 22, rate: 16, access: "BUSINESS", photos: P("hotel-1", "closeup-2"), status: "charging", meter: true, rating: 4.7, reviews: 45, open: "00:00", close: "23:30", address: "Demo address — hotel porch off Bellary Road, Hebbal", notes: "Demo notes: check in with the valet desk; they'll guide you to the EV bay.", desc: "22 kW AC at a hotel porch, open around the clock. Handy for airport runs." },
  { id: "blr-bellandur-01", host: H2, title: "Society visitor bay, Bellandur", area: "Bellandur", lat: 12.9260, lng: 77.6762, connector: "TYPE2", kw: 7.4, rate: 13, access: "GATED_SOCIETY", photos: P("basement-1"), rating: 4.6, reviews: 26, address: "Demo address — gated community visitor parking, Bellandur", notes: "Demo notes: gate code 7714. Visitor parking level -1, bay 18.", desc: "Visitor bay in a large gated community near the tech corridor." },
  { id: "blr-ecity-01", host: H3, title: "Electronic City driveway fast top-up", area: "Electronic City", lat: 12.8452, lng: 77.6602, connector: "CCS2", kw: 25, rate: 15.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-1"), rating: 0, reviews: 0, address: "Demo address — home driveway near Electronic City Phase 1", notes: "Demo notes: park on the driveway; the charger cable is in the box by the gate.", desc: "Rare home DC charger near the e-city flyover. New listing!" },
  { id: "blr-marathahalli-01", host: H1, title: "Café stop on Outer Ring Road", area: "Marathahalli", lat: 12.9569, lng: 77.7011, connector: "TYPE2", kw: 7.4, rate: 15, access: "BUSINESS", photos: P("cafe-2", "closeup-1"), rating: 4.3, reviews: 31, open: "08:00", close: "22:30", address: "Demo address — roadside café, ORR service road, Marathahalli", notes: "Demo notes: charger is next to the bicycle stand. Staff can help with the cable.", desc: "Grab chai and a snack while you charge, right on the ORR service road." },
  { id: "blr-btm-01", host: H4, title: "BTM 2nd Stage home charger", area: "BTM Layout", lat: 12.9166, lng: 77.6101, connector: "TYPE2", kw: 7.4, rate: 12.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-3", "closeup-2"), rating: 4.8, reviews: 19, address: "Demo address — home driveway near 16th Main, BTM 2nd Stage", notes: "Demo notes: blue gate. Driveway fits one sedan.", desc: "Friendly neighbourhood charger a short walk from the main road." },
  { id: "blr-domlur-01", host: H2, title: "Domlur villa — 11 kW", area: "Domlur", lat: 12.9610, lng: 77.6387, connector: "TYPE2", kw: 11, rate: 14, access: "PUBLIC_DRIVEWAY", photos: P("driveway-2", "closeup-1"), online: false, rating: 4.6, reviews: 14, address: "Demo address — villa driveway, Domlur Layout 2nd Stage", notes: "Demo notes: the watchman will open the gate — mention VoltShare.", desc: "Spacious villa driveway close to the Domlur flyover." },
  { id: "blr-yelahanka-01", host: H3, title: "Airport road society charger", area: "Yelahanka", lat: 13.1007, lng: 77.5963, connector: "TYPE2", kw: 7.4, rate: 11.5, access: "GATED_SOCIETY", photos: P("basement-2"), rating: 4.2, reviews: 6, address: "Demo address — society basement, Yelahanka New Town", notes: "Demo notes: gate code 1150. Basement bay 4.", desc: "Convenient stop on the way to or from the airport." },
  { id: "blr-rajajinagar-01", host: H4, title: "Rajajinagar business park bay", area: "Rajajinagar", lat: 12.9910, lng: 77.5525, connector: "CCS2", kw: 30, rate: 16.5, access: "BUSINESS", photos: P("techpark-1"), meter: true, rating: 4.5, reviews: 22, open: "07:00", close: "21:00", address: "Demo address — business park visitor bay, Dr Rajkumar Road, Rajajinagar", notes: "Demo notes: tell the guard at Gate 1 you have a VoltShare booking; bay EV-2.", desc: "30 kW DC in a secure business park, close to the metro." },
  // ---- Delhi (fictional demo listings; neighbourhood coordinates are approximate) ----
  { id: "del-cp-01", host: H4, city: "Delhi", title: "Hotel forecourt charger, Connaught Place", area: "Connaught Place", lat: 28.6315, lng: 77.2167, connector: "TYPE2", kw: 22, rate: 17, access: "BUSINESS", photos: P("hotel-1", "closeup-2"), meter: true, rating: 4.6, reviews: 41, open: "00:00", close: "23:30", address: "Demo address — hotel forecourt off the Outer Circle, Connaught Place, Delhi", notes: "Demo notes: tell the doorman you have a VoltShare booking; EV bay is left of the entrance.", desc: "22 kW AC charger in a hotel forecourt in central Delhi, open around the clock." },
  { id: "del-hauzkhas-01", host: H2, city: "Delhi", title: "Café courtyard fast charger, Hauz Khas", area: "Hauz Khas", lat: 28.5494, lng: 77.2001, connector: "CCS2", kw: 30, rate: 18, access: "BUSINESS", photos: P("cafe-1", "closeup-1"), status: "charging", rating: 4.8, reviews: 57, open: "09:00", close: "23:00", address: "Demo address — café courtyard near Hauz Khas Village, Delhi", notes: "Demo notes: enter through the side lane; ask at the counter for the cable.", desc: "30 kW DC fast charging in a café courtyard — top up while you grab a coffee." },
  { id: "del-lajpat-01", host: H1, city: "Delhi", title: "Home driveway near Central Market, Lajpat Nagar", area: "Lajpat Nagar", lat: 28.5677, lng: 77.2433, connector: "TYPE2", kw: 7.4, rate: 14, access: "PUBLIC_DRIVEWAY", photos: P("driveway-2", "closeup-1"), rating: 4.7, reviews: 23, address: "Demo address — home driveway near Central Market, Lajpat Nagar, Delhi", notes: "Demo notes: white gate; the charger is on the garage wall.", desc: "Covered home driveway, a short walk from the market. Easy evening top-ups." },
  { id: "del-dwarka-01", host: H3, city: "Delhi", title: "Society visitor bay, Dwarka Sector 10", area: "Dwarka", lat: 28.5815, lng: 77.0570, connector: "TYPE2", kw: 11, rate: 12.5, access: "GATED_SOCIETY", photos: P("basement-1"), rating: 4.4, reviews: 11, address: "Demo address — gated society, Dwarka Sector 10, Delhi", notes: "Demo notes: gate code 1010. Visitor parking level -1, bay V-6.", desc: "11 kW charger in a gated society's visitor bay, with 24×7 security." },
  { id: "del-saket-01", host: H4, city: "Delhi", title: "Office visitor parking, Saket", area: "Saket", lat: 28.5245, lng: 77.2066, connector: "CCS2", kw: 50, rate: 17.5, access: "BUSINESS", photos: P("techpark-1", "closeup-2"), meter: true, rating: 4.5, reviews: 34, open: "07:00", close: "22:00", address: "Demo address — office complex visitor parking, Saket, Delhi", notes: "Demo notes: take a visitor token at Gate 2; follow green EV signs to bay EV-1.", desc: "50 kW DC fast charger in an office visitor lot — ideal for cab drivers between trips." },
  { id: "del-rohini-01", host: H2, city: "Delhi", title: "Budget 15A socket, Rohini", area: "Rohini", lat: 28.7041, lng: 77.1025, connector: "SOCKET15A", kw: 3, rate: 10, access: "PUBLIC_DRIVEWAY", photos: P("driveway-3"), rating: 0, reviews: 0, address: "Demo address — home driveway, Rohini, Delhi", notes: "Demo notes: bring your own portable cable; the socket is beside the meter box.", desc: "Low-cost 15A socket for e-scooters and cars with a portable charger. New listing!" },
];

const DEFAULT_RULES = ["Park only in the marked bay", "Unplug and leave when your slot ends", "No idling after charging is complete"];

async function seedChargers(uids: Record<string, string>) {
  const users = Object.fromEntries(DEMO_USERS.map((u) => [u.email, u]));
  // On the emulator, wipe listings that aren't part of the demo set so re-seeding gives a clean demo.
  if (!PROD) {
    const keep = new Set(CHARGERS.map((c) => c.id));
    const existing = await db.collection("chargers").get();
    for (const d of existing.docs) if (!keep.has(d.id)) await db.recursiveDelete(d.ref);
    // …and start with an empty booking calendar.
    for (const col of ["bookings", "slots", "bookingHistory", "renterAccess", "hostStats", "platformStats"]) await db.recursiveDelete(db.collection(col));
  }
  const batch = db.batch();
  for (const c of CHARGERS) {
    const approx = fuzzLocation({ lat: c.lat, lng: c.lng });
    const ref = db.doc(`chargers/${c.id}`);
    batch.set(ref, {
      ownerId: uids[c.host],
      hostName: users[c.host].name,
      hostPhoto: null,
      hostVerified: users[c.host].verifiedHost,
      title: c.title,
      description: c.desc,
      photos: c.photos,
      connector: c.connector,
      powerKw: c.kw,
      ratePerKwh: c.rate,
      accessType: c.access,
      rules: c.rules ?? DEFAULT_RULES,
      openTime: c.open ?? "08:00",
      closeTime: c.close ?? "22:00",
      approxLat: approx.lat,
      approxLng: approx.lng,
      geohash: geohash(approx),
      area: c.area,
      city: c.city ?? "Bengaluru",
      online: c.online ?? true,
      liveStatus: c.status ?? "available",
      meterVerified: c.meter ?? false,
      demo: true, // fictional sample listing — shown with a "Demo listing" tag
      rating: c.rating ?? 0,
      reviewCount: c.reviews ?? 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    batch.set(ref.collection("private").doc("details"), {
      address: c.address,
      exactLat: c.lat,
      exactLng: c.lng,
      accessNotes: c.notes,
    });
  }
  await batch.commit();
  console.log(`  ✓ ${CHARGERS.length} chargers`);
}

// ---------- demo booking history ----------
// Deterministic PRNG so re-seeding gives the same numbers.
let seedState = 42;
const rand = () => ((seedState = (seedState * 1664525 + 1013904223) % 4294967296) / 4294967296);
const r2 = (n: number) => Math.round(n * 100) / 100;
const IST = 330 * 60_000;
const dayKey = (offsetDays: number) => new Date(Date.now() + IST + offsetDays * 86_400_000).toISOString().slice(0, 10);
const slotStartMs = (date: string, slot: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + (Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2))) * 60_000 - IST;
};
const pad = (n: number) => String(n).padStart(2, "0");
const slotsFrom = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const t = Number(start.slice(0, 2)) * 60 + Number(start.slice(2)) + i * 30;
    return pad(Math.floor(t / 60)) + pad(t % 60);
  });

async function seedBookings(uids: Record<string, string>) {
  // On a real project, add the fictional history once only — never overwrite real earnings.
  const marker = db.doc("meta/demoSeed");
  if (PROD && (await marker.get()).exists) {
    console.log("  • demo booking history already present — skipped");
    return;
  }
  const charger = Object.fromEntries(CHARGERS.map((c) => [c.id, c]));
  const renters = [
    { email: "renter@demo.com", name: "Riya Sharma" },
    { email: "priya@demo.com", name: "Priya Nair" },
    { email: "meera@demo.com", name: "Meera Iyer" },
    { email: "sanjay@demo.com", name: "Sanjay Kulkarni" },
  ];
  const hostStats: Record<string, { totalEarnings: number; totalKwh: number; sessions: number; byDay: Record<string, number>; byCharger: Record<string, number> }> = {};
  const platform = { platformRevenue: 0, totalKwh: 0, sessions: 0 };
  // Firestore batches cap at 500 writes, so queue writes and commit in chunks.
  const ops: [string, Record<string, unknown>][] = [];
  const batch = { set: (ref: FirebaseFirestore.DocumentReference, data: Record<string, unknown>) => ops.push([ref.path, data]) };
  const starts = ["0900", "1100", "1400", "1700", "1930"];

  const write = (c: Seed, date: string, slots: string[], renter: (typeof renters)[number], status: "completed" | "confirmed", extra: Record<string, unknown> = {}, allSlots: Record<string, unknown> = {}) => {
    const groupId = `${c.id}_${date}_${slots[0]}`;
    for (const s of slots) {
      const id = `${c.id}_${date}_${s}`;
      const startMs = slotStartMs(date, s);
      batch.set(db.doc(`bookings/${id}`), {
        groupId, groupSlots: slots, chargerId: c.id, chargerTitle: c.title, area: c.area,
        renterId: uids[renter.email], renterName: renter.name, ownerId: uids[c.host],
        date, slot: s, startAt: Timestamp.fromMillis(startMs), endAt: Timestamp.fromMillis(startMs + 30 * 60_000),
        status, ratePerKwh: c.rate, powerKw: c.kw, demo: true,
        createdAt: Timestamp.fromMillis(slotStartMs(date, slots[0]) - 86_400_000),
        ...allSlots,
        ...(id === groupId ? extra : {}),
      });
      batch.set(db.doc(`slots/${id}`), { chargerId: c.id, date, slot: s, status: "booked" });
    }
    return groupId;
  };

  // Past 6 days + earlier today: completed, billed sessions on every online charger (busier for verified hosts).
  for (let day = -6; day <= 0; day++) {
    const date = dayKey(day);
    for (const c of CHARGERS) {
      if (c.online === false) continue;
      const sessions = rand() < (c.host === "sanjay@demo.com" ? 0.35 : 0.6) ? 1 + (rand() < 0.3 ? 1 : 0) : 0;
      for (let k = 0; k < sessions; k++) {
        const start = starts[Math.floor(rand() * starts.length)];
        const n = 1 + Math.floor(rand() * 4);
        const slots = slotsFrom(start, n);
        if (day === 0 && slotStartMs(date, slots[n - 1]) + 30 * 60_000 > Date.now()) continue; // only sessions that have ended
        const open = c.open ?? "08:00", close = c.close ?? "22:00";
        if (slots[0] < open.replace(":", "") || slots[n - 1] >= close.replace(":", "")) continue;
        const renter = renters.find((r) => r.email !== c.host && rand() < 0.6) ?? renters[0];
        if (renter.email === c.host) continue;
        const kwh = r2(Math.min(40, c.kw * 0.9 * (n / 2) * (0.55 + rand() * 0.4)));
        const energyCost = r2(kwh * c.rate);
        const platformFee = r2(energyCost * 0.15);
        const endMs = slotStartMs(date, slots[n - 1]) + 30 * 60_000;
        write(c, date, slots, renter, "completed", {
          kwh, energyCost, platformFee, amount: r2(energyCost + platformFee), hostEarning: energyCost,
          checkedInAt: Timestamp.fromMillis(slotStartMs(date, slots[0]) + 3 * 60_000),
          checkedOutAt: Timestamp.fromMillis(endMs - 2 * 60_000), billedAt: Timestamp.fromMillis(endMs),
          meterPhotoPath: null,
        }, { pin: "0000", checkedOutAt: Timestamp.fromMillis(endMs - 2 * 60_000) });
        const h = (hostStats[uids[c.host]] ??= { totalEarnings: 0, totalKwh: 0, sessions: 0, byDay: {}, byCharger: {} });
        h.totalEarnings = r2(h.totalEarnings + energyCost);
        h.totalKwh = r2(h.totalKwh + kwh);
        h.sessions += 1;
        h.byDay[date] = r2((h.byDay[date] ?? 0) + energyCost);
        h.byCharger[c.id] = r2((h.byCharger[c.id] ?? 0) + energyCost);
        platform.platformRevenue = r2(platform.platformRevenue + platformFee);
        platform.totalKwh = r2(platform.totalKwh + kwh);
        platform.sessions += 1;
      }
    }
  }

  // Tomorrow: two confirmed bookings so the renter and host demos have something upcoming.
  const tomorrow = dayKey(1);
  const upcoming: [string, string, number, (typeof renters)[number]][] = [
    ["blr-indiranagar-01", "1000", 2, renters[0]],
    ["blr-hsr-01", "1800", 3, renters[2]],
  ];
  for (const [cid, start, n, renter] of upcoming) {
    const c = charger[cid];
    const slots = slotsFrom(start, n);
    const pin = String(1000 + Math.floor(rand() * 9000));
    const groupId = write(c, tomorrow, slots, renter, "confirmed", {}, { pin, confirmedAt: Timestamp.now(), paymentRef: "demo" });
    batch.set(db.doc(`renterAccess/${c.id}_${uids[renter.email]}`), {
      chargerId: c.id, renterId: uids[renter.email], ownerId: uids[c.host], groupIds: [groupId],
      expiresAt: Timestamp.fromMillis(slotStartMs(tomorrow, slots[n - 1]) + 30 * 60_000), createdAt: Timestamp.now(),
    });
  }

  for (const [owner, h] of Object.entries(hostStats)) batch.set(db.doc(`hostStats/${owner}`), { ownerId: owner, ...h, demo: true });
  if (!PROD) batch.set(db.doc("platformStats/global"), { ...platform, demo: true });
  else batch.set(db.doc("platformStats/global"), { platformRevenue: FieldValue.increment(platform.platformRevenue), totalKwh: FieldValue.increment(platform.totalKwh), sessions: FieldValue.increment(platform.sessions) } as never);
  for (let i = 0; i < ops.length; i += 400) {
    const b = db.batch();
    ops.slice(i, i + 400).forEach(([path, data]) => b.set(db.doc(path), data, { merge: true }));
    await b.commit();
  }
  if (PROD) await marker.set({ at: FieldValue.serverTimestamp(), sessions: platform.sessions });
  console.log(`  ✓ ${platform.sessions} past sessions (₹${platform.platformRevenue} platform fees), 2 upcoming bookings`);
}

async function main() {
  console.log(`Seeding ${PROD ? "PRODUCTION project " + projectId : "emulators (" + projectId + ")"}…`);
  const uids = await seedUsers();
  await seedChargers(uids);
  await seedBookings(uids);
  console.log(`Done. Demo password: ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
