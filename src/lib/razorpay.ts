import { functions } from "@/lib/firebase/client";
import { httpsCallable } from "firebase/functions";

/** Razorpay TEST MODE is used only when this public key id is set; otherwise the mock checkout runs. */
export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
export const razorpayEnabled = () => !!RAZORPAY_KEY_ID;

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: { error?: { description?: string } }) => void) => void };

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Couldn't load Razorpay Checkout"));
    document.body.appendChild(s);
  });
}

/** Server creates the order (amount computed server-side) → Checkout opens → returns the signed proof. */
export async function payWithRazorpay(groupId: string, description: string, prefill: { name?: string; email?: string }) {
  const Razorpay = await loadCheckout();
  const { data } = await httpsCallable<{ groupId: string }, { orderId: string; amount: number; keyId: string }>(functions, "createPaymentOrder")({ groupId });
  return new Promise<{ orderId: string; paymentId: string; signature: string }>((resolve, reject) => {
    const rz = new Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: "INR",
      name: "VoltShare",
      description,
      order_id: data.orderId,
      prefill,
      theme: { color: "#10B981" },
      handler: (r: RazorpayResponse) => resolve({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rz.on("payment.failed", (r) => reject(new Error(r.error?.description ?? "Payment failed.")));
    rz.open();
  });
}
