// src/scrape.js
// Minimal-change port of Sebastian's known-working one-file scraper
// - env vars instead of hard-coded creds
// - arrowDown spam preserved (looped)
// - response sniff preserved
// - robust post-click wait loop (poll until fileUrl or timeout)
// - returns csvText + filename

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const downloadDir = path.resolve(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

// config knobs (tune if needed)
const ARROWDOWN_PRESSES = 11;          // matches your working script
const PRE_CLICK_DELAY_MS = 1000;       // give UI time to bind download
const POST_CLICK_POLL_MS = 100;        // poll interval
const POST_CLICK_MAX_MS = 10000;       // total wait after click (10s)

async function scrapeCsv() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  let fileUrl = '';
  let filename = '';
  let capturedResponse = null; // keep ref to reuse if we want

  try {
    // 🧑‍💻 Login sequence
    await page.goto(process.env.OKTA_START_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.OKTA_EMAIL);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('link', { name: 'Select Password.' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.OKTA_PASSWORD);
    await page.getByRole('button', { name: 'Verify' }).click();

    // HUB popup
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'launch app HUB Portal' }).click();
    const page1 = await page1Promise;

    // 📈 Navigate to usage
    await page1.getByRole('button', { name: 'Data Usage' }).click();
    await page1.getByRole('link', { name: 'Data Usage Timeline' }).click();

    // This mystery click + ArrowDown spam is in your working code; preserve it.
    await page1
      .locator(
        '.hub-reporting-console-app-web-MuiBox-root.hub-reporting-console-app-web-sd-prod24 > div:nth-child(2) > div'
      )
      .click()
      .catch(() => {}); // tolerate failures

    // ArrowDown presses (kept as loop)
    for (let i = 0; i < ARROWDOWN_PRESSES; i++) {
      try {
        await page1.getByText('loading...ContractSInbound').press('ArrowDown', { timeout: 1000 });
      } catch {
        // fallback: send a raw keypress to the page
        try {
          await page1.keyboard.press('ArrowDown');
        } catch {}
      }
    }

    // Wait for iframe
    await page1.waitForSelector('iframe', { timeout: 30000 });
    const iframeHandle = await page1.locator('iframe').elementHandle();
    const frame = await iframeHandle.contentFrame();
    if (!frame) throw new Error('❌ iframe not ready');

    // Open export menu
    await frame.getByRole('button', { name: 'Data Usage Timeline - Tile' }).click();
    await frame.getByRole('menuitem', { name: 'Download data' }).click();

    // Capture attachment response
    page1.on('response', async (response) => {
      try {
        const headers = response.headers();
        const disposition = headers['content-disposition'] || '';
        const contentType = headers['content-type'] || '';
        if (
          response.status() === 200 &&
          disposition.includes('attachment') &&
          (contentType.includes('csv') || contentType.includes('text'))
        ) {
          fileUrl = response.url();
          const match = disposition.match(/filename="(.+?)"/);
          filename = match?.[1] || 'download.csv';
          capturedResponse = response;
          console.log('✅ Correct file detected:', filename);
        }
      } catch (e) {
        console.error('⚠️ Error parsing response:', e);
      }
    });

    // extra pre-click pause (your working script)
    await page1.waitForTimeout(PRE_CLICK_DELAY_MS);

    // Click the download button
    const btn = await frame.locator('#qr-export-modal-download');
    await btn.click();

    // Poll for fileUrl (instead of fixed 3s)
    const start = Date.now();
    while (!fileUrl && Date.now() - start < POST_CLICK_MAX_MS) {
      await page1.waitForTimeout(POST_CLICK_POLL_MS);
    }

    if (!fileUrl) {
      throw new Error('❌ No valid file detected (timeout waiting for download response).');
    }

    // Use capturedResponse if we have it; else fetch fileUrl
    let csvText;
    try {
      if (capturedResponse) {
        // Use Playwright's response body (safer; avoids re-fetch auth issues)
        const bodyBuffer = await capturedResponse.body();
        csvText = bodyBuffer.toString('utf8');
      } else {
        // fallback GET via context request
        const resp = await page1.request.get(fileUrl);
        csvText = await resp.text();
      }
    } catch (err) {
      console.warn('⚠️ Could not read captured response body; fallback network GET', err);
      const resp = await page1.request.get(fileUrl);
      csvText = await resp.text();
    }

    // Save to disk
    const fullPath = path.join(downloadDir, filename);
    fs.writeFileSync(fullPath, csvText, 'utf-8');

    console.log('✅ File saved:', fullPath);
    console.log('📊 Preview:\n', csvText.substring(0, 500));

    return { csvText, filename, fullPath };
  } finally {
    await context.close();
    await browser.close();
  }
}

// convenience direct-run
if (require.main === module) {
  require('dotenv').config();
  scrapeCsv()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { scrapeCsv };
