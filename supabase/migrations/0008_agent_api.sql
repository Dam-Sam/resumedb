-- Agent access: an AI agent (Claude, Muse, ...) calls ResumeDB over MCP or REST
-- with a personal API key, gets a tailored PDF back, and confirms when it has
-- actually applied, which is what puts the job on the Tracker.
-- Run once in the Supabase SQL editor, after 0007.

begin;

-- Only a SHA-256 of each key is stored; the key itself is shown once, at creation.
create table api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  prefix        text not null,           -- "rdb_Ab3xYz9…", so the user can tell keys apart
  key_hash      text not null unique,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on api_keys (user_id, created_at);

-- One row per resume an agent asked for. Becomes an application only when the
-- agent says it applied (application_id), so abandoned jobs stay off the Tracker.
create table agent_tailorings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  api_key_id       uuid references api_keys(id) on delete set null,
  company          text not null,
  job_title        text not null,
  job_description  text not null,
  resume           jsonb not null,       -- the FinalResume in the PDF
  application_id   uuid references applications(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index on agent_tailorings (user_id, created_at desc);
create index on agent_tailorings (api_key_id);
create index on agent_tailorings (application_id);

alter table api_keys         enable row level security;
alter table agent_tailorings enable row level security;

-- Keys are created and revoked (deleted) from the Integrations page as the signed-in user.
create policy own_rows on api_keys for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on agent_tailorings for select to authenticated
  using (user_id = (select auth.uid()));

-- The hash is never read back by the signed-in user.
grant select (id, user_id, name, prefix, last_used_at, created_at), insert, delete on api_keys to authenticated;
grant select on agent_tailorings to authenticated;

-- Agent requests carry no Supabase session: they run through the service-role
-- client (lib/supabase/admin.ts), scoped by the key's user_id in code.
grant select, update (last_used_at) on api_keys to service_role;
grant select, insert, update on agent_tailorings to service_role;
grant select on
  contact_info, profile_links, profile_summaries, profile_items,
  bullets, skills, item_skills, prompts
to service_role;
-- delete: only to undo a duplicate when two "applied" calls race (lib/agent/tailor-pdf.tsx).
grant insert, delete on applications to service_role;

commit;
