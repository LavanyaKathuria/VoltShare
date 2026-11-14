"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { BookingStatusPill } from "@/components/booking/BookingStatusPill";
import { estimateKwh } from "@/components/charger/Cost";
import { PaymentSheet, type PendingBooking } from "@/components/charger/PaymentSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useMyBookings, type BookingGroup } from "@/hooks/useBookings";
import { cancelBooking } from "@/lib/bookings";
import { formatINR, formatRate } from "@/lib/chargers";
import { formatDateKey, slotEndLabel, slotLabel } from "@/lib/time";
import { CalendarDays, Hash, Loader2, MapPin, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function range(g: { first: { groupSlots: string[] } }) {
  const s = g.first.groupSlots;
  return `${slotLabel(s[0])} – ${slotEndLabel(s[s.length - 1])}`;
}

function BookingCard({ g, onPay }: { g: BookingGroup; onPay: (p: PendingBooking) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const b = g.first;
  const hours = g.slots.length / 2;
  const kwh = b.kwh ?? estimateKwh(b.powerKw, hours);
  const upcoming = g.status === "pending" || (g.status === "confirmed" && g.start.getTime() > Date.now());

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <BookingStatusPill status={g.status} />
          <Link href={`/chargers/${b.chargerId}`} className="block truncate text-lg font-semibold hover:underline">
            {b.chargerTitle}
          </Link>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.area}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDateKey(b.date)}</span>
            <span className="num">{range(g)}</span>
          </p>
          <p className="text-sm text-muted">
            <span className="num">{g.slots.length} × 30 min</span> · <span className="num">{formatRate(b.ratePerKwh)}</span> ·{" "}
            {b.amount !== undefined ? (
              <span className="num font-medium text-ink">Paid {formatINR(b.amount)}</span>
            ) : (
              <span>est. <span className="num">{formatINR(b.ratePerKwh * kwh * 1.15)}</span></span>
            )}
          </p>
        </div>

        {b.pin && (g.status === "confirmed" || g.status === "active") && (
          <div className="shrink-0 rounded-2xl bg-ink px-5 py-3 text-center text-white">
            <p className="flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
              <Hash className="h-3 w-3" /> Check-in PIN
            </p>
            <p className="num mt-0.5 text-3xl font-medium tracking-[0.3em] text-emerald-300">{b.pin}</p>
          </div>
        )}
      </div>

      {(upcoming || g.status === "pending") && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-slate-50/60 px-5 py-3">
          {g.status === "pending" && (
            <Button
              variant="brand"
              size="sm"
              onClick={() =>
                onPay({
                  groupId: g.groupId,
                  chargerTitle: b.chargerTitle,
                  date: b.date,
                  slots: b.groupSlots,
                  rate: b.ratePerKwh,
                  kwh,
                  createdAt: b.createdAt?.toMillis() ?? Date.now(),
                })
              }
            >
              <Zap className="h-3.5 w-3.5" /> Complete payment
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={async () => {
              if (!confirm("Cancel this booking and release the slots?")) return;
              setBusy(true);
              try {
                await cancelBooking(g.groupId);
                toast({ tone: "info", title: "Booking cancelled", body: "The slots are free for others again." });
              } catch (e) {
                toast({ tone: "error", title: "Couldn't cancel", body: (e as Error).message });
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Cancel booking
          </Button>
        </div>
      )}
    </article>
  );
}

function Bookings() {
  const { user } = useAuth();
  const { groups, history } = useMyBookings(user?.uid);
  const [pay, setPay] = useState<PendingBooking | null>(null);

  if (!groups) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  const now = Date.now();
  const current = groups.filter((g) => g.status === "active" || ((g.status === "pending" || g.status === "confirmed") && g.end.getTime() > now)).sort((a, b) => +a.start - +b.start);
  const past = groups.filter((g) => !current.includes(g));

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg">Upcoming</h2>
        {current.length ? (
          <div className="space-y-3">{current.map((g) => <BookingCard key={g.groupId} g={g} onPay={setPay} />)}</div>
        ) : (
          <div className="card flex flex-col items-center p-10 text-center">
            <Zap className="h-8 w-8 text-sky" />
            <p className="mt-3 font-medium">No upcoming bookings</p>
            <p className="mt-1 text-sm text-muted">Find a charger nearby and grab a slot.</p>
            <ButtonLink href="/explore" variant="brand" className="mt-4">Find a charger</ButtonLink>
          </div>
        )}
      </section>

      {(past.length > 0 || history.length > 0) && (
        <section>
          <h2 className="mb-3 text-lg">Past & cancelled</h2>
          <div className="space-y-3">
            {past.map((g) => <BookingCard key={g.groupId} g={g} onPay={setPay} />)}
            {history.map((h) => (
              <div key={h.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 opacity-80">
                <div className="min-w-0">
                  <p className="truncate font-medium">{h.chargerTitle}</p>
                  <p className="num text-sm text-muted">
                    {formatDateKey(h.date)} · {slotLabel(h.groupSlots[0])} – {slotEndLabel(h.groupSlots[h.groupSlots.length - 1])}
                  </p>
                </div>
                <BookingStatusPill status={h.status === "cancelled" ? "cancelled" : "expired"} />
              </div>
            ))}
          </div>
        </section>
      )}
      <PaymentSheet pending={pay} onDone={() => setPay(null)} />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <main className="px-4 py-10 sm:px-6">
      <RequireAuth>
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl">My bookings</h1>
          <p className="mb-6 mt-1 text-muted">Live — updates the moment a booking is confirmed, cancelled or started.</p>
          <Bookings />
        </div>
      </RequireAuth>
    </main>
  );
}
