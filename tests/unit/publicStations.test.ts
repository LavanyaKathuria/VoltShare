import { describe, expect, it } from "vitest";
import { mapOcm, ocmUrl } from "../../src/lib/publicStations";

// Shape follows the Open Charge Map v3 POI API (compact=false). Values are illustrative only.
const sample = [
  {
    ID: 101,
    NumberOfPoints: 2,
    UsageCost: " ₹18/kWh ",
    OperatorInfo: { Title: "Example Operator" },
    StatusType: { IsOperational: true },
    AddressInfo: { Title: "Example Mall P1", AddressLine1: "Example Road", Town: "Bengaluru", Latitude: 12.97, Longitude: 77.6 },
    Connections: [
      { ConnectionType: { Title: "CCS (Type 2)" }, PowerKW: 60, Quantity: 1 },
      { ConnectionType: { Title: "Type 2 (Socket Only)" }, PowerKW: 22, Quantity: null },
    ],
  },
  { ID: 102, AddressInfo: { Title: null, Latitude: 12.9, Longitude: 77.5 }, OperatorInfo: { Title: "(Unknown Operator)" }, Connections: null },
  { ID: 103, AddressInfo: { Title: "No coordinates" } }, // dropped
  null, // dropped
];

describe("Open Charge Map mapping", () => {
  it("maps POIs defensively and drops unusable records", () => {
    const out = mapOcm(sample);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: 101,
      name: "Example Mall P1",
      address: "Example Road, Bengaluru",
      operator: "Example Operator",
      points: 2,
      operational: true,
      usageCost: "₹18/kWh",
      connectors: [
        { type: "CCS", kw: 60, qty: 1 },
        { type: "Type 2", kw: 22, qty: 1 },
      ],
    });
    expect(out[1]).toMatchObject({ name: "Public charging station", operator: null, connectors: [], operational: null });
  });
  it("returns [] for non-array payloads", () => {
    expect(mapOcm({ error: "x" })).toEqual([]);
  });
  it("builds a bounded, rounded query URL", () => {
    const u = new URL(ocmUrl(12.97561, 77.60662, 120));
    expect(u.searchParams.get("latitude")).toBe("12.98");
    expect(u.searchParams.get("distance")).toBe("50");
    expect(u.searchParams.get("maxresults")).toBe("200");
  });
});
