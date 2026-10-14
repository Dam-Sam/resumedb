import { z } from "zod";

export const ITEM_TYPES = [
  "work",
  "volunteer",
  "research",
  "project",
  "open_source",
  "education",
  "certification",
  "license",
  "award",
  "publication",
  "language",
  "other",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const LINK_TYPES = ["github", "linkedin", "website", "portfolio", "other"] as const;

// What Claude returns when it reads a resume. Mirrors the profile tables.
export const ParsedResume = z.object({
  contact: z.object({
    full_name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
  }),
  links: z.array(z.object({ type: z.enum(LINK_TYPES), url: z.string() })),
  items: z.array(
    z.object({
      type: z.enum(ITEM_TYPES),
      title: z.string().describe("Job title, project name, degree, certification name..."),
      organization: z.string().nullable().describe("Employer, school, issuer, venue..."),
      location: z.string().nullable(),
      start_date: z.string().nullable().describe("YYYY-MM-DD; use the 1st of the month if only month/year is given"),
      end_date: z.string().nullable().describe("YYYY-MM-DD; null if current or not given"),
      is_current: z.boolean(),
      description: z.string().nullable().describe("A short non-bullet description, if the resume has one"),
      url: z.string().nullable(),
      field_of_study: z.string().nullable().describe("Education only"),
      gpa: z.string().nullable().describe("Education only"),
      bullets: z.array(z.string()).describe("Bullet points, copied word for word, in order"),
      skills: z.array(z.string()).describe("Skill names used in this item, matching names in the top-level skills list"),
    }),
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.string().nullable().describe('e.g. "Languages", "Frameworks", "Tools"'),
    }),
  ),
});
export type ParsedResume = z.infer<typeof ParsedResume>;

// What Claude returns when tailoring. It only ever points at profile IDs;
// the server builds the resume from the user's real rows (lib/ai/tailor.ts#assemble).
export const TailoringResult = z.object({
  keySummary: z.object({
    skills: z.array(z.string()).describe("Key skills and technologies the posting asks for"),
    experience: z.array(z.string()).describe("Key experience requirements"),
    culture: z.array(z.string()).describe("Culture, values and working-style signals"),
  }),
  summary: z.string().nullable().describe("Tailored summary, or null if not requested"),
  itemOrder: z.array(z.string()).describe("Every item id, most relevant to the posting first"),
  bulletRewrites: z.array(z.object({ bulletId: z.string(), rewrite: z.string() })),
  bulletOrder: z.array(z.string()).describe("Every bullet id, most relevant to the posting first"),
  droppedProjectIds: z
    .array(z.string())
    .describe("Project ids with no real relevance to the posting; they start hidden"),
  titleRewrites: z
    .array(z.object({ itemId: z.string(), title: z.string() }))
    .describe("Suggested role titles, only for roles whose own bullets support a better-aligned title; usually few or none"),
  skillOrder: z.array(z.string()).describe("Every skill id, most relevant to the posting first"),
  droppedSkillIds: z
    .array(z.string())
    .describe("Skill ids with no relevance to the posting; they start hidden"),
});
export type TailoringResult = z.infer<typeof TailoringResult>;
