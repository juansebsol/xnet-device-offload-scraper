# API Keys

All Device Offload API routes require an API key.

Send it as:

```http
Authorization: Bearer xnet_live_...
```

## Setup

1. Run `sql/api_keys.sql` once (creates table + RLS + service_role grants).
2. If you already created the table earlier and the API returns `Authentication lookup failed`, run `sql/grant-api-keys-service-role.sql`.
3. Create a key with `sql/create-api-key.sql` (or the admin UI after step 4).
4. Deploy the API code that uses `api/_auth.js`.
5. Share the key securely with the API user.

Keys are stored in plaintext in `api_keys` so you can fetch them later.
Access is locked down with RLS + grants: only the service role used by Vercel can read the table.

## SQL scripts

| Script | Purpose |
|---|---|
| `sql/api_keys.sql` | Create table, indexes, RLS, service_role grants |
| `sql/grant-api-keys-service-role.sql` | Fix permission denied / auth lookup failed |
| `sql/allow-admin-scope.sql` | Add `admin` scope if table already exists |
| `sql/create-api-key.sql` | Create a partner key via SQL |
| `sql/create-admin-api-key.sql` | Create an admin key for the management UI |
| `sql/list-api-keys.sql` | List/fetch keys |
| `sql/revoke-api-key.sql` | Revoke a key |

## Admin UI

Open `utils/manage-api-keys-ui.html`.

- Uses your existing Vercel env (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) on the server
- You only paste an **admin** Bearer API key in the UI (not the service role key)
- Endpoint: `/api/manage-api-keys` (requires `admin` scope)

First-time setup if the table already exists:

1. Run `sql/allow-admin-scope.sql`
2. Run `sql/create-admin-api-key.sql`
3. Paste that admin key into the UI
4. Create/list/revoke keys from there

## Scopes

| Scope | Endpoints |
|---|---|
| `read` | `GET /api/device-offload` |
| `write` | `GET/POST/DELETE /api/manage-devices` |
| `trigger` | `POST /api/trigger-scrape`, `POST /api/trigger-scrape-date` |
| `admin` | `GET/POST/DELETE /api/manage-api-keys` |

## Example API call

```bash
curl -X GET \
  "https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=942a6f5ae894&days=7" \
  -H "Authorization: Bearer xnet_live_YOUR_KEY_HERE"
```
