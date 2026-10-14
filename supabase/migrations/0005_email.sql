-- Email-driven status updates.
-- Each email we look at gets one row in email_messages (sender, subject, what
-- Jev decided), never its body. When an email moves an application forward,
-- the timeline entry says so and points back at the email.
-- Run once in the Supabase SQL editor, after 0004.

begin;

create table email_messages (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  provider             text not null check (provider in ('gmail', 'outlook', 'manual')),
  provider_message_id  text not null,      -- the provider's id, so an email is only processed once
  from_address         text not null,
  from_name            text,
  subject              text not null default '',
  received_at          timestamptz not null,
  application_id       uuid references applications(id) on delete set null,
  proposed_status      text
                       check (proposed_status in ('applied', 'received', 'screening', 'interview', 'offer', 'rejected')),
  -- pending: claimed, not decided yet. applied: status changed automatically.
  -- suggested: waiting for the user. accepted / dismissed: the user answered a suggestion.
  outcome              text not null default 'pending'
                       check (outcome in ('pending', 'applied', 'suggested', 'ignored', 'accepted', 'dismissed', 'failed')),
  reason               text,               -- why, in plain words
  decision             jsonb,              -- Jev's answers and the candidates it chose between
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, provider, provider_message_id)
);
create index on email_messages (user_id, created_at desc);
create index on email_messages (application_id);
create index email_messages_suggested on email_messages (user_id) where outcome = 'suggested';

create trigger trg_email_messages_updated before update on email_messages
  for each row execute function set_updated_at();

-- Where the current status came from. Whoever changes the status sets these in
-- the same update, and the timeline trigger copies them onto the new entry.
alter table applications
  add column status_source text not null default 'manual' check (status_source in ('manual', 'email')),
  add column status_email_id uuid references email_messages(id) on delete set null;

alter table application_events
  add column source text not null default 'manual' check (source in ('manual', 'email')),
  add column email_message_id uuid references email_messages(id) on delete set null;
create index on applications (status_email_id);
create index on application_events (email_message_id);

create or replace function log_application_status() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.application_events (application_id, user_id, status, source, email_message_id)
  values (new.id, new.user_id, new.status, new.status_source, new.status_email_id);
  return new;
end;
$$;

alter table email_messages enable row level security;
create policy own_rows on email_messages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on email_messages to authenticated;

-- Email classification is logged like the other model calls.
alter table llm_runs drop constraint llm_runs_purpose_check;
alter table llm_runs add constraint llm_runs_purpose_check check (purpose in ('parse', 'tailor', 'email'));

commit;
