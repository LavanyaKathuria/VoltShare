import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyRazorpaySignature } from "../../functions/src/payments/signature";

describe("Razorpay signature verification", () => {
  const secret = "test_secret";
  const good = createHmac("sha256", secret).update("order_123|pay_456").digest("hex");
  it("accepts the HMAC-SHA256 of order_id|payment_id", () => {
    expect(verifyRazorpaySignature("order_123", "pay_456", good, secret)).toBe(true);
  });
  it("rejects tampered ids, wrong secrets and junk", () => {
    expect(verifyRazorpaySignature("order_999", "pay_456", good, secret)).toBe(false);
    expect(verifyRazorpaySignature("order_123", "pay_456", good, "other")).toBe(false);
    expect(verifyRazorpaySignature("order_123", "pay_456", "abc", secret)).toBe(false);
  });
});
