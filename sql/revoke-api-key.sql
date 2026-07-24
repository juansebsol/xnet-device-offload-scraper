-- Revoke an API key.
-- Edit the name (or switch to id), then run in the Supabase SQL editor.

update public.api_keys
set is_active = false,
    revoked_at = now()
where name = 'Partner Acme'
returning id, name, is_active, revoked_at;
