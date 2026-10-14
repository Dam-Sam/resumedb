import type { IncomingEmail, OpenApplication } from "./types";

// Which tracker applications could this email be about? Plain string matching,
// no model: most emails match nothing and stop here. Jev only ever chooses
// between the few applications that pass.

// Applicant tracking systems that send on a company's behalf. Their sender
// domain says nothing about the company, so the company has to be named instead.
const ATS_DOMAINS = [
  "greenhouse.io",
  "greenhouse-mail.io",
  "lever.co",
  "myworkday.com",
  "myworkdayjobs.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "icims.com",
  "jobvite.com",
  "workable.com",
  "bamboohr.com",
  "successfactors.com",
  "taleo.net",
  "recruitee.com",
  "teamtailor.com",
  "rippling.com",
  "gem.com",
  "linkedin.com",
];

// Legal suffixes that companies drop in their domains and emails.
const SUFFIXES = new Set(["inc", "llc", "ltd", "limited", "corp", "corporation", "co", "company", "plc", "gmbh", "ag", "sa", "group", "holdings"]);

// Only this much of the body is searched; the company is named near the top.
const BODY_SEARCH_CHARS = 3000;

// Jev picks among at most this many. Fewer options, fewer wrong picks.
export const MAX_CANDIDATES = 5;

export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// "Stripe, Inc." → ["stripe"]; "Manulife Financial Corp" → ["manulife", "financial"].
export function companyWords(company: string): string[] {
  const words = normalize(company).split(" ").filter(Boolean);
  const kept = words.filter((w) => !SUFFIXES.has(w));
  return kept.length ? kept : words;
}

function senderDomain(address: string): string {
  return address.toLowerCase().split("@")[1]?.trim() ?? "";
}

export function isAtsSender(address: string): boolean {
  const domain = senderDomain(address);
  return ATS_DOMAINS.some((d) => domain === d || domain.endsWith("." + d));
}

// Subdomains that say nothing about the company ("mail" would otherwise match Mailchimp).
const GENERIC_LABELS = new Set(["www", "mail", "email", "e", "em", "careers", "jobs", "talent", "recruiting", "hr", "hire", "notifications", "noreply", "news", "info", "team", "apply"]);

// careers.stripe.com matches Stripe; manulife.ca matches Manulife Financial.
function domainMatches(address: string, words: string[]): boolean {
  if (isAtsSender(address)) return false;
  const joined = words.join("");
  const labels = senderDomain(address)
    .split(".")
    .slice(0, -1) // drop the TLD
    .filter((label) => !GENERIC_LABELS.has(label));
  return labels.some((label) => label === joined || (label.length >= 4 && joined.startsWith(label)));
}

// The company's name appears as whole words ("Box" doesn't match "inbox").
function mentions(haystack: string, words: string[]): boolean {
  return ` ${haystack} `.includes(` ${words.join(" ")} `);
}

export interface Candidate extends OpenApplication {
  // Why it matched, strongest first: the sender's domain, the sender name or subject, the body.
  matchedBy: "domain" | "header" | "body";
}

export function findCandidates(email: IncomingEmail, applications: OpenApplication[]): Candidate[] {
  const header = normalize(`${email.fromName ?? ""} ${email.subject}`);
  const body = normalize(email.text.slice(0, BODY_SEARCH_CHARS));
  const rank = { domain: 0, header: 1, body: 2 } as const;

  const matched: Candidate[] = [];
  for (const app of applications) {
    const words = companyWords(app.company);
    if (!words.length) continue;
    const matchedBy = domainMatches(email.fromAddress, words)
      ? "domain"
      : mentions(header, words)
        ? "header"
        : mentions(body, words)
          ? "body"
          : null;
    if (matchedBy) matched.push({ ...app, matchedBy });
  }
  return matched.sort((a, b) => rank[a.matchedBy] - rank[b.matchedBy]).slice(0, MAX_CANDIDATES);
}
