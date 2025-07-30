const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed',
      };
    }
    const { webmBase64 } = JSON.parse(event.body || '{}');
    if (!webmBase64) {
      return {
        statusCode: 400,
        body: 'Missing webmBase64',
      };
    }
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: 'Missing CloudConvert API key',
      };
    }
    // 1. Create job
    let jobData = null;
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
    } catch (jobErr) {
      console.error('[CloudConvert Job Creation Error]', jobErr);
      return {
        statusCode: 500,
        body: 'Failed to create CloudConvert job. Error: ' + jobErr.message,
      };
    }
    if (!jobData.data || !jobData.data.id) {
      console.error('[CloudConvert Job Creation Response Error]', JSON.stringify(jobData));
      return {
        statusCode: 500,
        body: 'Failed to create CloudConvert job. Response: ' + JSON.stringify(jobData),
      };
    }
    const jobId = jobData.data.id;
    // 2. Poll for export url (increase timeout and log details)
    let mp3Url = null;
    let lastPollData = null;
    for (let i = 0; i < 40; i++) { // tăng số lần chờ lên 40 lần (tối đa ~2 phút)
      await new Promise(r => setTimeout(r, 3000));
      try {
        const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        const pollData = await pollRes.json();
        lastPollData = pollData;
        // Log trạng thái từng lần poll
        console.log(`[CloudConvert Poll ${i+1}]`, JSON.stringify(pollData));
        const exportTask = pollData.data.tasks.find(
          t => t.name === 'export-my-file'
        );
        if (exportTask) {
          console.log(`[CloudConvert Export Task ${i+1}]`, JSON.stringify(exportTask));
        }
        if (exportTask && exportTask.status === 'finished' && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
          mp3Url = exportTask.result.files[0].url;
          break;
        }
      } catch (pollErr) {
        console.error(`[CloudConvert Poll Error ${i+1}]`, pollErr);
      }
    }
    if (!mp3Url) {
      // Log chi tiết lỗi cuối cùng
      console.error('Failed to get mp3 url from CloudConvert. Last poll data:', JSON.stringify(lastPollData));
      return {
        statusCode: 500,
        body: 'Failed to get mp3 url from CloudConvert. Last poll data: ' + JSON.stringify(lastPollData),
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ mp3Url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Error: ' + err.message,
    };
  }
};
