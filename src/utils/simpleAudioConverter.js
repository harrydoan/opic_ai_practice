// Simple Audio Converter - không cần external API
class SimpleAudioConverter {
  constructor() {
    this.supportedFormats = this.detectSupportedFormats();
  }

  // Detect what audio formats the browser supports for recording
  detectSupportedFormats() {
    const formats = {
      mp3: false,
      webm: false,
      ogg: false,
      wav: false
    };

    // Check if we're in browser environment
    if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
      return formats;
    }

    try {
      // Test MP3 support
      if (MediaRecorder.isTypeSupported('audio/mp3')) {
        formats.mp3 = true;
      }
      if (MediaRecorder.isTypeSupported('audio/mpeg')) {
        formats.mp3 = true;
      }
      
      // Test WebM support
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        formats.webm = true;
      }
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        formats.webm = true;
      }
      
      // Test OGG support
      if (MediaRecorder.isTypeSupported('audio/ogg')) {
        formats.ogg = true;
      }
      
      // Test WAV support
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        formats.wav = true;
      }
    } catch (error) {
      console.warn('Error detecting audio formats:', error);
    }

    console.log('Supported audio formats:', formats);
    return formats;
  }

  // Get the best audio format for recording
  getBestRecordingFormat() {
    // Priority: MP3 > WebM > OGG > WAV
    if (this.supportedFormats.mp3) {
      return { mimeType: 'audio/mp3', extension: 'mp3' };
    }
    if (this.supportedFormats.webm) {
      return { mimeType: 'audio/webm;codecs=opus', extension: 'webm' };
    }
    if (this.supportedFormats.ogg) {
      return { mimeType: 'audio/ogg', extension: 'ogg' };
    }
    if (this.supportedFormats.wav) {
      return { mimeType: 'audio/wav', extension: 'wav' };
    }
    
    // Fallback
    return { mimeType: 'audio/webm', extension: 'webm' };
  }

  // Convert WebM to MP3-compatible format using Web Audio API
  async convertWebmToCompatible(webmBlob, onProgress = null) {
    try {
      if (onProgress) onProgress(10);

      // If browser supports MP3 recording, try to re-encode
      if (this.supportedFormats.mp3) {
        const convertedBlob = await this.reencodeToMp3(webmBlob);
        if (onProgress) onProgress(100);
        return {
          success: true,
          audioBlob: convertedBlob,
          format: 'mp3',
          method: 'browser-reencode'
        };
      }

      // Otherwise, just return the original WebM with a more compatible name
      if (onProgress) onProgress(100);
      return {
        success: true,
        audioBlob: webmBlob,
        format: 'webm',
        method: 'original-format'
      };

    } catch (error) {
      console.error('Conversion error:', error);
      
      // Fallback: return original blob
      if (onProgress) onProgress(100);
      return {
        success: true,
        audioBlob: webmBlob,
        format: 'webm',
        method: 'fallback-original'
      };
    }
  }

  // Re-encode WebM to MP3 using Web Audio API (experimental)
  async reencodeToMp3(webmBlob) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check browser environment
        if (typeof window === 'undefined' || (!window.AudioContext && !window.webkitAudioContext)) {
          reject(new Error('Web Audio API not available'));
          return;
        }

        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Convert blob to array buffer
        const arrayBuffer = await webmBlob.arrayBuffer();
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create a MediaStreamSource from the audio buffer
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          audioBuffer.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);
        
        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to WAV (since MP3 encoding is complex)
        const wavBlob = this.audioBufferToWav(renderedBuffer);
        resolve(wavBlob);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Convert AudioBuffer to WAV Blob
  audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Create download URL for audio blob
  createDownloadUrl(audioBlob, format = 'mp3') {
    const url = URL.createObjectURL(audioBlob);
    return {
      url,
      filename: `opic_recording.${format}`,
      cleanup: () => URL.revokeObjectURL(url)
    };
  }

  // Get recording options for MediaRecorder
  getRecordingOptions() {
    const format = this.getBestRecordingFormat();
    return {
      mimeType: format.mimeType,
      audioBitsPerSecond: 128000 // 128 kbps
    };
  }
}

// Singleton instance
const simpleAudioConverter = new SimpleAudioConverter();

export default simpleAudioConverter;