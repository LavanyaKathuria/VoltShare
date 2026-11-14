"use client";

import { BottomSheet, type SheetSnap } from "@/components/explore/BottomSheet";
import { ChargerCard, displayStatus } from "@/components/explore/ChargerCard";
import { applyFilters, DEFAULT_FILTERS, Filters, type FilterState } from "@/components/explore/Filters";
import { MapView, type MapMarker } from "@/components/map/MapView";
import { useChargersNear } from "@/hooks/useChargers";
import { useMediaQuery, useUserLocation } from "@/hooks/useMedia";
import { cn } from "@/lib/cn";
import { formatRate, STATUS_COLOR } from "@/lib/chargers";
import { CITY_CENTER, distanceKm, type LatLng } from "@/lib/geo";
import { AnimatePresence, motion } from "framer-motion";
import { List, Loader2, LocateFixed, Map as MapIcon, RotateCw, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function Legend() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-line bg-white/95 px-3 py-1.5 text-[11px] font-medium shadow-soft backdrop-blur">
      {(["available", "charging", "busy"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5 capitalize">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
          {s === "charging" ? "Charging" : s}
        </span>
      ))}
    </div>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <SearchX className="h-8 w-8 text-muted" />
      <p className="mt-3 font-medium">No chargers match here</p>
      <p className="mt-1 text-sm text-muted">Try clearing filters or moving the map.</p>
      <button className="mt-4 text-sm font-medium text-sky-600 hover:underline" onClick={onReset}>
        Clear filters
      </button>
    </div>
  );
}

export default function ExplorePage() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const userLoc = useUserLocation();
  const [mapCenter, setMapCenter] = useState<LatLng>(CITY_CENTER);
  const [query, setQuery] = useState<{ c: LatLng; r: number }>({ c: CITY_CENTER, r: 20_000 });
  const [moved, setMoved] = useState<{ c: LatLng; r: number } | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>("half");

  // Jump to the user's location once we know it.
  useEffect(() => {
    if (!userLoc) return;
    setMapCenter(userLoc);
    setQuery({ c: userLoc, r: 20_000 });
  }, [userLoc]);

  const { chargers, loading } = useChargersNear(query.c, query.r);
  const origin = userLoc ?? CITY_CENTER;

  const list = useMemo(
    () => applyFilters(chargers.map((c) => ({ ...c, dist: distanceKm(origin, { lat: c.approxLat, lng: c.approxLng }) })), filters),
    [chargers, filters, origin],
  );
  const markers: MapMarker[] = useMemo(
    () => list.map((c) => ({ id: c.id, lat: c.approxLat, lng: c.approxLng, label: formatRate(c.ratePerKwh), status: displayStatus(c) })),
    [list],
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
        <p className="text-xs text-muted">{userLoc ? "Sorted from your location" : "Around MG Road, Bengaluru"} · live availability</p>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
    </div>
  );

  const map = (
    <MapView
      center={mapCenter}
      zoom={isDesktop ? 13 : 12}
      markers={markers}
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
    !loading && <Empty onReset={() => setFilters(DEFAULT_FILTERS)} />
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
            <div className="absolute bottom-3 left-3 z-[500]">
              <Legend />
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
