-- Allow admin scope on existing api_keys table.
-- Run this once if api_keys.sql was already applied earlier.

alter table public.api_keys
  drop constraint if exists api_keys_scopes_valid;

alter table public.api_keys
  add constraint api_keys_scopes_valid check (
    scopes <@ array['read', 'write', 'trigger', 'admin']::text[]
    and cardinality(scopes) > 0
  );
