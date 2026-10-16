"use client";

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
export default function AgentAccess({ keys, origin, dailyLimit }: { keys: ApiKeyRow[]; origin: string; dailyLimit: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const key = newKey ?? "rdb_YOUR_KEY";
  const mcpUrl = `${origin}/api/mcp`;

  return (
    <div className="space-y-5 text-sm">
      <p className="text-gray-600">
        Let an AI agent (Claude, Muse, or any agent that speaks MCP or HTTP) get resumes from ResumeDB while it applies to jobs
        for you. It sends the company, job title and description, and gets back a one-page PDF tailored from your profile, using
        the AI&apos;s rewrites. A job is added to your Tracker only when the agent says it applied.
      </p>

      {keys.map((k) => (
        <div key={k.id} className="flex items-start justify-between gap-4 rounded-md border border-gray-200 p-3">
          <div>
            <div className="font-medium">{k.name}</div>
            <div className="text-gray-600">
              <code>{k.prefix}</code> · Created <LocalDate iso={k.created_at} /> ·{" "}
              {k.last_used_at ? (
                <>
                  Last used <LocalDate iso={k.last_used_at} withTime />
                </>
              ) : (
                "Never used"
              )}
            </div>
          </div>
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await revokeApiKey(k.id);
                if (r.error) setError(r.error);
              })
            }
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-50"
          >
            Revoke
          </button>
        </div>
      ))}

      {newKey && (
        <div role="status" className="space-y-2 rounded-md border border-green-300 bg-green-50 p-3 text-green-900">
          <p>Copy this key now. You won&apos;t be able to see it again.</p>
          <CopyField value={newKey} />
        </div>
      )}

      <form
        className="flex gap-2"
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. Claude"
          maxLength={60}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2"
        />
        <button disabled={pending || !name.trim()} className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-50">
          Create API key
        </button>
      </form>

      {error && <p className="text-red-700">{error}</p>}

      <details className="rounded-md border border-gray-200 p-3">
        <summary className="cursor-pointer font-medium">Connect an agent</summary>
        <div className="mt-3 space-y-4">
          <div className="space-y-1">
            <h3 className="font-medium">MCP (Claude Code, Claude Desktop, Muse and other MCP clients)</h3>
            <p className="text-gray-600">
              Server URL <code>{mcpUrl}</code> (Streamable HTTP), with the header <code>Authorization: Bearer {key}</code>. Tools:{" "}
              <code>tailor_resume</code> and <code>mark_applied</code>.
            </p>
            <p className="text-gray-600">Claude Code:</p>
            <CopyField value={`claude mcp add --transport http resumedb ${mcpUrl} --header "Authorization: Bearer ${key}"`} />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium">REST</h3>
            <p className="text-gray-600">
              Returns the PDF. The <code>X-Tailoring-Id</code> header identifies it; <code>X-Download-Url</code> is a link to the
              same file, valid for an hour.
            </p>
            <CopyField
              value={`curl -X POST ${origin}/api/agent/tailor \\\n  -H "Authorization: Bearer ${key}" -H "Content-Type: application/json" \\\n  -d '{"company":"Acme","job_title":"Software Engineer","job_description":"..."}' \\\n  -D - -o resume.pdf`}
            />
            <p className="text-gray-600">After submitting the application:</p>
            <CopyField value={`curl -X POST ${origin}/api/agent/tailorings/TAILORING_ID/applied -H "Authorization: Bearer ${key}"`} />
          </div>
          <p className="text-gray-600">Each account can tailor up to {dailyLimit} resumes per day through agents.</p>
        </div>
      </details>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2">
      <pre className="flex-1 overflow-x-auto rounded-md bg-gray-100 p-2 text-xs whitespace-pre-wrap break-all">{value}</pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
