const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  let logs = '';
  const startTime = Date.now();
  
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    if (event.httpMethod !== 'POST') {
      logs += 'Method Not Allowed\n';
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed', logs }),
      };
    }

    const { webmBase64 } = JSON.parse(event.body || '{}');
    if (!webmBase64) {
      logs += 'Missing webmBase64\n';
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing webmBase64', logs }),
      };
    }

    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    logs += `[CloudConvert API Key Present]: ${(apiKey ? 'Yes' : 'No')}\n`;
    logs += `[webmBase64 Length]: ${(webmBase64 ? webmBase64.length : 0)}\n`;
    logs += `[Request Start Time]: ${new Date().toISOString()}\n`;
    
    if (!apiKey) {
      logs += 'Missing CloudConvert API key\n';
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing CloudConvert API key', logs }),
      };
    }

    // 1. Create job with better error handling
    let jobData = null;
    let jobResStatus = null;
    let jobResStatusText = null;
    
    try {
      logs += '[Creating CloudConvert Job...]\n';
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
              audio_bitrate: '128k', // Thêm bitrate để đảm bảo chất lượng
            },
            'export-my-file': {
              operation: 'export/url',
              input: 'convert-my-file',
            },
          },
        }),
      });
      
      jobResStatus = jobRes.status;
      jobResStatusText = jobRes.statusText;
      jobData = await jobRes.json();
      
      logs += `[CloudConvert Job Creation HTTP Status]: ${jobResStatus} ${jobResStatusText}\n`;
      logs += `[CloudConvert Job Creation Response]: ${JSON.stringify(jobData, null, 2)}\n`;
      
      if (!jobRes.ok) {
        logs += `[CloudConvert Job Creation Failed]: ${jobResStatus} ${jobResStatusText}\n`;
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: `CloudConvert job creation failed: ${jobResStatus} ${jobResStatusText}`, 
            logs 
          }),
        };
      }
    } catch (jobErr) {
      logs += `[CloudConvert Job Creation Error]: ${jobErr.message}\n`;
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: `CloudConvert job creation error: ${jobErr.message}`, 
          logs 
        }),
      };
    }

    if (!jobData.data || !jobData.data.id) {
      logs += '[CloudConvert Job Creation Response Error]\n' + JSON.stringify(jobData) + '\n';
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid job creation response', 
          logs 
        }),
      };
    }

    const jobId = jobData.data.id;
    logs += `[Job ID]: ${jobId}\n`;

    // 2. Poll for export url with shorter timeout (30 seconds max)
    let mp3Url = null;
    let lastPollData = null;
    const maxPolls = 10; // Giảm từ 40 xuống 10 lần (30 giây)
    const pollInterval = 3000; // 3 giây mỗi lần poll
    
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollInterval));
      
      try {
        logs += `[Polling attempt ${i+1}/${maxPolls}...]\n`;
        const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        
        const pollData = await pollRes.json();
        lastPollData = pollData;
        
        logs += `[Poll ${i+1} HTTP Status]: ${pollRes.status} ${pollRes.statusText}\n`;
        
        if (!pollRes.ok) {
          logs += `[Poll ${i+1} HTTP Error]: ${pollRes.status} ${pollRes.statusText}\n`;
          continue;
        }

        if (!pollData.data || !pollData.data.tasks) {
          logs += `[Poll ${i+1} Data Error]: Invalid response structure\n`;
          continue;
        }

        const exportTask = pollData.data.tasks.find(t => t.name === 'export-my-file');
        
        if (!exportTask) {
          logs += `[Poll ${i+1}]: Export task not found\n`;
          continue;
        }

        logs += `[Poll ${i+1} Export Task Status]: ${exportTask.status}\n`;
        
        if (exportTask.status === 'finished' && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
          mp3Url = exportTask.result.files[0].url;
          logs += `[Success! MP3 URL found]: ${mp3Url}\n`;
          break;
        } else if (exportTask.status === 'error') {
          logs += `[Poll ${i+1}]: Export task failed with error\n`;
          break;
        }
      } catch (pollErr) {
        logs += `[Poll ${i+1} Error]: ${pollErr.message}\n`;
      }
    }

    if (!mp3Url) {
      logs += '[Failed to get mp3 url from CloudConvert after all attempts]\n';
      logs += `[Total time elapsed]: ${Date.now() - startTime}ms\n`;
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to convert file to MP3. Please try again.', 
          logs 
        }),
      };
    }

    logs += `[Success! Total time]: ${Date.now() - startTime}ms\n`;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        mp3Url, 
        logs,
        conversionTime: Date.now() - startTime 
      }),
    };
    
  } catch (err) {
    logs += `[General Error]: ${err.message}\n`;
    logs += `[Total time elapsed]: ${Date.now() - startTime}ms\n`;
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: `Server error: ${err.message}`, 
        logs 
      }),
    };
  }
};
