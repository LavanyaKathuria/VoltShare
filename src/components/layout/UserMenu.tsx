"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Pill } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ROLE_STYLE = {
  renter: "bg-sky-tint text-sky-600",
  host: "bg-mint text-avail-fg",
  admin: "bg-ink text-white",
} as const;

export function RoleChips() {
  const { roles } = useAuth();
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Pill key={r} className={ROLE_STYLE[r] + " capitalize"}>
          {r}
        </Pill>
      ))}
    </div>
  );
}

export function UserMenuLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { claims, signOut } = useAuth();
  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50";
  return (
    <nav className="flex flex-col" onClick={onNavigate}>
      <Link className={item} href="/bookings">
        <CalendarCheck className="h-4 w-4 text-muted" /> My bookings
      </Link>
      <Link className={item} href="/host">
        <LayoutDashboard className="h-4 w-4 text-muted" /> {claims.host ? "Host dashboard" : "Become a host"}
      </Link>
      {claims.admin && (
        <Link className={item} href="/admin">
          <ShieldCheck className="h-4 w-4 text-muted" /> Admin
        </Link>
      )}
      <button className={item + " text-left text-red-600"} onClick={() => void signOut()}>
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </nav>
  );
}

export function UserMenu() {
  const { user, profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (loading) return <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />;
  if (!user)
    return (
      <ButtonLink href="/login" variant="primary" size="sm">
        Sign in
      </ButtonLink>
    );

  const name = profile?.name ?? user.displayName ?? user.email;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center rounded-full ring-1 ring-line transition hover:ring-sky"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar name={name} photo={profile?.photo ?? user.photoURL} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="card absolute right-0 top-11 w-64 p-2 shadow-lift"
          >
            <div className="border-b border-line px-3 pb-3 pt-2">
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <div className="mt-2">
                <RoleChips />
              </div>
            </div>
            <div className="pt-1">
              <UserMenuLinks onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
