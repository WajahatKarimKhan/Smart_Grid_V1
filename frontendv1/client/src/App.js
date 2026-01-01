import React, { useState, useEffect, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';
import { 
  Zap, Activity, AlertTriangle, Wifi, Power, Thermometer, 
  Server, ShieldAlert, Cpu
} from 'lucide-react';
import './App.css';

const WS_URL = "wss://smartgridxbackend.onrender.com/ws/client"; 

const App = () => {
  const [data, setData] = useState({
    pole: { connected: false, voltage: 0, current: 0, power: 0, energy: 0, frequency: 0, pf: 0 },
    house: { connected: false, voltage: 0, current: 0, power: 0, energy: 0, temperature: 0, pf: 0, relays: [false,false,false,false] },
    alerts: { theft_detected: false, maintenance_risk: false, risk_score: 0, message: "System Normal" }
  });
  
  const [history, setHistory] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const ws = useRef(null);

  // --- WebSocket Logic ---
  useEffect(() => {
    const connect = () => {
      ws.current = new WebSocket(WS_URL);
      
      ws.current.onopen = () => setWsStatus('connected');
      ws.current.onclose = () => {
        setWsStatus('disconnected');
        setTimeout(connect, 3000); // Auto-reconnect
      };
      
      ws.current.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          
          // Update Graph History
          setHistory(prev => {
            const now = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
            const newPoint = {
              time: now,
              PolePower: parsed.pole?.power || 0,
              HousePower: parsed.house?.power || 0,
            };
            const newHistory = [...prev, newPoint];
            if (newHistory.length > 20) newHistory.shift(); // Keep last 20 points
            return newHistory;
          });
        } catch (e) {
          console.error("WS Parse Error", e);
        }
      };
    };

    connect();
    return () => ws.current?.close();
  }, []);

  // --- Relay Handler ---
  const toggleRelay = (index) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    const newState = !data.house.relays[index];
    const command = { action: "set_relay", relay_index: index, state: newState };
    ws.current.send(JSON.stringify(command));
    
    // Optimistic Update
    const newRelays = [...data.house.relays];
    newRelays[index] = newState;
    setData(prev => ({ ...prev, house: { ...prev.house, relays: newRelays } }));
  };

  return (
    <div className="app-container">
      
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="brand">
          <Zap className="logo-icon" size={32} />
          <div>
            <h1>GRIDX <span style={{fontSize:'0.8em', color:'var(--neon-cyan)'}}>CORE</span></h1>
          </div>
        </div>
        
        <div className="status-bar">
          <div className="status-badge">
            <div className={`status-dot ${wsStatus === 'connected' ? 'online' : ''}`} />
            SERVER
          </div>
          <div className="status-badge">
            <div className={`status-dot ${data.pole.connected ? 'online' : ''}`} />
            POLE
          </div>
          <div className="status-badge">
            <div className={`status-dot ${data.house.connected ? 'online' : ''}`} />
            HOUSE
          </div>
        </div>
      </header>

      {/* ALERT BANNER */}
      {data.alerts.theft_detected && (
        <div className="alert-banner">
          <ShieldAlert className="alert-icon" />
          <span className="alert-text">CRITICAL ALERT: POWER THEFT DETECTED - LINE LOSS DETECTED</span>
        </div>
      )}

      {/* MAIN DASHBOARD */}
      <div className="main-grid">
        
        {/* LEFT COLUMN: VISUALIZATIONS */}
        <div className="left-col">
          
          {/* POWER FLOW GRAPH */}
          <div className="glass-card">
            <div className="card-header">
              <span className="card-title"><Activity size={20}/> LIVE POWER LOAD</span>
              <div style={{fontSize:'0.8rem', color:'#aaa'}}>POLE vs HOUSE</div>
            </div>
            <div className="graph-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="gradPole" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gradHouse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--neon-purple)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--neon-purple)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false}/>
                  <YAxis stroke="#666" fontSize={12} tickLine={false} unit="W"/>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#18181b', border: '1px solid #333', color: '#fff'}}
                    itemStyle={{fontSize: '0.8rem'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="PolePower" 
                    stroke="var(--neon-cyan)" 
                    strokeWidth={2}
                    fill="url(#gradPole)" 
                    animationDuration={500}
                    name="Grid Supply"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="HousePower" 
                    stroke="var(--neon-purple)" 
                    strokeWidth={2}
                    fill="url(#gradHouse)" 
                    animationDuration={500}
                    name="Home Usage"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="comparison-row">
            {/* POLE MODULE */}
            <div className="glass-card">
              <div className="card-header">
                <span className="card-title"><Server size={18}/> GRID NODE (POLE)</span>
                <span className={`node-status ${data.pole.connected ? 'connected' : 'disconnected'}`}>
                  {data.pole.connected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="metrics-grid">
                <Metric label="Voltage" value={data.pole.voltage} unit="V" />
                <Metric label="Current" value={data.pole.current} unit="A" />
                <Metric label="Power" value={data.pole.power} unit="W" color="var(--neon-cyan)" />
                <Metric label="Energy" value={data.pole.energy} unit="kWh" />
                <Metric label="Freq" value={data.pole.frequency} unit="Hz" />
                <Metric label="PF" value={data.pole.pf} unit="" />
              </div>
            </div>

            {/* HOUSE MODULE */}
            <div className="glass-card">
              <div className="card-header">
                <span className="card-title"><Power size={18}/> HOUSE NODE</span>
                <span className={`node-status ${data.house.connected ? 'connected' : 'disconnected'}`}>
                  {data.house.connected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="metrics-grid">
                <Metric label="Voltage" value={data.house.voltage} unit="V" />
                <Metric label="Current" value={data.house.current} unit="A" />
                <Metric label="Power" value={data.house.power} unit="W" color="var(--neon-purple)" />
                <Metric label="Temp" value={data.house.temperature} unit="°C" />
                <Metric label="Freq" value={data.house.frequency} unit="Hz" />
                <Metric label="PF" value={data.house.pf} unit="" />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CONTROLS & AI */}
        <div className="right-col" style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
          
          {/* AI DIAGNOSTICS */}
          <div className="glass-card" style={{borderTop: `2px solid ${data.alerts.maintenance_risk ? 'var(--neon-red)' : 'var(--neon-green)'}`}}>
            <div className="card-header">
              <span className="card-title"><Cpu size={18}/> AI DIAGNOSTICS</span>
            </div>
            
            <div style={{textAlign:'center', marginBottom:'1.5rem'}}>
              <div style={{fontSize:'3rem', fontWeight:'bold', fontFamily:'Orbitron', color: data.alerts.maintenance_risk ? 'var(--neon-red)' : 'var(--neon-green)'}}>
                {Math.round(data.alerts.risk_score * 100)}%
              </div>
              <div style={{color:'var(--text-muted)', fontSize:'0.8rem'}}>RISK PROBABILITY</div>
            </div>
            
            <div style={{background:'rgba(255,255,255,0.05)', padding:'1rem', borderRadius:'8px'}}>
              <div style={{fontSize:'0.9rem', marginBottom:'0.5rem', color:'#fff'}}>SYSTEM STATUS:</div>
              <div style={{color: data.alerts.maintenance_risk ? 'var(--neon-red)' : 'var(--neon-green)', fontWeight:'bold'}}>
                {data.alerts.message.toUpperCase()}
              </div>
            </div>
          </div>

          {/* RELAY CONTROLS */}
          <div className="glass-card">
            <div className="card-header">
              <span className="card-title"><Wifi size={18}/> SMART SWITCHES</span>
            </div>
            <div className="relay-grid">
              {data.house.relays.map((state, i) => (
                <button 
                  key={i} 
                  className={`relay-btn ${state ? 'active' : ''}`}
                  onClick={() => toggleRelay(i)}
                >
                  <span>LOAD {i + 1}</span>
                  <div className="relay-indicator"/>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Helper Component for Metrics
const Metric = ({ label, value, unit, color }) => (
  <div className="metric-item">
    <div className="metric-label">{label}</div>
    <div className="metric-value" style={{color: color || '#fff'}}>
      {typeof value === 'number' ? value.toFixed(1) : value}
      <span className="metric-unit">{unit}</span>
    </div>
  </div>
);

export default App;
