"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Pill, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/ui/FadeIn";
import { BadgeIndianRupee, CalendarClock, Clock, Loader2, PlugZap, ShieldCheck } from "lucide-react";
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

function HostHome() {
  const { profile } = useAuth();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Host dashboard</h1>
        {profile?.verifiedHost ? (
          <VerifiedBadge />
        ) : (
          <Pill className="bg-busy-bg text-busy-fg">
            <Clock className="h-3 w-3" /> Verification pending
          </Pill>
        )}
      </div>
      <p className="mt-1 text-muted">Hi {profile?.name?.split(" ")[0]} — your listings, bookings and earnings will live here.</p>
      <div className="card mt-6 p-8 text-center text-muted">Listings, live earnings and booking timeline arrive in the next phases.</div>
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
