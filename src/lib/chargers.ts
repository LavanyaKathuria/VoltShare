import type { AccessType, Connector, LiveStatus } from "@/types";

export const CONNECTORS: { value: Connector; label: string; short: string; maxKw: number }[] = [
  { value: "TYPE2", label: "Type 2 (AC)", short: "Type 2", maxKw: 22 },
  { value: "CCS2", label: "CCS2 (DC fast)", short: "CCS2", maxKw: 60 },
  { value: "SOCKET15A", label: "15A socket", short: "15A Socket", maxKw: 3.3 },
];
export const CONNECTOR_SHORT = Object.fromEntries(CONNECTORS.map((c) => [c.value, c.short])) as Record<Connector, string>;

export const ACCESS_TYPES: { value: AccessType; label: string }[] = [
  { value: "PUBLIC_DRIVEWAY", label: "Public Driveway" },
  { value: "GATED_SOCIETY", label: "Gated Society" },
  { value: "BUSINESS", label: "Business" },
];
export const ACCESS_LABEL = Object.fromEntries(ACCESS_TYPES.map((a) => [a.value, a.label])) as Record<AccessType, string>;

export const PLATFORM_FEE = 0.15;

export const STATUS_COLOR: Record<LiveStatus, string> = {
  available: "#10B981",
  charging: "#F59E0B",
  busy: "#94A3B8",
};

export const formatINR = (n: number, digits = 2) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "₹15/kWh" or "₹14.50/kWh" */
export const formatRate = (r: number) => `₹${Number.isInteger(r) ? r : r.toFixed(2)}/kWh`;

/** "16:30" -> "04:30 PM" */
export function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
}
