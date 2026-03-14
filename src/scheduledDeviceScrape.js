// src/scheduledDeviceScrape.js
// Scheduled scraping orchestration backed by tracked_devices in Supabase.

const { runDeviceScrape } = require('./runDeviceScrape');
const { supabase } = require('./supabase');

const DEFAULT_DELAY_MS = 5000;
const DEFAULT_BATCH_SIZE = 10;

function parseDevicesCsv(devicesCsv = '') {
  return String(devicesCsv)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function fetchTrackedDevices() {
  const { data, error } = await supabase
    .from('tracked_devices')
    .select(`
      nas_id,
      notes,
      added_to_tracked_at,
      last_scraped,
      devices!inner(device_name)
    `)
    .eq('is_active', true)
    .order('added_to_tracked_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tracked devices: ${error.message}`);
  }

  return (data || []).map((row) => ({
    nas_id: row.nas_id,
    device_name: row.devices?.device_name || `Device ${row.nas_id}`,
    notes: row.notes,
    added_to_tracked_at: row.added_to_tracked_at,
    last_scraped: row.last_scraped,
  }));
}

async function ensureDeviceExists(nasId, deviceName) {
  const { data: existingDevice, error: selectError } = await supabase
    .from('devices')
    .select('id')
    .eq('nas_id', nasId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check device record: ${selectError.message}`);
  }

  if (existingDevice) {
    return existingDevice.id;
  }

  const { data: createdDevice, error: insertError } = await supabase
    .from('devices')
    .insert({
      nas_id: nasId,
      device_name: deviceName || `Device ${nasId}`,
      is_active: true,
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create device record: ${insertError.message}`);
  }

  return createdDevice.id;
}

async function markTrackedDeviceScraped(nasId) {
  const { error } = await supabase
    .from('tracked_devices')
    .update({ last_scraped: new Date().toISOString() })
    .eq('nas_id', nasId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to update last_scraped for ${nasId}: ${error.message}`);
  }
}

async function addDeviceToScrapeList(nasId, config = {}) {
  const deviceName = config.name || `Device ${nasId}`;
  await ensureDeviceExists(nasId, deviceName);

  const { data: existingTracked, error: selectError } = await supabase
    .from('tracked_devices')
    .select('id, is_active')
    .eq('nas_id', nasId)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check tracked device: ${selectError.message}`);
  }

  if (existingTracked) {
    if (existingTracked.is_active) {
      console.warn(`Device ${nasId} is already active in tracked_devices`);
      return false;
    }

    const { error: reactivateError } = await supabase
      .from('tracked_devices')
      .update({
        is_active: true,
        notes: config.notes || null,
        added_to_tracked_at: new Date().toISOString(),
      })
      .eq('id', existingTracked.id);

    if (reactivateError) {
      throw new Error(`Failed to reactivate tracked device: ${reactivateError.message}`);
    }

    console.log(`✅ Reactivated device ${nasId} in tracked_devices`);
    return true;
  }

  const { error: insertError } = await supabase
    .from('tracked_devices')
    .insert({
      nas_id: nasId,
      notes: config.notes || null,
      is_active: true,
    });

  if (insertError) {
    throw new Error(`Failed to add tracked device: ${insertError.message}`);
  }

  console.log(`✅ Added device ${nasId} to tracked_devices`);
  return true;
}

async function removeDeviceFromScrapeList(nasId) {
  const { error } = await supabase
    .from('tracked_devices')
    .update({ is_active: false })
    .eq('nas_id', nasId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to deactivate tracked device: ${error.message}`);
  }

  console.log(`✅ Deactivated device ${nasId} in tracked_devices`);
  return true;
}

async function getDevicesToScrape(overrideDevices = []) {
  const explicitDevices = overrideDevices.filter(Boolean);
  if (explicitDevices.length > 0) {
    return explicitDevices;
  }

  const trackedDevices = await fetchTrackedDevices();
  return trackedDevices.map((device) => device.nas_id);
}

function buildBatchManifest(devices, batchSize = DEFAULT_BATCH_SIZE) {
  const safeBatchSize = Math.max(1, Number(batchSize) || DEFAULT_BATCH_SIZE);
  return chunkArray(devices, safeBatchSize).map((batchDevices, index) => ({
    batch_index: index + 1,
    device_count: batchDevices.length,
    devices_csv: batchDevices.join(','),
  }));
}

async function scrapeDevicesSequentially(devices, options = {}) {
  const delayMs = Number(options.delayMs ?? DEFAULT_DELAY_MS);
  const label = options.label || 'scheduled';

  console.log(`🚀 Starting ${label} device offload scraping...`);
  console.log(`📱 Devices to scrape: ${devices.length}`);
  console.log('⏰', new Date().toISOString());
  console.log('');

  const results = [];
  const errors = [];

  for (let i = 0; i < devices.length; i++) {
    const nasId = devices[i];

    console.log(`\n📱 [${i + 1}/${devices.length}] Processing device: ${nasId}`);

    try {
      const result = await runDeviceScrape(nasId);
      await markTrackedDeviceScraped(nasId);

      results.push({
        nasId,
        success: true,
        ...result,
      });
      console.log('   ✅ Completed successfully');
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      errors.push({
        nasId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    if (delayMs > 0 && i < devices.length - 1) {
      console.log(`   ⏳ Waiting ${delayMs}ms before next device...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEDULED SCRAPING SUMMARY');
  console.log('='.repeat(60));
  console.log(`🎯 Total devices: ${devices.length}`);
  console.log(`✅ Successful: ${results.length}`);
  console.log(`❌ Failed: ${errors.length}`);
  console.log(`⏰ Completed at: ${new Date().toISOString()}`);

  return {
    totalDevices: devices.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors,
    timestamp: new Date().toISOString(),
  };
}

async function scrapeAllDevices(options = {}) {
  const devices = await getDevicesToScrape(options.overrideDevices || []);
  return scrapeDevicesSequentially(devices, {
    delayMs: options.delayMs,
    label: options.overrideDevices?.length ? 'manual override' : 'tracked-devices',
  });
}

async function scrapeSpecificDevice(nasId) {
  if (!nasId) {
    throw new Error('NAS ID is required');
  }

  console.log(`🎯 Scraping specific device: ${nasId}`);
  const result = await runDeviceScrape(nasId);
  await markTrackedDeviceScraped(nasId);
  return result;
}

async function listTrackedDevices() {
  const devices = await fetchTrackedDevices();
  console.log('📱 Active tracked devices:');
  devices.forEach((device, index) => {
    const details = [];
    if (device.device_name) details.push(device.device_name);
    if (device.last_scraped) details.push(`last scraped ${device.last_scraped}`);
    console.log(`   ${index + 1}. ${device.nas_id}${details.length ? ` (${details.join(' | ')})` : ''}`);
  });
  console.log(`\nTotal active devices: ${devices.length}`);
  return devices;
}

// convenience direct-run
if (require.main === module) {
  require('dotenv').config();
  const command = process.argv[2];

  if (!command) {
    console.log('📝 Usage: node src/scheduledDeviceScrape.js <command> [args]');
    console.log('💡 Commands:');
    console.log('  all [devices_csv] [delay_ms]   - Scrape tracked devices or manual override list');
    console.log('  batch <devices_csv> [delay_ms] - Scrape one batch sequentially');
    console.log('  manifest [batch_size] [devices_csv] - Print JSON batch manifest');
    console.log('  device <nas_id>                - Scrape a specific device');
    console.log('  add <nas_id> [name]            - Add device to tracked_devices');
    console.log('  remove <nas_id>                - Deactivate device in tracked_devices');
    console.log('  list                           - Show active tracked devices');
    process.exit(1);
  }

  (async () => {
    try {
      switch (command) {
        case 'all': {
          const overrideDevices = parseDevicesCsv(process.argv[3] || '');
          const delayMs = process.argv[4] ? Number(process.argv[4]) : DEFAULT_DELAY_MS;
          await scrapeAllDevices({ overrideDevices, delayMs });
          break;
        }

        case 'batch': {
          const batchDevices = parseDevicesCsv(process.argv[3] || '');
          if (batchDevices.length === 0) {
            throw new Error('batch command requires a comma-separated devices list');
          }
          const delayMs = process.argv[4] ? Number(process.argv[4]) : DEFAULT_DELAY_MS;
          await scrapeDevicesSequentially(batchDevices, {
            delayMs,
            label: `batch ${process.argv[3]}`,
          });
          break;
        }

        case 'manifest': {
          const batchSize = process.argv[3] ? Number(process.argv[3]) : DEFAULT_BATCH_SIZE;
          const overrideDevices = parseDevicesCsv(process.argv[4] || '');
          const devices = await getDevicesToScrape(overrideDevices);
          process.stdout.write(JSON.stringify(buildBatchManifest(devices, batchSize)));
          break;
        }

        case 'device': {
          const nasId = process.argv[3];
          if (!nasId) {
            throw new Error('NAS ID required for device command');
          }
          await scrapeSpecificDevice(nasId);
          break;
        }

        case 'add': {
          const nasId = process.argv[3];
          if (!nasId) {
            throw new Error('NAS ID required for add command');
          }
          const name = process.argv[4];
          await addDeviceToScrapeList(nasId, { name });
          break;
        }

        case 'remove': {
          const nasId = process.argv[3];
          if (!nasId) {
            throw new Error('NAS ID required for remove command');
          }
          await removeDeviceFromScrapeList(nasId);
          break;
        }

        case 'list':
          await listTrackedDevices();
          break;

        default:
          throw new Error(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  fetchTrackedDevices,
  getDevicesToScrape,
  buildBatchManifest,
  scrapeDevicesSequentially,
  scrapeAllDevices,
  scrapeSpecificDevice,
  addDeviceToScrapeList,
  removeDeviceFromScrapeList,
  listTrackedDevices,
};
