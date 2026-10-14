import type { Status } from "@/lib/applications/repository";

// One email, as every provider hands it to the pipeline. Only the plain-text
// body is used, and it's never stored.
export interface IncomingEmail {
  provider: "gmail" | "outlook" | "manual";
  providerMessageId: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  receivedAt: string; // ISO timestamp
  text: string;
}

// An application that an email can still move forward (not Offer or Rejected).
export interface OpenApplication {
  id: string;
  company: string;
  job_title: string;
  status: Status;
}
