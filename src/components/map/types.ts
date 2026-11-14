import type { LatLng } from "@/lib/geo";
import type { LiveStatus } from "@/types";

/**
 * Provider-neutral map contract. LeafletMap implements it today; a GoogleMap implementation
 * (Maps JS API + AdvancedMarkerElement) can be dropped in by changing one import in MapView.tsx.
 */
export type MapMarker = { id: string; lat: number; lng: number; label: string; status: LiveStatus };
export type MapCircle = { lat: number; lng: number; radiusM: number };

export interface MapViewProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  activeId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  onMarkerClick?: (id: string) => void;
  circles?: MapCircle[];
  userLocation?: LatLng | null;
  /** Fired after pan/zoom with the visible centre and the radius (m) that covers the viewport. */
  onMoveEnd?: (center: LatLng, radiusM: number) => void;
  /** Location picker mode: a single draggable pin. */
  pin?: LatLng | null;
  onPinChange?: (p: LatLng) => void;
  interactive?: boolean;
  className?: string;
}
