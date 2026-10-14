import { STATUS_LABELS, type Status } from "@/lib/applications/repository";

// Turns Jev's answers into one of three outcomes. Pure, so the rules can be
// read (and tested) without a model in the loop:
//   applied   — confident, and it moves the application forward: change the status now
//   suggested — plausible, but not confident enough: ask the user
//   ignored   — not about an application, or it wouldn't move anything forward

export const THRESHOLDS = {
  // Probability that the email is about one of the user's applications at all.
  relevantToApply: 0.8,
  relevantToSuggest: 0.5,
  // Jev's confidence in both the kind of email and which application it's about.
  confidenceToApply: 0.85,
};

// What the email says happened. "other" changes nothing.
export const EMAIL_KINDS = ["other", "received", "screening", "interview", "offer", "rejection"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

const STATUS_FOR_KIND: Record<Exclude<EmailKind, "other">, Status> = {
  received: "received",
  screening: "screening",
  interview: "interview",
  offer: "offer",
  rejection: "rejected",
};

const STAGE: Record<Status, number> = { applied: 0, received: 1, screening: 2, interview: 3, offer: 4, rejected: 4 };

// Forward only: a late "we received your application" never undoes an interview.
// A rejection or an offer can end any open application; nothing reopens a finished one.
export function isForward(from: Status, to: Status): boolean {
  if (from === "offer" || from === "rejected") return false;
  if (to === "rejected") return true;
  return STAGE[to] > STAGE[from];
}

export interface Answers {
  relevant: number;
  kind: { choice: EmailKind; confidence: number };
  // The chosen application's id, or null for "none of these".
  application: { id: string | null; confidence: number };
}

export interface Decision {
  outcome: "applied" | "suggested" | "ignored";
  applicationId: string | null;
  status: Status | null;
  reason: string;
}

export function decide(answers: Answers, currentStatus: (applicationId: string) => Status | undefined): Decision {
  const ignore = (reason: string, applicationId: string | null = null, status: Status | null = null): Decision => ({
    outcome: "ignored",
    applicationId,
    status,
    reason,
  });

  if (answers.relevant < THRESHOLDS.relevantToSuggest) return ignore("Not about one of your applications.");
  if (answers.kind.choice === "other") return ignore("Doesn't change an application's status.");
  const applicationId = answers.application.id;
  if (!applicationId) return ignore("Couldn't tell which application it's about.");
  const current = currentStatus(applicationId);
  if (!current) return ignore("That application isn't open anymore.", applicationId);

  const status = STATUS_FOR_KIND[answers.kind.choice];
  if (!isForward(current, status)) return ignore(`Already ${STATUS_LABELS[current]}; ${STATUS_LABELS[status]} wouldn't move it forward.`, applicationId, status);

  const confident =
    answers.relevant >= THRESHOLDS.relevantToApply &&
    answers.kind.confidence >= THRESHOLDS.confidenceToApply &&
    answers.application.confidence >= THRESHOLDS.confidenceToApply;
  return confident
    ? { outcome: "applied", applicationId, status, reason: `Moved from ${STATUS_LABELS[current]} to ${STATUS_LABELS[status]}.` }
    : { outcome: "suggested", applicationId, status, reason: `Looks like ${STATUS_LABELS[status]}, but not certain enough to change it automatically.` };
}
