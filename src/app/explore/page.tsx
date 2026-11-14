"use client";

import { BottomSheet, type SheetSnap } from "@/components/explore/BottomSheet";
import { ChargerCard, displayStatus } from "@/components/explore/ChargerCard";
import { applyFilters, DEFAULT_FILTERS, Filters, type FilterState } from "@/components/explore/Filters";
import { MapView, type MapMarker, type StationMarker } from "@/components/map/MapView";
import { useChargersNear } from "@/hooks/useChargers";
import { usePublicStations } from "@/hooks/usePublicStations";
import { useMediaQuery } from "@/hooks/useMedia";
import { useLocation } from "@/components/layout/LocationProvider";
import { cn } from "@/lib/cn";
import { formatRate, STATUS_COLOR } from "@/lib/chargers";
import { distanceKm, type LatLng } from "@/lib/geo";
import { AnimatePresence, motion } from "framer-motion";
import { Fuel, List, Loader2, LocateFixed, Map as MapIcon, RotateCw, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function Legend({ stations }: { stations: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-white/95 px-3 py-1.5 text-[11px] font-medium shadow-soft backdrop-blur">
      {(["available", "charging", "busy"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5 capitalize">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
          {s === "charging" ? "Charging" : s}
        </span>
      ))}
      {stations && (
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-600 ring-1 ring-slate-300" /> Public station (not bookable)
        </span>
      )}
    </div>
  );
}

/** Toggle for the Open Charge Map layer. Disabled (with an explanation) when no API key is configured. */
function StationsToggle({ on, onChange, enabled, count, loading }: { on: boolean; onChange: (v: boolean) => void; enabled: boolean | null; count: number; loading: boolean }) {
  const off = enabled === false;
  return (
    <button
      onClick={() => !off && onChange(!on)}
      aria-pressed={on && !off}
      title={off ? "Add OCM_API_KEY on the server to show public stations from Open Charge Map" : "Public stations from Open Charge Map"}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-soft transition",
        off ? "cursor-not-allowed border-line bg-white/90 text-muted" : on ? "border-slate-500 bg-slate-700 text-white" : "border-line bg-white text-ink hover:border-slate-400",
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fuel className="h-3.5 w-3.5" />}
      Public stations{!off && on && !loading ? ` · ${count}` : ""}
      {off && <span className="font-normal">(off)</span>}
    </button>
  );
}

function Empty({ onReset, filtered, label }: { onReset: () => void; filtered: boolean; label: string }) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <SearchX className="h-8 w-8 text-muted" />
      {filtered ? (
        <>
          <p className="mt-3 font-medium">No chargers match these filters</p>
          <p className="mt-1 text-sm text-muted">Try clearing filters or moving the map.</p>
          <button className="mt-4 text-sm font-medium text-sky-600 hover:underline" onClick={onReset}>
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 font-medium">No chargers listed {label === "Near you" ? "near you" : `around ${label}`} yet</p>
          <p className="mt-1 max-w-xs text-sm text-muted">Have a charger at home, a café or your society? Be the first host here.</p>
          <a href="/host/chargers/new" className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            List your charger
          </a>
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { center, label, userLoc, place } = useLocation();
  const [mapCenter, setMapCenter] = useState<LatLng>(center);
  const [query, setQuery] = useState<{ c: LatLng; r: number }>({ c: center, r: 20_000 });
  const [moved, setMoved] = useState<{ c: LatLng; r: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [showStations, setShowStations] = useState(true);

  // Follow the navbar location picker (a city, or the user's current location).
  useEffect(() => {
    setMapCenter(center);
    setQuery({ c: center, r: 20_000 });
    setMoved(null);
    setSelectedId(null);
  }, [center.lat, center.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const { chargers, loading } = useChargersNear(query.c, query.r);
  const origin = userLoc ?? center;

  const list = useMemo(
    () => applyFilters(chargers.map((c) => ({ ...c, dist: distanceKm(origin, { lat: c.approxLat, lng: c.approxLng }) })), filters),
    [chargers, filters, origin],
  );
  const markers: MapMarker[] = useMemo(
    () => list.map((c) => ({ id: c.id, lat: c.approxLat, lng: c.approxLng, label: formatRate(c.ratePerKwh), status: displayStatus(c) })),
    [list],
  );
  const pub = usePublicStations(query.c, query.r, showStations);
  const stationMarkers: StationMarker[] = useMemo(
    () =>
      showStations && pub.enabled
        ? pub.stations.map((st) => ({
            id: `ocm-${st.id}`,
            lat: st.lat,
            lng: st.lng,
            title: st.name,
            lines: [
              ["Public station", st.operator].filter(Boolean).join(" · "),
              st.connectors.map((c) => `${c.type}${c.kw ? ` ${c.kw} kW` : ""}`).join(", ") || "Connectors unknown",
              st.operational === false ? "Reported not operational" : "Not bookable on VoltShare",
            ],
          }))
        : [],
    [pub, showStations],
  );
  const activeId = hoverId ?? selectedId;
  const selected = list.find((c) => c.id === selectedId);

  function onMoveEnd(c: LatLng, r: number) {
    const far = distanceKm(c, query.c) * 1000 > query.r * 0.35 || r > query.r * 1.3;
    setMoved(far ? { c, r: Math.max(r, 3000) } : null);
  }

  function onMarkerClick(id: string) {
    setSelectedId(id);
    if (isDesktop) document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    else setSnap("peek");
  }

  const heading = (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-lg font-bold md:text-xl">
          {loading ? "Finding chargers…" : `${list.length} charger${list.length === 1 ? "" : "s"} nearby`}
        </h1>
        <p className="text-xs text-muted">{place.kind === "here" ? "Near your current location" : `Around ${label}`} · live availability</p>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
    </div>
  );

  const map = (
    <MapView
      center={mapCenter}
      zoom={isDesktop ? 13 : 12}
      markers={markers}
      stations={stationMarkers}
      activeId={activeId}
      onMarkerHover={setHoverId}
      onMarkerClick={onMarkerClick}
      userLocation={userLoc}
      onMoveEnd={onMoveEnd}
    />
  );

  const searchArea = (
    <AnimatePresence>
      {moved && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          onClick={() => {
            setQuery(moved);
            setMoved(null);
          }}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lift"
        >
          <RotateCw className="h-3.5 w-3.5" /> Search this area
        </motion.button>
      )}
    </AnimatePresence>
  );

  const cards = list.length ? (
    <div className="grid gap-4 @lg:grid-cols-2">
      {list.map((c) => (
        <ChargerCard key={c.id} c={c} distanceKm={c.dist} active={activeId === c.id} onHover={setHoverId} />
      ))}
    </div>
  ) : (
    !loading && (
      <Empty
        onReset={() => setFilters(DEFAULT_FILTERS)}
        filtered={chargers.length > 0}
        label={label}
      />
    )
  );

  if (isDesktop === null) return <div className="h-[calc(100dvh-4rem)] animate-pulse bg-slate-50" />;

  if (isDesktop)
    return (
      <main className="grid h-[calc(100dvh-4rem)] grid-cols-2 lg:grid-cols-[45%_55%]">
        <section className="@container overflow-y-auto px-5 py-5 lg:px-8">
          {heading}
          <div className="sticky -top-5 z-10 -mx-5 mt-3 bg-gradient-to-b from-[#f5fbfd] via-[#f5fbfd] to-transparent px-5 pb-3 pt-2 lg:-mx-8 lg:px-8">
            <Filters value={filters} onChange={setFilters} />
          </div>
          {cards}
        </section>
        <section className="relative p-3 pl-0">
          <div className="relative h-full overflow-hidden rounded-2xl border border-line shadow-soft">
            {map}
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[500] flex justify-center">
              <div className="pointer-events-auto">{searchArea}</div>
            </div>
            <div className="absolute right-3 top-3 z-[500]">
              <StationsToggle on={showStations} onChange={setShowStations} enabled={pub.enabled} count={pub.stations.length} loading={pub.loading} />
            </div>
            <div className="absolute bottom-3 left-3 right-3 z-[500] flex items-end justify-between gap-2">
              <Legend stations={stationMarkers.length > 0} />
              {stationMarkers.length > 0 && (
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-muted">
                  Public stations: <a className="underline" href="https://openchargemap.org" target="_blank" rel="noreferrer">Open Charge Map</a>
                </span>
              )}
            </div>
          </div>
        </section>
      </main>
    );

  // ---------- Mobile: full-screen map + draggable sheet ----------
  return (
    <main className="relative h-[calc(100dvh-4rem)] overflow-hidden">
      <div className="absolute inset-0">{map}</div>
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex flex-col items-center gap-2 px-4">
        <div className="pointer-events-auto w-full rounded-2xl bg-white/95 p-2 shadow-soft backdrop-blur">
          <Filters value={filters} onChange={setFilters} />
        </div>
        <div className="pointer-events-auto">{searchArea}</div>
      </div>
      <div className="absolute left-4 top-24 z-[400]">
        <StationsToggle on={showStations} onChange={setShowStations} enabled={pub.enabled} count={pub.stations.length} loading={pub.loading} />
      </div>
      {userLoc && (
        <button
          aria-label="My location"
          onClick={() => setMapCenter({ ...userLoc })}
          className="absolute right-4 top-24 z-[400] grid h-10 w-10 place-items-center rounded-full bg-white shadow-soft"
        >
          <LocateFixed className="h-4 w-4 text-sky" />
        </button>
      )}

      <AnimatePresence>
        {selected && snap === "peek" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-x-3 bottom-[148px] z-[600]"
          >
            <button
              aria-label="Close preview"
              onClick={() => setSelectedId(null)}
              className="absolute -top-2 right-0 z-10 grid h-7 w-7 place-items-center rounded-full bg-white shadow-soft"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <ChargerCard c={selected} distanceKm={selected.dist} variant="row" />
          </motion.div>
        )}
      </AnimatePresence>

      <BottomSheet snap={snap} onSnapChange={setSnap} header={heading}>
        <div className="@container pt-2">{cards}</div>
      </BottomSheet>

      {/* Floating List / Map toggle */}
      <button
        onClick={() => setSnap(snap === "full" ? "peek" : "full")}
        className={cn(
          "fixed bottom-5 left-1/2 z-[700] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white shadow-lift",
        )}
      >
        {snap === "full" ? (
          <>
            <MapIcon className="h-4 w-4" /> Map
          </>
        ) : (
          <>
            <List className="h-4 w-4" /> List
          </>
        )}
      </button>
    </main>
  );
}
