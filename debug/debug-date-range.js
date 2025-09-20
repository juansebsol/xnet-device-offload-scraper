#!/usr/bin/env node
// debug-date-range.js
// Debug script to test custom date range selection
// Usage: node debug-date-range.js <NAS_ID> <START_DATE> <END_DATE> [headless]

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create debug folder
const debugDir = path.resolve(__dirname, 'debug');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
  console.log('📁 Created debug folder');
}

async function debugDateRangeSelection(nasId, startDate, endDate, headless = false) {
  console.log('🔍 DEBUG: Starting date range selection test...');
  console.log(`🎯 NAS ID: ${nasId}`);
  console.log(`📅 Start Date: ${startDate}`);
  console.log(`📅 End Date: ${endDate}`);
  console.log(`👁️ Headless Mode: ${headless}`);

  const browser = await chromium.launch({
    headless: headless,
    slowMo: headless ? 0 : 1000,     // Only slow down in headed mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  let page1; // Declare page1 in the outer scope

  try {
    // Login sequence
    console.log('📱 Navigating to OKTA start page...');
    await page.goto(process.env.OKTA_START_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(headless ? 1000 : 2000);
    
    console.log('📧 Filling email...');
    await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.OKTA_EMAIL);
    await page.waitForTimeout(headless ? 500 : 1000);
    
    console.log('⏭️ Clicking Next...');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(headless ? 1000 : 2000);
    
    console.log('🔗 Clicking password link...');
    await page.getByRole('link', { name: 'Select Password.' }).click();
    await page.waitForTimeout(headless ? 500 : 1000);
    
    console.log('🔐 Filling password...');
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.OKTA_PASSWORD);
    await page.waitForTimeout(headless ? 500 : 1000);
    
    console.log('✅ Clicking Verify...');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForTimeout(headless ? 2000 : 3000);

    // HUB popup
    console.log('🔄 Waiting for HUB popup...');
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'launch app HUB Portal' }).click();
    page1 = await page1Promise;
    await page1.waitForTimeout(headless ? 2000 : 3000);

    // Navigate to Data Usage
    console.log('📊 Clicking Data Usage...');
    await page1.getByRole('button', { name: 'Data Usage' }).click();
    await page1.waitForTimeout(headless ? 1000 : 2000);
    
    // Navigate to NASID Daily
    console.log('📊 Clicking NASID Daily...');
    await page1.getByRole('link', { name: 'NASID Daily' }).click();
    await page1.waitForTimeout(headless ? 2000 : 3000);

    // Screenshot: Before date range selection
    await page1.screenshot({ 
      path: path.join(debugDir, `01-before-date-range-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: Before date range selection');

    // CRITICAL: Custom Date Range selection using proven two-step approach
    console.log('📅 Setting custom date range...');
    console.log(`   📅 Start Date: ${startDate}`);
    console.log(`   📅 End Date: ${endDate}`);

    // Step 1: JavaScript state forcing to partially activate the button
    console.log('🔧 Step 1: JavaScript state forcing...');
    const jsStateForced = await page1.evaluate(() => {
      // Find Custom Date Range elements
      const elements = Array.from(document.querySelectorAll('*'));
      const customDateElements = elements.filter(el => 
        el.textContent && el.textContent.trim() === 'Custom Date Range'
      );
      
      if (customDateElements.length > 0) {
        const element = customDateElements[0];
        console.log('Found Custom Date Range element:', element.tagName, element.className);
        
        // Try multiple JavaScript click methods
        const clickMethods = [
          () => element.click(),
          () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
          () => element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })),
          () => element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true })),
          () => {
            const button = element.closest('button') || element.closest('[role="button"]');
            if (button) {
              button.click();
              return true;
            }
            return false;
          }
        ];
        
        for (let i = 0; i < clickMethods.length; i++) {
          try {
            console.log(`Trying JavaScript click method ${i + 1}...`);
            const result = clickMethods[i]();
            if (result !== false) {
              // Immediate check for date inputs
              const dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="date"], input[placeholder*="Date"]');
              if (dateInputs.length > 0) {
                console.log(`SUCCESS! Found ${dateInputs.length} date inputs after method ${i + 1}`);
                return true;
              }
              console.log(`Method ${i + 1} executed, checking for UI changes...`);
            }
          } catch (error) {
            console.log(`JavaScript method ${i + 1} failed:`, error.message);
          }
        }
      }
      
      console.log('JavaScript state forcing completed (partial success expected)');
      return false; // Partial success or setup for next step
    });

    console.log(`🔧 JavaScript state forcing result: ${jsStateForced ? 'SUCCESS' : 'PARTIAL'}`);

    // Wait for potential UI changes after JavaScript forcing
    await page1.waitForTimeout(headless ? 2000 : 1000);

    // Step 2: Follow up with Playwright clicks to complete activation
    console.log('🔄 Step 2: Playwright follow-up clicks...');
    let playwrightClickSuccess = false;
    
    // Method 1: Try getByText click
    try {
      console.log('🔘 Trying getByText click after JavaScript forcing...');
      await page1.getByText('Custom Date Range').click();
      console.log('✅ getByText click successful');
      playwrightClickSuccess = true;
    } catch (error) {
      console.log('⚠️ getByText click failed, trying filtered locator...');
      
      // Method 2: Try filtered locator click
      try {
        console.log('🔘 Trying filtered locator click after JavaScript forcing...');
        await page1.locator('div').filter({ hasText: /^Custom Date Range$/ }).click();
        console.log('✅ Filtered locator click successful');
        playwrightClickSuccess = true;
      } catch (error2) {
        console.log('⚠️ Both Playwright click methods failed after JavaScript forcing');
      }
    }
    
    console.log(`🔄 Playwright follow-up result: ${playwrightClickSuccess ? 'SUCCESS' : 'COMPLETED'}`);

    // Wait for final UI changes after the combined approach
    await page1.waitForTimeout(headless ? 3000 : 2000);

    // Screenshot: After combined JavaScript + Playwright activation
    await page1.screenshot({ 
      path: path.join(debugDir, `02-after-combined-activation-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: After combined JavaScript + Playwright activation');

    // Step 2: Click grid element to activate date picker
    console.log('📋 Activating date picker with grid click...');
    await page1.locator('.hub-reporting-console-app-web-MuiGrid-root.hub-reporting-console-app-web-MuiGrid-item.hub-reporting-console-app-web-MuiGrid-grid-xs-6').first().click();
    console.log('✅ Date picker activated successfully');

    // Wait for date inputs to appear
    await page1.waitForTimeout(headless ? 2000 : 3000);

    // Screenshot: After grid click (date picker should be active)
    await page1.screenshot({ 
      path: path.join(debugDir, `03-after-grid-click-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: After grid click (date picker active)');

    // DEBUG: Check what textboxes are available
    console.log('🔍 DEBUG: Checking available textboxes...');
    const allTextboxes = await page1.getByRole('textbox').all();
    console.log(`🔍 Found ${allTextboxes.length} total textboxes`);
    
    for (let i = 0; i < Math.min(allTextboxes.length, 15); i++) {
      try {
        const placeholder = await allTextboxes[i].getAttribute('placeholder') || 'null';
        const name = await allTextboxes[i].getAttribute('name') || 'null';
        const ariaLabel = await allTextboxes[i].getAttribute('aria-label') || 'null';
        const id = await allTextboxes[i].getAttribute('id') || 'null';
        const type = await allTextboxes[i].getAttribute('type') || 'null';
        const value = await allTextboxes[i].inputValue() || 'empty';
        
        console.log(`   ${i + 1}. placeholder:"${placeholder}" name:"${name}" aria-label:"${ariaLabel}" id:"${id}" type:"${type}" value:"${value}"`);
      } catch (e) {
        console.log(`   ${i + 1}. (could not get attributes: ${e.message})`);
      }
    }

    // Try to find Start time textbox specifically
    console.log('🔍 Looking for "Start time" textbox specifically...');
    const startTimeInputs = await page1.getByRole('textbox', { name: 'Start time' }).all();
    console.log(`🔍 Found ${startTimeInputs.length} 'Start time' textboxes`);
    
    // Try alternative selectors for date inputs
    console.log('🔍 Trying alternative date input selectors...');
    
    const alternativeSelectors = [
      'input[type="date"]',
      'input[placeholder*="date"]',
      'input[placeholder*="Date"]',
      'input[aria-label*="date"]',
      'input[aria-label*="Date"]',
      'input[name*="start"]',
      'input[name*="Start"]',
      '.MuiInputBase-input',
      '[data-testid*="date"]',
      '[data-testid*="start"]'
    ];

    for (const selector of alternativeSelectors) {
      try {
        const elements = await page1.locator(selector).all();
        if (elements.length > 0) {
          console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
          
          // Try to get attributes of first matching element
          try {
            const firstElement = elements[0];
            const placeholder = await firstElement.getAttribute('placeholder') || 'null';
            const name = await firstElement.getAttribute('name') || 'null';
            const ariaLabel = await firstElement.getAttribute('aria-label') || 'null';
            const type = await firstElement.getAttribute('type') || 'null';
            console.log(`   First element: placeholder:"${placeholder}" name:"${name}" aria-label:"${ariaLabel}" type:"${type}"`);
          } catch (e) {
            console.log(`   Could not get attributes: ${e.message}`);
          }
        }
      } catch (e) {
        // Selector not found, continue
      }
    }

    if (startTimeInputs.length > 0) {
      // Try to fill the dates
      console.log(`📅 Attempting to fill start date: ${startDate}`);
      try {
        await page1.getByRole('textbox', { name: 'Start time' }).fill(startDate);
        await page1.getByRole('textbox', { name: 'Start time' }).press('Tab');
        await page1.getByRole('textbox', { name: 'Start time' }).press('Tab');
        console.log('✅ Start date filled successfully');

        console.log(`📅 Attempting to fill end date: ${endDate}`);
        await page1.getByRole('textbox', { name: 'End Date' }).fill(endDate);
        await page1.getByRole('textbox', { name: 'End Date' }).press('Enter');
        console.log('✅ End date filled successfully');

        // Screenshot: After filling dates
        await page1.screenshot({ 
          path: path.join(debugDir, `04-dates-filled-${headless ? 'headless' : 'headed'}.png`), 
          fullPage: true 
        });
        console.log('📸 Screenshot: After filling dates');

        console.log('✅ Date range selection completed successfully!');
      } catch (fillError) {
        console.error(`❌ Failed to fill dates: ${fillError.message}`);
      }
    } else {
      console.log('❌ No Start time textbox found - cannot proceed with date filling');
      
      // Screenshot: Error state - no date inputs found
      await page1.screenshot({ 
        path: path.join(debugDir, `05-error-no-date-inputs-${headless ? 'headless' : 'headed'}.png`), 
        fullPage: true 
      });
      console.log('📸 Screenshot: Error state - no date inputs found');
    }

    // Keep browser open for manual inspection in headed mode
    if (!headless) {
      console.log('🔍 Browser will stay open for 30 seconds for inspection...');
      await page1.waitForTimeout(30000);
    }

    console.log('🎉 DEBUG: Date range test completed!');

  } catch (error) {
    console.error('❌ DEBUG: Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Screenshot: Error state
    try {
      if (page1) {
        await page1.screenshot({ 
          path: path.join(debugDir, `99-error-state-${headless ? 'headless' : 'headed'}.png`), 
          fullPage: true 
        });
        console.log('📸 Screenshot: Error state captured');
      } else {
        console.log('⚠️ page1 not available for error screenshot');
      }
    } catch (screenshotError) {
      console.log('⚠️ Could not take error screenshot');
    }
    
    // Keep browser open for inspection in headed mode
    if (!headless && page1) {
      console.log('🔍 Browser will stay open for inspection...');
      await page1.waitForTimeout(10000);
    }
    
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

// Command line execution
if (require.main === module) {
  // Load .env from parent directory since we're in debug/ folder
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  const nasId = process.argv[2] || '94:2a:6f:c6:3b:ac';
  const startDate = process.argv[3] || '2025-09-01';
  const endDate = process.argv[4] || '2025-09-19';
  const headlessArg = process.argv[5];
  
  // Determine headless mode
  let headless = true; // Default to headless
  if (headlessArg) {
    if (headlessArg.toLowerCase() === 'false' || headlessArg.toLowerCase() === 'headed' || headlessArg === '0') {
      headless = false;
    }
  }
  
  console.log('🧪 DEBUG SCRIPT: Custom Date Range Selection');
  console.log('===============================================');
  console.log('Usage: node debug-date-range.js <NAS_ID> <START_DATE> <END_DATE> [headless]');
  console.log('  headless: true (default), false, headed, 0 = show browser');
  console.log('');
  
  debugDateRangeSelection(nasId, startDate, endDate, headless)
    .then(() => {
      console.log('✅ Debug completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugDateRangeSelection };
