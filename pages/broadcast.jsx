import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { Phone, Radio as RadioIcon, MessageSquare, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function BroadcastPage() {
    const router = useRouter();
    const { authenticated, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('hotline');
    const [activeCall, setActiveCall] = useState(null);
    const [transcript, setTranscript] = useState([]);
    const [callLogs, setCallLogs] = useState([
        {
            id: 1,
            type: 'hotline',
            participants: ['Bhopal Section', 'Itarsi Section'],
            duration: '05:32',
            timestamp: new Date(Date.now() - 3600000),
            summary: 'Discussed train priority for Express 12345',
        },
        {
            id: 2,
            type: 'radio',
            participants: ['Control Center', 'Train 11078'],
            duration: '02:15',
            timestamp: new Date(Date.now() - 7200000),
            summary: 'Speed restriction advisory',
        },
    ]);

    // Mock section controllers for hotline
    const sections = [
        { id: 'itarsi', name: 'Itarsi Section', status: 'available' },
        { id: 'habibganj', name: 'Habibganj Section', status: 'available' },
        { id: 'vidisha', name: 'Vidisha Section', status: 'busy' },
        { id: 'ganjbasoda', name: 'Ganj Basoda Section', status: 'available' },
    ];

    const startCall = (section) => {
        setActiveCall(section);
        setTranscript([
            { speaker: 'You', message: `Calling ${section.name}...`, time: new Date() },
            { speaker: section.name, message: 'Connected. This is control.', time: new Date() },
        ]);
    };

    const endCall = () => {
        if (activeCall) {
            const newLog = {
                id: callLogs.length + 1,
                type: activeTab,
                participants: ['Bhopal Section', activeCall.name],
                duration: '01:23',
                timestamp: new Date(),
                summary: 'Call completed',
            };
            setCallLogs([newLog, ...callLogs]);
        }
        setActiveCall(null);
        setTranscript([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!authenticated) {
        router.push('/login');
        return null;
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6 font-railway">
                    📡 Broadcast & Communication
                </h1>

                {/* Tabs */}
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setActiveTab('hotline')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'hotline'
                                ? 'bg-ir-orange text-white shadow-lg'
                                : 'glass-dark text-ir-cream hover:bg-white/10'
                            }`}
                    >
                        <Phone size={20} />
                        <span>Hotline</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('radio')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'radio'
                                ? 'bg-ir-orange text-white shadow-lg'
                                : 'glass-dark text-ir-cream hover:bg-white/10'
                            }`}
                    >
                        <RadioIcon size={20} />
                        <span>Radio</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'logs'
                                ? 'bg-ir-orange text-white shadow-lg'
                                : 'glass-dark text-ir-cream hover:bg-white/10'
                            }`}
                    >
                        <MessageSquare size={20} />
                        <span>Communication Logs</span>
                    </button>
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Communication Interface */}
                    <div className="col-span-8">
                        <div className="card">
                            {activeTab === 'hotline' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Hotline Directory</h2>

                                    {activeCall ? (
                                        <div>
                                            {/* Active Call */}
                                            <div className="glass-orange p-6 rounded-xl mb-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-white mb-1">
                                                            {activeCall.name}
                                                        </h3>
                                                        <div className="flex items-center space-x-2">
                                                            <div className="w-3 h-3 bg-green-500 rounded-full live-pulse"></div>
                                                            <span className="text-sm text-green-300">Call in progress</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={endCall}
                                                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                                                    >
                                                        End Call
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Transcript */}
                                            <div className="glass-dark p-4 rounded-xl" style={{ minHeight: '400px', maxHeight: '400px', overflowY: 'auto' }}>
                                                <h3 className="text-lg font-semibold text-white mb-3">Live Transcript</h3>
                                                <div className="space-y-3">
                                                    {transcript.map((msg, idx) => (
                                                        <div key={idx} className="flex flex-col">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-sm font-semibold text-ir-orange">{msg.speaker}</span>
                                                                <span className="text-xs text-gray-400">{format(msg.time, 'HH:mm:ss')}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-200 bg-black/20 rounded p-2">{msg.message}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            {sections.map((section) => (
                                                <div key={section.id} className="card-hover border border-white/10">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h3 className="text-lg font-semibold text-white">{section.name}</h3>
                                                        <span className={`badge ${section.status === 'available' ? 'badge-low' : 'badge-medium'}`}>
                                                            {section.status}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => startCall(section)}
                                                        disabled={section.status !== 'available'}
                                                        className="w-full mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center space-x-2"
                                                    >
                                                        <Phone size={18} />
                                                        <span>Call</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'radio' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Radio Communication</h2>

                                    <div className="glass-dark p-6 rounded-xl mb-4">
                                        <div className="text-center mb-6">
                                            <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-500/20 rounded-full mb-4">
                                                <RadioIcon size={48} className="text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">Channel 1 - Main</h3>
                                            <p className="text-sm text-gray-400">Push to talk</p>
                                        </div>

                                        <button className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-xl transition active:scale-95">
                                            🎙️ PRESS TO TALK
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4].map((ch) => (
                                            <button
                                                key={ch}
                                                className="px-4 py-2 glass-dark hover:bg-white/10 text-white rounded-lg transition-all"
                                            >
                                                CH {ch}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'logs' && (
                                <div>
                                    <h2 className="text-xl font-semibold text-white mb-4">Communication Logs</h2>

                                    {/* Search */}
                                    <div className="relative mb-4">
                                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search logs..."
                                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ir-orange"
                                        />
                                    </div>

                                    {/* Logs Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-white/5 text-gray-400 text-left">
                                                <tr>
                                                    <th className="px-4 py-3">Time</th>
                                                    <th className="px-4 py-3">Type</th>
                                                    <th className="px-4 py-3">Participants</th>
                                                    <th className="px-4 py-3">Duration</th>
                                                    <th className="px-4 py-3">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-white">
                                                {callLogs.map((log) => (
                                                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3">{format(log.timestamp, 'dd/MM/yyyy HH:mm')}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`badge ${log.type === 'hotline' ? 'badge-express' : 'badge-freight'}`}>
                                                                {log.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">{log.participants.join(' ↔ ')}</td>
                                                        <td className="px-4 py-3">{log.duration}</td>
                                                        <td className="px-4 py-3">
                                                            <button className="text-ir-orange hover:text-orange-400 transition-colors">
                                                                <Download size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Info */}
                    <div className="col-span-4">
                        <div className="card">
                            <h3 className="text-lg font-semibold text-white mb-4">Quick Info</h3>
                            <div className="space-y-4">
                                <div className="glass-dark p-3 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Total Calls Today</p>
                                    <p className="text-2xl font-bold text-white">24</p>
                                </div>
                                <div className="glass-dark p-3 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Average Duration</p>
                                    <p className="text-2xl font-bold text-white">04:32</p>
                                </div>
                                <div className="glass-dark p-3 rounded-lg">
                                    <p className="text-xs text-gray-400 mb-1">Active Channels</p>
                                    <p className="text-2xl font-bold text-white">3</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
