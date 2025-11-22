"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Phone, Clock, Radio, MessageSquare, Search, Filter, Mic, MicOff, PhoneCall, PhoneOff, Bell, BellOff, Train, User, MapPin, Calendar, TrendingUp, CheckCircle, XCircle, Pause, Play, Settings, ArrowRight, ArrowLeft, Target, Truck, Wrench, Navigation } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { useSectionRealtime } from '@/hooks/use-section-realtime';
import { normalizeSectionSchedule } from '@/lib/utils/section-trains';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';


 const BroadCast = () => {
  const { user } = useAuth();
  const sectionId = user?.username?.toLowerCase();

  const {
    data: realtimeSection,
    error: sectionError,
    isLoading: sectionLoading,
  } = useSectionRealtime(sectionId, { enabled: Boolean(sectionId) });

  const trains = useMemo(() => normalizeSectionSchedule(realtimeSection?.schedule || []), [realtimeSection]);
  const [activeTab, setActiveTab] = useState('communications');
  const [trainFilter, setTrainFilter] = useState('all');
  const [isRecording, setIsRecording] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedStation, setSelectedStation] = useState("BPLJN");

  const trainsLoading = sectionLoading && trains.length === 0;
  const sectionStatusMessage = sectionError || (!sectionId ? 'No section assigned to this admin.' : '');

  // Stations Data (fetched from /api/section)
  const [stations, setStations] = useState([]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const res = await fetch('/api/sections');
        if (!res.ok) {
          console.error('Failed to fetch stations:', res.status);
          return;
        }
        const data = await res.json();

        // Normalize API response into shape used in the UI
        const normalized = (Array.isArray(data) ? data : []).map((station, index) => {
          const username = station.sectionName || '';
          const sectionName = station.sectionName || '';
          // Try to derive a short code from the username or name, fallback to index
          const derivedCode =
            sectionName.split('-').pop()?.toUpperCase() ||
            sectionName?.split(' - ').pop()?.toUpperCase() ||
            `STN-${index + 1}`;

          return {
            code: derivedCode,
            name: sectionName,
          };
        });

        setStations(normalized);
      } catch (err) {
        console.error('Error fetching stations from /api/section:', err);
      }
    };

    fetchStations();
  }, []);

  

  // Communications Data
  const [communications, setCommunications] = useState([
    {
      id: 1,
      type: 'hotline',
      station: 'Itarsi Junction',
      trainNumber: '12953',
      timestamp: '14:23:15',
      priority: 'emergency',
      status: 'completed',
      duration: '2:34',
      summary: 'Rajdhani given priority crossing at ITR. Freight F-2401 moved to loop-3.',
      transcript: 'SM ITR: Control, Rajdhani approaching. Control: Roger, clear mainline, move freight to loop-3. SM: Freight moving to loop-3, mainline clear.',
      action: 'Freight rerouted to loop line'
    },
    {
      id: 2,
      type: 'radio',
      station: 'Loco Pilot - 12155',
      trainNumber: '12155',
      timestamp: '14:20:42',
      priority: 'priority',
      status: 'active',
      duration: '1:12',
      summary: 'Shatabdi held at HD outer due to conflicting freight movement. Expected 20 min delay.',
      transcript: 'LP 12155: Control, held at HD outer signal. Control: Traffic ahead, expect 20 min delay. LP: Roger, passengers informed.',
      action: 'Delay communicated to passengers'
    },
    {
      id: 3,
      type: 'message',
      station: 'Vidisha',
      trainNumber: '18237',
      timestamp: '14:18:33',
      priority: 'normal',
      status: 'acknowledged',
      duration: '0:45',
      summary: 'Chhattisgarh Express crossing approved at Vidisha with MEMU 59388.',
      transcript: 'Message: Cross with MEMU 59388 at BHS. LP Acknowledgment: Received and confirmed.',
      action: 'Crossing coordinated'
    }
  ]);

  // Crossings and Passes
  const [crossings] = useState([
    {
      id: 1,
      train1: { number: '12953', name: 'Rajdhani', type: 'superfast' },
      train2: { number: 'F-2401', name: 'Coal Rake', type: 'freight' },
      station: 'Itarsi',
      status: 'completed',
      priority: 'rajdhani-priority',
      time: '14:25'
    },
    {
      id: 2,
      train1: { number: '18237', name: 'Chhattisgarh Exp', type: 'express' },
      train2: { number: '59388', name: 'MEMU', type: 'suburban' },
      station: 'Vidisha',
      status: 'scheduled',
      priority: 'express-priority',
      time: '14:45'
    }
  ]);

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'superfast':
      case 'express': return <Train className="w-4 h-4" />;
      case 'suburban': return <Navigation className="w-4 h-4" />;
      case 'freight': return <Truck className="w-4 h-4" />;
      case 'special': return <Wrench className="w-4 h-4" />;
      default: return <Train className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case 'superfast': return 'bg-red-100 text-red-800 border-red-200';
      case 'express': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'suburban': return 'bg-green-100 text-green-800 border-green-200';
      case 'freight': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'special': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'on-time': return 'text-green-600';
      case 'delayed': return 'text-red-600';
      case 'held': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const handleStationCall = (station) => {
    setActiveCall({
      contact: `SM - ${station.name}`,
      type: 'station',
      code: station.code,
      startTime: new Date().toLocaleTimeString('en-IN', { hour12: false })
    });
  };

  const handleTrainCall = (train) => {
    setActiveCall({
      contact: `LP - ${train.number}`,
      type: 'train',
      trainName: train.name,
      startTime: new Date().toLocaleTimeString('en-IN', { hour12: false })
    });
  };

  const sendQuickMessage = (train, message) => {
    const newComm = {
      id: communications.length + 1,
      type: 'message',
      station: `LP - ${train.number}`,
      trainNumber: train.number,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      priority: 'priority',
      status: 'sent',
      duration: '0:00',
      summary: `Quick message sent: ${message}`,
      transcript: `Control to ${train.number}: ${message}`,
      action: 'Message dispatched'
    };
    setCommunications(prev => [newComm, ...prev]);
  };

  const filteredTrains = useMemo(() => {
    return trains.filter(train => {
      const matchesFilter = trainFilter === 'all' || train.category === trainFilter;
      const matchesSearch =
        train.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        train.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [trains, trainFilter, searchTerm]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.99_0.01_95)] via-[oklch(0.985_0.015_95)] to-[oklch(0.98_0.02_95)] flex flex-col">
      {/* Header */}
      <PageHeader 
        pageName="Broadcast & Communications Center" 
        icon={Phone}
        showStats={true}
      />

      {/* Active Call Banner */}
      {activeCall && (
        <div className="bg-gradient-to-r from-[oklch(0.7_0.2_150)] to-[oklch(0.7_0.2_150)]/90 text-white p-4 shadow-lg border-b-2 border-[oklch(0.7_0.2_150)]/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50"></div>
              <span className="font-bold text-lg">Active Call: {activeCall.contact}</span>
              <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
                Started: {activeCall.startTime}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsRecording(!isRecording)}
                className={`flex items-center gap-2 ${
                  isRecording 
                    ? 'bg-[oklch(0.6_0.23_25)] hover:bg-[oklch(0.6_0.23_25)]/90 text-white' 
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? 'Recording...' : 'Start Recording'}</span>
              </Button>
              <Button
                onClick={() => setActiveCall(null)}
                className="bg-[oklch(0.6_0.23_25)] hover:bg-[oklch(0.6_0.23_25)]/90 text-white border-0"
              >
                <PhoneOff className="w-4 h-4" />
                <span>End Call</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-gradient-to-r from-card/95 to-card/90 border-b-2 border-[color:var(--irctc-blue)]/20 shadow-sm">
        <nav className="flex gap-1 px-6">
          {[
            { id: 'communications', name: 'Communications', icon: Phone },
            { id: 'trains', name: 'Train Segregation', icon: Train },
            { id: 'stations', name: 'Station Directory', icon: MapPin },
            { id: 'logs', name: 'Logs', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 rounded-t-xl transition-all duration-300 font-semibold text-sm ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-b from-[color:var(--irctc-blue)]/10 to-transparent text-[color:var(--irctc-blue)] border-b-2 border-[color:var(--irctc-blue)]' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[oklch(0.71_0.2_50)] via-[color:var(--irctc-blue)] to-[oklch(0.7_0.2_150)] rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>



      <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-[oklch(0.99_0.01_95)] to-[oklch(0.97_0.015_95)]">
        {/* Train Segregation Panel */}
        {activeTab === 'trains' && (
          <div className="w-full flex">
            <div className="w-80 bg-gradient-to-b from-card/95 to-card/90 border-r-2 border-[color:var(--irctc-blue)]/20 p-4 shadow-inner">
              <h3 className="font-semibold text-gray-800 mb-4">Train Categories</h3>
              <div className="space-y-2 mb-4">
                {[
                  { id: 'all', name: 'All Trains', count: trains.length },
                  { id: 'superfast', name: 'Superfast', count: trains.filter(t => t.category === 'superfast').length },
                  { id: 'express', name: 'Express', count: trains.filter(t => t.category === 'express').length },
                  { id: 'suburban', name: 'Suburban/MEMU', count: trains.filter(t => t.category === 'suburban').length },
                  { id: 'freight', name: 'Freight', count: trains.filter(t => t.category === 'freight').length },
                  { id: 'special', name: 'Special/MT', count: trains.filter(t => t.category === 'special').length }
                ].map(category => (
                  <button
                    key={category.id}
                    onClick={() => setTrainFilter(category.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                      trainFilter === category.id 
                        ? 'bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-[color:var(--irctc-blue)]/5 border-[color:var(--irctc-blue)]/30 text-[color:var(--irctc-blue)] font-semibold shadow-sm' 
                        : 'bg-gradient-to-r from-card/80 to-card/60 border-[color:var(--irctc-blue)]/20 text-foreground hover:bg-card hover:border-[color:var(--irctc-blue)]/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{category.name}</span>
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              

            </div>

            <div className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Live Train Status</h2>
                  <p className="text-gray-600">Real-time monitoring of Itarsi-Bhopal corridor</p>
                  {sectionStatusMessage && (
                    <p className="text-sm text-red-600 mt-2">{sectionStatusMessage}</p>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Search train number/name..."
                  className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>


              {trainsLoading ? (
                <div className="text-gray-500 text-sm">Loading live trains…</div>
              ) : filteredTrains.length === 0 ? (
                <div className="text-gray-500 text-sm">No trains match this filter.</div>
              ) : (
                <div className="grid gap-4">
                  {filteredTrains.map(train => (
                    <div key={train.number} className="bg-gradient-to-br from-card to-card/95 rounded-xl shadow-md border-2 border-[color:var(--irctc-blue)]/20 p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg border ${getCategoryColor(train.category)}`}>
                            {getCategoryIcon(train.category)}
                          </div>
                          <div>
                            <div className="font-bold text-lg">{train.number}</div>
                            <div className="text-gray-700 font-medium">{train.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(train.priority)}`}>
                            {train.priority.toUpperCase()} PRIORITY
                          </span>
                          <span className={`font-semibold ${getStatusColor(train.status)}`}>
                            {train.status.replace('-', ' ').toUpperCase()}
                            {train.delay > 0 && ` (+${train.delay}m)`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Current: {train.location}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleTrainCall(train)}
                            disabled={activeCall !== null}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
                              activeCall ? 'bg-muted/50 text-muted-foreground cursor-not-allowed' :
                              'bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-[color:var(--irctc-blue)]/5 hover:from-[color:var(--irctc-blue)]/20 hover:to-[color:var(--irctc-blue)]/10 border border-[color:var(--irctc-blue)]/30 text-[color:var(--irctc-blue)] font-semibold hover:shadow-sm'
                            }`}
                          >
                            <Radio className="w-4 h-4" />
                            <span>Radio</span>
                          </button>
                          
                          <select
                            onChange={(e) => e.target.value && sendQuickMessage(train, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            defaultValue=""
                          >
                            <option value="" disabled>Quick Message</option>
                            <option value="Hold at next station">Hold at next station</option>
                            <option value="Proceed with caution">Proceed with caution</option>
                            <option value="Report arrival time">Report arrival time</option>
                            <option value="Move to loop line">Move to loop line</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}


        {/* Station Directory */}
        {activeTab === 'stations' && (
          <div className="w-full flex">
            <div className="w-80 bg-gradient-to-b from-card/95 to-card/90 border-r-2 border-[color:var(--irctc-blue)]/20 p-4 shadow-inner">
              <h3 className="font-semibold text-gray-800 mb-4">Section Stations</h3>
              <div className="space-y-2">
                {stations.map(station => (
                  <button
                    key={station.code}
                    onClick={() => setSelectedStation(station)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                        selectedStation?.code === station.code 
                          ? 'bg-gradient-to-r from-[color:var(--irctc-blue)]/10 to-[color:var(--irctc-blue)]/5 border-[color:var(--irctc-blue)]/30 text-[color:var(--irctc-blue)] font-semibold shadow-sm' 
                          : 'bg-gradient-to-r from-card/80 to-card/60 border-[color:var(--irctc-blue)]/20 text-foreground hover:bg-card hover:border-[color:var(--irctc-blue)]/40 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold">{station.code}</div>
                        <div className="text-sm">{station.name}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-1 rounded ${
                          station.type === 'major' ? 'bg-red-100 text-red-800' :
                          station.type === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {station.type}
                        </div>
                        {station.hasYard && (
                          <div className="text-xs text-orange-600 mt-1">● Yard</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            
            {/*               
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 mb-2">Section Controllers</h4>
                <div className="space-y-2">
                  <button className="w-full p-2 bg-purple-50 border border-purple-200 rounded text-left">
                    <div className="text-sm font-medium text-purple-800">◄ Previous Section</div>
                    <div className="text-xs text-purple-600">Jabalpur Division</div>
                  </button>
                  <button className="w-full p-2 bg-purple-50 border border-purple-200 rounded text-left">
                    <div className="text-sm font-medium text-purple-800">Next Section ►</div>
                    <div className="text-xs text-purple-600">Bhopal-Ujjain</div>
                  </button>
                </div>
              </div> 
            */}


            </div>

            <div className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
              {selectedStation ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedStation.name}</h2>
                    <p className="text-gray-600">Station Code: {selectedStation.code} • Type: {selectedStation.type}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-card to-card/95 rounded-xl shadow-md border-2 border-[color:var(--irctc-blue)]/20 p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">Communication</h3>
                      <div className="space-y-3">
                        <button
                          onClick={() => handleStationCall(selectedStation)}
                          disabled={activeCall !== null}
                          className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                            activeCall ? 'bg-muted/50 text-muted-foreground cursor-not-allowed border-2 border-border' :
                            'bg-gradient-to-r from-[oklch(0.7_0.2_150)]/10 to-[oklch(0.7_0.2_150)]/5 hover:from-[oklch(0.7_0.2_150)]/20 hover:to-[oklch(0.7_0.2_150)]/10 border-2 border-[oklch(0.7_0.2_150)]/30 text-[oklch(0.7_0.2_150)] font-semibold hover:shadow-md'
                          }`}
                        >
                          <Phone className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-medium">Station Master Hotline</div>
                            <div className="text-sm opacity-75">{selectedStation.hotline}</div>
                          </div>
                        </button>
                        
                        {selectedStation.hasYard && (
                          <button
                            className="w-full p-3 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg flex items-center space-x-3 text-orange-800"
                          >
                            <Truck className="w-5 h-5" />
                            <div className="text-left">
                              <div className="font-medium">Yard Master</div>
                              <div className="text-sm opacity-75">Freight Operations</div>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-card to-card/95 rounded-xl shadow-md border-2 border-[color:var(--irctc-blue)]/20 p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                      <div className="space-y-2">
                        <button className="w-full p-2 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-800">
                          Clear mainline for express
                        </button>
                        <button className="w-full p-2 text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded text-yellow-800">
                          Hold freight in loop
                        </button>
                        <button className="w-full p-2 text-left bg-red-50 hover:bg-red-100 border border-red-200 rounded text-red-800">
                          Emergency stop all trains
                        </button>
                        {selectedStation.hasYard && (
                          <button className="w-full p-2 text-left bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded text-orange-800">
                            Route freight to yard
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedStation.hasYard && (
                    <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <h3 className="font-semibold text-gray-800 mb-4">
                        {selectedStation.name} Yard Operations
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        {['Loop-1 (Coal)', 'Loop-2 (Container)', 'Loop-3 (Cement)'].map((loop, idx) => (
                          <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="font-medium text-orange-800">{loop}</div>
                            <div className="text-sm text-orange-600 mt-1">
                              {idx === 0 ? 'F-2401 (Occupied)' : idx === 1 ? 'Available' : 'F-1205 (Loading)'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-20">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a station from the left panel to view details</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <div className="w-full flex">
            <div className="w-80 bg-gradient-to-b from-card/95 to-card/90 border-r-2 border-[color:var(--irctc-blue)]/20 p-4 shadow-inner">
              <h3 className="font-semibold text-gray-800 mb-4">Communication Filters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="emergency">Emergency</option>
                    <option value="priority">Priority</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Communication Type</label>
                  <div className="space-y-2">
                    {['hotline', 'radio', 'message'].map(type => (
                      <label key={type} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" defaultChecked />
                        <span className="text-sm capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Train number, station..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Today's KPIs</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Comms</span>
                    <span className="font-semibold">{communications.length + 23}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Avg Response</span>
                    <span className="font-semibold text-green-600">1.8 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Emergency Calls</span>
                    <span className="font-semibold text-red-600">4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Resolution Rate</span>
                    <span className="font-semibold text-green-600">96.2%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Communication Logs</h2>
                <p className="text-gray-600">Real-time communication tracking with AI summaries</p>
              </div>
              
              <div className="space-y-4">
                {communications.map((comm) => (
                  <div key={comm.id} className="bg-gradient-to-br from-card to-card/95 rounded-xl shadow-md border-2 border-[color:var(--irctc-blue)]/20 p-4 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {comm.type === 'hotline' ? <Phone className="w-4 h-4" /> :
                           comm.type === 'radio' ? <Radio className="w-4 h-4" /> :
                           <MessageSquare className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{comm.station}</div>
                          <div className="text-sm text-gray-600 flex items-center space-x-2">
                            <Train className="w-3 h-3" />
                            <span>Train: {comm.trainNumber}</span>
                            <Clock className="w-3 h-3 ml-2" />
                            <span>{comm.timestamp} ({comm.duration})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          comm.priority === 'emergency' ? 'text-red-600 bg-red-50 border-red-200' :
                          comm.priority === 'priority' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                          'text-green-600 bg-green-50 border-green-200'
                        }`}>
                          {comm.priority.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-1">
                          {comm.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : comm.status === 'active' ? (
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                          ) : comm.status === 'acknowledged' ? (
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg mb-3">
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-green-200 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-green-800">AI</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-green-800 mb-1">Action Summary</div>
                          <div className="text-sm text-green-900">{comm.summary}</div>
                          {comm.action && (
                            <div className="mt-2 px-2 py-1 bg-green-200 rounded text-xs font-medium text-green-800">
                              ✓ {comm.action}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 flex items-center space-x-1">
                        <span>View Full Transcript</span>
                        <div className="w-4 h-4 transition-transform group-open:rotate-90">▶</div>
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono text-xs leading-relaxed">
                        {comm.transcript}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default BroadCast;