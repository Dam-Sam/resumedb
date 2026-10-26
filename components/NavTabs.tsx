"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tailor", label: "Tailor" },
  { href: "/applications", label: "Tracker" },
  { href: "/integrations", label: "Integrations" },
  { href: "/profile", label: "Profile" },
];

export default function NavTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="rdb-tabs">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={
                pathname === t.href || pathname.startsWith(`${t.href}/`)
                  ? "page"
                  : undefined
              }
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
