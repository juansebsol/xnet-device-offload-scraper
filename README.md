# XNET Offload Data Scraper

This project automates scraping daily offload data from the HUB portal and saves it to a Supabase database. It can be triggered manually or scheduled with GitHub Actions.

---

## ⚙️ How It Works

1. **Login & Scrape**
   - Logs into the Okta portal and navigates to the “Data Usage Timeline” page.
   - Clicks download and captures the .txt/.csv content directly via network response.

2. **Parse & Upsert**
   - Parses the downloaded data.
   - Compares rows to existing entries in Supabase.
   - Inserts new rows and updates changed ones.

3. **Log**
   - Each run is logged to a `scrape_log` table for auditing.

---

## 🗂️ Project Structure

```
xnet-offload-scraper/
├── src/
│   ├── runOnce.js          # Entry point for manual test
│   ├── scrape.js           # Main scraping logic
│   ├── parseCsv.js         # Converts raw text to usable JSON
│   ├── upsert.js           # Handles Supabase insert/update + logging
│   └── supabase.js         # Supabase client config
├── downloads/              # Output directory for scraped files
├── .env                    # Your secrets (not committed)
├── .github/workflows/
│   └── scrape.yml          # GitHub Actions schedule (see below)
├── package.json
└── README.md
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root with the following variables:

```
SUPABASE_URL=your-supabase-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
OKTA_START_URL=https://your-okta-login-url
OKTA_EMAIL=your-okta-email@example.com
OKTA_PASSWORD=your-okta-password
```

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for database access.
- `OKTA_START_URL`, `OKTA_EMAIL`, and `OKTA_PASSWORD` are required for automated login to the HUB portal.

---

## 🧪 Run Locally

```bash
npm install
npm run scrape:once
```

Your console should show logs and a downloaded file preview in `/downloads`.

---

## 🧾 Supabase Schema (SQL)

Run once to set up the schema. This version is destructive and resets existing tables:

```sql
-- Warning: This drops both tables & their data. Run only when you’re ok starting fresh.

-- Copy code in the following location into your Supa sql editor:
/utils/supa-sql-destructive.txt

```

---

## 🧠 Logic Summary

### `upsertDaily()` (from `src/upsert.js`)
- Checks which rows are new or changed (gigabytes diff).
- Only writes these to Supabase.
- Tracks:
  - `inserted`: new days
  - `updated`: same day but new data
  - `upserted`: sum of above
  - `totalParsed`: total lines from the file

### `logScrape()`
- Writes a new entry to `scrape_log` with:
  - Rows parsed
  - Rows inserted/updated
  - Error text (if any)

---

## ✅ Usage Summary

| Action                | Command / Method         |
|-----------------------|-------------------------|
| Manual run (local)    | `npm run scrape:once`   |
| GitHub daily scrape   | via cron in Actions     |
| Setup Supabase schema | paste SQL into editor   |

---

## 💬 Troubleshooting

- **⚠️ Protocol error (Network.getResponseBody):**
  - Expected and caught. Playwright can't read a streamed download, so we fall back to fetching with request.get() using the same URL.

- **❌ relation "offload_daily" does not exist:**
  - Means schema wasn't created yet — run the Supabase SQL setup.

---

## 📦 Dependencies

- [@supabase/supabase-js](https://github.com/supabase/supabase-js)
- [dotenv](https://github.com/motdotla/dotenv)
- [playwright](https://github.com/microsoft/playwright)

---

## 🌐 API

### Offload Data Read API

Public, read‑only HTTP API that serves daily network offload usage from the Supabase database. Deployed on Vercel as lightweight Node serverless functions.

**Base URL:** `https://xnet-offload-scraper.vercel.app/api`

#### ✨ What It Does

- Accepts simple query params (`days=7`, `start=YYYY-MM-DD`, etc.).
- Returns normalized JSON: `{ day, gigabytes, formattedGigabytes }`.
- Provides range metadata, summary totals, and latest day helper endpoint.

#### 📁 API Source Layout

```
api/
├── _supabase.js   # Creates Supabase admin client (server-only env vars)
├── _util.js       # Date helpers + number formatting
├── data.js        # Main query endpoint: days / date range / all
├── latest.js      # Most recent day
├── summary.js     # Aggregate (total + average) over last N days
└── vercel.json    # Vercel function runtime + deploy config
```

#### 🔐 Environment Variables (Vercel)

Only Supabase vars are required for the read API. Okta creds are not needed (scraper runs in GitHub Actions).

| Name | Required | Description |
|------|----------|-------------|
| `SUPABASE_URL` | ✅ | Your Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server only; never shipped client‑side). |

Add these in **Vercel Project → Settings → Environment Variables** before deploying.

#### 🚀 Deploy Steps (Vercel)

1. Ensure `/api/` files are committed (see code below).
2. Add `vercel.json` to project root.
3. Push repo to GitHub (already done).
4. In Vercel: **Add New Project → Import Git Repo**.
5. Framework preset: **Other (no build)**.
6. Add env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
7. Deploy → you'll get a URL like: `https://xnet-offload-scraper.vercel.app`

#### 🔌 Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `/api/data` | All rows (newest first). | `/api/data` |
| `/api/data?days=N` | Last N calendar days (inclusive). | `/api/data?days=7` |
| `/api/data?start=YYYY-MM-DD&end=YYYY-MM-DD` | Explicit range. | `/api/data?start=2025-07-01&end=2025-07-22` |
| `/api/latest` | Most recent day in DB. | `/api/latest` |
| `/api/summary?days=N` | Total + average over last N days. | `/api/summary?days=30` |

All responses are JSON.

#### 📤 Response Shapes

**`/api/data...`**
```json
{
  "range": { "start": "2025-07-01", "end": "2025-07-22", "days": 22 },
  "count": 22,
  "data": [
    { "day": "2025-07-22", "gigabytes": 588, "formattedGigabytes": "588" },
    { "day": "2025-07-21", "gigabytes": 1314, "formattedGigabytes": "1,314" }
  ]
}
```

**`/api/latest`**
```json
{ "day": "2025-07-22", "gigabytes": 588, "formattedGigabytes": "588" }
```

**`/api/summary?days=30`**
```json
{
  "range": { "start": "2025-06-23", "end": "2025-07-22", "days": 30 },
  "count": 30,
  "total": 40231.5,
  "totalFormatted": "40,231.5",
  "average": 1341.05,
  "averageFormatted": "1,341.05"
}
```

#### 🔁 Parameter Rules

- `days`: integer > 0. Range = today back N‑1 days (inclusive).
- `start` / `end`: ISO dates (`YYYY-MM-DD`). Both required when used.
- If no params → returns all data.
- Newest first (descending date).

#### 🧪 Quick Test Commands

**All data**
```bash
curl https://xnet-offload-scraper.vercel.app/api/data
```

**Last 7 days**
```bash
curl "https://xnet-offload-scraper.vercel.app/api/data?days=7"
```

**Custom range**
```bash
curl "https://xnet-offload-scraper.vercel.app/api/data?start=2025-07-01&end=2025-07-22"
```

**Latest**
```bash
curl https://xnet-offload-scraper.vercel.app/api/latest
```

**Summary (30 days)**
```bash
curl "https://xnet-offload-scraper.vercel.app/api/summary?days=30"
```

#### 🧯 Error Responses

| Status | Cause | Example body |
|--------|-------|--------------|
| `400` | Bad params (days invalid, start/end invalid) | `{"error":"Invalid days param"}` |
| `404` | No data (`/latest` w/ empty table) | `{"error":"No data"}` |
| `405` | Wrong method | `{"error":"Method not allowed"}` |
| `500` | Supabase error | `{"error":"Database error"}` |

#### 🛡️ Security Notes

- Service role key lives only in Vercel env (never in client bundles).
- API is read‑only; write operations disabled.
- Enable Supabase RLS if exposing DB directly elsewhere.

---
