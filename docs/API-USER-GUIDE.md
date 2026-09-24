# XNET Device Offload API — User Guide

**Base URL:** `https://xnet-device-offload-scraper.vercel.app`

---

## Authentication

Every request requires a Bearer API key:

```http
Authorization: Bearer xnet_live_...
```

- Scopes are configured on your key by XNET.
- Missing/invalid key → `401`
- Valid key without required scope → `403`

### Scopes you may be granted

| Scope | What you can do |
|---|---|
| `read` | Fetch device offload data |
| `write` | List / add / remove tracked devices |
| `trigger` | Trigger scrapes |

Ask XNET for only the scopes you need.

---

## Quick start

```bash
export API_KEY="xnet_live_YOUR_KEY_HERE"
export BASE="https://xnet-device-offload-scraper.vercel.app"

# Fetch last 7 days of offload data
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/device-offload?nas_id=942a6f5ae894&days=7"
```

---

## Endpoints overview

| Method | Endpoint | Scope | Purpose |
|---|---|---|---|
| `GET` | `/api/device-offload` | `read` | Query offload data for a device |
| `GET` | `/api/manage-devices` | `write` | List tracked devices |
| `POST` | `/api/manage-devices` | `write` | Add device to daily scrape list |
| `DELETE` | `/api/manage-devices` | `write` | Remove device from daily scrape list |
| `POST` | `/api/trigger-scrape` | `trigger` | Trigger default scrape (recent window) |
| `POST` | `/api/trigger-scrape-date` | `trigger` | Trigger custom date-range scrape |

---

## 1) Fetch offload data

`GET /api/device-offload`  
**Scope:** `read`

### Query params

| Param | Type | Required | Description |
|---|---|---|---|
| `nas_id` | string | yes | Device NAS ID (normalized or formatted; API normalizes it) |
| `days` | number | no | Last N days including today |
| `start` | `YYYY-MM-DD` | no | Start date (use with `end`) |
| `end` | `YYYY-MM-DD` | no | End date (use with `start`) |

Notes:
- If only `nas_id` is provided → returns all available data for that device
- Use either `days` **or** `start`+`end`, not both

### Examples

All data:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/device-offload?nas_id=942a6f5ae894"
```

Last 30 days:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/device-offload?nas_id=942a6f5ae894&days=30"
```

Date range:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/device-offload?nas_id=942a6f5ae894&start=2026-05-01&end=2026-05-07"
```

### Success response `200`

```json
{
  "nas_id": "942a6f5ae894",
  "range": {
    "start": "2026-05-01",
    "end": "2026-05-07",
    "days": null
  },
  "count": 2,
  "summary": {
    "total_gbs": 12.345,
    "total_sessions": 1500,
    "total_users": 800,
    "total_rejects": 12,
    "average_daily_gbs": 6.1725,
    "days_analyzed": 2
  },
  "data": [
    {
      "transaction_date": "2026-05-07",
      "nas_id": "942a6f5ae894",
      "device_name": "Office AP",
      "total_sessions": 700,
      "count_of_users": 400,
      "rejects": 5,
      "total_gbs": 6.1,
      "created_at": "2026-05-08T01:00:00.000Z",
      "updated_at": "2026-05-08T01:00:00.000Z"
    }
  ]
}
```

### Row schema (`data[]`)

| Field | Type | Description |
|---|---|---|
| `transaction_date` | string (`YYYY-MM-DD`) | Day of metrics |
| `nas_id` | string | Normalized NAS ID |
| `device_name` | string \| null | Device display name |
| `total_sessions` | number | Sessions that day |
| `count_of_users` | number | Unique users that day |
| `rejects` | number | Rejected auth attempts |
| `total_gbs` | number | Total GB offloaded |
| `created_at` | string (ISO) | Record created |
| `updated_at` | string (ISO) | Record updated |

---

## 2) List tracked devices

`GET /api/manage-devices`  
**Scope:** `write`

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "$BASE/api/manage-devices"
```

### Success response `200`

```json
{
  "count": 1,
  "message": "Showing only devices on daily scrape list",
  "devices": [
    {
      "id": 1,
      "nas_id": "942a6f5ae894",
      "device_type": "cambium",
      "device_name": "Office AP",
      "description": null,
      "is_active": true,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z",
      "added_to_tracked_at": "2026-01-01T00:00:00.000Z",
      "last_scraped": "2026-05-08T02:00:00.000Z",
      "tracking_notes": null,
      "summary": {
        "total_sessions": 1500,
        "total_users": 800,
        "total_rejects": 12,
        "total_gbs": 12.345
      },
      "record_count": 20
    }
  ]
}
```

---

## 3) Add tracked device

`POST /api/manage-devices`  
**Scope:** `write`

### Body schema

| Field | Type | Required | Description |
|---|---|---|---|
| `nas_id` | string | yes | Device NAS ID |
| `device_type` | string | yes | One of: `cambium`, `ruckus`, `ubiquiti`, `alta`, `unknown` |
| `device_name` | string | no | Display name |
| `description` | string | no | Optional description |
| `notes` | string | no | Tracking notes |

```bash
curl -X POST "$BASE/api/manage-devices" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nas_id": "942a6f5ae894",
    "device_type": "cambium",
    "device_name": "Office AP",
    "notes": "Downtown site"
  }'
```

### Success response `201`

```json
{
  "message": "Device added to daily scrape list successfully",
  "device": {
    "nas_id": "942a6f5ae894",
    "device_type": "cambium",
    "device_name": "Office AP",
    "description": null,
    "added_to_tracked_at": "2026-05-08T02:00:00.000Z",
    "notes": "Downtown site"
  }
}
```

---

## 4) Remove tracked device

`DELETE /api/manage-devices?nas_id=...`  
**Scope:** `write`

Removes from the daily scrape list. Historical offload data remains.

```bash
curl -X DELETE "$BASE/api/manage-devices?nas_id=942a6f5ae894" \
  -H "Authorization: Bearer $API_KEY"
```

### Success response `200`

```json
{
  "message": "Device 942a6f5ae894 removed from daily scrape list successfully",
  "note": "Device data remains in database and can be manually scraped"
}
```

---

## 5) Trigger default scrape

`POST /api/trigger-scrape`  
**Scope:** `trigger`

Queues a GitHub Action scrape for the device (default recent window used by the worker).

### Body schema

| Field | Type | Required |
|---|---|---|
| `nas_id` | string | yes |

```bash
curl -X POST "$BASE/api/trigger-scrape" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nas_id":"942a6f5ae894"}'
```

### Success response `200`

```json
{
  "success": true,
  "message": "GitHub Action workflow triggered successfully",
  "details": {
    "nas_id": "942a6f5ae894",
    "workflow": "device-offload-scraper",
    "event_type": "device-offload-scrape",
    "status": "queued",
    "note": "Check GitHub Actions tab for progress and results"
  }
}
```

---

## 6) Trigger custom date-range scrape

`POST /api/trigger-scrape-date`  
**Scope:** `trigger`

### Body schema

| Field | Type | Required | Description |
|---|---|---|---|
| `nas_id` | string | yes | Device NAS ID |
| `start_date` | `YYYY-MM-DD` | yes | Inclusive start |
| `end_date` | `YYYY-MM-DD` | yes | Must be after `start_date` |

```bash
curl -X POST "$BASE/api/trigger-scrape-date" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "nas_id": "942a6f5ae894",
    "start_date": "2026-05-01",
    "end_date": "2026-05-07"
  }'
```

### Success response `200`

```json
{
  "success": true,
  "message": "GitHub Action workflow triggered successfully with date range",
  "details": {
    "nas_id": "942a6f5ae894",
    "start_date": "2026-05-01",
    "end_date": "2026-05-07",
    "workflow": "device-offload-scraper",
    "event_type": "device-offload-scrape-date",
    "status": "queued",
    "note": "Check GitHub Actions tab for progress and results"
  }
}
```

---

## Errors

| Status | Meaning |
|---|---|
| `400` | Bad request / validation failed |
| `401` | Missing or invalid API key |
| `403` | API key missing required scope |
| `404` | Device/resource not found |
| `405` | Method not allowed |
| `500` | Server error |

### Auth error examples

```json
{
  "error": "Unauthorized",
  "details": "Missing Authorization Bearer token",
  "example": "Authorization: Bearer xnet_live_..."
}
```

```json
{
  "error": "Forbidden",
  "details": "API key is missing required scope",
  "required_scopes": ["read"],
  "key_scopes": ["trigger"]
}
```

---

## Integration notes

1. Always send `Authorization: Bearer <key>` on every call.
2. Prefer loading the key from environment variables in your app/dashboard.
3. NAS IDs are normalized server-side (separators stripped, lowercased).
4. Scrape trigger endpoints return `queued` — they do not wait for scrape completion.
5. After a scrape completes, fetch results via `/api/device-offload`.

---

## Support

If your key returns `401`/`403`, contact XNET with:
- your key name / prefix (`xnet_live_...` first characters)
- the endpoint you called
- the exact error JSON
