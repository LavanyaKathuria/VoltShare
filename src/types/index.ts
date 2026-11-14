import type { Timestamp } from "firebase/firestore";

export type Role = "renter" | "host" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  photo: string | null;
  roles: Role[];
  verifiedHost: boolean;
  createdAt?: Timestamp;
  claimsUpdatedAt?: Timestamp;
}

export type Connector = "TYPE2" | "CCS2" | "SOCKET15A";
export type AccessType = "PUBLIC_DRIVEWAY" | "GATED_SOCIETY" | "BUSINESS";
/** Live status shown on pins: available (green), charging now (amber), busy/offline (grey). */
export type LiveStatus = "available" | "charging" | "busy";

export interface Charger {
  id: string;
  ownerId: string;
  hostName: string;
  hostPhoto: string | null;
  hostVerified: boolean; // must equal users/{ownerId}.verifiedHost (enforced by rules)
  title: string;
  description: string;
  photos: string[];
  connector: Connector;
  powerKw: number;
  ratePerKwh: number;
  accessType: AccessType;
  rules: string[];
  openTime: string; // "HH:mm" (24h, IST)
  closeTime: string; // "HH:mm"
  // Public, privacy-preserving location (~300 m fuzz)
  approxLat: number;
  approxLng: number;
  geohash: string;
  area: string;
  city: string;
  online: boolean;
  liveStatus: LiveStatus;
  meterVerified: boolean; // "DISCOM EV Meter Verified" demo flag
  demo?: boolean; // fictional sample listing created by the seed script
  rating: number;
  reviewCount: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** chargers/{id}/private/details — host, admins, or renters holding renterAccess only. */
export interface ChargerPrivate {
  address: string;
  exactLat: number;
  exactLng: number;
  accessNotes: string;
}

export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

/** bookings/{chargerId}_{YYYY-MM-DD}_{HHmm} — one doc per 30-min slot. */
export interface Booking {
  id: string;
  groupId: string; // id of the first slot doc in a multi-slot booking
  groupSlots: string[]; // all HHmm slots in the group, sorted
  chargerId: string;
  chargerTitle: string;
  area: string;
  renterId: string;
  renterName: string;
  ownerId: string;
  date: string;
  slot: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: BookingStatus;
  ratePerKwh: number;
  powerKw: number;
  pin?: string;
  createdAt?: Timestamp;
  confirmedAt?: Timestamp;
  // Filled in Phase 5 (check-in/out + billing)
  checkedInAt?: Timestamp;
  checkedOutAt?: Timestamp;
  kwh?: number;
  energyCost?: number;
  platformFee?: number;
  amount?: number;
  hostEarning?: number;
  meterPhotoPath?: string | null;
  autoClosed?: boolean;
}

/** slots/{same id as booking} — public, no personal data. Drives live slot pills. */
export interface SlotLock {
  chargerId: string;
  date: string;
  slot: string;
  status: "held" | "booked";
}
