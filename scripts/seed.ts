/**
 * Seeds demo data. By default targets the local Emulator Suite (safe).
 *   npm run seed                 -> emulators (start them first: npm run emulators)
 *   SEED_PROD=1 npm run seed     -> real project, using GOOGLE_APPLICATION_CREDENTIALS
 *
 * Creates demo accounts (with roles) and ~15 chargers across Bengaluru. Safe to re-run:
 * documents use fixed IDs, so a re-seed resets the demo to a known state.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { fuzzLocation, geohash } from "../src/lib/geo";

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
  address: string; notes: string; desc: string; rules?: string[];
};

const P = (...n: string[]) => n.map((x) => `/demo/${x}.svg`);
const H1 = "host@demo.com", H2 = "priya@demo.com", H3 = "sanjay@demo.com", H4 = "meera@demo.com";

const CHARGERS: Seed[] = [
  { id: "blr-indiranagar-01", host: H1, title: "Sunny driveway off 100 Ft Road", area: "Indiranagar", lat: 12.9784, lng: 77.6408, connector: "TYPE2", kw: 7.4, rate: 14.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-1", "closeup-1"), meter: true, rating: 4.9, reviews: 38, address: "#214, 12th Main, HAL 2nd Stage, Indiranagar", notes: "Driveway on the left of the white gate. Charger is on the wall by the garage.", desc: "Wide, shaded driveway two minutes from 100 Ft Road. Wall-mounted 7.4 kW charger with a 5 m cable — reaches any parking position." },
  { id: "blr-koramangala-01", host: H2, title: "Brew & Bolt Café — 5th Block", area: "Koramangala", lat: 12.9352, lng: 77.6245, connector: "CCS2", kw: 30, rate: 18, access: "BUSINESS", photos: P("cafe-1", "closeup-2"), status: "charging", meter: true, rating: 4.8, reviews: 112, open: "07:00", close: "23:00", address: "Brew & Bolt, 80 Ft Road, 5th Block, Koramangala", notes: "Bay right in front of the café. Show your PIN at the counter for 10% off coffee.", desc: "DC fast charging while you grab a coffee. 30 kW CCS2 — add ~100 km of range in under an hour." },
  { id: "blr-hsr-01", host: H1, title: "Gated society bay, Sector 2", area: "HSR Layout", lat: 12.9116, lng: 77.6474, connector: "TYPE2", kw: 7.4, rate: 12, access: "GATED_SOCIETY", photos: P("basement-1", "closeup-1"), rating: 4.7, reviews: 21, address: "Tower B, Green Meadows Apartments, 27th Main, Sector 2, HSR Layout", notes: "Tell security you're here for EV bay B-12. Gate code 4821. Basement 1, bay B-12.", desc: "Covered basement bay in a gated society. Security on duty 24×7. Ideal for overnight or long top-ups." },
  { id: "blr-whitefield-01", host: H4, title: "Tech park visitor charging", area: "Whitefield", lat: 12.9698, lng: 77.7500, connector: "CCS2", kw: 50, rate: 17, access: "BUSINESS", photos: P("techpark-1", "closeup-2"), meter: true, rating: 4.6, reviews: 64, open: "06:00", close: "23:30", address: "Visitor Parking P2, ITPL Main Road, Whitefield", notes: "Enter via Gate 3, take a visitor token, follow green EV signs to P2.", desc: "50 kW DC fast charger in a secure tech-park visitor lot. Great for cab and delivery drivers between trips." },
  { id: "blr-jayanagar-01", host: H2, title: "Quiet home driveway near 4th Block", area: "Jayanagar", lat: 12.9250, lng: 77.5938, connector: "TYPE2", kw: 3.3, rate: 11, access: "PUBLIC_DRIVEWAY", photos: P("driveway-2"), rating: 4.9, reviews: 17, address: "#41, 30th Cross, 4th Block, Jayanagar", notes: "Red gate, park facing the house. Ring the bell if the gate is locked.", desc: "Calm residential street, tree-lined. Slower 3.3 kW AC — perfect for a relaxed 2–3 hour top-up." },
  { id: "blr-malleshwaram-01", host: H3, title: "Heritage home 15A socket", area: "Malleshwaram", lat: 13.0035, lng: 77.5710, connector: "SOCKET15A", kw: 3.0, rate: 10, access: "PUBLIC_DRIVEWAY", photos: P("driveway-3"), status: "busy", rating: 4.5, reviews: 9, address: "#7, 8th Cross, Malleshwaram", notes: "Bring your own portable charger cable for the 15A socket.", desc: "Budget-friendly 15A socket for two-wheelers and cars with a portable charger. Lowest rate in the area." },
  { id: "blr-jpnagar-01", host: H1, title: "Covered parking, JP Nagar 6th Phase", area: "JP Nagar", lat: 12.9063, lng: 77.5857, connector: "TYPE2", kw: 11, rate: 13.5, access: "GATED_SOCIETY", photos: P("basement-2", "closeup-1"), rating: 4.4, reviews: 12, address: "Block C, Lake View Residency, 15th Cross, JP Nagar 6th Phase", notes: "Gate code 2290. Visitor bay V-3, charger on the pillar.", desc: "11 kW AC in a secure society basement with CCTV. Easy access from the Outer Ring Road." },
  { id: "blr-hebbal-01", host: H4, title: "Lakeside hotel porch charger", area: "Hebbal", lat: 13.0358, lng: 77.5970, connector: "TYPE2", kw: 22, rate: 16, access: "BUSINESS", photos: P("hotel-1", "closeup-2"), status: "charging", meter: true, rating: 4.7, reviews: 45, open: "00:00", close: "23:30", address: "Hotel Lakeside Grand, Bellary Road, Hebbal", notes: "Check in with the valet desk; they'll guide you to the EV bay.", desc: "22 kW AC at a hotel porch, open around the clock. Handy for airport runs." },
  { id: "blr-bellandur-01", host: H2, title: "Society visitor bay near Ecospace", area: "Bellandur", lat: 12.9260, lng: 77.6762, connector: "TYPE2", kw: 7.4, rate: 13, access: "GATED_SOCIETY", photos: P("basement-1"), rating: 4.6, reviews: 26, address: "Tower 4, Prestige Lakeside, Bellandur", notes: "Gate code 7714. Visitor parking level -1, bay 18.", desc: "Visitor bay in a large gated community — walk to Ecospace while you charge." },
  { id: "blr-ecity-01", host: H3, title: "Electronic City driveway fast top-up", area: "Electronic City", lat: 12.8452, lng: 77.6602, connector: "CCS2", kw: 25, rate: 15.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-1"), rating: 0, reviews: 0, address: "#19, Neeladri Road, Electronic City Phase 1", notes: "Park on the driveway; charger cable is in the box by the gate.", desc: "Rare home DC charger near the e-city flyover. New listing!" },
  { id: "blr-marathahalli-01", host: H1, title: "Café stop on Outer Ring Road", area: "Marathahalli", lat: 12.9569, lng: 77.7011, connector: "TYPE2", kw: 7.4, rate: 15, access: "BUSINESS", photos: P("cafe-2", "closeup-1"), rating: 4.3, reviews: 31, open: "08:00", close: "22:30", address: "Chai Point Corner, ORR Service Road, Marathahalli", notes: "Charger is next to the bicycle stand. Staff can help with the cable.", desc: "Grab chai and a snack while you charge, right on the ORR service road." },
  { id: "blr-btm-01", host: H4, title: "BTM 2nd Stage home charger", area: "BTM Layout", lat: 12.9166, lng: 77.6101, connector: "TYPE2", kw: 7.4, rate: 12.5, access: "PUBLIC_DRIVEWAY", photos: P("driveway-3", "closeup-2"), rating: 4.8, reviews: 19, address: "#88, 16th Main, BTM 2nd Stage", notes: "Blue gate. Driveway fits one sedan.", desc: "Friendly neighbourhood charger near Udupi Garden signal." },
  { id: "blr-domlur-01", host: H2, title: "Domlur villa — 11 kW", area: "Domlur", lat: 12.9610, lng: 77.6387, connector: "TYPE2", kw: 11, rate: 14, access: "PUBLIC_DRIVEWAY", photos: P("driveway-2", "closeup-1"), online: false, rating: 4.6, reviews: 14, address: "#3, Domlur Layout 2nd Stage", notes: "Watchman will open the gate — mention VoltShare.", desc: "Spacious villa driveway close to the Domlur flyover." },
  { id: "blr-yelahanka-01", host: H3, title: "Airport road society charger", area: "Yelahanka", lat: 13.1007, lng: 77.5963, connector: "TYPE2", kw: 7.4, rate: 11.5, access: "GATED_SOCIETY", photos: P("basement-2"), rating: 4.2, reviews: 6, address: "Block A, Sunrise Enclave, Yelahanka New Town", notes: "Gate code 1150. Basement bay 4.", desc: "Convenient stop on the way to or from the airport." },
  { id: "blr-rajajinagar-01", host: H4, title: "Rajajinagar business park bay", area: "Rajajinagar", lat: 12.9910, lng: 77.5525, connector: "CCS2", kw: 30, rate: 16.5, access: "BUSINESS", photos: P("techpark-1"), meter: true, rating: 4.5, reviews: 22, open: "07:00", close: "21:00", address: "Orion Business Park, Dr Rajkumar Road, Rajajinagar", notes: "Tell the guard at Gate 1 you have a VoltShare booking; bay EV-2.", desc: "30 kW DC in a secure business park, a short walk from Orion Mall." },
];

const DEFAULT_RULES = ["Park only in the marked bay", "Unplug and leave when your slot ends", "No idling after charging is complete"];

async function seedChargers(uids: Record<string, string>) {
  const users = Object.fromEntries(DEMO_USERS.map((u) => [u.email, u]));
  // On the emulator, wipe listings that aren't part of the demo set so re-seeding gives a clean demo.
  if (!PROD) {
    const keep = new Set(CHARGERS.map((c) => c.id));
    const existing = await db.collection("chargers").get();
    for (const d of existing.docs) if (!keep.has(d.id)) await db.recursiveDelete(d.ref);
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
      city: "Bengaluru",
      online: c.online ?? true,
      liveStatus: c.status ?? "available",
      meterVerified: c.meter ?? false,
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

async function main() {
  console.log(`Seeding ${PROD ? "PRODUCTION project " + projectId : "emulators (" + projectId + ")"}…`);
  const uids = await seedUsers();
  await seedChargers(uids);
  console.log(`Done. Demo password: ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
