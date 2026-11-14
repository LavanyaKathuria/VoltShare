"use client";

import type { LatLng } from "@/lib/geo";
import type { PublicStation } from "@/lib/publicStations";
import { useEffect, useState } from "react";

/** enabled === null while unknown; false when the server has no Open Charge Map key configured. */
export function usePublicStations(center: LatLng, radiusM: number, on: boolean) {
  const [state, setState] = useState<{ enabled: boolean | null; stations: PublicStation[]; error: string | null; loading: boolean }>({
    enabled: null,
    stations: [],
    error: null,
    loading: false,
  });
  const key = `${center.lat.toFixed(2)},${center.lng.toFixed(2)},${Math.round(radiusM / 1000)}`;
  useEffect(() => {
    if (!on && state.enabled !== null) return;
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/public-stations?lat=${center.lat}&lng=${center.lng}&km=${radiusM / 1000}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setState({ enabled: !!d.enabled, stations: d.stations ?? [], error: d.error ?? null, loading: false }))
      .catch((e) => e.name !== "AbortError" && setState((s) => ({ ...s, error: "Couldn’t load public stations", loading: false })));
    return () => ctrl.abort();
  }, [key, on]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
