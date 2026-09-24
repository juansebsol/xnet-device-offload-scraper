# XNET Device Offload API — Admin Guide

Internal doc for XNET operators who manage API keys and grant access.

**Base URL:** `https://xnet-device-offload-scraper.vercel.app`

For partner-facing docs, share [`API-USER-GUIDE.md`](./API-USER-GUIDE.md) instead.

---

## What admins manage

- Create / list / revoke API keys
- Assign scopes (`read`, `write`, `trigger`, `admin`)
- Share keys securely with users
- Use local admin UI: `utils/manage-api-keys-ui.html`

Server-side auth uses existing Vercel env:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The browser UI never needs the service role key. It only needs an **admin Bearer key**.

---

## One-time setup

If `api_keys` already exists without `admin` scope:

```sql
-- sql/allow-admin-scope.sql
```

Create your admin key:

```sql
-- sql/create-admin-api-key.sql
```

Copy the returned `api_key`, then open:

`utils/manage-api-keys-ui.html`

Paste:
- API Base URL
- Admin API Key

From there you can create/list/revoke keys without more SQL.

Related SQL scripts:

| Script | Purpose |
|---|---|
| `sql/api_keys.sql` | Create table + RLS |
| `sql/allow-admin-scope.sql` | Enable `admin` scope on existing table |
| `sql/create-admin-api-key.sql` | Create first admin key |
| `sql/create-api-key.sql` | Create partner key via SQL |
| `sql/list-api-keys.sql` | List keys via SQL |
| `sql/revoke-api-key.sql` | Revoke key via SQL |

---

## Scopes

| Scope | Access |
|---|---|
| `read` | `GET /api/device-offload` |
| `write` | `GET/POST/DELETE /api/manage-devices` |
| `trigger` | `POST /api/trigger-scrape`, `POST /api/trigger-scrape-date` |
| `admin` | `GET/POST/DELETE /api/manage-api-keys` |

Recommended partner grants:
- Dashboard read-only → `["read"]`
- Ops that manage tracked devices → `["read","write"]`
- Ops that can trigger scrapes → `["read","write","trigger"]`
- XNET internal admin only → include `"admin"`

---

## Admin endpoints

All require:

```http
Authorization: Bearer <admin_key>
```

Admin key must include `admin` scope.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/manage-api-keys` | List all keys |
| `POST` | `/api/manage-api-keys` | Create key |
| `DELETE` | `/api/manage-api-keys?id=...` | Revoke key by id |
| `DELETE` | `/api/manage-api-keys?name=...` | Revoke key by name |

---

## 1) List keys

`GET /api/manage-api-keys`

```bash
curl -H "Authorization: Bearer $ADMIN_KEY" \
  "$BASE/api/manage-api-keys"
```

### Success response `200`

```json
{
  "count": 1,
  "keys": [
    {
      "id": "26e0d437-e826-4946-86a4-93cf767b2b9a",
      "name": "Local Admin",
      "api_key": "xnet_live_...",
      "key_prefix": "xnet_live",
      "scopes": ["admin", "read", "write", "trigger"],
      "is_active": true,
      "expires_at": null,
      "last_used_at": "2026-05-08T02:00:00.000Z",
      "created_at": "2026-05-08T01:00:00.000Z",
      "revoked_at": null
    }
  ]
}
```

### Key object schema

| Field | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | string | Human label |
| `api_key` | string | Full retrievable key |
| `key_prefix` | string | Usually `xnet_live` |
| `scopes` | string[] | `read` / `write` / `trigger` / `admin` |
| `is_active` | boolean | Whether key works |
| `expires_at` | string \| null | Optional expiry ISO timestamp |
| `last_used_at` | string \| null | Last successful auth |
| `created_at` | string | Created timestamp |
| `revoked_at` | string \| null | When revoked |

---

## 2) Create key

`POST /api/manage-api-keys`

### Body schema

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Who this key is for |
| `scopes` | string[] | yes | At least one of `read`, `write`, `trigger`, `admin` |
| `expires_at` | string | no | ISO timestamp |

```bash
curl -X POST "$BASE/api/manage-api-keys" \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Partner Acme",
    "scopes": ["read", "write", "trigger"]
  }'
```

### Success response `201`

```json
{
  "message": "API key created successfully",
  "key": {
    "id": "...",
    "name": "Partner Acme",
    "api_key": "xnet_live_...",
    "key_prefix": "xnet_live",
    "scopes": ["read", "write", "trigger"],
    "is_active": true,
    "expires_at": null,
    "created_at": "2026-05-08T02:00:00.000Z"
  }
}
```

Copy `key.api_key` and send it to the partner securely.

---

## 3) Revoke key

`DELETE /api/manage-api-keys?id=<uuid>`  
or  
`DELETE /api/manage-api-keys?name=<name>`

```bash
curl -X DELETE "$BASE/api/manage-api-keys?name=Partner%20Acme" \
  -H "Authorization: Bearer $ADMIN_KEY"
```

### Success response `200`

```json
{
  "message": "API key \"Partner Acme\" revoked successfully",
  "key": {
    "id": "...",
    "name": "Partner Acme",
    "is_active": false,
    "revoked_at": "2026-05-08T03:00:00.000Z"
  }
}
```

---

## Sharing access with users

When onboarding someone:

1. Create a key with only needed scopes.
2. Send them:
   - Base URL
   - Their API key
   - [`API-USER-GUIDE.md`](./API-USER-GUIDE.md)
3. Tell them every request needs:

```http
Authorization: Bearer xnet_live_...
```

Example message:

```text
API access for XNET Device Offload

Base URL: https://xnet-device-offload-scraper.vercel.app
API Key: xnet_live_...
Scopes: read, write, trigger

Docs: API-USER-GUIDE.md

Always send:
Authorization: Bearer <your_key>
```

---

## Admin UI checklist

1. Deploy latest API code (includes `/api/manage-api-keys`)
2. Run `sql/allow-admin-scope.sql` if needed
3. Run `sql/create-admin-api-key.sql`
4. Open `utils/manage-api-keys-ui.html`
5. Paste admin key
6. Create partner keys from UI

---

## Security notes

- Never put `SUPABASE_SERVICE_ROLE_KEY` into browser utils.
- Don’t give partners `admin` unless intentional.
- Revoke compromised keys immediately.
- Prefer unique keys per partner/dashboard.
- Keys are retrievable in DB by design (for recovery), so protect Supabase access.

---

## Related docs

- User/partner guide: [`API-USER-GUIDE.md`](./API-USER-GUIDE.md)
- Key ops overview: [`API-KEYS.md`](./API-KEYS.md)
- Older combined reference: [`API-README.md`](./API-README.md)
