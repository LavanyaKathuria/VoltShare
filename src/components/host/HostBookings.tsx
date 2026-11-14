"use client";

import { simulatedKwh, useNow } from "@/components/booking/ActiveSession";
import { BookingStatusPill } from "@/components/booking/BookingStatusPill";
import { estimateKwh } from "@/components/charger/Cost";
import { Pill } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import type { BookingGroup } from "@/hooks/useBookings";
import { callableMessage, cancelBooking } from "@/lib/bookings";
import { formatINR } from "@/lib/chargers";
import { storage } from "@/lib/firebase/client";
import { formatDateKey, slotEndLabel, slotLabel } from "@/lib/time";
import { getDownloadURL, ref } from "firebase/storage";
import { Camera, CalendarClock, Loader2, MapPin, User, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const firstName = (n: string) => n.split(" ")[0];
const range = (g: BookingGroup) => `${slotLabel(g.first.groupSlots[0])} – ${slotEndLabel(g.first.groupSlots[g.first.groupSlots.length - 1])}`;

function dayHeading(dateKey: string) {
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 330 * 60_000 + 86_400_000).toISOString().slice(0, 10);
  return dateKey === today ? "Today" : dateKey === tomorrow ? "Tomorrow" : formatDateKey(dateKey);
}

function TimelineRow({ g }: { g: BookingGroup }) {
  const now = useNow(1000);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const b = g.first;
  const active = g.status === "active";
  const liveKwh = active ? simulatedKwh(b.powerKw, b.checkedInAt?.toMillis() ?? g.start.getTime(), now) : 0;
  const estEarning = b.ratePerKwh * estimateKwh(b.powerKw, g.slots.length / 2);
  const cancellable = (g.status === "pending" || g.status === "confirmed") && g.start.getTime() > now;

  return (
    <li className="relative pl-6">
      <span className={"absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-white " + (active ? "bg-amber-500 animate-pulse" : g.status === "confirmed" ? "bg-brand" : "bg-slate-300")} />
      <div className={"rounded-xl border p-3 " + (active ? "border-amber-200 bg-busy-bg/40" : "border-line bg-white")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="num text-sm font-medium">{range(g)}</p>
          <BookingStatusPill status={g.status} />
        </div>
        <Link href={`/chargers/${b.chargerId}`} className="mt-1 block truncate text-sm font-medium hover:underline">
          {b.chargerTitle}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {firstName(b.renterName)}</span>
          <span className="num">{g.slots.length} × 30 min</span>
          {active ? (
            <span className="flex items-center gap-1 font-medium text-busy-fg">
              <Zap className="h-3 w-3" /> <span className="num">{liveKwh.toFixed(2)} kWh</span> so far
            </span>
          ) : (
            <span>
              est. earning <span className="num text-ink">{formatINR(estEarning, 0)}</span>
            </span>
          )}
        </p>
        {cancellable && (
          <button
            disabled={busy}
            onClick={async () => {
              if (!confirm(`Cancel ${firstName(b.renterName)}'s booking? They'll be notified in their bookings list.`)) return;
              setBusy(true);
              try {
                await cancelBooking(g.groupId);
                toast({ tone: "info", title: "Booking cancelled", body: "The slots are open again." });
              } catch (e) {
                toast({ tone: "error", title: "Couldn't cancel", body: callableMessage(e) });
                setBusy(false);
              }
            }}
            className="mt-2 text-xs font-medium text-muted hover:text-red-600"
          >
            {busy ? "Cancelling…" : "Cancel booking"}
          </button>
        )}
      </div>
    </li>
  );
}

/** Upcoming + in-progress bookings across all the host's chargers, grouped by day. Live. */
export function BookingTimeline({ groups }: { groups: BookingGroup[] | null }) {
  const now = Date.now();
  if (!groups) return <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  const upcoming = groups
    .filter((g) => g.status === "active" || ((g.status === "pending" || g.status === "confirmed") && g.end.getTime() > now))
    .sort((a, b) => +a.start - +b.start);
  if (!upcoming.length)
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-line p-8 text-center">
        <CalendarClock className="h-7 w-7 text-muted" />
        <p className="mt-2 text-sm font-medium">No upcoming bookings</p>
        <p className="text-xs text-muted">New bookings appear here instantly.</p>
      </div>
    );
  const byDay = new Map<string, BookingGroup[]>();
  upcoming.forEach((g) => byDay.set(g.first.date, [...(byDay.get(g.first.date) ?? []), g]));
  return (
    <div className="space-y-5">
      {[...byDay.entries()].map(([day, gs]) => (
        <section key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{dayHeading(day)}</h3>
          <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line">
            {gs.map((g) => (
              <TimelineRow key={g.groupId} g={g} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function PhotoLink({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:underline"
      onClick={async () => {
        setBusy(true);
        try {
          window.open(await getDownloadURL(ref(storage, path)), "_blank", "noopener");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />} Meter photo
    </button>
  );
}

/** Completed sessions in the last 7 days with the server-computed earning for each. */
export function RecentSessions({ groups }: { groups: BookingGroup[] | null }) {
  const [all, setAll] = useState(false);
  const completed = (groups ?? []).filter((g) => g.status === "completed").sort((a, b) => +b.start - +a.start);
  const done = all ? completed : completed.slice(0, 8);
  if (!completed.length) return <p className="text-sm text-muted">Completed sessions from the last 7 days will appear here.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3 font-medium">When</th>
            <th className="py-2 pr-3 font-medium">Charger</th>
            <th className="py-2 pr-3 font-medium">Renter</th>
            <th className="py-2 pr-3 text-right font-medium">Energy</th>
            <th className="py-2 pr-3 text-right font-medium">You earned</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {done.map((g) => {
            const b = g.first as typeof g.first & { hostEarning?: number; meterPhotoPath?: string | null; autoClosed?: boolean };
            return (
              <tr key={g.groupId}>
                <td className="num whitespace-nowrap py-2.5 pr-3 text-xs text-muted">
                  {formatDateKey(b.date)} · {slotLabel(b.groupSlots[0])}
                </td>
                <td className="max-w-[180px] truncate py-2.5 pr-3">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0 text-muted" /> {b.chargerTitle}</span>
                </td>
                <td className="py-2.5 pr-3">{firstName(b.renterName)}</td>
                <td className="num py-2.5 pr-3 text-right">{b.kwh !== undefined ? `${b.kwh} kWh` : "—"}</td>
                <td className="num py-2.5 pr-3 text-right font-medium">
                  {b.hostEarning !== undefined ? formatINR(b.hostEarning) : <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted" />}
                </td>
                <td className="py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    {b.autoClosed && <Pill className="bg-busy-bg text-busy-fg">Auto-closed</Pill>}
                    {b.meterPhotoPath && <PhotoLink path={b.meterPhotoPath} />}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {completed.length > 8 && (
        <button onClick={() => setAll((a) => !a)} className="mt-3 text-sm font-medium text-sky-600 hover:underline">
          {all ? "Show fewer" : `Show all ${completed.length} sessions`}
        </button>
      )}
    </div>
  );
}
