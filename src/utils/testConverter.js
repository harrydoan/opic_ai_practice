// Test utility để debug audio converter
export const testConverter = {
  // Test cross-origin isolation
  testCrossOriginIsolation() {
    console.log('=== Cross-Origin Isolation Test ===');
    console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');
    console.log('WebAssembly:', typeof WebAssembly !== 'undefined');
    console.log('crossOriginIsolated:', window.crossOriginIsolated);
    console.log('isSecureContext:', window.isSecureContext);
    
    return typeof SharedArrayBuffer !== 'undefined' && 
           typeof WebAssembly !== 'undefined' &&
           window.crossOriginIsolated;
  },

  // Test CloudConvert API
  async testCloudConvert() {
    console.log('=== CloudConvert API Test ===');
    try {
      const testBlob = new Blob(['test'], { type: 'audio/webm' });
      const base64 = await this.blobToBase64(testBlob);
      
      const response = await fetch('/.netlify/functions/convert-webm-to-mp3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webmBase64: base64 })
      });

      const result = await response.json();
      console.log('CloudConvert Response:', result);
      console.log('Status:', response.status);
      
      return response.ok;
    } catch (error) {
      console.error('CloudConvert Test Error:', error);
      return false;
    }
  },

  // Test FFmpeg loading
  async testFFmpegLoading() {
    console.log('=== FFmpeg Loading Test ===');
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { toBlobURL } = await import('@ffmpeg/util');
      
      const ffmpeg = new FFmpeg();
      console.log('FFmpeg instance created');
      
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      console.log('Loading FFmpeg core from:', baseURL);
      
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      console.log('FFmpeg loaded successfully');
      return true;
    } catch (error) {
      console.error('FFmpeg Loading Error:', error);
      return false;
    }
  },

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
  },

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Audio Converter Tests...\n');
    
    const crossOriginSupported = this.testCrossOriginIsolation();
    console.log('\n');
    
    const ffmpegWorks = await this.testFFmpegLoading();
    console.log('\n');
    
    const cloudConvertWorks = await this.testCloudConvert();
    console.log('\n');
    
    console.log('=== Test Results ===');
    console.log('✅ Cross-Origin Isolation:', crossOriginSupported ? 'SUPPORTED' : 'NOT SUPPORTED');
    console.log('✅ FFmpeg Loading:', ffmpegWorks ? 'WORKS' : 'FAILED');
    console.log('✅ CloudConvert API:', cloudConvertWorks ? 'WORKS' : 'FAILED');
    
    if (!crossOriginSupported && !cloudConvertWorks) {
      console.log('\n❌ BOTH CONVERSION METHODS FAILED!');
      console.log('Recommendations:');
      console.log('1. Set up CloudConvert API key');
      console.log('2. Deploy to production for Cross-Origin Isolation');
    }
    
    return {
      crossOriginSupported,
      ffmpegWorks,
      cloudConvertWorks
    };
  }
};

export default testConverter;