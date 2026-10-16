import "server-only";
import { randomBytes } from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { tailor } from "@/lib/ai/tailor";
import { createApplication } from "@/lib/applications/repository";
import { loadProfile } from "@/lib/profile/repository";
import { fitToOnePage } from "@/lib/resume/fit";
import { buildFinalResume, resumeFileName, type FinalResume } from "@/lib/resume/final";
import { ResumePdf } from "@/lib/resume/pdf";
import type { TailoredResume } from "@/lib/resume/types";
import { workspaceReducer } from "@/lib/resume/workspace-reducer";
import type { AgentCaller } from "./keys";

// What an agent's call does, shared by the MCP server and the REST routes.
// Every query goes through the service-role client, so each one filters by the
// caller's user_id itself.

// Tailorings per user per 24 hours: each one is a Claude call, and an agent can loop.
export const DAILY_LIMIT = 50;

// How long a PDF's download link works.
const LINK_LIFETIME_MS = 60 * 60 * 1000;

export class AgentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// The request body / tool arguments, the same for REST and MCP.
export const TailorFields = {
  company: z.string().trim().min(1).max(200).describe("Company name, as in the posting."),
  job_title: z.string().trim().min(1).max(200).describe("Job title, as in the posting."),
  job_description: z.string().trim().min(1).max(50_000).describe("The full job description text."),
  include_summary: z.boolean().default(false).describe("Add a short summary section at the top. Default false."),
};
export const TailorRequest = z.object(TailorFields);

export interface AgentTailorInput {
  company: string;
  jobTitle: string;
  jobDescription: string;
  includeSummary: boolean;
}

export function toTailorInput(r: z.output<typeof TailorRequest>): AgentTailorInput {
  return { company: r.company, jobTitle: r.job_title, jobDescription: r.job_description, includeSummary: r.include_summary };
}

export interface AgentTailoring {
  id: string;
  fileName: string;
  pdf: Buffer;
  downloadToken: string;
  downloadExpiresAt: string;
}

// Posting → tailored, one-page PDF. Saved as a pending tailoring; it reaches the
// Tracker only through markApplied.
export async function tailorPdf(admin: SupabaseClient, caller: AgentCaller, input: AgentTailorInput): Promise<AgentTailoring> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await admin
    .from("agent_tailorings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", caller.userId)
    .gte("created_at", since);
  if (countError) throw countError;
  if ((count ?? 0) >= DAILY_LIMIT) {
    throw new AgentError(`Daily limit of ${DAILY_LIMIT} tailored resumes reached. Try again tomorrow.`, 429);
  }

  const profile = await loadProfile(admin, caller.userId);
  if (!profile.items.length) {
    throw new AgentError("The ResumeDB profile is empty. Add experience on the Profile tab first.", 400);
  }

  const { resume } = await tailor(admin, caller.userId, profile, input);
  const fitted = await fitToOnePage(preferAi(resume), async (s) => pageCount(await renderPdf(buildFinalResume(s))));
  const final = buildFinalResume(fitted);
  const pdf = await renderPdf(final);
  const downloadToken = randomBytes(32).toString("base64url");
  const downloadExpiresAt = new Date(Date.now() + LINK_LIFETIME_MS).toISOString();

  const { data, error } = await admin
    .from("agent_tailorings")
    .insert({
      user_id: caller.userId,
      api_key_id: caller.keyId,
      company: input.company,
      job_title: input.jobTitle,
      job_description: input.jobDescription,
      resume: final,
      download_token: downloadToken,
      download_expires_at: downloadExpiresAt,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { id: data.id, fileName: resumeFileName(final.name, "pdf"), pdf, downloadToken, downloadExpiresAt };
}

// A link to the PDF that works without the API key, so an agent can hand the
// plain URL to an upload form or browser. The random token is the access check.
export function downloadUrl(origin: string, t: Pick<AgentTailoring, "id" | "downloadToken">) {
  const url = new URL(`/api/agent/tailorings/${t.id}/pdf`, origin);
  url.searchParams.set("token", t.downloadToken);
  return url.toString();
}

// A saved tailoring's PDF, if the token matches and the link hasn't expired.
export async function tailoringPdf(admin: SupabaseClient, id: string, token: string) {
  const { data, error } = await admin
    .from("agent_tailorings")
    .select("resume")
    .eq("id", id)
    .eq("download_token", token)
    .gt("download_expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const final = data.resume as FinalResume;
  return { fileName: resumeFileName(final.name, "pdf"), pdf: await renderPdf(final) };
}

// The agent submitted the application: put it on the Tracker as Applied.
// Calling it again for the same tailoring returns the same application.
export async function markApplied(admin: SupabaseClient, caller: AgentCaller, tailoringId: string): Promise<string> {
  const { data: t, error } = await admin
    .from("agent_tailorings")
    .select("id, company, job_title, job_description, resume, application_id")
    .eq("id", tailoringId)
    .eq("user_id", caller.userId)
    .maybeSingle();
  if (error) throw error;
  if (!t) throw new AgentError("No tailored resume with that id.", 404);
  if (t.application_id) return t.application_id;

  const applicationId = await createApplication(admin, caller.userId, {
    company: t.company,
    job_title: t.job_title,
    job_description: t.job_description,
    resume: t.resume,
  });
  // Only links if no other call got there first; that call's application wins.
  const { data: linked, error: linkError } = await admin
    .from("agent_tailorings")
    .update({ application_id: applicationId })
    .eq("id", t.id)
    .is("application_id", null)
    .select("id");
  if (linkError) throw linkError;
  if (!linked.length) {
    await admin.from("applications").delete().eq("id", applicationId).eq("user_id", caller.userId);
    const { data: again } = await admin.from("agent_tailorings").select("application_id").eq("id", t.id).single();
    return again!.application_id;
  }
  return applicationId;
}

// No one reviews an agent's resume, so it uses the AI's wording: every
// rewritten bullet and suggested role title.
function preferAi(resume: TailoredResume): TailoredResume {
  let state = resume;
  for (const section of resume.sections) {
    if (section.kind !== "items") continue;
    for (const item of section.items) {
      if (item.aiTitle) state = workspaceReducer(state, { type: "selectTitle", itemId: item.id, side: "ai" });
      for (const b of item.bullets) {
        if (b.ai !== null) state = workspaceReducer(state, { type: "select", bulletId: b.id, side: "ai" });
      }
    }
  }
  return state;
}

function renderPdf(final: FinalResume) {
  return renderToBuffer(<ResumePdf resume={final} />);
}

// Each page is one "/Type /Page" object (same count as countPdfPages in the browser).
function pageCount(pdf: Buffer) {
  return pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length ?? 1;
}
