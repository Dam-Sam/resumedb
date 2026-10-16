import { pdfResponse, withCaller } from "@/lib/agent/http";
import { downloadUrl, tailorPdf, TailorRequest, toTailorInput } from "@/lib/agent/tailor-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

// Tailoring, plus a few PDF renders to fit one page.
export const maxDuration = 300;

// REST for agents: posting in, tailored PDF out. The tailoring's id comes back
// in X-Tailoring-Id; POST /api/agent/tailorings/{id}/applied once submitted.
export async function POST(request: Request) {
  return withCaller(request, async (caller) => {
    const body = TailorRequest.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return Response.json(
        { error: "Send JSON with company, job_title and job_description (strings), and optionally include_summary (boolean)." },
        { status: 400 },
      );
    }
    const t = await tailorPdf(createAdminClient(), caller, toTailorInput(body.data));
    return pdfResponse(t.pdf, t.fileName, {
      "X-Tailoring-Id": t.id,
      "X-Download-Url": downloadUrl(new URL(request.url).origin, t),
      "X-Download-Expires": t.downloadExpiresAt,
    });
  });
}
