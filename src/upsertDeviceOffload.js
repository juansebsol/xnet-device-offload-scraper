// src/upsertDeviceOffload.js
// Upsert device offload data into the device_offload_daily table
// - Handles both insert and update operations
// - Prevents duplicates using composite unique constraint
// - Logs operations for audit trail

const { supabase } = require('./supabase');

/**
 * Upsert device offload data into the database
 * @param {Array} deviceData - Array of parsed device offload records
 * @param {string} nasId - The NAS ID being processed
 * @param {string} sourceFilename - Original filename for audit trail
 * @returns {Object} Results of the upsert operation
 */
async function upsertDeviceOffload(deviceData, nasId, sourceFilename) {
  if (!deviceData || !Array.isArray(deviceData) || deviceData.length === 0) {
    throw new Error('Device data is required and must be a non-empty array');
  }

  if (!nasId) {
    throw new Error('NAS ID is required');
  }

  console.log(`🔄 Starting upsert for NAS ID: ${nasId}`);
  console.log(`📊 Processing ${deviceData.length} records...`);

  let totalUpserted = 0;
  let totalChanged = 0;
  let errors = [];

  try {
    // Process each record individually to handle errors gracefully
    for (const record of deviceData) {
      try {
        const result = await upsertSingleRecord(record);
        if (result.upserted) totalUpserted++;
        if (result.changed) totalChanged++;
      } catch (error) {
        console.error(`❌ Error upserting record for ${record.transaction_date}:`, error.message);
        errors.push({
          date: record.transaction_date,
          error: error.message
        });
      }
    }

    // Log the operation
    await logDeviceOffloadScrape(nasId, sourceFilename, deviceData.length, totalUpserted, totalChanged, true);

    console.log(`✅ Upsert completed successfully!`);
    console.log(`📊 Total records processed: ${deviceData.length}`);
    console.log(`✅ Records upserted: ${totalUpserted}`);
    console.log(`🔄 Records changed: ${totalChanged}`);
    console.log(`❌ Errors: ${errors.length}`);

    return {
      success: true,
      totalProcessed: deviceData.length,
      totalUpserted,
      totalChanged,
      errors,
      nasId
    };

  } catch (error) {
    console.error('❌ Fatal error during upsert:', error.message);
    
    // Log the failed operation
    await logDeviceOffloadScrape(nasId, sourceFilename, deviceData.length, 0, 0, false, error.message);
    
    throw error;
  }
}

/**
 * Upsert a single device offload record
 * @param {Object} record - Single device offload record
 * @returns {Object} Result of the upsert operation
 */
async function upsertSingleRecord(record) {
  const { transaction_date, nas_id, total_sessions, count_of_users, rejects, total_gbs } = record;

  // Check if record already exists
  const { data: existing, error: selectError } = await supabase
    .from('device_offload_daily')
    .select('id, total_sessions, count_of_users, rejects, total_gbs')
    .eq('transaction_date', transaction_date)
    .eq('nas_id', nas_id)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Database select error: ${selectError.message}`);
  }

  if (existing) {
    // Record exists - check if we need to update
    const hasChanges = 
      existing.total_sessions !== total_sessions ||
      existing.count_of_users !== count_of_users ||
      existing.rejects !== rejects ||
      existing.total_gbs !== total_gbs;

    if (hasChanges) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('device_offload_daily')
        .update({
          total_sessions,
          count_of_users,
          rejects,
          total_gbs,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        throw new Error(`Database update error: ${updateError.message}`);
      }

      console.log(`🔄 Updated record for ${transaction_date} (NAS: ${nas_id})`);
      return { upserted: true, changed: true };
    } else {
      // No changes needed
      console.log(`⏭️ No changes for ${transaction_date} (NAS: ${nas_id})`);
      return { upserted: false, changed: false };
    }
  } else {
    // Record doesn't exist - insert new record
    const { error: insertError } = await supabase
      .from('device_offload_daily')
      .insert({
        transaction_date,
        nas_id,
        total_sessions,
        count_of_users,
        rejects,
        total_gbs
      });

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    console.log(`✅ Inserted new record for ${transaction_date} (NAS: ${nas_id})`);
    return { upserted: true, changed: false };
  }
}

/**
 * Log device offload scrape operation for audit trail
 * @param {string} nasId - The NAS ID that was scraped
 * @param {string} sourceFilename - Original filename
 * @param {number} rowsParsed - Number of rows parsed from CSV
 * @param {number} rowsUpserted - Number of rows successfully upserted
 * @param {number} rowsChanged - Number of rows that were changed
 * @param {boolean} success - Whether the operation was successful
 * @param {string} errorText - Error message if success is false
 */
async function logDeviceOffloadScrape(nasId, sourceFilename, rowsParsed, rowsUpserted, rowsChanged, success, errorText = null) {
  try {
    const { error } = await supabase
      .from('device_offload_scrape_log')
      .insert({
        nas_id: nasId,
        source_filename: sourceFilename,
        rows_parsed: rowsParsed,
        rows_upserted: rowsUpserted,
        rows_changed: rowsChanged,
        success,
        error_text: errorText
      });

    if (error) {
      console.warn('⚠️ Failed to log scrape operation:', error.message);
    } else {
      console.log('📝 Scrape operation logged successfully');
    }
  } catch (error) {
    console.warn('⚠️ Failed to log scrape operation:', error.message);
  }
}

/**
 * Get device offload data for a specific NAS ID and date range
 * @param {string} nasId - The NAS ID to query
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Array of device offload records
 */
async function getDeviceOffloadData(nasId, startDate = null, endDate = null) {
  let query = supabase
    .from('device_offload_daily')
    .select('*')
    .eq('nas_id', nasId)
    .order('transaction_date', { ascending: false });

  if (startDate) {
    query = query.gte('transaction_date', startDate);
  }

  if (endDate) {
    query = query.lte('transaction_date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Database query error: ${error.message}`);
  }

  return data || [];
}

/**
 * Get summary statistics for a specific NAS ID
 * @param {string} nasId - The NAS ID to query
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Object} Summary statistics
 */
async function getDeviceOffloadSummary(nasId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const data = await getDeviceOffloadData(nasId, startDate.toISOString().split('T')[0]);
  
  if (data.length === 0) {
    return {
      nas_id: nasId,
      days_analyzed: 0,
      total_gbs: 0,
      total_sessions: 0,
      total_users: 0,
      total_rejects: 0,
      average_daily_gbs: 0
    };
  }

  const totalGbs = data.reduce((sum, record) => sum + parseFloat(record.total_gbs), 0);
  const totalSessions = data.reduce((sum, record) => sum + record.total_sessions, 0);
  const totalUsers = data.reduce((sum, record) => sum + record.count_of_users, 0);
  const totalRejects = data.reduce((sum, record) => sum + record.rejects, 0);

  return {
    nas_id: nasId,
    days_analyzed: data.length,
    total_gbs: totalGbs,
    total_sessions: totalSessions,
    total_users: totalUsers,
    total_rejects: totalRejects,
    average_daily_gbs: totalGbs / data.length
  };
}

// convenience direct-run for testing
if (require.main === module) {
  require('dotenv').config();
  
  const command = process.argv[2];
  const nasId = process.argv[3];
  
  if (!command || !nasId) {
    console.log('📝 Usage: node src/upsertDeviceOffload.js <command> <nas_id> [options]');
    console.log('💡 Commands:');
    console.log('  summary [days] - Get summary for NAS ID (default: 30 days)');
    console.log('  data [start_date] [end_date] - Get data for date range');
    console.log('💡 Examples:');
    console.log('  node src/upsertDeviceOffload.js summary bcb92300ae0c');
    console.log('  node src/upsertDeviceOffload.js summary bcb92300ae0c 7');
    console.log('  node src/upsertDeviceOffload.js data bcb92300ae0c 2025-08-01 2025-08-31');
    process.exit(1);
  }

  (async () => {
    try {
      if (command === 'summary') {
        const days = process.argv[4] ? parseInt(process.argv[4], 10) : 30;
        const summary = await getDeviceOffloadSummary(nasId, days);
        console.log('📊 Device Offload Summary:');
        console.log(JSON.stringify(summary, null, 2));
      } else if (command === 'data') {
        const startDate = process.argv[4];
        const endDate = process.argv[5];
        const data = await getDeviceOffloadData(nasId, startDate, endDate);
        console.log(`📋 Device Offload Data (${data.length} records):`);
        console.log(JSON.stringify(data, null, 2));
      } else {
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
  upsertDeviceOffload,
  getDeviceOffloadData,
  getDeviceOffloadSummary,
  logDeviceOffloadScrape
};
