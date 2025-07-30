import React, { useState } from 'react';
import simpleAudioConverter from '../../utils/simpleAudioConverter';

function AudioTest() {
  const [testResults, setTestResults] = useState('');
  const [isTestingRecording, setIsTestingRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [convertedResult, setConvertedResult] = useState(null);

  const runFormatTest = () => {
    const supportedFormats = simpleAudioConverter.supportedFormats;
    const bestFormat = simpleAudioConverter.getBestRecordingFormat();
    const recordingOptions = simpleAudioConverter.getRecordingOptions();

    const results = `
🎵 Audio Format Support Test:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Supported Formats:
   MP3: ${supportedFormats.mp3 ? '✓' : '✗'}
   WebM: ${supportedFormats.webm ? '✓' : '✗'}
   OGG: ${supportedFormats.ogg ? '✓' : '✗'}
   WAV: ${supportedFormats.wav ? '✓' : '✗'}

🎯 Best Recording Format:
   Type: ${bestFormat.mimeType}
   Extension: ${bestFormat.extension}

⚙️ Recording Options:
   MIME Type: ${recordingOptions.mimeType}
   Bitrate: ${recordingOptions.audioBitsPerSecond} bps

🌐 Browser Capabilities:
   MediaRecorder: ${typeof MediaRecorder !== 'undefined' ? '✓' : '✗'}
   AudioContext: ${typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined' ? '✓' : '✗'}
   getUserMedia: ${navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? '✓' : '✗'}
    `;

    setTestResults(results);
  };

  const testRecording = async () => {
    setIsTestingRecording(true);
    setTestResults('🎤 Starting recording test...\n');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recordingOptions = simpleAudioConverter.getRecordingOptions();
      
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, recordingOptions);
        setTestResults(prev => prev + `✅ MediaRecorder created with: ${recordingOptions.mimeType}\n`);
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
        setTestResults(prev => prev + `⚠️ Fallback to default MediaRecorder: ${e.message}\n`);
      }

      const chunks = [];
      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      
      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);
        
        setTestResults(prev => prev + 
          `🎵 Recording completed:\n` +
          `   Size: ${(blob.size / 1024).toFixed(2)} KB\n` +
          `   Type: ${blob.type}\n` +
          `   Detected: ${mimeType}\n\n`
        );
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setIsTestingRecording(false);
      };

      mediaRecorder.start();
      setTestResults(prev => prev + '🔴 Recording for 3 seconds...\n');
      
      // Record for 3 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);

    } catch (error) {
      setTestResults(prev => prev + `❌ Recording error: ${error.message}\n`);
      setIsTestingRecording(false);
    }
  };

  const testConversion = async () => {
    if (!recordedBlob) {
      alert('Please record audio first!');
      return;
    }

    setTestResults(prev => prev + '🔄 Testing conversion...\n');

    try {
      const result = await simpleAudioConverter.convertWebmToCompatible(
        recordedBlob,
        (progress) => {
          setTestResults(prev => prev.replace(/🔄 Testing conversion\.\.\..*\n/, 
            `🔄 Testing conversion... ${Math.round(progress)}%\n`));
        }
      );

      setConvertedResult(result);
      
      setTestResults(prev => prev + 
        `✅ Conversion completed:\n` +
        `   Success: ${result.success}\n` +
        `   Format: ${result.format}\n` +
        `   Method: ${result.method}\n` +
        `   Size: ${(result.audioBlob.size / 1024).toFixed(2)} KB\n\n`
      );

      // Create download link
      const downloadInfo = simpleAudioConverter.createDownloadUrl(result.audioBlob, result.format);
      setTestResults(prev => prev + 
        `💾 Download ready: ${downloadInfo.filename}\n`
      );

    } catch (error) {
      setTestResults(prev => prev + `❌ Conversion error: ${error.message}\n`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5', margin: '10px', borderRadius: '8px' }}>
      <h3>🧪 Audio System Test</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={runFormatTest} style={{ marginRight: '10px', padding: '8px 16px' }}>
          Test Format Support
        </button>
        
        <button 
          onClick={testRecording} 
          disabled={isTestingRecording}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          {isTestingRecording ? 'Recording...' : 'Test Recording (3s)'}
        </button>
        
        <button 
          onClick={testConversion} 
          disabled={!recordedBlob}
          style={{ padding: '8px 16px' }}
        >
          Test Conversion
        </button>
      </div>

      {recordedBlob && (
        <div style={{ marginBottom: '10px' }}>
          <audio controls src={URL.createObjectURL(recordedBlob)} style={{ marginRight: '10px' }} />
          <span>Original Recording</span>
        </div>
      )}

      {convertedResult && (
        <div style={{ marginBottom: '10px' }}>
          <audio controls src={URL.createObjectURL(convertedResult.audioBlob)} style={{ marginRight: '10px' }} />
          <span>Converted Audio ({convertedResult.format})</span>
        </div>
      )}

      <pre style={{ 
        backgroundColor: 'white', 
        padding: '15px', 
        borderRadius: '4px', 
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        {testResults || 'Click "Test Format Support" to start testing...'}
      </pre>
    </div>
  );
}

export default AudioTest;