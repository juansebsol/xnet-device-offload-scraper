// api/trigger-scrape.js
// POST /api/trigger-scrape
// Triggers the device offload scraper for a specific NAS ID
// This endpoint is designed to be called by GitHub Actions or external systems

const { scrapeDeviceOffload } = require('../src/scrapeDeviceOffload');
const { parseDeviceCsv } = require('../src/parseDeviceCsv');
const { upsertDeviceOffload } = require('../src/upsertDeviceOffload');

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nas_id, force_refresh = false } = req.body;

    // Validate required parameters
    if (!nas_id) {
      return res.status(400).json({ 
        error: 'nas_id is required',
        example: { nas_id: 'bcb92300ae0c', force_refresh: false }
      });
    }

    console.log(`🚀 Triggering scrape for NAS ID: ${nas_id}`);
    console.log(`🔄 Force refresh: ${force_refresh}`);

    // Start the scraping process
    const scrapeResult = await scrapeDeviceOffload(nas_id);
    console.log('✅ Scraping completed, processing data...');

    // Parse the CSV data
    const parseResult = parseDeviceCsv(scrapeResult.csvText);
    console.log(`📊 Parsed ${parseResult.validRows} valid rows from CSV`);

    if (parseResult.errors.length > 0) {
      console.warn(`⚠️ ${parseResult.errors.length} parsing errors encountered`);
      parseResult.errors.forEach(error => {
        console.warn(`  Line ${error.line}: ${error.error}`);
      });
    }

    if (parseResult.validRows === 0) {
      return res.status(400).json({
        error: 'No valid data found in CSV',
        nas_id,
        parse_result: parseResult
      });
    }

    // Upsert the data into the database
    const upsertResult = await upsertDeviceOffload(
      parseResult.data,
      nas_id,
      scrapeResult.filename
    );

    console.log('✅ Data processing completed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: `Device offload data scraped and processed successfully for NAS ID: ${nas_id}`,
      nas_id,
      scrape_result: {
        filename: scrapeResult.filename,
        file_size: scrapeResult.csvText.length
      },
      parse_result: {
        total_rows: parseResult.totalRows,
        valid_rows: parseResult.validRows,
        error_rows: parseResult.errorRows,
        errors: parseResult.errors
      },
      upsert_result: {
        total_processed: upsertResult.totalProcessed,
        total_upserted: upsertResult.totalUpserted,
        total_changed: upsertResult.totalChanged,
        errors: upsertResult.errors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in trigger-scrape:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
