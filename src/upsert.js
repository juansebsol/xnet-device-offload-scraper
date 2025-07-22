// src/upsert.js
const { supabaseAdmin } = require('./supabase');

/**
 * Upsert only new/changed rows into offload_daily and return counts.
 * rows: [{ day: 'YYYY-MM-DD', gigabytes: number }, ...]
 */
async function upsertDaily(rows) {
  if (!rows?.length) return { inserted: 0, updated: 0, upserted: 0, totalParsed: 0 };

  // 1. Get existing records for these days
  const days = rows.map(r => r.day);
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('offload_daily')
    .select('day, gigabytes')
    .in('day', days);

  if (selErr) throw selErr;

  const existingMap = new Map((existing ?? []).map(r => [r.day, Number(r.gigabytes)]));

  // 2. Diff
  const toWrite = [];
  let inserted = 0;
  let updated = 0;

  for (const r of rows) {
    const have = existingMap.get(r.day);
    if (have === undefined) {
      toWrite.push(r);
      inserted++;
    } else if (!nearlyEqual(have, r.gigabytes)) {
      toWrite.push(r);
      updated++;
    }
  }

  // 3. Write (only if needed)
  if (toWrite.length) {
    const { error: upErr } = await supabaseAdmin
      .from('offload_daily')
      .upsert(toWrite, { onConflict: 'day' }); // updates changed + inserts new
    if (upErr) throw upErr;
  }

  return {
    inserted,
    updated,
    upserted: toWrite.length,
    totalParsed: rows.length,
  };
}

function nearlyEqual(a, b, eps = 0.0001) {
  return Math.abs(Number(a) - Number(b)) < eps;
}

/**
 * Write a scrape_log row.
 * Accepts counts from upsertDaily().
 */
async function logScrape({ filename, totalParsed, upserted, inserted, updated, success, errorText }) {
  await supabaseAdmin.from('scrape_log').insert({
    source_filename: filename ?? null,
    rows_parsed: totalParsed ?? 0,
    rows_upserted: upserted ?? 0,
    rows_changed: updated ?? 0, // we treat "updated" as changed
    success,
    error_text: errorText ?? null,
  });
}

module.exports = { upsertDaily, logScrape };
