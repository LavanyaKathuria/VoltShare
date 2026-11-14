"use client";

import { db } from "@/lib/firebase/client";
import type { Booking, SlotLock } from "@/types";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

/** Live public slot locks for one charger + date. Every open client re-renders the pills instantly. */
export function useSlotLocks(chargerId: string, date: string) {
  const [locks, setLocks] = useState<Record<string, SlotLock["status"]>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    return onSnapshot(query(collection(db, "slots"), where("chargerId", "==", chargerId), where("date", "==", date)), (s) => {
      const next: Record<string, SlotLock["status"]> = {};
      s.docs.forEach((d) => {
        const l = d.data() as SlotLock;
        next[l.slot] = l.status;
      });
      setLocks(next);
      setReady(true);
    });
  }, [chargerId, date]);
  return { locks, ready };
}

export type BookingGroup = {
  groupId: string;
  first: Booking;
  slots: Booking[];
  status: Booking["status"];
  start: Date;
  end: Date;
};

export function groupBookings(list: Booking[]): BookingGroup[] {
  const by = new Map<string, Booking[]>();
  list.forEach((b) => by.set(b.groupId, [...(by.get(b.groupId) ?? []), b]));
  return [...by.entries()].map(([groupId, slots]) => {
    slots.sort((a, b) => a.slot.localeCompare(b.slot));
    const statuses = slots.map((s) => s.status);
    const status = statuses.includes("active") ? "active" : statuses.every((s) => s === "completed") ? "completed" : statuses[0];
    return { groupId, first: slots[0], slots, status, start: slots[0].startAt.toDate(), end: slots[slots.length - 1].endAt.toDate() };
  });
}

/** The signed-in renter's bookings (live) + cancelled/expired history. */
export function useMyBookings(uid: string | undefined) {
  const [live, setLive] = useState<Booking[] | null>(null);
  const [history, setHistory] = useState<(Booking & { closedBy?: string })[]>([]);
  useEffect(() => {
    if (!uid) return;
    const u1 = onSnapshot(query(collection(db, "bookings"), where("renterId", "==", uid), orderBy("startAt", "desc")), (s) =>
      setLive(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))),
    );
    const u2 = onSnapshot(query(collection(db, "bookingHistory"), where("renterId", "==", uid), orderBy("startAt", "desc")), (s) =>
      setHistory(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))),
    );
    return () => {
      u1();
      u2();
    };
  }, [uid]);
  const groups = useMemo(() => (live ? groupBookings(live) : null), [live]);
  return { groups, history };
}
