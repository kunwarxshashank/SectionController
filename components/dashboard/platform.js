import React, { useState, useEffect } from 'react';
import { Train, AlertTriangle, CheckCircle, Radio, Settings, Power, Activity } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const Platform = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [trainPositions, setTrainPositions] = useState({
    train1: { position: 10, speed: 65, status: 'running' },
    train2: { position: 45, speed: 80, status: 'running' },
    train3: { position: 75, speed: 0, status: 'stopped' }
  });
  
  const [signals, setSignals] = useState({
    sig1: 'red',
    sig2: 'green', 
    sig3: 'yellow',
    sig4: 'green',
    sig5: 'red',
    sig6: 'green',
    sig7: 'yellow'
  });
  
  const [stations, setStations] = useState([
    { id: 'Rani Kamlapati', name: 'East Central Railway', status: 'online', platform: 'A1' },
    { id: 'Bhopal', name: 'Bhopal', status: 'online', platform: 'B2' },
    { id: 'Misrod', name: 'Main Junction', status: 'maintenance', platform: 'C1' }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      
      // Simulate train movement
      setTrainPositions(prev => ({
        train1: { 
          ...prev.train1, 
          position: prev.train1.status === 'running' ? (prev.train1.position + 0.5) % 100 : prev.train1.position 
        },
        train2: { 
          ...prev.train2, 
          position: prev.train2.status === 'running' ? (prev.train2.position + 0.3) % 100 : prev.train2.position 
        },
        train3: prev.train3
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const toggleSignal = (signalId) => {
    setSignals(prev => ({
      ...prev,
      [signalId]: prev[signalId] === 'green' ? 'red' : prev[signalId] === 'red' ? 'yellow' : 'green'
    }));
  };

  const toggleTrainStatus = (trainId) => {
    setTrainPositions(prev => ({
      ...prev,
      [trainId]: {
        ...prev[trainId],
        status: prev[trainId].status === 'running' ? 'stopped' : 'running',
        speed: prev[trainId].status === 'running' ? 0 : 65
      }
    }));
  };

  const getSignalColor = (signal) => {
    switch(signal) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Track Display */}
        <div className="lg:col-span-3 bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[color:var(--irctc-blue)] text-xl font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[color:var(--irctc-blue)]/10">
                <Activity className="h-5 w-5" />
              </div>
              TRACK CONTROL SYSTEM
            </h2>
            <Badge variant="outline" className="bg-[oklch(0.7_0.2_150)]/10 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 text-xs">
              LIVE
            </Badge>
          </div>
          
          {/* Track Layout */}
          <div className="relative h-96 bg-gradient-to-br from-background to-muted/30 rounded-xl border-2 border-[color:var(--irctc-blue)]/30 shadow-inner">
            {/* Complex Track Layout */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400">
              {/* Main Line 1 - Horizontal */}
              <line x1="50" y1="80" x2="950" y2="80" stroke="black" strokeWidth="4"/>
              <line x1="50" y1="85" x2="950" y2="85" stroke="black" strokeWidth="2"/>
              
              {/* Main Line 2 - Horizontal */}
              <line x1="50" y1="150" x2="950" y2="150" stroke="black" strokeWidth="4"/>
              <line x1="50" y1="155" x2="950" y2="155" stroke="black" strokeWidth="2"/>
              
              {/* Main Line 3 - Horizontal */}
              <line x1="50" y1="220" x2="950" y2="220" stroke="black" strokeWidth="4"/>
              <line x1="50" y1="225" x2="950" y2="225" stroke="black" strokeWidth="2"/>
              
              {/* Main Line 4 - Horizontal */}
              <line x1="50" y1="290" x2="950" y2="290" stroke="black" strokeWidth="4"/>
              <line x1="50" y1="295" x2="950" y2="295" stroke="black" strokeWidth="2"/>
              
              {/* Junction Lines and Complex Switches */}
              {/* Switch 1 - Connecting Line 1 and 2 */}
              <path d="M 200 80 Q 220 100 240 150" stroke="black" strokeWidth="4" fill="none"/>
              <path d="M 240 150 Q 220 130 200 80" stroke="black" strokeWidth="2" fill="none"/>
              
              {/* Switch 2 - Connecting Line 2 and 3 */}
              <path d="M 350 150 Q 370 170 390 220" stroke="black" strokeWidth="4" fill="none"/>
              <path d="M 390 220 Q 370 200 350 150" stroke="black" strokeWidth="2" fill="none"/>
              
              {/* Switch 3 - Connecting Line 3 and 4 */}
              <path d="M 500 220 Q 520 240 540 290" stroke="black" strokeWidth="4" fill="none"/>
              <path d="M 540 290 Q 520 270 500 220" stroke="black" strokeWidth="2" fill="none"/>
              
              {/* Complex Diamond Crossing */}
              <path d="M 600 80 L 700 290" stroke="black" strokeWidth="4"/>
              <path d="M 700 80 L 600 290" stroke="black" strokeWidth="4"/>
              <circle cx="650" cy="185" r="8" fill="black"/>
              
              {/* Yard Tracks */}
              <line x1="750" y1="120" x2="900" y2="120" stroke="black" strokeWidth="3"/>
              <line x1="750" y1="130" x2="900" y2="130" stroke="black" strokeWidth="3"/>
              <line x1="750" y1="140" x2="900" y2="140" stroke="black" strokeWidth="3"/>
              <line x1="750" y1="250" x2="900" y2="250" stroke="black" strokeWidth="3"/>
              <line x1="750" y1="260" x2="900" y2="260" stroke="black" strokeWidth="3"/>
              
              {/* Connecting Yard Tracks */}
              <path d="M 700 150 Q 720 130 750 120" stroke="black" strokeWidth="3" fill="none"/>
              <path d="M 700 150 Q 720 135 750 130" stroke="black" strokeWidth="3" fill="none"/>
              <path d="M 700 150 Q 720 140 750 140" stroke="black" strokeWidth="3" fill="none"/>
              <path d="M 700 220 Q 720 235 750 250" stroke="black" strokeWidth="3" fill="none"/>
              <path d="M 700 220 Q 720 240 750 260" stroke="black" strokeWidth="3" fill="none"/>
              
              {/* Signal Points */}
              <circle cx="180" cy="75" r="6" fill="red" stroke="white" strokeWidth="2"/>
              <circle cx="320" cy="145" r="6" fill="green" stroke="white" strokeWidth="2"/>
              <circle cx="470" cy="215" r="6" fill="yellow" stroke="white" strokeWidth="2"/>
              <circle cx="580" cy="75" r="6" fill="green" stroke="white" strokeWidth="2"/>
              <circle cx="720" cy="285" r="6" fill="red" stroke="white" strokeWidth="2"/>
              <circle cx="800" cy="115" r="6" fill="green" stroke="white" strokeWidth="2"/>
              <circle cx="820" cy="245" r="6" fill="yellow" stroke="white" strokeWidth="2"/>
              
              {/* Station Platforms */}
              <rect x="120" y="60" width="60" height="20" fill="#4B5563" stroke="black" rx="3"/>
              <text x="150" y="73" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Misrod</text>
              
              <rect x="280" y="130" width="80" height="20" fill="#4B5563" stroke="black" rx="3"/>
              <text x="320" y="143" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">RKMKP</text>
              
              <rect x="430" y="200" width="70" height="20" fill="#4B5563" stroke="black" rx="3"/>
              <text x="465" y="213" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Bhopal</text>
              
              <rect x="750" y="100" width="60" height="20" fill="#4B5563" stroke="black" rx="3"/>
              <text x="780" y="113" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">Nishatpura</text>
              
              {/* Block Sections */}
              <text x="100" y="100" textAnchor="middle" fill="#374151" fontSize="10">BLK-1</text>
              <text x="260" y="170" textAnchor="middle" fill="#374151" fontSize="10">BLK-2</text>
              <text x="410" y="240" textAnchor="middle" fill="#374151" fontSize="10">BLK-3</text>
              <text x="650" y="340" textAnchor="middle" fill="#374151" fontSize="10">BLK-4</text>
              <text x="820" y="170" textAnchor="middle" fill="#374151" fontSize="10">YRD-A</text>
              
              {/* Distance Markers */}
              <text x="150" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">0.5km</text>
              <text x="300" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">1.2km</text>
              <text x="450" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">2.1km</text>
              <text x="600" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">3.5km</text>
              <text x="750" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">4.8km</text>
              <text x="900" y="50" textAnchor="middle" fill="#6B7280" fontSize="8">6.2km</text>
            </svg>
            
            {/* Train Positions */}
            {Object.entries(trainPositions).map(([trainId, train], index) => {
              const trackPositions = [75, 145, 215, 285]; // Y positions for 4 tracks
              const trackIndex = index % trackPositions.length;
              return (
                <div
                  key={trainId}
                  className={`absolute transition-all duration-1000 ${
                    train.status === 'running' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    left: `${train.position * 8.5 + 50}px`,
                    top: `${trackPositions[trackIndex]}px`
                  }}
                >
                  <div className={`w-10 h-8 rounded ${
                    train.status === 'running' ? 'bg-green-600' : 'bg-red-600'
                  } border-2 border-yellow-400 flex items-center justify-center shadow-lg`}>
                    <Train className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xs text-center mt-1 text-gray-800 font-bold bg-yellow-200 px-1 rounded">
                    {train.speed} km/h
                  </div>
                </div>
              );
            })}
          </div>

          {/* Signal Controls */}
          <div className="mt-6 grid grid-cols-7 gap-4">
            {Object.entries(signals).map(([signalId, signal]) => (
              <div key={signalId} className="text-center">
                <button
                  onClick={() => toggleSignal(signalId)}
                  className={`w-12 h-12 rounded-full ${getSignalColor(signal)} border-2 border-gray-800 mb-2 hover:scale-110 transition-transform shadow-lg`}
                />
                <div className="text-xs text-gray-700 font-bold">{signalId.toUpperCase()}</div>
                <div className="text-xs text-gray-500">{signal.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Panels */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 rounded-xl p-4 shadow-md">
            <h3 className="text-[color:var(--irctc-blue)] font-bold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              SYSTEM STATUS
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Power Supply</span>
                <div className="flex items-center">
                  <Power className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600 text-xs font-bold">ONLINE</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Communication</span>
                <div className="flex items-center">
                  <Radio className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600 text-xs font-bold">ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Emergency</span>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600 text-xs font-bold">NORMAL</span>
                </div>
              </div>
            </div>
          </div>


          {/* Station Status */}
          <div className="bg-gradient-to-br from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 rounded-xl p-4 shadow-md">
            <h3 className="text-[color:var(--irctc-blue)] font-bold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              STATIONS
            </h3>
            <div className="space-y-2">
              {stations.map((station) => (
                <div key={station.id} className="bg-gradient-to-r from-card to-card/95 border-2 border-[color:var(--irctc-blue)]/20 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[color:var(--irctc-blue)]">{station.id}</div>
                      <div className="text-xs text-muted-foreground">{station.platform}</div>
                    </div>
                    <Badge variant="outline" className={`text-xs font-bold ${
                      station.status === 'online' 
                        ? 'bg-[oklch(0.7_0.2_150)]/20 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30' 
                        : 'bg-[oklch(0.82_0.16_90)]/20 text-[oklch(0.82_0.16_90)] border-[oklch(0.82_0.16_90)]/30'
                    }`}>
                      {station.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-6 bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-transparent border-2 border-[color:var(--irctc-blue)]/20 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <Badge variant="outline" className="bg-[oklch(0.7_0.2_150)]/20 text-[oklch(0.7_0.2_150)] border-[oklch(0.7_0.2_150)]/30 font-bold">
              System: OPERATIONAL
            </Badge>
            <Badge variant="outline" className="bg-[color:var(--irctc-blue)]/10 text-[color:var(--irctc-blue)] border-[color:var(--irctc-blue)]/30 font-bold">
              Trains: {Object.values(trainPositions).filter(t => t.status === 'running').length} Active
            </Badge>
            <Badge variant="outline" className="bg-[oklch(0.82_0.16_90)]/20 text-[oklch(0.82_0.16_90)] border-[oklch(0.82_0.16_90)]/30 font-bold">
              Signals: {Object.values(signals).filter(s => s === 'yellow').length} Caution
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="w-4 h-4" />
            <span className="text-xs">v2.1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Platform;