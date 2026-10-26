"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

// Onboarding locks the navbar until the user reaches the workspace; then it's released so they can leave.
let released = false;
const listeners = new Set<() => void>();

function setReleased(value: boolean) {
  released = value;
  listeners.forEach((l) => l());
}

export function releaseNavLock() {
  setReleased(true);
  return () => setReleased(false);
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

// During onboarding the navbar is shown but can't be used, so the steps are followed in order.
export default function NavLock({ children }: { children: React.ReactNode }) {
  const isReleased = useSyncExternalStore(subscribe, () => released, () => false);
  const locked = usePathname().startsWith("/onboarding") && !isReleased;
  return (
    <header
      className="rdb-topbar"
      inert={locked}
      style={locked ? { opacity: 0.6, userSelect: "none" } : undefined}
    >
      {children}
    </header>
  );
}
