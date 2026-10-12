import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinalResume } from "@/lib/resume/final";

// Every tracker read and write goes through here, with the signed-in user's
// client, so Row Level Security limits it to their own applications.

export const STATUSES = ["applied", "received", "screening", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  applied: "Applied",
  received: "Received",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export interface ApplicationRow {
  id: string;
  company: string;
  job_title: string;
  status: Status;
  applied_at: string;
}

export interface Application extends ApplicationRow {
  job_description: string;
  resume: FinalResume;
  events: { id: string; status: Status; created_at: string }[];
}

export interface NewApplication {
  company: string;
  job_title: string;
  job_description: string;
  resume: FinalResume;
}

// Starts as Applied; the database trigger adds the first timeline entry.
export async function createApplication(supabase: SupabaseClient, userId: string, app: NewApplication) {
  const { data, error } = await supabase
    .from("applications")
    .insert({ user_id: userId, ...app })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// A later download from the same tailoring replaces the frozen copy.
export async function overwriteResume(supabase: SupabaseClient, id: string, resume: FinalResume) {
  const { data, error } = await supabase.from("applications").update({ resume }).eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw new Error("application not found");
}

export async function listApplications(supabase: SupabaseClient, userId: string): Promise<ApplicationRow[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, company, job_title, status, applied_at")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getApplication(supabase: SupabaseClient, id: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from("applications")
    .select("id, company, job_title, status, applied_at, job_description, resume, events:application_events(id, status, created_at)")
    .eq("id", id)
    .order("created_at", { referencedTable: "application_events" })
    .maybeSingle();
  if (error) throw error;
  return data as Application | null;
}

// The trigger records the change on the timeline.
export async function setStatus(supabase: SupabaseClient, id: string, status: Status) {
  const { data, error } = await supabase.from("applications").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw new Error("application not found");
}
