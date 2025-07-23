// api/latest.js
const { supabase } = require('./_supabase');
const { formatGigabytes } = require('./_util');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('offload_daily')
    .select('day,gigabytes')
    .order('day', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
  if (!data) return res.status(404).json({ error: 'No data' });

  res.status(200).json({
    day: data.day,
    gigabytes: Number(data.gigabytes),
    formattedGigabytes: formatGigabytes(data.gigabytes),
  });
};

