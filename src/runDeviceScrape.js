// src/runDeviceScrape.js
// Main runner for device offload scraping
// Replaces the old runOnce.js for overall offload

const { scrapeDeviceOffload } = require('./scrapeDeviceOffload');
const { parseDeviceCsv } = require('./parseDeviceCsv');
const { upsertDeviceOffload } = require('./upsertDeviceOffload');

async function runDeviceScrape(nasId, options = {}) {
  if (!nasId) {
    throw new Error('NAS ID is required');
  }

  const { startDate, endDate } = options;
  const useCustomDateRange = startDate && endDate;

  console.log(`🚀 Starting device offload scrape for NAS ID: ${nasId}`);
  if (useCustomDateRange) {
    console.log(`📅 Custom Date Range: ${startDate} to ${endDate}`);
  } else {
    console.log('📅 Using default date range');
  }
  console.log('⏰', new Date().toISOString());

  try {
    // Step 1: Scrape the data
    console.log('\n📱 Step 1: Scraping device offload data...');
    const scrapeResult = await scrapeDeviceOffload(nasId, options);
    const canonicalNasId = scrapeResult.nasId || nasId;
    console.log('✅ Scraping completed successfully');

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
      canonicalNasId,
      scrapeResult.filename
    );
    console.log('✅ Database upload completed successfully');

    // Summary
    console.log('\n🎉 Device offload scrape completed successfully!');
    console.log(`🎯 NAS ID: ${canonicalNasId}`);
    console.log(`📊 Records processed: ${upsertResult.totalProcessed}`);
    console.log(`✅ Records upserted: ${upsertResult.totalUpserted}`);
    console.log(`🔄 Records changed: ${upsertResult.totalChanged}`);
    console.log(`❌ Errors: ${upsertResult.errors.length}`);
    console.log(`📁 File: ${scrapeResult.filename}`);

    return {
      success: true,
      nasId: canonicalNasId,
      scrapeResult,
      parseResult,
      upsertResult
    };

  } catch (error) {
    console.error('\n❌ Device offload scrape failed:', error.message);
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
    console.error('❌ Usage: node src/runDeviceScrape.js <NAS_ID> [START_DATE] [END_DATE]');
    console.log('💡 Example: node src/runDeviceScrape.js bcb92300ae0c 2025-10-25 2025-10-30');
    console.log('💡 Default: node src/runDeviceScrape.js bcb92300ae0c');
    process.exit(1);
  }

  const options = {};
  if (startDate && endDate) {
    options.startDate = startDate;
    options.endDate = endDate;
  }

  runDeviceScrape(nasId, options)
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = { runDeviceScrape };
