import { useState, useEffect, useRef, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import './App.css';

// ─────────────────────────────────────────────
//  WaveSurfer hook
//  Fix: use MediaElement backend (more compatible),
//       and wait for DOM to be ready before creating.
// ─────────────────────────────────────────────
function useWaveSurfer(audioUrl, accentColor = '#a855f7') {
  const containerRef = useRef(null);
  const wsRef        = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady,   setIsReady  ] = useState(false);

  useEffect(() => {
    if (!audioUrl) return;

    // Wait one frame so the DOM element is definitely mounted
    const raf = requestAnimationFrame(() => {
      if (!containerRef.current) return;

      // Tear down old instance
      if (wsRef.current) {
        try { wsRef.current.destroy(); } catch (_) {}
        wsRef.current = null;
      }
      setIsPlaying(false);
      setIsReady(false);

      const ws = WaveSurfer.create({
        container:     containerRef.current,
        waveColor:     'rgba(255,255,255,0.2)',
        progressColor: accentColor,
        cursorColor:   'rgba(255,255,255,0.6)',
        cursorWidth:   1,
        barWidth:      2,
        barGap:        1,
        barRadius:     2,
        height:        64,
        normalize:     true,
        interact:      true,
        // MediaElement is more broadly compatible than WebAudio
        backend:       'MediaElement',
      });

      ws.load(audioUrl);
      ws.on('ready',  () => setIsReady(true));
      ws.on('play',   () => setIsPlaying(true));
      ws.on('pause',  () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));
      ws.on('error',  (e) => console.error('WaveSurfer error', e));

      wsRef.current = ws;
    });

    return () => {
      cancelAnimationFrame(raf);
      if (wsRef.current) {
        try { wsRef.current.destroy(); } catch (_) {}
        wsRef.current = null;
      }
    };
  }, [audioUrl, accentColor]); // eslint-disable-line

  const togglePlay = useCallback(() => {
    if (wsRef.current && isReady) wsRef.current.playPause();
  }, [isReady]);

  return { containerRef, isPlaying, isReady, togglePlay };
}

// ── Download helper ──
async function downloadFile(url, name) {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

// ─────────────────────────────────────────────
//  Vocal Player — two switchable tracks
// ─────────────────────────────────────────────
function VocalPlayer({ vocalsUrl, instrumentalUrl, filename }) {
  const [activeTrack, setActiveTrack] = useState('instrumental');

  const currentUrl  = activeTrack === 'instrumental' ? instrumentalUrl : vocalsUrl;
  const accentColor = activeTrack === 'instrumental' ? '#3b82f6' : '#a855f7';

  const { containerRef, isPlaying, isReady, togglePlay } =
    useWaveSurfer(currentUrl, accentColor);

  return (
    <div className="player-shell fade-in">
      <div className="track-tabs">
        <button
          className={`track-tab tab-blue ${activeTrack === 'instrumental' ? 'active' : ''}`}
          onClick={() => setActiveTrack('instrumental')}
        >
          🎸 Instrumental Track
        </button>
        <button
          className={`track-tab tab-purple ${activeTrack === 'vocals' ? 'active' : ''}`}
          onClick={() => setActiveTrack('vocals')}
        >
          🎤 Vocals Only
        </button>
      </div>

      <div className="player-body">
        <div className="player-track-label">
          {activeTrack === 'instrumental' ? 'Instrumental (No Vocals)' : 'Isolated Vocals'} — {filename}
        </div>

        <div className="player-controls-row">
          <button
            className="play-btn-circle"
            style={{ background: accentColor }}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {!isReady ? (
              <span className="spin">◌</span>
            ) : isPlaying ? '⏸' : '▶'}
          </button>
          <div className="waveform-wrap" ref={containerRef} />
        </div>

        <div className="download-row">
          <button className="btn-download"
            onClick={() => downloadFile(instrumentalUrl, `Instrumental_${filename}`)}>
            <span className="dl-icon">⬇</span> Download Instrumental
          </button>
          <button className="btn-download"
            onClick={() => downloadFile(vocalsUrl, `Vocals_${filename}`)}>
            <span className="dl-icon">⬇</span> Download Vocals
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Effects Player — single track
// ─────────────────────────────────────────────
function EffectsPlayer({ audioUrl, filename }) {
  const { containerRef, isPlaying, isReady, togglePlay } =
    useWaveSurfer(audioUrl, '#a855f7');

  return (
    <div className="player-shell fade-in">
      <div className="player-body">
        <div className="player-track-label">Effects Applied — {filename}</div>
        <div className="player-controls-row">
          <button
            className="play-btn-circle"
            style={{ background: '#9333ea' }}
            onClick={togglePlay}
          >
            {!isReady ? <span className="spin">◌</span> : isPlaying ? '⏸' : '▶'}
          </button>
          <div className="waveform-wrap" ref={containerRef} />
        </div>
        <button className="btn-download-full"
          onClick={() => downloadFile(audioUrl, `Edited_${filename}`)}>
          <span>⬇</span> Download Edited Audio
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════
//  Main App
//  Fix: separate isProcessing + progress per tab
// ═════════════════════════════════════════════
export default function App() {
  const [activeTab, setActiveTab] = useState('remover');
  const [file, setFile]           = useState(null);
  const [pitch, setPitch]         = useState(0);
  const [volume, setVolume]       = useState(0.0);
  const [reverb, setReverb]       = useState(0.0);

  // ── Per-tab processing state (the key fix) ──
  const [removerProcessing, setRemoverProcessing] = useState(false);
  const [removerProgress,   setRemoverProgress  ] = useState(0);
  const [effectsProcessing, setEffectsProcessing] = useState(false);
  const [effectsProgress,   setEffectsProgress  ] = useState(0);

  // Results — kept separate so switching tabs never leaks state
  const [vocalsUrl,       setVocalsUrl      ] = useState(null);
  const [instrumentalUrl, setInstrumentalUrl] = useState(null);
  const [editedUrl,       setEditedUrl      ] = useState(null);

  const [history, setHistory] = useState([]);

  // ── File pick ──
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      // Clear only the current tab's result
      if (activeTab === 'remover') { setVocalsUrl(null); setInstrumentalUrl(null); }
      else                          { setEditedUrl(null); }
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    // Do NOT clear results — let each tab remember its own output
  };

  // ── Generic fetch helper ──
  const callApi = async (removeVocals) => {
    if (!file || (file && !file.size)) return alert('Please upload an audio file first.');

    const setProcessing = removeVocals ? setRemoverProcessing : setEffectsProcessing;
    const setProgress   = removeVocals ? setRemoverProgress   : setEffectsProgress;

    setProcessing(true);
    setProgress(0);

    const timer = setInterval(() => {
      setProgress(prev => prev >= 92 ? 92 : prev + 1);
    }, 600);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('pitch', pitch);
    formData.append('volume', volume);
    formData.append('reverb', reverb);
    formData.append('remove_vocals', removeVocals.toString());

    try {
      const response = await fetch('http://127.0.0.1:8000/api/edit-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      clearInterval(timer);
      setProgress(100);

      if (removeVocals) {
        setInstrumentalUrl(data.instrumental_url);
        setVocalsUrl(data.vocals_url);
        setHistory(prev => [{
          id: Date.now(), filename: file.name, tab: 'remover',
          vocalsUrl: data.vocals_url, instrumentalUrl: data.instrumental_url,
        }, ...prev].slice(0, 5));
      } else {
        setEditedUrl(data.edited_url);
        setHistory(prev => [{
          id: Date.now(), filename: file.name, tab: 'effects',
          editedUrl: data.edited_url,
        }, ...prev].slice(0, 5));
      }
    } catch (err) {
      clearInterval(timer);
      alert('Error: ' + err.message);
    } finally {
      setTimeout(() => setProcessing(false), 300);
    }
  };

  // ── History ──
  const loadHistoryProject = (p) => {
    setActiveTab(p.tab);
    setFile({ name: p.filename, size: 1 }); // size=1 so guard doesn't block
    if (p.tab === 'remover') {
      setVocalsUrl(p.vocalsUrl);
      setInstrumentalUrl(p.instrumentalUrl);
    } else {
      setEditedUrl(p.editedUrl);
    }
  };

  const deleteHistoryProject = (e, id) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(p => p.id !== id));
  };

  // ── Render ──
  return (
    <div className="app-container">

      {/* Sidebar */}
      <div className="sidebar-glass">
        <h2 className="sidebar-title">Recent Projects</h2>
        {history.length === 0
          ? <p className="empty-history">No projects yet</p>
          : history.map(p => (
            <div key={p.id} className="history-item" onClick={() => loadHistoryProject(p)}>
              <div className="history-info">
                <span className="history-name">{p.filename}</span>
                <span className="history-badge">{p.tab === 'remover' ? 'Vocal Removal' : 'Effects'}</span>
              </div>
              <button className="delete-btn" onClick={(e) => deleteHistoryProject(e, p.id)}>✕</button>
            </div>
          ))
        }
      </div>

      {/* Main Card */}
      <div className="glass-card">
        <h1 className="title">Studio AI</h1>

        <div className="tabs">
          <button onClick={() => handleTabSwitch('remover')}
            className={`tab-btn ${activeTab === 'remover' ? 'active-blue' : ''}`}>
            Vocal Remover
          </button>
          <button onClick={() => handleTabSwitch('effects')}
            className={`tab-btn ${activeTab === 'effects' ? 'active-purple' : ''}`}>
            Studio Effects
          </button>
        </div>

        <div className="upload-box">
          <label className="upload-label">
            <span>{file?.name ?? 'Click to upload an audio file'}</span>
            <input type="file" className="file-input" onChange={handleFileChange} accept="audio/*" />
          </label>
          {file?.name && <p className="file-name">✔ {file.name}</p>}
        </div>

        {/* ── Vocal Remover Tab ── */}
        {activeTab === 'remover' && (
          <div className="fade-in">
            <button className="btn-primary btn-blue"
              onClick={() => callApi(true)}
              disabled={removerProcessing}
              style={{ position: 'relative', overflow: 'hidden' }}>
              {removerProcessing && (
                <span className="btn-progress-bar" style={{ width: `${removerProgress}%` }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {removerProcessing ? `Separating Vocals… ${removerProgress}%` : 'Remove Vocals'}
              </span>
            </button>

            {vocalsUrl && instrumentalUrl && !removerProcessing && (
              <VocalPlayer
                vocalsUrl={vocalsUrl}
                instrumentalUrl={instrumentalUrl}
                filename={file?.name ?? 'audio'}
              />
            )}
          </div>
        )}

        {/* ── Studio Effects Tab ── */}
        {activeTab === 'effects' && (
          <div className="fade-in">
            <div className="slider-group">
              <div className="slider-label">
                <span>Pitch</span>
                <span>{pitch > 0 ? `+${pitch}` : pitch} semitones</span>
              </div>
              <input type="range" min="-12" max="12" value={pitch}
                onChange={e => setPitch(+e.target.value)} className="slider-input" />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Volume</span>
                <span>{volume > 0 ? `+${parseFloat(volume).toFixed(1)}` : parseFloat(volume).toFixed(1)} dB</span>
              </div>
              <input type="range" min="-5" max="5" step="0.1" value={volume}
                onChange={e => setVolume(+e.target.value)} className="slider-input" />
            </div>
            <div className="slider-group">
              <div className="slider-label">
                <span>Reverb</span>
                <span>{Math.round(reverb * 100)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={reverb}
                onChange={e => setReverb(+e.target.value)} className="slider-input" />
            </div>

            <button className="btn-primary btn-purple"
              onClick={() => callApi(false)}
              disabled={effectsProcessing}
              style={{ position: 'relative', overflow: 'hidden' }}>
              {effectsProcessing && (
                <span className="btn-progress-bar" style={{ width: `${effectsProgress}%` }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {effectsProcessing ? `Applying Effects… ${effectsProgress}%` : 'Apply Effects'}
              </span>
            </button>

            {editedUrl && !effectsProcessing && (
              <EffectsPlayer audioUrl={editedUrl} filename={file?.name ?? 'audio'} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}