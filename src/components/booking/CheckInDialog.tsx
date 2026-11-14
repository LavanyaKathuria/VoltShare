"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useChargerPrivate } from "@/hooks/useChargers";
import { checkIn, callableMessage } from "@/lib/bookings";
import { cn } from "@/lib/cn";
import { distanceKm, formatDistance, type LatLng } from "@/lib/geo";
import { FlaskConical, Loader2, LocateFixed, MapPinned } from "lucide-react";
import { useEffect, useState } from "react";
import { PinInput } from "./PinInput";

const GEOFENCE_M = 100;

export function CheckInDialog({ open, onClose, groupId, chargerId }: { open: boolean; onClose: () => void; groupId: string; chargerId: string }) {
  const { details } = useChargerPrivate(chargerId, open);
  const [pos, setPos] = useState<(LatLng & { accuracy?: number; demo?: boolean }) | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPin("");
    setError(null);
    setGeoError(null);
    setPos(null);
    if (!("geolocation" in navigator)) return setGeoError("This browser can’t share location.");
    const id = navigator.geolocation.watchPosition(
      (p) => setPos((cur) => (cur?.demo ? cur : { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy })),
      (e) => setGeoError(e.code === e.PERMISSION_DENIED ? "Location permission denied." : "Couldn’t get your location."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [open]);

  const dist = pos && details ? distanceKm(pos, { lat: details.exactLat, lng: details.exactLng }) * 1000 : null;
  const inside = dist !== null && dist <= GEOFENCE_M;

  function useDemoLocation() {
    if (!details) return;
    // ~15 m from the charger, in a random direction
    const a = Math.random() * 2 * Math.PI;
    setPos({ lat: details.exactLat + (15 * Math.cos(a)) / 111_320, lng: details.exactLng + (15 * Math.sin(a)) / 108_000, accuracy: 10, demo: true });
    setGeoError(null);
  }

  async function submit() {
    if (!pos) return;
    setBusy(true);
    setError(null);
    try {
      await checkIn(groupId, pin, pos.lat, pos.lng, pos.accuracy);
      onClose();
    } catch (e) {
      setError(callableMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Check in">
      <h2 className="text-xl">Check in</h2>
      <p className="mt-1 text-sm text-muted">Be within {GEOFENCE_M} m of the charger and enter the PIN from your booking.</p>

      <div className={cn("mt-5 flex items-center gap-3 rounded-2xl border p-4", inside ? "border-brand/40 bg-mint/50" : "border-line bg-slate-50")}>
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", inside ? "bg-brand text-white" : "bg-white text-muted ring-1 ring-line")}>
          {pos ? <MapPinned className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
        </span>
        <div className="min-w-0 text-sm">
          {dist !== null ? (
            <>
              <p className="font-medium">
                <span className="num">{formatDistance(dist / 1000)}</span> from the charger {inside ? "✓" : ""}
              </p>
              <p className="text-muted">{inside ? (pos?.demo ? "Demo location in use" : "You’re close enough to check in") : `Move within ${GEOFENCE_M} m to check in`}</p>
            </>
          ) : (
            <p className="text-muted">{geoError ?? "Finding your location…"}</p>
          )}
        </div>
      </div>
      <button onClick={useDemoLocation} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:underline">
        <FlaskConical className="h-3.5 w-3.5" /> Demo: pretend I’m at the charger
      </button>

      <div className="mt-6">
        <PinInput value={pin} onChange={setPin} />
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button variant="brand" size="lg" className="mt-5 w-full" disabled={busy || pin.length !== 4 || !pos} onClick={submit}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Start charging
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted">Your location and PIN are verified on the server, not just in this browser.</p>
    </Modal>
  );
}
