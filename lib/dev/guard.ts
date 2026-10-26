import { notFound } from "next/navigation";

// Dev tools sign in as seeded users without a password prompt, and the dev
// database is the real one. So they need both a non-production build and an
// explicit opt-in (ENABLE_DEV_TOOLS=1 in .env.local, never set on Vercel).
export function devToolsEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_TOOLS === "1";
}

export function requireDevTools() {
  if (!devToolsEnabled()) notFound();
}
