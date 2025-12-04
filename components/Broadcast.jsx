import { useRouter } from 'next/router';
import { Phone, Radio, Users, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function Broadcast() {
    const router = useRouter();
    const [onlineCount] = useState(3); // This could be dynamic from WebSocket

    const handleBroadcastClick = () => {
        router.push('/broadcast');
    };

    return (
        <div
            className="glass-dark rounded-xl p-6 h-full border animate-slide-in"
            style={{
                borderColor: 'var(--border-primary)',
                background: 'var(--surface-glass)'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div
                        className="p-2.5 rounded-lg"
                        style={{
                            background: 'linear-gradient(135deg, #EA7317 0%, #FF9933 100%)',
                            boxShadow: '0 4px 15px rgba(234, 115, 23, 0.3)'
                        }}
                    >
                        <Radio size={24} className="text-white" />
                    </div>
                    <div>
                        <h2
                            className="text-lg font-bold font-railway"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Communication Hub
                        </h2>
                        <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Hotline & Radio System
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full live-pulse"></div>
                    <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        {onlineCount} Online
                    </span>
                </div>
            </div>

            {/* Quick Access Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={handleBroadcastClick}
                    className="group relative p-4 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                >
                    <Phone
                        size={28}
                        className="mx-auto mb-2 transition-transform group-hover:scale-110"
                        style={{ color: '#22c55e' }}
                    />
                    <p
                        className="text-sm font-semibold text-center"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Hotline
                    </p>
                </button>

                <button
                    onClick={handleBroadcastClick}
                    className="group relative p-4 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Radio
                        size={28}
                        className="mx-auto mb-2 transition-transform group-hover:scale-110"
                        style={{ color: '#3b82f6' }}
                    />
                    <p
                        className="text-sm font-semibold text-center"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Radio PTT
                    </p>
                </button>
            </div>

            {/* Status Info */}
            <div className="space-y-2">
                <div
                    className="glass p-3 rounded-lg flex items-center justify-between"
                    style={{ border: '1px solid var(--border-accent)' }}
                >
                    <div className="flex items-center space-x-2">
                        <Users size={16} style={{ color: 'var(--brand-orange)' }} />
                        <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Active Controllers
                        </span>
                    </div>
                    <span
                        className="text-sm font-bold"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {onlineCount}
                    </span>
                </div>

                <div
                    className="glass p-3 rounded-lg flex items-center justify-between"
                    style={{ border: '1px solid var(--border-accent)' }}
                >
                    <div className="flex items-center space-x-2">
                        <MessageSquare size={16} style={{ color: 'var(--brand-orange)' }} />
                        <span
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Radio Channel
                        </span>
                    </div>
                    <span
                        className="text-sm font-bold"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        CH 1
                    </span>
                </div>
            </div>

            {/* Open Full Page Button */}
            <button
                onClick={handleBroadcastClick}
                className="w-full mt-4 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                style={{
                    background: 'var(--gradient-accent)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(234, 115, 23, 0.3)'
                }}
            >
                Open Communication Center
            </button>
        </div>
    );
}
