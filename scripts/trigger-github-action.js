#!/usr/bin/env node
// scripts/trigger-github-action.js
// Script to trigger the GitHub Actions workflow for device offload scraping
// This can be called from external systems or used for testing

const https = require('https');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'your-username/xnet-device-offload-scraper';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/dispatches`;

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  console.log('💡 Set it with: export GITHUB_TOKEN=your_github_token');
  process.exit(1);
}

async function triggerWorkflow(nasId, eventType = 'device-offload-scrape') {
  const payload = JSON.stringify({
    event_type: eventType,
    client_payload: {
      nas_id: nasId,
      timestamp: new Date().toISOString(),
      source: 'external-trigger'
    }
  });

  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${GITHUB_REPO}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'XNET-Device-Offload-Scraper',
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve({
            success: true,
            statusCode: res.statusCode,
            message: 'Workflow triggered successfully'
          });
        } else {
          try {
            const response = JSON.parse(data);
            resolve({
              success: false,
              statusCode: res.statusCode,
              message: response.message || 'Unknown error',
              response
            });
          } catch (e) {
            resolve({
              success: false,
              statusCode: res.statusCode,
              message: 'Invalid response format',
              rawData: data
            });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message
      });
    });

    req.write(payload);
    req.end();
  });
}

// Main execution
async function main() {
  const nasId = process.argv[2];
  
  if (!nasId) {
    console.log('📝 Usage: node scripts/trigger-github-action.js <nas_id>');
    console.log('💡 Example: node scripts/trigger-github-action.js bcb92300ae0c');
    console.log('');
    console.log('🔧 Environment variables:');
    console.log('  GITHUB_TOKEN - Your GitHub personal access token');
    console.log('  GITHUB_REPO  - Repository in format: owner/repo (optional)');
    process.exit(1);
  }

  console.log(`🚀 Triggering GitHub Actions workflow for NAS ID: ${nasId}`);
  console.log(`📦 Repository: ${GITHUB_REPO}`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    const result = await triggerWorkflow(nasId);
    
    if (result.success) {
      console.log('✅ Workflow triggered successfully!');
      console.log(`📊 Status: ${result.statusCode}`);
      console.log(`💬 Message: ${result.message}`);
      console.log('');
      console.log('🔗 You can monitor the workflow at:');
      console.log(`   https://github.com/${GITHUB_REPO}/actions`);
    } else {
      console.log('❌ Failed to trigger workflow');
      console.log(`📊 Status: ${result.statusCode}`);
      console.log(`💬 Message: ${result.message}`);
      
      if (result.response) {
        console.log('📋 Response details:', JSON.stringify(result.response, null, 2));
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error triggering workflow:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { triggerWorkflow };
