"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { BookingGroup } from "@/hooks/useBookings";
import { checkOut, callableMessage } from "@/lib/bookings";
import { formatINR } from "@/lib/chargers";
import { bill } from "@/lib/billing";
import { storage } from "@/lib/firebase/client";
import { compressImage } from "@/lib/images";
import { ref, uploadBytes } from "firebase/storage";
import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { simulatedKwh } from "./ActiveSession";


export function CheckoutDialog({ g, open, onClose }: { g: BookingGroup; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const b = g.first;
  const [kwh, setKwh] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const reading = simulatedKwh(b.powerKw, b.checkedInAt?.toMillis() ?? g.start.getTime(), Date.now());
    setKwh(Math.max(0.1, reading).toFixed(2));
    setPhoto(null);
    setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = Number(kwh);
  const estimate = value > 0 ? bill(b.ratePerKwh, value).total : 0;

  async function submit() {
    if (!user) return;
    setError(null);
    try {
      let photoPath: string | undefined;
      if (photo) {
        setBusy("Uploading photo…");
        photoPath = `checkout/${user.uid}/${g.groupId}/${Date.now()}.jpg`;
        const blob = await compressImage(photo, 1400);
        await uploadBytes(ref(storage, photoPath), blob, { contentType: blob.type || "image/jpeg" });
      }
      setBusy("Checking out…");
      await checkOut(g.groupId, value, photoPath);
      onClose();
    } catch (e) {
      setError(callableMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} label="Check out">
      <h2 className="text-xl">Check out</h2>
      <p className="mt-1 text-sm text-muted">Enter the kWh shown on the charger’s meter. Your bill is calculated on our server.</p>

      <label className="mt-5 block">
        <span className="text-sm font-medium">Meter reading (energy delivered)</span>
        <div className="relative mt-1.5">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={kwh}
            onChange={(e) => setKwh(e.target.value)}
            className="num h-14 w-full rounded-xl border border-line px-4 pr-16 text-2xl outline-none focus:border-sky focus:ring-4 focus:ring-sky-tint"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">kWh</span>
        </div>
      </label>

      <div className="mt-4">
        <span className="text-sm font-medium">Meter photo</span> <span className="text-xs text-muted">optional — helps resolve disputes</span>
        {photo ? (
          <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-line p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={URL.createObjectURL(photo)} alt="Meter" className="h-14 w-14 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 truncate text-sm">{photo.name}</span>
            <button aria-label="Remove photo" onClick={() => setPhoto(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="mt-1.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-sm text-muted hover:border-sky hover:text-sky">
            <Camera className="h-4 w-4" /> Add photo of the meter
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <span className="text-muted">Estimated total (incl. 15% fee)</span>
        <span className="num text-base font-semibold">{formatINR(estimate)}</span>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button variant="primary" size="lg" className="mt-4 w-full" disabled={!!busy || !(value > 0)} onClick={submit}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {busy}
          </>
        ) : (
          "Confirm & finish session"
        )}
      </Button>
    </Modal>
  );
}
