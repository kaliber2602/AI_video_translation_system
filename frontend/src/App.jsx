import { useEffect, useState, useRef } from 'react';
import Hls from 'hls.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const S3_BUCKET_URL = import.meta.env.VITE_S3_BUCKET_URL || 'https://your-bucket.s3.amazonaws.com';

function App() {
  const [health, setHealth] = useState('Checking...');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('vi');
  const [videoUrl, setVideoUrl] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [availableQualities, setAvailableQualities] = useState([]);
  const [hlsError, setHlsError] = useState(null);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.message || 'OK'))
      .catch(() => setHealth('Backend unavailable'));
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setStatus('Uploading...');
    setResult(null);
    setVideoUrl(null);
    setAvailableQualities([]);
    setHlsError(null);
    setSelectedQuality('auto');
    setCurrentQuality('auto');
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/uploads?target_language=${targetLanguage}`,
        {
          method: 'POST',
          body: formData,
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }
      
      const data = await response.json();
      setResult(data);
      setStatus(`Uploaded ${data.filename}`);
      
      const hlsMasterPath = data.s3_info?.translated?.hls_master;
      if (hlsMasterPath) {
        const fullHlsUrl = `${S3_BUCKET_URL.replace(/\/+$/, '')}/${hlsMasterPath}`;
        console.log('HLS Master URL:', fullHlsUrl);
        setVideoUrl(fullHlsUrl);
        setStatus(`Video ready!`);
      } else {
        setStatus('Video processed but HLS URL not found');
        console.log('Response data:', data);
      }
      
    } catch (error) {
      setStatus(`Upload failed: ${error.message}`);
      console.error('Upload error:', error);
    }
  };

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!videoUrl || !video) return;

    console.log('Loading HLS video from:', videoUrl);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        debug: false,
        xhrSetup: function(xhr, url) {
          xhr.withCredentials = false;
        },
        forceLoad: true,
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('MANIFEST_PARSED event fired!');
        
        const levels = hls.levels;
        console.log('hls.levels:', levels);
        
        if (levels && levels.length > 0) {
          const qualities = ['auto', ...levels.map(level => `${level.height}p`)];
          console.log('Extracted qualities from hls.levels:', qualities);
          setAvailableQualities(qualities);
        } else {
          console.warn('No levels found in hls.levels');
          setAvailableQualities(['auto']);
        }
        
        video.play().catch(() => console.warn('Auto-play prevented'));
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const qualityName = `${level.height}p`;
          setCurrentQuality(qualityName);
          console.log(`Switched to quality: ${qualityName}`);
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('LEVEL_LOADED:', data);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              setHlsError(`HLS Error: ${data.type} - ${data.details}`);
              setStatus(`HLS playback error: ${data.details}`);
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        if (hls) {
          hls.destroy();
        }
      };
    } else {
      // Fallback to native HLS
      video.src = videoUrl;
      setAvailableQualities(['auto']);
      setStatus('Using native HLS player (quality selection limited)');
    }
  }, [videoUrl]);

  const handleQualityChange = (event) => {
    const quality = event.target.value;
    setSelectedQuality(quality);

    if (!hlsRef.current) {
      console.warn('hls.js not available, quality change ignored');
      return;
    }

    if (quality === 'auto') {
      hlsRef.current.currentLevel = -1;
      setCurrentQuality('auto');
      console.log('Switched to AUTO quality');
    } else {
      const height = parseInt(quality.replace('p', ''));
      const levelIndex = hlsRef.current.levels.findIndex(
        level => level.height === height
      );
      if (levelIndex !== -1) {
        hlsRef.current.currentLevel = levelIndex;
        console.log(`Switching to ${quality} (level ${levelIndex})`);
      } else {
        console.warn(`Quality ${quality} not found. Available levels:`, 
          hlsRef.current.levels.map(l => `${l.height}p`));
      }
    }
  };

  return (
    <div className="app-shell">
      <h1>AI Video Translation Platform</h1>
      <p>Upload a video to begin the translation pipeline.</p>
      
      <div className="card">
        <h2>System Status</h2>
        <p>{health}</p>
      </div>
      
      <div className="card">
        <h2>Upload Video</h2>
        <label htmlFor="target-language">Target language</label>
        <select 
          id="target-language" 
          value={targetLanguage} 
          onChange={(event) => setTargetLanguage(event.target.value)}
        >
          <option value="en">English</option>
          <option value="vi">Vietnamese</option>
          <option value="fr">French</option>
          <option value="ja">Japanese</option>
        </select>
        <input type="file" accept="video/*" onChange={handleUpload} />
        {status ? <p>{status}</p> : null}
        {hlsError ? <p style={{ color: '#ef4444' }}>{hlsError}</p> : null}
      </div>

      {videoUrl && (
        <div className="card">
          <h2>Translated Video</h2>
          
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label htmlFor="quality-select" style={{ fontWeight: '500' }}>
              Quality:
            </label>
            <select 
              id="quality-select" 
              value={selectedQuality} 
              onChange={handleQualityChange}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#f8fafc',
                fontSize: '14px',
                minWidth: '100px',
              }}
            >
              <option value="auto">Auto</option>
              {availableQualities
                .filter(q => q !== 'auto')
                .map(quality => (
                  <option key={quality} value={quality}>
                    {quality}
                  </option>
                ))}
            </select>
            
            {currentQuality && availableQualities.length > 0 && (
              <span style={{ 
                fontSize: '13px', 
                opacity: 0.7,
                padding: '4px 12px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '4px',
              }}>
                Currently: {currentQuality === 'auto' ? 'Auto (adaptive)' : currentQuality}
              </span>
            )}
          </div>
          
          <video
            ref={videoRef}
            controls
            playsInline
            width="100%"
            style={{ 
              maxHeight: '400px', 
              background: '#000',
              borderRadius: '8px',
            }}
          />
          
          {result && result.s3_info && (
            <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
              Video ID: {result.s3_info.video_id}
            </p>
          )}
        </div>
      )}

      {result ? (
        <div className="card">
          <h2>Processing Result</h2>
          <p><strong>Stored file:</strong> {result.stored_name}</p>
          <p><strong>Detected Language:</strong> {result.detected_language}</p>
          <p><strong>Target Language:</strong> {result.target_language}</p>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Message:</strong> {result.message}</p>
          {result.transcript ? (
            <>
              <p><strong>Transcript:</strong></p>
              <pre>{result.transcript}</pre>
            </>
          ) : null}
        </div>
      ) : null}
      
      <div className="card">
        <h2>Planned Features</h2>
        <ul>
          <li>Video upload and validation</li>
          <li>Speech-to-text and subtitles</li>
          <li>Translation and TTS</li>
          <li>Structured document generation</li>
        </ul>
      </div>
    </div>
  );
}

export default App;