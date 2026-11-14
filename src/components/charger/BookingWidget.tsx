"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatINR, formatRate, PLATFORM_FEE, to12h } from "@/lib/chargers";
import type { Charger } from "@/types";
import { Clock, Minus, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

/** Rough energy estimate: rated power × time × ~90% charging efficiency. */
export const estimateKwh = (powerKw: number, hours: number) => +(powerKw * hours * 0.9).toFixed(1);

export function CostBreakdown({ rate, kwh }: { rate: number; kwh: number }) {
  const energy = rate * kwh;
  const fee = energy * PLATFORM_FEE;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between text-muted">
        <dt>
          <span className="num">{kwh} kWh</span> × <span className="num">{formatRate(rate)}</span>
        </dt>
        <dd className="num text-ink">{formatINR(energy)}</dd>
      </div>
      <div className="flex justify-between text-muted">
        <dt>Platform fee (15%)</dt>
        <dd className="num text-ink">{formatINR(fee)}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-2 font-semibold">
        <dt>Estimated total</dt>
        <dd className="num">{formatINR(energy + fee)}</dd>
      </div>
    </dl>
  );
}

export function BookingWidget({ c, isOwner }: { c: Charger; isOwner: boolean }) {
  const [halfHours, setHalfHours] = useState(2);
  const hours = halfHours / 2;
  const kwh = estimateKwh(c.powerKw, hours);

  return (
    <div className="card p-5 shadow-lift">
      <div className="flex items-baseline justify-between">
        <p>
          <span className="num text-2xl font-semibold">{formatRate(c.ratePerKwh)}</span>
        </p>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3.5 w-3.5" />
          <span className="num">
            {to12h(c.openTime)} – {to12h(c.closeTime)}
          </span>
        </span>
      </div>

      <div className="mt-4 rounded-xl border border-line p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Charging time</p>
        <div className="mt-2 flex items-center justify-between">
          <button
            aria-label="Less time"
            className="grid h-8 w-8 place-items-center rounded-full border border-line hover:bg-slate-50 disabled:opacity-40"
            disabled={halfHours <= 1}
            onClick={() => setHalfHours((h) => h - 1)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="num text-lg font-medium">{hours % 1 ? `${Math.floor(hours)}h 30m` : `${hours}h`}</p>
            <p className="num text-xs text-muted">≈ {kwh} kWh at {c.powerKw} kW</p>
          </div>
          <button
            aria-label="More time"
            className="grid h-8 w-8 place-items-center rounded-full border border-line hover:bg-slate-50 disabled:opacity-40"
            disabled={halfHours >= 8}
            onClick={() => setHalfHours((h) => h + 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <CostBreakdown rate={c.ratePerKwh} kwh={kwh} />
      </div>

      {isOwner ? (
        <ButtonLink href={`/host/chargers/${c.id}/edit`} variant="outline" className="mt-5 w-full">
          <Pencil className="h-4 w-4" /> Edit your listing
        </ButtonLink>
      ) : (
        <Button variant="brand" size="lg" className={cn("mt-5 w-full")} disabled title="Slot booking arrives in the next phase">
          Choose slots to book
        </Button>
      )}
      <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5" /> Pay only for the kWh you actually use
      </p>
    </div>
  );
}
