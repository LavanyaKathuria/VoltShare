"use client";

import { STATUS_COLOR } from "@/lib/chargers";
import { tileConfig } from "@/lib/mapTiles";
import type { LatLng } from "@/lib/geo";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { MapMarker, MapViewProps } from "./types";

// Basemap is configurable (see src/lib/mapTiles.ts). Pins and circles are drawn by us on top.
const TILES = tileConfig();

function priceIcon(m: MapMarker, active: boolean) {
  const bg = STATUS_COLOR[m.status];
  return L.divIcon({
    className: "vs-pin",
    iconSize: [0, 0],
    html: `<div class="vs-pin-inner${active ? " is-active" : ""}" style="--pin:${bg}">${m.label}</div>`,
  });
}

const pinIcon = L.divIcon({
  className: "vs-pin",
  iconSize: [0, 0],
  html: `<div class="vs-drop"><span></span></div>`,
});

function Recenter({ center, zoom }: { center: LatLng; zoom?: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 0.6 });
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Events({ onMoveEnd, onPinChange }: Pick<MapViewProps, "onMoveEnd" | "onPinChange">) {
  const map = useMapEvents({
    moveend() {
      if (!onMoveEnd) return;
      const c = map.getCenter();
      const ne = map.getBounds().getNorthEast();
      onMoveEnd({ lat: c.lat, lng: c.lng }, Math.min(50_000, c.distanceTo(ne)));
    },
    click(e) {
      onPinChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  // Leaflet needs a nudge when its container is resized by layout changes (sheet, tabs).
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  activeId,
  onMarkerHover,
  onMarkerClick,
  circles = [],
  stations = [],
  userLocation,
  onMoveEnd,
  pin,
  onPinChange,
  interactive = true,
  className,
}: MapViewProps) {
  const icons = useMemo(() => new Map(markers.map((m) => [m.id, priceIcon(m, m.id === activeId)])), [markers, activeId]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      zoomControl={false}
      maxZoom={TILES.maxZoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      attributionControl
      className={className}
      style={{ height: "100%", width: "100%", background: "#EEF2F6" }}
    >
      <TileLayer url={TILES.url} attribution={TILES.attribution} maxZoom={TILES.maxZoom} className={TILES.soften ? "vs-tiles-soft" : undefined} />
      <Recenter center={center} zoom={zoom} />
      <Events onMoveEnd={onMoveEnd} onPinChange={onPinChange} />

      {circles.map((c, i) => (
        <Circle
          key={i}
          center={[c.lat, c.lng]}
          radius={c.radiusM}
          pathOptions={{ color: "#0EA5E9", weight: 1.5, dashArray: "4 6", fillColor: "#0EA5E9", fillOpacity: 0.12 }}
        />
      ))}

      {stations.map((st) => (
        <CircleMarker
          key={st.id}
          center={[st.lat, st.lng]}
          radius={6}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#475569", fillOpacity: 0.9 }}
        >
          <Tooltip direction="top" offset={[0, -6]} className="vs-station-tip">
            <strong>{st.title}</strong>
            {st.lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </Tooltip>
        </CircleMarker>
      ))}

      {userLocation && (
        <CircleMarker
          center={[userLocation.lat, userLocation.lng]}
          radius={7}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#0EA5E9", fillOpacity: 1 }}
        />
      )}

      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={icons.get(m.id)!}
          zIndexOffset={m.id === activeId ? 1000 : m.status === "available" ? 100 : 0}
          eventHandlers={{
            mouseover: () => onMarkerHover?.(m.id),
            mouseout: () => onMarkerHover?.(null),
            click: () => onMarkerClick?.(m.id),
          }}
        />
      ))}

      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onPinChange?.({ lat: p.lat, lng: p.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
