import { ConnectorBadge, Pill, StatusBadge, VerifiedBadge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { MapPin, Star } from "lucide-react";

const SLOTS = [
  { t: "04:00 PM", s: "booked" },
  { t: "04:30 PM", s: "booked" },
  { t: "05:00 PM", s: "open" },
  { t: "05:30 PM", s: "selected" },
  { t: "06:00 PM", s: "selected" },
  { t: "06:30 PM", s: "open" },
] as const;

/** Static product preview used on the landing hero (no data dependencies). */
export function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-sky-tint via-white to-mint">
          <svg viewBox="0 0 400 160" className="absolute inset-0 h-full w-full opacity-70" aria-hidden>
            <path d="M0 120 Q100 90 200 110 T400 95" stroke="#CBD5E1" strokeWidth="14" fill="none" />
            <path d="M120 0 L150 160" stroke="#E2E8F0" strokeWidth="10" />
            <path d="M290 0 L270 160" stroke="#E2E8F0" strokeWidth="8" />
            <circle cx="210" cy="78" r="46" fill="#0EA5E9" fillOpacity="0.12" stroke="#0EA5E9" strokeOpacity="0.4" strokeDasharray="4 4" />
          </svg>
          <div className="absolute left-[46%] top-[38%] rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-white shadow-lift num">
            ₹14.50/kWh
          </div>
          <div className="absolute left-[14%] top-[62%] rounded-full bg-slate-400 px-2 py-0.5 text-[11px] font-semibold text-white num">₹12/kWh</div>
          <div className="absolute right-[10%] top-[20%] rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white num">₹16/kWh</div>
          <div className="absolute left-3 top-3"><StatusBadge status="available" /></div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base">Sunny driveway, Indiranagar</h3>
              <p className="flex items-center gap-1 text-xs text-muted">
                <MapPin className="h-3 w-3" /> <span className="num">0.8 km</span> away · Public Driveway
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-medium">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> <span className="num">4.9</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ConnectorBadge connector="TYPE2" powerKw={7.4} />
            <VerifiedBadge />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {SLOTS.map(({ t, s }) => (
              <span
                key={t}
                className={
                  "rounded-full border px-2 py-1 text-center text-[11px] num " +
                  (s === "booked"
                    ? "border-transparent bg-lock-bg text-lock-fg line-through"
                    : s === "selected"
                      ? "border-sky bg-sky-tint text-sky-600 font-medium"
                      : "border-line bg-white text-ink")
                }
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* floating telemetry card */}
      <div className="absolute -bottom-16 -right-2 sm:-right-10 w-64 rounded-2xl bg-ink p-4 text-white shadow-lift ring-1 ring-white/5">
        <div className="flex items-center gap-3">
          <div className="rounded-full shadow-[0_0_24px_rgba(16,185,129,0.35)]">
            <ProgressRing value={0.62} size={72} stroke={7} track="rgba(255,255,255,0.08)">
              <span className="num text-sm font-medium">62%</span>
            </ProgressRing>
          </div>
          <div className="space-y-0.5">
            <Pill className="bg-white/10 text-emerald-300 px-2">Charging</Pill>
            <p className="num text-lg leading-tight">9.2 kWh</p>
            <p className="num text-xs text-slate-400">₹153.41 · 00:48:12</p>
          </div>
        </div>
      </div>
    </div>
  );
}
