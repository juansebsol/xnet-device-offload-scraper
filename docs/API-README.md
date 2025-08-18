# 🔌 Device Offload Scraper API Documentation

**Base URL:** `https://xnet-device-offload-scraper.vercel.app`

---

## 📋 **Table of Contents**
- [Authentication](#authentication)
- [Endpoints Overview](#endpoints-overview)
- [1. Device Data Query](#1-device-data-query)
- [2. Daily Scrape List Management](#2-daily-scrape-list-management)
- [3. Manual Device Scraping](#3-manual-device-scraping)
- [Error Handling](#error-handling)
- [Response Formats](#response-formats)
- [Testing Examples](#testing-examples)

---

## 🔐 **Authentication**

Currently, no authentication is required. All endpoints are publicly accessible.

---

## 🎯 **Endpoints Overview**

| Endpoint | Method | Purpose | Description |
|----------|--------|---------|-------------|
| `/api/device-offload` | GET | Query Data | Get device offload data with filtering |
| `/api/manage-devices` | GET | List Devices | Show devices on daily scrape list |
| `/api/manage-devices` | POST | Add Device | Add device to daily scrape list |
| `/api/manage-devices` | DELETE | Remove Device | Remove device from daily scrape list |
| `/api/trigger-scrape` | POST | Manual Scrape | Trigger manual scraping for any device |

---

## 📊 **1. Device Data Query**

**Endpoint:** `GET /api/device-offload`

**Purpose:** Retrieve device offload data with optional filtering by date range.

### **Query Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `nas_id` | string | ✅ Yes | Device NAS ID to query | `bcb92300ae0c` |
| `days` | number | ❌ No | Last N days of data | `7`, `30`, `90` |
| `start` | date | ❌ No | Start date (YYYY-MM-DD) | `2024-01-01` |
| `end` | date | ❌ No | End date (YYYY-MM-DD) | `2024-01-15` |

### **Usage Examples**

#### **Get All Data for a Device**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=bcb92300ae0c
```

#### **Get Last 7 Days**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=bcb92300ae0c&days=7
```

#### **Get Specific Date Range**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=bcb92300ae0c&start=2024-01-01&end=2024-01-15
```

### **Response Format**
```json
{
  "count": 8,
  "data": [
    {
      "id": 1,
      "transaction_date": "2024-01-15",
      "device_id": 1,
      "total_sessions": 2150,
      "count_of_users": 1240,
      "rejects": 8,
      "total_gbs": 180.25,
      "devices": {
        "nas_id": "bcb92300ae0c",
        "device_name": "AT&T Wi-Fi Services - [FLKW]"
      }
    }
  ]
}
```

---

## 📋 **2. Daily Scrape List Management**

**Endpoint:** `GET /api/manage-devices`

**Purpose:** View devices currently on the daily automatic scraping list.

### **No Parameters Required**

### **Usage**
```
https://xnet-device-offload-scraper.vercel.app/api/manage-devices
```

### **Response Format**
```json
{
  "count": 2,
  "devices": [
    {
      "id": 1,
      "nas_id": "bcb92300ae0c",
      "device_name": "AT&T Wi-Fi Services - [FLKW]",
      "description": "Florida location device",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "added_to_tracked_at": "2024-01-15T10:00:00Z",
      "last_scraped": "2024-01-15T14:00:00Z",
      "tracking_notes": "Primary monitoring device",
      "summary": {
        "total_sessions": 15420,
        "total_users": 8920,
        "total_rejects": 45,
        "total_gbs": 1250.75
      },
      "record_count": 8
    }
  ],
  "message": "Showing only devices on daily scrape list"
}
```

---

## ➕ **3. Add Device to Daily Scrape List**

**Endpoint:** `POST /api/manage-devices`

**Purpose:** Add a device to the daily automatic scraping list.

### **Request Body**
```json
{
  "nas_id": "string (required)",
  "device_name": "string (optional)",
  "description": "string (optional)",
  "notes": "string (optional)"
}
```

### **Field Descriptions**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nas_id` | string | ✅ Yes | Device's unique NAS ID |
| `device_name` | string | ❌ No | Human-readable device name |
| `description` | string | ❌ No | Device description |
| `notes` | string | ❌ No | Tracking notes |

### **Usage Examples**

#### **Browser Console (JavaScript)**
```javascript
fetch('https://xnet-device-offload-scraper.vercel.app/api/manage-devices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nas_id: 'newdevice123',
    device_name: 'New Office Device',
    description: 'Recently added office location',
    notes: 'Monitor performance for first 30 days'
  })
})
.then(response => response.json())
.then(data => console.log('Success:', data));
```

#### **cURL (Terminal)**
```bash
curl -X POST "https://xnet-device-offload-scraper.vercel.app/api/manage-devices" \
  -H "Content-Type: application/json" \
  -d '{
    "nas_id": "newdevice123",
    "device_name": "New Office Device",
    "description": "Recently added office location",
    "notes": "Monitor performance for first 30 days"
  }'
```

### **Response Format**
```json
{
  "message": "Device added to daily scrape list successfully",
  "device": {
    "nas_id": "newdevice123",
    "device_name": "New Office Device",
    "description": "Recently added office location",
    "added_to_tracked_at": "2024-01-15T15:30:00Z",
    "notes": "Monitor performance for first 30 days"
  }
}
```

---

## ❌ **4. Remove Device from Daily Scrape List**

**Endpoint:** `DELETE /api/manage-devices`

**Purpose:** Remove a device from the daily automatic scraping list (device data remains in database).

### **Query Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `nas_id` | string | ✅ Yes | Device NAS ID to remove | `bcb92300ae0c` |

### **Usage Examples**

#### **Browser URL (Direct)**
```
https://xnet-device-offload-scraper.vercel.app/api/manage-devices?nas_id=bcb92300ae0c
```
*Note: DELETE requests in browser may not work properly - use other methods below*

#### **Browser Console (JavaScript)**
```javascript
fetch('https://xnet-device-offload-scraper.vercel.app/api/manage-devices?nas_id=bcb92300ae0c', {
  method: 'DELETE'
})
.then(response => response.json())
.then(data => console.log('Success:', data));
```

#### **cURL (Terminal)**
```bash
curl -X DELETE "https://xnet-device-offload-scraper.vercel.app/api/manage-devices?nas_id=bcb92300ae0c"
```

### **Response Format**
```json
{
  "message": "Device bcb92300ae0c removed from daily scrape list successfully",
  "note": "Device data remains in database and can be manually scraped"
}
```

---

## 🔄 **5. Manual Device Scraping**

**Endpoint:** `POST /api/trigger-scrape`

**Purpose:** Manually trigger scraping for any device (tracked or untracked).

### **Request Body**
```json
{
  "nas_id": "string (required)"
}
```

### **Field Descriptions**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nas_id` | string | ✅ Yes | Device's NAS ID to scrape |

### **Usage Examples**

#### **Browser Console (JavaScript)**
```javascript
fetch('https://xnet-device-offload-scraper.vercel.app/api/trigger-scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nas_id: 'bcb92300ae0c'
  })
})
.then(response => response.json())
.then(data => console.log('Scrape triggered:', data));
```

#### **cURL (Terminal)**
```bash
curl -X POST "https://xnet-device-offload-scraper.vercel.app/api/trigger-scrape" \
  -H "Content-Type: application/json" \
  -d '{"nas_id": "bcb92300ae0c"}'
```

### **Response Format**
```json
{
  "success": true,
  "message": "Manual scrape triggered successfully",
  "details": {
    "nas_id": "bcb92300ae0c",
    "scrape_id": "manual_20240115_153000",
    "status": "queued"
  }
}
```

---

## 🚨 **Error Handling**

### **Common HTTP Status Codes**

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| `200` | Success | Request completed successfully |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Missing required parameters |
| `404` | Not Found | Device or resource not found |
| `409` | Conflict | Device already exists |
| `500` | Internal Error | Server-side error |

### **Error Response Format**
```json
{
  "error": "Error description message"
}
```

### **Common Error Messages**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `nas_id is required` | Missing nas_id parameter | Include nas_id in request |
| `Device with this NAS ID already exists` | Trying to create duplicate device | Use existing device or different NAS ID |
| `Device does not exist in devices table` | Referencing non-existent device | Create device first or check NAS ID |
| `Database error` | Server-side database issue | Check server logs or try again later |

---

## 📊 **Response Formats**

### **Data Response Structure**
```json
{
  "count": "number of records",
  "data": ["array of records"],
  "message": "optional status message"
}
```

### **Success Response Structure**
```json
{
  "message": "Success description",
  "details": "Additional information if applicable"
}
```

---

## 🧪 **Testing Examples**

### **Quick Test URLs (GET requests only)**

#### **Check Daily Scrape List**
```
https://xnet-device-offload-scraper.vercel.app/api/manage-devices
```

#### **View Device Data**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=bcb92300ae0c
```

#### **Get Last 30 Days**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=bcb92300ae0c&days=30
```

### **Complete Workflow Example**

#### **1. Add New Device to Daily List**
```javascript
// Add device to daily scraping
fetch('https://xnet-device-offload-scraper.vercel.app/api/manage-devices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nas_id: 'newdevice456',
    device_name: 'New Office Location',
    description: 'Recently opened office',
    notes: 'Monitor performance for first 30 days'
  })
})
.then(response => response.json())
.then(data => console.log('Device added:', data));
```

#### **2. Verify Device Added**
```
https://xnet-device-offload-scraper.vercel.app/api/manage-devices
```

#### **3. Manually Trigger First Scrape**
```javascript
fetch('https://xnet-device-offload-scraper.vercel.app/api/trigger-scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nas_id: 'newdevice456' })
})
.then(response => response.json())
.then(data => console.log('Scrape triggered:', data));
```

#### **4. Check Data After Scrape**
```
https://xnet-device-offload-scraper.vercel.app/api/device-offload?nas_id=newdevice456
```

---

## 🔧 **Development & Testing Tools**

### **Recommended Tools**
- **Postman** - Professional API testing
- **Browser Console** - Quick JavaScript testing
- **cURL** - Command line testing
- **Simple HTML Form** - User-friendly testing

### **Browser Console Quick Commands**
```javascript
// Quick function to add device
function addDevice(nasId, name, desc, notes) {
  return fetch('/api/manage-devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nas_id: nasId, device_name: name, description: desc, notes })
  }).then(r => r.json());
}

// Quick function to scrape device
function scrapeDevice(nasId) {
  return fetch('/api/trigger-scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nas_id: nasId })
  }).then(r => r.json());
}

// Usage
addDevice('test123', 'Test Device', 'For testing', 'Test notes');
scrapeDevice('test123');
```

---

## 📞 **Support & Issues**

For API issues or questions:
1. Check the error messages in responses
2. Verify all required parameters are included
3. Ensure NAS IDs are correct
4. Check server status if getting 500 errors

---

**Last Updated:** January 2024  
**API Version:** V2  
**Base URL:** `https://xnet-device-offload-scraper.vercel.app`
