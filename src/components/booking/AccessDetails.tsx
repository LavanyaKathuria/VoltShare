"use client";

import { MapView } from "@/components/map/MapView";
import { useChargerPrivate } from "@/hooks/useChargers";
import { KeyRound, Loader2, Navigation } from "lucide-react";

/**
 * Exact address + gate notes. Readable only because a Cloud Function created
 * renterAccess/{chargerId_uid} when this booking was confirmed (and will delete it after the slot).
 */
export function AccessDetails({ chargerId }: { chargerId: string }) {
  const { details, denied, loaded } = useChargerPrivate(chargerId, true);
  if (!loaded) return <div className="flex items-center gap-2 p-4 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Unlocking address…</div>;
  if (denied || !details) return <p className="p-4 text-sm text-muted">Address access has ended for this booking.</p>;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${details.exactLat},${details.exactLng}`;
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-[1fr_220px]">
      <div className="min-w-0 space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-avail-fg">
          <KeyRound className="h-4 w-4" /> Exact location unlocked
        </p>
        <p className="text-[15px]">{details.address}</p>
        {details.accessNotes && <p className="rounded-xl bg-mint/60 px-3 py-2 text-sm">{details.accessNotes}</p>}
        <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 hover:underline">
          <Navigation className="h-4 w-4" /> Directions
        </a>
      </div>
      <div className="h-36 overflow-hidden rounded-xl border border-line">
        <MapView center={{ lat: details.exactLat, lng: details.exactLng }} zoom={16} pin={{ lat: details.exactLat, lng: details.exactLng }} interactive={false} />
      </div>
    </div>
  );
}
