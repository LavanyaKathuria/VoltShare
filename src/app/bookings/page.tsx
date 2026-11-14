"use client";

import { RequireAuth } from "@/components/auth/RequireAuth";

export default function BookingsPage() {
  return (
    <main className="px-4 py-10 sm:px-6">
      <RequireAuth>
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl">My bookings</h1>
          <div className="card mt-6 p-8 text-center text-muted">Your bookings and live charging sessions will appear here.</div>
        </div>
      </RequireAuth>
    </main>
  );
}
