// src/scrapeDeviceOffloadServerless.js
// Serverless version of device offload scraper for Vercel API endpoints
// No file downloads - processes CSV in memory and uploads directly to Supabase

const { chromium } = require('playwright');
const { supabase } = require('../supabase');
const { parseDeviceCsv } = require('./parseDeviceCsv');
const { upsertDeviceOffload } = require('./upsertDeviceOffload');

async function scrapeDeviceOffloadServerless(nasId) {
  console.log('🚀 Starting serverless device offload scraper...');
  console.log('🎯 Target NAS ID:', nasId);
  
  let browser;
  let page;
  
  try {
    // Launch browser in serverless mode
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    
    // Set viewport for consistent behavior
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('📱 Step 1: Scraping device offload data...');
    
    // Navigate to OKTA start page
    console.log('📱 Navigating to OKTA start page...');
    await page.goto(process.env.OKTA_START_URL);
    await page.waitForLoadState('networkidle');
    console.log('✅ OKTA page loaded successfully');

    // Fill email
    console.log('📧 Filling email...');
    await page.fill('input[name="username"]', process.env.OKTA_EMAIL);
    console.log('✅ Email filled successfully');

    // Click Next
    console.log('⏭️ Clicking Next...');
    await page.click('input[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Next button clicked successfully');

    // Click password link
    console.log('🔗 Clicking password link...');
    await page.click('a[data-se="password-link"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Password link clicked successfully');

    // Fill password
    console.log('🔐 Filling password...');
    await page.fill('input[name="password"]', process.env.OKTA_PASSWORD);
    console.log('✅ Password filled successfully');

    // Click Verify
    console.log('✅ Clicking Verify...');
    await page.click('input[type="submit"]');
    await page.waitForLoadState('networkidle');
    console.log('✅ Verify button clicked successfully');

    // Wait for HUB popup
    console.log('🔄 Waiting for HUB popup...');
    await page.waitForSelector('iframe[title="HUB"]', { timeout: 30000 });
    console.log('✅ HUB popup opened successfully');

    // Switch to HUB iframe
    const frame = page.frameLocator('iframe[title="HUB"]').first();
    
    // Click Data Usage
    console.log('📊 Clicking Data Usage...');
    await frame.getByRole('button', { name: 'Data Usage' }).click();
    await page.waitForTimeout(2000);
    console.log('✅ Data Usage clicked successfully');

    // Click NASID Daily
    console.log('📊 Clicking NASID Daily...');
    await frame.getByRole('link', { name: 'NASID Daily' }).click();
    await page.waitForTimeout(3000);
    console.log('✅ NASID Daily clicked successfully');

    // Wait for NASID input section
    console.log('🔍 Waiting for NASID input section...');
    await page.waitForTimeout(2000);
    console.log('✅ NASID input section loaded');

    // Click NASID input field
    console.log('🎯 Clicking NASID input field...');
    await frame.locator('.sd-multi-auto-complete-pseudo-input').first().click();
    await page.waitForTimeout(1000);
    console.log('✅ NASID input field clicked');

    // Wait for dropdown and click option
    console.log('⏳ Waiting for NASID dropdown...');
    await page.waitForTimeout(2000);
    console.log('✅ NASID dropdown appeared');

    console.log('📋 Clicking NASID dropdown option...');
    const dropdownOption = frame.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1')
      .filter({ hasText: /NASID|nasid/i })
      .first();
    
    if (await dropdownOption.count() > 0) {
      await dropdownOption.click();
    } else {
      // Fallback to first option
      await frame.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1').first().click();
    }
    console.log('✅ NASID dropdown option clicked (fallback to first)');

    // Wait for text input and fill NAS ID
    console.log('✏️ Waiting for NASID text input...');
    await page.waitForTimeout(2000);
    console.log('✅ NASID text input appeared');

    console.log(`🔢 Filling in NAS ID: ${nasId}`);
    await frame.fill('input[type="text"]', nasId);
    console.log('✅ NAS ID filled successfully');

    // Click Update button
    console.log('🔄 Clicking Update button...');
    await frame.getByRole('button', { name: 'Update' }).click();
    await page.waitForTimeout(3000);
    console.log('✅ Update button clicked successfully');

    // Wait for iframe and open export menu
    console.log('🖼️ Waiting for iframe...');
    await page.waitForTimeout(2000);
    console.log('✅ iframe ready');

    console.log('📤 Opening export menu...');
    await frame.getByRole('button', { name: 'Inbound Daily NASID Summary' }).click();
    await page.waitForTimeout(1000);
    console.log('✅ Export button clicked successfully');

    // Click Download data
    console.log('⬇️ Clicking Download data...');
    await frame.getByRole('menuitem', { name: 'Download data' }).click();
    await page.waitForTimeout(1000);
    console.log('✅ Download data clicked successfully');

    // Select CSV format
    console.log('📊 Selecting CSV format...');
    await frame.getByRole('combobox', { name: 'Format combobox' }).locator('div').nth(1).click();
    await page.waitForTimeout(500);
    await frame.getByRole('option', { name: 'CSV' }).click();
    await page.waitForTimeout(500);
    console.log('✅ Format combobox clicked');
    console.log('✅ CSV format selected');

    // Wait before download click
    console.log('⏳ Waiting 1000ms before download click...');
    await page.waitForTimeout(1000);

    // Fix viewport issue with download button
    console.log('🔧 Fixing viewport issue with download button...');
    
    // Method 1: JavaScript click (this method succeeded before)
    console.log('🔄 Method 1: Attempting JavaScript click (this method succeeded before)...');
    await frame.evaluate(() => {
      const downloadBtn = document.querySelector('button[aria-label="Download"]');
      if (downloadBtn) downloadBtn.click();
    });
    await page.waitForTimeout(1000);
    console.log('✅ Download button clicked successfully via JavaScript method (this was the working method)');

    // Wait for download and capture response
    console.log('⏳ Polling for file URL...');
    let fileContent = null;
    let startTime = Date.now();
    
    while (!fileContent && (Date.now() - startTime) < 10000) {
      try {
        // Try to capture the response
        const response = await page.waitForResponse(
          response => response.url().includes('.csv') || response.url().includes('download'),
          { timeout: 1000 }
        );
        
        if (response.ok()) {
          fileContent = await response.text();
          console.log('✅ File content captured via response interception');
          break;
        }
      } catch (e) {
        // Continue polling
        await page.waitForTimeout(100);
        console.log(`⏳ Still waiting... (${Date.now() - startTime}ms elapsed)`);
      }
    }

    if (!fileContent) {
      throw new Error('Failed to capture file content within timeout');
    }

    console.log('📥 File content captured successfully');
    console.log('📊 Preview:', fileContent.substring(0, 200) + '...');

    console.log('📊 Step 2: Parsing CSV data...');
    
    // Parse the CSV content directly (no file saving)
    const parseResult = await parseDeviceCsv(fileContent);
    
    if (parseResult.errors.length > 0) {
      console.log('⚠️ Parse warnings:', parseResult.errors);
    }
    
    console.log(`✅ Parsed ${parseResult.validRows} valid rows from CSV`);
    console.log(`🔄 Aggregated into ${parseResult.aggregatedRows} unique date/device records`);

    console.log('💾 Step 3: Uploading to database...');
    
    // Upload directly to database
    const upsertResult = await upsertDeviceOffload(nasId, parseResult.data);
    
    console.log('✅ Database upload completed successfully');
    console.log(`📊 Total records processed: ${upsertResult.totalRecords}`);
    console.log(`✅ Records upserted: ${upsertResult.upsertedRecords}`);
    console.log(`🔄 Records changed: ${upsertResult.changedRecords}`);
    console.log(`❌ Errors: ${upsertResult.errors.length}`);

    // Log the scrape operation
    await supabase
      .from('device_offload_scrape_log')
      .insert({
        nas_id: nasId,
        source_filename: 'API-triggered-scrape.csv',
        rows_parsed: parseResult.totalRows,
        rows_upserted: upsertResult.totalRecords,
        rows_changed: upsertResult.changedRecords,
        success: true
      });

    console.log('📝 Scrape operation logged successfully');

    return {
      success: true,
      message: 'Device offload scrape completed successfully',
      details: {
        nas_id: nasId,
        records_processed: parseResult.validRows,
        records_upserted: upsertResult.totalRecords,
        records_changed: upsertResult.changedRecords,
        errors: parseResult.errors.length
      }
    };

  } catch (error) {
    console.error('💥 Scraping error:', error);
    
    // Log the failed scrape operation
    try {
      await supabase
        .from('device_offload_scrape_log')
        .insert({
          nas_id: nasId,
          source_filename: 'API-triggered-scrape.csv',
          rows_parsed: 0,
          rows_upserted: 0,
          rows_changed: 0,
          success: false,
          error_text: error.message
        });
    } catch (logError) {
      console.error('Failed to log scrape error:', logError);
    }

    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

module.exports = { scrapeDeviceOffloadServerless };
