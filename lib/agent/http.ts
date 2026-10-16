import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticate, type AgentCaller } from "./keys";
import { AgentError } from "./tailor-pdf";

// Shared plumbing for the agent routes: the API key check and error responses.

export function unauthorized() {
  return Response.json(
    { error: "Missing or invalid API key. Send 'Authorization: Bearer rdb_...' (create one on the Integrations page)." },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="resumedb"' } },
  );
}

export async function withCaller(request: Request, handle: (caller: AgentCaller) => Promise<Response>) {
  const caller = await authenticate(createAdminClient(), request);
  if (!caller) return unauthorized();
  try {
    return await handle(caller);
  } catch (err) {
    return errorResponse(err);
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AgentError) return Response.json({ error: err.message }, { status: err.status });
  // The failure is also logged in llm_runs when it came from the model.
  console.error("agent request failed:", err);
  return Response.json({ error: "Something went wrong while tailoring." }, { status: 502 });
}

// "Name - Resume.pdf", safe in a header (non-ASCII names go in filename*).
export function pdfResponse(pdf: Buffer, fileName: string, headers: Record<string, string> = {}) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}
