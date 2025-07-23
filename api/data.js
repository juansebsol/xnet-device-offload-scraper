// api/data.js
// GET /api/data?days=7
// GET /api/data?start=YYYY-MM-DD&end=YYYY-MM-DD
// GET /api/data            -> all

const { supabase } = require('./_supabase');
const { isoDate, startDateFromDays, formatGigabytes } = require('./_util');

module.exports = async (req, res) => {
  // Basic CORS (public read); tighten if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { days, start, end } = req.query;

  let startDate = null;
  let endDate = null;
  let query = supabase.from('offload_daily').select('day,gigabytes', { head: false });

  if (days) {
    startDate = startDateFromDays(days);
    if (!startDate) return res.status(400).json({ error: 'Invalid days param' });
    endDate = isoDate(); // today
    query = query.gte('day', startDate).lte('day', endDate);
  } else if (start && end) {
    startDate = start;
    endDate = end;
    query = query.gte('day', start).lte('day', end);
  } else {
    // all data
  }

  // Order newest first
  query = query.order('day', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Supabase error', error);
    return res.status(500).json({ error: 'Database error' });
  }

  const out = (data || []).map((r) => ({
    day: r.day,
    gigabytes: Number(r.gigabytes),
    formattedGigabytes: formatGigabytes(r.gigabytes),
  }));

  res.status(200).json({
    range: { start: startDate, end: endDate, days: days ? Number(days) : null },
    count: out.length,
    data: out,
  });
};

