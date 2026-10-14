import type { SupabaseClient } from "@supabase/supabase-js";
import * as repo from "@/lib/applications/repository";
import { findCandidates, type Candidate } from "./candidates";
import { classifyEmail, type Classification } from "./classify";
import { decide, type Decision } from "./decide";
import type { IncomingEmail } from "./types";

// One email, start to finish: claim it (so it's only processed once), narrow to
// candidate applications, ask Jev, decide, apply or suggest, and record the result.
// Every email provider hands its messages to this.

export interface ProcessResult {
  // Already processed earlier; nothing was done this time.
  duplicate: boolean;
  candidates: Candidate[];
  // Null when no candidate matched, so Jev wasn't asked.
  classification: Classification | null;
  decision: Decision;
}

export async function processEmail(
  supabase: SupabaseClient,
  userId: string,
  email: IncomingEmail,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<ProcessResult> {
  const messageId = dryRun ? null : await claim(supabase, userId, email);
  if (!dryRun && !messageId) {
    return { duplicate: true, candidates: [], classification: null, decision: none("Already processed.") };
  }

  try {
    const open = await repo.listOpenApplications(supabase, userId);
    const candidates = findCandidates(email, open);
    if (!candidates.length) {
      const decision = none("Doesn't mention a company in your tracker.");
      if (messageId) await record(supabase, messageId, decision, null);
      return { duplicate: false, candidates, classification: null, decision };
    }

    const classification = await classifyEmail(supabase, userId, email, candidates);
    const statusById = new Map(open.map((a) => [a.id, a.status]));
    let decision = decide(classification.answers, (id) => statusById.get(id));

    if (messageId && decision.outcome === "applied") {
      const applied = await repo.setStatusFromEmail(
        supabase,
        decision.applicationId!,
        statusById.get(decision.applicationId!)!,
        decision.status!,
        messageId,
      );
      if (!applied) decision = { ...decision, outcome: "suggested", reason: "The status changed while this email was being read, so it's left for you to confirm." };
    }

    if (messageId) await record(supabase, messageId, decision, { candidates, ...classification.raw });
    return { duplicate: false, candidates, classification, decision };
  } catch (err) {
    if (messageId) {
      await supabase
        .from("email_messages")
        .update({ outcome: "failed", reason: err instanceof Error ? err.message : String(err) })
        .eq("id", messageId);
    }
    throw err;
  }
}

function none(reason: string): Decision {
  return { outcome: "ignored", applicationId: null, status: null, reason };
}

// Inserts the email's row, or returns null if this email was already processed.
async function claim(supabase: SupabaseClient, userId: string, email: IncomingEmail): Promise<string | null> {
  const { data, error } = await supabase
    .from("email_messages")
    .upsert(
      {
        user_id: userId,
        provider: email.provider,
        provider_message_id: email.providerMessageId,
        from_address: email.fromAddress,
        from_name: email.fromName,
        subject: email.subject,
        received_at: email.receivedAt,
      },
      { onConflict: "user_id,provider,provider_message_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;
  return data[0]?.id ?? null;
}

async function record(supabase: SupabaseClient, id: string, decision: Decision, details: object | null) {
  const { error } = await supabase
    .from("email_messages")
    .update({
      outcome: decision.outcome,
      application_id: decision.applicationId,
      proposed_status: decision.status,
      reason: decision.reason,
      decision: details,
    })
    .eq("id", id);
  if (error) throw error;
}
