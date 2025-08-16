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
    console.log('🚀 Starting scraper...');
    
    // 🧑‍💻 Login sequence
    console.log('📱 Navigating to OKTA start page...');
    await page.goto(process.env.OKTA_START_URL, { waitUntil: 'domcontentloaded' });
    console.log('✅ OKTA page loaded successfully');
    
    console.log('📧 Filling email...');
    await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.OKTA_EMAIL);
    console.log('✅ Email filled successfully');
    
    console.log('⏭️ Clicking Next...');
    await page.getByRole('button', { name: 'Next' }).click();
    console.log('✅ Next button clicked successfully');
    
    console.log('🔗 Clicking password link...');
    await page.getByRole('link', { name: 'Select Password.' }).click();
    console.log('✅ Password link clicked successfully');
    
    console.log('🔐 Filling password...');
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.OKTA_PASSWORD);
    console.log('✅ Password filled successfully');
    
    console.log('✅ Clicking Verify...');
    await page.getByRole('button', { name: 'Verify' }).click();
    console.log('✅ Verify button clicked successfully');

    // HUB popup
    console.log('🔄 Waiting for HUB popup...');
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'launch app HUB Portal' }).click();
    const page1 = await page1Promise;
    console.log('✅ HUB popup opened successfully');

    // 📈 Navigate to usage
    console.log('📊 Clicking Data Usage...');
    await page1.getByRole('button', { name: 'Data Usage' }).click();
    console.log('✅ Data Usage clicked successfully');
    
    console.log('📈 Clicking Data Usage Timeline...');
    await page1.getByRole('link', { name: 'Data Usage Timeline' }).click();
    console.log('✅ Data Usage Timeline clicked successfully');

    // This mystery click + ArrowDown spam is in your working code; preserve it.
    console.log('🎯 Performing mystery click...');
    await page1
      .locator(
        '.hub-reporting-console-app-web-MuiBox-root.hub-reporting-console-app-web-sd-prod24 > div:nth-child(2) > div'
      )
      .click()
      .catch(() => {}); // tolerate failures
    console.log('✅ Mystery click completed');

    // ArrowDown presses (kept as loop)
    console.log(`⬇️ Pressing ArrowDown ${ARROWDOWN_PRESSES} times...`);
    for (let i = 0; i < ARROWDOWN_PRESSES; i++) {
      try {
        await page1.getByText('loading...ContractSInbound').press('ArrowDown', { timeout: 1000 });
        console.log(`✅ ArrowDown ${i + 1}/${ARROWDOWN_PRESSES}`);
      } catch {
        // fallback: send a raw keypress to the page
        try {
          await page1.keyboard.press('ArrowDown');
          console.log(`✅ ArrowDown ${i + 1}/${ARROWDOWN_PRESSES} (fallback)`);
        } catch {}
      }
    }

    // Wait for iframe
    console.log('🖼️ Waiting for iframe...');
    await page1.waitForSelector('iframe', { timeout: 30000 });
    const iframeHandle = await page1.locator('iframe').elementHandle();
    const frame = await iframeHandle.contentFrame();
    if (!frame) throw new Error('❌ iframe not ready');
    console.log('✅ iframe ready');

    // Open export menu
    console.log('📤 Opening export menu...');
    await frame.getByRole('button', { name: 'Data Usage Timeline - Tile' }).click();
    console.log('✅ Export button clicked successfully');
    
    console.log('⬇️ Clicking Download data...');
    await frame.getByRole('menuitem', { name: 'Download data' }).click();
    console.log('✅ Download data clicked successfully');

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
    console.log(`⏳ Waiting ${PRE_CLICK_DELAY_MS}ms before download click...`);
    await page1.waitForTimeout(PRE_CLICK_DELAY_MS);

    // FIXED: Handle viewport issue with download button
    console.log('🔧 Fixing viewport issue with download button...');
    
    // Since we know Method 2 (JavaScript) worked, let's try it first
    let downloadClicked = false;
    
    // Method 1: Try JavaScript click first (this was the working method)
    try {
      console.log('🔄 Method 1: Attempting JavaScript click (this method succeeded before)...');
      await frame.evaluate(() => {
        const downloadBtn = document.querySelector('#qr-export-modal-download');
        if (downloadBtn) {
          downloadBtn.click();
          return true;
        }
        return false;
      });
      console.log('✅ Download button clicked successfully via JavaScript method (this was the working method)');
      downloadClicked = true;
    } catch (jsError) {
      console.log('⚠️ JavaScript method failed, trying scroll method...');
      console.log('📝 JavaScript error details:', jsError.message);
      
      // Method 2: Try to scroll the button into view as fallback
      try {
        console.log('🔄 Method 2: Attempting to scroll button into view...');
        const btn = await frame.locator('#qr-export-modal-download');
        
        // Scroll the button into view
        await btn.scrollIntoViewIfNeeded();
        console.log('✅ Button scrolled into view successfully');
        
        // Wait a moment for the scroll to complete
        await frame.waitForTimeout(500);
        
        // Try clicking
        await btn.click();
        console.log('✅ Download button clicked successfully via scroll method');
        downloadClicked = true;
      } catch (scrollError) {
        console.log('⚠️ Scroll method failed, trying keyboard navigation...');
        console.log('📝 Scroll error details:', scrollError.message);
        
        // Method 3: Use keyboard navigation as last resort
        try {
          console.log('🔄 Method 3: Attempting keyboard navigation...');
          // Press Tab to focus the button, then Enter to click
          await frame.keyboard.press('Tab');
          await frame.waitForTimeout(200);
          await frame.keyboard.press('Enter');
          console.log('✅ Download button activated successfully via keyboard method');
          downloadClicked = true;
        } catch (keyboardError) {
          console.log('❌ All click methods failed');
          console.log('📝 Keyboard error details:', keyboardError.message);
          throw new Error(`All click methods failed: ${keyboardError.message}`);
        }
      }
    }
    
    if (!downloadClicked) {
      throw new Error('Failed to click download button with any method');
    }

    // Poll for fileUrl (instead of fixed 3s)
    console.log('⏳ Polling for file URL...');
    const start = Date.now();
    while (!fileUrl && Date.now() - start < POST_CLICK_MAX_MS) {
      await page1.waitForTimeout(POST_CLICK_POLL_MS);
      console.log(`⏳ Still waiting... (${Date.now() - start}ms elapsed)`);
    }

    if (!fileUrl) {
      throw new Error('❌ No valid file detected (timeout waiting for download response).');
    }
    console.log('✅ File URL detected successfully');

    // Use capturedResponse if we have it; else fetch fileUrl
    console.log('📥 Reading file content...');
    let csvText;
    try {
      if (capturedResponse) {
        // Use Playwright's response body (safer; avoids re-fetch auth issues)
        console.log('📥 Reading from captured response...');
        const bodyBuffer = await capturedResponse.body();
        csvText = bodyBuffer.toString('utf8');
        console.log('✅ File content read from captured response');
      } else {
        // fallback GET via context request
        console.log('📥 Fetching file via network request...');
        const resp = await page1.request.get(fileUrl);
        csvText = await resp.text();
        console.log('✅ File content fetched via network request');
      }
    } catch (err) {
      console.warn('⚠️ Could not read captured response body; fallback network GET', err);
      console.log('📥 Using fallback network request...');
      const resp = await page1.request.get(fileUrl);
      csvText = await resp.text();
      console.log('✅ File content read via fallback method');
    }

    // Save to disk
    console.log('💾 Saving file to disk...');
    const fullPath = path.join(downloadDir, filename);
    fs.writeFileSync(fullPath, csvText, 'utf-8');

    console.log('✅ File saved successfully:', fullPath);
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
