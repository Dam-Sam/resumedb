// Prompt text lives here. Bump the version string whenever the wording changes,
// so llm_runs shows which prompt produced which output.

export const PARSE_PROMPT_VERSION = "parse-v1";

export const PARSE_SYSTEM = `You turn the plain text of a resume into structured profile data.

Rules:
- Only record what the resume actually says. Never invent, embellish, or infer facts that aren't written.
- Copy every bullet point word for word, in its original order, under the entry it belongs to. Fix only broken line-wrapping from text extraction.
- One item per job, project, degree, certification, award, publication, or language. Pick the closest type:
  work, volunteer, research, project, open_source, education, certification, license, award, publication, language, other.
- Dates as YYYY-MM-DD. If only a month and year are given, use the 1st of the month; if only a year, use January 1st. Use null when there is no date.
  If an entry says "Present" or "Current", set is_current to true and end_date to null.
- Put every skill listed anywhere on the resume in the top-level skills list exactly once, with a category if the resume groups them.
  On each item, list the skills that item clearly used, using the same names.
- Links: GitHub, LinkedIn, personal website or portfolio URLs from the header.
- Use null for anything the resume doesn't give.`;

export function parsePrompt(resumeText: string) {
  return `Here is the resume text:\n\n<resume>\n${resumeText}\n</resume>`;
}

export const TAILOR_PROMPT_VERSION = "tailor-v1";

// ---------------------------------------------------------------------------
// Your own tailoring instructions. Write them between the backticks; they're
// added to the end of TAILOR_SYSTEM below under "Additional instructions".
// Leave it empty to use TAILOR_SYSTEM unchanged.
// When you change this, bump TAILOR_PROMPT_VERSION (e.g. "tailor-v2") so
// llm_runs shows which runs used your new wording.
// ---------------------------------------------------------------------------
export const TAILOR_EXTRA_INSTRUCTIONS = `
`;

const TAILOR_BASE = `You tailor a person's resume to one job posting. You market them to the job while staying strictly grounded in what they actually did.

You get their profile: items (jobs, projects, education...) with IDs, each item's bullets with IDs, their skills with IDs, and a short background they wrote about themselves. Then you get the posting.

Return:
1. keySummary: what the posting is really asking for, as short phrases: key skills/technologies, experience requirements, and culture/values/working-style signals.
2. itemOrder: every item ID, most relevant to this posting first. Relevance means how well the work demonstrates what the posting asks for.
3. bulletRewrites: one rewrite for every bullet ID. Each rewrite:
   - describes the same real work as the original. Reframe and re-emphasize toward what the posting values, using its vocabulary where it honestly applies.
   - never adds numbers, metrics, tools, technologies, team sizes, outcomes or claims that aren't in the original bullet or its item. If the original has a number, keep it exact.
   - stays one resume bullet: starts with a strong verb, no first person, about the same length as the original or shorter.
   - may be identical to the original if it is already well aimed.
4. skillOrder: every skill ID, most relevant to this posting first.
5. summary: only when asked. 2–3 sentences in the first-person-implied resume style (no "I"), written from their background and real experience, aimed at this role and the culture signals in the posting. It may only use facts from the profile. When not asked, null.

Use only IDs that appear in the profile. Copy them exactly.`;

export const TAILOR_SYSTEM = TAILOR_EXTRA_INSTRUCTIONS.trim()
  ? `${TAILOR_BASE}\n\nAdditional instructions:\n${TAILOR_EXTRA_INSTRUCTIONS.trim()}`
  : TAILOR_BASE;

export function tailorPrompt(input: {
  profileText: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  includeSummary: boolean;
}) {
  return `<profile>
${input.profileText}
</profile>

<posting>
Company: ${input.company}
Job title: ${input.jobTitle}

${input.jobDescription}
</posting>

Write a tailored summary: ${input.includeSummary ? "yes" : "no (return null)"}.`;
}
