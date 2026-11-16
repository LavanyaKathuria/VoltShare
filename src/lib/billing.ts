/**
 * The ONE billing formula, in whole paise so every screen and the server agree to the paisa:
 *   energy = kWh × rate (rounded to the paisa) · fee = 15 % of energy (half-paisa rounds up) · total = energy + fee.
 * Identical copies live in src/lib/billing.ts (website) and functions/src/billing.ts (server);
 * tests/unit/billing.test.ts checks they agree.
 */
export const PLATFORM_FEE_PERCENT = 15;

export function bill(ratePerKwh: number, kwh: number) {
  const energyPaise = Math.round(Number((ratePerKwh * kwh * 100).toFixed(6)));
  const feePaise = Math.round((energyPaise * PLATFORM_FEE_PERCENT) / 100);
  return {
    energy: energyPaise / 100,
    fee: feePaise / 100,
    total: (energyPaise + feePaise) / 100,
    totalPaise: energyPaise + feePaise,
  };
}

/** Energy we pre-authorise for a booking: rated power × ~90 % efficiency × booked hours, ≤ 40 kWh, to 0.1 kWh. */
export const estimateKwh = (powerKw: number, hours: number) => Number(Math.min(powerKw * hours * 0.9, 40).toFixed(1));
