"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { MapView } from "@/components/map/MapView";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { ACCESS_TYPES, CONNECTORS } from "@/lib/chargers";
import { db, storage } from "@/lib/firebase/client";
import { distanceKm, fuzzLocation, geohash, type LatLng } from "@/lib/geo";
import { CITIES, cityByName } from "@/lib/cities";
import { useLocation } from "@/components/layout/LocationProvider";
import { compressImage } from "@/lib/images";
import type { AccessType, Charger, ChargerPrivate, Connector } from "@/types";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, LocateFixed, Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type Photo = { url: string; file?: File };

const input =
  "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-sm outline-none transition focus:border-sky focus:ring-4 focus:ring-sky-tint";

/** `group` renders a <div role="group"> instead of <label> — for button groups / multiple controls. */
function Field({ label, hint, children, className, group }: { label: string; hint?: string; children: ReactNode; className?: string; group?: boolean }) {
  const inner = (
    <>
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-1 text-xs text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className={cn("block", className)}>{inner}</div>
  ) : (
    <label className={cn("block", className)}>{inner}</label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-sm font-medium transition",
            value === o.value ? "border-sky bg-sky-tint text-sky-600" : "border-line bg-white hover:border-slate-300",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function ChargerForm({ existing, existingPrivate }: { existing?: Charger; existingPrivate?: ChargerPrivate | null }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [connector, setConnector] = useState<Connector>(existing?.connector ?? "TYPE2");
  const [powerKw, setPowerKw] = useState(String(existing?.powerKw ?? 7.4));
  const [rate, setRate] = useState(String(existing?.ratePerKwh ?? 14));
  const [accessType, setAccessType] = useState<AccessType>(existing?.accessType ?? "PUBLIC_DRIVEWAY");
  const [rules, setRules] = useState((existing?.rules ?? ["Park only in the marked bay", "Unplug and leave when your slot ends"]).join("\n"));
  const [openTime, setOpenTime] = useState(existing?.openTime ?? "08:00");
  const [closeTime, setCloseTime] = useState(existing?.closeTime ?? "22:00");
  const [area, setArea] = useState(existing?.area ?? "");
  const loc = useLocation();
  const [city, setCity] = useState(existing?.city ?? (loc.place.kind === "city" ? loc.label : ""));
  // Where the location map starts: the pin if set, else the typed city, else the navbar location.
  const [mapCenter, setMapCenter] = useState<LatLng>(loc.center);
  useEffect(() => {
    const c = cityByName(city);
    if (c) setMapCenter(c.center);
  }, [city]);
  const [address, setAddress] = useState(existingPrivate?.address ?? "");
  const [accessNotes, setAccessNotes] = useState(existingPrivate?.accessNotes ?? "");
  const [exact, setExact] = useState<LatLng | null>(existingPrivate ? { lat: existingPrivate.exactLat, lng: existingPrivate.exactLng } : null);
  const [photos, setPhotos] = useState<Photo[]>((existing?.photos ?? []).map((url) => ({ url })));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const maxKw = CONNECTORS.find((c) => c.value === connector)!.maxKw;

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = [...files].slice(0, 6 - photos.length).map((file) => ({ url: URL.createObjectURL(file), file }));
    setPhotos((p) => [...p, ...next]);
  }

  function locateMe() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setExact({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — tap the map to drop the pin instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;
    setError(null);
    const kw = Number(powerKw);
    const r = Number(rate);
    if (!exact) return setError("Drop a pin on the map at the exact charger location.");
    if (!(kw > 0 && kw <= maxKw)) return setError(`Power must be between 0 and ${maxKw} kW for this connector.`);
    if (!(r >= 5 && r <= 50)) return setError("Rate must be between ₹5 and ₹50 per kWh.");
    if (openTime >= closeTime) return setError("Closing time must be after opening time.");

    try {
      const chargerRef = existing ? doc(db, "chargers", existing.id) : doc(collection(db, "chargers"));
      // 1) Upload any new photos to Storage: chargers/{uid}/{chargerId}/...
      setBusy("Uploading photos…");
      const urls: string[] = [];
      for (const p of photos) {
        if (!p.file) {
          urls.push(p.url);
          continue;
        }
        const blob = await compressImage(p.file);
        const objectRef = ref(storage, `chargers/${user.uid}/${chargerRef.id}/${Date.now()}-${p.file.name.replace(/[^\w.-]/g, "_")}`);
        await uploadBytes(objectRef, blob, { contentType: blob.type || p.file.type });
        urls.push(await getDownloadURL(objectRef));
      }

      // 2) Public doc gets a fuzzed location; exact point goes to the private sub-doc.
      setBusy("Saving listing…");
      const moved = !existing || !existingPrivate || distanceKm(exact, { lat: existingPrivate.exactLat, lng: existingPrivate.exactLng }) > 0.02;
      const approx = moved ? fuzzLocation(exact) : { lat: existing!.approxLat, lng: existing!.approxLng };

      const pub = {
        hostName: profile.name,
        hostPhoto: profile.photo ?? null,
        title: title.trim(),
        description: description.trim(),
        photos: urls,
        connector,
        powerKw: kw,
        ratePerKwh: r,
        accessType,
        rules: rules.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10),
        openTime,
        closeTime,
        approxLat: approx.lat,
        approxLng: approx.lng,
        geohash: geohash(approx),
        area: area.trim(),
        city: city.trim(),
        online: existing?.online ?? true,
        updatedAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      if (existing) batch.update(chargerRef, pub);
      else
        batch.set(chargerRef, {
          ...pub,
          ownerId: user.uid,
          hostVerified: profile.verifiedHost,
          meterVerified: false,
          liveStatus: "available",
          rating: 0,
          reviewCount: 0,
          createdAt: serverTimestamp(),
        });
      batch.set(doc(db, "chargers", chargerRef.id, "private", "details"), {
        address: address.trim(),
        exactLat: exact.lat,
        exactLng: exact.lng,
        accessNotes: accessNotes.trim(),
      } satisfies ChargerPrivate);
      await batch.commit();
      router.push(`/chargers/${chargerRef.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Basics" desc="What renters see first on the map and in search.">
        <Field label="Listing title">
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={80} placeholder="Sunny driveway near 100 Ft Road" />
        </Field>
        <Field label="Description" hint="optional">
          <textarea
            className={cn(input, "h-28 py-3")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            placeholder="Covered parking, wall-mounted 7.4 kW charger, easy to find from the main road…"
          />
        </Field>
        <Field group label="Photos" hint="up to 6 — charger, parking spot, entrance">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-1.5 text-[10px] text-white">Cover</span>}
              </div>
            ))}
            {photos.length < 6 && (
              <span className="relative grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-slate-300 text-muted transition hover:border-sky hover:text-sky">
                <ImagePlus className="h-6 w-6" />
                <input type="file" accept="image/*" multiple className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => addFiles(e.target.files)} aria-label="Add photos" />
              </span>
            )}
          </div>
        </Field>
      </Section>

      <Section title="Charger & pricing">
        <Field group label="Connector">
          <Segmented value={connector} onChange={setConnector} options={CONNECTORS.map((c) => ({ value: c.value, label: c.short }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Power" hint={`max ${maxKw} kW`}>
            <div className="relative">
              <input className={cn(input, "num pr-12")} type="number" step="0.1" min="0.5" max={maxKw} value={powerKw} onChange={(e) => setPowerKw(e.target.value)} required />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">kW</span>
            </div>
          </Field>
          <Field label="Your rate" hint="₹5–50 · renters also pay a 15% platform fee">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
              <input className={cn(input, "num pl-8 pr-16")} type="number" step="0.5" min="5" max="50" value={rate} onChange={(e) => setRate(e.target.value)} required />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">/kWh</span>
            </div>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opens">
            <input className={cn(input, "num")} type="time" step={1800} value={openTime} onChange={(e) => setOpenTime(e.target.value)} required />
          </Field>
          <Field label="Closes">
            <input className={cn(input, "num")} type="time" step={1800} value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required />
          </Field>
        </div>
        <Field group label="Access type">
          <Segmented value={accessType} onChange={setAccessType} options={ACCESS_TYPES} />
        </Field>
        <Field label="House rules" hint="one per line">
          <textarea className={cn(input, "h-24 py-3")} value={rules} onChange={(e) => setRules(e.target.value)} />
        </Field>
      </Section>

      <Section title="Location" desc="Renters only ever see a ~300 m circle until they have a confirmed booking.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Neighbourhood" hint="shown publicly">
            <input className={input} value={area} onChange={(e) => setArea(e.target.value)} required minLength={2} maxLength={60} placeholder="Indiranagar" />
          </Field>
          <Field label="City">
            <input className={input} value={city} onChange={(e) => setCity(e.target.value)} required maxLength={40} list="vs-cities" placeholder="e.g. Pune" />
            <datalist id="vs-cities">
              {CITIES.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Exact charger location</span>
            <button type="button" onClick={locateMe} className="flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline">
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />} Use my location
            </button>
          </div>
          <div className="mt-1.5 h-64 overflow-hidden rounded-xl border border-line">
            <MapView center={exact ?? mapCenter} zoom={exact ? 16 : 12} pin={exact} onPinChange={setExact} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {exact ? "Drag the pin to fine-tune." : "Choose the City above to jump there, zoom in on your street, then tap to drop a pin."}
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-line bg-slate-50/60 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="h-4 w-4 text-muted" /> Private — shared only with confirmed renters during their slot
          </p>
          <div className="mt-3 space-y-3">
            <Field label="Full address">
              <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} required maxLength={300} placeholder="House no., street, landmark" />
            </Field>
            <Field label="Access notes" hint="gate code, parking spot, who to call">
              <textarea className={cn(input, "h-20 py-3")} value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} maxLength={500} placeholder="Gate code 4821. Bay B-12, charger on the left pillar." />
            </Field>
          </div>
        </div>
      </Section>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t border-line bg-white/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={!!busy}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={!!busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {busy}
            </>
          ) : existing ? (
            "Save changes"
          ) : (
            "Publish listing"
          )}
        </Button>
      </div>
    </form>
  );
}
