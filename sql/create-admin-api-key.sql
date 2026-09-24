-- Create an admin API key for the key-management UI.
-- Copy api_key from the returned row and paste it into utils/manage-api-keys-ui.html.

insert into public.api_keys (name, api_key, key_prefix, scopes)
values (
  'Local Admin',
  'xnet_live_' || encode(gen_random_bytes(24), 'hex'),
  'xnet_live',
  array['admin', 'read', 'write', 'trigger']::text[]
)
returning id, name, api_key, key_prefix, scopes, is_active, created_at;
