"use client";

import { ConnectorBadge, Pill, StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { ACCESS_LABEL, formatRate } from "@/lib/chargers";
import { formatDistance } from "@/lib/geo";
import type { Charger, LiveStatus } from "@/types";
import { BadgeCheck, Building2, Home, Lock, Star } from "lucide-react";
import Link from "next/link";
import { ChargerPhoto } from "./ChargerPhoto";

export const displayStatus = (c: Charger): LiveStatus => (c.online ? c.liveStatus : "busy");

const ACCESS_ICON = { PUBLIC_DRIVEWAY: Home, GATED_SOCIETY: Lock, BUSINESS: Building2 } as const;

export function Rating({ c }: { c: Charger }) {
  if (!c.reviewCount) return <Pill className="bg-sky-tint text-sky-600">New</Pill>;
  return (
    <span className="flex items-center gap-1 text-sm">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="num font-medium">{c.rating.toFixed(1)}</span>
      <span className="text-xs text-muted">({c.reviewCount})</span>
    </span>
  );
}

export function ChargerCard({
  c,
  distanceKm,
  active,
  onHover,
  variant = "grid",
}: {
  c: Charger;
  distanceKm?: number;
  active?: boolean;
  onHover?: (id: string | null) => void;
  variant?: "grid" | "row";
}) {
  const status = displayStatus(c);
  const AccessIcon = ACCESS_ICON[c.accessType];
  const row = variant === "row";
  return (
    <Link
      href={`/chargers/${c.id}`}
      id={`card-${c.id}`}
      onMouseEnter={() => onHover?.(c.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "group card block overflow-hidden transition-all hover:shadow-lift",
        active && "ring-2 ring-sky shadow-lift",
        row && "flex",
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden", row ? "w-32" : "aspect-[16/10]")}>
        <ChargerPhoto src={c.photos[0]} alt={c.title} className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute left-2 top-2">
          <StatusBadge status={status === "busy" ? "locked" : status} label={status === "busy" ? "Busy" : undefined} />
        </div>
      </div>
      <div className={cn("min-w-0 flex-1 space-y-2", row ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">{c.title}</h3>
            <p className="truncate text-xs text-muted">
              {distanceKm !== undefined && <span className="num">{formatDistance(distanceKm)} away · </span>}
              {c.area}
            </p>
          </div>
          <Rating c={c} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ConnectorBadge connector={c.connector} powerKw={c.powerKw} />
          <Pill className="bg-slate-100 text-slate-600">
            <AccessIcon className="h-3 w-3" />
            {ACCESS_LABEL[c.accessType]}
          </Pill>
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <p className="num text-base font-semibold">
            {formatRate(c.ratePerKwh)}
          </p>
          {c.hostVerified && (
            <span className="flex items-center gap-1 text-xs font-medium text-avail-fg">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified host
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
