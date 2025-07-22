require('dotenv').config();
const { scrapeCsv } = require('./scrape');
const { parseOffloadCsv } = require('./parseCsv');
const { upsertDaily, logScrape } = require('./upsert');

(async () => {
  try {
    const { csvText, filename } = await scrapeCsv();
    const rows = parseOffloadCsv(csvText);
    console.log(`Parsed ${rows.length} data rows.`);
    const { upserted } = await upsertDaily(rows);
    await logScrape({
      filename,
      rowsParsed: rows.length,
      rowsUpserted: upserted,
      success: true,
    });
    console.log(`Scrape OK: parsed=${rows.length} upserted=${upserted}`);
  } catch (err) {
    console.error('Scrape FAILED:', err);
    try {
      await logScrape({
        filename: null,
        rowsParsed: 0,
        rowsUpserted: 0,
        success: false,
        errorText: String(err?.message ?? err),
      });
    } catch (logErr) {
      console.error('Failed to log scrape error:', logErr);
    }
    process.exitCode = 1;
  }
})();
