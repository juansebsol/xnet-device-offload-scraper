# 🚀 XNET Device Offload Scraper

> **⚠️ This project has been completely reorganized for device-specific offload scraping**

## 📋 What Changed

This project has been **completely refactored** to focus exclusively on **device-specific offload data** instead of overall daily offload statistics.

## 🔄 New System

**All functionality has moved to the new device-specific system:**

- **Two main endpoints**: One for triggering scraping, one for querying data
- **Scheduled scraping**: Automatically scrapes configured devices daily
- **Device management**: Easy API to add/remove devices from scraping list
- **Clean architecture**: No more overall offload scraping

## 📖 Documentation

**See the new comprehensive documentation:**
- **[README-DEVICE-OFFLOAD.md](README-DEVICE-OFFLOAD.md)** - Complete guide to the new system

## 🗂️ New Project Structure

```
xnet-device-offload-scraper/
├── src/
│   ├── runDeviceScrape.js        # Main runner for device scraping
│   ├── scheduledDeviceScrape.js  # Scheduled scraping for multiple devices
│   ├── scrapeDeviceOffload.js    # Core device scraper
│   ├── parseDeviceCsv.js         # Device CSV parser
│   ├── upsertDeviceOffload.js    # Device database operations
│   └── supabase.js               # Supabase client config
├── api/
│   ├── trigger-scrape.js         # Trigger scraping endpoint
│   ├── device-offload.js         # Query data endpoint
│   └── manage-devices.js         # Device management endpoint
├── .github/workflows/
│   ├── device-offload-scraper.yml        # Manual trigger workflow
│   └── scheduled-device-scraping.yml     # Daily scheduled workflow
├── utils/
│   ├── supa-sql-migrate.txt              # Safe migration (existing projects)
│   └── supa-sql-destructive.txt          # Destructive reset (new projects)
└── README-DEVICE-OFFLOAD.md              # Complete documentation
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Scrape a specific device
npm run scrape:device bcb92300ae0c

# Run scheduled scraping for all devices
npm run scrape:scheduled all

# Manage device list
npm run device:list
npm run device:add newdevice123 "Device Name"
```

## 🔗 API Endpoints

- **`POST /api/trigger-scrape`** - Trigger scraping for a device
- **`GET /api/device-offload`** - Query device data
- **`GET/POST/DELETE /api/manage-devices`** - Manage device list

## 📅 Scheduled Scraping

The system automatically scrapes all configured devices **every day at 2 AM UTC**.

---

**For complete documentation and usage instructions, see [README-DEVICE-OFFLOAD.md](README-DEVICE-OFFLOAD.md)**


---
