"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

export type Mode = "renter" | "host";

type Ctx = { mode: Mode; setMode: (m: Mode) => void };
const ModeContext = createContext<Ctx>({ mode: "renter", setMode: () => {} });

/** Mode is derived from the route so it survives reloads and deep links. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const mode: Mode = pathname.startsWith("/host") ? "host" : "renter";
  const setMode = useCallback((m: Mode) => router.push(m === "host" ? "/host" : "/explore"), [router]);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
