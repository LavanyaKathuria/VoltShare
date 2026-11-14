"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "./types";

// Swap point: replace with `import("./GoogleMap")` to move to Google Maps JS API.
const Impl = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100" />,
});

export function MapView(props: MapViewProps) {
  return <Impl {...props} />;
}
export type { MapMarker, MapViewProps, StationMarker } from "./types";
