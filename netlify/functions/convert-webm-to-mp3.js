const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const { webmBase64 } = JSON.parse(event.body || '{}');
    if (!webmBase64) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing webmBase64' }),
      };
    }

    // Validate base64 size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (webmBase64.length > maxSize * 1.37) { // base64 is ~37% larger than binary
      return {
        statusCode: 413,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }),
      };
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'CloudConvert API key not configured' }),
      };
    }

    // 1. Create job with better error handling
    let jobData = null;
    let jobId = null;
    
    try {
      const jobRes = await fetch('https://api.cloudconvert.com/v2/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: {
            'import-my-file': {
              operation: 'import/base64',
              file: webmBase64,
              filename: 'recording.webm',
            },
            'convert-my-file': {
              operation: 'convert',
              input: 'import-my-file',
              input_format: 'webm',
              output_format: 'mp3',
              audio_codec: 'mp3',
              audio_bitrate: '128',
              audio_frequency: '44100',
            },
            'export-my-file': {
              operation: 'export/url',
              input: 'convert-my-file',
            },
          },
        }),
      });

      jobData = await jobRes.json();
      console.log('[CloudConvert Job Creation]', JSON.stringify(jobData));

      if (!jobRes.ok) {
        const errorMsg = jobData?.message || jobData?.error || `HTTP ${jobRes.status}`;
        console.error('[CloudConvert Job Creation HTTP Error]', jobRes.status, jobRes.statusText, JSON.stringify(jobData));
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: `CloudConvert job creation failed: ${errorMsg}`,
            details: jobData
          }),
        };
      }

      if (!jobData.data?.id) {
        console.error('[CloudConvert Job Creation Response Error]', JSON.stringify(jobData));
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Invalid job creation response',
            details: jobData
          }),
        };
      }

      jobId = jobData.data.id;
    } catch (jobErr) {
      console.error('[CloudConvert Job Creation Error]', jobErr);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Job creation failed: ${jobErr.message}`,
          type: 'network_error'
        }),
      };
    }

    // 2. Poll for completion with exponential backoff
    let mp3Url = null;
    let lastPollData = null;
    const maxAttempts = 60; // Increase max attempts
    let waitTime = 1000; // Start with 1 second
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, waitTime));
      
      try {
        const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        
        if (!pollRes.ok) {
          console.error(`[CloudConvert Poll HTTP Error ${i+1}]`, pollRes.status, pollRes.statusText);
          // Continue polling for non-critical HTTP errors
          if (pollRes.status >= 500) {
            waitTime = Math.min(waitTime * 1.5, 10000); // Exponential backoff, max 10s
            continue;
          }
        }

        const pollData = await pollRes.json();
        lastPollData = pollData;

        if (!pollData.data?.tasks) {
          console.error(`[CloudConvert Poll Data Error ${i+1}]`, JSON.stringify(pollData));
          continue;
        }

        // Check all task statuses
        const tasks = pollData.data.tasks;
        const importTask = tasks.find(t => t.name === 'import-my-file');
        const convertTask = tasks.find(t => t.name === 'convert-my-file');
        const exportTask = tasks.find(t => t.name === 'export-my-file');

        // Log task statuses for debugging
        console.log(`[CloudConvert Poll ${i+1}] Import: ${importTask?.status}, Convert: ${convertTask?.status}, Export: ${exportTask?.status}`);

        // Check for any failed tasks
        const failedTask = tasks.find(t => t.status === 'error');
        if (failedTask) {
          console.error(`[CloudConvert Task Failed]`, JSON.stringify(failedTask));
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: `Conversion failed: ${failedTask.message || 'Unknown error'}`,
              task: failedTask.name,
              details: failedTask
            }),
          };
        }

        // Check if export task is finished
        if (exportTask?.status === 'finished' && exportTask.result?.files?.[0]?.url) {
          mp3Url = exportTask.result.files[0].url;
          console.log(`[CloudConvert Success] Got MP3 URL after ${i+1} attempts`);
          break;
        }

        // Adaptive wait time based on task progress
        if (exportTask?.status === 'processing' || convertTask?.status === 'processing') {
          waitTime = Math.min(waitTime * 1.1, 5000); // Slower increase when processing
        } else {
          waitTime = Math.min(waitTime * 1.2, 8000); // Faster increase when waiting
        }

      } catch (pollErr) {
        console.error(`[CloudConvert Poll Error ${i+1}]`, pollErr);
        waitTime = Math.min(waitTime * 1.5, 10000);
      }
    }

    if (!mp3Url) {
      // Enhanced error reporting
      const tasks = lastPollData?.data?.tasks || [];
      const taskStatuses = tasks.map(t => ({ name: t.name, status: t.status, message: t.message }));
      
      console.error('[CloudConvert Timeout] Final task statuses:', taskStatuses);
      
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Conversion timeout after ' + maxAttempts + ' attempts',
          taskStatuses,
          suggestion: 'File might be too large or complex. Try a shorter recording.',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mp3Url }),
    };

  } catch (err) {
    console.error('[CloudConvert Function Error]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error: ' + err.message,
        type: 'server_error'
      }),
    };
  }
};
