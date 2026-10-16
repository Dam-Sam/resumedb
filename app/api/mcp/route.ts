import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { unauthorized } from "@/lib/agent/http";
import { authenticate, type AgentCaller } from "@/lib/agent/keys";
import { AgentError, downloadUrl, markApplied, tailorPdf, TailorFields, toTailorInput } from "@/lib/agent/tailor-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

// Tailoring, plus a few PDF renders to fit one page.
export const maxDuration = 300;

// MCP over Streamable HTTP, stateless: every request carries the API key and
// gets a fresh server bound to that user. Same work as the REST routes.
async function handle(request: Request) {
  const caller = await authenticate(createAdminClient(), request);
  if (!caller) return unauthorized();

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await buildServer(caller, new URL(request.url).origin).connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };

function buildServer(caller: AgentCaller, origin: string) {
  const server = new McpServer(
    { name: "resumedb", version: "1.0.0" },
    {
      instructions:
        "ResumeDB tailors the user's resume to a job posting, using only experience from their ResumeDB profile. " +
        "Call tailor_resume with the posting to get a one-page PDF; upload that file with the application. " +
        "After the application is actually submitted, call mark_applied with the tailoring_id so it shows up on the user's Tracker. " +
        "Don't call mark_applied for jobs you didn't apply to.",
    },
  );

  server.registerTool(
    "tailor_resume",
    {
      title: "Tailor resume",
      description:
        "Creates a resume tailored to a job posting, as a one-page PDF. Returns a tailoring_id, a download_url " +
        "(valid for one hour) and the PDF itself. Takes up to a couple of minutes.",
      inputSchema: TailorFields,
    },
    async (args) => {
      try {
        const admin = createAdminClient();
        const t = await tailorPdf(admin, caller, toTailorInput(args));
        const url = downloadUrl(origin, t);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                tailoring_id: t.id,
                file_name: t.fileName,
                download_url: url,
                download_expires_at: t.downloadExpiresAt,
                next_step: "Submit the application with this PDF, then call mark_applied with tailoring_id.",
              }),
            },
            {
              type: "resource",
              resource: { uri: url, mimeType: "application/pdf", blob: t.pdf.toString("base64") },
            },
          ],
        };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    "mark_applied",
    {
      title: "Mark as applied",
      description:
        "Call after the application was submitted with a tailored resume. Adds the job to the user's Tracker as Applied. " +
        "Safe to call twice for the same tailoring.",
      inputSchema: { tailoring_id: z.uuid().describe("The tailoring_id returned by tailor_resume.") },
    },
    async ({ tailoring_id }) => {
      try {
        const applicationId = await markApplied(createAdminClient(), caller, tailoring_id);
        return { content: [{ type: "text", text: JSON.stringify({ application_id: applicationId, status: "applied" }) }] };
      } catch (err) {
        return toolError(err);
      }
    },
  );

  return server;
}

function toolError(err: unknown) {
  if (!(err instanceof AgentError)) console.error("agent request failed:", err);
  const text = err instanceof AgentError ? err.message : "Something went wrong while tailoring. Try again.";
  return { isError: true, content: [{ type: "text" as const, text }] };
}
