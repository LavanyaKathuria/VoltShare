"use client";

import { MAX_SESSION_KWH } from "@/components/charger/Cost";
import { Pill } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { BookingGroup } from "@/hooks/useBookings";
import { formatINR, formatRate, PLATFORM_FEE } from "@/lib/chargers";
import { slotEndLabel } from "@/lib/time";
import { Gauge, PlugZap, Timer, Zap } from "lucide-react";
import { useEffect, useState } from "react";

const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};

/**
 * Simulated meter: rated power × ~90 % efficiency × elapsed time. (Real deployments would stream
 * readings from an OCPP smart charger instead — see REPORT.md, future enhancements.)
 */
export function simulatedKwh(powerKw: number, checkedInAt: number, now: number) {
  return Math.min(MAX_SESSION_KWH, (powerKw * 0.9 * Math.max(0, now - checkedInAt)) / 3_600_000);
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Dark telemetry card shown only while a session is active. */
export function ActiveSession({ g, onCheckout }: { g: BookingGroup; onCheckout: () => void }) {
  const now = useNow();
  const b = g.first;
  const startedAt = b.checkedInAt?.toMillis() ?? g.start.getTime();
  const kwh = simulatedKwh(b.powerKw, startedAt, now);
  const target = Math.min(MAX_SESSION_KWH, (b.powerKw * 0.9 * (g.end.getTime() - startedAt)) / 3_600_000);
  const cost = kwh * b.ratePerKwh * (1 + PLATFORM_FEE);
  const left = g.end.getTime() - now;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift sm:p-7" aria-label="Active charging session">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-sky/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-2">
        <Pill className="bg-white/10 text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-dot" /> Charging now
        </Pill>
        <span className="text-sm text-slate-400">
          {b.chargerTitle} · until <span className="num">{slotEndLabel(b.groupSlots[b.groupSlots.length - 1])}</span>
        </span>
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-center">
        <div className="rounded-full shadow-[0_0_60px_rgba(16,185,129,0.35)]">
          <ProgressRing value={target ? kwh / target : 0} size={176} stroke={14} track="rgba(255,255,255,0.08)">
            <div className="text-center">
              <p className="num text-3xl font-medium" data-testid="live-kwh">{kwh.toFixed(2)}</p>
              <p className="text-xs uppercase tracking-wider text-slate-400">kWh</p>
            </div>
          </ProgressRing>
        </div>

        <dl className="grid w-full flex-1 grid-cols-2 gap-3">
          {[
            { Icon: Timer, label: "Elapsed", value: hms(now - startedAt) },
            { Icon: Timer, label: "Time left", value: left > 0 ? hms(left) : "Slot ended" },
            { Icon: Zap, label: "Running cost", value: formatINR(cost) },
            { Icon: Gauge, label: "Power · rate", value: `${b.powerKw} kW · ${formatRate(b.ratePerKwh)}` },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
              <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-400">
                <Icon className="h-3 w-3" /> {label}
              </dt>
              <dd className="num mt-1 text-base sm:text-lg">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-slate-400">
          Target ≈ <span className="num">{target.toFixed(1)} kWh</span> by slot end · simulated meter
        </p>
        <button onClick={onCheckout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 font-medium text-white shadow-lg transition hover:brightness-110 sm:w-auto">
          <PlugZap className="h-4 w-4" /> Unplug & check out
        </button>
      </div>
    </section>
  );
}
