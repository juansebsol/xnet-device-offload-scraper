// api/manage-devices.js
// GET /api/manage-devices - List configured devices
// POST /api/manage-devices - Add a device to scraping list
// DELETE /api/manage-devices - Remove a device from scraping list

const { 
  DEVICES_TO_SCRAPE, 
  DEVICE_CONFIGS,
  addDeviceToScrapeList, 
  removeDeviceFromScrapeList 
} = require('../src/scheduledDeviceScrape');

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    switch (req.method) {
      case 'GET':
        // List all configured devices
        const deviceList = DEVICES_TO_SCRAPE.map(nasId => ({
          nas_id: nasId,
          ...DEVICE_CONFIGS[nasId]
        }));

        res.status(200).json({
          success: true,
          count: deviceList.length,
          devices: deviceList,
          timestamp: new Date().toISOString()
        });
        break;

      case 'POST':
        // Add a device to the scraping list
        const { nas_id, name, priority, scrape_frequency } = req.body;

        if (!nas_id) {
          return res.status(400).json({
            error: 'nas_id is required',
            example: { nas_id: 'bcb92300ae0c', name: 'Device Name', priority: 'high' }
          });
        }

        const config = {};
        if (name) config.name = name;
        if (priority) config.priority = priority;
        if (scrape_frequency) config.scrape_frequency = scrape_frequency;

        const added = addDeviceToScrapeList(nas_id, config);

        if (added) {
          res.status(200).json({
            success: true,
            message: `Device ${nas_id} added to scraping list`,
            nas_id,
            config,
            total_devices: DEVICES_TO_SCRAPE.length,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(409).json({
            success: false,
            error: `Device ${nas_id} is already in the scraping list`,
            nas_id
          });
        }
        break;

      case 'DELETE':
        // Remove a device from the scraping list
        const { nas_id: delete_nas_id } = req.body;

        if (!delete_nas_id) {
          return res.status(400).json({
            error: 'nas_id is required in request body',
            example: { nas_id: 'bcb92300ae0c' }
          });
        }

        const removed = removeDeviceFromScrapeList(delete_nas_id);

        if (removed) {
          res.status(200).json({
            success: true,
            message: `Device ${delete_nas_id} removed from scraping list`,
            nas_id: delete_nas_id,
            total_devices: DEVICES_TO_SCRAPE.length,
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(404).json({
            success: false,
            error: `Device ${delete_nas_id} not found in scraping list`,
            nas_id: delete_nas_id
          });
        }
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Error in manage-devices:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
