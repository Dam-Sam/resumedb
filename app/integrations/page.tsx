import { Bot, Mail } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AgentAccess, {
  type ApiKeyRow,
} from "@/components/integrations/AgentAccess";
import EmailConnections, {
  type ConnectionRow,
} from "@/components/integrations/EmailConnections";
import { DAILY_LIMIT } from "@/lib/agent/tailor-pdf";
import { createClient } from "@/lib/supabase/server";

// Start of the rolling 24 hours the agent daily limit counts over.
function agentWindowStart() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default async function IntegrationsPage({
  searchParams,
}: PageProps<"/integrations">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { gmail } = await searchParams;
  const since = agentWindowStart();
  const [{ data: connections }, { data: keys }, { count: usedToday }, h] =
    await Promise.all([
      supabase
        .from("email_connections")
        .select(
          "id, provider, email_address, status, last_error, last_synced_at",
        )
        .eq("user_id", user.id)
        .order("created_at"),
      supabase
        .from("api_keys")
        .select("id, name, prefix, last_used_at, created_at")
        .eq("user_id", user.id)
        .order("created_at"),
      // Same rolling window the agent limit uses. If RLS hides the table the count is null and the meter is left out.
      supabase
        .from("agent_tailorings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since),
      headers(),
    ]);
  // The address agents should call: this deployment's own.
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <div className="rdb-page" style={{ maxWidth: 960 }}>
      <div className="rdb-pagehead">
        <div>
          <h1 className="rdb-h1">Integrations</h1>
          <p className="rdb-lede">
            Let your inbox and your AI agents do some of the busywork. You can
            disconnect either at any time.
          </p>
        </div>
      </div>

      <section className="rdb-section">
        <div className="rdb-section__head">
          <div className="ig-ic">
            <Mail className="rdb-icon" width={20} height={20} aria-hidden />
          </div>
          <div>
            <h2 className="rdb-h2">Your inbox</h2>
            <p className="rdb-sub">
              We read new emails from employers and keep your Tracker&apos;s
              statuses current. Clear updates apply on their own; unclear ones
              wait for you on the Tracker. We only read; we never send or change
              anything.
            </p>
          </div>
        </div>
        {/* Gmail can't be connected until the Google OAuth client is configured for this deployment. */}
        {process.env.GOOGLE_CLIENT_ID ? (
          <EmailConnections
            connections={(connections ?? []) as ConnectionRow[]}
            result={typeof gmail === "string" ? gmail : undefined}
          />
        ) : (
          <p className="rdb-muted" style={{ margin: 0 }}>
            Email connections aren&apos;t available yet.
          </p>
        )}
      </section>

      <section className="rdb-section">
        <div className="rdb-section__head">
          <div className="ig-ic">
            <Bot className="rdb-icon" width={20} height={20} aria-hidden />
          </div>
          <div>
            <h2 className="rdb-h2">AI agents</h2>
            <p className="rdb-sub">
              Let Claude, Muse or any agent that speaks MCP or HTTP get resumes
              from ResumeDB while it applies for you. It sends the company, job
              title and description, and gets back a one-page PDF tailored from
              your profile. A job joins your Tracker only when the agent says it
              applied.
            </p>
          </div>
        </div>
        <AgentAccess
          keys={(keys ?? []) as ApiKeyRow[]}
          origin={origin}
          dailyLimit={DAILY_LIMIT}
          usedToday={usedToday ?? null}
        />
      </section>
    </div>
  );
}
