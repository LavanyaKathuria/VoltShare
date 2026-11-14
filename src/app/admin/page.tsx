"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { db, functions } from "@/lib/firebase/client";
import type { UserProfile } from "@/types";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { BadgeCheck, Loader2, Search, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Patch = { uid: string; host?: boolean; admin?: boolean; verifiedHost?: boolean };
const setRoles = (p: Patch) => httpsCallable<Patch, { roles: string[] }>(functions, "adminSetUserRoles")(p);

function Toggle({ on, busy, onClick, label }: { on: boolean; busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={busy}
      onClick={onClick}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-brand" : "bg-slate-200")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      {busy && <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-ink" />}
    </button>
  );
}

function UsersTable() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "users"), orderBy("createdAt", "desc")),
        (s) => setUsers(s.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<UserProfile, "uid">) }))),
        (e) => setError(e.message),
      ),
    [],
  );

  const filtered = useMemo(
    () => (users ?? []).filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [users, q],
  );

  async function update(p: Patch, key: string) {
    setBusy(key);
    setError(null);
    try {
      await setRoles(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg">Users</h2>
          <p className="text-sm text-muted">
            <span className="num">{users?.length ?? "–"}</span> accounts · role changes apply instantly via custom claims
          </p>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line px-3 sm:w-64">
          <Search className="h-4 w-4 text-muted" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {!users ? (
        <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <ul className="divide-y divide-line">
          <li className="hidden grid-cols-[1fr_70px_90px_70px] gap-4 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted md:grid">
            <span>User</span><span>Host</span><span>Verified</span><span>Admin</span>
          </li>
          {filtered.map((u) => {
            const isHost = u.roles?.includes("host");
            const isAdmin = u.roles?.includes("admin");
            return (
              <li key={u.uid} className="grid grid-cols-3 items-center gap-4 px-4 py-3 md:grid-cols-[1fr_70px_90px_70px]">
                <div className="col-span-3 flex min-w-0 items-center gap-3 md:col-span-1">
                  <Avatar name={u.name} photo={u.photo} size={36} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      {u.name}
                      {u.verifiedHost && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />}
                      {u.uid === user?.uid && <Pill className="bg-slate-100 text-muted">you</Pill>}
                    </p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-2 text-xs text-muted md:block">
                  <span className="md:hidden">Host</span>
                  <Toggle label="Host" on={!!isHost} busy={busy === u.uid + "h"} onClick={() => update({ uid: u.uid, host: !isHost }, u.uid + "h")} />
                </span>
                <span className="flex items-center gap-2 text-xs text-muted md:block">
                  <span className="md:hidden">Verified</span>
                  <Toggle
                    label="Verified host"
                    on={!!u.verifiedHost}
                    busy={busy === u.uid + "v"}
                    onClick={() => update({ uid: u.uid, verifiedHost: !u.verifiedHost, ...(u.verifiedHost ? {} : { host: true }) }, u.uid + "v")}
                  />
                </span>
                <span className="flex items-center gap-2 text-xs text-muted md:block">
                  <span className="md:hidden">Admin</span>
                  <Toggle label="Admin" on={!!isAdmin} busy={busy === u.uid + "a"} onClick={() => update({ uid: u.uid, admin: !isAdmin }, u.uid + "a")} />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AdminGate() {
  const { claims } = useAuth();
  if (!claims.admin)
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-busy-fg" />
        <h1 className="mt-3 text-xl">Admins only</h1>
        <p className="mt-1 text-sm text-muted">Your account doesn’t have the admin role. (The data is protected by Firestore rules too.)</p>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl">Admin</h1>
        <p className="text-muted">Verify hosts and manage roles. Charger moderation arrives with listings.</p>
      </div>
      <UsersTable />
    </div>
  );
}

export default function AdminPage() {
  return (
    <main className="px-4 py-10 sm:px-6">
      <RequireAuth>
        <AdminGate />
      </RequireAuth>
    </main>
  );
}
