import { formatINR, formatRate, PLATFORM_FEE } from "@/lib/chargers";

/** Typical usable battery of Indian EVs (Nexon/ZS/Tiago EV range) — a session can't add more than this. */
export const MAX_SESSION_KWH = 40;
/** Rough energy estimate: rated power × time × ~90% charging efficiency, capped at a full battery. */
export const estimateKwh = (powerKw: number, hours: number) => +Math.min(powerKw * hours * 0.9, MAX_SESSION_KWH).toFixed(1);

export const formatDuration = (hours: number) => (hours < 1 ? `${hours * 60}m` : hours % 1 ? `${Math.floor(hours)}h 30m` : `${hours}h`);

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

