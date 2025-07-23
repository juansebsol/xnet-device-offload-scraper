// api/summary.js
// GET /api/summary?days=30
// Returns total + average for range
const { supabase } = require('./_supabase');
const { isoDate, startDateFromDays, formatGigabytes } = require('./_util');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { days } = req.query;
  if (!days) return res.status(400).json({ error: 'days param required' });

  const startDate = startDateFromDays(days);
  if (!startDate) return res.status(400).json({ error: 'Invalid days param' });
  const endDate = isoDate();

  const { data, error } = await supabase
    .from('offload_daily')
    .select('gigabytes')
    .gte('day', startDate)
    .lte('day', endDate);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }

  const nums = (data || []).map((r) => Number(r.gigabytes) || 0);
  const total = nums.reduce((a, b) => a + b, 0);
  const avg = nums.length ? total / nums.length : 0;

  res.status(200).json({
    range: { start: startDate, end: endDate, days: Number(days) },
    count: nums.length,
    total,
    totalFormatted: formatGigabytes(total),
    average: avg,
    averageFormatted: formatGigabytes(avg),
  });
};

