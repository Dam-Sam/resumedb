"use client";

import { Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey } from "@/app/integrations/agent-actions";
import LocalDate from "@/components/applications/LocalDate";

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
}

// API keys plus copy-paste setup for agents. The new key is only in this
// component's state: once the page reloads it's gone for good.
export default function AgentAccess({
  keys,
  origin,
  dailyLimit,
  usedToday,
}: {
  keys: ApiKeyRow[];
  origin: string;
  dailyLimit: number;
  usedToday: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"mcp" | "rest">("mcp");
  const key = newKey ?? "rdb_YOUR_KEY";
  const mcpUrl = `${origin}/api/mcp`;

  const mcpTab = (
    <>
      <p className="rdb-small rdb-muted" style={{ margin: "0 0 12px" }}>
        For Claude Code, Claude Desktop, Muse and other MCP clients. Server URL{" "}
        <code>{mcpUrl}</code> (Streamable HTTP), header{" "}
        <code>Authorization: Bearer {key}</code>. Tools:{" "}
        <code>tailor_resume</code>, <code>mark_applied</code>.
      </p>
      <span className="rdb-label">Claude Code</span>
      <CopyField
        value={`claude mcp add --transport http resumedb ${mcpUrl} --header "Authorization: Bearer ${key}"`}
      />
    </>
  );
  const restTab = (
    <>
      <p className="rdb-small rdb-muted" style={{ margin: "0 0 12px" }}>
        Returns the PDF. <code>X-Tailoring-Id</code> identifies it;{" "}
        <code>X-Download-Url</code> links to the same file for an hour.
      </p>
      <CopyField
        value={`curl -X POST ${origin}/api/agent/tailor \\\n  -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" \\\n  -d '{"company":"Acme","job_title":"Software Engineer","job_description":"..."}' \\\n  -D - -o resume.pdf`}
      />
      <span className="rdb-label" style={{ marginTop: 16 }}>
        After the agent applies
      </span>
      <CopyField
        value={`curl -X POST ${origin}/api/agent/tailorings/TAILORING_ID/applied -H "Authorization: Bearer ${key}"`}
      />
    </>
  );

  return (
    <div>
      <h3 className="rdb-h3" style={{ margin: "8px 0 10px" }}>
        Your keys
      </h3>
      {keys.length === 0 && (
        <p className="rdb-small rdb-muted" style={{ margin: "0 0 10px" }}>
          No keys yet. Name one after the agent that will use it.
        </p>
      )}
      <div className="ig-list">
        {keys.map((k) => (
          <div key={k.id} className="ig-row">
            <div className="ig-kicon" aria-hidden>
              <KeyRound className="rdb-icon" width={16} height={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{k.name}</b>
              <div className="rdb-small rdb-muted">
                <code>{k.prefix}</code> · created{" "}
                <LocalDate iso={k.created_at} /> ·{" "}
                {k.last_used_at ? (
                  <>
                    last used <LocalDate iso={k.last_used_at} withTime />
                  </>
                ) : (
                  "never used"
                )}
              </div>
            </div>
            <button
              disabled={pending}
              className="rdb-btn rdb-btn--quiet rdb-btn--sm"
              style={{ color: "var(--danger)" }}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const r = await revokeApiKey(k.id);
                  if (r.error) setError(r.error);
                })
              }
            >
              Revoke
            </button>
          </div>
        ))}
      </div>

      <form
        className="ig-newkey"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setError(null);
            const r = await createApiKey(name);
            if (r.error) setError(r.error);
            else {
              setNewKey(r.key!);
              setName("");
            }
          });
        }}
      >
        <input
          className="rdb-input"
          aria-label="Key name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this key, e.g. Claude"
          maxLength={60}
        />
        <button
          disabled={pending || !name.trim()}
          className="rdb-btn rdb-btn--primary"
        >
          <Plus
            className="rdb-icon rdb-icon-on-primary"
            width={16}
            height={16}
            aria-hidden
          />{" "}
          Create key
        </button>
      </form>
      {error && (
        <p
          className="rdb-help rdb-help--error"
          role="alert"
          style={{ marginTop: 8 }}
        >
          {error}
        </p>
      )}

      {newKey && (
        <div role="status" className="ig-reveal">
          <p>
            <strong>Copy your new key now.</strong> For your security we only
            show it once.
          </p>
          <CopyField value={newKey} />
        </div>
      )}

      <div className="ig-connect">
        <div className="ig-connect__head">
          <h3 className="rdb-h3">Connect an agent</h3>
          <div className="rdb-seg" role="group" aria-label="Connection method">
            {(["mcp", "rest"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "mcp" ? "MCP" : "REST"}
              </button>
            ))}
          </div>
        </div>
        {tab === "mcp" ? mcpTab : restTab}
        <p className="rdb-small rdb-muted" style={{ margin: "16px 0 0" }}>
          Each account can tailor up to {dailyLimit} resumes a day through
          agents.
          {usedToday !== null && (
            <>
              {" "}
              <span className="ig-usage" aria-hidden>
                <span
                  style={{
                    width: `${Math.min(100, (usedToday / dailyLimit) * 100)}%`,
                  }}
                />
              </span>{" "}
              {usedToday} used in the last 24 hours.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rdb-code">
      <pre>{value}</pre>
      <button
        type="button"
        className="rdb-btn rdb-btn--secondary rdb-btn--sm"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? (
          <Check className="rdb-icon" width={16} height={16} aria-hidden />
        ) : (
          <Copy className="rdb-icon" width={16} height={16} aria-hidden />
        )}{" "}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
