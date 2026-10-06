-- Signed-in users need table privileges before Row Level Security can apply.
-- This project doesn't grant them automatically, so without these every query
-- from the app fails with "permission denied". RLS (0001) still limits each
-- user to their own rows; signed-out (anon) visitors get no access at all.
-- Run once in the Supabase SQL editor, after 0001.

grant select, insert, update, delete on
  contact_info, profile_links, profile_summaries, profile_items,
  bullets, skills, item_skills, bullet_skills, llm_runs
to authenticated;
