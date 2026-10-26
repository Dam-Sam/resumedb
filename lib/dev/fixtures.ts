import type { ParsedResume } from "@/lib/ai/schemas";
import { assemble } from "@/lib/ai/tailor";
import type { Profile } from "@/lib/profile/repository";
import type { TailorInput, TailorResponse } from "@/lib/resume/types";

// One made-up person, used two ways: written to the database for the
// "populated" dev user, and shaped like a tailor response for /dev/workspace.

export const DEV_INPUT: TailorInput = {
  company: "Northwind",
  jobTitle: "Backend Engineer",
  jobDescription:
    "We're hiring a backend engineer to own our payments APIs. You'll design Postgres schemas, build TypeScript services, and keep latency low under load. Experience with queues, observability and mentoring is a plus.",
  includeSummary: true,
};

export const DEV_PARSED: ParsedResume = {
  contact: { full_name: "Avery Chen", email: "avery.chen@example.com", phone: "555-0142", location: "Toronto, ON" },
  links: [
    { type: "github", url: "https://github.com/averychen" },
    { type: "linkedin", url: "https://linkedin.com/in/averychen" },
  ],
  items: [
    {
      type: "work", title: "Software Engineer", organization: "Lumen Payments", location: "Toronto, ON",
      start_date: "2023-06-01", end_date: null, is_current: true, description: null, url: null, field_of_study: null, gpa: null,
      bullets: [
        "Built a ledger service in TypeScript and Postgres that settles 40k transactions a day.",
        "Cut p95 API latency from 420ms to 90ms by adding read replicas and query caching.",
        "Introduced a job queue for payouts, removing a nightly batch that took three hours.",
        "Mentored two interns through their first production releases.",
        "Wrote the on-call runbook used by the whole platform team.",
      ],
      skills: ["TypeScript", "PostgreSQL", "Redis"],
    },
    {
      type: "work", title: "Junior Developer", organization: "Brightside Labs", location: "Waterloo, ON",
      start_date: "2021-05-01", end_date: "2023-04-01", is_current: false, description: null, url: null, field_of_study: null, gpa: null,
      bullets: [
        "Maintained a Django REST API used by 12 retail clients.",
        "Added integration tests that caught regressions before each weekly release.",
        "Moved deploys from hand-run scripts to a CI pipeline.",
      ],
      skills: ["Python", "Docker"],
    },
    {
      type: "project", title: "Tracebook", organization: null, location: null,
      start_date: "2024-01-01", end_date: "2024-04-01", is_current: false, description: null, url: "https://github.com/averychen/tracebook", field_of_study: null, gpa: null,
      bullets: [
        "Open-source request tracer for Express apps, with 300 GitHub stars.",
        "Stores spans in SQLite and renders a flame graph in the browser.",
      ],
      skills: ["TypeScript", "SQLite"],
    },
    {
      type: "project", title: "Trail Weather Bot", organization: null, location: null,
      start_date: "2022-07-01", end_date: "2022-08-01", is_current: false, description: null, url: null, field_of_study: null, gpa: null,
      bullets: ["Discord bot that posts the weekend forecast for hiking trails near Waterloo."],
      skills: ["Python"],
    },
    {
      type: "education", title: "B.Sc. Computer Science", organization: "University of Waterloo", location: "Waterloo, ON",
      start_date: "2017-09-01", end_date: "2021-04-01", is_current: false, description: null, url: null, field_of_study: "Computer Science", gpa: "3.7",
      bullets: [],
      skills: [],
    },
    {
      type: "certification", title: "AWS Certified Developer – Associate", organization: "Amazon Web Services", location: null,
      start_date: "2024-03-01", end_date: null, is_current: false, description: null, url: null, field_of_study: null, gpa: null,
      bullets: [],
      skills: [],
    },
  ],
  skills: [
    { name: "TypeScript", category: "Languages" },
    { name: "Python", category: "Languages" },
    { name: "PostgreSQL", category: "Databases" },
    { name: "Redis", category: "Databases" },
    { name: "SQLite", category: "Databases" },
    { name: "Docker", category: "Tools" },
  ],
};

// The profile as the database would hand it back, with made-up ids.
const profile: Profile = {
  contact: DEV_PARSED.contact,
  links: DEV_PARSED.links.map((l, i) => ({ id: `link-${i}`, ...l })),
  background: null,
  items: DEV_PARSED.items.map((it, i) => ({
    id: `item-${i}`,
    type: it.type,
    title: it.title,
    organization: it.organization,
    location: it.location,
    start_date: it.start_date,
    end_date: it.end_date,
    is_current: it.is_current,
    description: it.description,
    details: {},
    bullets: it.bullets.map((body, j) => ({ id: `bullet-${i}-${j}`, body })),
    skills: it.skills,
  })),
  skills: DEV_PARSED.skills.map((s, i) => ({ id: `skill-${i}`, ...s })),
};

// A hand-written model answer: some bullets rewritten, one title suggested,
// a project dropped, a skill hidden. Bullets without a rewrite show the original on both sides.
export function devTailorResponse(input: TailorInput = DEV_INPUT): TailorResponse {
  const resume = assemble(
    profile,
    {
      keySummary: {
        skills: ["TypeScript", "PostgreSQL", "Queues", "Observability"],
        experience: ["Owns production APIs", "Schema design", "Latency and reliability work"],
        culture: ["Mentoring", "Writes things down"],
      },
      summary:
        "Backend engineer with three years building payment services in TypeScript and Postgres, focused on reliability and low latency.",
      itemOrder: ["item-0", "item-2", "item-1", "item-3", "item-4", "item-5"],
      bulletRewrites: [
        { bulletId: "bullet-0-0", rewrite: "Designed and built the payments ledger in TypeScript and Postgres, settling 40k transactions a day." },
        { bulletId: "bullet-0-1", rewrite: "Reduced p95 API latency 79% (420ms to 90ms) with read replicas and query caching." },
        { bulletId: "bullet-0-2", rewrite: "Replaced a three-hour nightly payout batch with a queue-based job system." },
        { bulletId: "bullet-2-0", rewrite: "Built and maintain Tracebook, an open-source request tracer for Express (300 stars)." },
      ],
      bulletOrder: profile.items.flatMap((i) => i.bullets.map((b) => b.id)),
      droppedProjectIds: ["item-3"],
      titleRewrites: [{ itemId: "item-0", title: "Backend Software Engineer" }],
      skillOrder: ["skill-0", "skill-2", "skill-3", "skill-5", "skill-1", "skill-4"],
      droppedSkillIds: ["skill-4"],
    },
    input,
  );
  return {
    resume,
    profileBulletsByItem: Object.fromEntries(profile.items.map((i) => [i.id, i.bullets])),
  };
}
