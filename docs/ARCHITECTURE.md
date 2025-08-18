# 🔍 Current Architecture

## 📁 **File Structure**
```
src/
├── scrapeDeviceOffload.js          # Core scraper (used by all paths)
├── parseDeviceCsv.js               # CSV parser (used by all paths)
├── upsertDeviceOffload.js          # Database upload (used by all paths)
├── runDeviceScrape.js              # Local testing wrapper only
└── scheduledDeviceScrape.js        # Scheduled scraping logic

api/
├── device-offload.js               # Query device data
├── manage-devices.js               # Manage daily scrape list
└── trigger-scrape.js               # Trigger GitHub Action

.github/workflows/
├── scheduled-device-scraping.yml   # Daily automated scraping
└── device-offload-scraper.yml      # Manual/API triggered scraping
```

## 🔄 **Data Flow Paths**

### **Path 1: Local Testing**
```
npm run scrape:device bcb92300ae0c
    ↓
src/runDeviceScrape.js (wrapper/orchestrator)
    ↓
src/scrapeDeviceOffload.js → src/parseDeviceCsv.js → src/upsertDeviceOffload.js
    ↓
Supabase Database
```

### **Path 2: API Triggered Scraping**
```
/api/trigger-scrape (POST with nas_id)
    ↓
Triggers GitHub Action: device-offload-scraper.yml
    ↓
GitHub Action calls scripts directly:
    - src/scrapeDeviceOffload.js
    - src/parseDeviceCsv.js  
    - src/upsertDeviceOffload.js
    ↓
Supabase Database
```

### **Path 3: Scheduled Daily Scraping**
```
Daily at 2 AM UTC
    ↓
GitHub Action: scheduled-device-scraping.yml
    ↓
npm run scrape:scheduled all
    ↓
src/scheduledDeviceScrape.js
    ↓
Loops through tracked devices → src/scrapeDeviceOffload.js → etc.
    ↓
Supabase Database
```

## 🎯 **Script Usage Matrix**

| Script | Local Testing | API Trigger | Scheduled | Purpose |
|--------|---------------|-------------|-----------|---------|
| `runDeviceScrape.js` | ✅ Wrapper | ❌ | ❌ | Local development |
| `scrapeDeviceOffload.js` | ✅ Core | ✅ Core | ✅ Core | Web scraping |
| `parseDeviceCsv.js` | ✅ Core | ✅ Core | ✅ Core | CSV parsing |
| `upsertDeviceOffload.js` | ✅ Core | ✅ Core | ✅ Core | Database upload |
| `scheduledDeviceScrape.js` | ❌ | ❌ | ✅ Logic | Daily automation |

## 🔧 **Environment Variables**

### **Local Development (.env)**
```bash
OKTA_START_URL=your_okta_url
OKTA_EMAIL=your_email
OKTA_PASSWORD=your_password
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Vercel API**
```bash
GITHUB_TOKEN=your_github_token
GITHUB_REPOSITORY=username/xnet-device-offload-scraper
```

### **GitHub Actions (Secrets)**
```bash
OKTA_START_URL=your_okta_url
OKTA_EMAIL=your_email
OKTA_PASSWORD=your_password
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 **Database Tables**

### **Core Tables**
- `devices` - Device registry
- `device_offload_daily` - Daily offload data
- `tracked_devices` - Daily scrape list
- `device_offload_scrape_log` - Scraping audit trail

### **Relationships**
- `devices` ← `device_offload_daily` (parent/child)
- `devices` ← `tracked_devices` (parent/child)
- `tracked_devices` controls daily automation

## 🚀 **API Endpoints**

### **GET /api/device-offload**
- Query device data with filtering
- Parameters: `nas_id`, `days`, `start`, `end`

### **GET /api/manage-devices**
- List devices on daily scrape list
- Shows tracked devices only

### **POST /api/manage-devices**
- Add device to daily scrape list
- Creates device if doesn't exist

### **DELETE /api/manage-devices**
- Remove device from daily scrape list
- Keeps device data in database

### **POST /api/trigger-scrape**
- Triggers GitHub Action for manual scraping
- Returns workflow status, not scrape results

## 🔄 **GitHub Action Triggers**

### **scheduled-device-scraping.yml**
- **Trigger**: Daily at 2 AM UTC (`cron: '0 2 * * *'`)
- **Action**: Scrapes all devices in tracked list
- **Command**: `npm run scrape:scheduled all`

### **device-offload-scraper.yml**
- **Trigger**: `repository_dispatch` (API calls)
- **Action**: Scrapes single device by NAS ID
- **Command**: Direct script calls (no npm wrapper)
