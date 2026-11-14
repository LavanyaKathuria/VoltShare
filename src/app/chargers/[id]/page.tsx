"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { FullPageSpinner } from "@/components/auth/RequireAuth";
import { BookingWidget, estimateKwh } from "@/components/charger/BookingWidget";
import { Gallery } from "@/components/charger/Gallery";
import { displayStatus, Rating } from "@/components/explore/ChargerCard";
import { MapView } from "@/components/map/MapView";
import { Avatar } from "@/components/ui/Avatar";
import { ConnectorBadge, Pill, StatusBadge, VerifiedBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useCharger, useChargerPrivate } from "@/hooks/useChargers";
import { ACCESS_LABEL, CONNECTOR_SHORT, formatINR, formatRate, PLATFORM_FEE, to12h } from "@/lib/chargers";
import { PRIVACY_RADIUS_M } from "@/lib/geo";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock, Gauge, IndianRupee, KeyRound, Lock, MapPin, Plug } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useMediaQuery } from "@/hooks/useMedia";

export default function ChargerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const charger = useCharger(id);
  const { user, claims } = useAuth();
  const isOwner = !!user && charger?.ownerId === user.uid;
  // Rules decide who may read this; we only *try* when it could succeed (owner/admin; renters in Phase 5).
  const { details } = useChargerPrivate(id, !!user && (isOwner || claims.admin));
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [sheet, setSheet] = useState(false);

  if (charger === undefined) return <FullPageSpinner />;
  if (charger === null)
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl">Charger not found</h1>
        <p className="mt-2 text-muted">It may have been removed by its host.</p>
        <ButtonLink href="/explore" className="mt-6">
          Back to map
        </ButtonLink>
      </main>
    );

  const c = charger;
  const status = displayStatus(c);
  const facts = [
    { Icon: Plug, label: "Connector", value: CONNECTOR_SHORT[c.connector] },
    { Icon: Gauge, label: "Power", value: `${c.powerKw} kW` },
    { Icon: IndianRupee, label: "Rate", value: formatRate(c.ratePerKwh) },
    { Icon: Clock, label: "Open", value: `${to12h(c.openTime)} – ${to12h(c.closeTime)}` },
  ];
  const mobileKwh = estimateKwh(c.powerKw, 1);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 md:pb-16">
      <Link href="/explore" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All chargers
      </Link>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl">{c.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <Rating c={c} /> · <MapPin className="h-3.5 w-3.5" /> {c.area}, {c.city}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={status === "busy" ? "locked" : status} label={!c.online ? "Offline" : status === "busy" ? "Busy" : undefined} />
          {c.meterVerified && (
            <Pill className="bg-sky-tint text-sky-600">
              <BadgeCheck className="h-3.5 w-3.5" /> DISCOM EV Meter Verified
            </Pill>
          )}
        </div>
      </div>

      <Gallery photos={c.photos} title={c.title} />

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {/* Host */}
          <section className="flex items-center gap-4 border-b border-line pb-6">
            <Avatar name={c.hostName} photo={c.hostPhoto} size={52} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Hosted by {c.hostName}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <ConnectorBadge connector={c.connector} powerKw={c.powerKw} />
                <Pill className="bg-slate-100 text-slate-600">{ACCESS_LABEL[c.accessType]}</Pill>
                {c.hostVerified && <VerifiedBadge />}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {facts.map(({ Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-line bg-white p-3">
                <Icon className="h-4 w-4 text-sky" />
                <p className="mt-2 text-xs text-muted">{label}</p>
                <p className="num text-sm font-medium">{value}</p>
              </div>
            ))}
          </section>

          {c.description && (
            <section>
              <h2 className="text-lg">About this charger</h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{c.description}</p>
            </section>
          )}

          {c.rules.length > 0 && (
            <section>
              <h2 className="text-lg">House rules</h2>
              <ul className="mt-3 space-y-2">
                {c.rules.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[15px] text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {r}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg">Where you’ll charge</h2>
            <p className="mt-1 text-sm text-muted">
              {c.area}, {c.city} · approximate location within <span className="num">{PRIVACY_RADIUS_M} m</span>
            </p>
            <div className="mt-3 h-72 overflow-hidden rounded-2xl border border-line">
              <MapView
                center={{ lat: c.approxLat, lng: c.approxLng }}
                zoom={15}
                circles={[{ lat: c.approxLat, lng: c.approxLng, radiusM: PRIVACY_RADIUS_M }]}
                pin={details ? { lat: details.exactLat, lng: details.exactLng } : null}
                interactive={false}
              />
            </div>
            {details ? (
              <div className="mt-3 rounded-xl border border-brand/30 bg-mint/50 p-4 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-avail-fg">
                  <KeyRound className="h-4 w-4" /> {isOwner ? "Private details (only you and confirmed renters see this)" : "Private details"}
                </p>
                <p className="mt-2">{details.address}</p>
                {details.accessNotes && <p className="mt-1 text-muted">{details.accessNotes}</p>}
              </div>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                The exact address, gate code and access notes are shared only after your booking is confirmed, and only for
                your slot.
              </p>
            )}
          </section>
        </div>

        {/* Sticky booking card (desktop) */}
        {isDesktop && (
          <aside>
            <div className="sticky top-24">
              <BookingWidget c={c} isOwner={isOwner} />
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: booking widget in a bottom sheet (only one widget instance is ever mounted) */}
      {isDesktop === false && (
        <Modal open={sheet} onClose={() => setSheet(false)} label="Book this charger">
          <BookingWidget c={c} isOwner={isOwner} className="border-0 p-0 shadow-none" />
        </Modal>
      )}

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="num font-semibold">{formatRate(c.ratePerKwh)}</p>
            <p className="num text-xs text-muted">
              ~{formatINR(c.ratePerKwh * mobileKwh * (1 + PLATFORM_FEE), 0)} for 1h
            </p>
          </div>
          {isOwner ? (
            <ButtonLink href={`/host/chargers/${c.id}/edit`} variant="outline">
              Edit listing
            </ButtonLink>
          ) : (
            <button onClick={() => setSheet(true)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-soft">
              Choose slots
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
