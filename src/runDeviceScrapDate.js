// src/runDeviceScrapDate.js
// Main runner for device offload scraping WITH CUSTOM DATE RANGE
// Wrapper for scrapeDeviceOffloadDate.js with full pipeline processing

const { scrapeDeviceOffloadDate } = require('./scrapeDeviceOffloadDate');
const { parseDeviceCsv } = require('./parseDeviceCsv');
const { upsertDeviceOffload } = require('./upsertDeviceOffload');

async function runDeviceScrapDate(nasId, startDate, endDate) {
  if (!nasId) {
    throw new Error('NAS ID is required');
  }
  if (!startDate || !endDate) {
    throw new Error('Both startDate and endDate are required');
  }

  console.log(`🚀 Starting device offload scrape with date range for NAS ID: ${nasId}`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  console.log('⏰', new Date().toISOString());

  try {
    // Step 1: Scrape the data with custom date range
    console.log('\n📱 Step 1: Scraping device offload data with date range...');
    const scrapeResult = await scrapeDeviceOffloadDate(nasId, startDate, endDate);
    console.log('✅ Date range scraping completed successfully');

    // Step 2: Parse the CSV
    console.log('\n📊 Step 2: Parsing CSV data...');
    const parseResult = parseDeviceCsv(scrapeResult.csvText);
    console.log(`✅ Parsed ${parseResult.validRows} valid rows from CSV`);
    console.log(`🔄 Aggregated into ${parseResult.aggregatedRows} unique date/device records`);

    if (parseResult.errors.length > 0) {
      console.warn(`⚠️ ${parseResult.errors.length} parsing errors encountered`);
      parseResult.errors.forEach(error => {
        console.warn(`  Line ${error.line}: ${error.error}`);
      });
    }

    if (parseResult.validRows === 0) {
      throw new Error('No valid data found in CSV');
    }

    // Step 3: Upsert to database
    console.log('\n💾 Step 3: Uploading to database...');
    const upsertResult = await upsertDeviceOffload(
      parseResult.data,
      nasId,
      scrapeResult.filename
    );
    console.log('✅ Database upload completed successfully');

    // Summary
    console.log('\n🎉 Device offload scrape with date range completed successfully!');
    console.log(`🎯 NAS ID: ${nasId}`);
    console.log(`📅 Date Range: ${startDate} to ${endDate}`);
    console.log(`📊 Records processed: ${upsertResult.totalProcessed}`);
    console.log(`✅ Records upserted: ${upsertResult.totalUpserted}`);
    console.log(`🔄 Records changed: ${upsertResult.totalChanged}`);
    console.log(`❌ Errors: ${upsertResult.errors.length}`);
    console.log(`📁 File: ${scrapeResult.filename}`);

    return {
      success: true,
      nasId,
      startDate,
      endDate,
      scrapeResult,
      parseResult,
      upsertResult
    };

  } catch (error) {
    console.error('\n❌ Device offload scrape with date range failed:', error.message);
    throw error;
  }
}

// convenience direct-run
if (require.main === module) {
  require('dotenv').config();
  const nasId = process.argv[2];
  const startDate = process.argv[3];
  const endDate = process.argv[4];
  
  if (!nasId) {
    console.error('❌ Usage: node src/runDeviceScrapDate.js <NAS_ID> <START_DATE> <END_DATE>');
    console.log('💡 Example: node src/runDeviceScrapDate.js bcb92300ae0c 2025-07-01 2025-07-30');
    process.exit(1);
  }
  
  if (!startDate || !endDate) {
    console.error('❌ Both start date and end date are required');
    console.error('   Format: YYYY-MM-DD');
    console.log('💡 Example: node src/runDeviceScrapDate.js bcb92300ae0c 2025-07-01 2025-07-30');
    process.exit(1);
  }

  runDeviceScrapDate(nasId, startDate, endDate)
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { runDeviceScrapDate };
