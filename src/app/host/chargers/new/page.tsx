"use client";

import { ChargerForm } from "@/components/host/ChargerForm";
import { HostOnly } from "@/components/host/HostOnly";

export default function NewChargerPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <HostOnly>
        <h1 className="text-3xl">List a charger</h1>
        <p className="mb-6 mt-1 text-muted">Takes about two minutes. You can edit everything later.</p>
        <ChargerForm />
      </HostOnly>
    </main>
  );
}
