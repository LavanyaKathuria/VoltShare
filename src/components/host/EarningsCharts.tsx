"use client";

import { formatINR } from "@/lib/chargers";
import { dateKeyIST } from "@/lib/time";
import { useState } from "react";

const BAR = "#059669"; // single series → one hue (emerald-600, ≥3:1 on white)
const inr0 = (n: number) => formatINR(n, 0);

/** Last 7 IST days of earnings as columns. Hover any column for its value; table for screen readers. */
export function DailyEarnings({ byDay }: { byDay: Record<string, number> }) {
  const [hover, setHover] = useState<number | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const key = dateKeyIST(d);
    return {
      key,
      label: i === 6 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }),
      value: byDay[key] ?? 0,
    };
  });
  const max = Math.max(...days.map((d) => d.value), 1);
  const W = 320, H = 150, top = 22, base = H - 22, slot = W / 7, bw = Math.min(24, slot - 14);
  const total = days.reduce((a, d) => a + d.value, 0);

  return (
    <figure>
      <figcaption className="flex items-baseline justify-between">
        <span className="text-sm font-medium">Earnings, last 7 days</span>
        <span className="num text-sm text-muted">{inr0(total)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full overflow-visible" role="img" aria-label={`Daily earnings, last 7 days, total ${inr0(total)}`}>
        <line x1="0" x2={W} y1={base} y2={base} stroke="#E2E8F0" />
        {days.map((d, i) => {
          const h = d.value ? Math.max(3, ((base - top) * d.value) / max) : 0;
          const x = i * slot + (slot - bw) / 2;
          const y = base - h;
          const show = hover === i || (hover === null && (i === 6 || d.value === max) && d.value > 0);
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              {/* hit target is the whole slot, bigger than the mark */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && <path d={`M${x},${base} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bw - 4} Q${x + bw},${y} ${x + bw},${y + 4} V${base} Z`} fill={BAR} opacity={hover === null || hover === i ? 1 : 0.45} />}
              {show && (
                <text x={x + bw / 2} y={y - 6} textAnchor="middle" className="num" fontSize="10" fill="#0F172A">
                  {inr0(d.value)}
                </text>
              )}
              <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={i === 6 ? "#0F172A" : "#64748B"} fontWeight={i === 6 ? 600 : 400}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>Daily earnings</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.key}</th>
              <td>{inr0(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Lifetime earnings per charger as horizontal bars, value at the tip. */
export function EarningsByCharger({ byCharger, names }: { byCharger: Record<string, number>; names: Record<string, string> }) {
  const rows = Object.entries(byCharger)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const max = Math.max(...rows.map(([, v]) => v), 1);
  if (!rows.length) return <p className="text-sm text-muted">No completed sessions yet — earnings per charger appear here.</p>;
  return (
    <figure>
      <figcaption className="text-sm font-medium">Earnings by charger</figcaption>
      <ul className="mt-3 space-y-2.5">
        {rows.map(([id, v]) => (
          <li key={id} title={`${names[id] ?? id}: ${inr0(v)}`}>
            <div className="flex justify-between gap-3 text-xs">
              <span className="truncate text-muted">{names[id] ?? "Removed listing"}</span>
              <span className="num shrink-0 text-ink">{formatINR(v)}</span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded-r bg-slate-100">
              <div className="h-full rounded-r" style={{ width: `${(v / max) * 100}%`, background: BAR, borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
