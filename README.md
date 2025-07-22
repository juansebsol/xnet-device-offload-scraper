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