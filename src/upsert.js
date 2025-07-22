const { supabaseAdmin } = require('./supabase');

/**
 * Bulk upsert daily rows into Supabase.
 * rows: [{day:'2025-07-22', gigabytes:588}, ...]
 * Uses ON CONFLICT (day) DO UPDATE ALWAYS (simplest path).
 */
async function upsertDaily(rows) {
  if (!rows?.length) return { upserted: 0 };
  const { error } = await supabaseAdmin
    .from('offload_daily')
    .upsert(rows, { onConflict: 'day' }); // always updates
  if (error) throw error;
  return { upserted: rows.length };
}

/**
 * Record scrape attempt for audit.
 */
async function logScrape({ filename, rowsParsed, rowsUpserted, success, errorText }) {
  await supabaseAdmin.from('scrape_log').insert({
    source_filename: filename ?? null,
    rows_parsed: rowsParsed ?? 0,
    rows_upserted: rowsUpserted ?? 0,
    rows_changed: null, // track later if needed
    success,
    error_text: errorText ?? null
  });
}

module.exports = { upsertDaily, logScrape };

