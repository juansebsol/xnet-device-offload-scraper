// api/trigger-scrape.js
// POST /api/trigger-scrape
// Triggers the device offload scraper for a specific NAS ID
// This endpoint is designed to be called by GitHub Actions or external systems

const { scrapeDeviceOffloadServerless } = require('../src/scrapeDeviceOffloadServerless');

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nas_id } = req.body;

    // Validate required parameters
    if (!nas_id) {
      return res.status(400).json({ 
        error: 'nas_id is required',
        example: { nas_id: 'bcb92300ae0c' }
      });
    }

    console.log(`🚀 API: Starting manual scrape for NAS ID: ${nas_id}`);

    // Trigger the serverless scraper (handles everything: scrape, parse, upsert)
    const result = await scrapeDeviceOffloadServerless(nas_id);

    console.log(`✅ API: Scrape completed for NAS ID: ${nas_id}`);

    // Return the result from the serverless scraper
    res.status(200).json(result);

  } catch (error) {
    console.error('❌ API Error:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Scraping failed',
      details: {
        nas_id: req.body?.nas_id,
        error_message: error.message
      }
    });
  }
};
