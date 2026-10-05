---
doc: spec
status: approved
---

# ResumeDB — Technical Spec

## How This Works, In Plain Language

ResumeDB is one **Next.js** app. Some of its code runs in your browser: the pages, the drag-and-drop, and the side-by-side bullets. Some runs on a server: reading uploaded resumes, talking to Claude, and talking to the database. Vercel hosts both halves together.

- **Supabase** does two jobs. It handles accounts (email + password with a confirmation email, or "Continue with Google"), and it keeps your profile in a Postgres database. That's a set of linked tables, like a spreadsheet with rules. **Row Level Security (RLS)** is a rule inside the database that says "you can only read and write rows that belong to you."
- **The LLM layer** is a small "adapter." The rest of the app never calls Claude directly. It calls a `LLMProvider` interface: "here are instructions, here's the input, here's the JSON shape I expect back." `ClaudeProvider` is the only implementation today, and swapping in another model provider later means writing one new file.
- **Reading a resume:** the server pulls the plain text out of your PDF or Word file and asks the LLM to turn it into profile rows (jobs, projects, bullets, skills). It saves those rows to your account.
- **Tailoring:** the server loads your profile and leaves out your name, email, and phone. Each bullet gets labeled with its database ID, and the profile goes to the LLM along with the job posting. The LLM answers in a strict JSON shape covering:
  - the order of your items
  - a rewrite for each bullet ID
  - the order of your skills
  - the posting's key requirements
  - the optional tailored summary

  The server rejects any ID that isn't really yours. That's how "nothing invented" is enforced in code, not just in the prompt.
- **The workspace** lives only in your browser's memory. Your keep/AI/edit/remove/replace choices change that in-memory copy. When you leave the page, it's gone, as the PRD specifies.
- **Download:** the browser turns the in-memory tailored resume into a Word file (with the `docx` library, ported from your `build.js` and `theme.js`) and a PDF (with `@react-pdf/renderer`). Both are built from the same data, so they match the screen.
- **Every LLM call is logged** to an `llm_runs` table: the model, the prompt version, the raw response, the parsed result, any error, tokens, and timing. You can open Supabase and see exactly what Claude said.

Why this shape: one app with one deploy, and one outside service besides Claude. No saved tailoring yet, so no extra tables or sync logic. The heavy work happens in exactly two server routes, so when something goes wrong there are only two places to look.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Arrive:** you open `/`, a static page (no database). It links to Sign up / Sign in.
2. **Sign up / sign in:**
   - **Email + password:** `/sign-up` calls Supabase Auth, and Supabase emails a confirmation link. Clicking it opens `/auth/callback`, which exchanges the link's code for a session cookie.
   - **Google:** "Continue with Google" sends you to Google and back to `/auth/callback`, which does the same exchange.
   - **Routing after sign-in:** the callback checks whether you have a `contact_info` row. If you don't, it sends you to `/onboarding`. If you do, it sends you to `/tailor`.
3. **Onboard:** you pick a file and write your background. The browser posts both to `POST /api/parse-resume`. That route:
   1. extracts text from the PDF or Word file
   2. calls `llm.generateObject()` with the `ParsedResume` schema
   3. saves `contact_info`, `profile_links`, `profile_items`, `bullets`, `skills`, `item_skills`, and the background (`profile_summaries` with `kind = 'background'`)
   4. logs the call to `llm_runs`

   You're redirected to `/profile`. If no text could be extracted, or the LLM call failed, the route saves only the background, and `/profile?unreadable=1` shows the "couldn't read your resume" message with empty sections to fill in.
4. **Check the profile:** `/profile` loads your rows on the server and renders editable forms. Each save, add, or remove is a server action that writes to Supabase, and RLS guarantees you only touch your own rows.
5. **Start a tailoring:** on `/tailor` you fill in company, job title, and description, and tick "Include a tailored summary." Submitting calls `POST /api/tailor`. The page shows a loading bar while it waits.
6. **The server tailors:**
   1. `/api/tailor` loads your profile, serializes it (bullets keep their IDs, contact info is stripped, background included)
   2. calls `llm.generateObject()` with the `TailoringResult` schema
   3. validates every ID against your profile, then fills in anything missing (see **Tailoring Engine**)
   4. logs to `llm_runs`
   5. returns a `TailoredResume` object
7. **Review and make choices:** the same `/tailor` page switches to the workspace view. It holds the `TailoredResume` in React state (memory in the browser tab). Each bullet starts on `selected: 'original'`, and every click updates that state. The table of contents reorders `sections[]`.
8. **Download:** the Word and PDF buttons run `buildFinalResume(state)` to get the selected text with removed bullets dropped, then `renderDocx()` or `renderPdf()` in the browser, then trigger a file download. No server is involved.
9. **Come back:** your session cookie is checked by `proxy.ts` on every page. If you're signed in with a profile, `/` and `/sign-in` send you on to `/tailor`.

```
Browser ──upload──▶ /api/parse-resume ──text──▶ LLMProvider(Claude) ──JSON──▶ Supabase tables
Browser ──job─────▶ /api/tailor ◀──profile── Supabase
                      │ ──profile+job──▶ LLMProvider(Claude) ──JSON (IDs)──▶ validate
                      ▼
Browser (workspace state, in memory) ──▶ docx / react-pdf ──▶ downloaded files
```

## Stack

| Piece | Choice | Why |
|---|---|---|
| Language | TypeScript | Types catch shape mismatches between the LLM's JSON, the database, and the UI. |
| Framework | **Next.js** (App Router), with whatever version `create-next-app` installs | **Learner choice.** Pages and server routes live in one project, and it deploys to Vercel with almost no setup. Accepted tradeoff: you have to keep track of what runs in the browser and what runs on the server. Files with `"use client"` run in the browser; everything else runs on the server. — [docs](https://nextjs.org/docs) |
| Styling | Tailwind CSS (comes with `create-next-app`) | Plain placeholder UI, easy to throw away when the Claude Design version lands. — [docs](https://tailwindcss.com/docs) |
| Database + accounts | **Supabase** (Postgres + Auth), with `@supabase/supabase-js` and `@supabase/ssr` | **Learner choice** (from the PRD). — [Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs), [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) |
| LLM | **Claude** through `@anthropic-ai/sdk`, behind the app's own `LLMProvider` interface | **Learner choice:** abstract the calls, implement Claude only. Built by hand (not the Vercel AI SDK) so the request and response are fully visible. Model `claude-opus-5-5` by default, overridable with `LLM_MODEL`. — [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [models](https://platform.claude.com/docs/en/about-claude/models/overview) |
| Schemas | `zod` | One definition is used both to tell Claude the JSON shape (`zodOutputFormat`) and to validate what comes back. — [docs](https://zod.dev) |
| Resume text extraction | `unpdf` (PDF), `mammoth` (Word .docx) | Both run on a Vercel server without native binaries. Plain text keeps the LLM layer provider-neutral. — [unpdf](https://github.com/unjs/unpdf), [mammoth](https://github.com/mwilliamson/mammoth.js) |
| Word download | `docx` | **Learner choice:** reuse the approach and theme from `resume-generator/build.js` and `theme.js`. — [docs](https://docx.js.org) |
| PDF download | `@react-pdf/renderer` | **Learner choice:** a real one-click PDF. Accepted tradeoff: two renderers to keep visually close, styled from one shared theme. — [docs](https://react-pdf.org) |
| Drag and drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Sortable lists for the table of contents, maintained and accessible. — [docs](https://docs.dndkit.com) |
| Hosting | **Vercel** | **Learner choice** (from the PRD). — [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs) |
| Confirmation emails | **Resend**, plugged into Supabase Auth as its custom SMTP sender | **Learner choice.** Supabase's built-in sender is for testing only. Resend delivers the confirmation emails to anyone. No app code changes: it's configured in the Supabase dashboard. — [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |

**Verify early in the build** (from memory, not looked up this session):
- **Proxy file name:** Next.js 16 renamed `middleware.ts` to `proxy.ts`. Use whichever the installed version expects.
- **Google button:** check the exact `@supabase/ssr` cookie helpers and the `signInWithOAuth` call against the current Supabase Next.js guide.
- **Server packages:** confirm `unpdf` and `@react-pdf/renderer` install cleanly on the installed Next.js version. `@react-pdf/renderer` must be loaded browser-only, with a dynamic import.

## Where It Runs and How Someone Tries It

- **Locally:**
  - Needs Node 20+.
  - Run `npm install`, then copy `.env.example` → `.env.local` and fill in the keys below. Then `npm run dev` and open `http://localhost:3000`.
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for the browser)
  - `ANTHROPIC_API_KEY` (server only)
  - `LLM_PROVIDER=claude`
  - `LLM_MODEL=claude-opus-5-5` (optional)
- **One-time Supabase setup:**
  1. Create the project.
  2. Run `supabase/migrations/0001_profile.sql` in the SQL editor.
  3. Under Auth → Providers, leave **Confirm email** on and enable **Google** with a Google Cloud OAuth client ID and secret.
  4. Under Auth → SMTP Settings, enable custom SMTP with Resend (see **External Services → Resend**).
  5. Add `http://localhost:3000/auth/callback` and the Vercel URL's `/auth/callback` to the allowed redirect URLs.
- **Deploy (learner choice: Vercel):**
  1. Push to the public GitHub repo.
  2. Import it in Vercel and add the same environment variables.
  3. Deploy, then add the production `/auth/callback` URL to both Supabase and the Google OAuth client.
- **For submission:** record the demo with a real resume and a real posting, either locally or on the Vercel URL. Show the diff view and both downloads. The video and the public repo are required. The live URL is a bonus, not a replacement.

## Look and Feel
Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

- **Placeholder styling:** generic and clean, with Tailwind defaults: a neutral gray palette, the system font, plenty of whitespace. The real design comes later from Claude Design, so keep styling in components and avoid elaborate custom CSS.
- **Diff view:** must be legible.
  - Original on the left, AI rewrite on the right, in the same row.
  - The **selected** side gets a clear border and background tint, plus a "Selected" label. The other side is dimmed and read-only.
  - Use red/green tints like a Git diff only as a hint, never as the only signal.
- **Workspace layout (desktop-first):** table of contents in a narrow column on the far left, the two-column resume in the center, the key summary on the far right, and Word/PDF buttons pinned at the top.
- **Interface copy:** short and plain ("Keep mine", "Use AI's", "Replace", "Remove").
- **Downloaded files:** use your existing `theme.js` (fonts, sizes, colors, spacing) for both Word and PDF.

## Components

### Auth and Routing
- **Pages:** `/sign-up`, `/sign-in`, `/auth/callback`, `/auth/check-email`, plus `proxy.ts`.
- **Sign-up and sign-in:**
  - Sign-up is email + password, with confirmation **on**. After submitting, you see "Check your email."
  - Both pages have **Continue with Google**.
  - `/auth/callback` exchanges the code (from the email link or from Google) for a session. It routes to `/onboarding` if no `contact_info` row exists, otherwise to `/tailor`.
- **What `proxy.ts` does:**
  - refreshes the session cookie
  - sends signed-out visitors on `/profile`, `/tailor`, or `/onboarding` to `/sign-in`
  - sends signed-in users on `/` or `/sign-in` to `/tailor`
- **Sign out:** a nav button.

PRD ref: `prd.md > Accounts`, `prd.md > States and Boundaries` (First use, Returning user).

### Landing Page
`app/page.tsx` is a static list of steps that follows the core loop, plus Sign up / Sign in buttons. No data.
PRD ref: `prd.md > Landing Page`.

### Onboarding
`app/onboarding/page.tsx` has a file input (`.pdf`, `.docx`) and a background textarea. It posts `multipart/form-data` to `/api/parse-resume` and shows the loading bar until it's redirected.
- **Old `.doc` files are not supported.** Only `.docx` is accepted, and the message says to save the resume as .docx or PDF.

PRD ref: `prd.md > Onboarding`.

### Resume Parser (`POST /api/parse-resume`)
- **Text extraction:** `lib/extract-text.ts` uses `unpdf` for PDFs and `mammoth.extractRawText` for Word files. Under about 200 characters means the resume is unreadable.
- **Parsing:** `lib/ai/parse-resume.ts` sends the text to `llm.generateObject({ schema: ParsedResume })`. The schema covers contact info, links, items (type, title, organization, location, dates, is_current, bullets[], skill names[]), and skills (name, category).
- **Saving:** `lib/profile/repository.ts#saveParsedProfile` writes the rows in order: contact, links, items, bullets, skills (upsert on `(user_id, name)`), then `item_skills`. Background goes to `profile_summaries(kind='background')`.
- **Logging:** each run goes to `llm_runs` with `purpose='parse'`.
- **Unreadable resume or LLM failure:** saves only the background plus a `contact_info` row with an empty name, then returns `{ unreadable: true }`.

PRD ref: `prd.md > Onboarding`, `prd.md > States and Boundaries` (Resume can't be read).

### Profile Editor
`app/profile/page.tsx` is a server component that loads the profile. Client components below it do the editing:
- **Personal Information:** contact fields, links, and the background textarea.
- **Sections:** one section per item type that has entries (Experience = `work`, `volunteer`, `research`; Projects = `project`, `open_source`; Education; Certifications; and so on). Each entry has editable fields, an editable bullet list with add/remove, and a skills tag input.
- **Adding:** an "Add section" control picks an item type and creates the first entry. "Add entry" works within a section.
- **Removing:** deletes the item. Bullets and skill links go with it automatically (cascade).

Every change calls a server action in `app/profile/actions.ts`, and the server action writes through the repository. Saves happen when a field loses focus, or on an explicit Save per entry. `?unreadable=1` shows the "couldn't read" banner.
PRD ref: `prd.md > Profile`.

### Tailoring Form
The form view of `app/tailor/page.tsx`: company, job title, description (all required, validated before submit), and an "Include a tailored summary" checkbox. The inputs are kept in state so Retry can resend them.
PRD ref: `prd.md > Starting a Tailoring`, `prd.md > States and Boundaries` (Missing tailoring input).

### LLM Provider Layer
`lib/llm/`:
```ts
interface LLMProvider {
  name: string;
  generateObject<T>(req: {
    system: string;
    prompt: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<{ data: T; raw: string; model: string; inputTokens?: number; outputTokens?: number }>;
}
```
- **`claude.ts`:** uses `client.messages.parse()` with `output_config: { format: zodOutputFormat(schema) }`, adaptive thinking, and effort `medium`.
  - **Safeguard fallback:** Claude's safety filters sometimes block a harmless request by mistake. To recover, it enables Anthropic's server-side fallback: the beta `server-side-fallback-2026-07-01` with `fallbacks: "default"`.
  - **Refusals:** it checks `stop_reason` and treats `refusal` or `max_tokens` as errors.
- **`index.ts`:** `getLLM()` reads `LLM_PROVIDER` and returns the matching provider. Unknown names throw.
- **`log.ts`:** `withRunLog(purpose, fn)` writes the `llm_runs` row (success or failure, raw text, parsed JSON, tokens, latency, `prompt_version`, `profile_hash`).

PRD ref: supports `prd.md > AI Reordering`, `prd.md > Bullet Comparison`, `prd.md > Key Summary Panel`, `prd.md > Tailored Summary`.

### Tailoring Engine (`POST /api/tailor`)
**Input:** `{ company, jobTitle, jobDescription, includeSummary }`.

**Steps:**
1. **Load** the profile through the repository.
2. **Serialize** it with `lib/profile/serialize.ts`: items with `id`, type, title, org, and dates; bullets with `id` and text; skills with `id`, name, and category; plus the background. Name, email, phone, and links are **never** included.
3. **Prompt** with `lib/ai/prompts.ts` (`TAILOR_PROMPT_VERSION = 'tailor-v1'`):
   - rank items within each section by relevance
   - rewrite each bullet for the posting while describing the same real work, with no new numbers, tools, or claims
   - rank skills
   - extract the key requirements
   - write the summary from the background only if asked
4. **Call** `generateObject` with the `TailoringResult` schema:
   ```ts
   {
     keySummary: { skills: string[]; experience: string[]; culture: string[] },
     summary: string | null,
     itemOrder: string[],                                  // profile_items ids, most relevant first
     bulletRewrites: { bulletId: string; rewrite: string }[],
     skillOrder: string[]                                  // skills ids, most relevant first
   }
   ```
5. **Validate with `lib/ai/tailor.ts#assemble`:**
   - drop unknown IDs
   - append any items, skills, or bullets the model left out, in their original order (bullets without a rewrite show the original on both sides)
   - set `summary` to null if it wasn't requested
6. **Assemble** the `TailoredResume`: sections in the default order (Summary? → Experience → Projects → Skills → Education → others), items in the AI's order, each bullet as `{ id, original, ai, selected: 'original', edited: { original?, ai? }, removed: false }`.
7. **Return** it as JSON, logged to `llm_runs` with `purpose='tailor'`.

PRD ref: `prd.md > AI Reordering`, `prd.md > Bullet Comparison`, `prd.md > Tailored Summary`, `prd.md > Non-Goals` (inventing experience).

### Tailoring Workspace
The workspace view of `app/tailor/page.tsx` holds the `TailoredResume` in a `useReducer`. Every interaction is a reducer action: `select`, `edit`, `remove`, `replace`, `moveSection`, `editSummary`. It contains:
- **`BulletRow`:** two columns. The selected column is a textarea; the unselected one is read-only text. It has Keep mine / Use AI's buttons, Remove, and Replace.
- **`ReplaceDialog`:** lists every profile bullet for the same item (from `profileBulletsByItem`, sent along with the tailoring response) that isn't already shown. Picking one swaps it in with no AI rewrite (`ai = null`), so it has a single column showing the original. If there are no alternatives: "No other bullets for this item."
- **`TableOfContents`:** a sortable list (dnd-kit) of the sections currently in the resume. Dropping one dispatches `moveSection`.
- **`KeySummaryPanel`:** three lists from `keySummary`.
- **`SummaryEditor`:** a textarea at the top, shown only when `summary !== null`.
- **`LoadingBar` and `ErrorAlert`:** the alert has a **Retry** button that resends the saved form inputs.

There's no persistence: leaving the page drops the state, as the PRD intends.
PRD ref: `prd.md > Bullet Comparison`, `prd.md > Table of Contents`, `prd.md > Key Summary Panel`, `prd.md > Tailored Summary`, `prd.md > Tailoring Workspace layout`, `prd.md > States and Boundaries` (AI working, AI fails, Replace with no alternatives, Leaving the workspace).

### Resume Export
- **`lib/resume/final.ts#buildFinalResume(state, contact, links)`:** turns workspace state into a plain `FinalResume`:
  - sections in table-of-contents order
  - each bullet's selected text, with edits applied
  - removed bullets dropped
  - items with no bullets left still listed by title
  - the summary only if it isn't null
  - contact info is fetched once when the workspace loads (it's in the `/api/tailor` response, not sent to the LLM)
- **`lib/resume/theme.ts`:** ported from `resume-generator/theme.js`.
- **`lib/resume/docx.ts`:** the `FinalResume` becomes a `Document`, then `Packer.toBlob`, then a download. This is a port of `build.js` layout functions.
- **`lib/resume/pdf.tsx`:** the same `FinalResume` becomes a `@react-pdf/renderer` `<Document>`, then `pdf().toBlob()`, then a download. Loaded with a dynamic import, browser-only.
- **File names:** `{FullName}_{Company}_{JobTitle}.docx` and `.pdf`.

PRD ref: `prd.md > Download`.

## Data Model

The migration lives in `supabase/migrations/0001_profile.sql`. It's the learner's schema with these agreed changes:

- **Profile tables kept as written:** `contact_info`, `profile_links`, `profile_items`, `bullets`, `skills`, `item_skills`, `bullet_skills` (`bullet_skills` is created but unused in the PoC).
- **`profile_summaries` modified** (learner choice: store the background here):
  - add `kind text not null default 'summary' check (kind in ('summary','background'))`
  - add `created_at` and `updated_at` (the existing trigger needs `updated_at`, and without it every update would fail)
  - add a partial unique index `on profile_summaries (user_id) where kind = 'background'`, so each user has one background
- **`llm_runs` kept**, without the `job_id` and `resume_id` columns and their foreign keys (those tables don't exist yet). `purpose` is `'parse'` or `'tailor'`.
- **Deferred to the tracker:** `jobs`, `resumes`, `resume_sections`, `resume_entries`, `resume_entry_bullets`, and `resume_skills` are not created. A later migration adds them.
- **RLS is enabled on every table:**
  - Tables with `user_id`: a policy `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
  - `bullets` and `item_skills`: a policy checking `exists (select 1 from profile_items i where i.id = item_id and i.user_id = auth.uid())`.
  - `bullet_skills`: checks through `bullets`, then `profile_items`.
  - Server code uses the **signed-in user's** Supabase client (never the service key), so RLS applies everywhere.
- **Ordering:** profile items are ordered by `start_date desc nulls last`. Bullets are ordered by `created_at` (inserted in resume order during parsing).

| Data | Where it lives | How it's updated | Leave and come back |
|---|---|---|---|
| Account / session | Supabase Auth + a cookie | Sign up / in / out | Still signed in until sign-out or expiry |
| Profile (contact, links, items, bullets, skills, background) | Supabase tables | Parser at onboarding; server actions on `/profile` | Exactly as left |
| LLM logs | `llm_runs` | Appended on every parse and tailor call | Kept, visible in Supabase |
| Tailoring form inputs | React state on `/tailor` | Typing | Gone |
| Workspace (`TailoredResume`) | React state on `/tailor` | Reducer actions | Gone, by design |
| Downloaded files | Your computer | Download buttons | Yours |

## File Structure

```
resumedb/
├── app/
│   ├── layout.tsx                 # Shell + top nav (Profile, Tailoring, Sign out when signed in)
│   ├── page.tsx                   # Landing page (static steps)
│   ├── sign-in/page.tsx           # Email/password + Continue with Google
│   ├── sign-up/page.tsx           # Email/password sign-up + Continue with Google
│   ├── auth/
│   │   ├── callback/route.ts      # Exchanges email-link / Google code for a session, routes onward
│   │   └── check-email/page.tsx   # "Confirm your email" notice
│   ├── onboarding/page.tsx        # Upload + background → /api/parse-resume
│   ├── profile/
│   │   ├── page.tsx               # Loads profile (server), renders editors
│   │   └── actions.ts             # Server actions: update/add/remove contact, items, bullets, skills, background
│   ├── tailor/page.tsx            # "use client": form view ⇄ workspace view
│   └── api/
│       ├── parse-resume/route.ts  # Extract text → LLM → save profile
│       └── tailor/route.ts        # Load profile → LLM → validate → TailoredResume
├── components/
│   ├── Nav.tsx
│   ├── LoadingBar.tsx
│   ├── ErrorAlert.tsx             # Message + Retry
│   ├── profile/                   # ContactEditor, ItemEditor, BulletListEditor, SkillsEditor, AddSection
│   └── tailor/                    # TailorForm, Workspace, BulletRow, ReplaceDialog,
│                                  # TableOfContents, KeySummaryPanel, SummaryEditor, DownloadButtons
├── lib/
│   ├── supabase/
│   │   ├── server.ts              # Supabase client for server code (cookie-based, RLS applies)
│   │   └── client.ts              # Supabase client for the browser (auth buttons)
│   ├── llm/
│   │   ├── types.ts               # LLMProvider interface
│   │   ├── claude.ts              # ClaudeProvider (the only implementation for now)
│   │   ├── index.ts               # getLLM() picks provider from LLM_PROVIDER
│   │   └── log.ts                 # withRunLog → llm_runs
│   ├── ai/
│   │   ├── schemas.ts             # zod: ParsedResume, TailoringResult
│   │   ├── prompts.ts             # Prompt text + version strings
│   │   ├── parse-resume.ts        # text → ParsedResume
│   │   └── tailor.ts              # profile + job → TailoringResult → assemble() → TailoredResume
│   ├── profile/
│   │   ├── repository.ts          # All profile reads/writes (incl. saveParsedProfile)
│   │   └── serialize.ts           # Profile → LLM-safe text (IDs kept, contact stripped)
│   ├── resume/
│   │   ├── types.ts               # TailoredResume, FinalResume
│   │   ├── workspace-reducer.ts   # select / edit / remove / replace / moveSection / editSummary
│   │   ├── final.ts               # buildFinalResume()
│   │   ├── theme.ts               # Ported from resume-generator/theme.js
│   │   ├── docx.ts                # FinalResume → .docx
│   │   └── pdf.tsx                # FinalResume → .pdf
│   └── extract-text.ts            # PDF (unpdf) / Word (mammoth) → plain text
├── proxy.ts                       # Session refresh + route protection (middleware.ts on older Next)
├── supabase/migrations/0001_profile.sql   # Schema + RLS
├── .env.example
├── package.json
├── README.md                      # Setup, env vars, how to run
└── devpost/                       # Devpost learning workspace
```

## External Services and Dependencies

### Supabase
- **Calls:**
  - `auth.signUp({ email, password, options: { emailRedirectTo: <origin>/auth/callback } })`
  - `auth.signInWithPassword`
  - `auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
  - `auth.exchangeCodeForSession(code)`
  - `auth.signOut`
  - table reads and writes through `from('<table>')`
- **Keys:** the project URL and anon key (public). RLS is the security boundary, so no service-role key is needed.
- **Cost:** the free tier is enough. Free projects pause after inactivity, so wake the project before recording.
- **Docs:** [Next.js SSR auth](https://supabase.com/docs/guides/auth/server-side/nextjs), [Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- **Email confirmation:** sent through Resend (below), not Supabase's built-in test sender.

### Resend (confirmation emails)
- **How it connects:** Supabase sends its auth emails through Resend's SMTP server. The app never calls Resend directly.
- **Settings:**
  - host `smtp.resend.com`
  - port `465`
  - username `resend`
  - password = a Resend API key with "sending access"
  - sender address `no-reply@<your verified domain>`, sender name `ResumeDB`
- **⚠ Domain required:** to send to *any* address, Resend needs a domain you own, verified with DNS records (SPF/DKIM) that you add at your domain registrar. Without one, Resend's test address only delivers to your own Resend account email. That's fine for recording the demo yourself, but not for others signing up. Check this early.
- **Cost:** the free tier allows about 3,000 emails a month and 100 a day (from memory; verify on [resend.com/pricing](https://resend.com/pricing)).
- **Supabase's own limit:** Supabase still applies its own auth-email rate limit, adjustable under Auth → Rate Limits once custom SMTP is on.
- **Key storage:** the Resend API key lives only in Supabase's settings, not in `.env.local` or Vercel.
- **Docs:** [Send with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp), [Domains](https://resend.com/docs/dashboard/domains/introduction).

### Google OAuth
- **Setup:** a Google Cloud project with an OAuth consent screen and a Web client ID and secret. The authorized redirect URI is Supabase's `https://<project>.supabase.co/auth/v1/callback`. The ID and secret are pasted into Supabase, not into the app.
- **Testing mode:** while the consent screen is in "Testing", only listed test users can sign in. Add yourself.

### Anthropic (Claude)
- **Call:** `client.messages.parse({ model, max_tokens: 16000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium', format: zodOutputFormat(schema) }, system, messages: [{ role: 'user', content: prompt }] })`. Fallback: `betas: ['server-side-fallback-2026-07-01']`, `fallbacks: 'default'`. Response: `parsed_output` (typed), `usage.input_tokens` / `output_tokens`, `stop_reason`.
- **Key:** `ANTHROPIC_API_KEY`, server only.
- **Cost:** `claude-opus-5-5` costs $4 per million input tokens and $20 per million output tokens. One tailoring (around 3–6k tokens in, 3–5k out) is roughly 10 cents. Set `LLM_MODEL=claude-sonnet-5-5` ($2/$10) to halve that if quality holds.
- **Docs:** [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking), [errors](https://platform.claude.com/docs/en/api/errors), [TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript).

### Vercel
- Hosting for the whole Next.js app. The free Hobby plan is enough.
- **Upload size:** request bodies to server routes are capped at about 4.5 MB, which is fine for resumes. The upload rejects files over 4 MB with a message.
- **Timeouts:** an LLM call can take 20–60 s, so set `export const maxDuration = 120` on both API routes.

## Important Failure Modes

- **Claude is slow or fails** (timeout, 429/5xx, refusal, schema mismatch) → the loading bar stays up while waiting. A failure shows `ErrorAlert`, "Something went wrong while tailoring," with **Retry**, which resends the same inputs. The error is logged in `llm_runs`.
- **The resume can't be read** (scanned PDF with no text, very unusual layout, LLM failure during parsing) → you land on `/profile` with "We couldn't read your resume — please enter your information" and empty sections. Your background is still saved.
- **The LLM references something that isn't yours, or skips something** → `assemble()` drops unknown IDs and appends missing items and bullets in their original order. The workspace is always complete and only ever shows your real bullets.
- **The confirmation email never arrives** (unverified Resend domain, spam folder, or a rate limit) → the "Check your email" page says to check spam and offers a **Resend confirmation email** button (`auth.resend({ type: 'signup', email })`). It also notes that Google sign-in is an alternative.

## What Was Simplified and Why

- **The workspace lives in browser memory** instead of being saved to `resumes*` tables. The PRD says tailorings aren't saved, and the tracker will add those tables later.
- **The AI returns IDs and rewrites, and the server assembles the resume** instead of having the AI write the whole resume. That keeps the output grounded and makes the diff possible, because every rewrite maps to exactly one real bullet.
- **Text extraction before the LLM** instead of sending PDF files to Claude directly. This keeps `LLMProvider` text-only, so any future provider works. The cost is that scanned or image-only PDFs aren't supported; they fall back to manual entry.
- **One combined tailoring call** instead of separate calls for reordering, rewrites, key summary, and summary. One loading bar, one retry, one log row. If quality suffers on long resumes, splitting it is a contained change inside `lib/ai/tailor.ts`.
- **Both downloads are generated in the browser** instead of on a server. The data is already in the browser, and there's no server conversion step to break.
- **No transaction around the onboarding inserts.** These are sequential inserts that only run once per user. If one fails midway, you fix the rest on the Profile tab. The fuller version would be a Postgres function called with `rpc`.
- **Old `.doc` files are not supported**, only `.docx` and PDF.

## Decisions and Open Issues

**Learner decisions (this session):**
- **Framework:** Next.js + TypeScript.
- **Schema:** the learner's own. Profile tables now, `llm_runs` kept for inspecting AI output, `jobs` and `resumes*` deferred.
- **Background:** stored in `profile_summaries` with a `kind` column.
- **LLM:** abstracted behind `LLMProvider`, with Claude as the only implementation.
- **Downloads:** Word via `docx` (reusing `build.js` / `theme.js`), PDF via `@react-pdf/renderer`.
- **Sign-up:** email + password with **confirmation on**, plus **Google sign-in**. This adds to `prd.md > Accounts`.
- **Confirmation emails:** sent by **Resend** as Supabase's custom SMTP sender.
- **Hosting:** Vercel, with Supabase for the database and accounts (carried from the PRD).

**Implementation details derived from those** (agent's, open to change):
- Claude settings: model `claude-opus-5-5` by default (overridable with `LLM_MODEL`), adaptive thinking, effort `medium`, and the server-side refusal fallback turned on.
- Tooling: `unpdf` and `mammoth` for text extraction, dnd-kit for drag-and-drop, Tailwind for placeholder styling.
- Fixes: the `updated_at` fix on `profile_summaries` and RLS on every table.
- How it's assembled: one combined tailoring call, with ID-based validation of its output.

**One useful unknown:** your stated goal is "understanding the outputs better." The concrete question here is how you can tell whether the AI's output is trustworthy, beyond eyeballing it. What clarifies it:
1. Claude can only answer in a schema of IDs and rewrites.
2. `assemble()` refuses IDs that aren't yours.
3. Every raw response sits in `llm_runs` next to its parsed version.

During the build, the first tailoring step should include opening `llm_runs` in Supabase and comparing the raw response with what the workspace shows. If another part of the plan feels less clear to you, that's a better candidate to note here.

**Open, check early in the build:**
- **Resend domain:** do you have a domain to verify in Resend? Without one, confirmation emails reach only your own address. That's enough for the demo, but not for other people signing up.
- **Proxy file name:** confirm `proxy.ts` vs `middleware.ts` for the installed Next.js version.
- **Profile summaries:** does the parser also extract an existing summary from your resume into `profile_summaries(kind='summary')`? The current plan is no (the PRD doesn't show one on the Profile tab). The tailored summary is generated fresh each time.
- No open questions carried from `prd.md > Open Questions`.
