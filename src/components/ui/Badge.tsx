import { cn } from "@/lib/cn";
import { BadgeCheck, FlaskConical, Plug, PlugZap, Zap } from "lucide-react";
import type { ReactNode } from "react";

export type SlotStatus = "available" | "charging" | "locked";

export function Pill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: SlotStatus; label?: string }) {
  if (status === "available")
    return (
      <Pill className="bg-avail-bg text-avail-fg">
        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" />
        {label ?? "Available"}
      </Pill>
    );
  if (status === "charging")
    return (
      <Pill className="bg-busy-bg text-busy-fg">
        <Zap className="h-3 w-3" />
        {label ?? "Charging now"}
      </Pill>
    );
  return <Pill className="bg-lock-bg text-lock-fg">{label ?? "Reserved"}</Pill>;
}

export type Connector = "TYPE2" | "CCS2" | "SOCKET15A";
export const CONNECTOR_LABEL: Record<Connector, string> = {
  TYPE2: "Type 2",
  CCS2: "CCS2",
  SOCKET15A: "15A Socket",
};

export function ConnectorBadge({ connector, powerKw }: { connector: Connector; powerKw: number }) {
  const Icon = connector === "CCS2" ? PlugZap : Plug;
  return (
    <Pill className="bg-sky-tint text-sky-600">
      <Icon className="h-3 w-3" />
      {CONNECTOR_LABEL[connector]} <span className="opacity-60">•</span>
      <span className="num">{powerKw} kW</span>
    </Pill>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Pill className={cn("bg-mint text-avail-fg", className)}>
      <BadgeCheck className="h-3.5 w-3.5" />
      Verified host
    </Pill>
  );
}

/** Marks fictional seed data so nobody mistakes it for a real host or business. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Pill className={cn("bg-violet-50 text-violet-700 ring-1 ring-violet-200", className)}>
      <FlaskConical className="h-3 w-3" />
      Demo listing
    </Pill>
  );
}
