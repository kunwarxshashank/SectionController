
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/context/WebSocketContext';
import Layout from '@/components/Layout';
import IncomingTrains from '@/components/IncomingTrains';
import TrackControl from '@/components/TrackControl';
import AIRecommendations from '@/components/AIRecommendations';
import { format } from 'date-fns';
import { Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
    const router = useRouter();
    const { authenticated, loading, admin } = useAuth();
    const { connected, subscribeToSection, sectionMetadata } = useWebSocket();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        if (!loading && !authenticated) {
            router.push('/login');
        }
    }, [authenticated, loading, router]);

    useEffect(() => {
        // Subscribe to section updates
        // Using a default section ID - you can make this dynamic based on admin data
        const sectionId = admin?.sectionId || 'bpl';
        subscribeToSection(sectionId);
    }, [subscribeToSection, admin]);

    useEffect(() => {
        // Update time every second
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!authenticated) {
        return null;
    }

    return (
        <Layout>
            {/* Page Header */}
            <div className="glass-dark rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white font-railway mb-1">
                            {sectionMetadata?.name || 'Section Control Dashboard'}
                        </h1>
                        <p className="text-sm text-gray-400">
                            Real-time monitoring and AI-powered traffic control
                        </p>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Current Time */}
                        <div className="flex items-center space-x-2 text-ir-cream">
                            <Clock size={20} />
                            <div className="text-right">
                                <p className="text-xs text-gray-400">IST</p>
                                <p className="font-mono font-semibold">
                                    {format(currentTime, 'HH:mm:ss')}
                                </p>
                            </div>
                        </div>

                        {/* Connection Status */}
                        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${connected ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            {connected ? (
                                <>
                                    <Wifi size={18} className="text-green-400" />
                                    <span className="text-xs font-medium text-green-300">CONNECTED</span>
                                </>
                            ) : (
                                <>
                                    <WifiOff size={18} className="text-red-400" />
                                    <span className="text-xs font-medium text-red-300">DISCONNECTED</span>
                                </>
                            )}
                        </div>

                        {/* Active Alerts */}
                        <div className="flex items-center space-x-2 px-3 py-2 bg-orange-500/20 rounded-lg">
                            <AlertCircle size={18} className="text-orange-400" />
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Alerts</p>
                                <p className="font-semibold text-orange-300">2</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-12 gap-6" style={{ minHeight: 'calc(100vh - 300px)' }}>
                {/* Left Panel - Incoming Trains */}
                <div className="col-span-3">
                    <IncomingTrains />
                </div>

                {/* Center Panel - Track Control */}
                <div className="col-span-6">
                    <TrackControl />
                </div>

                {/* Right Panel - AI Recommendations */}
                <div className="col-span-3">
                    <AIRecommendations />
                </div>
            </div>
        </Layout>
    );
}
