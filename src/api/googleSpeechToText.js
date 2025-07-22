// Google Cloud Speech-to-Text integration
// Requires backend proxy for authentication (do not expose API key in frontend)

export async function googleSpeechToText(audioBlob) {
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
    body: JSON.stringify({ audio: audioBase64 })
  });
  if (!response.ok) {
    throw new Error('Speech-to-text API error');
  }
  const data = await response.json();
  return data.transcript || '';
}
