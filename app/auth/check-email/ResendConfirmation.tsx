"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResendConfirmation({ email }: { email: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function resend() {
    setStatus("Sending…");
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? error.message : "Sent. Check your inbox.");
  }

  return (
    <div className="mt-6">
      <button onClick={resend} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm">
        Resend confirmation email
      </button>
      {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
    </div>
  );
}
