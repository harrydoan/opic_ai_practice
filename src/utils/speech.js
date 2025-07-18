// Simple utility for text-to-speech using Web Speech API
export function speakText(text, lang = 'en-US') {
  if (!window.speechSynthesis) return;
  const utter = new window.SpeechSynthesisUtterance(text);
  utter.lang = lang;
  window.speechSynthesis.speak(utter);
}
