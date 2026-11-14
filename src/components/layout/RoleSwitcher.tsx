"use client";

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";
import { useMode, type Mode } from "./ModeProvider";

const OPTIONS: { value: Mode; label: string; Icon: typeof Search }[] = [
  { value: "renter", label: "Find a Charger", Icon: Search },
  { value: "host", label: "Host Mode", Icon: Home },
];

export function RoleSwitcher({ className }: { className?: string }) {
  const { mode, setMode } = useMode();
  return (
    <div role="tablist" aria-label="Switch mode" className={cn("relative flex rounded-full border border-line bg-slate-50 p-1", className)}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => setMode(value)}
            className={cn(
              "relative z-10 flex flex-1 whitespace-nowrap items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId="role-pill"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-soft ring-1 ring-line"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
