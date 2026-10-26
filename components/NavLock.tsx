"use client";

import { usePathname } from "next/navigation";

// During onboarding the navbar is shown but can't be used, so the steps are followed in order.
export default function NavLock({ children }: { children: React.ReactNode }) {
  const locked = usePathname().startsWith("/onboarding");
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
