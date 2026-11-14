"use client";

import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { LocationPicker } from "./LocationPicker";
import { RoleSwitcher } from "./RoleSwitcher";
import { RoleChips, UserMenu, UserMenuLinks } from "./UserMenu";

function MobileAccount({ close }: { close: () => void }) {
  const { user, profile } = useAuth();
  if (!user)
    return (
      <ButtonLink href="/login" variant="primary" onClick={close}>
        Sign in
      </ButtonLink>
    );
  return (
    <div className="rounded-xl border border-line p-2">
      <div className="flex items-center gap-3 px-2 pb-2">
        <Avatar name={profile?.name ?? user.email} photo={profile?.photo ?? user.photoURL} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{profile?.name ?? user.email}</p>
          <RoleChips />
        </div>
      </div>
      <UserMenuLinks onNavigate={close} />
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-[1000] border-b border-line/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <LocationPicker className="hidden md:block" />
        <div className="hidden lg:flex items-center gap-3">
          <RoleSwitcher />
          <UserMenu />
        </div>
        <button className="lg:hidden rounded-lg p-2 hover:bg-slate-100" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden overflow-hidden border-t border-line bg-white"
          >
            <div className="flex flex-col gap-3 p-4">
              <div onClick={() => setOpen(false)}>
                <RoleSwitcher className="w-full" />
              </div>
              <LocationPicker compact className="md:hidden" onPicked={() => setOpen(false)} />
              <MobileAccount close={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
