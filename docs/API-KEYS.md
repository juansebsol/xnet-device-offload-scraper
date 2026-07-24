# API Keys

All Device Offload API routes require an API key.

Send it as:

```http
Authorization: Bearer xnet_live_...
```

## Setup

1. Run `sql/api_keys.sql` once (creates table + RLS).
2. Create a key with `sql/create-api-key.sql`.
3. Deploy the API code that uses `api/_auth.js`.
4. Share the key securely with the API user.

Keys are stored in plaintext in `api_keys` so you can fetch them later.
Access is locked down with RLS: only the service role used by Vercel can read the table.

## SQL scripts

| Script | Purpose |
|---|---|
| `sql/api_keys.sql` | Create table, indexes, RLS |
| `sql/create-api-key.sql` | Create a new key |
| `sql/list-api-keys.sql` | List/fetch keys |
| `sql/revoke-api-key.sql` | Revoke a key |

## Scopes

| Scope | Endpoints |
|---|---|
| `read` | `GET /api/device-offload` |
| `write` | `GET/POST/DELETE /api/manage-devices` |
| `trigger` | `POST /api/trigger-scrape`, `POST /api/trigger-scrape-date` |

Scopes are stored on the key. Callers only send the Bearer token.

## Example API call

```bash
curl -X GET \
  "https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=942a6f5ae894&days=7" \
  -H "Authorization: Bearer xnet_live_YOUR_KEY_HERE"
```
