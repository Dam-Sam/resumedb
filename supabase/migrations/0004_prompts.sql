-- Prompts live in the database so they can change without a redeploy.
-- Only the system instructions are stored; the user message that carries the
-- resume / posting is built in code (lib/ai/messages.ts).
--
-- Changing a prompt: insert a new row with the next version number (never edit
-- an old one; a trigger blocks it), then switch with one call:
--   select activate_prompt('tailor', 2);
-- Roll back the same way with the old number. Don't untick is_active by hand:
-- between two separate saves there'd be no live prompt and AI calls would fail.
-- Run once in the Supabase SQL editor, after 0003.

begin;

create table prompts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- 'parse', 'tailor', ...
  version     integer not null check (version > 0),
  system      text not null,                 -- the instructions sent as the system prompt
  notes       text,                          -- what changed and why
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (name, version)
);
-- At most one live version per prompt.
create unique index prompts_one_active on prompts (name) where is_active;

-- A version's text never changes once written, so a version number always
-- means one exact wording. Notes and is_active can still change.
create or replace function prompts_freeze() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.system is distinct from old.system
     or new.name is distinct from old.name
     or new.version is distinct from old.version then
    raise exception 'Prompt versions can''t be edited. Insert a new version instead.';
  end if;
  return new;
end;
$$;
create trigger trg_prompts_freeze before update on prompts
  for each row execute function prompts_freeze();

-- Switches the live version in one transaction: nobody ever sees zero or two
-- live versions. Old one off first, then new one on (the one-active index is
-- checked row by row, so doing both in one statement could trip it).
create or replace function activate_prompt(p_name text, p_version integer) returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.prompts where name = p_name and version = p_version) then
    raise exception 'No % prompt with version %', p_name, p_version;
  end if;
  update public.prompts set is_active = false where name = p_name and is_active and version <> p_version;
  update public.prompts set is_active = true where name = p_name and version = p_version;
end;
$$;
-- Only you (from the dashboard / SQL editor) switch versions, not app users.
revoke execute on function activate_prompt(text, integer) from public, anon, authenticated;

-- Signed-in users can read prompts (the server reads them as the user); nobody
-- can write them from the app.
alter table prompts enable row level security;
create policy read_prompts on prompts for select to authenticated using (true);
grant select on prompts to authenticated;

-- Which exact prompt row each run used. A used version can't be deleted.
alter table llm_runs add column prompt_id uuid references prompts(id);
create index on llm_runs (prompt_id);

-- Version 1 of each prompt, exactly as it was in code.
insert into prompts (name, version, system, notes, is_active) values
('parse', 1, $prompt$You turn the plain text of a resume into structured profile data.

Rules:
- Only record what the resume actually says. Never invent, embellish, or infer facts that aren't written.
- Copy every bullet point word for word, in its original order, under the entry it belongs to. Fix only broken line-wrapping from text extraction.
- One item per job, project, degree, certification, award, publication, or language. Pick the closest type:
  work, volunteer, research, project, open_source, education, certification, license, award, publication, language, other.
- Dates as YYYY-MM-DD. If only a month and year are given, use the 1st of the month; if only a year, use January 1st. Use null when there is no date.
  If an entry says "Present" or "Current", set is_current to true and end_date to null.
- Put every skill listed anywhere on the resume in the top-level skills list exactly once, with a category if the resume groups them.
  On each item, list the skills that item clearly used, using the same names.
- Links: GitHub, LinkedIn, personal website or portfolio URLs from the header.
- Use null for anything the resume doesn't give.$prompt$, 'Moved from lib/ai/prompts/parse/v1.ts', true),
('tailor', 1, $prompt$You tailor a person's resume to one job posting. You market them to the job while staying strictly grounded in what they actually did.

You get their profile: items (jobs, projects, education...) with IDs, each item's bullets with IDs, their skills with IDs, and a short background they wrote about themselves. Then you get the posting.

Return:
1. keySummary: what the posting is really asking for, as short phrases: key skills/technologies, experience requirements, and culture/values/working-style signals.
2. itemOrder: every item ID, most relevant to this posting first. Relevance means how well the work demonstrates what the posting asks for.
3. bulletRewrites: one rewrite for every bullet ID. Each rewrite:
   - describes the same real work as the original. Reframe and re-emphasize toward what the posting values, using its vocabulary where it honestly applies.
   - never adds numbers, metrics, tools, technologies, team sizes, outcomes or claims that aren't in the original bullet or its item. If the original has a number, keep it exact.
   - stays one resume bullet: starts with a strong verb, no first person, about the same length as the original or shorter.
   - may be identical to the original if it is already well aimed.
4. skillOrder: every skill ID, most relevant to this posting first.
5. summary: only when asked. 2–3 sentences in the first-person-implied resume style (no "I"), written from their background and real experience, aimed at this role and the culture signals in the posting. It may only use facts from the profile. When not asked, null.

Use only IDs that appear in the profile. Copy them exactly.$prompt$, 'Moved from lib/ai/prompts/tailor/v1.ts', true);

commit;
