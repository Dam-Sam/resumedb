---
doc: scope
status: approved
---

# ResumeDB

Tailors your resume to a job posting by marketing you to that job, with every AI change shown next to your original so you decide what stays.

## The Unique Kernel
Most tailoring tools just list your experience back. ResumeDB **markets the user to the job they want**, and it stays **grounded in their real experience**. Each AI-reframed bullet sits beside the original, the way a changed file looks in a Git diff, and the user keeps their version or the AI's, bullet by bullet. The learner's bet: "when everyone can tailor their resume automatically, the people with the right personality and culture fit will win." So the app also turns the user's own background into a culture-fit summary aimed at the posting.

## Who It's For
Anyone looking for a job, of any type and in any location, who has a generic resume and wants to send a version targeted at a specific posting without inventing anything or giving up control.

## The Core Loop
1. (Once) Onboarding: upload a resume (PDF or Word). It gets parsed into a profile, and the user adds a short personal background.
2. Paste a job posting.
3. The AI reorders the resume: most relevant projects first, skills and technologies sorted by relevance.
4. Beside each bullet, an AI rewrite aimed at the posting. The user picks **mine** or **AI's** for each one, diff-style.
5. Optionally turn on a culture-fit summary at the top, written from their background.
6. Download the tailored resume.

They come back for every new job they apply to; the profile is already there.

## Inspiration & Identity
- Git diff / changed-file comparison view: side-by-side original vs. rewrite, accept per change.

## Why This Matters to the Learner
They want to "get better at using agents and understanding the outputs better." This project puts an AI's output right next to the human's version and asks the human to judge it, which mirrors that learning goal.

## What "Working" Looks Like
The user starts with their own generic resume, goes through the app with a job posting, and the app "spits out a tailored resume that's reordered and reworded to target the job posting."

**The "oh, that's cool" beat:** the diff view. Original bullets on one side, job-targeted rewrites on the other, the user clicking through choices, then downloading the result.

## The POC Boundary
- Resume upload (PDF or Word) with automatic parsing into a profile
- Profile fields limited to what appears on a resume (name, location, contact, experience, projects, skills, etc.)
- Short background blurb collected at onboarding
- Paste a job description
- AI reordering of projects and skills by relevance
- Side-by-side bullet rewrites with a per-bullet keep-mine / keep-AI's choice
- Toggle for a culture-fit summary at the top of the resume
- Download the tailored resume as Word and PDF
- Application tracker (added after the PoC worked): every download saves the application (company, role, date applied, status, job description, a frozen copy of the resume), with a dated status timeline

## Later
- Cover letter generation (uses the same background info)
- Dashboard (counts by stage, ribbon chart)
- Manual drag-and-drop reordering of sections, plus a draggable table of contents
- Extracted job-posting key details/skills panel

## Explicitly Cut
- **Email integration / auto status updates:** needs email OAuth and message classification. That's a separate product and far beyond 2–4 hours.
- **Non-resume profile fields (desired pay, etc.):** they don't affect tailoring.
