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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      case 'PUT':
        await handleUpdateDevice(req, res);
        break;
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
  const { data: devices, error } = await supabase
    .from('devices')
    .select(`
      *,
      device_offload_daily(count)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Add summary stats for each device
  const devicesWithStats = await Promise.all(
    devices.map(async (device) => {
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
        ...device,
        summary,
        record_count: stats.length
      };
    })
  );

  res.status(200).json({
    count: devicesWithStats.length,
    devices: devicesWithStats
  });
}

async function handleCreateDevice(req, res) {
  const { nas_id, device_name, description } = req.body;

  if (!nas_id) {
    return res.status(400).json({ error: 'nas_id is required' });
  }

  // Check if device already exists
  const { data: existing } = await supabase
    .from('devices')
    .select('id')
    .eq('nas_id', nas_id)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Device with this NAS ID already exists' });
  }

  const { data: device, error } = await supabase
    .from('devices')
    .insert({
      nas_id,
      device_name: device_name || `Device ${nas_id}`,
      description,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Create error:', error);
    return res.status(500).json({ error: 'Failed to create device' });
  }

  res.status(201).json({
    message: 'Device created successfully',
    device
  });
}

async function handleUpdateDevice(req, res) {
  const { id } = req.query;
  const { device_name, description, is_active } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  const { data: device, error } = await supabase
    .from('devices')
    .update({
      device_name,
      description,
      is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    return res.status(500).json({ error: 'Failed to update device' });
  }

  res.status(200).json({
    message: 'Device updated successfully',
    device
  });
}

async function handleDeleteDevice(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  // Check if device has any offload data
  const { data: offloadData } = await supabase
    .from('device_offload_daily')
    .select('id')
    .eq('device_id', id)
    .limit(1);

  if (offloadData && offloadData.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete device with existing offload data. Delete offload data first.' 
    });
  }

  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Failed to delete device' });
  }

  res.status(200).json({
    message: 'Device deleted successfully'
  });
}
