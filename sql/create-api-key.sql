-- Create a new API key.
-- Edit name + scopes, then run in the Supabase SQL editor.
-- Copy api_key from the returned row and share it securely.

insert into public.api_keys (name, api_key, key_prefix, scopes)
values (
  'Partner Acme',
  'xnet_live_' || encode(gen_random_bytes(24), 'hex'),
  'xnet_live',
  array['read', 'write', 'trigger']::text[]
)
returning id, name, api_key, key_prefix, scopes, is_active, created_at;
