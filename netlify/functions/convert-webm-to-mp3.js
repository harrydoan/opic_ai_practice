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
    const jobData = await jobRes.json();
    if (!jobData.data || !jobData.data.id) {
      return {
        statusCode: 500,
        body: 'Failed to create CloudConvert job',
      };
    }
    const jobId = jobData.data.id;
    // 2. Poll for export url
    let mp3Url = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const pollRes = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const pollData = await pollRes.json();
      const exportTask = pollData.data.tasks.find(
        t => t.name === 'export-my-file' && t.status === 'finished'
      );
      if (exportTask && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
        mp3Url = exportTask.result.files[0].url;
        break;
      }
    }
    if (!mp3Url) {
      return {
        statusCode: 500,
        body: 'Failed to get mp3 url from CloudConvert',
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
