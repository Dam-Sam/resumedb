-- ResumeDB profile schema (Supabase / PostgreSQL)
-- The learner's schema, with the changes agreed in devpost/spec.md > Data Model:
--   * profile_summaries gains `kind`, created_at/updated_at, and one background per user
--   * llm_runs drops job_id / resume_id (those tables come with the tracker)
--   * jobs, resumes, resume_sections, resume_entries, resume_entry_bullets,
--     resume_skills are deferred to a later migration
--   * Row Level Security on every table
-- Run once in the Supabase SQL editor.

begin;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile library: everything the user has ever done
-- ---------------------------------------------------------------------------

-- Singleton. Attached at render time; NOT sent to the LLM.
create table contact_info (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text,
  phone      text,
  location   text,
  updated_at timestamptz not null default now()
);

-- GitHub, LinkedIn, portfolio, etc. Many per user.
create table profile_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in (
               'github', 'linkedin', 'website', 'portfolio', 'other')),
  url        text not null
);
create index on profile_links (user_id);

-- Professional summaries, plus the user's personal background (kind = 'background').
create table profile_summaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'summary' check (kind in ('summary', 'background')),
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profile_summaries_one_background
  on profile_summaries (user_id) where kind = 'background';
create index on profile_summaries (user_id);

-- Shared parent for every "thing the user did".
-- Common columns are real columns; shape-specific extras live in `details`.
create table profile_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in (
                  'work', 'volunteer', 'research',
                  'project', 'open_source',
                  'education',
                  'certification', 'license',
                  'award',
                  'publication', 'language', 'other')),
  title         text not null,           -- job title, project name, degree, cert name...
  organization  text,                    -- employer, school, issuer, venue...
  location      text,
  start_date    date,
  end_date      date,
  is_current    boolean not null default false,
  description   text,
  -- Type-specific extras, validated in application code. Examples:
  --   project:       {"url": "...", "tech": ["TypeScript", "Postgres"]}
  --   education:     {"field": "Computer Science", "gpa": "3.8", "honours": true}
  --   certification: {"credential_id": "...", "expires": "2028-01-01", "url": "..."}
  --   language:      {"level": "fluent"}
  details       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index on profile_items (user_id, type);

-- Accomplishments under an item (work, volunteer, project, research, ...).
create table bullets (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references profile_items(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on bullets (item_id);

-- Skills are normalized so they can be grouped, deduplicated, and matched
-- against job postings.
create table skills (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  name      text not null,
  category  text,                          -- "Languages", "Databases", "Tools"...
  unique (user_id, name)
);

create table item_skills (
  item_id   uuid not null references profile_items(id) on delete cascade,
  skill_id  uuid not null references skills(id) on delete cascade,
  primary key (item_id, skill_id)
);
create index on item_skills (skill_id);

-- Created now, unused in the PoC.
create table bullet_skills (
  bullet_id uuid not null references bullets(id) on delete cascade,
  skill_id  uuid not null references skills(id) on delete cascade,
  primary key (bullet_id, skill_id)
);
create index on bullet_skills (skill_id);

-- ---------------------------------------------------------------------------
-- LLM runs: every parse and tailor call, raw and parsed
-- ---------------------------------------------------------------------------

create table llm_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  purpose          text not null default 'tailor' check (purpose in ('parse', 'tailor')),
  model            text not null,
  prompt_version   text not null,        -- version of the prompt template
  profile_hash     text not null,        -- hash of the exact serialized input sent
  status           text not null default 'pending'
                   check (status in ('pending', 'succeeded', 'failed', 'rejected')),
  raw_response     text,                 -- exactly what the model returned
  parsed_response  jsonb,                -- validated result
  error            text,                 -- parse/validation failure detail
  input_tokens     integer,
  output_tokens    integer,
  latency_ms       integer,
  created_at       timestamptz not null default now()
);
create index on llm_runs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger trg_contact_updated    before update on contact_info      for each row execute function set_updated_at();
create trigger trg_summaries_updated  before update on profile_summaries for each row execute function set_updated_at();
create trigger trg_items_updated      before update on profile_items     for each row execute function set_updated_at();
create trigger trg_bullets_updated    before update on bullets           for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: you can only read and write rows that belong to you
-- ---------------------------------------------------------------------------

alter table contact_info      enable row level security;
alter table profile_links     enable row level security;
alter table profile_summaries enable row level security;
alter table profile_items     enable row level security;
alter table bullets           enable row level security;
alter table skills            enable row level security;
alter table item_skills       enable row level security;
alter table bullet_skills     enable row level security;
alter table llm_runs          enable row level security;

create policy own_rows on contact_info      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on profile_links     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on profile_summaries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on profile_items     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on skills            for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_rows on llm_runs          for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy own_item on bullets for all to authenticated
  using (exists (select 1 from profile_items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (exists (select 1 from profile_items i where i.id = item_id and i.user_id = (select auth.uid())));

-- item_skills also checks the skill belongs to you, so you can't link someone else's skill.
create policy own_item on item_skills for all to authenticated
  using (exists (select 1 from profile_items i where i.id = item_id and i.user_id = (select auth.uid())))
  with check (
    exists (select 1 from profile_items i where i.id = item_id and i.user_id = (select auth.uid()))
    and exists (select 1 from skills s where s.id = skill_id and s.user_id = (select auth.uid()))
  );

create policy own_bullet on bullet_skills for all to authenticated
  using (exists (
    select 1 from bullets b join profile_items i on i.id = b.item_id
    where b.id = bullet_id and i.user_id = (select auth.uid())))
  with check (exists (
    select 1 from bullets b join profile_items i on i.id = b.item_id
    where b.id = bullet_id and i.user_id = (select auth.uid())));

commit;
