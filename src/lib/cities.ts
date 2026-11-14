import type { LatLng } from "./geo";

/** Cities offered in the location picker. Any other place works via "Use my current location". */
export const CITIES: { id: string; name: string; center: LatLng }[] = [
  { id: "bengaluru", name: "Bengaluru", center: { lat: 12.9756, lng: 77.6066 } },
  { id: "delhi", name: "Delhi", center: { lat: 28.6139, lng: 77.209 } },
  { id: "gurugram", name: "Gurugram", center: { lat: 28.4595, lng: 77.0266 } },
  { id: "noida", name: "Noida", center: { lat: 28.5355, lng: 77.391 } },
  { id: "mumbai", name: "Mumbai", center: { lat: 19.076, lng: 72.8777 } },
  { id: "pune", name: "Pune", center: { lat: 18.5204, lng: 73.8567 } },
  { id: "hyderabad", name: "Hyderabad", center: { lat: 17.385, lng: 78.4867 } },
  { id: "chennai", name: "Chennai", center: { lat: 13.0827, lng: 80.2707 } },
  { id: "kolkata", name: "Kolkata", center: { lat: 22.5726, lng: 88.3639 } },
  { id: "ahmedabad", name: "Ahmedabad", center: { lat: 23.0225, lng: 72.5714 } },
  { id: "jaipur", name: "Jaipur", center: { lat: 26.9124, lng: 75.7873 } },
  { id: "chandigarh", name: "Chandigarh", center: { lat: 30.7333, lng: 76.7794 } },
  { id: "kochi", name: "Kochi", center: { lat: 9.9312, lng: 76.2673 } },
];

export const cityByName = (name: string) => CITIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
export const cityById = (id: string) => CITIES.find((c) => c.id === id);
