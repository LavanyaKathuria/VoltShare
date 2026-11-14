"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ChargerPhoto } from "@/components/explore/ChargerPhoto";
import { ConnectorBadge, Pill, VerifiedBadge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { useMyChargers } from "@/hooks/useChargers";
import { formatRate } from "@/lib/chargers";
import { db } from "@/lib/firebase/client";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { BadgeCheck, BadgeIndianRupee, CalendarClock, Clock, Loader2, Pencil, Plus, PlugZap, ShieldCheck } from "lucide-react";
import { useState } from "react";

const PERKS = [
  { Icon: BadgeIndianRupee, title: "Earn from idle hours", text: "Set your own ₹/kWh rate. Payouts are calculated automatically after every session." },
  { Icon: CalendarClock, title: "You control the hours", text: "Publish only the hours you want. Flip your charger offline any time." },
  { Icon: ShieldCheck, title: "Your address stays private", text: "Renters see a ~300 m circle until they hold a confirmed booking." },
];

function BecomeHost() {
  const { becomeHost } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <FadeIn className="mx-auto max-w-3xl">
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-sky-tint to-mint px-6 py-10 text-center sm:px-10">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-soft">
            <PlugZap className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-3xl">Turn your charger into income</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Switch on Host Mode to list a charger at your home, café, hotel or society. You keep your renter account too.
          </p>
          <Button
            variant="brand"
            size="lg"
            className="mt-6"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await becomeHost();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enable Host Mode
          </Button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {PERKS.map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon className="h-5 w-5 text-brand-600" />
              <h3 className="mt-2 text-sm">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

function MyChargers() {
  const { user } = useAuth();
  const chargers = useMyChargers(user?.uid);
  const [busy, setBusy] = useState<string | null>(null);

  if (!chargers) return <div className="card grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
  if (!chargers.length)
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-brand-600"><PlugZap className="h-6 w-6" /></span>
        <h2 className="mt-4 text-lg">List your first charger</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">Add photos, set your ₹/kWh rate and hours. It appears on the map instantly.</p>
        <ButtonLink href="/host/chargers/new" variant="brand" className="mt-5"><Plus className="h-4 w-4" /> Add a charger</ButtonLink>
      </div>
    );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {chargers.map((c) => (
        <div key={c.id} className="card overflow-hidden">
          <Link href={`/chargers/${c.id}`} className="block">
            <ChargerPhoto src={c.photos[0]} alt={c.title} className="aspect-[16/8] w-full" />
          </Link>
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/chargers/${c.id}`} className="block truncate font-semibold hover:underline">{c.title}</Link>
                <p className="text-xs text-muted">{c.area} · <span className="num">{formatRate(c.ratePerKwh)}</span></p>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium">
                <span className={c.online ? "text-avail-fg" : "text-muted"}>{c.online ? "Online" : "Offline"}</span>
                <Toggle
                  label="Online"
                  on={c.online}
                  busy={busy === c.id}
                  onClick={async () => {
                    setBusy(c.id);
                    try {
                      await updateDoc(doc(db, "chargers", c.id), { online: !c.online, updatedAt: serverTimestamp() });
                    } finally {
                      setBusy(null);
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ConnectorBadge connector={c.connector} powerKw={c.powerKw} />
              {c.meterVerified ? (
                <Pill className="bg-sky-tint text-sky-600"><BadgeCheck className="h-3.5 w-3.5" /> DISCOM EV Meter Verified</Pill>
              ) : (
                <Pill className="bg-slate-100 text-muted">Meter check pending</Pill>
              )}
            </div>
            <ButtonLink href={`/host/chargers/${c.id}/edit`} variant="outline" size="sm" className="w-full"><Pencil className="h-3.5 w-3.5" /> Edit listing</ButtonLink>
          </div>
        </div>
      ))}
    </div>
  );
}

function HostHome() {
  const { profile } = useAuth();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl">Host dashboard</h1>
            {profile?.verifiedHost ? (
              <VerifiedBadge />
            ) : (
              <Pill className="bg-busy-bg text-busy-fg"><Clock className="h-3 w-3" /> Verification pending</Pill>
            )}
          </div>
          <p className="mt-1 text-muted">Hi {profile?.name?.split(" ")[0]} — flip a charger offline any time; the map updates instantly.</p>
        </div>
        <ButtonLink href="/host/chargers/new" variant="brand"><Plus className="h-4 w-4" /> Add charger</ButtonLink>
      </div>
      <h2 className="mb-3 mt-8 text-lg">Your chargers</h2>
      <MyChargers />
    </div>
  );
}

function HostGate() {
  const { claims } = useAuth();
  return claims.host ? <HostHome /> : <BecomeHost />;
}

export default function HostPage() {
  return (
    <main className="px-4 py-10 sm:px-6">
      <RequireAuth>
        <HostGate />
      </RequireAuth>
    </main>
  );
}
