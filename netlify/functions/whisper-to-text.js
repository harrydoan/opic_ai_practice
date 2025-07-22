const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }
    const { audio, mimeType } = JSON.parse(event.body || '{}');
    if (!audio) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No audio data' })
      };
    }
    // Giải mã base64 thành buffer
    const buffer = Buffer.from(audio, 'base64');
    fs.writeFileSync('/tmp/temp_audio', buffer);

    // Chuẩn bị form data gửi lên OpenAI Whisper
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/temp_audio'));
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'en');

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing OPENAI_API_KEY in environment' })
      };
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    fs.unlinkSync('/tmp/temp_audio');
    if (!response.ok) {
      const err = await response.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ error: err })
      };
    }
    const transcript = await response.text();
    return {
      statusCode: 200,
      body: JSON.stringify({ transcript })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
