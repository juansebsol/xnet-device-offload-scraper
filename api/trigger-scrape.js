// api/trigger-scrape.js
// POST /api/trigger-scrape
// Triggers the device offload scraper for a specific NAS ID
// This endpoint is designed to be called by GitHub Actions or external systems

// This endpoint now triggers GitHub Actions instead of scraping directly

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nas_id } = req.body;

    // Validate required parameters
    if (!nas_id) {
      return res.status(400).json({ 
        error: 'nas_id is required',
        example: { nas_id: 'bcb92300ae0c' }
      });
    }

    console.log(`🚀 API: Triggering GitHub Action for NAS ID: ${nas_id}`);

    // Check if GitHub token is available
    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured',
        details: 'GITHUB_TOKEN environment variable is required'
      });
    }

    // Trigger GitHub Action workflow
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY || 'your-username/xnet-device-offload-scraper'}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'device-offload-scrape',
          client_payload: {
            nas_id: nas_id,
            triggered_by: 'api',
            timestamp: new Date().toISOString()
          }
        })
      }
    );

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      console.error('GitHub API error:', workflowResponse.status, errorText);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to trigger GitHub Action',
        details: {
          github_status: workflowResponse.status,
          github_error: errorText
        }
      });
    }

    console.log(`✅ GitHub Action workflow triggered successfully for NAS ID: ${nas_id}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'GitHub Action workflow triggered successfully',
      details: {
        nas_id: nas_id,
        workflow: 'device-offload-scraper',
        event_type: 'device-offload-scrape',
        status: 'queued',
        note: 'Check GitHub Actions tab for progress and results'
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger GitHub Action',
      details: {
        nas_id: req.body?.nas_id,
        error_message: error.message
      }
    });
  }
};
