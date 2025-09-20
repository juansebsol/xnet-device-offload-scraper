#!/usr/bin/env node
// debug-date-range-2.js
// Debug script specifically for date format and filling issues
// Usage: node debug-date-range-2.js <NAS_ID> <START_DATE> <END_DATE> [headless]

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Create debug folder
const debugDir = path.resolve(__dirname, 'debug');
if (!fs.existsSync(debugDir)) {
  fs.mkdirSync(debugDir, { recursive: true });
}

// Date format conversion functions
function convertToMMDDYYYY(dateStr) {
  // Convert YYYY-MM-DD to MM/DD/YYYY
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

function convertToMMDDYYYYDashes(dateStr) {
  // Convert YYYY-MM-DD to MM-DD-YYYY
  const [year, month, day] = dateStr.split('-');
  return `${month}-${day}-${year}`;
}

async function debugDateFormats(nasId, startDate, endDate, headless = false) {
  console.log('🧪 DEBUG DATE RANGE 2: Date Format & Filling Issues');
  console.log('==================================================');
  console.log(`🎯 NAS ID: ${nasId}`);
  console.log(`📅 Start Date (YYYY-MM-DD): ${startDate}`);
  console.log(`📅 End Date (YYYY-MM-DD): ${endDate}`);
  console.log(`👁️ Headless Mode: ${headless}`);
  
  // Generate different date formats to test
  const startDateFormats = {
    'YYYY-MM-DD': startDate,
    'MM/DD/YYYY': convertToMMDDYYYY(startDate),
    'MM-DD-YYYY': convertToMMDDYYYYDashes(startDate)
  };
  
  const endDateFormats = {
    'YYYY-MM-DD': endDate,
    'MM/DD/YYYY': convertToMMDDYYYY(endDate),
    'MM-DD-YYYY': convertToMMDDYYYYDashes(endDate)
  };
  
  console.log('📋 Date formats to test:');
  console.log(`   Start Date: ${JSON.stringify(startDateFormats, null, 2)}`);
  console.log(`   End Date: ${JSON.stringify(endDateFormats, null, 2)}`);

  const browser = await chromium.launch({
    headless: headless,
    slowMo: headless ? 0 : 500,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  let page1;

  try {
    // Login sequence (abbreviated)
    console.log('📱 Navigating to OKTA start page...');
    await page.goto(process.env.OKTA_START_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    console.log('📧 Filling email...');
    await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.OKTA_EMAIL);
    await page.waitForTimeout(500);
    
    console.log('⏭️ Clicking Next...');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(1000);
    
    console.log('🔗 Clicking password link...');
    await page.getByRole('link', { name: 'Select Password.' }).click();
    await page.waitForTimeout(500);
    
    console.log('🔐 Filling password...');
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.OKTA_PASSWORD);
    await page.waitForTimeout(500);
    
    console.log('✅ Clicking Verify...');
    await page.getByRole('button', { name: 'Verify' }).click();
    await page.waitForTimeout(2000);

    // HUB popup
    console.log('🔄 Waiting for HUB popup...');
    const page1Promise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'launch app HUB Portal' }).click();
    page1 = await page1Promise;
    await page1.waitForTimeout(2000);

    // Navigate to NASID Daily
    console.log('📊 Clicking Data Usage...');
    await page1.getByRole('button', { name: 'Data Usage' }).click();
    await page1.waitForTimeout(1000);
    
    console.log('📊 Clicking NASID Daily...');
    await page1.getByRole('link', { name: 'NASID Daily' }).click();
    await page1.waitForTimeout(2000);

    // Screenshot: Initial state
    await page1.screenshot({ 
      path: path.join(debugDir, `v2-01-initial-state-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: Initial state');

    // Apply our proven two-step Custom Date Range activation
    console.log('🔧 Step 1: JavaScript state forcing...');
    await page1.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const customDateElements = elements.filter(el => 
        el.textContent && el.textContent.trim() === 'Custom Date Range'
      );
      
      if (customDateElements.length > 0) {
        const element = customDateElements[0];
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    });
    
    await page1.waitForTimeout(2000);

    console.log('🔄 Step 2: Playwright follow-up clicks...');
    try {
      await page1.getByText('Custom Date Range').click();
      console.log('✅ getByText click successful');
    } catch (error) {
      await page1.locator('div').filter({ hasText: /^Custom Date Range$/ }).click();
      console.log('✅ Filtered locator click successful');
    }
    
    await page1.waitForTimeout(3000);

    // Screenshot: After Custom Date Range activation
    await page1.screenshot({ 
      path: path.join(debugDir, `v2-02-after-custom-date-activation-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: After Custom Date Range activation');

    // Grid click to activate date picker
    console.log('📋 Activating date picker with grid click...');
    await page1.locator('.hub-reporting-console-app-web-MuiGrid-root.hub-reporting-console-app-web-MuiGrid-item.hub-reporting-console-app-web-MuiGrid-grid-xs-6').first().click();
    await page1.waitForTimeout(3000);

    // Screenshot: After grid click
    await page1.screenshot({ 
      path: path.join(debugDir, `v2-03-after-grid-click-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: After grid click');

    // Analyze available date inputs
    console.log('🔍 Analyzing available date inputs...');
    const inputAnalysis = await page1.evaluate(() => {
      const results = {
        startTimeInputs: [],
        endDateInputs: [],
        allDateInputs: [],
        allTextInputs: []
      };
      
      // Look for "Start time" inputs specifically
      const startTimeInputs = document.querySelectorAll('input[name*="start"], input[aria-label*="Start"], input[placeholder*="Start"], [role="textbox"][name*="start"]');
      startTimeInputs.forEach((input, i) => {
        results.startTimeInputs.push({
          index: i,
          tagName: input.tagName,
          type: input.type,
          name: input.name || 'null',
          id: input.id || 'null',
          placeholder: input.placeholder || 'null',
          ariaLabel: input.getAttribute('aria-label') || 'null',
          value: input.value || 'empty',
          disabled: input.disabled,
          readonly: input.readOnly
        });
      });
      
      // Look for "End Date" inputs specifically
      const endDateInputs = document.querySelectorAll('input[name*="end"], input[aria-label*="End"], input[placeholder*="End"], [role="textbox"][name*="end"]');
      endDateInputs.forEach((input, i) => {
        results.endDateInputs.push({
          index: i,
          tagName: input.tagName,
          type: input.type,
          name: input.name || 'null',
          id: input.id || 'null',
          placeholder: input.placeholder || 'null',
          ariaLabel: input.getAttribute('aria-label') || 'null',
          value: input.value || 'empty',
          disabled: input.disabled,
          readonly: input.readOnly
        });
      });
      
      // Look for all date-type inputs
      const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"], input[type="datetime"]');
      dateInputs.forEach((input, i) => {
        results.allDateInputs.push({
          index: i,
          type: input.type,
          name: input.name || 'null',
          id: input.id || 'null',
          value: input.value || 'empty'
        });
      });
      
      // Look for all text inputs
      const textInputs = document.querySelectorAll('input[type="text"], input:not([type]), [role="textbox"]');
      textInputs.forEach((input, i) => {
        results.allTextInputs.push({
          index: i,
          type: input.type || 'text',
          name: input.name || 'null',
          id: input.id || 'null',
          placeholder: input.placeholder || 'null',
          ariaLabel: input.getAttribute('aria-label') || 'null',
          value: input.value || 'empty'
        });
      });
      
      return results;
    });

    console.log('📊 INPUT ANALYSIS:');
    console.log(`   Start time inputs: ${inputAnalysis.startTimeInputs.length}`);
    console.log(`   End date inputs: ${inputAnalysis.endDateInputs.length}`);
    console.log(`   All date inputs: ${inputAnalysis.allDateInputs.length}`);
    console.log(`   All text inputs: ${inputAnalysis.allTextInputs.length}`);

    if (inputAnalysis.startTimeInputs.length > 0) {
      console.log('🔍 START TIME INPUTS FOUND:');
      inputAnalysis.startTimeInputs.forEach((input, i) => {
        console.log(`   ${i + 1}. ${input.tagName} type:"${input.type}" name:"${input.name}" aria-label:"${input.ariaLabel}" placeholder:"${input.placeholder}" value:"${input.value}" disabled:${input.disabled} readonly:${input.readonly}`);
      });
    }

    // Now try different date formats for filling
    console.log('🧪 TESTING DIFFERENT DATE FORMATS...');
    
    let successfulFormat = null;
    let successfulMethod = null;
    
    // Try different selectors for the start date field
    const startDateSelectors = [
      () => page1.getByRole('textbox', { name: 'Start time' }),
      () => page1.locator('input[aria-label*="Start"]').first(),
      () => page1.locator('input[placeholder*="Start"]').first(),
      () => page1.locator('input[name*="start"]').first(),
      () => page1.locator('input[type="date"]').first(),
      () => page1.locator('input[type="text"]').first()
    ];
    
    const selectorNames = [
      'getByRole textbox Start time',
      'aria-label Start',
      'placeholder Start', 
      'name start',
      'type date',
      'type text first'
    ];

    for (let selectorIndex = 0; selectorIndex < startDateSelectors.length; selectorIndex++) {
      const selectorName = selectorNames[selectorIndex];
      console.log(`\n🎯 Testing selector: ${selectorName}`);
      
      try {
        const selector = startDateSelectors[selectorIndex]();
        
        // Check if element exists and is visible
        const exists = await selector.count() > 0;
        if (!exists) {
          console.log(`   ❌ Selector not found: ${selectorName}`);
          continue;
        }
        
        console.log(`   ✅ Selector found: ${selectorName}`);
        
        // Try different date formats
        for (const [formatName, dateValue] of Object.entries(startDateFormats)) {
          console.log(`   🔄 Trying format ${formatName}: ${dateValue}`);
          
          try {
            // Clear field first
            await selector.fill('');
            await page1.waitForTimeout(500);
            
            // Fill with new value
            await selector.fill(dateValue);
            await page1.waitForTimeout(1000);
            
            // Verify the value was set
            const actualValue = await selector.inputValue();
            console.log(`   📝 Field value after fill: "${actualValue}"`);
            
            if (actualValue && actualValue !== '') {
              console.log(`   ✅ SUCCESS! Selector: ${selectorName}, Format: ${formatName}, Value: ${dateValue}`);
              successfulFormat = formatName;
              successfulMethod = selectorName;
              
              // Screenshot: After successful fill
              await page1.screenshot({ 
                path: path.join(debugDir, `v2-04-successful-fill-${formatName}-${headless ? 'headless' : 'headed'}.png`), 
                fullPage: true 
              });
              console.log('📸 Screenshot: After successful date fill');
              
              break; // Exit format loop
            } else {
              console.log(`   ⚠️ Fill appeared to work but field is empty`);
            }
          } catch (error) {
            console.log(`   ❌ Fill failed: ${error.message}`);
          }
        }
        
        if (successfulFormat) break; // Exit selector loop
        
      } catch (error) {
        console.log(`   ❌ Selector failed: ${selectorName} - ${error.message}`);
      }
    }

    // Final screenshot
    await page1.screenshot({ 
      path: path.join(debugDir, `v2-05-final-state-${headless ? 'headless' : 'headed'}.png`), 
      fullPage: true 
    });
    console.log('📸 Screenshot: Final state');

    if (successfulFormat) {
      console.log(`\n🎉 SUCCESS SUMMARY:`);
      console.log(`   Successful Format: ${successfulFormat}`);
      console.log(`   Successful Method: ${successfulMethod}`);
      console.log(`   Start Date Value: ${startDateFormats[successfulFormat]}`);
      
      // Now try to fill the end date using the same successful format and method
      console.log(`\n📅 Filling end date with successful format...`);
      try {
        const endDateValue = endDateFormats[successfulFormat];
        console.log(`   Trying to fill end date: ${endDateValue}`);
        
        // Try to find end date field
        const endDateSelectors = [
          () => page1.getByRole('textbox', { name: 'End Date' }),
          () => page1.locator('input[aria-label*="End"]').first(),
          () => page1.locator('input[placeholder*="End"]').first(),
          () => page1.locator('input[name*="end"]').first(),
          () => page1.locator('input[type="date"]').nth(1),
          () => page1.locator('input[type="text"]').nth(1)
        ];
        
        let endDateFilled = false;
        for (let i = 0; i < endDateSelectors.length; i++) {
          try {
            const endSelector = endDateSelectors[i]();
            const exists = await endSelector.count() > 0;
            if (exists) {
              await endSelector.fill('');
              await page1.waitForTimeout(500);
              await endSelector.fill(endDateValue);
              await page1.waitForTimeout(1000);
              
              const actualValue = await endSelector.inputValue();
              if (actualValue && actualValue !== '') {
                console.log(`   ✅ End date filled successfully: ${actualValue}`);
                endDateFilled = true;
                break;
              }
            }
          } catch (error) {
            console.log(`   ⚠️ End date selector ${i} failed: ${error.message}`);
          }
        }
        
        if (!endDateFilled) {
          console.log(`   ❌ Could not fill end date`);
        }
        
        // Screenshot after filling both dates
        await page1.screenshot({ 
          path: path.join(debugDir, `v2-06-both-dates-filled-${headless ? 'headless' : 'headed'}.png`), 
          fullPage: true 
        });
        console.log('📸 Screenshot: After filling both dates');
        
        // Now complete the full process like original scraper
        console.log(`\n🎯 Completing full scraper process...`);
        
        // Wait for NASID input section to load
        console.log('🔍 Waiting for NASID input section...');
        await page1.waitForSelector('.sd-multi-auto-complete-pseudo-input', { timeout: 10000 });
        console.log('✅ NASID input section loaded');

        // Click on the NASID input field
        console.log('🎯 Clicking NASID input field...');
        await page1.locator('.sd-multi-auto-complete-pseudo-input').first().click();
        console.log('✅ NASID input field clicked');

        // Wait for the dropdown/input to appear
        console.log('⏳ Waiting for NASID dropdown...');
        await page1.waitForSelector('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1', { timeout: 10000 });
        console.log('✅ NASID dropdown appeared');

        // Click on the dropdown option
        console.log('📋 Clicking NASID dropdown option...');
        await page1.waitForTimeout(500);
        
        const nasidDropdownOption = await page1.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1')
          .filter({ hasText: /NASID|nasid/i })
          .first();
        
        if (await nasidDropdownOption.count() > 0) {
          await nasidDropdownOption.click();
          console.log('✅ NASID dropdown option clicked (filtered)');
        } else {
          await page1.locator('.hub-reporting-console-app-web-MuiTypography-root.hub-reporting-console-app-web-MuiTypography-body1').first().click();
          console.log('✅ NASID dropdown option clicked (fallback)');
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

        // Wait for iframe to load
        console.log('🖼️ Waiting for iframe...');
        await page1.waitForSelector('iframe', { timeout: 30000 });
        console.log('✅ iframe loaded successfully');

        // Screenshot after Update button click
        await page1.screenshot({ 
          path: path.join(debugDir, `v2-07-after-update-click-${headless ? 'headless' : 'headed'}.png`), 
          fullPage: true 
        });
        console.log('📸 Screenshot: After Update button click');
        
        console.log(`\n🎉 FULL PROCESS COMPLETED SUCCESSFULLY!`);
        console.log(`   Date format that worked: ${successfulFormat}`);
        console.log(`   Selector that worked: ${successfulMethod}`);
        console.log(`   Start date: ${startDateFormats[successfulFormat]}`);
        console.log(`   End date: ${endDateFormats[successfulFormat]}`);
        console.log(`   NAS ID: ${nasId}`);
        
      } catch (error) {
        console.log(`❌ Error completing full process: ${error.message}`);
      }
      
    } else {
      console.log(`\n❌ NO SUCCESSFUL DATE FILL FOUND`);
      console.log(`   All selectors and formats failed`);
    }

    // Keep browser open for inspection in headed mode
    if (!headless) {
      console.log('🔍 Browser will stay open for 30 seconds for inspection...');
      await page1.waitForTimeout(30000);
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    
    try {
      if (page1) {
        await page1.screenshot({ 
          path: path.join(debugDir, `v2-99-error-${headless ? 'headless' : 'headed'}.png`), 
          fullPage: true 
        });
        console.log('📸 Error screenshot captured');
      }
    } catch (screenshotError) {
      console.log('⚠️ Could not take error screenshot');
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

// Command line execution
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  
  const nasId = process.argv[2] || '94:2a:6f:c6:3b:ac';
  const startDate = process.argv[3] || '2025-07-01';
  const endDate = process.argv[4] || '2025-07-30';
  const headlessArg = process.argv[5];
  
  let headless = true;
  if (headlessArg && (headlessArg.toLowerCase() === 'false' || headlessArg.toLowerCase() === 'headed' || headlessArg === '0')) {
    headless = false;
  }
  
  console.log('Usage: node debug-date-range-2.js <NAS_ID> <START_DATE> <END_DATE> [headless]');
  console.log('');
  
  debugDateFormats(nasId, startDate, endDate, headless)
    .then(() => {
      console.log('✅ Date format debug completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Date format debug failed:', error.message);
      process.exit(1);
    });
}
