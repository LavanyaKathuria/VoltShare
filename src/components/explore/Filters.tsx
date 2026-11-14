"use client";

import { cn } from "@/lib/cn";
import { ACCESS_TYPES, CONNECTORS } from "@/lib/chargers";
import type { AccessType, Charger, Connector } from "@/types";
import { ArrowUpDown, Zap } from "lucide-react";
import { displayStatus } from "./ChargerCard";

export type Sort = "nearest" | "cheapest" | "rating";
export type FilterState = { connector: Connector | "ALL"; access: AccessType | "ALL"; availableNow: boolean; sort: Sort };
export const DEFAULT_FILTERS: FilterState = { connector: "ALL", access: "ALL", availableNow: false, sort: "nearest" };

export function applyFilters(list: (Charger & { dist: number })[], f: FilterState) {
  return list
    .filter((c) => (f.connector === "ALL" || c.connector === f.connector) && (f.access === "ALL" || c.accessType === f.access))
    .filter((c) => !f.availableNow || displayStatus(c) === "available")
    .sort((a, b) =>
      f.sort === "cheapest" ? a.ratePerKwh - b.ratePerKwh : f.sort === "rating" ? b.rating - a.rating : a.dist - b.dist,
    );
}

const chip = (on: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
    on ? "border-sky bg-sky-tint text-sky-600" : "border-line bg-white text-ink hover:border-slate-300",
  );

export function Filters({ value, onChange }: { value: FilterState; onChange: (f: FilterState) => void }) {
  const set = (p: Partial<FilterState>) => onChange({ ...value, ...p });
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      <button className={chip(value.availableNow)} onClick={() => set({ availableNow: !value.availableNow })}>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" /> Available now
        </span>
      </button>
      <span className="h-5 w-px shrink-0 bg-line" />
      <button className={chip(value.connector === "ALL")} onClick={() => set({ connector: "ALL" })}>
        All plugs
      </button>
      {CONNECTORS.map((c) => (
        <button key={c.value} className={chip(value.connector === c.value)} onClick={() => set({ connector: value.connector === c.value ? "ALL" : c.value })}>
          {c.short}
        </button>
      ))}
      <span className="h-5 w-px shrink-0 bg-line" />
      <select
        aria-label="Access type"
        className={cn(chip(value.access !== "ALL"), "appearance-none pr-3")}
        value={value.access}
        onChange={(e) => set({ access: e.target.value as FilterState["access"] })}
      >
        <option value="ALL">Any access</option>
        {ACCESS_TYPES.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      <label className={cn(chip(false), "flex items-center gap-1")}>
        <ArrowUpDown className="h-3 w-3" />
        <select aria-label="Sort" className="appearance-none bg-transparent outline-none" value={value.sort} onChange={(e) => set({ sort: e.target.value as Sort })}>
          <option value="nearest">Nearest</option>
          <option value="cheapest">Cheapest</option>
          <option value="rating">Top rated</option>
        </select>
      </label>
    </div>
  );
}
