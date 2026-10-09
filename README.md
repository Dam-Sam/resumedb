# ResumeDB

Tailor your resume to a specific job posting. ResumeDB reorders your experience and skills by relevance and puts an AI rewrite beside every bullet, aimed at the job. You keep your own wording or take the AI's, bullet by bullet, then download the result as Word and PDF.

Built with Next.js, Supabase (accounts + Postgres), and Claude.

## Run it locally

Needs Node 20+.

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the keys (see below).
3. `npm run dev`, then open http://localhost:3000.

## One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **SQL Editor**: paste and run [`supabase/migrations/0001_profile.sql`](supabase/migrations/0001_profile.sql), then [`0002_grants.sql`](supabase/migrations/0002_grants.sql). The first creates the profile tables with Row Level Security, so each user can only read and write their own rows; the second gives signed-in users access to those tables (without it every query fails with "permission denied").
4. **Authentication → Sign In / Providers → Email**: leave **Confirm email** on.
5. **Authentication → URL Configuration**: set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the Redirect URLs (plus your deployed URL's `/auth/callback` later).

### Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com), create a project, then **APIs & Services → OAuth consent screen** (External, app name ResumeDB). While it's in Testing, add yourself under **Test users**.
2. **Credentials → Create credentials → OAuth client ID → Web application**. Authorized JavaScript origin: `http://localhost:3000`. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
3. In Supabase, **Authentication → Sign In / Providers → Google**: turn it on and paste the client ID and secret.

### Confirmation emails (Resend)

Supabase's built-in sender is for testing only, so confirmation emails go through [Resend](https://resend.com):

1. In Resend, verify a domain you own (**Domains → Add Domain**, then add the DNS records it shows at your registrar), and create an API key with sending access.
2. In Supabase, **Authentication → Emails → SMTP Settings**: enable custom SMTP with host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key, sender `no-reply@<your domain>`, sender name `ResumeDB`.

The Resend key and Google secret live only in those dashboards, never in `.env.local`.

## Environment variables

| Name | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (safe for the browser) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key (safe for the browser; RLS protects the data) |
| `ANTHROPIC_API_KEY` | Claude API key, server only |
| `LLM_PROVIDER` | `claude` |
| `LLM_MODEL` | Optional, defaults to `claude-opus-5-5` |
