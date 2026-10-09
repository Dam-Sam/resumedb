"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({ mode, notice }: { mode: "sign-in" | "sign-up"; notice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      // proxy.ts sends signed-in users on to onboarding or tailoring.
      router.push("/");
      router.refresh();
    }
  }

  // Sends you to Google, then back to /auth/callback, which signs you in.
  async function continueWithGoogle() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold">{isSignUp ? "Create your account" : "Sign in"}</h1>
      <button
        type="button"
        onClick={continueWithGoogle}
        className="mt-6 w-full rounded-md border border-gray-300 bg-white px-4 py-2"
      >
        Continue with Google
      </button>
      <p className="mt-6 text-center text-xs uppercase tracking-wide text-gray-400">or with email</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "…" : isSignUp ? "Sign up" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        {isSignUp ? (
          <>
            Already have an account? <Link href="/sign-in" className="underline">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/sign-up" className="underline">Create an account</Link>
          </>
        )}
      </p>
    </div>
  );
}
