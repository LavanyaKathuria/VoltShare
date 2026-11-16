import { describe, expect, it } from "vitest";
import * as server from "../../functions/src/billing";
import * as web from "../../src/lib/billing";

describe("billing formula", () => {
  it("bills in whole paise, rounding a half paisa up", () => {
    // The case from the checkout screen: ₹15/kWh × 6.7 kWh
    expect(web.bill(15, 6.7)).toEqual({ energy: 100.5, fee: 15.08, total: 115.58, totalPaise: 11558 });
    expect(web.bill(16, 3.4)).toMatchObject({ energy: 54.4, fee: 8.16, total: 62.56 });
    expect(web.bill(14.5, 3)).toMatchObject({ energy: 43.5, fee: 6.53, total: 50.03 });
  });
  it("total always equals the shown energy + fee", () => {
    for (let r = 5; r <= 50; r += 0.5)
      for (let k = 0.1; k <= 40; k += 0.7) {
        const b = web.bill(r, Number(k.toFixed(1)));
        expect(Math.round((b.energy + b.fee) * 100)).toBe(b.totalPaise);
      }
  });
  it("the website and the Cloud Functions copies are identical", () => {
    for (let r = 5; r <= 50; r += 0.5)
      for (let k = 0.1; k <= 40; k += 0.3) {
        const kwh = Number(k.toFixed(1));
        expect(server.bill(r, kwh)).toEqual(web.bill(r, kwh));
      }
    for (const kw of [3, 3.3, 7.4, 11, 22, 30, 50]) for (let h = 0.5; h <= 4; h += 0.5) expect(server.estimateKwh(kw, h)).toBe(web.estimateKwh(kw, h));
  });
});
