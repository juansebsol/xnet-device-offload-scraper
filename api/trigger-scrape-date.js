// api/trigger-scrape-date.js
// POST /api/trigger-scrape-date
// Triggers the device offload scraper for a specific NAS ID with custom date range
// This endpoint is designed to be called by GitHub Actions or external systems

module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { nas_id, start_date, end_date } = req.body;

    // Validate required parameters
    if (!nas_id) {
      return res.status(400).json({ 
        error: 'nas_id is required',
        example: { 
          nas_id: 'bcb92300ae0c',
          start_date: '2025-10-25',
          end_date: '2025-10-30'
        }
      });
    }

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Both start_date and end_date are required for date range scraping',
        example: { 
          nas_id: 'bcb92300ae0c',
          start_date: '2025-10-25',
          end_date: '2025-10-30'
        }
      });
    }

    // Basic date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({
        error: 'Dates must be in YYYY-MM-DD format',
        provided: { start_date, end_date },
        example: { start_date: '2025-10-25', end_date: '2025-10-30' }
      });
    }

    // Validate date range logic
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    
    if (startDateObj >= endDateObj) {
      return res.status(400).json({
        error: 'start_date must be before end_date',
        provided: { start_date, end_date }
      });
    }

    console.log(`🚀 API: Triggering GitHub Action for NAS ID: ${nas_id}`);
    console.log(`📅 Date Range: ${start_date} to ${end_date}`);

    // Check if GitHub token is available
    if (!process.env.GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'GitHub token not configured',
        details: 'GITHUB_TOKEN environment variable is required'
      });
    }

    // Trigger GitHub Action workflow with date range
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
          event_type: 'device-offload-scrape-date',
          client_payload: {
            nas_id: nas_id,
            start_date: start_date,
            end_date: end_date,
            triggered_by: 'api_date_range',
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
    console.log(`📅 Date range: ${start_date} to ${end_date}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'GitHub Action workflow triggered successfully with date range',
      details: {
        nas_id: nas_id,
        start_date: start_date,
        end_date: end_date,
        workflow: 'device-offload-scraper',
        event_type: 'device-offload-scrape-date',
        status: 'queued',
        note: 'Check GitHub Actions tab for progress and results'
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to trigger GitHub Action with date range',
      details: {
        nas_id: req.body?.nas_id,
        start_date: req.body?.start_date,
        end_date: req.body?.end_date,
        error_message: error.message
      }
    });
  }
};
