import { Pill } from "@/components/ui/Badge";
import type { BookingStatus } from "@/types";

const STYLE: Record<BookingStatus | "expired", [string, string]> = {
  pending: ["bg-busy-bg text-busy-fg", "Awaiting payment"],
  confirmed: ["bg-avail-bg text-avail-fg", "Confirmed"],
  active: ["bg-sky-tint text-sky-600", "Charging"],
  completed: ["bg-slate-100 text-slate-600", "Completed"],
  cancelled: ["bg-lock-bg text-lock-fg", "Cancelled"],
  expired: ["bg-lock-bg text-lock-fg", "Hold expired"],
};

export function BookingStatusPill({ status }: { status: BookingStatus | "expired" }) {
  const [cls, label] = STYLE[status];
  return (
    <Pill className={cls}>
      {status === "confirmed" && <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse-dot" />}
      {label}
    </Pill>
  );
}
