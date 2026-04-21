import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const BACKEND_HTTP = 'https://monitoring-portal.onrender.com';
const BACKEND_WS = 'wss://monitoring-portal.onrender.com/ws/frontend';

function App() {
  const [frameData, setFrameData] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [regName, setRegName] = useState('');
  const [regStatus, setRegStatus] = useState({ message: '', type: '' });
  
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

  // Helper function to convert Base64 to Blob for uploading
  const base64ToBlob = (base64, type = 'image/jpeg') => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type });
  };

  const handleRegister = async () => {
    if (!regName.trim() || !frameData) {
      setRegStatus({ message: 'Error: Name and active camera feed required.', type: 'error' });
      return;
    }

    setRegStatus({ message: 'Encrypting and Uploading...', type: 'info' });

    const currentFrameBlob = base64ToBlob(frameData);
    const formData = new FormData();
    formData.append('name', regName);
    formData.append('file', currentFrameBlob, 'frame.jpg');

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
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AEGis <span>Security Monitor</span></h1>
      </header>

      <div className="dashboard-grid">
        {/* Live Video Feed Module */}
        <div className="card video-card">
          <div className="card-header">
            <h2>Live Surveillance</h2>
            <span className="live-indicator">● LIVE</span>
          </div>
          <div className="video-wrapper">
            {frameData ? (
              <img src={`data:image/jpeg;base64,${frameData}`} alt="Live Feed" />
            ) : (
              <div className="video-placeholder">Establishing secure connection...</div>
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
            <button onClick={handleRegister} className="lux-button">
              Register Biometrics
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
