import { redirect } from "next/navigation";
import EmailConnections, { type ConnectionRow } from "@/components/integrations/EmailConnections";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsPage({ searchParams }: PageProps<"/integrations">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { gmail } = await searchParams;
  const { data: connections } = await supabase
    .from("email_connections")
    .select("id, provider, email_address, status, last_error, last_synced_at")
    .eq("user_id", user.id)
    .order("created_at");

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="mt-1 text-sm text-gray-600">Connect other services to ResumeDB.</p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Connected email</h2>
        {/* Gmail can't be connected until the Google OAuth client is configured for this deployment. */}
        {process.env.GOOGLE_CLIENT_ID ? (
          <EmailConnections
            connections={(connections ?? []) as ConnectionRow[]}
            result={typeof gmail === "string" ? gmail : undefined}
          />
        ) : (
          <p className="text-sm text-gray-600">Email connections aren&apos;t available yet.</p>
        )}
      </section>
    </div>
  );
}
