// src/runUpload.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parseOffloadCsv } = require('./parseCsv');
const { upsertDaily, logScrape } = require('./upsert');

function normalizeJsonRows(rawRows) {
  const out = [];
  let badMissing = 0;
  let badNum = 0;

  for (const r of rawRows || []) {
    const day = r.day || r.Day || r.date || r.Date;
    let gbRaw = r.gigabytes ?? r.Gigabytes ?? r.GB ?? r.gigs ?? r.Gigs;

    if (!day) {
      badMissing++;
      continue;
    }

    gbRaw = gbRaw == null ? gbRaw : String(gbRaw).replace(/,/g, '').trim();
    const gigabytes = Number(gbRaw);
    if (!Number.isFinite(gigabytes)) {
      badNum++;
      continue;
    }

    // simple YYYY-MM-DD guard
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      badMissing++;
      continue;
    }

    out.push({ day, gigabytes });
  }

  return { rows: out, badMissing, badNum };
}

async function runUpload(filePath) {
  const base = path.basename(filePath);
  try {
    const ext = path.extname(filePath).toLowerCase();
    let rows = [];
    let stats = { badMissing: 0, badNum: 0 };

    if (ext === '.json') {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const norm = normalizeJsonRows(parsed);
      rows = norm.rows;
      stats = norm;
    } else if (ext === '.csv' || ext === '.txt') {
      const raw = fs.readFileSync(filePath, 'utf8');
      rows = parseOffloadCsv(raw);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!rows.length) {
      throw new Error('No valid data rows found in input.');
    }

    console.log(
      `Parsed ${rows.length} valid rows from ${base}` +
        (stats.badMissing || stats.badNum
          ? ` (skipped ${stats.badMissing} missing-date, ${stats.badNum} bad-number)`
          : '')
    );

    const { inserted, updated, upserted, totalParsed } = await upsertDaily(rows);

    await logScrape({
      filename: base,
      totalParsed,
      upserted,
      inserted,
      updated,
      success: true,
    });

    console.log(
      `✅ Upload OK: parsed=${totalParsed}, inserted=${inserted}, updated=${updated} (wrote=${upserted})`
    );
  } catch (err) {
    console.error('❌ Upload FAILED:', err);
    try {
      await logScrape({
        filename: base,
        totalParsed: 0,
        upserted: 0,
        inserted: 0,
        updated: 0,
        success: false,
        errorText: String(err?.message ?? err),
      });
    } catch (logErr) {
      console.error('⚠️ Failed to log upload error:', logErr);
    }
    process.exitCode = 1;
  }
}

// CLI usage: node runUpload.js ./path/to/file.json
if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('❌ Usage: node src/runUpload.js <file>');
    process.exit(1);
  }
  runUpload(fileArg);
}

module.exports = { runUpload };
