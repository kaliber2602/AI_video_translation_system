import { useEffect, useState } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000';

function getArtifactUrl(artifactPath) {
  if (!artifactPath) return null;
  const filename = artifactPath.split('/').filter(Boolean).pop();
  return filename ? `${API_BASE_URL}/api/files/${encodeURIComponent(filename)}` : null;
}

function App() {
  const [health, setHealth] = useState('Checking...');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState('en');

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.message))
      .catch(() => setHealth('Backend unavailable'));
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_language', targetLanguage);

    setStatus('Uploading...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/uploads?target_language=${targetLanguage}`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResult(data);
      setStatus(`Uploaded ${data.filename}`);
    } catch (error) {
      setStatus('Upload failed');
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
        <select id="target-language" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
          <option value="en">English</option>
          <option value="vi">Vietnamese</option>
          <option value="fr">French</option>
          <option value="ja">Japanese</option>
        </select>
        <input type="file" accept="video/*" onChange={handleUpload} />
        {status ? <p>{status}</p> : null}
      </div>
      {result ? (
        <div className="card">
          <h2>Processing Result</h2>
          <p><strong>Stored file:</strong> {result.stored_name}</p>
          <p><strong>Transcript:</strong></p>
          <pre>{result.transcript}</pre>
          <p><strong>Markdown:</strong></p>
          <pre>{result.markdown}</pre>
          <p><strong>Generated files:</strong></p>
          <ul>
            {result.txt_path ? <li><a href={getArtifactUrl(result.txt_path)} target="_blank" rel="noreferrer">TXT</a></li> : null}
            {result.vtt_path ? <li><a href={getArtifactUrl(result.vtt_path)} target="_blank" rel="noreferrer">VTT</a></li> : null}
            {result.json_path ? <li><a href={getArtifactUrl(result.json_path)} target="_blank" rel="noreferrer">JSON</a></li> : null}
            {result.faq_path ? <li><a href={getArtifactUrl(result.faq_path)} target="_blank" rel="noreferrer">FAQ</a></li> : null}
            {result.quiz_path ? <li><a href={getArtifactUrl(result.quiz_path)} target="_blank" rel="noreferrer">Quiz</a></li> : null}
            {result.mindmap_path ? <li><a href={getArtifactUrl(result.mindmap_path)} target="_blank" rel="noreferrer">Mindmap</a></li> : null}
          </ul>
          {result.output_video_path ? (
            <div>
              <p><strong>Processed video:</strong></p>
              <video controls width="100%" src={getArtifactUrl(result.output_video_path)} />
            </div>
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
