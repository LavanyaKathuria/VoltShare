"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cancelBooking, confirmBooking, callableMessage } from "@/lib/bookings";
import { formatINR } from "@/lib/chargers";
import { bill } from "@/lib/billing";
import { formatDateKey, slotEndLabel, slotLabel } from "@/lib/time";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, Smartphone, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { payWithRazorpay, razorpayEnabled } from "@/lib/razorpay";
import { CostBreakdown } from "./Cost";

export type PendingBooking = {
  groupId: string;
  chargerTitle: string;
  date: string;
  slots: string[];
  rate: number;
  kwh: number;
  createdAt: number;
};

const HOLD_MS = 10 * 60_000;

function Countdown({ from }: { from: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, from + HOLD_MS - now);
  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span className="num">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

/**
 * Mocked checkout (test mode). We "authorise" the estimate; the final amount is computed from the
 * metered kWh at check-out by a Cloud Function. With Razorpay keys, this is where Checkout opens.
 */
export function PaymentSheet({ pending, onDone }: { pending: PendingBooking | null; onDone: () => void }) {
  const { user, profile } = useAuth();
  const live = razorpayEnabled();
  const [step, setStep] = useState<"pay" | "done">("pay");
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pending) {
      setStep("pay");
      setError(null);
    }
  }, [pending]);

  if (!pending) return <Modal open={false} label="Checkout">{null}</Modal>;
  const estimate = bill(pending.rate, pending.kwh).total;
  const range = `${slotLabel(pending.slots[0])} – ${slotEndLabel(pending.slots[pending.slots.length - 1])}`;

  async function pay() {
    setBusy("pay");
    setError(null);
    try {
      if (live) {
        // Razorpay TEST MODE: server-created order → Checkout → server verifies the signature.
        const proof = await payWithRazorpay(pending!.groupId, `${pending!.chargerTitle} · ${range}`, { name: profile?.name, email: user?.email ?? undefined });
        await confirmBooking(pending!.groupId, undefined, proof);
      } else {
        await new Promise((r) => setTimeout(r, 700)); // simulated gateway round-trip
        await confirmBooking(pending!.groupId, `mock_${method}_${Date.now().toString(36)}`);
      }
      setStep("done");
    } catch (e) {
      setError(callableMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function release() {
    setBusy("cancel");
    try {
      await cancelBooking(pending!.groupId);
    } finally {
      setBusy(null);
      onDone();
    }
  }

  return (
    <Modal open label="Checkout" onClose={step === "done" ? onDone : undefined}>
      {step === "pay" ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Slots held for you</p>
          <h2 className="mt-1 text-xl">Confirm & pay</h2>
          <div className="mt-4 rounded-2xl border border-line bg-slate-50 p-4">
            <p className="font-medium">{pending.chargerTitle}</p>
            <p className="num mt-0.5 text-sm text-muted">
              {formatDateKey(pending.date)} · {range}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-busy-fg">
              <Timer className="h-3.5 w-3.5" /> Hold expires in <Countdown from={pending.createdAt} />
            </p>
          </div>
          <div className="mt-4">
            <CostBreakdown rate={pending.rate} kwh={pending.kwh} />
          </div>
          {!live && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {(
              [
                { k: "upi", label: "UPI", Icon: Smartphone },
                { k: "card", label: "Card", Icon: CreditCard },
              ] as const
            ).map(({ k, label, Icon }) => (
              <button
                key={k}
                onClick={() => setMethod(k)}
                className={
                  "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium " +
                  (method === k ? "border-sky bg-sky-tint text-sky-600" : "border-line")
                }
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          )}
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button variant="brand" size="lg" className="mt-4 w-full" onClick={pay} disabled={!!busy}>
            {busy === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {live ? "Pay with Razorpay" : "Authorise"} <span className="num">{formatINR(estimate)}</span>
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            {live ? "Razorpay test mode — use Razorpay’s test cards/UPI. " : "Test mode — no real money moves. "}
            You’re only charged for the kWh you actually use at check-out.
          </p>
          <button onClick={release} disabled={!!busy} className="mx-auto mt-3 block text-sm text-muted hover:text-ink">
            {busy === "cancel" ? "Releasing…" : "Cancel and release slots"}
          </button>
        </div>
      ) : (
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint">
            <CheckCircle2 className="h-8 w-8 text-brand" />
          </span>
          <h2 className="mt-4 text-xl">You’re booked!</h2>
          <p className="num mt-1 text-sm text-muted">
            {formatDateKey(pending.date)} · {range}
          </p>
          <p className="mx-auto mt-3 max-w-xs text-sm text-muted">
            Your check-in PIN, exact address and gate notes are now in My bookings.
          </p>
          <ButtonLink href="/bookings" variant="primary" size="lg" className="mt-5 w-full">
            View my booking
          </ButtonLink>
          <button onClick={onDone} className="mt-3 text-sm text-muted hover:text-ink">
            Keep browsing
          </button>
        </div>
      )}
    </Modal>
  );
}
