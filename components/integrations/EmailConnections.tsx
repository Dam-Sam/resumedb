"use client";

import { useState, useTransition } from "react";
import { disconnectEmail } from "@/app/integrations/email-actions";
import LocalDate from "@/components/applications/LocalDate";

export interface ConnectionRow {
  id: string;
  provider: "gmail" | "outlook";
  email_address: string;
  status: "active" | "error" | "revoked";
  last_error: string | null;
  last_synced_at: string | null;
}

// What came back from Google's consent screen (?gmail=...).
const RESULTS: Record<
  string,
  { tone: "info" | "attention"; text: string; lead: string }
> = {
  connected: {
    tone: "info",
    lead: "Gmail connected.",
    text: "New emails from employers will update your Tracker.",
  },
  cancelled: { tone: "attention", lead: "Gmail wasn't connected.", text: "" },
  "no-access": {
    tone: "attention",
    lead: "Gmail wasn't connected.",
    text: "Tick the box that allows reading your email, then try again.",
  },
  taken: {
    tone: "attention",
    lead: "That Gmail address is already connected to another ResumeDB account.",
    text: "",
  },
  failed: {
    tone: "attention",
    lead: "Couldn't connect Gmail.",
    text: "Please try again.",
  },
};

export default function EmailConnections({
  connections,
  result,
}: {
  connections: ConnectionRow[];
  result?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const message = result ? RESULTS[result] : undefined;

  return (
    <div>
      {message && (
        <div
          role="status"
          className={`rdb-notice rdb-notice--${message.tone}`}
          style={{ maxWidth: "none", marginBottom: 16 }}
        >
          <div>
            <strong>{message.lead}</strong> {message.text}
          </div>
        </div>
      )}

      {connections.length === 0 && (
        <p className="rdb-muted" style={{ margin: "0 0 12px" }}>
          No inbox connected.
        </p>
      )}

      <div className="ig-list">
        {connections.map((c) => (
          <div key={c.id} className="ig-row">
            <div className="ig-gm" aria-hidden>
              G
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{c.email_address}</b>
              {c.status === "active" ? (
                <div className="rdb-small rdb-muted">
                  <span className="ig-live" />
                  {c.last_synced_at ? (
                    <>
                      Watching · last checked{" "}
                      <LocalDate iso={c.last_synced_at} withTime />
                    </>
                  ) : (
                    "Watching for new emails"
                  )}
                </div>
              ) : (
                <div className="rdb-small" style={{ color: "var(--danger)" }}>
                  Not connected anymore. Google stopped giving us access.
                </div>
              )}
              {c.last_error && (
                <div className="rdb-small rdb-muted">{c.last_error}</div>
              )}
            </div>
            {c.status !== "active" && (
              <a
                href="/api/email/gmail/connect"
                className="rdb-btn rdb-btn--primary rdb-btn--sm"
              >
                Reconnect
              </a>
            )}
            <button
              disabled={pending}
              className={`rdb-btn rdb-btn--sm ${c.status === "active" ? "rdb-btn--secondary" : "rdb-btn--quiet"}`}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await disconnectEmail(c.id);
                  if (r.error) setError(r.error);
                })
              }
            >
              {c.status === "active" ? "Disconnect" : "Remove"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p
          className="rdb-help rdb-help--error"
          role="alert"
          style={{ marginTop: 12 }}
        >
          {error}
        </p>
      )}

      {!connections.some((c) => c.provider === "gmail") && (
        // A plain link: the route redirects to Google, which client navigation can't follow.
        <a href="/api/email/gmail/connect" className="rdb-btn rdb-btn--primary">
          Connect Gmail
        </a>
      )}
    </div>
  );
}
