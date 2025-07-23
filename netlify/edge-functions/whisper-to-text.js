import { Buffer } from 'node:buffer';

export default async (request, context) => {
  try {
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
    }
    const { audio, mimeType } = await request.json();
    if (!audio) {
      return new Response(JSON.stringify({ error: 'No audio data' }), { status: 400 });
    }
    // Giải mã base64 thành buffer
    const buffer = Buffer.from(audio, 'base64');
    // Tạo form data gửi lên OpenAI Whisper
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'en');

    const OPENAI_API_KEY = context.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY in environment' }), { status: 500 });
    }
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    if (!response.ok) {
      let errText = await response.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch {
        errJson = { message: errText };
      }
      return new Response(JSON.stringify({
        error: errJson.message || errJson.error || errText,
        code: response.status,
        type: errJson.type || undefined,
        details: errJson
      }), { status: response.status });
    }
    const transcript = await response.text();
    return new Response(JSON.stringify({ transcript }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
