import type { Booking } from "@/types";
import { formatINR, formatRate } from "@/lib/chargers";
import { Loader2, ReceiptText } from "lucide-react";

export function Receipt({ b }: { b: Booking }) {
  if (b.amount === undefined)
    return (
      <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Calculating your bill on the server…
      </p>
    );
  return (
    <div className="px-5 py-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <ReceiptText className="h-4 w-4 text-brand" /> Receipt
      </p>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <dt>
            <span className="num">{b.kwh} kWh</span> × <span className="num">{formatRate(b.ratePerKwh)}</span>
          </dt>
          <dd className="num text-ink">{formatINR(b.energyCost ?? 0)}</dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>Platform fee (15%)</dt>
          <dd className="num text-ink">{formatINR(b.platformFee ?? 0)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
          <dt>Total charged (test mode)</dt>
          <dd className="num" data-testid="receipt-total">{formatINR(b.amount)}</dd>
        </div>
      </dl>
    </div>
  );
}
