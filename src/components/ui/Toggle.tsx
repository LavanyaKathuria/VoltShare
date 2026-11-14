"use client";

import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

export function Toggle({ on, busy, onClick, label }: { on: boolean; busy?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-brand" : "bg-slate-200")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      {busy && <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-ink" />}
    </button>
  );
}
