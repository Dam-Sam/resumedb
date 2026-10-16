-- Download links for an agent's PDF carry a random per-tailoring token instead
-- of an HMAC signature, so there's no signing secret to configure.
-- Run once in the Supabase SQL editor, after 0008.

begin;

alter table agent_tailorings
  add column download_token      text not null,
  add column download_expires_at timestamptz not null;

commit;
