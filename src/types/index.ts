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
