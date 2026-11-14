"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ButtonLink } from "@/components/ui/Button";
import type { ReactNode } from "react";

export function HostOnly({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Gate>{children}</Gate>
    </RequireAuth>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { claims } = useAuth();
  if (!claims.host)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl">Host Mode is off</h1>
        <p className="mt-1 text-sm text-muted">Enable Host Mode to list a charger.</p>
        <ButtonLink href="/host" className="mt-5">
          Go to Host Mode
        </ButtonLink>
      </div>
    );
  return <>{children}</>;
}
