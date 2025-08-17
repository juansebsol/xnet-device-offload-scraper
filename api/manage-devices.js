// api/manage-devices.js
// Device management API for the new parent/child structure
// GET /api/manage-devices - List all devices
// POST /api/manage-devices - Create new device
// PUT /api/manage-devices/:id - Update device
// DELETE /api/manage-devices/:id - Delete device

const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    switch (req.method) {
      case 'GET':
        await handleGetDevices(req, res);
        break;
      case 'POST':
        await handleCreateDevice(req, res);
        break;
      // PUT method removed - users cannot modify device details
      // case 'PUT':
      //   await handleUpdateDevice(req, res);
      //   break;
      case 'DELETE':
        await handleDeleteDevice(req, res);
        break;
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

async function handleGetDevices(req, res) {
  // Get only tracked devices (devices on daily scrape list)
  const { data: trackedDevices, error } = await supabase
    .from('tracked_devices')
    .select(`
      *,
      devices!inner(*)
    `)
    .eq('is_active', true)
    .order('added_to_tracked_at', { ascending: false });

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Add summary stats for each tracked device
  const devicesWithStats = await Promise.all(
    trackedDevices.map(async (trackedDevice) => {
      const device = trackedDevice.devices;
      
      const { data: stats } = await supabase
        .from('device_offload_daily')
        .select('total_sessions, count_of_users, rejects, total_gbs')
        .eq('device_id', device.id);

      const summary = stats.reduce((acc, record) => ({
        total_sessions: acc.total_sessions + record.total_sessions,
        total_users: acc.total_users + record.count_of_users,
        total_rejects: acc.total_rejects + record.rejects,
        total_gbs: acc.total_gbs + parseFloat(record.total_gbs)
      }), { total_sessions: 0, total_users: 0, total_rejects: 0, total_gbs: 0 });

      return {
        id: device.id,
        nas_id: device.nas_id,
        device_name: device.device_name,
        description: device.description,
        is_active: device.is_active,
        created_at: device.created_at,
        updated_at: device.updated_at,
        // Tracked device specific info
        added_to_tracked_at: trackedDevice.added_to_tracked_at,
        last_scraped: trackedDevice.last_scraped,
        tracking_notes: trackedDevice.notes,
        summary,
        record_count: stats.length
      };
    })
  );

  res.status(200).json({
    count: devicesWithStats.length,
    devices: devicesWithStats,
    message: 'Showing only devices on daily scrape list'
  });
}

async function handleCreateDevice(req, res) {
  const { nas_id, device_name, description, notes } = req.body;

  if (!nas_id) {
    return res.status(400).json({ error: 'nas_id is required' });
  }

  try {
    // First, ensure the device exists in the devices table
    let deviceId;
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('nas_id', nas_id)
      .single();

    if (existingDevice) {
      deviceId = existingDevice.id;
    } else {
      // Create device if it doesn't exist
      const { data: newDevice, error: createError } = await supabase
        .from('devices')
        .insert({
          nas_id,
          device_name: device_name || `Device ${nas_id}`,
          description,
          is_active: true
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Device creation error:', createError);
        return res.status(500).json({ error: 'Failed to create device' });
      }
      deviceId = newDevice.id;
    }

    // Add device to tracked list
    const { data: trackedDevice, error: trackError } = await supabase
      .from('tracked_devices')
      .insert({
        nas_id,
        notes: notes || null
      })
      .select()
      .single();

    if (trackError) {
      console.error('Track error:', trackError);
      return res.status(500).json({ error: 'Failed to add device to tracked list' });
    }

    res.status(201).json({
      message: 'Device added to daily scrape list successfully',
      device: {
        nas_id,
        device_name: device_name || `Device ${nas_id}`,
        description,
        added_to_tracked_at: trackedDevice.added_to_tracked_at,
        notes: trackedDevice.notes
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update function removed - users cannot modify device details
// async function handleUpdateDevice(req, res) { ... }

async function handleDeleteDevice(req, res) {
  const { nas_id } = req.query;

  if (!nas_id) {
    return res.status(400).json({ error: 'nas_id parameter is required' });
  }

  // Remove device from tracked list (but keep in devices table)
  const { error } = await supabase
    .from('tracked_devices')
    .delete()
    .eq('nas_id', nas_id);

  if (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to remove device from tracked list' });
  }

  res.status(200).json({
    message: `Device ${nas_id} removed from daily scrape list successfully`,
    note: 'Device data remains in database and can be manually scraped'
  });
}
