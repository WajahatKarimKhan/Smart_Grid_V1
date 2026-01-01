import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Sun, 
  Battery, 
  Zap, 
  Activity, 
  Settings, 
  BarChart3, 
  LayoutDashboard,
  Power,
  Thermometer,
  Droplets,
  Wifi,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoadOn, setIsLoadOn] = useState(true);
  
  // Mock data states
  const [houseData, setHouseData] = useState({
    energy: '18.5 kWh',
    humidity: '45%',
    status: 'Connected'
  });

  const [diagnosticsData, setDiagnosticsData] = useState({
    temperature: '24°C',
    systemStatus: 'Optimal',
    lastCheck: '2 mins ago'
  });

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">EcoSmart</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem 
            icon={<BarChart3 size={20} />} 
            label="Energy History" 
            isActive={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          />
          <NavItem 
            icon={<Activity size={20} />} 
            label="AI Diagnostics" 
            isActive={activeTab === 'diagnostics'} 
            onClick={() => setActiveTab('diagnostics')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            isActive={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-300">System Online</span>
            </div>
            <p className="text-xs text-slate-500">Last updated: Just now</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-slate-400">Real-time energy monitoring and control</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {new Date().toLocaleDateString()}
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold">
              JS
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* House Block - Modified: Removed Temp, Added Energy */}
          <Card title="House" icon={<Home className="text-blue-400" />} color="blue">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 flex items-center text-sm font-medium">
                  <Wifi size={14} className="mr-1" /> {houseData.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatItem 
                  label="House Energy" 
                  value={houseData.energy} 
                  icon={<Zap size={14} />}
                  subtext="Daily Usage"
                />
                <StatItem 
                  label="Humidity" 
                  value={houseData.humidity} 
                  icon={<Droplets size={14} />}
                  subtext="Indoor"
                />
              </div>
            </div>
          </Card>

          {/* Solar Panel Block */}
          <Card title="Solar Panel" icon={<Sun className="text-amber-400" />} color="amber">
             <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 text-sm font-medium">Active</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatItem 
                  label="Output" 
                  value="4.2 kW" 
                  icon={<Zap size={14} />}
                  highlight
                />
                <StatItem 
                  label="Efficiency" 
                  value="92%" 
                  icon={<Activity size={14} />}
                />
              </div>
            </div>
          </Card>

          {/* Battery Block */}
          <Card title="Battery" icon={<Battery className="text-emerald-400" />} color="emerald">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="text-blue-400 text-sm font-medium animate-pulse">Charging</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 mb-1">
                <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '78%' }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">78% Charged</span>
                <span className="text-white font-medium">4h 30m remaining</span>
              </div>
            </div>
          </Card>

          {/* Grid Block */}
          <Card title="Grid Network" icon={<Activity className="text-purple-400" />} color="purple">
             <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 text-sm font-medium">Connected</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <StatItem 
                  label="Import" 
                  value="0.5 kW" 
                  icon={<Zap size={14} />}
                />
                <StatItem 
                  label="Cost" 
                  value="$0.12" 
                  subtext="per kWh"
                />
              </div>
            </div>
          </Card>

          {/* Smart Load Block - Modified: Reverted to Button */}
          <Card title="Smart Load" icon={<Power className="text-rose-400" />} color="rose">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <span className="text-slate-400">Actuation</span>
                
                {/* Reverted Button */}
                <button 
                  onClick={() => setIsLoadOn(!isLoadOn)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isLoadOn 
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40 hover:bg-rose-600' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Power size={14} />
                  {isLoadOn ? 'ON' : 'OFF'}
                </button>
              </div>
              
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
                <div>
                  <div className="text-sm text-slate-400">Current Power</div>
                  <div className={`text-lg font-semibold ${isLoadOn ? 'text-white' : 'text-slate-500'}`}>
                    {isLoadOn ? '1.2 kW' : '0.0 kW'}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${isLoadOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
              </div>

              <div className="text-xs text-slate-500 mt-2">
                Scheduled: 18:00 - 22:00
              </div>
            </div>
          </Card>

          {/* AI Diagnostics Block - Modified: Added Temperature */}
          <Card title="AI Diagnostics" icon={<Activity className="text-cyan-400" />} color="cyan">
             <div className="space-y-4">
               {/* Temperature kept here */}
               <div className="flex items-center justify-between bg-cyan-500/10 p-3 rounded-lg border border-cyan-500/20 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-cyan-500/20 p-2 rounded-full">
                      <Thermometer className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs text-cyan-300 uppercase tracking-wider font-semibold">House Temp</div>
                      <div className="text-xl font-bold text-white">{diagnosticsData.temperature}</div>
                    </div>
                  </div>
                  <div className="text-xs text-cyan-400/60">Real-time</div>
               </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <div>
                    <span className="text-slate-300 block">System optimization complete.</span>
                    <span className="text-xs text-slate-500">2 minutes ago</span>
                  </div>
                </div>
                <div className="flex items-start space-x-3 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div>
                    <span className="text-slate-300 block">High usage detected in kitchen.</span>
                    <span className="text-xs text-slate-500">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}

// Sub-components for cleaner code

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function Card({ title, icon, children, color }) {
  const colorVariants = {
    blue: 'hover:border-blue-500/50',
    amber: 'hover:border-amber-500/50',
    emerald: 'hover:border-emerald-500/50',
    purple: 'hover:border-purple-500/50',
    rose: 'hover:border-rose-500/50',
    cyan: 'hover:border-cyan-500/50',
  };

  return (
    <div className={`bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl transition-all duration-300 ${colorVariants[color] || 'hover:border-slate-700'}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 rounded-lg bg-slate-800/50 ring-1 ring-inset ring-slate-700`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatItem({ label, value, icon, subtext, highlight }) {
  return (
    <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
      <div className="text-slate-400 text-xs mb-1 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className={`text-lg font-semibold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}
