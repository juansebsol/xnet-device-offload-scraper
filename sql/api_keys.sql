-- Create api_keys table + indexes + RLS.
-- Run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  api_key text not null unique,
  key_prefix text not null,
  scopes text[] not null default array['read']::text[],
  is_active boolean not null default true,
  expires_at timestamptz null,
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint api_keys_scopes_valid check (
    scopes <@ array['read', 'write', 'trigger', 'admin']::text[]
    and cardinality(scopes) > 0
  )
);

create index if not exists api_keys_api_key_idx on public.api_keys (api_key);
create index if not exists api_keys_is_active_idx on public.api_keys (is_active);
create index if not exists api_keys_name_idx on public.api_keys (name);

alter table public.api_keys enable row level security;

-- No policies for anon/authenticated roles.
-- Service role bypasses RLS, but still needs explicit GRANTs.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.api_keys to service_role;

comment on table public.api_keys is
  'Retrievable API keys for external access. Keep service-role only.';
