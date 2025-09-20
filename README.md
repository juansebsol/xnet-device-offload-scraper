# 🚀 XNET Device Offload Scraper

> **⚠️ This project has been completely reorganized for device-specific offload scraping with V2 database structure**

## 📋 What Changed

This project has been **completely refactored** to focus exclusively on **device-specific offload data** with a new **parent/child database architecture** that supports data aggregation and historical tracking.

## 🔄 New V2 System Features

**All functionality has moved to the new device-specific system with enhanced capabilities:**

- **Parent/Child Database Structure**: `devices` table (parent) → `device_offload_daily` table (child)
- **Data Aggregation**: Automatically sums multiple records per date per device
- **Historical Data Preservation**: Never overwrites, always inserts new records
- **Dual Scraping Modes**: Standard (last 7 days) and Custom Date Range scraping
- **Two main endpoints**: One for triggering scraping, one for querying data
- **Scheduled scraping**: Automatically scrapes configured devices daily
- **Device management**: Easy API to add/remove devices from scraping list
- **Clean architecture**: Separate scrapers for different use cases

## 🗄️ V2 Database Schema

### New Parent/Child Structure

#### `devices` (Parent Table)
- `id` - Primary key
- `nas_id` - Unique device identifier
- `device_name` - Human-readable name
- `description` - Optional device notes
- `is_active` - Device monitoring status

#### `device_offload_daily` (Child Table)
- `id` - Primary key
- `transaction_date` - Date of data
- `nas_id` - Device identifier (denormalized)
- `device_id` - Foreign key to devices table
- `total_sessions`, `count_of_users`, `rejects`, `total_gbs` - Aggregated metrics
- **Unique constraint**: `(transaction_date, device_id)` prevents duplicates

#### `tracked_devices` (Daily Scrape List)
- `id` - Primary key
- `nas_id` - Device identifier (must exist in devices table)
- `added_to_tracked_at` - When added to daily scrape list
- `last_scraped` - Last automatic scrape time
- `is_active` - Whether device is currently tracked
- `notes` - Optional tracking notes

#### `device_offload_scrape_log`
- Audit trail for all scraping operations

## 📖 Documentation

**See the new comprehensive documentation:**
- **[README-DEVICE-OFFLOAD.md](README-DEVICE-OFFLOAD.md)** - Complete guide to the new system

## 🗂️ New Project Structure

```
xnet-device-offload-scraper/
├── src/
│   ├── runDeviceScrape.js        # Main runner for standard device scraping
│   ├── runDeviceScrapDate.js     # NEW: Main runner for date range scraping
│   ├── scheduledDeviceScrape.js  # Scheduled scraping for multiple devices
│   ├── scrapeDeviceOffload.js    # Core device scraper (standard, last 7 days)
│   ├── scrapeDeviceOffloadDate.js # NEW: Core scraper with custom date range
│   ├── parseDeviceCsv.js         # Device CSV parser (with data aggregation)
│   ├── upsertDeviceOffload.js    # Device database operations (V2 structure)
│   └── supabase.js               # Supabase client config
├── api/
│   ├── trigger-scrape.js         # Trigger standard scraping endpoint
│   ├── trigger-scrape-date.js    # NEW: Trigger date range scraping endpoint
│   ├── device-offload.js         # Query data endpoint (V2 structure)
│   └── manage-devices.js         # Device management endpoint (V2 structure)
├── utils/
│   ├── trigger-scrape-ui.html        # UI for standard scraping
│   ├── trigger-scrape-date-ui.html   # NEW: UI for date range scraping
│   ├── supa-sql-migrate.txt          # V2 migration (parent/child structure)
│   └── supa-sql-destructive.txt      # Nuclear option for fresh start
├── .github/workflows/
│   ├── device-offload-scraper.yml        # Standard scraping workflow
│   ├── device-offload-scraper-date.yml   # NEW: Date range scraping workflow
│   └── scheduled-device-scraping.yml     # Daily scheduled workflow
└── README-DEVICE-OFFLOAD.md              # Complete documentation
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Standard device scraping (last 7 days)
npm run scrape:device 94:2a:6f:c6:3b:ac

# NEW: Custom date range scraping
npm run scrape:device:date 94:2a:6f:c6:3b:ac 2025-07-01 2025-07-30

# Run scheduled scraping for all devices
npm run scrape:scheduled all

# Manage device list
npm run device:list
npm run device:add newdevice123 "Device Name"
npm run device:remove olddevice456

# Test functionality
npm run test:local
npm run test:scrape bcb92300ae0c
npm run test:query bcb92300ae0c 7
```

## 🔗 API Endpoints

### Standard Scraping
- **`POST /api/trigger-scrape`** - Trigger standard scraping (last 7 days)
  ```json
  { "nas_id": "94:2a:6f:c6:3b:ac" }
  ```

### NEW: Date Range Scraping  
- **`POST /api/trigger-scrape-date`** - Trigger custom date range scraping
  ```json
  { 
    "nas_id": "94:2a:6f:c6:3b:ac",
    "start_date": "2025-07-01", 
    "end_date": "2025-07-30"
  }
  ```

### Data & Management
- **`GET /api/device-offload`** - Query device data (V2 structure)
- **`GET/POST/PUT/DELETE /api/manage-devices`** - Manage device list (V2 structure)

## 📅 Dual Scraping Modes

### Standard Scraping (Default)
- **Uses default date range** (typically last 7 days as set by the portal)
- **Files**: `scrapeDeviceOffload.js`, `runDeviceScrape.js`
- **Workflow**: `device-offload-scraper.yml`
- **UI**: `utils/trigger-scrape-ui.html`
- **API**: `POST /api/trigger-scrape`

### Custom Date Range Scraping (NEW)
- **Specify exact date range** (YYYY-MM-DD format)
- **Files**: `scrapeDeviceOffloadDate.js`, `runDeviceScrapDate.js`
- **Workflow**: `device-offload-scraper-date.yml`
- **UI**: `utils/trigger-scrape-date-ui.html`
- **API**: `POST /api/trigger-scrape-date`
- **Features**: Two-step Custom Date Range activation, MM/DD/YYYY format conversion

### Usage Examples

```bash
# Standard scraping (whatever the portal defaults to)
npm run scrape:device 94:2a:6f:c6:3b:ac

# Date range scraping (specific dates)
npm run scrape:device:date 94:2a:6f:c6:3b:ac 2025-07-01 2025-07-30
```

## 🗄️ Database Setup

### V2 Migration Options

#### Option A: Safe Migration (Existing Projects)
```bash
# Run the V2 migration script
\i utils/supa-sql-migrate.txt
```

#### Option B: Fresh Start (New Projects)
```bash
# Nuclear option - completely clean database
\i utils/supa-sql-destructive.txt
# Then run V2 migration
\i utils/supa-sql-migrate.txt
```

## 📅 Scheduled Scraping

The system automatically scrapes all configured devices **every day at 2 AM UTC**.

## 🔧 Key V2 Improvements

- **Data Aggregation**: Multiple records per date are automatically summed
- **Parent/Child Relationships**: Clean database structure for device management
- **Historical Data**: Never loses data, maintains complete audit trail
- **CSV Format Selection**: Automatically selects CSV format for proper parsing
- **Permission Management**: Proper Supabase permissions for all new tables
- **Floating-Point Precision**: Smart comparison prevents unnecessary updates

---

**For complete documentation and usage instructions, see [README-DEVICE-OFFLOAD.md](README-DEVICE-OFFLOAD.md)**


---
