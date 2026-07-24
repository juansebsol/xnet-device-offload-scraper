# API Keys

All Device Offload API routes require an API key.

Send it as:

```http
Authorization: Bearer xnet_live_...
```

## Setup

1. Run `sql/api_keys.sql` in the Supabase SQL editor.
2. Create at least one key (SQL below).
3. Deploy the API code that uses `api/_auth.js`.
4. Share the key securely with the API user.

Keys are stored in plaintext in `api_keys` so you can fetch them later.
Access is locked down with RLS: only the service role used by Vercel can read the table.

## Scopes

| Scope | Endpoints |
|---|---|
| `read` | `GET /api/device-offload` |
| `write` | `GET/POST/DELETE /api/manage-devices` |
| `trigger` | `POST /api/trigger-scrape`, `POST /api/trigger-scrape-date` |

Give partners only the scopes they need.

## Create a key

```sql
insert into public.api_keys (name, api_key, key_prefix, scopes)
values (
  'Partner Acme',
  'xnet_live_' || encode(gen_random_bytes(24), 'hex'),
  'xnet_live',
  array['read', 'write', 'trigger']::text[]
)
returning id, name, api_key, key_prefix, scopes, is_active, created_at;
```

Read-only example:

```sql
insert into public.api_keys (name, api_key, key_prefix, scopes)
values (
  'Analytics Read Only',
  'xnet_live_' || encode(gen_random_bytes(24), 'hex'),
  'xnet_live',
  array['read']::text[]
)
returning id, name, api_key, scopes;
```

## List keys

```sql
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
```

## Fetch one key

```sql
select id, name, api_key, scopes, is_active, last_used_at
from public.api_keys
where name = 'Partner Acme';
```

## Revoke a key

```sql
update public.api_keys
set is_active = false,
    revoked_at = now()
where name = 'Partner Acme'
returning id, name, is_active, revoked_at;
```

## Optional expiry

```sql
update public.api_keys
set expires_at = now() + interval '90 days'
where name = 'Partner Acme';
```

## Example API call

```bash
curl -X GET \
  "https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=942a6f5ae894&days=7" \
  -H "Authorization: Bearer xnet_live_YOUR_KEY_HERE"
```
