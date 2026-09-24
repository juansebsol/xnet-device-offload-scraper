-- Fix: "Authentication lookup failed" / permission denied for table api_keys
-- Run once in the Supabase SQL editor as postgres (Dashboard → SQL).
-- Service role can bypass RLS, but still needs table GRANTs.

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.api_keys to service_role;

-- Optional: allow PostgREST to see the table in the schema cache
notify pgrst, 'reload schema';
