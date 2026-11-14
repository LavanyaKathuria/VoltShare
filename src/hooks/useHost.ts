"use client";

import { db } from "@/lib/firebase/client";
import type { Booking } from "@/types";
import { collection, doc, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { groupBookings } from "./useBookings";

export type HostStats = {
  totalEarnings: number;
  totalKwh: number;
  sessions: number;
  byDay: Record<string, number>;
  byCharger: Record<string, number>;
};
const EMPTY: HostStats = { totalEarnings: 0, totalKwh: 0, sessions: 0, byDay: {}, byCharger: {} };

/** Aggregates maintained by the billing Cloud Function trigger — never computed on the client. */
export function useHostStats(uid: string | undefined) {
  const [stats, setStats] = useState<HostStats | null>(null);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, "hostStats", uid),
      (s) => setStats(s.exists() ? { ...EMPTY, ...(s.data() as Partial<HostStats>) } : EMPTY),
      () => setStats(EMPTY),
    );
  }, [uid]);
  return stats;
}

/** Live bookings on the host's chargers from 7 days ago onwards (timeline + recent sessions). */
export function useHostBookings(uid: string | undefined) {
  const [list, setList] = useState<Booking[] | null>(null);
  useEffect(() => {
    if (!uid) return;
    const since = Timestamp.fromMillis(Date.now() - 7 * 86_400_000);
    return onSnapshot(
      query(collection(db, "bookings"), where("ownerId", "==", uid), where("startAt", ">=", since), orderBy("startAt", "asc")),
      (s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))),
    );
  }, [uid]);
  return useMemo(() => (list ? groupBookings(list) : null), [list]);
}
