/**
 * Razorpay TEST MODE. Enabled only when RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are set in
 * functions/.env (gitignored) — otherwise the app uses its mocked payment step.
 * Production would move the secret to Secret Manager (defineSecret).
 */
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { bill, estimateKwh } from "../billing";
import { loadGroup } from "../bookings";

export const razorpayEnabled = () => !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

/** Server-side estimate we pre-authorise — the same numbers the checkout screen shows. */
export function estimateAmountPaise(powerKw: number, ratePerKwh: number, slots: number) {
  return Math.max(100, bill(ratePerKwh, estimateKwh(powerKw, slots / 2)).totalPaise);
}

export const createPaymentOrder = onCall<{ groupId: string }>(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (!razorpayEnabled()) throw new HttpsError("failed-precondition", "Razorpay is not configured.");
  const group = await loadGroup(String(req.data?.groupId ?? ""));
  const b = group[0].data;
  if (b.renterId !== req.auth.uid) throw new HttpsError("permission-denied", "Not your booking.");
  if (b.status !== "pending") throw new HttpsError("failed-precondition", "This booking is not awaiting payment.");

  const amount = estimateAmountPaise(b.powerKw, b.ratePerKwh, group.length);
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency: "INR", receipt: b.groupId.slice(0, 40), notes: { groupId: b.groupId } }),
  });
  if (!res.ok) throw new HttpsError("unavailable", `Razorpay error ${res.status}`);
  const order = (await res.json()) as { id: string; amount: number };
  await group[0].ref.update({ razorpayOrderId: order.id, razorpayAmount: order.amount, orderCreatedAt: FieldValue.serverTimestamp() });
  return { orderId: order.id, amount: order.amount, keyId: process.env.RAZORPAY_KEY_ID };
});
