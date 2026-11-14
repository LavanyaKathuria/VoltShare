import { mapOcm, ocmUrl } from "@/lib/publicStations";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Server-side proxy so the Open Charge Map key never reaches the browser.
 * Responses are cached for a day per ~1 km grid cell (coordinates rounded to 2 decimals).
 */
export async function GET(req: NextRequest) {
  const key = process.env.OCM_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, stations: [] });

  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const km = Number(sp.get("km") ?? 15);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !isFinite(km))
    return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });

  try {
    const res = await fetch(ocmUrl(lat, lng, km), {
      headers: { "X-API-Key": key, "User-Agent": "VoltShare-prototype" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return NextResponse.json({ enabled: true, stations: [], error: `Open Charge Map returned ${res.status}` }, { status: 502 });
    return NextResponse.json(
      { enabled: true, stations: mapOcm(await res.json()) },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ enabled: true, stations: [], error: "Open Charge Map is unreachable" }, { status: 502 });
  }
}
