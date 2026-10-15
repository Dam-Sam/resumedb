-- The email webhook, renewal cron and Gmail callback run through the
-- service-role client (lib/supabase/admin.ts). This project doesn't grant
-- table privileges automatically, so give that role exactly what those paths use.

grant select, insert, update, delete on email_connections to service_role;
grant select, insert, update on email_messages to service_role;
grant select, update on applications to service_role;
-- log_application_status() runs as the caller and records each status change.
grant insert on application_events to service_role;
grant insert on llm_runs to service_role;
