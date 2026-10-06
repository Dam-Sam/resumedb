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
