/**
 * Public charging stations from Open Charge Map (https://openchargemap.org), shown as a separate,
 * non-bookable layer for context: few, crowded public stations vs. many idle private chargers.
 */
export type PublicStation = {
  id: number;
  name: string;
  address: string;
  operator: string | null;
  lat: number;
  lng: number;
  connectors: { type: string; kw: number | null; qty: number }[];
  points: number | null;
  operational: boolean | null;
  usageCost: string | null;
};

type OcmPoi = {
  ID?: number;
  NumberOfPoints?: number | null;
  UsageCost?: string | null;
  OperatorInfo?: { Title?: string | null } | null;
  StatusType?: { IsOperational?: boolean | null } | null;
  AddressInfo?: { Title?: string | null; AddressLine1?: string | null; Town?: string | null; Latitude?: number; Longitude?: number } | null;
  Connections?: { ConnectionType?: { Title?: string | null } | null; PowerKW?: number | null; Quantity?: number | null }[] | null;
};

/** Defensive mapping — OCM records are community-maintained and fields are often missing. */
export function mapOcm(raw: unknown): PublicStation[] {
  if (!Array.isArray(raw)) return [];
  const out: PublicStation[] = [];
  for (const p of raw as OcmPoi[]) {
    const a = p?.AddressInfo;
    if (typeof p?.ID !== "number" || typeof a?.Latitude !== "number" || typeof a?.Longitude !== "number") continue;
    out.push({
      id: p.ID,
      name: (a.Title || "Public charging station").slice(0, 120),
      address: [a.AddressLine1, a.Town].filter(Boolean).join(", ").slice(0, 200),
      operator: p.OperatorInfo?.Title && !/unknown/i.test(p.OperatorInfo.Title) ? p.OperatorInfo.Title : null,
      lat: a.Latitude,
      lng: a.Longitude,
      connectors: (p.Connections ?? []).map((c) => ({
        type: c?.ConnectionType?.Title?.replace(/\s*\(.*?\)\s*/g, " ").trim() || "Unknown plug",
        kw: typeof c?.PowerKW === "number" ? c.PowerKW : null,
        qty: typeof c?.Quantity === "number" ? c.Quantity : 1,
      })),
      points: p.NumberOfPoints ?? null,
      operational: p.StatusType?.IsOperational ?? null,
      usageCost: p.UsageCost?.trim() || null,
    });
  }
  return out;
}

export function ocmUrl(lat: number, lng: number, km: number) {
  const q = new URLSearchParams({
    output: "json",
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
    distance: String(Math.min(50, Math.max(1, Math.round(km)))),
    distanceunit: "KM",
    maxresults: "200",
    compact: "false",
    verbose: "false",
  });
  // OCM_BASE_URL is only for tests/mocks; production uses the public API.
  return `${process.env.OCM_BASE_URL ?? "https://api.openchargemap.io"}/v3/poi/?${q}`;
}
