"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { FullPageSpinner } from "@/components/auth/RequireAuth";
import { ChargerForm } from "@/components/host/ChargerForm";
import { HostOnly } from "@/components/host/HostOnly";
import { useCharger, useChargerPrivate } from "@/hooks/useChargers";
import { use } from "react";

function Edit({ id }: { id: string }) {
  const { user } = useAuth();
  const charger = useCharger(id);
  const owner = !!charger && charger.ownerId === user?.uid;
  const { details, loaded } = useChargerPrivate(id, owner);
  if (charger === undefined || (owner && !loaded)) return <FullPageSpinner />;
  if (!charger || !owner) return <p className="card p-8 text-center text-muted">You can only edit your own listings.</p>;
  return <ChargerForm existing={charger} existingPrivate={details} />;
}

export default function EditChargerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <HostOnly>
        <h1 className="mb-6 text-3xl">Edit listing</h1>
        <Edit id={id} />
      </HostOnly>
    </main>
  );
}
