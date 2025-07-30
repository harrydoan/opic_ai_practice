const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  let logs = '';
  try {
    if (event.httpMethod !== 'POST') {
      logs += 'Method Not Allowed\n';
      return {
        statusCode: 405,
        body: logs,
      };
    }
    const { webmBase64 } = JSON.parse(event.body || '{}');
    if (!webmBase64) {
      logs += 'Missing webmBase64\n';
      return {
        statusCode: 400,
        body: logs,
      };
    }
    const apiKey = process.env.CLOUDCONVERT_API_KEY;
    logs += `[CloudConvert API Key Present]: ${(apiKey ? 'Yes' : 'No')}\n`;
    logs += `[webmBase64 Length]: ${(webmBase64 ? webmBase64.length : 0)}\n`;
    if (!apiKey) {
      logs += 'Missing CloudConvert API key\n';
      return {
        statusCode: 500,
        body: logs,
      };
    }
    // 1. Create job
    let jobData = null;
    let jobResStatus = null;
    let jobResStatusText = null;
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
      jobResStatus = jobRes.status;
      jobResStatusText = jobRes.statusText;
      jobData = await jobRes.json();
      logs += '[CloudConvert Job Creation]\n' + JSON.stringify(jobData, null, 2) + '\n';
      logs += `[CloudConvert Job Creation HTTP Status]: ${jobResStatus} ${jobResStatusText}\n`;
      if (!jobRes.ok) {
        logs += '[CloudConvert Job Creation HTTP Error]\n';
        return {
          statusCode: 500,
          body: logs,
        };
      }
    } catch (jobErr) {
      logs += '[CloudConvert Job Creation Error]: ' + jobErr.message + '\n';
      return {
        statusCode: 500,
        body: logs,
      };
    }
    if (!jobData.data || !jobData.data.id) {
      logs += '[CloudConvert Job Creation Response Error]\n' + JSON.stringify(jobData) + '\n';
      return {
        statusCode: 500,
        body: logs,
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
        logs += `[CloudConvert Poll ${i+1}]\n` + JSON.stringify(pollData, null, 2) + '\n';
        logs += `[CloudConvert Poll HTTP Status ${i+1}]: ${pollRes.status} ${pollRes.statusText}\n`;
        if (!pollRes.ok) {
          logs += `[CloudConvert Poll HTTP Error ${i+1}]\n`;
        }
        if (!pollData.data || !pollData.data.tasks) {
          logs += `[CloudConvert Poll Data Error ${i+1}]\n` + JSON.stringify(pollData) + '\n';
        }
        const exportTask = pollData.data && pollData.data.tasks ? pollData.data.tasks.find(
          t => t.name === 'export-my-file'
        ) : null;
        if (exportTask) {
          logs += `[CloudConvert Export Task ${i+1}]\n` + JSON.stringify(exportTask, null, 2) + '\n';
          if (exportTask.status !== 'finished') {
            logs += `[CloudConvert Export Task Not Finished ${i+1}] Status: ${exportTask.status}\n`;
          }
        } else {
          logs += `[CloudConvert Export Task Missing ${i+1}]\n` + JSON.stringify(pollData.data ? pollData.data.tasks : pollData) + '\n';
        }
        if (exportTask && exportTask.status === 'finished' && exportTask.result && exportTask.result.files && exportTask.result.files[0]) {
          mp3Url = exportTask.result.files[0].url;
          break;
        }
      } catch (pollErr) {
        logs += `[CloudConvert Poll Error ${i+1}]: ${pollErr.message}\n`;
      }
    }
    if (!mp3Url) {
      logs += '[Failed to get mp3 url from CloudConvert]\n';
      return {
        statusCode: 500,
        body: logs,
      };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ mp3Url, logs }),
    };
  } catch (err) {
    logs += '[General Error]: ' + err.message + '\n';
    return {
      statusCode: 500,
      body: logs,
    };
  }
};
