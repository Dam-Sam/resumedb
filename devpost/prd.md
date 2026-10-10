---
doc: prd
status: approved
---

# ResumeDB — Product Requirements

ResumeDB tailors your resume to a specific job posting. It markets you to that job while staying grounded in your real experience, and it shows every AI rewrite next to your original so you decide what stays. It's for anyone job hunting who has a generic resume.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrive.** A visitor lands on a page that explains how ResumeDB works, step by step, following the core loop.
2. **Sign up / sign in.** They create an account or sign in. Their data is stored with their account.
3. **Onboard (first time only).** They upload their resume (PDF or Word) and write a short personal background.
4. **Check the profile.** They land on the **Profile** tab with everything from their resume already filled in. They can fix any field and add or remove sections. Their background appears under Personal Information.
5. **Start a tailoring.** On the **Tailoring** tab they enter the company name and job title, paste the job description, and choose whether the AI should also write a tailored summary. Then they submit.
6. **Review in the workspace.** They see their resume reordered by the AI, with the most relevant experience and projects first and skills sorted by relevance. Every bullet has the AI's rewrite beside it. A table of contents shows the section order, and a key-summary panel shows what the posting is asking for.
7. **Make choices.** For each bullet they keep their own wording or take the AI's, edit whichever one is selected, remove the bullet, or replace it with another bullet from the same job or project. They can drag sections in the table of contents to reorder the resume.
8. **Download.** They download the tailored resume as Word and PDF.
9. **Come back.** On their next visit they sign in, and their profile is already there. They go straight to step 5 for the next job.

**Success:** a user starts from their own generic resume, goes through the steps with a real job posting, and downloads a resume that is reordered and reworded for that posting, with only the changes they chose.

## Screens and Layout

| Screen | What's on it | How you get there |
|---|---|---|
| **Landing Page** | Step-by-step explanation of how the app works, following the core loop, with a sign-up / sign-in entry point | First visit / signed out |
| **Sign In / Sign Up** | Account creation and sign-in | From the landing page |
| **Onboarding** | Resume upload (PDF or Word) and a background text box | Right after a first sign-up |
| **Profile tab** | The full editable profile: personal info (with background blurb), experience, projects, skills, etc. | After onboarding; from the main navigation |
| **Tailoring tab** | Form for company name, job title and job description, plus a "Include a tailored summary" choice | From the main navigation |
| **Tailoring Workspace** | Table of contents, the resume with side-by-side bullets, key-summary panel, download buttons | After submitting the Tailoring form |

Signed-in users move between **Profile** and **Tailoring** using the main navigation.

### Tailoring Workspace layout
- **Center / main area, left column:** the user's resume in the AI's order, showing their original bullets.
- **Center / main area, right column:** the AI's rewrite beside each original bullet.
- **Table of contents, far left:** a compact list of the resume's sections in their current order, which can be dragged to reorder.
- **Key Summary panel, far right:** the key skills, experience and culture requirements extracted from the job description.
- **Download:** Word and PDF buttons.

## Look and Feel
- Use a **generic, clean placeholder UI** for now. The learner will design the real frontend in Claude Design and connect it later.
- **Every component listed in this PRD must exist and work.** Only the visual styling is temporary.
- Keep the diff-style comparison legible: original vs. AI rewrite side by side, with the selected version clearly marked (`scope.md > Inspiration & Identity`).

## Features and Behavior

### Landing Page
Explains the app in steps that mirror the core loop (upload, profile, paste job, reorder, compare bullets, summary, download).
- [ ] A signed-out visitor sees the step-by-step explanation and a clear way to sign up or sign in.
- A static step-by-step page. Click-through animations are out of scope for the PoC.

### Accounts
- [ ] A user can create an account with email + password (confirmed by email) or with their Google account, sign out, and sign back in. (Added by learner decision in `4-spec`.)
- [ ] After signing back in, their profile is exactly as they left it.
- [ ] A user only ever sees their own profile.

### Onboarding
Source: `scope.md > The POC Boundary`.
- [ ] The user can upload a PDF or Word resume.
- [ ] The user can write a short personal background.
- [ ] After a successful upload they land on the Profile tab with fields filled from their resume.

### Profile
Holds only resume-type information plus the background blurb. The exact fields come from the learner's database schema, which will be provided in `4-spec`.
- [ ] Fields parsed from the resume (name, location, contact, experience, projects, skills, etc.) show up filled in.
- [ ] The background blurb shows under **Personal Information**.
- [ ] The user can edit any field, add a section or entry, and remove one. Changes are still there after signing out and back in.

### Starting a Tailoring
- [ ] The Tailoring tab has inputs for company name, job title and job description (pasted text).
- [ ] The user chooses **before submitting** whether the AI should write a tailored summary.
- [ ] Submitting takes the user to the Tailoring Workspace.

### AI Reordering
Source: `scope.md > The Core Loop` step 3.
- [ ] Experience and projects appear with the most relevant ones to the posting first.
- [ ] Skills and technologies are ordered by relevance to the posting.

### Bullet Comparison (the diff view)
Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop` step 4. This is the "oh, that's cool" beat.
- [ ] Every original bullet has an AI rewrite directly beside it, aimed at the posting and describing the same real work, with nothing invented.
- [ ] Each bullet starts with the **original** selected.
- [ ] The user can switch any bullet between **original** and **AI's**. The selection is clearly visible.
- [ ] Only the **selected** version is editable, and edits stay put.
- [ ] **Remove:** the user can remove a bullet from the tailored resume.
- [ ] **Replace:** clicking replace opens a popup listing all the bullets from the user's profile for that same experience or project item. Picking one swaps it in.

### Table of Contents
Moved in from `scope.md > Later` by learner decision.
- [ ] Shows the sections that are in the current tailored resume, in order.
- [ ] Dragging a section to a new position reorders that section in the resume view.

### Key Summary Panel
Moved in from `scope.md > Later` by learner decision.
- [ ] Shows the key skills, experience requirements and culture requirements pulled from the pasted job description.

### Tailored Summary
Source: `scope.md > The Core Loop` step 5, `scope.md > The Unique Kernel` (culture-fit bet).
- [ ] If chosen before submitting, a summary written from the user's background and aimed at the posting appears at the top of the resume.
- [ ] If not chosen, no summary appears.
- [ ] The summary is editable text in the workspace.

### Download
Source: `scope.md > The Core Loop` step 6.
- [ ] The user can download the tailored resume as **Word** and as **PDF**.
- [ ] The downloaded file matches the workspace: section order, the selected/edited bullets, no removed bullets, and the summary only if it was chosen.

## States and Boundaries
- **First use:** a new account goes through Onboarding before anything else.
- **Returning user:** signs in, lands on the Tailoring tab, and finds the profile already saved; doesn't onboard again.
- **Resume can't be read** (scanned image, unusual layout): the user sees a message that the resume couldn't be read and is taken to the Profile tab to enter their information manually.
- **Missing tailoring input:** the form can't be submitted without company name, job title and job description.
- **Replace with no alternatives:** if that item has no other bullets, the popup says so.
- **Leaving the workspace:** tailoring work isn't saved. Once you leave, it's gone, except for whatever you downloaded. Saving tailored versions belongs to the future tracker.
- **AI working:** while the AI is processing (reordering, rewriting, extracting the key summary), the user sees a loading bar.
- **AI fails:** the user sees an alert saying something went wrong, with a **Retry** button that runs the tailoring again with the same inputs.

## Product Decisions
- **People sign in, and their profile is stored with their account.** The point is that returning users don't re-onboard ("the profile is already there").
- **The tools are already chosen: Supabase for the database and Vercel for hosting.** This is recorded for `4-spec`, not decided here.
- **The learner supplies the database schema** in `4-spec`.
- **The UI is generic for now.** The real design comes from Claude Design later; every component must still be present.
- **Bullets start on the user's original wording.** The user opts in to AI changes rather than out.
- **Only the selected version of a bullet is editable.** One clear source of truth per bullet.
- **The user chooses the summary before the AI runs**, not after.
- **Replacements come from the user's own profile bullets** for the same item, which keeps things grounded in real experience.
- **The table of contents with drag-and-drop and the key-summary panel are in.** Both were moved in from `scope.md > Later`. The learner judged them essential, accepting a bigger build.
- **An editable profile (add/remove sections) is in.** This also covers the fallback when a resume can't be read.
- **The landing page stays, but static.** Click-through animations are cut from the PoC.
- **AI waits show a loading bar, and failures show an alert with Retry.** The user is never left guessing.
- **The layout and state assumptions were confirmed by the learner:** table of contents on the far left, editable summary, returning users land on Tailoring, all three tailoring fields required, workspace not saved.

## What We're Building
- Static landing page explaining the steps
- Sign up / sign in, with each user's data saved
- Onboarding: PDF/Word upload and background blurb
- Profile tab: parsed, fully editable, add/remove sections; manual entry fallback
- Tailoring tab: company, job title, job description, summary choice
- Tailoring Workspace: AI reordering, side-by-side bullet rewrites with keep/AI/edit/remove/replace, draggable table of contents, key-summary panel, optional tailored summary
- Download as Word and PDF

## Deferred From the POC
- **Saving tailored versions / the application tracker.** The learner wants tailored versions saved in a tracker later. For now the downloaded file is the only record.
- **Real visual design.** It comes from Claude Design after the PoC works.
- **Landing page animations.** A static steps page proves the idea; the animations are polish.

## Possible Later Enhancements
- **Bolder, job-aimed rewrites (from final review).** Rewrites lead with what the posting values and use its vocabulary; where the posting requires a tool the user hasn't used, a rewrite may bridge from a genuinely equivalent tool they did use ("Talend, comparable to Informatica"), never claiming the posting's tool, with bridged bullets tagged in the comparison view.
- **Cover letter generation** using the same background info.
- **Application tracker** with company, role, date, status, timeline and the resume used.
- **Dashboard** with counts by stage and a ribbon chart.

## Non-Goals
- **Email integration / automatic status updates.** It needs email OAuth and message classification, which makes it a separate product (`scope.md > Explicitly Cut`).
- **Non-resume profile fields** such as desired pay. They don't affect tailoring (`scope.md > Explicitly Cut`).
- **Inventing experience.** The AI reframes real bullets and never makes up new accomplishments.

## Open Questions
None. All product questions are resolved.
