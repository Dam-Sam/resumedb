---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. You can sign up, sign in, and sign out with email + password**
  Becomes usable: A running Next.js app with the static landing page, email/password sign-up (with confirmation email), sign-in, sign-out, and protected pages. Signed-out visitors on `/profile`, `/tailor`, or `/onboarding` are sent to `/sign-in`; new users land on `/onboarding`, returning users on `/tailor` (both placeholder pages for now).
  Why now: Every later behavior stores data per user, and RLS depends on a real signed-in session. It also forces the one-time Supabase setup (project, keys, migration) to happen first, before anything depends on it. Bootstrapping lives here.
  PRD ref: `prd.md > Landing Page`, `prd.md > Accounts`, `prd.md > States and Boundaries` (First use, Returning user)
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Components` (Auth and Routing, Landing Page), `spec.md > Data Model`, `spec.md > File Structure`
  Build: Scaffold Next.js + TypeScript + Tailwind with `create-next-app`; install the spec's dependencies; confirm `proxy.ts` vs `middleware.ts` for the installed Next.js version; write `supabase/migrations/0001_profile.sql` (learner's schema with the agreed changes and RLS on every table); add `lib/supabase/server.ts` and `client.ts`, `proxy.ts`, `/sign-up`, `/sign-in`, `/auth/callback`, `/auth/check-email` (with the Resend-confirmation button), `Nav` with Sign out, landing page, and placeholder `/onboarding` and `/tailor`; add `.env.example` and README setup steps.
  Verify (mechanical): `npm run build` passes with no type errors; `npm run dev` starts; `curl` shows `/` renders the steps, and `/tailor` while signed out redirects to `/sign-in`; the migration runs in Supabase without errors and every table shows RLS enabled.
  Learner check: Run `npm run dev`, open `http://localhost:3000`, sign up with your email, click the confirmation link, and confirm you land on the onboarding placeholder. Sign out, sign back in, and confirm you're sent on past the landing page.
  Commit: `Scaffold app with Supabase auth, landing page, and schema`

- [x] **2. You can upload your resume and see it saved as your profile**
  Becomes usable: On `/onboarding` you upload a PDF or .docx and write your background; Claude parses it, the rows are saved to your account, and `/profile` shows everything it found (read-only for now). The parse is logged in `llm_runs`. An unreadable file lands you on `/profile?unreadable=1` with the "couldn't read" message.
  Why now: It's the riskiest unfamiliar ground — text extraction on a server, Claude structured outputs, and writing many linked rows under RLS — and tailoring has nothing to work on without a saved profile.
  PRD ref: `prd.md > Onboarding`, `prd.md > Profile` (fields show up filled in, background under Personal Information), `prd.md > States and Boundaries` (Resume can't be read, AI working)
  Spec ref: `spec.md > Components` (Onboarding, Resume Parser, LLM Provider Layer), `spec.md > External Services and Dependencies` (Anthropic, Vercel), `spec.md > Data Model`
  Build: `lib/extract-text.ts` (unpdf, mammoth); `lib/llm/` (`types.ts`, `claude.ts`, `index.ts`, `log.ts`); `lib/ai/schemas.ts` (`ParsedResume`), `prompts.ts`, `parse-resume.ts`; `lib/profile/repository.ts` (`loadProfile`, `saveParsedProfile`); `POST /api/parse-resume`; the onboarding form with `LoadingBar`; a read-only `/profile` page rendering every section.
  Verify (mechanical): `npm run build` passes; a one-off script extracts text from a real resume PDF and .docx; posting a real resume to `/api/parse-resume` as a signed-in user returns success; Supabase shows the new `contact_info`, `profile_items`, `bullets`, `skills` rows and one `llm_runs` row with `purpose='parse'`; posting an image-only/empty file returns `{ unreadable: true }` with the background saved.
  Learner check: Sign up as a fresh user (or clear your rows), upload your own resume with a short background, and compare the Profile page against your real resume: is anything missing, merged wrong, or invented?
  Commit: `Parse uploaded resumes into a saved profile`

- [x] **3. You can tailor your resume to a posting and compare every bullet side by side**
  Becomes usable: On `/tailor` you enter company, job title, and description, choose whether to include a summary, and submit. After a loading bar you see the workspace: items reordered by relevance, skills ranked, each original bullet beside the AI's rewrite, starting on yours, with Keep mine / Use AI's and editing of the selected side. The key-summary panel and the optional editable summary are there. A failure shows an alert with Retry.
  Why now: This is the unique kernel — the diff view and the "nothing invented" ID check. It comes as soon as there's a profile to tailor, so the early hands-on checkpoint can shape everything after it.
  PRD ref: `prd.md > Starting a Tailoring`, `prd.md > AI Reordering`, `prd.md > Bullet Comparison` (rewrite beside each bullet, starts on original, switch, edit selected), `prd.md > Key Summary Panel`, `prd.md > Tailored Summary`, `prd.md > Tailoring Workspace layout`, `prd.md > States and Boundaries` (Missing tailoring input, AI working, AI fails, Leaving the workspace)
  Spec ref: `spec.md > Components` (Tailoring Form, Tailoring Engine, Tailoring Workspace), `spec.md > Look and Feel`, `spec.md > Important Failure Modes`
  Build: `lib/profile/serialize.ts`; `TailoringResult` schema and tailor prompt (`tailor-v1`); `lib/ai/tailor.ts` with `assemble()`; `lib/resume/types.ts`; `POST /api/tailor` (returns contact info and `profileBulletsByItem` alongside); `lib/resume/workspace-reducer.ts` (`select`, `edit`, `editSummary` now); `TailorForm`, `Workspace`, `BulletRow`, `KeySummaryPanel`, `SummaryEditor`, `ErrorAlert` in the spec's layout.
  Verify (mechanical): `npm run build` passes; a small script runs `assemble()` on a fake model response containing an unknown ID and a missing bullet, and shows the unknown ID dropped and the missing bullet appended; a real `/api/tailor` call with a real posting returns a `TailoredResume` whose every bullet ID exists in the profile, and one `llm_runs` row with `purpose='tailor'`; submitting with an empty field is blocked.
  Learner check: Paste a real job posting you'd apply to, with the summary on. Read the rewrites against your originals: are they the same real work, aimed at this job, with nothing invented? Flip a few to "Use AI's", edit one. Then open `llm_runs` in Supabase and compare Claude's raw response with what the workspace shows.
  Commit: `Add tailoring engine and side-by-side bullet workspace`

- [x] **4. You can remove, replace, and reorder to shape the tailored resume**
  Becomes usable: In the workspace you can remove a bullet, replace one with another bullet from the same item (or see "No other bullets for this item"), and drag sections in the table of contents to reorder the resume.
  Why now: These complete the "you decide what stays" control around the kernel, and they change the workspace state that downloads will read, so they land before export.
  PRD ref: `prd.md > Bullet Comparison` (Remove, Replace), `prd.md > Table of Contents`, `prd.md > States and Boundaries` (Replace with no alternatives)
  Spec ref: `spec.md > Components` (Tailoring Workspace: `ReplaceDialog`, `TableOfContents`)
  Build: Add `remove`, `replace`, `moveSection` to the reducer; `ReplaceDialog` from `profileBulletsByItem`; `TableOfContents` with dnd-kit.
  Verify (mechanical): `npm run build` passes; a script runs the reducer through remove, replace, and moveSection on a sample `TailoredResume` and prints the expected state; in the running app, a replaced bullet shows a single column and a section dragged in the TOC moves in the resume view.
  Learner check: Tailor again, remove a weak bullet, replace another with a different one from the same job, and drag Projects above Experience. Does the resume view match what you did?
  Commit: `Add remove, replace, and table-of-contents reordering`

- [x] **5. You can download the tailored resume as Word and PDF**
  Becomes usable: Word and PDF buttons produce `{FullName}_{Company}_{JobTitle}.docx` and `.pdf` that match the workspace: section order, selected/edited bullets, no removed bullets, summary only if chosen, styled from your `theme.js`.
  Why now: It completes the core journey end to end, and it depends on every workspace action already existing.
  PRD ref: `prd.md > Download`, `prd.md > The Core Journey` (step 8)
  Spec ref: `spec.md > Components` (Resume Export), `spec.md > Look and Feel` (Downloaded files)
  Build: `lib/resume/final.ts` (`buildFinalResume`), `theme.ts` and `docx.ts` ported from `resume-generator/theme.js` and `build.js`, `pdf.tsx` with `@react-pdf/renderer` loaded browser-only, `DownloadButtons`.
  Verify (mechanical): `npm run build` passes; a script runs `buildFinalResume` on a sample state with a removed bullet, an edited AI bullet, and a moved section, and confirms the output; a script renders that `FinalResume` to .docx and the text extracted back out (mammoth) matches; both downloads trigger in the running app.
  Learner check: Make a few choices, download both files, and open them. Do they match the screen and look like your existing resumes?
  Commit: `Export tailored resume to Word and PDF`

- [x] **6. You can fix your profile: edit, add, and remove anything**
  Becomes usable: Every field on `/profile` is editable and saves; you can add a section or entry, add/remove bullets and skills, and remove an entry. Changes survive sign-out. The unreadable-resume path now lets you enter everything by hand.
  Why now: The profile is already correct enough to tailor after slice 2; editing is the fallback and the polish, and it's mostly forms over tables already proven.
  PRD ref: `prd.md > Profile`, `prd.md > Accounts` (profile exactly as left), `prd.md > States and Boundaries` (Resume can't be read)
  Spec ref: `spec.md > Components` (Profile Editor), `spec.md > Data Model`
  Build: `app/profile/actions.ts` server actions through the repository; `ContactEditor`, `ItemEditor`, `BulletListEditor`, `SkillsEditor`, `AddSection` client components; unreadable banner.
  Verify (mechanical): `npm run build` passes; in the running app, edit a field, add an entry with a bullet, remove an entry, then reload and confirm the Supabase rows reflect each change.
  Learner check: Fix something the parser got wrong, add a project, remove an old entry, sign out and back in, and confirm it all stuck. Then tailor once more and see your fix show up.
  Commit: `Make the profile fully editable`

- [x] **7. You can sign in with Google, and confirmation emails come from Resend**
  Becomes usable: "Continue with Google" works on both sign-in and sign-up, and confirmation emails are delivered through Resend.
  Why now: Mostly dashboard setup (Google Cloud, Supabase, Resend) on top of an auth flow that already works; nothing else depends on it, so it goes last.
  PRD ref: `prd.md > Accounts`
  Spec ref: `spec.md > External Services and Dependencies` (Google OAuth, Resend, Supabase)
  Build: Add the Google button with `signInWithOAuth` (checked against the current Supabase guide); walk through Google Cloud OAuth client, Supabase Google provider, and Resend SMTP settings; update README.
  Verify (mechanical): `npm run build` passes; the Google button redirects to `accounts.google.com` with the Supabase callback; after the round trip, a session cookie is set and `/auth/callback` routes correctly; Supabase Auth logs show the confirmation email sent through custom SMTP.
  Learner check: Sign in with Google as a new user and confirm you land on onboarding; sign up a second email and confirm the confirmation email arrives from ResumeDB.
  Commit: `Add Google sign-in and Resend confirmation emails`

- [x] **8. Downloads save to your tracker**
  Becomes usable: The first Word or PDF download in a tailoring saves an application (company, role, job description, frozen resume) as Applied, dated today. Downloading again after edits overwrites the same application; New tailoring starts a new one. A **Tracker** tab lists every application with company, role, date applied and status.
  Why now: Saving is the heart of the tracker, and the table proves it end to end; the detail page needs saved applications to exist.
  PRD ref: `prd.md > Application Tracker` (first three criteria), `prd.md > States and Boundaries` (Leaving the workspace, Empty tracker, Tracker save fails)
  Spec ref: `spec.md > Components` (Application Tracker), `spec.md > Data Model`, `spec.md > File Structure`
  Build: `supabase/migrations/0003_tracker.sql` (`applications`, `application_events`, status-event trigger, RLS, grants) applied via MCP; `lib/applications/repository.ts`; `app/applications/actions.ts` (`saveApplication`); shared file builder for Word/PDF; `DownloadButtons` saves after building the file and keeps the application ID; `/applications` table page; Tracker nav link; `proxy.ts` protects `/applications`.
  Verify (mechanical): `npm run build` and lint pass; migration applies, both tables show RLS; an SQL impersonation test shows a user sees only their own applications and events, creating an application writes one `applied` event; in the browser (with `/api/tailor` stubbed), first download creates one row, a second download after an edit updates the same row's resume, and `/applications` lists it; signed-out `/applications` redirects to `/sign-in`.
  Learner check: Tailor to a posting, download Word, change a bullet, download PDF, then open Tracker: one row with the right company, role, today's date and Applied.
  Commit: `Save downloaded resumes to an application tracker`

- [x] **9. Application detail and status timeline**
  Becomes usable: Clicking a Tracker row opens the application: the job description, the frozen resume (read-only), Word/PDF re-download, and a status picker (Applied → Received → Screening → Interview → Offer / Rejected). Each change saves and adds a dated entry to the timeline; the table shows the new status.
  Why now: It builds on the saved applications from slice 8.
  PRD ref: `prd.md > Application Tracker` (last two criteria)
  Spec ref: `spec.md > Components` (Application Tracker), `spec.md > Data Model`
  Build: `/applications/[id]` server page; `setStatus` action; `StatusPicker`, `Timeline`, `FrozenResume`, re-download buttons reusing the shared file builder; rows on `/applications` link to it; unknown or someone else's ID shows not-found.
  Verify (mechanical): `npm run build` and lint pass; in the browser, changing the status twice adds two timeline entries in order and updates the table; SQL shows matching `application_events` rows; re-downloaded Word text (extracted with mammoth) matches the frozen resume; another user's application ID returns not-found.
  Learner check: Open the application from slice 8, move it to Received then Screening, check the timeline and the table, and re-download the PDF to confirm it's the resume you sent.
  Commit: `Add application detail with status timeline`

- [x] **10. Prompts live in Supabase, versioned, switchable without a redeploy**
  Becomes usable: The parse and tailor system prompts are read from a `prompts` table. You add a new version in the Supabase dashboard and switch with `select activate_prompt('tailor', 2)`; the next AI call uses it, no redeploy. Each `llm_runs` row records the exact prompt row used.
  Why now: The learner wants to iterate on the tailor prompt (bolder rewrites) without redeploying, and keep every version.
  PRD ref: `prd.md > Possible Later Enhancements` (Bolder, job-aimed rewrites, which this enables)
  Spec ref: `spec.md > Components` (Prompts (stored in Supabase), LLM Provider Layer), `spec.md > Data Model`
  Build: `supabase/migrations/0004_prompts.sql` (`prompts` table, one-active index, freeze trigger, `activate_prompt()`, read-only RLS, `llm_runs.prompt_id`, v1 seeds); `lib/ai/prompts.ts` (`getActivePrompt`); `lib/ai/messages.ts`; callers and `withRunLog` pass the prompt id and label; `lib/ai/prompts/` folder removed; README how-to.
  Verify (mechanical): build and lint pass; seeded text has the same md5 as the code prompts; rolled-back SQL test shows edits blocked, notes editable, activate/rollback switch exactly one live version, activating a missing version fails without changing anything, signed-in users can read but not insert or activate; `getActivePrompt` throws on no row / DB error (script with a stand-in client); a real `/api/tailor` call succeeds and its `llm_runs` row links to `tailor` v1 with label `tailor-v1`.
  Learner check: In the Supabase Table Editor, open `prompts` and find both v1 rows; tailor once and see the new `llm_runs` row's `prompt_id` / `prompt_version`.
  Commit: `Store prompts in Supabase with versions`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (the diff view with a real posting), feedback shapes slices 4–7. Done: learner tailored to a real Stripe posting with summary on, switched and edited bullets; "the rewrites look good", no changes requested
- [x] Tracker checkpoint — after slice 9, learner runs both learner checks for slices 8–9 and gives feedback. Done: learner ran the whole flow with a real application; worked properly, no changes requested
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

Final-review feedback:
- AI rewrites felt too close to the originals, making the feature seem redundant. Measured in `llm_runs`: 7–8 of 20 rewrites identical per run, the rest light grammar edits at ~1.0× length. Causes: `tailor-v1` prompt allows identical rewrites and stresses caution; it never says how to aim a bullet; the learner's bullets were already hand-tailored. Learner's target: reframe toward what the job values and the tools it asks for, including truthful "comparable to [posting tool]" bridges from a genuinely equivalent tool they used, with bridged bullets tagged in the diff view. **Decision: keep the current behavior for the PoC; deferred as a later enhancement.**

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Slice 1: RLS policies use `(select auth.uid())` and foreign keys on `profile_links`, `profile_summaries`, `item_skills` got indexes (Supabase performance guidance; no behavior change). `.env.example` renamed the key to `NEXT_PUBLIC_SUPABASE_ANON_KEY` to match the code and README. Migration applied to the Supabase project via MCP.
- Slice 2: uploads failed with "permission denied" — this Supabase project doesn't grant table privileges to signed-in users automatically, so RLS never got a chance to apply. Added `0002_grants.sql` (select/insert/update/delete to `authenticated` only; anon gets nothing), applied it, and confirmed one user can write their rows while another sees none. This also fixes slice 1's returning-user routing, which silently fell back to onboarding.
- Slice 5: tailored items now carry their skills so downloads get the italic tech-stack line from `build.js`. The PDF couldn't be rendered in a Node script (`@react-pdf` ships import-only exports `tsx` can't load), so the PDF was verified in the browser by the learner with real data instead; the Word file was verified by script (rendered, text extracted with mammoth, compared).
- Slice 7: also added a message on Sign in when `/auth/callback` fails (it previously redirected with `?error=link` silently). Resend uses the learner's own domain, already verified in their Resend account for another project, so no new DNS records were needed. The unreadable-resume path was never run end to end with a real upload (only its parts: blank-PDF detection, banner rendering); left for the final review.
- Tracker added after the PoC was working (learner request; PoC tagged `v1-poc` first). Scope, PRD and spec updated; slices 8–9 added. Learner choices: save on download, re-download overwrites the same application, frozen copy of what was downloaded, stages Applied → Received → Screening → Interview → Offer / Rejected, dated timeline without notes; cover letter, dashboard and email stay out. The deferred `jobs`/`resumes*` tables are replaced by `applications` (frozen `FinalResume` as JSON) and `application_events` (written by a trigger), agreed with the learner.
- Slice 8: `resumeFileName` now takes name/company/title so the tracker can name re-downloads from the frozen copy; Word/PDF generation moved to `lib/resume/files.tsx` to be shared. The application is saved only after the file is created. Verified with `/api/tailor` stubbed in the browser and downloads intercepted (no files written); two `TrackerTestCo` test applications were used for slice 9 testing, then deleted.
- Slice 9: the re-download check rebuilt the Word file from the stored `FinalResume` in a script (same `buildDocx` the browser uses) and compared its text, since browser downloads were intercepted rather than saved. The status picker keeps its own value while saving so it doesn't jump back.
- After slice 9 (learner request): prompts moved from `lib/ai/prompts.ts` into `lib/ai/prompts/`, one file per prompt (`parse.ts`, `tailor.ts`), each with its own `VERSION`, `SYSTEM` and `userMessage()`. Text checked byte-identical to the originals by script; versions unchanged.
- Then (learner request) each prompt became a folder with one file per version: `parse/v1.ts`, `tailor/v1.ts`, `tailor/v2.ts` (a copy of v1 labelled `tailor-v2`, for the learner to edit), and an `index.ts` per prompt that selects the live version (both still v1). Used versions are never edited, so old prompts stay runnable and `llm_runs` labels stay accurate.
- Slice 10 (learner request, replaces the per-file prompt versions): prompts moved into Supabase. Learner choices: system text only (user message stays in code), edited from the dashboard, readable by signed-in users, shared local/live database accepted, fail rather than fall back when no live prompt. `activate_prompt` switches in two statements inside one transaction (the one-active index is checked row by row, so a single `update ... set is_active = (version = n)` could fail). The deactivate-and-call test against the real database was blocked by the agent's permission policy (it would change shared data), so the missing-prompt path was verified with a stand-in client instead.
