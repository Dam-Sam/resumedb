import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client with the service-role key: it skips Row Level Security.
// Only for work that runs with nobody signed in (email webhooks, cron), and
// every query through it must filter by user_id itself.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
