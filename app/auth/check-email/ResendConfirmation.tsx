"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResendConfirmation({ email }: { email: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function resend() {
    setBusy(true);
    setStatus(null);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? error.message : "Sent. Check your inbox.");
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={resend}
        disabled={busy}
        className="rdb-btn rdb-btn--secondary"
      >
        {busy ? "Sending…" : "Resend confirmation email"}
      </button>
      {status && (
        <p
          className="rdb-save"
          role="status"
          style={{ margin: "12px 0 0", display: "flex" }}
        >
          {status}
        </p>
      )}
    </div>
  );
}
