#!/usr/bin/env node

const { scrapeDeviceOffloadDate } = require('../src/scrapeDeviceOffloadDate');

async function main() {
  const nasId = process.argv[2];
  const startDate = process.argv[3];
  const endDate = process.argv[4];
  const deviceType = process.argv[5] || '';

  if (!nasId || !startDate || !endDate) {
    console.error('Usage: node scripts/test-custom-time-scrape-ui.js <NAS_ID> <START_DATE> <END_DATE> [DEVICE_TYPE]');
    console.error('Example: node scripts/test-custom-time-scrape-ui.js 942a6f5ae894 2026-05-01 2026-05-07 cambium');
    process.exit(1);
  }

  console.log('🧪 Custom time scrape UI test');
  console.log(`🎯 NAS ID: ${nasId}`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  if (deviceType) {
    console.log(`📱 Device Type Override: ${deviceType}`);
  }
  console.log('👁️ Running in headed mode for UI troubleshooting');
  console.log('💡 This script only performs the scrape/download flow and does not upsert to the database');

  const result = await scrapeDeviceOffloadDate(nasId, startDate, endDate, {
    deviceType,
    headless: false,
    slowMo: 300,
  });

  console.log('✅ Custom time UI scrape completed');
  console.log(`📁 Downloaded file: ${result.filename}`);
  console.log(`🧭 Lookup mode: ${result.lookupMode}`);
  console.log(`🧭 Scrape NAS ID: ${result.scrapeNasId}`);
}

if (require.main === module) {
  require('dotenv').config();

  main().catch((error) => {
    console.error('❌ Custom time UI scrape failed:', error.message);
    process.exit(1);
  });
}
