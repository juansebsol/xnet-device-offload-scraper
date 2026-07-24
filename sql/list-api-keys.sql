-- List all API keys.

select
  id,
  name,
  api_key,
  key_prefix,
  scopes,
  is_active,
  expires_at,
  last_used_at,
  created_at,
  revoked_at
from public.api_keys
order by created_at desc;
