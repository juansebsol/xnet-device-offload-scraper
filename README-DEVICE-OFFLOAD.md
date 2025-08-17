# 🚀 XNET Device Offload Scraper

This document describes the **organized device-specific offload scraping system** that replaces the old overall daily offload scraper.

## 📋 Overview

The device offload scraper provides **two main endpoints** and **scheduled scraping capabilities**:

1. **🔴 Endpoint 1**: `/api/trigger-scrape` - Triggers scraping for a specific device
2. **🔵 Endpoint 2**: `/api/device-offload` - Queries the database for device data
3. **🔄 Scheduled Action**: Automatically scrapes configured devices every day
4. **⚙️ Device Management**: Add/remove devices from the scraping list

## 🗄️ V2 Database Schema

### New Parent/Child Structure

#### `devices` (Parent Table)
Master device registry:

```sql
create table devices (
  id bigserial primary key,
  nas_id text not null unique,
  device_name text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### `device_offload_daily` (Child Table)
Stores daily offload data for individual devices with parent relationship:

```sql
create table device_offload_daily (
  id bigserial primary key,
  transaction_date date not null,
  nas_id text not null,
  device_id bigint references devices(id) on delete cascade,
  total_sessions integer not null,
  count_of_users integer not null,
  rejects integer not null,
  total_gbs numeric(20,15) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- New unique constraint for aggregation
  unique(transaction_date, device_id)
);
```

#### `device_offload_scrape_log`
Audit trail for device scraping operations:

```sql
create table device_offload_scrape_log (
  id bigserial primary key,
  scraped_at timestamptz not null default now(),
  nas_id text not null,
  source_filename text,
  rows_parsed int,
  rows_upserted int,
  rows_changed int,
  success boolean not null default true,
  error_text text
);
```

## 🔧 Setup

### 1. Database Setup

You have two options for setting up the database schema:

#### Option A: Safe Migration (Recommended for existing projects)
```bash
# Connect to your Supabase database and run:
\i utils/supa-sql-migrate.txt
```

#### Option B: Destructive Reset (Only for new projects or when you want to start fresh)
```bash
# Connect to your Supabase database and run:
\i utils/supa-sql-destructive.txt
# Then paste the contents of supa-sql-migrate.txt below it
```

**Choose Option A if you have existing data you want to keep.**
**Choose Option B only if you're starting completely fresh.**

### V2 Migration Scripts

The new migration scripts include:
- **Parent/Child table structure** with `devices` and `device_offload_daily`
- **Proper permissions** for Supabase service role
- **Data aggregation support** with unique constraints
- **Foreign key relationships** for data integrity

### 2. Environment Variables

Ensure these environment variables are set:

```bash
# OKTA Authentication
OKTA_START_URL=https://your-company.okta.com
OKTA_EMAIL=your-email@company.com
OKTA_PASSWORD=your-password

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GitHub (for triggering workflows)
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_REPO=your-username/xnet-device-offload-scraper
```

## 🚀 **V2 Key Features**

### **Data Aggregation**
- **Multiple records per date** are automatically summed up
- **No duplicate dates** - unique constraint on `(transaction_date, device_id)`
- **Historical preservation** - never overwrites, always inserts new

### **Parent/Child Relationships**
- **`devices` table** manages device registry
- **`device_offload_daily` table** stores aggregated daily data
- **Automatic device creation** when scraping new NAS IDs
- **Foreign key integrity** with cascade deletes

### **Smart Update Logic**
- **Floating-point precision handling** prevents unnecessary updates
- **Change detection** only updates when data actually differs
- **Efficient database operations** with proper indexing

## 🎯 **Two Main Endpoints**

### **🔴 Endpoint 1: Trigger Scraping**
```bash
POST /api/trigger-scrape
Content-Type: application/json

{
  "nas_id": "bcb92300ae0c",
  "force_refresh": false
}
```

**What it does:**
- Triggers the scraper for a specific device
- Downloads device offload data from HUB portal
- Parses the CSV and uploads to database
- Returns detailed results

**Use cases:**
- On-demand scraping for specific devices
- Integration with external systems
- Manual data refresh

### **🔵 Endpoint 2: Query Database**
```bash
# Get all data for a device
GET /api/device-offload?nas_id=bcb92300ae0c

# Get last 7 days
GET /api/device-offload?nas_id=bcb92300ae0c&days=7

# Get specific date range
GET /api/device-offload?nas_id=bcb92300ae0c&start=2025-08-01&end=2025-08-31
```

**What it does:**
- Queries the database for device offload data
- Supports date filtering and ranges
- Returns summary statistics
- No scraping involved - just data retrieval

**Use cases:**
- Building dashboards
- Data analysis
- Monitoring device performance

## 🔄 **Scheduled Scraping**

### **Automatic Daily Scraping**
The system runs **automatically every day at 2 AM UTC** to scrape all configured devices.

### **Device Management**
```bash
# List configured devices
GET /api/manage-devices

# Add a device to scraping list
POST /api/manage-devices
{
  "nas_id": "newdevice123",
  "name": "Secondary Device",
  "priority": "medium"
}

# Remove a device from scraping list
DELETE /api/manage-devices
{
  "nas_id": "olddevice456"
}
```

### **Command Line Management**
```bash
# List devices
npm run device:list

# Add device
npm run device:add newdevice123 "Device Name"

# Remove device
npm run device:remove olddevice456

# Run scheduled scraping for all devices
npm run scrape:scheduled all

# Scrape specific device
npm run scrape:device bcb92300ae0c
```

## 🚀 **GitHub Actions Integration**

### **Manual Trigger**
1. Go to your repository on GitHub
2. Navigate to **Actions** → **Device Offload Scraper**
3. Click **Run workflow**
4. Enter the NAS ID you want to scrape
5. Click **Run workflow**

### **Scheduled Scraping**
1. Go to **Actions** → **Scheduled Device Offload Scraping**
2. Runs automatically every day at 2 AM UTC
3. Can be manually triggered with specific devices

### **API Trigger**
```bash
# Using the provided script
npm run trigger:github bcb92300ae0c

# Or directly with node
node scripts/trigger-github-action.js bcb92300ae0c
```

## 📊 **Data Format**

### **CSV Structure**
The scraper downloads data in this format:

```csv
Transaction Date,NAS-ID,Total Sessions,Count of Users,Rejects,Total GBs
2025-08-16,bcb92300ae0c,0,1,1,0
2025-08-15,bcb92300ae0c,102,82,8,0.11647830251604321
2025-08-14,bcb92300ae0c,3,4,2,0.006067438982427119
```

### **Parsed Data Structure**
After parsing, each record contains:

```javascript
{
  transaction_date: "2025-08-16",
  nas_id: "bcb92300ae0c",
  total_sessions: 0,
  count_of_users: 1,
  rejects: 1,
  total_gbs: 0
}
```

## 🧪 **Testing & Development**

### **Test Scripts**
```bash
# Run full test suite
npm run test:local

# Test specific functionality
npm run test:scrape bcb92300ae0c    # Test scraping
npm run test:query bcb92300ae0c 7   # Test database queries
npm run test:scheduled              # Test scheduled scraping
```

### **Development Commands**
```bash
# Parse CSV files
npm run parse:device

# Test database operations
npm run upsert:device

# Trigger GitHub workflows
npm run trigger:github
```

## 🔄 **Workflow Summary**

```
1. Configure devices in src/scheduledDeviceScrape.js
2. System automatically scrapes daily at 2 AM UTC
3. Use /api/trigger-scrape for on-demand scraping
4. Use /api/device-offload to query the data
5. Use /api/manage-devices to manage device list
```

## 🚨 **Troubleshooting**

### **Common Issues**
1. **Authentication Errors**: Verify OKTA credentials
2. **Navigation Errors**: Check if HUB portal structure changed
3. **Download Issues**: Multiple fallback methods included
4. **Database Errors**: Verify Supabase credentials and table structure

### **Debug Mode**
```javascript
// In src/scrapeDeviceOffload.js, change:
const browser = await chromium.launch({
  headless: false, // Change to false for debugging
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
```

## 🔐 **Security Considerations**

1. **Environment Variables**: Never commit credentials
2. **GitHub Token**: Use minimal required permissions
3. **Database Access**: Use service role keys securely
4. **API Endpoints**: Consider adding authentication

## 📈 **Monitoring**

### **Workflow Status**
- **Device Offload Scraper**: Manual triggers
- **Scheduled Device Offload Scraping**: Daily automatic runs

### **Database Logs**
```sql
SELECT * FROM device_offload_scrape_log 
ORDER BY scraped_at DESC 
LIMIT 10;
```

### **Data Quality**
```sql
SELECT 
  nas_id,
  COUNT(*) as records,
  MIN(transaction_date) as earliest_date,
  MAX(transaction_date) as latest_date
FROM device_offload_daily 
GROUP BY nas_id;
```

## 🚀 **Next Steps**

1. **Test the system** with your sample NAS ID
2. **Set up the database** using the SQL schema
3. **Configure environment variables**
4. **Add your devices** to the scraping list
5. **Deploy and test** both endpoints
6. **Monitor the scheduled scraping**

## 📞 **Support**

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Verify database connectivity
4. Test with a known working NAS ID first

---

**Note**: This system is designed to be **production-ready** and handles all edge cases while providing a clean, organized approach to device-specific offload scraping.
