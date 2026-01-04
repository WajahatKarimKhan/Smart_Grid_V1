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
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoadOn, setIsLoadOn] = useState(true);
  
  // Mock data states - Initialized to 0/Empty as requested
  const [houseData, setHouseData] = useState({
    energy: '0 kWh',
    humidity: '0%',
    status: 'Connected'
  });

  const [diagnosticsData, setDiagnosticsData] = useState({
    temperature: '24°C', // Kept this live for the AI block as requested
    systemStatus: 'Optimal',
    lastCheck: '2 mins ago'
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      
      {/* Sidebar - Light Mode */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-md">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">EcoSmart</span>
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

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600">System Online</span>
            </div>
            <p className="text-xs text-slate-400">Last updated: Just now</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-1">Dashboard</h1>
            <p className="text-slate-500">Real-time energy monitoring and control</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              {new Date().toLocaleDateString()}
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md">
              JS
            </div>
          </div>
        </header>

        {/* Top Section: Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Left Side: ESP32 Energy System (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center space-x-2 mb-2">
                <Cpu className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-700">Energy System (ESP32)</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Solar Panel Block */}
                <Card title="Solar Panel" icon={<Sun className="text-amber-500" />} color="amber">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-slate-500">Status</span>
                      <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded">Active</span>
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
                <Card title="Battery" icon={<Battery className="text-emerald-500" />} color="emerald">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-slate-500">Status</span>
                      <span className="text-blue-600 text-sm font-medium animate-pulse">Charging</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-1">
                      <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">78% Charged</span>
                      <span className="text-slate-700 font-medium">4h 30m remaining</span>
                    </div>
                  </div>
                </Card>

                {/* Grid Block */}
                <Card title="Grid Network" icon={<Activity className="text-purple-500" />} color="purple">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-slate-500">Status</span>
                      <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded">Connected</span>
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

                {/* Smart Load Block */}
                <Card title="Smart Load" icon={<Power className="text-rose-500" />} color="rose">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-slate-500">Actuation</span>
                      
                      <button 
                        onClick={() => setIsLoadOn(!isLoadOn)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                          isLoadOn 
                            ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <Power size={14} />
                        {isLoadOn ? 'ON' : 'OFF'}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <div className="text-sm text-slate-500">Current Power</div>
                        <div className={`text-lg font-semibold ${isLoadOn ? 'text-slate-800' : 'text-slate-400'}`}>
                          {isLoadOn ? '1.2 kW' : '0.0 kW'}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${isLoadOn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    </div>

                    <div className="text-xs text-slate-400 mt-2">
                      Scheduled: 18:00 - 22:00
                    </div>
                  </div>
                </Card>
             </div>
          </div>

          {/* Right Side: Indoor Unit (1/3 width) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center space-x-2 mb-2">
                <Home className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-700">Indoor Unit</h2>
             </div>
            
            {/* House Block - Modified: Initialized to 0 */}
            <div className="h-full">
              <Card title="House Environment" icon={<Home className="text-blue-500" />} color="blue" className="h-full">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <span className="text-slate-500">Connection</span>
                    <span className="text-emerald-600 flex items-center text-sm font-medium bg-emerald-50 px-2 py-1 rounded">
                      <Wifi size={14} className="mr-1" /> {houseData.status}
                    </span>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                     <div className="flex items-center gap-2 mb-2 text-blue-800">
                        <Zap size={16} />
                        <span className="font-semibold">House Energy</span>
                     </div>
                     <div className="text-3xl font-bold text-slate-800">{houseData.energy}</div>
                     <div className="text-xs text-slate-500 mt-1">Total consumption</div>
                  </div>

                  <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-100">
                     <div className="flex items-center gap-2 mb-2 text-cyan-800">
                        <Droplets size={16} />
                        <span className="font-semibold">Humidity</span>
                     </div>
                     <div className="text-3xl font-bold text-slate-800">{houseData.humidity}</div>
                     <div className="text-xs text-slate-500 mt-1">Relative humidity</div>
                  </div>

                </div>
              </Card>
            </div>
          </div>

        </div>

        {/* Bottom Section: AI Diagnostics */}
        <div className="mt-8">
           <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
             <Activity className="w-5 h-5 text-slate-400" />
             System Intelligence
           </h2>
           
           {/* AI Diagnostics Block - Modified: Added Temperature */}
           <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:border-cyan-200 transition-all duration-300">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                  <Activity size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">AI Diagnostics</h3>
              </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Temperature kept here as requested */}
               <div className="bg-gradient-to-br from-cyan-50 to-white p-4 rounded-xl border border-cyan-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-cyan-600 uppercase tracking-wider font-bold mb-1">House Temp</div>
                    <div className="text-3xl font-bold text-slate-800">{diagnosticsData.temperature}</div>
                    <div className="text-xs text-slate-500 mt-1">Indoor Unit Sensor</div>
                  </div>
                  <div className="bg-white p-3 rounded-full shadow-sm border border-cyan-100">
                    <Thermometer className="w-6 h-6 text-cyan-500" />
                  </div>
               </div>

               {/* System Status */}
               <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <span className="text-slate-800 font-medium block">System Optimized</span>
                      <span className="text-sm text-slate-500">Energy efficiency is at 98%. AI logic active.</span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <span className="text-slate-800 font-medium block">Usage Alert</span>
                      <span className="text-sm text-slate-500">High usage detected in kitchen circuit.</span>
                    </div>
                  </div>
               </div>
             </div>
           </div>
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
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function Card({ title, icon, children, color, className }) {
  const colorVariants = {
    blue: 'hover:border-blue-300',
    amber: 'hover:border-amber-300',
    emerald: 'hover:border-emerald-300',
    purple: 'hover:border-purple-300',
    rose: 'hover:border-rose-300',
    cyan: 'hover:border-cyan-300',
  };

  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all duration-300 ${colorVariants[color] || 'hover:border-slate-300'} ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className={`p-2 rounded-lg bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-100`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatItem({ label, value, icon, subtext, highlight }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className={`text-lg font-semibold ${highlight ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
  );
}
