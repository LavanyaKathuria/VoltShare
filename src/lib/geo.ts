import { distanceBetween, geohashForLocation, geohashQueryBounds } from "geofire-common";

export type LatLng = { lat: number; lng: number };

/** MG Road, Bengaluru — default map centre when the browser location is unknown. */
export const CITY_CENTER: LatLng = { lat: 12.9756, lng: 77.6066 };
export const PRIVACY_RADIUS_M = 300;

export const geohash = (p: LatLng) => geohashForLocation([p.lat, p.lng], 9);
export const queryBounds = (p: LatLng, radiusM: number) => geohashQueryBounds([p.lat, p.lng], radiusM);
export const distanceKm = (a: LatLng, b: LatLng) => distanceBetween([a.lat, a.lng], [b.lat, b.lng]);

export const formatDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

/**
 * Airbnb-style location fuzzing. Moves the point to a uniformly random spot 120–250 m away,
 * so the true location is always inside the public 300 m circle but never at its centre.
 */
export function fuzzLocation(p: LatLng): LatLng {
  const dist = 120 + Math.random() * 130; // metres
  const bearing = Math.random() * 2 * Math.PI;
  const dLat = (dist * Math.cos(bearing)) / 111_320;
  const dLng = (dist * Math.sin(bearing)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: +(p.lat + dLat).toFixed(6), lng: +(p.lng + dLng).toFixed(6) };
}
