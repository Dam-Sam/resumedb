-- Prompt caching: record how much of each call's input was read from or
-- written to Anthropic's prompt cache. input_tokens is the uncached part only.
-- Run once in the Supabase SQL editor, after 0009.

begin;

alter table llm_runs
  add column cache_read_input_tokens     integer,
  add column cache_creation_input_tokens integer;

commit;
