import type { SupabaseClient } from "@supabase/supabase-js";
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { withRunLog } from "@/lib/llm/log";
import type { Candidate } from "./candidates";
import type { Answers, EmailKind } from "./decide";
import type { IncomingEmail } from "./types";

// Asks Jev (TypeSafe's decision model) three questions about one email, in one
// request: is it about an application, what happened, and which application.
// Jev returns probabilities rather than text, and the confidence it reports is
// what decide() uses to choose between changing the status and asking.

// Pinned, not "jev-latest": the thresholds in decide.ts are tuned against this
// version. Move to a new one deliberately, after re-checking on real emails.
const MODEL = "jev-1.13.0";

// Bump when a question's wording changes, so llm_runs shows which wording made each decision.
const QUESTIONS_VERSION = "email-v1";

// Jev reads literally and loses accuracy on long, cluttered state.
// The opening of an email is where the news is.
const BODY_CHARS = 4000;

const NONE = "none";

// Jev leans toward the first option when unsure, so the do-nothing option
// ("other", "none") comes first: an unsure answer errs toward changing nothing.
const KIND_CRITERIA: Record<EmailKind, string> = {
  other:
    "None of the outcomes below. For example: a job alert or job recommendation, a newsletter or marketing, an account or password email, an event invitation, or an email that isn't from a company the candidate applied to.",
  received:
    "The company confirms it received the application or is reviewing it (for example \"Thanks for applying\" or \"We received your application\"). No next step is offered yet.",
  screening:
    "The company asks the candidate to do a first step before interviews, or to schedule one: a recruiter or phone screen, an online assessment, a coding challenge, a take-home assignment, or a questionnaire.",
  interview:
    "The company invites the candidate to an interview, or schedules or confirms one: technical, behavioral, hiring-manager, panel, onsite, virtual, or final round.",
  offer: "The company offers the candidate the job or sends an offer letter.",
  rejection:
    "The company says it will not move forward with the candidate for this role (for example \"Unfortunately\", \"we decided to pursue other candidates\", or \"the position has been filled\").",
};

let client: TypeSafeClient | undefined;
function jev() {
  client ??= new TypeSafeClient({ defaultModel: MODEL });
  return client;
}

export interface Classification {
  answers: Answers;
  // Every option's probability, for the decision log and for tuning.
  raw: {
    relevant: number;
    kind: Record<string, number>;
    application: Record<string, number>;
    applicationOptions: Record<string, string>;
  };
}

export async function classifyEmail(
  supabase: SupabaseClient,
  userId: string,
  email: IncomingEmail,
  candidates: Candidate[],
): Promise<Classification> {
  // Short labels for the options; the description says which application each is.
  const labelToId = new Map(candidates.map((c, i) => [`application_${i + 1}`, c.id]));
  const applicationCriteria: Record<string, string> = {
    [NONE]: "None of these. The email is about a different company, or about a different role than any listed here.",
  };
  candidates.forEach((c, i) => {
    applicationCriteria[`application_${i + 1}`] =
      `${c.job_title} at ${c.company}. Also pick this for an email from ${c.company} that doesn't name a role.`;
  });

  const request = {
    model: MODEL,
    state: {
      email: {
        from: email.fromName ? `${email.fromName} <${email.fromAddress}>` : email.fromAddress,
        subject: email.subject,
        body: email.text.slice(0, BODY_CHARS),
      },
    },
    questions: {
      relevant: noul(
        "Was this email sent by an employer or a recruiter, about a job application the candidate already submitted?",
        {
          true: "Yes: it is about the candidate's own application, such as a confirmation, a next step, an interview, an offer, or a rejection.",
          false: "No: it is a job alert, a job recommendation, a newsletter, marketing, or anything not about an application the candidate submitted.",
        },
      ),
      kind: choice("What does this email tell the candidate about their application?", KIND_CRITERIA),
      application: choice("Which of the candidate's job applications is this email about?", applicationCriteria),
    },
  };

  const { data } = await withRunLog(
    supabase,
    userId,
    { purpose: "email", promptId: null, promptVersion: QUESTIONS_VERSION, model: MODEL, input: JSON.stringify(request) },
    async () => {
      const response = await jev().systemOne(request);
      return {
        data: response.answers,
        raw: JSON.stringify(response),
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    },
  );

  const picked = data.application.choice;
  return {
    answers: {
      relevant: data.relevant.noul,
      kind: { choice: data.kind.choice, confidence: data.kind.confidence },
      application: { id: labelToId.get(picked) ?? null, confidence: data.application.confidence },
    },
    raw: {
      relevant: data.relevant.noul,
      kind: { ...data.kind.probabilities },
      application: { ...data.application.probabilities },
      applicationOptions: applicationCriteria,
    },
  };
}
