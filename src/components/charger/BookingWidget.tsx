"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useSlotLocks } from "@/hooks/useBookings";
import { bookSlots, friendlyBookingError, simulateRival, SlotTakenError } from "@/lib/bookings";
import { cn } from "@/lib/cn";
import { formatRate, to12h } from "@/lib/chargers";
import { dateKeyIST, slotBookable, slotEndLabel, slotKeys, slotLabel } from "@/lib/time";
import type { Charger } from "@/types";
import { Clock, FlaskConical, Loader2, Pencil, ShieldCheck, Swords, Trophy, XCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CostBreakdown, estimateKwh, formatDuration } from "./Cost";
import { PaymentSheet, type PendingBooking } from "./PaymentSheet";

export { CostBreakdown, estimateKwh };
import { DatePills, nextSelection, SlotGrid } from "./SlotPicker";

type RaceResult = { slot: string; you: "won" | "lost" | "error"; rival: "won" | "lost" | "error" };

export function BookingWidget({ c, isOwner, className }: { c: Charger; isOwner: boolean; className?: string }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [date, setDate] = useState(() => dateKeyIST());
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"book" | "race" | null>(null);
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [race, setRace] = useState<RaceResult | null>(null);
  const { locks } = useSlotLocks(c.id, date);
  const mine = useRef<Set<string>>(new Set()); // slots this tab just locked (don't toast for our own wins)

  const all = useMemo(() => slotKeys(c.openTime, c.closeTime), [c.openTime, c.closeTime]);
  const free = (s: string) => !locks[s] && slotBookable(date, s);

  useEffect(() => setSelected([]), [date]);

  // Real-time: if someone else grabs a slot we have selected, drop it and say so.
  useEffect(() => {
    const lost = selected.filter((s) => locks[s] && !mine.current.has(s));
    if (!lost.length) return;
    setSelected((sel) => sel.filter((s) => !lost.includes(s)));
    toast({ tone: "error", title: "Slot just taken!", body: `${slotLabel(lost[0])} was booked by someone else a moment ago.` });
  }, [locks]); // eslint-disable-line react-hooks/exhaustive-deps

  const hours = selected.length / 2;
  const kwh = estimateKwh(c.powerKw, hours || 1);
  const canBook = c.online && !isOwner;

  function requireLogin() {
    if (user) return false;
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
    return true;
  }

  async function book() {
    if (requireLogin() || !selected.length) return;
    setBusy("book");
    try {
      selected.forEach((s) => mine.current.add(s));
      const groupId = await bookSlots(c, date, selected, { uid: user!.uid, name: profile?.name ?? "Renter" });
      setPending({ groupId, chargerTitle: c.title, date, slots: [...selected].sort(), rate: c.ratePerKwh, kwh, createdAt: Date.now() });
      setSelected([]);
    } catch (e) {
      selected.forEach((s) => mine.current.delete(s));
      if (e instanceof SlotTakenError) setSelected((sel) => sel.filter((s) => s !== e.slot));
      toast({ tone: "error", title: "Slot just taken!", body: friendlyBookingError(e) });
    } finally {
      setBusy(null);
    }
  }

  /** Two transactions for the same slot at the same instant: this tab vs. a "Rival Driver" on the server. */
  async function simulateRace() {
    if (requireLogin()) return;
    const slot = selected[0] ?? all.find(free);
    if (!slot) return toast({ tone: "info", title: "No free slot to race for on this date" });
    setBusy("race");
    setRace(null);
    mine.current.add(slot);
    const [you, rival] = await Promise.allSettled([
      bookSlots(c, date, [slot], { uid: user!.uid, name: profile?.name ?? "Renter" }),
      simulateRival(c.id, date, slot),
    ]);
    const youWon = you.status === "fulfilled";
    const rivalWon = rival.status === "fulfilled" && rival.value.data.won;
    setRace({ slot, you: youWon ? "won" : you.reason instanceof SlotTakenError || you.status === "rejected" ? "lost" : "error", rival: rival.status === "rejected" ? "error" : rivalWon ? "won" : "lost" });
    setBusy(null);
    setSelected([]);
    if (youWon) {
      toast({ tone: "success", title: "You got it!", body: "Rival Driver’s transaction was rejected: “Slot just taken!”" });
      setPending({ groupId: you.value, chargerTitle: c.title, date, slots: [slot], rate: c.ratePerKwh, kwh: estimateKwh(c.powerKw, 0.5), createdAt: Date.now() });
    } else {
      mine.current.delete(slot);
      toast({ tone: "error", title: "Slot just taken!", body: `Rival Driver booked ${slotLabel(slot)} a split second earlier.` });
    }
  }

  return (
    <div className={cn("card p-5 shadow-lift", className)} id="book">
      <div className="flex items-baseline justify-between">
        <p className="num text-2xl font-semibold">{formatRate(c.ratePerKwh)}</p>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          <span className="num">
            {to12h(c.openTime)} – {to12h(c.closeTime)}
          </span>
        </span>
      </div>

      <div className="mt-4">
        <DatePills value={date} onChange={setDate} />
      </div>
      <div className="mt-3">
        <SlotGrid
          openTime={c.openTime}
          closeTime={c.closeTime}
          date={date}
          locks={locks}
          selected={selected}
          readOnly={!canBook}
          onToggle={(s) => setSelected((sel) => nextSelection(all, free, sel, s))}
        />
      </div>

      {selected.length > 0 && (
        <div className="mt-4 rounded-xl bg-sky-tint/60 px-3 py-2 text-sm">
          <span className="num font-medium text-sky-600">
            {slotLabel(selected[0])} – {slotEndLabel(selected[selected.length - 1])}
          </span>
          <span className="text-muted"> · {formatDuration(hours)} · ≈ <span className="num">{kwh} kWh</span></span>
        </div>
      )}

      <div className="mt-4">
        <CostBreakdown rate={c.ratePerKwh} kwh={kwh} />
        {!selected.length && <p className="mt-1 text-xs text-muted">Estimate shown for 1 hour — pick slots to update.</p>}
      </div>

      {isOwner ? (
        <ButtonLink href={`/host/chargers/${c.id}/edit`} variant="outline" className="mt-5 w-full">
          <Pencil className="h-4 w-4" /> Edit your listing
        </ButtonLink>
      ) : !c.online ? (
        <Button className="mt-5 w-full" disabled>
          Host has taken this charger offline
        </Button>
      ) : (
        <Button variant="brand" size="lg" className="mt-5 w-full" disabled={!!busy || (!!user && !selected.length)} onClick={book}>
          {busy === "book" && <Loader2 className="h-4 w-4 animate-spin" />}
          {!user ? "Sign in to book" : selected.length ? `Reserve ${selected.length} slot${selected.length > 1 ? "s" : ""}` : "Select slots"}
        </Button>
      )}
      <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5" /> Pay only for the kWh you actually use
      </p>

      {canBook && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
          <button
            onClick={simulateRace}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 text-sm font-medium text-ink hover:text-sky-600 disabled:opacity-60"
          >
            {busy === "race" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Simulate concurrent booking
          </button>
          <p className="mt-1 text-center text-[11px] text-muted">
            Fires your transaction and a rival’s for {selected[0] ? "the selected" : "the next free"} slot at the same instant.
          </p>
          {race && (
            <div className="mt-3 space-y-1.5 text-sm" aria-live="polite">
              <p className="num text-center text-xs text-muted">Race for {slotLabel(race.slot)}</p>
              {(
                [
                  ["You (this tab)", race.you],
                  ["Rival Driver", race.rival],
                ] as const
              ).map(([who, r]) => (
                <div key={who} className={cn("flex items-center justify-between rounded-lg px-3 py-1.5", r === "won" ? "bg-avail-bg text-avail-fg" : "bg-busy-bg text-busy-fg")}>
                  <span className="flex items-center gap-1.5 font-medium">
                    {r === "won" ? <Trophy className="h-3.5 w-3.5" /> : r === "lost" ? <Swords className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {who}
                  </span>
                  <span>{r === "won" ? "Booked ✓" : r === "lost" ? "Slot just taken!" : "Error"}</span>
                </div>
              ))}
              {race.rival === "won" && <p className="text-center text-[11px] text-muted">The rival’s unpaid hold auto-releases after 10 minutes.</p>}
            </div>
          )}
        </div>
      )}

      <PaymentSheet pending={pending} onDone={() => setPending(null)} />
    </div>
  );
}
