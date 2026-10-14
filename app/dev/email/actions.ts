"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { processEmail, type ProcessResult } from "@/lib/email/process";
import { createClient } from "@/lib/supabase/server";

const Input = z.object({
  fromAddress: z.email(),
  fromName: z.string().trim(),
  subject: z.string().trim(),
  text: z.string().trim().min(1),
  apply: z.enum(["dry", "apply"]),
});

export interface TestState {
  result?: ProcessResult;
  error?: string;
}

// Runs a pasted email through the real pipeline. A dry run only asks Jev;
// "apply" records the email and changes the status exactly as a live inbox would.
export async function testEmail(_prev: TestState, formData: FormData): Promise<TestState> {
  if (process.env.NODE_ENV === "production") return { error: "Not available." };

  const parsed = Input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "A valid sender address and a body are required." };
  const { apply, fromName, ...email } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  try {
    const result = await processEmail(
      supabase,
      user.id,
      {
        provider: "manual",
        providerMessageId: crypto.randomUUID(),
        fromName: fromName || null,
        receivedAt: new Date().toISOString(),
        ...email,
      },
      { dryRun: apply === "dry" },
    );
    if (apply === "apply") refresh();
    return { result };
  } catch (err) {
    console.error("testEmail failed:", err);
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
