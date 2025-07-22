require('dotenv').config();
const { scrapeCsv } = require('./scrape');
const { parseOffloadCsv } = require('./parseCsv');
const { upsertDaily, logScrape } = require('./upsert');

(async () => {
  try {
    const { csvText, filename } = await scrapeCsv();
    const rows = parseOffloadCsv(csvText);
    const { inserted, updated, upserted, totalParsed } = await upsertDaily(rows);

    await logScrape({
      filename,
      totalParsed,
      upserted,
      inserted,
      updated,
      success: true,
    });

    console.log(
      `Scrape OK: parsed=${totalParsed} inserted=${inserted} updated=${updated} (wrote=${upserted})`
    );
  } catch (err) {
    console.error('Scrape FAILED:', err);
    try {
      await logScrape({
        filename: null,
        totalParsed: 0,
        upserted: 0,
        inserted: 0,
        updated: 0,
        success: false,
        errorText: String(err?.message ?? err),
      });
    } catch (logErr) {
      console.error('Failed to log scrape error:', logErr);
    }
    process.exitCode = 1;
  }
})();
