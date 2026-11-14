"use client";

import { ChargerPhoto } from "@/components/explore/ChargerPhoto";
import { Toggle } from "@/components/ui/Toggle";
import { useAllChargers } from "@/hooks/useChargers";
import { formatRate } from "@/lib/chargers";
import { db } from "@/lib/firebase/client";
import { deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AdminChargers() {
  const chargers = useAllChargers(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line p-4">
        <h2 className="text-lg">Chargers</h2>
        <p className="text-sm text-muted">
          <span className="num">{chargers?.length ?? "–"}</span> listings · take a listing offline or mark its EV meter as DISCOM-verified
        </p>
      </div>
      {error && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      {!chargers ? (
        <div className="grid h-32 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
      ) : (
        <ul className="divide-y divide-line">
          <li className="hidden grid-cols-[1fr_70px_90px_40px] gap-4 bg-slate-50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted md:grid">
            <span>Listing</span><span>Online</span><span>Meter ✓</span><span />
          </li>
          {[...chargers].sort((a, b) => a.area.localeCompare(b.area)).map((c) => (
            <li key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_70px_90px_40px] md:gap-4">
              <Link href={`/chargers/${c.id}`} className="flex min-w-0 items-center gap-3 hover:underline">
                <ChargerPhoto src={c.photos[0]} alt="" className="h-10 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted">
                    {c.area} · {c.hostName} · <span className="num">{formatRate(c.ratePerKwh)}</span>
                  </p>
                </div>
              </Link>
              <Toggle
                label="Online"
                on={c.online}
                busy={busy === c.id + "o"}
                onClick={() => run(c.id + "o", () => updateDoc(doc(db, "chargers", c.id), { online: !c.online, updatedAt: serverTimestamp() }))}
              />
              <Toggle
                label="Meter verified"
                on={c.meterVerified}
                busy={busy === c.id + "m"}
                onClick={() => run(c.id + "m", () => updateDoc(doc(db, "chargers", c.id), { meterVerified: !c.meterVerified, updatedAt: serverTimestamp() }))}
              />
              <button
                aria-label="Delete listing"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600"
                onClick={() => confirm(`Delete “${c.title}”?`) && run(c.id + "d", () => deleteDoc(doc(db, "chargers", c.id)))}
              >
                {busy === c.id + "d" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
