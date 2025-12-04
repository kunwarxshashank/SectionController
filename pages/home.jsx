
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useWebSocket } from '@/context/WebSocketContext';
import Layout from '@/components/Layout';
import IncomingTrains from '@/components/IncomingTrains';
import TrackControl from '@/components/TrackControl';
import AIRecommendations from '@/components/AIRecommendations';
import Broadcast from '@/components/Broadcast';
import { format } from 'date-fns';
import { Clock, AlertCircle, Wifi, WifiOff, Activity, Zap } from 'lucide-react';
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
            <div
                className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: 'var(--gradient-primary)' }}
            >
                <div className="spinner mb-4"></div>
                <p
                    className="text-lg font-semibold animate-pulse"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Loading Section Controller...
                </p>
            </div>
        );
    }

    if (!authenticated) {
        return null;
    }

    return (
        <Layout>
            {/* Page Header */}
            {/* <div
                className="glass-dark rounded-xl p-3 mb-4 animate-slide-in"
                style={{ border: '1px solid var(--border-primary)' }}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1
                            className="text-2xl font-bold font-railway mb-2"
                        >
                            <span style={{
                                background: 'var(--gradient-accent)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}>
                                {sectionMetadata?.name || 'Section Control Dashboard'}
                            </span>
                        </h1>
                        <p
                            className="text-sm font-medium flex items-center space-x-1"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            <Activity size={14} className="animate-pulse" style={{ color: '#22c55e' }} />
                            <span>Real-time monitoring and AI-powered traffic control</span>
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">

 
                        <div
                            className="glass px-4 py-3 rounded-lg"
                            style={{ border: '1px solid var(--border-accent)' }}
                        >
                            <div className="flex items-center space-x-2">
                                <Clock size={24} style={{ color: 'var(--brand-orange)' }} />
                                <div>
                                    <p
                                        className="text-xs font-bold uppercase tracking-wider"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    >
                                        IST {format(currentTime, 'HH:mm:ss')}
                                    </p>
                                </div>
                            </div>
                        </div>

  
                        <div
                            className="px-4 py-3 rounded-lg transition-all duration-300"
                            style={{
                                background: connected
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                border: `1px solid ${connected ? '#22c55e' : '#ef4444'}`
                            }}
                        >
                            <div className="flex items-center space-x-2">
                                {connected ? (
                                    <>
                                        <Wifi size={20} className="animate-pulse" style={{ color: '#86efac' }} />
                                        <span
                                            className="text-xs font-bold uppercase tracking-wider"
                                            style={{ color: '#86efac' }}
                                        >
                                            Connected
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <WifiOff size={20} style={{ color: '#fca5a5' }} />
                                        <span
                                            className="text-xs font-bold uppercase tracking-wider"
                                            style={{ color: '#fca5a5' }}
                                        >
                                            Disconnected
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>


                        <div
                            className="px-4 py-3 rounded-lg"
                            style={{
                                background: 'rgba(234, 115, 23, 0.15)',
                                border: '1px solid var(--brand-orange)'
                            }}
                        >
                            <div className="flex items-center space-x-3">
                                <AlertCircle size={20} className="animate-pulse" style={{ color: 'var(--brand-orange)' }} />
                                <div className="text-right">
                                    <p
                                        className="text-xs font-bold uppercase tracking-wider"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    >
                                        Alerts: 2
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* Main Dashboard Grid */}
            <div
                className="grid gap-4"
                style={{
                    height: 'calc(100vh - 120px)',
                    gridTemplateColumns: '75% 25%',
                    gridTemplateRows: 'auto 1fr auto'
                }}
            >

                {/* Left Column - Track Control (spans full height) */}
                <div
                    className="animate-slide-in"
                    style={{
                        gridRow: '1 / 3',
                        gridColumn: '1',
                        animationDelay: '0.1s',
                        minHeight: 0
                    }}
                >
                    <TrackControl />
                </div>


                {/* Top Right - Broadcast */}
                <div
                    className="animate-slide-in"
                    style={{
                        gridRow: '1',
                        gridColumn: '2',
                        animationDelay: '0.2s'
                    }}
                >
                    <Broadcast />
                </div>



                {/* Middle Right - AI Recommendations */}
                <div
                    className="animate-slide-in"
                    style={{
                        gridRow: '2 / 4',
                        gridColumn: '2',
                        animationDelay: '0.3s',
                        minHeight: 0
                    }}
                >
                    <AIRecommendations />
                </div>


                {/* Bottom - Incoming Trains (horizontal, 75% width) */}
                <div
                    className="animate-slide-in"
                    style={{
                        gridRow: '3',
                        gridColumn: '1',
                        animationDelay: '0.4s',
                        maxHeight: '180px'
                    }}
                >
                    <IncomingTrains />
                </div>
            </div>
        </Layout>
    );
}

