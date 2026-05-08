import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_HTTP = 'https://monitoring-portal.onrender.com';
const BACKEND_WS = 'wss://monitoring-portal.onrender.com/ws/frontend';

function App() {
  const [frameData, setFrameData] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [regName, setRegName] = useState('');
  const [regStatus, setRegStatus] = useState({ message: '', type: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const wsRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket
    wsRef.current = new WebSocket(BACKEND_WS);

    wsRef.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'frame') {
        setFrameData(msg.data);
      } else if (msg.type === 'alert') {
        setAlerts((prevAlerts) => [
          { id: Date.now(), name: msg.name, time: msg.time },
          ...prevAlerts
        ]);
      }
    };

    wsRef.current.onclose = () => console.log('WebSocket Disconnected');

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // --- NEW: SD CARD CAMERA CONTROLS ---
  const triggerCameraAction = async (action) => {
    try {
      const response = await fetch(`${BACKEND_HTTP}/camera/${action}`, { 
        method: 'POST' 
      });
      const result = await response.json();
      
      if (result.status === 'command_sent') {
        if (action === 'start-video') setIsRecording(true);
        if (action === 'stop-video') setIsRecording(false);
        console.log(`Action ${action} successful`);
      } else {
        alert("Camera Error: " + result.message);
      }
    } catch (error) {
      alert("Network error communicating with camera via backend.");
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      setRegStatus({ message: 'Error: Subject Name required.', type: 'error' });
      return;
    }

    setIsRegistering(true);
    setRegStatus({ message: 'Initializing Flash & Scanning...', type: 'info' });

    const formData = new FormData();
    formData.append('name', regName);

    try {
      const response = await fetch(`${BACKEND_HTTP}/register`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (result.status === 'success') {
        setRegStatus({ message: `Access Granted. Registered: ${result.name}`, type: 'success' });
        setRegName('');
      } else {
        setRegStatus({ message: result.message || 'Registration failed.', type: 'error' });
      }
    } catch (error) {
      setRegStatus({ message: 'Network error communicating with mainframe.', type: 'error' });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>R38 <span>Security Monitor</span></h1>
      </header>

      <div className="dashboard-grid">
        {/* Live Video Feed Module */}
        <div className="card video-card">
          <div className="card-header">
            <h2>Live Surveillance</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isRecording && <span className="recording-indicator" style={{ color: '#ff4444', fontSize: '0.8rem', fontWeight: 'bold' }}>● REC</span>}
              <span className="live-indicator">● LIVE</span>
            </div>
          </div>
          
          <div className="video-wrapper">
            {frameData ? (
              <img src={`data:image/jpeg;base64,${frameData}`} alt="Live Feed" />
            ) : (
              <div className="video-placeholder">Establishing secure connection...</div>
            )}
          </div>

          {/* NEW: SD CARD CONTROL PANEL */}
          <div className="control-panel" style={{ 
            padding: '15px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '10px',
            borderTop: '1px solid #333'
          }}>
            <button 
              onClick={() => triggerCameraAction('photo')}
              className="lux-button small"
              style={{ flex: 1, backgroundColor: '#222', borderColor: '#E2B13C' }}
            >
              📸 PHOTO
            </button>

            {!isRecording ? (
              <button 
                onClick={() => triggerCameraAction('start-video')}
                className="lux-button small"
                style={{ flex: 1, backgroundColor: '#440000', color: '#fff', borderColor: '#ff0000' }}
              >
                🔴 START VIDEO
              </button>
            ) : (
              <button 
                onClick={() => triggerCameraAction('stop-video')}
                className="lux-button small"
                style={{ flex: 1, backgroundColor: '#fff', color: '#000', fontWeight: 'bold' }}
              >
                ⏹️ STOP VIDEO
              </button>
            )}
          </div>
        </div>

        {/* Identity Registration Module */}
        <div className="card register-card">
          <div className="card-header">
            <h2>Identity Registration</h2>
          </div>
          <div className="register-body">
            <p>Ensure subject is facing the optics prior to registry.</p>
            <input 
              type="text" 
              placeholder="Enter Subject Name" 
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="lux-input"
            />
            <button 
              onClick={handleRegister} 
              className="lux-button" 
              disabled={isRegistering}
              style={{ opacity: isRegistering ? 0.5 : 1, cursor: isRegistering ? 'not-allowed' : 'pointer' }}
            >
              {isRegistering ? 'Processing...' : 'Register Biometrics'}
            </button>
            {regStatus.message && (
              <p className={`status-text ${regStatus.type}`}>
                {regStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Real-time Alerts Module */}
        <div className="card alerts-card">
          <div className="card-header">
            <h2>Detection Logs</h2>
          </div>
          <div className="alerts-body">
            {alerts.length === 0 ? (
              <p className="no-alerts">No positive identifications.</p>
            ) : (
              <ul className="alerts-list">
                {alerts.map((alert) => (
                  <li key={alert.id} className="alert-item">
                    <div className="alert-info">
                      <span className="alert-name">{alert.name}</span>
                      <span className="alert-action">Authorized</span>
                    </div>
                    <span className="alert-time">{alert.time} PKT</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
