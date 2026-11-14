"use client";

import { CITY_CENTER, distanceKm, type LatLng } from "@/lib/geo";
import { useEffect, useState } from "react";

export function useMediaQuery(q: string) {
  const [match, setMatch] = useState<boolean | null>(null);
  useEffect(() => {
    const m = window.matchMedia(q);
    setMatch(m.matches);
    const on = () => setMatch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [q]);
  return match;
}

/** Browser location, only if it's within the service city (demo data is in Bengaluru). */
export function useUserLocation(maxKmFromCity = 60) {
  const [loc, setLoc] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (distanceKm(here, CITY_CENTER) <= maxKmFromCity) setLoc(here);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, [maxKmFromCity]);
  return loc;
}
