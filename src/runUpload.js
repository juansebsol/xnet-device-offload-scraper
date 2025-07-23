// src/runUpload.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parseOffloadCsv } = require('./parseCsv');
const { upsertDaily, logScrape } = require('./upsert');

async function runUpload(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let rows = [];

    if (ext === '.json') {
      const raw = fs.readFileSync(filePath, 'utf8');
      rows = JSON.parse(raw);
    } else if (ext === '.csv' || ext === '.txt') {
      const raw = fs.readFileSync(filePath, 'utf8');
      rows = parseOffloadCsv(raw);
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }

    if (!rows.length) {
      throw new Error('No data rows found in input.');
    }

    const { inserted, updated, upserted, totalParsed } = await upsertDaily(rows);

    await logScrape({
      filename: path.basename(filePath),
      totalParsed,
      upserted,
      inserted,
      updated,
      success: true,
    });

    console.log(`✅ Upload OK: parsed=${totalParsed}, inserted=${inserted}, updated=${updated} (wrote=${upserted})`);
  } catch (err) {
    console.error('❌ Upload FAILED:', err);
    try {
      await logScrape({
        filename: path.basename(filePath),
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
    console.error('❌ Usage: node runUpload.js <file>');
    process.exit(1);
  }
  runUpload(fileArg);
}

