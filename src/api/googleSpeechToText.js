// Google Cloud Speech-to-Text integration
// Requires backend proxy for authentication (do not expose API key in frontend)


// OpenAI Whisper API integration via backend proxy
export async function whisperSpeechToText(audioBlob) {
  if (!audioBlob) throw new Error('No audio file provided');
  if (!(audioBlob instanceof Blob)) throw new Error('Invalid audio file type');
  // Whisper hỗ trợ mp3, mp4, mpeg, mpga, wav, webm
  const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/mpga', 'audio/wav', 'audio/webm'];
  if (!validTypes.includes(audioBlob.type)) {
    throw new Error('Invalid audio format. Required: mp3, wav, webm, mp4, mpeg, mpga');
  }
  const toBase64 = blob => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const audioBase64 = await toBase64(audioBlob);

  // Call backend API to OpenAI Whisper
  const response = await fetch('/api/whisper-to-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, mimeType: audioBlob.type })
  });
  if (!response.ok) {
    let errorMsg = 'Whisper API error';
    try {
      const errJson = await response.json();
      errorMsg += `: ${errJson.error || JSON.stringify(errJson)}`;
    } catch (e) {
      errorMsg += `: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }
  const data = await response.json();
  if (!data.transcript) throw new Error('No transcript returned from API');
  return data.transcript;
}
