-- API keys for locking Vercel API routes.
-- Run this in the Supabase SQL editor.

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
    scopes <@ array['read', 'write', 'trigger']::text[]
    and cardinality(scopes) > 0
  )
);

create index if not exists api_keys_api_key_idx on public.api_keys (api_key);
create index if not exists api_keys_is_active_idx on public.api_keys (is_active);
create index if not exists api_keys_name_idx on public.api_keys (name);

alter table public.api_keys enable row level security;

-- No policies for anon/authenticated roles.
-- Only the service role (used by the Vercel API) can read/write this table.

comment on table public.api_keys is
  'Retrievable API keys for external access. Keep service-role only.';

-- ---------------------------------------------------------------------------
-- Create a key (copy api_key from the returned row and share it)
-- ---------------------------------------------------------------------------
-- insert into public.api_keys (name, api_key, key_prefix, scopes)
-- values (
--   'Partner Acme',
--   'xnet_live_' || encode(gen_random_bytes(24), 'hex'),
--   'xnet_live',
--   array['read', 'write', 'trigger']::text[]
-- )
-- returning id, name, api_key, key_prefix, scopes, is_active, created_at;

-- ---------------------------------------------------------------------------
-- List keys
-- ---------------------------------------------------------------------------
-- select id, name, api_key, key_prefix, scopes, is_active, expires_at, last_used_at, created_at, revoked_at
-- from public.api_keys
-- order by created_at desc;

-- ---------------------------------------------------------------------------
-- Fetch one key by name
-- ---------------------------------------------------------------------------
-- select id, name, api_key, scopes, is_active, last_used_at
-- from public.api_keys
-- where name = 'Partner Acme';

-- ---------------------------------------------------------------------------
-- Revoke a key
-- ---------------------------------------------------------------------------
-- update public.api_keys
-- set is_active = false, revoked_at = now()
-- where id = '00000000-0000-0000-0000-000000000000'
-- returning id, name, is_active, revoked_at;
