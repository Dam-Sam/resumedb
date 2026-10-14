-- Connected inboxes. One row per mailbox a user has connected.
-- The refresh token is encrypted by the app (AES-256-GCM, EMAIL_TOKEN_KEY) before
-- it gets here, and the app's signed-in users can't read that column at all:
-- only the server's service-role client (webhooks, cron) touches tokens.
-- Run once in the Supabase SQL editor, after 0005.

begin;

create table email_connections (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  provider                 text not null check (provider in ('gmail', 'outlook')),
  email_address            text not null,
  refresh_token_encrypted  text not null,
  -- Gmail: the mailbox history id we've synced up to. Push notifications only
  -- say "something changed"; we read everything after this point.
  history_id               text,
  watch_expires_at         timestamptz,   -- Gmail watches lapse after 7 days
  status                   text not null default 'active'
                           check (status in ('active', 'error', 'revoked')),
  last_error               text,
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- A push notification names the mailbox, not the user, so the address must be unique.
  unique (provider, email_address)
);
create index on email_connections (user_id);

create trigger trg_email_connections_updated before update on email_connections
  for each row execute function set_updated_at();

alter table email_connections enable row level security;
create policy own_rows on email_connections for select to authenticated
  using (user_id = (select auth.uid()));
-- Every column except the token. Connecting, syncing and disconnecting go
-- through the server with the service role.
grant select (id, user_id, provider, email_address, history_id, watch_expires_at, status, last_error, last_synced_at, created_at, updated_at)
  on email_connections to authenticated;

commit;
