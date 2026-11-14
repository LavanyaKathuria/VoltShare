"use client";

import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { formatINR } from "@/lib/chargers";
import { db } from "@/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import { BatteryCharging, IndianRupee, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type P = { platformRevenue: number; totalKwh: number; sessions: number };

/** Admin-only (rules) platform totals, maintained by the billing trigger. */
export function PlatformStats() {
  const [p, setP] = useState<P>({ platformRevenue: 0, totalKwh: 0, sessions: 0 });
  useEffect(() => onSnapshot(doc(db, "platformStats", "global"), (s) => s.exists() && setP({ platformRevenue: 0, totalKwh: 0, sessions: 0, ...(s.data() as Partial<P>) })), []);
  const items = [
    { Icon: IndianRupee, label: "Platform fees earned", value: p.platformRevenue, fmt: (n: number) => formatINR(n) },
    { Icon: Zap, label: "Energy delivered", value: p.totalKwh, fmt: (n: number) => `${n.toFixed(1)} kWh` },
    { Icon: BatteryCharging, label: "Completed sessions", value: p.sessions, fmt: (n: number) => String(Math.round(n)) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(({ Icon, label, value, fmt }) => (
        <div key={label} className="card p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Icon className="h-3.5 w-3.5" /> {label}
          </p>
          <p className="num mt-2 text-2xl font-medium">
            <AnimatedNumber value={value} format={fmt} />
          </p>
        </div>
      ))}
    </div>
  );
}
