"use client";

import { db } from "@/lib/firebase/client";
import { distanceKm, queryBounds, type LatLng } from "@/lib/geo";
import type { Charger, ChargerPrivate } from "@/types";
import { collection, doc, endAt, onSnapshot, orderBy, query, startAt, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

const toCharger = (id: string, data: unknown) => ({ id, ...(data as Omit<Charger, "id">) });

/**
 * Live chargers within `radiusM` of `center`.
 * Uses geohash range queries (one listener per range, typically 4–9), so each client only
 * downloads its neighbourhood — this is what keeps the explorer scalable to many cities.
 */
export function useChargersNear(center: LatLng, radiusM = 15_000) {
  const [byRange, setByRange] = useState<Record<string, Charger[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = `${center.lat.toFixed(3)},${center.lng.toFixed(3)},${radiusM}`;

  useEffect(() => {
    const bounds = queryBounds(center, radiusM);
    setByRange({});
    setLoading(true);
    let pending = bounds.length;
    const unsubs = bounds.map(([start, end], i) =>
      onSnapshot(
        query(collection(db, "chargers"), where("online", "==", true), orderBy("geohash"), startAt(start), endAt(end)),
        (snap) => {
          setByRange((prev) => ({ ...prev, [i]: snap.docs.map((d) => toCharger(d.id, d.data())) }));
          if (--pending <= 0) setLoading(false);
        },
        (e) => {
          setError(e.message);
          setLoading(false);
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const chargers = useMemo(() => {
    const seen = new Map<string, Charger>();
    Object.values(byRange).flat().forEach((c) => seen.set(c.id, c));
    // geohash ranges over-fetch at the corners; trim to the true radius
    return [...seen.values()].filter((c) => distanceKm(center, { lat: c.approxLat, lng: c.approxLng }) * 1000 <= radiusM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byRange, key]);

  return { chargers, loading, error };
}

export function useCharger(id: string | undefined) {
  const [charger, setCharger] = useState<Charger | null | undefined>(undefined);
  useEffect(() => {
    if (!id) return;
    return onSnapshot(
      doc(db, "chargers", id),
      (s) => setCharger(s.exists() ? toCharger(s.id, s.data()) : null),
      () => setCharger(null),
    );
  }, [id]);
  return charger;
}

/** Returns details if the rules allow it (host / admin / renter with access); otherwise null. */
export function useChargerPrivate(id: string | undefined, enabled: boolean) {
  const [details, setDetails] = useState<ChargerPrivate | null>(null);
  const [denied, setDenied] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!id || !enabled) return;
    return onSnapshot(
      doc(db, "chargers", id, "private", "details"),
      (s) => {
        setDetails(s.exists() ? (s.data() as ChargerPrivate) : null);
        setDenied(false);
        setLoaded(true);
      },
      () => {
        setDetails(null);
        setDenied(true);
        setLoaded(true);
      },
    );
  }, [id, enabled]);
  return { details, denied, loaded };
}

export function useMyChargers(uid: string | undefined) {
  const [chargers, setChargers] = useState<Charger[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(collection(db, "chargers"), where("ownerId", "==", uid)), (s) =>
      setChargers(s.docs.map((d) => toCharger(d.id, d.data())).sort((a, b) => a.title.localeCompare(b.title))),
    );
  }, [uid]);
  return chargers;
}

export function useAllChargers(enabled: boolean) {
  const [chargers, setChargers] = useState<Charger[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(collection(db, "chargers"), (s) => setChargers(s.docs.map((d) => toCharger(d.id, d.data()))));
  }, [enabled]);
  return chargers;
}
