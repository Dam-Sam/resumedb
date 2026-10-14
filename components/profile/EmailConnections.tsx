"use client";

import { useState, useTransition } from "react";
import { disconnectEmail } from "@/app/profile/email-actions";
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
const RESULTS: Record<string, { tone: "ok" | "bad"; text: string }> = {
  connected: { tone: "ok", text: "Gmail connected. New emails from employers will update your Tracker." },
  cancelled: { tone: "bad", text: "Gmail wasn't connected." },
  "no-access": { tone: "bad", text: "Gmail wasn't connected: tick the box that allows reading your email, then try again." },
  taken: { tone: "bad", text: "That Gmail address is already connected to another ResumeDB account." },
  failed: { tone: "bad", text: "Couldn't connect Gmail. Please try again." },
};

export default function EmailConnections({ connections, result }: { connections: ConnectionRow[]; result?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const message = result ? RESULTS[result] : undefined;

  return (
    <div className="space-y-4 text-sm">
      <p className="text-gray-600">
        Connect your inbox and ResumeDB reads new emails from employers to keep your Tracker statuses up to date. It only reads
        mail; it never sends or changes anything.
      </p>

      {message && (
        <div
          role="status"
          className={`rounded-md border p-3 ${message.tone === "ok" ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
        >
          {message.text}
        </div>
      )}

      {connections.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-4 rounded-md border border-gray-200 p-3">
          <div>
            <div className="font-medium">{c.email_address}</div>
            <div className="text-gray-600">
              {c.status === "active" ? (
                c.last_synced_at ? (
                  <>
                    Watching. Last checked <LocalDate iso={c.last_synced_at} withTime />
                  </>
                ) : (
                  "Watching for new emails."
                )
              ) : (
                <span className="text-red-700">Not connected anymore.</span>
              )}
            </div>
            {c.last_error && <div className="mt-1 text-amber-800">{c.last_error}</div>}
          </div>
          <div className="flex shrink-0 gap-2">
            {c.status !== "active" && (
              <a href="/api/email/gmail/connect" className="rounded-md border border-gray-300 px-3 py-1.5">
                Reconnect
              </a>
            )}
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await disconnectEmail(c.id);
                  if (r.error) setError(r.error);
                })
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      ))}

      {error && <p className="text-red-700">{error}</p>}

      {!connections.some((c) => c.provider === "gmail") && (
        // A plain link: the route redirects to Google, which client navigation can't follow.
        <a href="/api/email/gmail/connect" className="inline-block rounded-md bg-gray-900 px-4 py-2 font-medium text-white">
          Connect Gmail
        </a>
      )}
    </div>
  );
}
