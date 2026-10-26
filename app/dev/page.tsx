import Link from "next/link";
import { requireDevTools } from "@/lib/dev/guard";
import { PERSONAS } from "@/lib/dev/personas";

const SCREENS: [string, string, string][] = [
  ["/onboarding", "Onboarding", "New user only (redirects once a profile exists)"],
  ["/tailor", "Tailor form", "Either user"],
  ["/dev/workspace", "Workspace", "Canned tailoring result; no sign-in or model call"],
  ["/dashboard", "Dashboard", "Populated user has data"],
  ["/applications", "Tracker", "Populated user has data"],
  ["/profile", "Profile", "Populated user has data"],
  ["/integrations", "Integrations", "Inbox not connected for either user"],
  ["/dev/email", "Email classifier test", "Calls Jev"],
];

// Dev only: switch dev users and jump to any screen.
export default function DevHome() {
  requireDevTools();
  return (
    <div className="rdb-page rdb-page--narrow">
      <h1 className="rdb-h1">Dev tools</h1>
      <p className="rdb-lede">
        Seeded users in the real database. Signing in as one creates it if needed. The new user is wiped every time;
        the populated user is kept unless you reset it.
      </p>

      <h2 className="rdb-h2" style={{ marginTop: 28 }}>Sign in as</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
        {Object.entries(PERSONAS).map(([key, p]) => (
          <li key={key} className="rdb-section">
            <strong>{p.label}</strong> <span className="rdb-muted rdb-small">{p.email}</span>
            <p className="rdb-muted rdb-small" style={{ margin: "4px 0 10px" }}>{p.note}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <a className="rdb-btn rdb-btn--sm" href={`/dev/login?as=${key}`}>Sign in</a>
              {key === "populated" && (
                <a className="rdb-btn rdb-btn--quiet rdb-btn--sm" href={`/dev/login?as=${key}&reset=1`}>Reset data and sign in</a>
              )}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="rdb-h2" style={{ marginTop: 28 }}>Screens</h2>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
        {SCREENS.map(([href, name, note]) => (
          <li key={href}>
            <Link href={href}>{name}</Link> <span className="rdb-muted rdb-small">{note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
