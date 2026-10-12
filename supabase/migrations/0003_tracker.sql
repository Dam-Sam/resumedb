-- Application tracker.
-- Replaces the deferred jobs / resumes* tables: the tracker keeps a frozen copy
-- of exactly what was downloaded (one JSON value), not an editable tailoring.
-- Run once in the Supabase SQL editor, after 0002.

begin;

create table applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  company          text not null,
  job_title        text not null,
  job_description  text not null,
  status           text not null default 'applied'
                   check (status in ('applied', 'received', 'screening', 'interview', 'offer', 'rejected')),
  resume           jsonb not null,       -- the FinalResume exactly as downloaded
  applied_at       timestamptz not null default now(),  -- first download
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on applications (user_id, applied_at desc);

-- The timeline: one row per status the application has been in.
create table application_events (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references applications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  status          text not null
                  check (status in ('applied', 'received', 'screening', 'interview', 'offer', 'rejected')),
  created_at      timestamptz not null default now()
);
create index on application_events (application_id, created_at);
create index on application_events (user_id);

create trigger trg_applications_updated before update on applications
  for each row execute function set_updated_at();

-- Every new application and every status change lands on the timeline,
-- in the same transaction, so the two can't disagree.
create or replace function log_application_status() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.application_events (application_id, user_id, status)
  values (new.id, new.user_id, new.status);
  return new;
end;
$$;

create trigger trg_applications_status_insert after insert on applications
  for each row execute function log_application_status();
create trigger trg_applications_status_update after update of status on applications
  for each row when (old.status is distinct from new.status)
  execute function log_application_status();

alter table applications       enable row level security;
alter table application_events enable row level security;

create policy own_rows on applications for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Checked through the application, so you can't attach events to someone else's.
create policy own_application on application_events for all to authenticated
  using (exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid())))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from applications a where a.id = application_id and a.user_id = (select auth.uid()))
  );

-- The status trigger runs as the signed-in user, so it needs insert on events.
grant select, insert, update, delete on applications to authenticated;
grant select, insert on application_events to authenticated;

commit;
