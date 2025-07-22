// Google Cloud Speech-to-Text integration
// Requires backend proxy for authentication (do not expose API key in frontend)

export async function googleSpeechToText(audioBlob) {
  // Kiểm tra điều kiện file audio
  if (!audioBlob) {
    throw new Error('No audio file provided');
  }
  if (!(audioBlob instanceof Blob)) {
    throw new Error('Invalid audio file type');
  }
  // Google Cloud Speech-to-Text yêu cầu định dạng FLAC, LINEAR16 (wav), hoặc MP3
  const validTypes = ['audio/flac', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg'];
  if (!validTypes.includes(audioBlob.type)) {
    throw new Error('Invalid audio format. Required: FLAC, WAV, or MP3');
  }
  // Convert audioBlob to base64
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const audioBase64 = await toBase64(audioBlob);

  // Call backend API to Google Cloud Speech-to-Text
  // You must implement /api/speech-to-text endpoint in your backend
  const response = await fetch('/api/speech-to-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, mimeType: audioBlob.type })
  });
  if (!response.ok) {
    let errorMsg = 'Speech-to-text API error';
    try {
      const errJson = await response.json();
      errorMsg += `: ${errJson.error?.message || JSON.stringify(errJson)}`;
    } catch (e) {
      errorMsg += `: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }
  const data = await response.json();
  if (!data.transcript) {
    throw new Error('No transcript returned from API');
  }
  return data.transcript;
}
