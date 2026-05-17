// src/scrapeDeviceOffloadDate.js
// Device-specific offload scraper with CUSTOM DATE RANGE support
// - Navigates to NASID Daily and sets custom date range
// - Accepts NASID, startDate, and endDate as parameters
// - Uses proven two-step Custom Date Range activation
// - Returns device offload data for specified date range

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { resolveDeviceIdentity } = require('./deviceIdentity');

const downloadDir = path.resolve(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

// config knobs (tune if needed)
const ARROWDOWN_PRESSES = 11;          // matches your working script
const PRE_CLICK_DELAY_MS = 1000;       // give UI time to bind download
const POST_CLICK_POLL_MS = 100;        // poll interval
const POST_CLICK_MAX_MS = 10000;       // total wait after click (10s)

/**
 * Sets custom date range in the NASID Daily interface.
 * @param {Page} page - Playwright page object
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
async function setCustomDateRange(page, startDate, endDate) {
  console.log('📅 Setting custom date range...');
  console.log(`   📅 Start Date: ${startDate}`);
  console.log(`   📅 End Date: ${endDate}`);

  try {
    await page.locator('div').filter({ hasText: /^Custom Date Range$/ }).click();
    console.log('✅ Custom Date Range clicked');

    console.log(`📅 Setting start date: ${startDate}`);
    await page.getByRole('textbox', { name: 'Start time' }).fill(startDate);
    console.log('✅ Start date filled successfully');

    console.log(`📅 Setting end date: ${endDate}`);
    await page.getByRole('textbox', { name: 'End Date' }).fill(endDate);
    console.log('✅ End date filled successfully');

    console.log('✅ Custom date range configured successfully');

  } catch (error) {
    console.error('❌ Failed to set custom date range:', error.message);
    throw new Error(`Failed to configure custom date range: ${error.message}`);
  }
}

async function scrapeDeviceOffloadDate(nasId, startDate, endDate, options = {}) {
  if (!nasId) {
    throw new Error('NAS ID is required');
  }
  if (!startDate || !endDate) {
    throw new Error('Both startDate and endDate are required');
  }

  const headless = options.headless !== undefined ? Boolean(options.headless) : true;
  const slowMo = Number(options.slowMo) || 0;

  const deviceIdentity = await resolveDeviceIdentity(nasId, options.deviceType);
  const normalizedNasId = deviceIdentity.nasId;
  const scrapeNasId = deviceIdentity.scrapeNasId;

  const browser = await chromium.launch({
    headless,
    slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    console.log('🚀 Starting device offload scraper with date range...');
    console.log(`🎯 Target NAS ID: ${normalizedNasId}`);
    console.log(`🧭 Single Digits lookup mode: ${deviceIdentity.lookupMode}`);
    console.log(`🧭 NAS ID used for scrape lookup: ${scrapeNasId}`);
    if (!headless) {
      console.log(`👁️ Running in headed UI mode${slowMo > 0 ? ` with slowMo=${slowMo}ms` : ''}`);
    }
    if (scrapeNasId !== normalizedNasId && deviceIdentity.deviceType) {
      console.log(`🧭 Device type formatting applied: ${deviceIdentity.deviceType}`);
    }
    console.log(`📅 Date Range: ${startDate} to ${endDate}`);
    
    // 🧑‍💻 Login sequence (same as original)
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

    // 📈 Navigate to Data Usage first, then NASID Daily
    console.log('📊 Clicking Data Usage...');
    await page1.getByRole('button', { name: 'Data Usage' }).click();
    console.log('✅ Data Usage clicked successfully');
    
    // Wait a moment for the Data Usage section to load
    await page1.waitForTimeout(1000);
    
    console.log('📊 Clicking NASID Daily...');
    await page1.getByRole('link', { name: 'NASID Daily' }).click();
    console.log('✅ NASID Daily clicked successfully');
    
    // NEW: Custom date range selection (this is the key difference from original scraper)
    await setCustomDateRange(page1, startDate, endDate);
    
    // Wait for the NASID input section to load
    console.log('🔍 Waiting for NASID input section...');
    await page1.waitForSelector('.sd-multi-auto-complete-pseudo-input', { timeout: 10000 });
    console.log('✅ NASID input section loaded');

    // Click on the NASID input field - use first one to avoid multiple matches
    console.log('🎯 Clicking NASID input field...');
    await page1.locator('.sd-multi-auto-complete-pseudo-input').first().click();
    console.log('✅ NASID input field clicked');

    // Wait for the dropdown/input to appear
    console.log('⏳ Waiting for NASID dropdown...');
    await page1.waitForSelector('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1', { timeout: 10000 });
    console.log('✅ NASID dropdown appeared');

    // Keep the same working dropdown selection as the normal scraper
    await page1.locator('div.sd-multi-auto-complete-option[value="FLKW"]').click();
    console.log('Drop Down Selection Completed');

    // Wait for the input field to appear and fill in the NASID
    console.log('✏️ Waiting for NASID text input...');
    await page1.waitForSelector('.hub-reporting-console-app-web-MuiInputBase-input.hub-reporting-console-app-web-MuiInput-input', { timeout: 10000 });
    console.log('✅ NASID text input appeared');

    // Fill in the NASID
    console.log(`🔢 Filling in NAS ID: ${scrapeNasId}`);
    await page1.locator('.hub-reporting-console-app-web-MuiInputBase-input.hub-reporting-console-app-web-MuiInput-input').fill(scrapeNasId);
    console.log('✅ NAS ID filled successfully');

    // Click Update button after filling NAS ID
    console.log('🔄 Clicking Update button...');
    await page1.locator('div').filter({ hasText: /^Auto-updateUpdate$/ }).click();
    await page1.getByRole('button', { name: 'Update' }).click();
    console.log('✅ Update button clicked successfully');

    // Wait for iframe
    console.log('🖼️ Waiting for iframe...');
    await page1.waitForSelector('iframe', { timeout: 30000 });
    const iframeHandle = await page1.locator('iframe').elementHandle();
    const frame = await iframeHandle.contentFrame();
    if (!frame) throw new Error('❌ iframe not ready');
    console.log('✅ iframe ready');

    // Open export menu - using the same working flow as the normal scraper
    console.log('📤 Opening export menu...');
    await frame.getByRole('button', { name: 'Inbound Daily NASID Summary' }).click();
    console.log('✅ Export button clicked successfully');

    console.log('⬇️ Clicking Download data...');
    await frame.getByRole('menuitem', { name: 'Download data' }).click();
    console.log('✅ Download data clicked successfully');

    // Open format dropdown and select CSV
    await frame.locator('#listbox-input-qr-export-modal-format').click();
    await frame.getByRole('option', { name: 'CSV' }).click();
    console.log('✅ CSV format selected');

    // Download the exported CSV using Playwright's download API
    const downloadPromise = page1.waitForEvent('download', { timeout: POST_CLICK_MAX_MS });

    // Download button click sequence
    await frame.locator('text=Format').click();
    await frame.locator('#qr-export-modal-download').click();

    const download = await downloadPromise;
    const filename = download.suggestedFilename() || `device-offload-date-${Date.now()}.csv`;
    const fullPath = path.join(downloadDir, filename);

    console.log('💾 Saving file to disk...');
    await download.saveAs(fullPath);
    console.log('✅ File downloaded successfully:', fullPath);

    console.log('📥 Reading file content...');
    const csvText = fs.readFileSync(fullPath, 'utf-8');

    console.log('✅ File saved successfully:', fullPath);
    console.log('📊 Preview:\n', csvText.substring(0, 500));

    return {
      csvText,
      filename,
      fullPath,
      nasId: normalizedNasId,
      scrapeNasId,
      deviceType: deviceIdentity.deviceType,
      lookupMode: deviceIdentity.lookupMode,
      startDate,
      endDate,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

// convenience direct-run
if (require.main === module) {
  require('dotenv').config();
  const nasId = process.argv[2];
  const startDate = process.argv[3];
  const endDate = process.argv[4];
  
  if (!nasId) {
    console.error('❌ Usage: node src/scrapeDeviceOffloadDate.js <NAS_ID> <START_DATE> <END_DATE>');
    console.error('   Example: node src/scrapeDeviceOffloadDate.js bcb92300ae0c 2025-07-01 2025-07-30');
    process.exit(1);
  }
  
  if (!startDate || !endDate) {
    console.error('❌ Both start date and end date are required');
    console.error('   Format: YYYY-MM-DD');
    console.error('   Example: node src/scrapeDeviceOffloadDate.js bcb92300ae0c 2025-07-01 2025-07-30');
    process.exit(1);
  }
  
  scrapeDeviceOffloadDate(nasId, startDate, endDate)
    .then((result) => {
      console.log('✅ Date range scraping completed successfully!');
      console.log(`📁 File: ${result.filename}`);
      console.log(`🎯 NAS ID: ${result.nasId}`);
      console.log(`📅 Date Range: ${result.startDate} to ${result.endDate}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ Date range scraping failed:', e);
      process.exit(1);
    });
}

module.exports = { scrapeDeviceOffloadDate };
