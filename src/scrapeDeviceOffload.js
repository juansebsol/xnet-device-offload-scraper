// src/scrapeDeviceOffload.js
// Device-specific offload scraper for Single Digits HUB portal
// - Navigates to NASID Daily instead of Data Usage Timeline
// - Accepts NASID as parameter
// - Parses device-specific CSV format
// - Returns device offload data

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

/**
 * Sets custom date range in the NASID Daily interface
 * @param {Page} page - Playwright page object
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
async function setCustomDateRange(page, startDate, endDate) {
  console.log('📅 Setting custom date range...');
  console.log(`   📅 Start Date: ${startDate}`);
  console.log(`   📅 End Date: ${endDate}`);

  try {
    // Click Custom Date Range option - use exact selector from working sequence
    console.log('🔘 Clicking Custom Date Range...');
    try {
      await page.locator('div').filter({ hasText: /^Custom Date Range$/ }).click();
      console.log('✅ Custom Date Range clicked successfully (exact selector)');
    } catch (error) {
      console.log('⚠️ Exact selector failed, trying getByText fallback...');
      await page.getByText('Custom Date Range').click();
      console.log('✅ Custom Date Range clicked successfully (fallback)');
    }

    // Wait for UI to update after clicking Custom Date Range
    await page.waitForTimeout(2000);

    // CRITICAL: Click the grid element to activate date picker (from working sequence)
    console.log('📋 Activating date picker with grid click...');
    await page.locator('.hub-reporting-console-app-web-MuiGrid-root.hub-reporting-console-app-web-MuiGrid-item.hub-reporting-console-app-web-MuiGrid-grid-xs-6').first().click();
    console.log('✅ Date picker activated successfully');

    // Wait for date inputs to appear
    await page.waitForTimeout(2000);

    // Fill Start Date
    console.log(`📅 Setting start date: ${startDate}`);
    await page.getByRole('textbox', { name: 'Start time' }).fill(startDate);
    await page.getByRole('textbox', { name: 'Start time' }).press('Tab');
    await page.getByRole('textbox', { name: 'Start time' }).press('Tab');
    console.log('✅ Start date set successfully');

    // Fill End Date
    console.log(`📅 Setting end date: ${endDate}`);
    await page.getByRole('textbox', { name: 'End Date' }).fill(endDate);
    await page.getByRole('textbox', { name: 'End Date' }).press('Enter');
    console.log('✅ End date set successfully');

    // Wait for date selection to settle
    await page.waitForTimeout(1000);
    console.log('✅ Custom date range configured successfully');

  } catch (error) {
    console.error('❌ Failed to set custom date range:', error.message);
    throw new Error(`Failed to configure custom date range: ${error.message}`);
  }
}

async function scrapeDeviceOffload(nasId, options = {}) {
  if (!nasId) {
    throw new Error('NAS ID is required');
  }

  const { startDate, endDate } = options;
  const useCustomDateRange = startDate && endDate;

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  let fileUrl = '';
  let filename = '';
  let capturedResponse = null;

  try {
    console.log('🚀 Starting device offload scraper...');
    console.log(`🎯 Target NAS ID: ${nasId}`);
    if (useCustomDateRange) {
      console.log(`📅 Custom Date Range: ${startDate} to ${endDate}`);
    } else {
      console.log('📅 Using default date range (last 7 days)');
    }
    
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
    
    // NEW: Custom date range selection (if specified)
    if (useCustomDateRange) {
      await setCustomDateRange(page1, startDate, endDate);
    }
    
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

    // Click on the dropdown option - use a more specific selector to avoid multiple matches
    console.log('📋 Clicking NASID dropdown option...');
    
    // Wait for the NASID dropdown to be more specific
    await page1.waitForTimeout(500);
    
    // Try to find the NASID dropdown specifically by looking for elements that contain NASID-related text
    const nasidDropdownOption = await page1.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1')
      .filter({ hasText: /NASID|nasid/i })
      .first();
    
    if (await nasidDropdownOption.count() > 0) {
      await nasidDropdownOption.click();
      console.log('✅ NASID dropdown option clicked (filtered)');
    } else {
      // Fallback: click the first dropdown option if no NASID-specific one found
      await page1.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1').first().click();
      console.log('✅ NASID dropdown option clicked (fallback to first)');
    }

    // Wait for the input field to appear and fill in the NASID
    console.log('✏️ Waiting for NASID text input...');
    await page1.waitForSelector('.hub-reporting-console-app-web-MuiInputBase-input.hub-reporting-console-app-web-MuiInput-input', { timeout: 10000 });
    console.log('✅ NASID text input appeared');

    // Fill in the NASID
    console.log(`🔢 Filling in NAS ID: ${nasId}`);
    await page1.locator('.hub-reporting-console-app-web-MuiInputBase-input.hub-reporting-console-app-web-MuiInput-input').fill(nasId);
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

    // Open export menu - using correct button names from your working code
    console.log('📤 Opening export menu...');
    await frame.getByRole('button', { name: 'Inbound Daily NASID Summary' }).click();
    console.log('✅ Export button clicked successfully');
    
    console.log('⬇️ Clicking Download data...');
    await frame.getByRole('menuitem', { name: 'Download data' }).click();
    console.log('✅ Download data clicked successfully');
    
    // Select CSV format
    console.log('📊 Selecting CSV format...');
    await frame.getByRole('combobox', { name: 'Format combobox' }).locator('div').nth(1).click();
    console.log('✅ Format combobox clicked');
    
    await frame.getByRole('option', { name: 'CSV' }).click();
    console.log('✅ CSV format selected');

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
          filename = match?.[1] || 'device_offload.csv';
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

    return { csvText, filename, fullPath, nasId };
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
    console.error('❌ Usage: node src/scrapeDeviceOffload.js <NAS_ID> [START_DATE] [END_DATE]');
    console.error('   Example: node src/scrapeDeviceOffload.js bcb92300ae0c 2025-10-25 2025-10-30');
    console.error('   Default: Uses default date range if dates not provided');
    process.exit(1);
  }
  
  const options = {};
  if (startDate && endDate) {
    options.startDate = startDate;
    options.endDate = endDate;
  }
  
  scrapeDeviceOffload(nasId, options)
    .then((result) => {
      console.log('✅ Scraping completed successfully!');
      console.log(`📁 File: ${result.filename}`);
      console.log(`🎯 NAS ID: ${result.nasId}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('❌ Scraping failed:', e);
      process.exit(1);
    });
}

module.exports = { scrapeDeviceOffload };
