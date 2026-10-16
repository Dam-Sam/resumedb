import { z } from "zod";
import { withCaller } from "@/lib/agent/http";
import { markApplied } from "@/lib/agent/tailor-pdf";
import { createAdminClient } from "@/lib/supabase/admin";

// The agent submitted the application: add it to the Tracker as Applied.
export async function POST(request: Request, ctx: RouteContext<"/api/agent/tailorings/[id]/applied">) {
  return withCaller(request, async (caller) => {
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success) return Response.json({ error: "No tailored resume with that id." }, { status: 404 });
    const applicationId = await markApplied(createAdminClient(), caller, id);
    return Response.json({ application_id: applicationId, status: "applied" });
  });
}
