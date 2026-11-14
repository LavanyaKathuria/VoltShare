/**
 * All slot maths is in IST (UTC+05:30) regardless of the viewer's device timezone.
 * date key: "YYYY-MM-DD", slot key: "HHmm" (30-minute boundaries).
 */
export const IST_OFFSET_MIN = 330;
export const SLOT_MIN = 30;
export const MAX_SLOTS_PER_BOOKING = 8;

/** Wall-clock parts of `d` in IST. */
function istParts(d = new Date()) {
  const t = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, day: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes(), dow: t.getUTCDay() };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dateKeyIST(d = new Date()) {
  const p = istParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.day)}`;
}

/** Next `n` IST dates starting today. */
export function nextDates(n = 7) {
  const now = Date.now();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now + i * 86_400_000);
    const p = istParts(d);
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][p.dow];
    return { key: dateKeyIST(d), label, day: p.day, month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][p.m - 1] };
  });
}

/** "08:00","22:00" -> ["0800","0830",...,"2130"] */
export function slotKeys(openTime: string, closeTime: string) {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const out: string[] = [];
  for (let m = toMin(openTime); m + SLOT_MIN <= toMin(closeTime); m += SLOT_MIN) out.push(pad(Math.floor(m / 60)) + pad(m % 60));
  return out;
}

/** Absolute start instant of a slot. */
export function slotStart(dateKey: string, slot: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const minutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) - IST_OFFSET_MIN;
  return new Date(Date.UTC(y, m - 1, d) + minutes * 60_000);
}
export const slotEnd = (dateKey: string, slot: string) => new Date(slotStart(dateKey, slot).getTime() + SLOT_MIN * 60_000);

/** A slot can be booked until it ends (you may book the slot that's in progress). */
export const slotBookable = (dateKey: string, slot: string, now = Date.now()) => slotEnd(dateKey, slot).getTime() > now;

/** "1630" -> "04:30 PM" */
export function slotLabel(slot: string) {
  const h = Number(slot.slice(0, 2));
  return `${pad(((h + 11) % 12) + 1)}:${slot.slice(2)} ${h >= 12 ? "PM" : "AM"}`;
}
/** Label for the END of a slot: "1630" -> "05:00 PM" */
export function slotEndLabel(slot: string) {
  const total = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) + SLOT_MIN;
  return slotLabel(pad(Math.floor(total / 60) % 24) + pad(total % 60));
}

export const bookingId = (chargerId: string, dateKey: string, slot: string) => `${chargerId}_${dateKey}_${slot}`;

export function formatDateKey(dateKey: string) {
  const d = slotStart(dateKey, "1200");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
