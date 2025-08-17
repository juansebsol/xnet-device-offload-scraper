// src/scheduledDeviceScrape.js
// Scheduled scraping for multiple devices
// Can be run periodically to keep device data up to date

const { runDeviceScrape } = require('./runDeviceScrape');

// Configuration: List of devices to scrape
const DEVICES_TO_SCRAPE = [
  'bcb92300ae0c',  // Your sample device
  // Add more NAS IDs here as needed
  // 'device2',
  // 'device3',
];

// Optional: Device-specific configurations
const DEVICE_CONFIGS = {
  'bcb92300ae0c': {
    name: 'Primary Device',
    priority: 'high',
    scrape_frequency: 'daily'
  }
  // Add more device configs as needed
};

async function scrapeAllDevices() {
  console.log('🚀 Starting scheduled device offload scraping...');
  console.log(`📱 Devices to scrape: ${DEVICES_TO_SCRAPE.length}`);
  console.log('⏰', new Date().toISOString());
  console.log('');

  const results = [];
  const errors = [];

  for (let i = 0; i < DEVICES_TO_SCRAPE.length; i++) {
    const nasId = DEVICES_TO_SCRAPE[i];
    const deviceConfig = DEVICE_CONFIGS[nasId] || {};
    
    console.log(`\n📱 [${i + 1}/${DEVICES_TO_SCRAPE.length}] Processing device: ${nasId}`);
    if (deviceConfig.name) {
      console.log(`   📝 Name: ${deviceConfig.name}`);
    }
    if (deviceConfig.priority) {
      console.log(`   🎯 Priority: ${deviceConfig.priority}`);
    }

    try {
      const result = await runDeviceScrape(nasId);
      results.push({
        nasId,
        success: true,
        ...result
      });
      console.log(`   ✅ Completed successfully`);
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors.push({
        nasId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Add delay between devices to avoid overwhelming the system
    if (i < DEVICES_TO_SCRAPE.length - 1) {
      console.log('   ⏳ Waiting 5 seconds before next device...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEDULED SCRAPING SUMMARY');
  console.log('='.repeat(60));
  console.log(`🎯 Total devices: ${DEVICES_TO_SCRAPE.length}`);
  console.log(`✅ Successful: ${results.length}`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);

  if (results.length > 0) {
    console.log('\n✅ SUCCESSFUL DEVICES:');
    results.forEach(result => {
      const config = DEVICE_CONFIGS[result.nasId] || {};
      const name = config.name ? ` (${config.name})` : '';
      console.log(`   • ${result.nasId}${name}: ${result.upsertResult.totalUpserted} records`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ FAILED DEVICES:');
    errors.forEach(error => {
      const config = DEVICE_CONFIGS[error.nasId] || {};
      const name = config.name ? ` (${config.name})` : '';
      console.log(`   • ${error.nasId}${name}: ${error.error}`);
    });
  }

  // Return results for programmatic use
  return {
    totalDevices: DEVICES_TO_SCRAPE.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors,
    timestamp: new Date().toISOString()
  };
}

// Function to scrape a specific device
async function scrapeSpecificDevice(nasId) {
  if (!DEVICES_TO_SCRAPE.includes(nasId)) {
    throw new Error(`Device ${nasId} is not in the scheduled scraping list`);
  }

  console.log(`🎯 Scraping specific device: ${nasId}`);
  return await runDeviceScrape(nasId);
}

// Function to add a new device to the scraping list
function addDeviceToScrapeList(nasId, config = {}) {
  if (DEVICES_TO_SCRAPE.includes(nasId)) {
    console.warn(`Device ${nasId} is already in the scraping list`);
    return false;
  }

  DEVICES_TO_SCRAPE.push(nasId);
  if (Object.keys(config).length > 0) {
    DEVICE_CONFIGS[nasId] = config;
  }

  console.log(`✅ Added device ${nasId} to scraping list`);
  return true;
}

// Function to remove a device from the scraping list
function removeDeviceFromScrapeList(nasId) {
  const index = DEVICES_TO_SCRAPE.indexOf(nasId);
  if (index === -1) {
    console.warn(`Device ${nasId} is not in the scraping list`);
    return false;
  }

  DEVICES_TO_SCRAPE.splice(index, 1);
  delete DEVICE_CONFIGS[nasId];

  console.log(`✅ Removed device ${nasId} from scraping list`);
  return true;
}

// convenience direct-run
if (require.main === module) {
  require('dotenv').config();
  const command = process.argv[2];
  const nasId = process.argv[3];

  if (!command) {
    console.log('📝 Usage: node src/scheduledDeviceScrape.js <command> [nas_id]');
    console.log('💡 Commands:');
    console.log('  all                    - Scrape all configured devices');
    console.log('  device <nas_id>        - Scrape a specific device');
    console.log('  add <nas_id> [name]    - Add device to scraping list');
    console.log('  remove <nas_id>        - Remove device from scraping list');
    console.log('  list                   - Show current device list');
    console.log('💡 Examples:');
    console.log('  node src/scheduledDeviceScrape.js all');
    console.log('  node src/scheduledDeviceScrape.js device bcb92300ae0c');
    console.log('  node src/scheduledDeviceScrape.js add device2 "Secondary Device"');
    process.exit(1);
  }

  (async () => {
    try {
      switch (command) {
        case 'all':
          await scrapeAllDevices();
          break;
          
        case 'device':
          if (!nasId) {
            console.error('❌ NAS ID required for device command');
            process.exit(1);
          }
          await scrapeSpecificDevice(nasId);
          break;
          
        case 'add':
          if (!nasId) {
            console.error('❌ NAS ID required for add command');
            process.exit(1);
          }
          const name = process.argv[4];
          const config = name ? { name } : {};
          addDeviceToScrapeList(nasId, config);
          break;
          
        case 'remove':
          if (!nasId) {
            console.error('❌ NAS ID required for remove command');
            process.exit(1);
          }
          removeDeviceFromScrapeList(nasId);
          break;
          
        case 'list':
          console.log('📱 Devices configured for scheduled scraping:');
          DEVICES_TO_SCRAPE.forEach((device, index) => {
            const config = DEVICE_CONFIGS[device] || {};
            const name = config.name ? ` (${config.name})` : '';
            const priority = config.priority ? ` [${config.priority}]` : '';
            console.log(`   ${index + 1}. ${device}${name}${priority}`);
          });
          break;
          
        default:
          console.error('❌ Unknown command:', command);
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  scrapeAllDevices,
  scrapeSpecificDevice,
  addDeviceToScrapeList,
  removeDeviceFromScrapeList,
  DEVICES_TO_SCRAPE,
  DEVICE_CONFIGS
};
