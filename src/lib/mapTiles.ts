/**
 * Raster basemap for Leaflet. Chosen with NEXT_PUBLIC_MAP_TILES:
 *   "osm"     (default) OpenStreetMap standard tiles — free, no key; softened with CSS for a calm look.
 *   "stadia"  Stadia Maps "Alidade Smooth" — clean light style. Free for non-commercial use with a
 *             (free) account: register your site's domain in the Stadia dashboard (no key needed then),
 *             or set NEXT_PUBLIC_STADIA_API_KEY.
 * NEXT_PUBLIC_MAP_TILE_URL (+ NEXT_PUBLIC_MAP_TILE_ATTRIBUTION) overrides both with any XYZ template.
 */
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type TileConfig = { url: string; attribution: string; subdomains?: string; maxZoom: number; soften: boolean };

export function tileConfig(): TileConfig {
  const custom = process.env.NEXT_PUBLIC_MAP_TILE_URL;
  if (custom) return { url: custom, attribution: process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || OSM_ATTR, maxZoom: 20, soften: false };

  if (process.env.NEXT_PUBLIC_MAP_TILES === "stadia") {
    const key = process.env.NEXT_PUBLIC_STADIA_API_KEY;
    return {
      url: `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png${key ? `?api_key=${encodeURIComponent(key)}` : ""}`,
      attribution:
        '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' + OSM_ATTR,
      maxZoom: 20,
      soften: false,
    };
  }

  return { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: OSM_ATTR, maxZoom: 19, soften: true };
}
