import type { SupabaseClient } from "@supabase/supabase-js";
import type { Status } from "@/lib/applications/repository";
import { isForward } from "./decide";

// Emails Jev wasn't sure enough about to apply on its own. They wait on the
// Tracker until the user updates the status or dismisses them. Runs with the
// signed-in user's client, so RLS keeps it to their own emails.

export interface Suggestion {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string;
  received_at: string;
  proposed_status: Status;
  reason: string | null;
  application: { id: string; company: string; job_title: string; status: Status };
}

// Only suggestions that would still move their application forward: a status
// changed since (by hand or by a later email) makes the older ones moot.
export async function listSuggestions(supabase: SupabaseClient, userId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("email_messages")
    .select(
      "id, from_address, from_name, subject, received_at, proposed_status, reason, application:applications!email_messages_application_id_fkey(id, company, job_title, status)",
    )
    .eq("user_id", userId)
    .eq("outcome", "suggested")
    .order("received_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as (Suggestion & { application: Suggestion["application"] | null })[]).filter(
    (s): s is Suggestion => !!s.application && !!s.proposed_status && isForward(s.application.status, s.proposed_status),
  );
}

// Applies the suggested status. The timeline entry points back at the email.
// Only applies while the status is still what the suggestion was shown against.
export async function acceptSuggestion(supabase: SupabaseClient, id: string): Promise<boolean> {
  const { data: s, error } = await supabase
    .from("email_messages")
    .select("id, proposed_status, application:applications!email_messages_application_id_fkey(id, status)")
    .eq("id", id)
    .eq("outcome", "suggested")
    .maybeSingle();
  if (error) throw error;
  const app = s?.application as unknown as { id: string; status: Status } | null;
  if (!s || !app || !s.proposed_status || !isForward(app.status, s.proposed_status)) return false;

  const { data: updated, error: updateError } = await supabase
    .from("applications")
    .update({ status: s.proposed_status, status_source: "email", status_email_id: s.id })
    .eq("id", app.id)
    .eq("status", app.status)
    .select("id");
  if (updateError) throw updateError;
  if (!updated.length) return false;

  await answer(supabase, id, "accepted");
  return true;
}

export function dismissSuggestion(supabase: SupabaseClient, id: string) {
  return answer(supabase, id, "dismissed");
}

async function answer(supabase: SupabaseClient, id: string, outcome: "accepted" | "dismissed") {
  const { error } = await supabase.from("email_messages").update({ outcome }).eq("id", id).eq("outcome", "suggested");
  if (error) throw error;
}
