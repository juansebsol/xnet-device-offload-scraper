#!/usr/bin/env node
// test-local-scraping.js
// Local testing script for device offload scraping
// This script tests the entire pipeline locally without affecting production
// Delete this file when you're done testing

const { runDeviceScrape } = require('./src/runDeviceScrape');
const { scrapeAllDevices } = require('./src/scheduledDeviceScrape');
const { getDeviceOffloadData, getDeviceOffloadSummary } = require('./src/upsertDeviceOffload');

// Test configuration
const TEST_DEVICES = [
  'bcb92300ae0c',  // Your sample device
  // Add more test devices here
];

const TEST_DAYS = 7; // How many days of data to query for testing

async function testLocalScraping() {
  console.log('🧪 LOCAL TESTING MODE - Device Offload Scraper');
  console.log('=' .repeat(60));
  console.log('⏰', new Date().toISOString());
  console.log('🎯 Test devices:', TEST_DEVICES.join(', '));
  console.log('📊 Test days:', TEST_DAYS);
  console.log('');

  try {
    // Test 1: Single device scraping
    console.log('🔴 TEST 1: Single Device Scraping');
    console.log('-' .repeat(40));
    
    for (const deviceId of TEST_DEVICES) {
      console.log(`\n📱 Testing device: ${deviceId}`);
      try {
        const result = await runDeviceScrape(deviceId);
        console.log(`   ✅ Success: ${result.upsertResult.totalUpserted} records upserted`);
        console.log(`   📁 File: ${result.scrapeResult.filename}`);
        console.log(`   📊 Parsed: ${result.parseResult.validRows} valid rows`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }

    // Test 2: Scheduled scraping simulation
    console.log('\n🔄 TEST 2: Scheduled Scraping Simulation');
    console.log('-' .repeat(40));
    try {
      const scheduledResult = await scrapeAllDevices();
      console.log(`   ✅ Scheduled scraping completed`);
      console.log(`   📱 Total devices: ${scheduledResult.totalDevices}`);
      console.log(`   ✅ Successful: ${scheduledResult.successful}`);
      console.log(`   ❌ Failed: ${scheduledResult.failed}`);
    } catch (error) {
      console.error(`   ❌ Scheduled scraping failed: ${error.message}`);
    }

    // Test 3: Database queries
    console.log('\n🔵 TEST 3: Database Queries');
    console.log('-' .repeat(40));
    
    for (const deviceId of TEST_DEVICES) {
      console.log(`\n📊 Testing queries for device: ${deviceId}`);
      
      try {
        // Test summary query
        const summary = await getDeviceOffloadSummary(deviceId, TEST_DAYS);
        console.log(`   📈 Summary (last ${TEST_DAYS} days):`);
        console.log(`      • Days analyzed: ${summary.days_analyzed}`);
        console.log(`      • Total GBs: ${summary.total_gbs.toFixed(3)}`);
        console.log(`      • Total sessions: ${summary.total_sessions}`);
        console.log(`      • Total users: ${summary.total_users}`);
        console.log(`      • Total rejects: ${summary.total_rejects}`);
        
        // Test data query
        const data = await getDeviceOffloadData(deviceId);
        console.log(`   📋 Data records: ${data.length}`);
        if (data.length > 0) {
          console.log(`   📅 Date range: ${data[data.length - 1].transaction_date} to ${data[0].transaction_date}`);
        }
        
      } catch (error) {
        console.error(`   ❌ Query failed: ${error.message}`);
      }
    }

    // Test 4: API endpoint simulation
    console.log('\n🌐 TEST 4: API Endpoint Simulation');
    console.log('-' .repeat(40));
    console.log('   📝 To test API endpoints, you can:');
    console.log('      • Deploy to Vercel and test live endpoints');
    console.log('      • Use curl or Postman to test:');
    console.log('');
    console.log('   🔴 Trigger scraping:');
    console.log('      curl -X POST /api/trigger-scrape \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"nas_id": "bcb92300ae0c"}\'');
    console.log('');
    console.log('   🔵 Query data:');
    console.log('      curl "/api/device-offload?nas_id=bcb92300ae0c&days=7"');
    console.log('');
    console.log('   ⚙️ Manage devices:');
    console.log('      curl -X POST /api/manage-devices \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"nas_id": "testdevice123", "name": "Test Device"}\'');

    console.log('\n🎉 LOCAL TESTING COMPLETED!');
    console.log('=' .repeat(60));
    console.log('📝 Next steps:');
    console.log('   1. Review the results above');
    console.log('   2. Check your Supabase database for new data');
    console.log('   3. Deploy to Vercel to test API endpoints');
    console.log('   4. Delete this test script when done');
    console.log('   5. Or keep it for future troubleshooting');

  } catch (error) {
    console.error('\n💥 FATAL ERROR during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test specific functions individually
async function testSingleFunction(functionName, ...args) {
  console.log(`🧪 Testing ${functionName}...`);
  try {
    switch (functionName) {
      case 'scrape':
        const deviceId = args[0] || TEST_DEVICES[0];
        const result = await runDeviceScrape(deviceId);
        console.log(`✅ Scraping successful: ${result.upsertResult.totalUpserted} records`);
        break;
        
      case 'query':
        const nasId = args[0] || TEST_DEVICES[0];
        const days = args[1] || TEST_DAYS;
        const summary = await getDeviceOffloadSummary(nasId, days);
        console.log(`✅ Query successful: ${summary.days_analyzed} days of data`);
        break;
        
      case 'scheduled':
        const scheduledResult = await scrapeAllDevices();
        console.log(`✅ Scheduled scraping: ${scheduledResult.successful}/${scheduledResult.totalDevices} devices`);
        break;
        
      default:
        console.log('❌ Unknown function. Use: scrape, query, or scheduled');
    }
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

// Main execution
if (require.main === module) {
  require('dotenv').config();
  
  const command = process.argv[2];
  
  if (!command) {
    // Run full test suite
    testLocalScraping();
  } else if (command === 'help') {
    console.log('🧪 Local Testing Script Usage:');
    console.log('');
    console.log('Full test suite:');
    console.log('  node test-local-scraping.js');
    console.log('');
    console.log('Test specific functions:');
    console.log('  node test-local-scraping.js scrape [device_id]');
    console.log('  node test-local-scraping.js query [device_id] [days]');
    console.log('  node test-local-scraping.js scheduled');
    console.log('');
    console.log('Examples:');
    console.log('  node test-local-scraping.js scrape bcb92300ae0c');
    console.log('  node test-local-scraping.js query bcb92300ae0c 30');
    console.log('  node test-local-scraping.js scheduled');
  } else {
    // Test specific function
    testSingleFunction(command, ...process.argv.slice(3));
  }
}

module.exports = { testLocalScraping, testSingleFunction };
