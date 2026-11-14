import { setGlobalOptions } from "firebase-functions/v2";

// Mumbai region: lowest latency for Indian users.
setGlobalOptions({ region: "asia-south1", maxInstances: 20 });

export { becomeHost, adminSetUserRoles } from "./auth/roles";
export { confirmBooking, cancelBooking, simulateRivalBooking, releaseExpiredHolds } from "./bookings";
export { checkIn, checkOut, billOnComplete, revokeExpiredAccess } from "./bookings/sessions";
