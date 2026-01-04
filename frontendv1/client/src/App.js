import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  ShieldCheck, 
  Server, 
  Thermometer, 
  Wifi, 
  Home,
  Clock,
  Battery,
  ToggleLeft
} from 'lucide-react';
import './App.css'; 

const WS_URL = "wss://smartgridxbackend.onrender.com/ws/client"; 

const defaultSystemData = {
  pole: { connected: false, voltage: 0, power: 0, current: 0, energy: 0, frequency: 0, pf: 0 },
  house: { connected: false, voltage: 0, power: 0, current: 0, energy: 0, temperature: 0, pf: 0, relays: [false, false, false, false] },
  alerts: { theft_detected: false, maintenance_risk: false, risk_score: 0, message: "Waiting for connection..." }
};

// --- Helper Component: Stat Card ---
const StatCard = ({ label, value, unit, icon: Icon, colorClass }) => (
  <div className="stat-card">
    <div className="stat-content">
      <p className="stat-label">{label}</p>
      <div className="stat-value-wrapper">
        <span className="stat-value">{value}</span>
        <span className="stat-unit">{unit}</span>
      </div>
    </div>
    <div className={`icon-badge ${colorClass}`}>
      <Icon size={20} />
    </div>
  </div>
);

// --- Helper Component: Relay Button ---
const RelayButton = ({ index, state, onClick }) => (
  <button 
    onClick={() => onClick(index, !state)} 
    className={`relay-btn ${state ? 'active' : ''}`}
  >
    <div className="relay-info">
      <div className={`relay-dot ${state ? 'on' : 'off'}`} />
      <span className="relay-name">Button {index + 1}</span>
    </div>
    <div className="relay-toggle-icon">
       {state ? <Zap size={16} fill="currentColor" /> : <ToggleLeft size={16} />}
    </div>
  </button>
);

const App = () => {
  const [socket, setSocket] = useState(null);
  const [systemData, setSystemData] = useState(defaultSystemData);

  // --- WebSocket Connection ---
  useEffect(() => {
    let ws;
    const connect = () => {
        ws = new WebSocket(WS_URL);
        ws.onopen = () => { console.log("Connected"); setSocket(ws); };
        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "update") {
                    setSystemData(payload.data);
                }
            } catch (e) { console.error(e); }
        };
        ws.onclose = () => { setTimeout(connect, 3000); };
    };
    connect();
    return () => { if (ws) ws.close(); };
  }, []);

  // --- Relay Toggle Handler ---
  const toggleRelay = (index, newState) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "set_relay", relay_index: index, state: newState }));
    } else {
        // Optimistic update for UI feel if offline
        const newData = {...systemData};
        newData.house.relays[index] = newState;
        setSystemData(newData);
    }
  };

  const pole = systemData.pole || defaultSystemData.pole;
  const house = systemData.house || defaultSystemData.house;
  const alerts = systemData.alerts || defaultSystemData.alerts;

  return (
    <div className="dashboard-container">
      
      {/* --- HEADER --- */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon-wrapper">
            <Activity size={28} className="brand-icon" />
          </div>
          <div className="brand-text">
            <h1>Smart Gridx</h1>
            <p>IoT Monitoring & Predictive Maintenance</p>
          </div>
        </div>

        <div className="header-status">
           <div className={`status-item ${pole.connected ? 'online' : 'offline'}`}>
              <Wifi size={16} /> 
              <span>Grid: {pole.connected ? 'Online' : 'Offline'}</span>
           </div>
           <div className={`status-item ${house.connected ? 'online' : 'offline'}`}>
              <Server size={16} /> 
              <span>SPAN: {house.connected ? 'Online' : 'Offline'}</span>
           </div>
        </div>
      </header>

      {/* --- ALERTS SECTION --- */}
      <div className="alerts-container">
        {alerts.theft_detected && (
          <div className="alert-banner danger">
            <div className="alert-icon-bg"><AlertTriangle size={20} /></div>
            <div className="alert-content">
                <strong>THEFT DETECTED</strong>
                <span>Power mismatch detected between Pole and House source.</span>
            </div>
          </div>
        )}
        {alerts.maintenance_risk && (
          <div className="alert-banner warning">
            <div className="alert-icon-bg"><Activity size={20} /></div>
             <div className="alert-content">
                <strong>MAINTENANCE REQUIRED</strong>
                <span>System risk score is {alerts.risk_score}. Check equipment immediately.</span>
            </div>
          </div>
        )}
      </div>

      {/* --- MAIN GRID LAYOUT --- */}
      <main className="main-grid">
        
        {/* --- LEFT COLUMN: POLE --- */}
        <section className="panel-section">
          <div className="section-header">
            <Zap className="section-icon" size={20} />
            <h2>Grid Source (Pole)</h2>
          </div>

          <div className="stats-grid">
            <StatCard label="Voltage" value={(pole.voltage || 0).toFixed(1)} unit="V" icon={Zap} colorClass="amber" />
            <StatCard label="Current" value={(pole.current || 0).toFixed(2)} unit="A" icon={Activity} colorClass="blue" />
            <StatCard label="Power" value={(pole.power || 0).toFixed(0)} unit="W" icon={Zap} colorClass="amber" />
            <StatCard label="Total Energy" value={(pole.energy || 0).toFixed(2)} unit="kWh" icon={Battery} colorClass="green" />
            <StatCard label="Power Factor" value={(pole.pf || 0).toFixed(2)} unit="" icon={ShieldCheck} colorClass="purple" />
          </div>

          {/* Moved AI Health Monitor Here or kept right? User said "below both of how the ai part" in previous prompt, 
              but "shift back to previous UI" implies the structure in the provided code. 
              The provided code had AI on the right. I will keep AI on the right to match the provided structure 
              but ensure temperature is inside it. 
              
              Wait, standard 2-column layout usually balances better if I put something here since graph is gone.
              However, strictly following "Grid Source" and "Smart Home" separation.
          */}
        </section>

        {/* --- RIGHT COLUMN: HOUSE & AI --- */}
        <section className="panel-section">
          <div className="section-header">
            <Server className="section-icon" size={20} />
            <h2>Smart Home (SPAN Panel)</h2>
          </div>
          
          <div className="stats-grid">
            <StatCard label="Voltage" value={(house.voltage || 0).toFixed(1)} unit="V" icon={Zap} colorClass="blue" />
            <StatCard label="Current" value={(house.current || 0).toFixed(2)} unit="A" icon={Activity} colorClass="blue" />
            <StatCard label="Power" value={(house.power || 0).toFixed(0)} unit="W" icon={Home} colorClass="blue" />
            <StatCard label="Total Energy" value={(house.energy || 0).toFixed(2)} unit="kWh" icon={Battery} colorClass="green" />
            <StatCard label="Power Factor" value={(house.pf || 0).toFixed(2)} unit="" icon={ShieldCheck} colorClass="purple" />
          </div>

          {/* RELAY CONTROL */}
          <div className="card-container relay-container">
            <h3>Circuit Control</h3>
            <div className="relay-grid">
              {(house.relays || [false, false, false, false]).map((state, idx) => (
                <RelayButton key={idx} index={idx} state={state} onClick={toggleRelay} />
              ))}
            </div>
          </div>

          {/* AI HEALTH MONITOR (Now with Temperature) */}
          <div className="card-container ai-card">
              <div className="ai-header-row">
                  <h3>AI Health Monitor</h3>
                  <div className={`ai-badge ${alerts.maintenance_risk ? 'bad' : 'good'}`}>
                      {alerts.maintenance_risk ? 'RISK DETECTED' : 'SYSTEM OPTIMAL'}
                  </div>
              </div>

              <div className="ai-body">
                 <div className="ai-stats-row">
                    {/* Risk Score */}
                    <div className="risk-metric">
                        <span className="risk-score">{(alerts.risk_score || 0).toFixed(2)}</span>
                        <span className="risk-label">Failure Probability</span>
                    </div>

                    {/* Temperature Moved Here */}
                    <div className="temp-metric">
                        <Thermometer size={24} className={house.temperature > 40 ? "text-red-400" : "text-emerald-400"} />
                        <div>
                            <span className="temp-value">{(house.temperature || 0).toFixed(1)}°C</span>
                            <span className="temp-label">Panel Temp</span>
                        </div>
                    </div>
                 </div>

                 <p className="ai-message">{alerts.message}</p>
                 
                 <div className="ai-progress-track">
                    <div 
                        className={`ai-progress-fill ${alerts.maintenance_risk ? 'bad' : 'good'}`}
                        style={{ width: `${Math.min((alerts.risk_score || 0) * 100, 100)}%` }}
                    />
                 </div>
              </div>
          </div>

        </section>
      </main>
    </div>
  );
};

export default App;
