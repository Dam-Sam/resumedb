import { z } from "zod";
import { pdfResponse } from "@/lib/agent/http";
import { tailoringPdf } from "@/lib/agent/tailor-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

// The download link handed to agents (downloadUrl in lib/agent/tailor-pdf.tsx).
// Its random token is the access check, so an agent can pass the plain URL to a form or browser.
export async function GET(request: Request, ctx: RouteContext<"/api/agent/tailorings/[id]/pdf">) {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token");
  const file = z.uuid().safeParse(id).success && token ? await tailoringPdf(createAdminClient(), id, token) : null;
  if (!file) return Response.json({ error: "This download link is invalid or has expired." }, { status: 403 });
  return pdfResponse(file.pdf, file.fileName);
}
