// The user message for each AI call: the plumbing that carries the resume or
// posting. The instructions themselves are in the `prompts` table.

export function parseMessage(resumeText: string) {
  return `Here is the resume text:\n\n<resume>\n${resumeText}\n</resume>`;
}

export function tailorMessage(input: {
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
