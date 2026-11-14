import { createHmac, timingSafeEqual } from "node:crypto";

/** Razorpay Checkout signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret), hex. */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
