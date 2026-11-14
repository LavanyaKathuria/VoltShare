"use client";

import { cn } from "@/lib/cn";
import { MAX_SLOTS_PER_BOOKING, nextDates, slotBookable, slotKeys, slotLabel } from "@/lib/time";
import type { SlotLock } from "@/types";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function DatePills({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const dates = useMemo(() => nextDates(7), []);
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {dates.map((d) => (
        <button
          key={d.key}
          onClick={() => onChange(d.key)}
          className={cn(
            "flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 transition",
            value === d.key ? "border-sky bg-sky-tint text-sky-600" : "border-line bg-white hover:border-slate-300",
          )}
        >
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{d.label === "Today" || d.label === "Tomorrow" ? d.label.slice(0, 3) : d.label}</span>
          <span className="num text-base font-semibold leading-tight">{d.day}</span>
          <span className="text-[10px] opacity-60">{d.month}</span>
        </button>
      ))}
    </div>
  );
}

/** Contiguous-range selection rules for 30-min slots. */
export function nextSelection(all: string[], free: (s: string) => boolean, sel: string[], s: string): string[] {
  if (sel.includes(s)) {
    if (s === sel[0]) return sel.slice(1);
    if (s === sel[sel.length - 1]) return sel.slice(0, -1);
    return [s];
  }
  if (!sel.length) return [s];
  const i = all.indexOf(s);
  const a = all.indexOf(sel[0]);
  const b = all.indexOf(sel[sel.length - 1]);
  const range = i > b ? all.slice(a, i + 1) : i < a ? all.slice(i, b + 1) : [s];
  if (range.length <= MAX_SLOTS_PER_BOOKING && range.every(free)) return range;
  return [s];
}

export function SlotGrid({
  openTime,
  closeTime,
  date,
  locks,
  selected,
  onToggle,
  readOnly,
}: {
  openTime: string;
  closeTime: string;
  date: string;
  locks: Record<string, SlotLock["status"]>;
  selected: string[];
  onToggle: (s: string) => void;
  readOnly?: boolean;
}) {
  // re-evaluate "past" slots every minute
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const all = slotKeys(openTime, closeTime);
  const upcoming = all.filter((s) => slotBookable(date, s, now));
  const hidden = all.length - upcoming.length;

  if (!upcoming.length) return <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-muted">No more slots today — pick another date.</p>;

  return (
    <div>
      {hidden > 0 && <p className="mb-2 text-xs text-muted">{hidden} earlier slots have passed</p>}
      <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5" role="listbox" aria-label="Time slots" aria-multiselectable>
        {upcoming.map((s) => {
          const lock = locks[s];
          const isSel = selected.includes(s);
          return (
            <button
              key={s}
              role="option"
              aria-selected={isSel}
              aria-label={`${slotLabel(s)}${lock ? " (booked)" : ""}`}
              data-slot={s}
              data-state={lock ? "locked" : isSel ? "selected" : "free"}
              disabled={!!lock || readOnly}
              onClick={() => onToggle(s)}
              className={cn(
                "num relative flex items-center justify-center gap-1 rounded-full border px-1.5 py-1.5 text-[12px] transition-all",
                lock && "cursor-not-allowed border-transparent bg-lock-bg text-lock-fg line-through",
                !lock && isSel && "border-sky bg-sky-tint font-medium text-sky-600 ring-2 ring-sky/20",
                !lock && !isSel && "border-line bg-white hover:border-brand hover:text-brand-600",
                readOnly && !lock && "hover:border-line hover:text-ink",
              )}
            >
              {lock && <Lock className="h-3 w-3 shrink-0 no-underline" />}
              {slotLabel(s)}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-line bg-white" /> Free</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-tint ring-1 ring-sky" /> Selected</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-lock-bg ring-1 ring-slate-300" /> Booked</span>
      </div>
    </div>
  );
}
