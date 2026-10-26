"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthForm({
  mode,
  notice,
}: {
  mode: "sign-in" | "sign-up";
  notice?: string;
}) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
    <div className="au-wrap">
      <div className="au rdb-section">
        <h1 className="rdb-h1" style={{ fontSize: 28 }}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        {error && (
          <div
            role="alert"
            className="rdb-notice rdb-notice--error"
            style={{ marginTop: 16 }}
          >
            <div>{error}</div>
          </div>
        )}
        <button
          type="button"
          onClick={continueWithGoogle}
          className="rdb-btn rdb-btn--secondary au-google"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
            />
            <path
              fill="#34A853"
              d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
            />
            <path
              fill="#FBBC05"
              d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"
            />
            <path
              fill="#EA4335"
              d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"
            />
          </svg>
          Continue with Google
        </button>
        <div className="au-or">
          <span>or with email</span>
        </div>
        <form onSubmit={onSubmit}>
          <label className="rdb-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="rdb-input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label
            className="rdb-label"
            htmlFor="password"
            style={{ marginTop: 16 }}
          >
            Password
          </label>
          <input
            id="password"
            className="rdb-input"
            type="password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="rdb-help" style={{ marginTop: 6 }}>
            At least 6 characters.
          </span>
          <button disabled={busy} className="rdb-btn rdb-btn--primary au-full">
            {isSignUp
              ? busy
                ? "Creating account…"
                : "Create account"
              : busy
                ? "Signing in…"
                : "Sign in"}
          </button>
        </form>
        <p className="rdb-small rdb-muted" style={{ margin: "20px 0 0" }}>
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/sign-in" className="rdb-link">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/sign-up" className="rdb-link">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
