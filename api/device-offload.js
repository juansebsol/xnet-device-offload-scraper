// api/device-offload.js
// GET /api/device-offload?nas_id=<nas_id>&days=7
// GET /api/device-offload?nas_id=<nas_id>&start=YYYY-MM-DD&end=YYYY-MM-DD
// GET /api/device-offload?nas_id=<nas_id> -> all data for that device

const { supabase } = require('./_supabase');
const { isoDate, startDateFromDays } = require('./_util');

module.exports = async (req, res) => {
  // Basic CORS (public read); tighten if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { nas_id, days, start, end } = req.query;

  // NAS ID is required
  if (!nas_id) {
    return res.status(400).json({ error: 'nas_id parameter is required' });
  }

  let startDate = null;
  let endDate = null;
  
  // First get the device ID
  const { data: device, error: deviceError } = await supabase
    .from('devices')
    .select('id, nas_id, device_name')
    .eq('nas_id', nas_id)
    .single();
    
  if (deviceError) {
    console.error('Device not found:', deviceError);
    return res.status(404).json({ error: 'Device not found' });
  }
  
  let query = supabase
    .from('device_offload_daily')
    .select(`
      *,
      devices!inner(nas_id, device_name)
    `)
    .eq('device_id', device.id)
    .order('transaction_date', { ascending: false });

  if (days) {
    startDate = startDateFromDays(days);
    if (!startDate) return res.status(400).json({ error: 'Invalid days param' });
    endDate = isoDate(); // today
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate);
  } else if (start && end) {
    startDate = start;
    endDate = end;
    query = query.gte('transaction_date', start).lte('transaction_date', end);
  } else {
    // all data for the device
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Calculate summary statistics
  let summary = null;
  if (data && data.length > 0) {
    const totalGbs = data.reduce((sum, record) => sum + parseFloat(record.total_gbs), 0);
    const totalSessions = data.reduce((sum, record) => sum + record.total_sessions, 0);
    const totalUsers = data.reduce((sum, record) => sum + record.count_of_users, 0);
    const totalRejects = data.reduce((sum, record) => sum + record.rejects, 0);

    summary = {
      total_gbs: totalGbs,
      total_sessions: totalSessions,
      total_users: totalUsers,
      total_rejects: totalRejects,
      average_daily_gbs: totalGbs / data.length,
      days_analyzed: data.length
    };
  }

  const out = (data || []).map((r) => ({
    transaction_date: r.transaction_date,
    nas_id: r.devices?.nas_id || r.nas_id, // Use joined data or fallback
    device_name: r.devices?.device_name,
    total_sessions: r.total_sessions,
    count_of_users: r.count_of_users,
    rejects: r.rejects,
    total_gbs: Number(r.total_gbs),
    created_at: r.created_at,
    updated_at: r.updated_at
  }));

  res.status(200).json({
    nas_id,
    range: { start: startDate, end: endDate, days: days ? Number(days) : null },
    count: out.length,
    summary,
    data: out,
  });
};
