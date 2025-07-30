import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

class AudioConverter {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.loading = false;
  }

  async loadFFmpeg() {
    if (this.loaded) return true;
    if (this.loading) {
      // Wait for loading to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.loaded;
    }

    this.loading = true;
    try {
      this.ffmpeg = new FFmpeg();
      
      // Load FFmpeg with CDN URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      this.loaded = true;
      console.log('FFmpeg loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      this.loaded = false;
      return false;
    } finally {
      this.loading = false;
    }
  }

  async convertWebmToMp3(webmBlob, onProgress = null) {
    // Check if client-side conversion is possible
    if (!this.isClientSideSupported()) {
      console.log('Client-side conversion not supported, using server-side fallback');
      try {
        const result = await this.convertWithCloudConvert(webmBlob, onProgress);
        return { success: true, mp3Url: result, method: 'server-side' };
      } catch (serverError) {
        console.error('Server-side conversion failed:', serverError);
        throw new Error(`Conversion failed: ${serverError.message}`);
      }
    }

    try {
      // Try client-side conversion first
      const result = await this.convertWithFFmpeg(webmBlob, onProgress);
      return { success: true, mp3Blob: result, method: 'client-side' };
    } catch (clientError) {
      console.warn('Client-side conversion failed:', clientError);
      
      // Fallback to server-side conversion
      try {
        const result = await this.convertWithCloudConvert(webmBlob, onProgress);
        return { success: true, mp3Url: result, method: 'server-side' };
      } catch (serverError) {
        console.error('Server-side conversion failed:', serverError);
        throw new Error(`Conversion failed. Client-side: ${clientError.message}. Server-side: ${serverError.message}`);
      }
    }
  }

  async convertWithFFmpeg(webmBlob, onProgress = null) {
    if (!await this.loadFFmpeg()) {
      throw new Error('FFmpeg not available');
    }

    const inputFileName = 'input.webm';
    const outputFileName = 'output.mp3';

    try {
      // Write input file
      const webmData = new Uint8Array(await webmBlob.arrayBuffer());
      await this.ffmpeg.writeFile(inputFileName, webmData);

      // Set up progress callback
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }

      // Convert webm to mp3
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-acodec', 'mp3',
        '-ab', '128k',
        '-ar', '44100',
        '-ac', '2',
        outputFileName
      ]);

      // Read output file
      const mp3Data = await this.ffmpeg.readFile(outputFileName);
      const mp3Blob = new Blob([mp3Data], { type: 'audio/mp3' });

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return mp3Blob;
    } catch (error) {
      // Cleanup on error
      try {
        await this.ffmpeg.deleteFile(inputFileName);
        await this.ffmpeg.deleteFile(outputFileName);
      } catch {}
      throw error;
    }
  }

  async convertWithCloudConvert(webmBlob, onProgress = null) {
    const base64 = await this.blobToBase64(webmBlob);
    
    if (onProgress) onProgress(10); // Upload started

    const response = await fetch('/.netlify/functions/convert-webm-to-mp3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webmBase64: base64 })
    });

    if (onProgress) onProgress(50); // Upload completed

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.mp3Url) {
      throw new Error('No MP3 URL received from server');
    }

    if (onProgress) onProgress(100); // Conversion completed

    return data.mp3Url;
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Check if client-side conversion is supported
  isClientSideSupported() {
    return typeof SharedArrayBuffer !== 'undefined' && 
           typeof WebAssembly !== 'undefined' &&
           window.crossOriginIsolated;
  }

  // Optimize audio before conversion
  async optimizeAudio(blob) {
    try {
      // Only optimize if FFmpeg is available
      if (!await this.loadFFmpeg()) {
        return blob;
      }

      const inputFileName = 'input.webm';
      const outputFileName = 'optimized.webm';

      const webmData = new Uint8Array(await blob.arrayBuffer());
      await this.ffmpeg.writeFile(inputFileName, webmData);

      // Optimize: reduce bitrate and sample rate
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-acodec', 'libopus',
        '-ab', '64k',
        '-ar', '22050',
        '-ac', '1', // mono
        outputFileName
      ]);

      const optimizedData = await this.ffmpeg.readFile(outputFileName);
      const optimizedBlob = new Blob([optimizedData], { type: 'audio/webm' });

      // Cleanup
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      return optimizedBlob;
    } catch (error) {
      console.warn('Audio optimization failed:', error);
      return blob;
    }
  }
}

// Singleton instance
const audioConverter = new AudioConverter();

export default audioConverter;