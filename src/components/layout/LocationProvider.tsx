"use client";

import { CITIES, cityById } from "@/lib/cities";
import type { LatLng } from "@/lib/geo";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Place = { kind: "city"; id: string } | { kind: "here"; lat: number; lng: number };
type Ctx = {
  /** Where the explorer should centre. */
  center: LatLng;
  /** Short label for the navbar pill / headings, e.g. "Pune" or "Near you". */
  label: string;
  place: Place;
  /** Last known browser position (for "x km away"), if the user allowed location. */
  userLoc: LatLng | null;
  locating: boolean;
  locError: string | null;
  setCity: (id: string) => void;
  locateMe: () => void;
};

const KEY = "vs-place";
const DEFAULT: Place = { kind: "city", id: "bengaluru" };
const LocCtx = createContext<Ctx | null>(null);

function read(): Place | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v?.kind === "city" && cityById(v.id)) return v;
    if (v?.kind === "here" && typeof v.lat === "number") return v;
  } catch {}
  return null;
}
function save(p: Place) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place>(DEFAULT);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const locate = useCallback((explicit: boolean) => {
    if (!("geolocation" in navigator)) {
      if (explicit) setLocError("This browser can’t share location.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const here = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserLoc(here);
        const next: Place = { kind: "here", ...here };
        setPlace(next);
        save(next);
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        if (explicit) setLocError(e.code === e.PERMISSION_DENIED ? "Location permission is blocked for this site." : "Couldn’t get your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  // First visit: try the browser location; afterwards remember the user's choice.
  useEffect(() => {
    const saved = read();
    if (saved) {
      setPlace(saved);
      if (saved.kind === "here") locate(false); // refresh position quietly
    } else locate(false);
  }, [locate]);

  const value = useMemo<Ctx>(() => {
    const city = place.kind === "city" ? cityById(place.id) ?? CITIES[0] : null;
    return {
      place,
      center: city ? city.center : { lat: (place as { lat: number }).lat, lng: (place as { lng: number }).lng },
      label: city ? city.name : "Near you",
      userLoc,
      locating,
      locError,
      setCity: (id) => {
        const next: Place = { kind: "city", id };
        setPlace(next);
        save(next);
      },
      locateMe: () => locate(true),
    };
  }, [place, userLoc, locating, locError, locate]);

  return <LocCtx.Provider value={value}>{children}</LocCtx.Provider>;
}

export function useLocation() {
  const c = useContext(LocCtx);
  if (!c) throw new Error("useLocation must be used inside <LocationProvider>");
  return c;
}
