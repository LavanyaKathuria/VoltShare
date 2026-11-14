"use client";

import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/cities";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Check, ChevronDown, Loader2, LocateFixed, MapPin } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "./LocationProvider";

export function LocationPicker({ className, compact, onPicked }: { className?: string; compact?: boolean; onPicked?: () => void }) {
  const { label, place, setCity, locateMe, locating, locError } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = () => {
    setOpen(false);
    onPicked?.();
    if (pathname !== "/explore") router.push("/explore");
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Location: ${label}. Change location`}
        className="flex w-full items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm shadow-soft transition-shadow hover:shadow-lift"
      >
        <span className="flex items-center gap-1.5 font-medium">
          {locating ? <Loader2 className="h-4 w-4 animate-spin text-sky" /> : place.kind === "here" ? <LocateFixed className="h-4 w-4 text-sky" /> : <MapPin className="h-4 w-4 text-sky" />}
          {label}
        </span>
        {!compact && (
          <>
            <span className="h-4 w-px bg-line" />
            <span className="flex items-center gap-1.5 text-muted">
              <CalendarClock className="h-4 w-4" /> Today · <span className="num">Any time</span>
            </span>
          </>
        )}
        <ChevronDown className="ml-auto h-4 w-4 text-muted" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "card max-h-[70vh] overflow-y-auto p-1.5 shadow-lift",
              // In the mobile menu (compact) the list opens inline so the menu's overflow can't clip it.
              compact ? "mt-2 w-full" : "absolute left-1/2 top-12 z-[1100] w-64 -translate-x-1/2",
            )}
            role="listbox"
          >
            <button
              onClick={() => {
                locateMe();
                go();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-sky-600 hover:bg-sky-tint/60"
            >
              <LocateFixed className="h-4 w-4" /> Use my current location
            </button>
            {locError && <p className="px-3 pb-1 text-xs text-red-600">{locError}</p>}
            <div className="my-1 h-px bg-line" />
            {CITIES.map((c) => {
              const active = place.kind === "city" && place.id === c.id;
              return (
                <button
                  key={c.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setCity(c.id);
                    go();
                  }}
                  className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50", active && "font-medium")}
                >
                  {c.name}
                  {active && <Check className="h-4 w-4 text-brand" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
