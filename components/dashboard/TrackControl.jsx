import React, { useState, useEffect } from 'react';
import { Train, Gauge } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const TrackControl = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [trainPositions, setTrainPositions] = useState({
        train1: { id: '12001', name: 'Shatabdi Express', position: 10, speed: 110, status: 'running', track: 1 },
        train2: { id: '12425', name: 'Rajdhani Express', position: 45, speed: 130, status: 'running', track: 2 },
        train3: { id: '22691', name: 'Duronto Express', position: 75, speed: 0, status: 'stopped', track: 3 },
        train4: { id: '12615', name: 'Grand Trunk', position: 30, speed: 95, status: 'running', track: 4 },
        train5: { id: '12951', name: 'Mumbai Rajdhani', position: 60, speed: 120, status: 'running', track: 5 }
    });

    const [signals, setSignals] = useState({
        sig1: { status: 'red', position: { x: 150, y: 70 }, id: 'SIG-A1' },
        sig2: { status: 'green', position: { x: 280, y: 135 }, id: 'SIG-B2' },
        sig3: { status: 'yellow', position: { x: 420, y: 200 }, id: 'SIG-C3' },
        sig4: { status: 'green', position: { x: 550, y: 70 }, id: 'SIG-D4' },
        sig5: { status: 'red', position: { x: 680, y: 270 }, id: 'SIG-E5' },
        sig6: { status: 'green', position: { x: 780, y: 115 }, id: 'SIG-F6' },
        sig7: { status: 'yellow', position: { x: 800, y: 230 }, id: 'SIG-G7' },
        sig8: { status: 'green', position: { x: 350, y: 315 }, id: 'SIG-H8' }
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // Simulate train movement
            setTrainPositions(prev => {
                const updated = {};
                Object.keys(prev).forEach(trainId => {
                    const train = prev[trainId];
                    updated[trainId] = {
                        ...train,
                        position: train.status === 'running' ? (train.position + (train.speed / 200)) % 100 : train.position
                    };
                });
                return updated;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const toggleSignal = (signalId) => {
        setSignals(prev => ({
            ...prev,
            [signalId]: {
                ...prev[signalId],
                status: prev[signalId].status === 'green' ? 'red' : prev[signalId].status === 'red' ? 'yellow' : 'green'
            }
        }));
    };

    const getSignalColor = (status) => {
        switch (status) {
            case 'green': return { fill: '#10b981', glow: '#10b981' };
            case 'red': return { fill: '#ef4444', glow: '#ef4444' };
            case 'yellow': return { fill: '#f59e0b', glow: '#f59e0b' };
            default: return { fill: '#6b7280', glow: '#6b7280' };
        }
    };

    const getTrainColor = (status) => {
        return status === 'running'
            ? 'from-emerald-500 to-green-600'
            : 'from-red-500 to-red-700';
    };

    return (
        <div className="w-full h-full space-y-4">
            {/* Modern Track Display with Light Background */}
            <div className="relative h-full bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50 rounded-2xl border-2 border-[color:var(--irctc-blue)]/30 overflow-hidden shadow-xl">
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Complex Track Visualization */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        {/* Gradient for tracks */}
                        <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#334155" stopOpacity="0.7" />
                            <stop offset="50%" stopColor="#1e293b" stopOpacity="1" />
                            <stop offset="100%" stopColor="#334155" stopOpacity="0.7" />
                        </linearGradient>

                        {/* Glow filters for signals */}
                        <filter id="signalGlow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* 5 Main Track Lines with complex layout */}
                    {[75, 140, 205, 270, 335].map((y, idx) => (
                        <g key={idx}>
                            {/* Track shadow */}
                            <line x1="20" y1={y + 2} x2="980" y2={y + 2} stroke="#cbd5e1" strokeWidth="7" opacity="0.4" />
                            {/* Main track */}
                            <line x1="20" y1={y} x2="980" y2={y} stroke="url(#trackGradient)" strokeWidth="6" />
                            {/* Track highlight */}
                            <line x1="20" y1={y - 1} x2="980" y2={y - 1} stroke="#64748b" strokeWidth="1" opacity="0.6" />
                            {/* Railway sleepers */}
                            {Array.from({ length: 24 }).map((_, i) => (
                                <rect
                                    key={i}
                                    x={25 + i * 40}
                                    y={y - 10}
                                    width="8"
                                    height="20"
                                    fill="#64748b"
                                    opacity="0.5"
                                    rx="1"
                                />
                            ))}
                        </g>
                    ))}

                    {/* Complex Junction Switches */}
                    <g stroke="#0ea5e9" strokeWidth="4" fill="none" opacity="0.8">
                        {/* Multiple crossovers between tracks */}
                        <path d="M 180 75 Q 200 95 220 140" filter="url(#signalGlow)" />
                        <path d="M 220 140 Q 200 120 180 75" strokeWidth="2" />

                        <path d="M 180 140 Q 200 160 220 205" filter="url(#signalGlow)" />
                        <path d="M 220 205 Q 200 185 180 140" strokeWidth="2" />

                        <path d="M 320 75 Q 340 95 360 140" filter="url(#signalGlow)" />
                        <path d="M 360 140 Q 340 120 320 75" strokeWidth="2" />

                        <path d="M 320 205 Q 340 225 360 270" filter="url(#signalGlow)" />
                        <path d="M 360 270 Q 340 250 320 205" strokeWidth="2" />

                        <path d="M 460 140 Q 480 160 500 205" filter="url(#signalGlow)" />
                        <path d="M 500 205 Q 480 185 460 140" strokeWidth="2" />

                        <path d="M 460 270 Q 480 290 500 335" filter="url(#signalGlow)" />
                        <path d="M 500 335 Q 480 315 460 270" strokeWidth="2" />
                    </g>

                    {/* Multiple Diamond Crossings */}
                    <g stroke="#0ea5e9" strokeWidth="4" opacity="0.7">
                        <path d="M 580 75 L 680 270" />
                        <path d="M 680 75 L 580 270" />
                        <circle cx="630" cy="172.5" r="12" fill="#0ea5e9" filter="url(#signalGlow)" opacity="0.8" />

                        <path d="M 750 140 L 850 335" strokeWidth="3.5" />
                        <path d="M 850 140 L 750 335" strokeWidth="3.5" />
                        <circle cx="800" cy="237.5" r="10" fill="#0ea5e9" filter="url(#signalGlow)" opacity="0.8" />
                    </g>

                    {/* Yard Siding Tracks (Complex) */}
                    <g stroke="#64748b" strokeWidth="4" fill="none" opacity="0.6">
                        <line x1="720" y1="95" x2="920" y2="95" />
                        <line x1="720" y1="110" x2="920" y2="110" />
                        <line x1="720" y1="125" x2="920" y2="125" />

                        <line x1="720" y1="250" x2="920" y2="250" />
                        <line x1="720" y1="265" x2="920" y2="265" />
                        <line x1="720" y1="280" x2="920" y2="280" />
                        <line x1="720" y1="295" x2="920" y2="295" />

                        {/* Connecting curves to yard */}
                        <path d="M 680 75 Q 695 80 720 95" strokeWidth="3" />
                        <path d="M 680 75 Q 695 88 720 110" strokeWidth="3" />
                        <path d="M 680 75 Q 695 96 720 125" strokeWidth="3" />

                        <path d="M 680 270 Q 695 260 720 250" strokeWidth="3" />
                        <path d="M 680 270 Q 695 268 720 265" strokeWidth="3" />
                        <path d="M 680 270 Q 695 275 720 280" strokeWidth="3" />
                        <path d="M 680 270 Q 695 283 720 295" strokeWidth="3" />
                    </g>

                    {/* Modern Station Platforms */}
                    {[
                        { x: 80, y: 48, name: 'Misrod', width: 90, color: '#3b82f6' },
                        { x: 240, y: 113, name: 'RKMKP Junction', width: 130, color: '#8b5cf6' },
                        { x: 390, y: 178, name: 'Bhopal Central', width: 140, color: '#ec4899' },
                        { x: 720, y: 68, name: 'Nishatpura', width: 100, color: '#10b981' },
                        { x: 300, y: 308, name: 'Habibganj', width: 110, color: '#f59e0b' }
                    ].map((station, idx) => (
                        <g key={idx}>
                            <rect
                                x={station.x}
                                y={station.y}
                                width={station.width}
                                height="26"
                                fill={station.color}
                                fillOpacity="0.15"
                                stroke={station.color}
                                strokeWidth="2"
                                rx="5"
                            />
                            <text
                                x={station.x + station.width / 2}
                                y={station.y + 16}
                                textAnchor="middle"
                                fill={station.color}
                                fontSize="11"
                                fontWeight="700"
                            >
                                {station.name}
                            </text>
                        </g>
                    ))}

                    {/* Animated Signal Lights */}
                    {Object.entries(signals).map(([id, signal]) => {
                        const colors = getSignalColor(signal.status);
                        return (
                            <g key={id}>
                                {/* Outer glow */}
                                <circle
                                    cx={signal.position.x}
                                    cy={signal.position.y}
                                    r="12"
                                    fill={colors.fill}
                                    filter="url(#signalGlow)"
                                    opacity="0.3"
                                />
                                {/* Main signal */}
                                <circle
                                    cx={signal.position.x}
                                    cy={signal.position.y}
                                    r="9"
                                    fill={colors.fill}
                                    stroke="#fff"
                                    strokeWidth="2"
                                    className="cursor-pointer"
                                    opacity="0.95"
                                />
                                {/* Signal pole */}
                                <rect
                                    x={signal.position.x - 1.5}
                                    y={signal.position.y + 9}
                                    width="3"
                                    height="15"
                                    fill="#475569"
                                    rx="1"
                                />
                                {/* Signal ID label */}
                                <text
                                    x={signal.position.x}
                                    y={signal.position.y - 18}
                                    textAnchor="middle"
                                    fill="#1e293b"
                                    fontSize="9"
                                    fontWeight="600"
                                >
                                    {signal.id}
                                </text>
                            </g>
                        );
                    })}

                    {/* Block Sections with modern labels */}
                    {[
                        { x: 100, y: 105, text: 'BLOCK-A', color: '#3b82f6' },
                        { x: 250, y: 170, text: 'BLOCK-B', color: '#8b5cf6' },
                        { x: 400, y: 235, text: 'BLOCK-C', color: '#ec4899' },
                        { x: 610, y: 340, text: 'BLOCK-D', color: '#f59e0b' },
                        { x: 800, y: 175, text: 'YARD-01', color: '#10b981' },
                        { x: 850, y: 310, text: 'YARD-02', color: '#14b8a6' }
                    ].map((block, idx) => (
                        <g key={idx}>
                            <rect
                                x={block.x - 30}
                                y={block.y - 10}
                                width="60"
                                height="16"
                                fill={block.color}
                                fillOpacity="0.1"
                                stroke={block.color}
                                strokeWidth="1"
                                rx="3"
                            />
                            <text
                                x={block.x}
                                y={block.y + 2}
                                textAnchor="middle"
                                fill={block.color}
                                fontSize="10"
                                fontWeight="700"
                            >
                                {block.text}
                            </text>
                        </g>
                    ))}

                    {/* Distance markers */}
                    {[
                        { x: 120, y: 38, dist: '0.5km' },
                        { x: 280, y: 38, dist: '1.8km' },
                        { x: 450, y: 38, dist: '3.2km' },
                        { x: 620, y: 38, dist: '5.1km' },
                        { x: 780, y: 38, dist: '7.5km' },
                        { x: 900, y: 38, dist: '9.8km' }
                    ].map((marker, idx) => (
                        <text key={idx} x={marker.x} y={marker.y} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="500">
                            {marker.dist}
                        </text>
                    ))}
                </svg>

                {/* Animated Train Markers */}
                {Object.entries(trainPositions).map(([trainId, train]) => {
                    const trackY = [58, 123, 188, 253, 318][train.track - 1];
                    return (
                        <div
                            key={trainId}
                            className={`absolute transition-all duration-1000 ease-linear ${train.status === 'running' ? 'animate-pulse' : ''}`}
                            style={{
                                left: `${train.position * 9.3 + 20}px`,
                                top: `${trackY}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            {/* Train Icon with Glow */}
                            <div className="relative group">
                                <div className={`absolute inset-0 bg-gradient-to-r ${getTrainColor(train.status)} blur-lg opacity-60 rounded-xl`} />
                                <div className={`relative w-14 h-10 rounded-xl bg-gradient-to-r ${getTrainColor(train.status)} border-2 ${train.status === 'running' ? 'border-emerald-300' : 'border-red-300'} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform`}>
                                    <Train className="w-6 h-6 text-white" />
                                </div>

                                {/* Train Info Tooltip */}
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    <div className="bg-white/95 backdrop-blur-sm border-2 border-[color:var(--irctc-blue)] rounded-lg p-2 shadow-xl min-w-[120px]">
                                        <div className="text-slate-800 text-xs font-bold mb-0.5">{train.name}</div>
                                        <div className="text-slate-600 text-xs">#{train.id}</div>
                                        <div className="flex items-center gap-1 mt-1">
                                            <Gauge className="w-3 h-3 text-emerald-600" />
                                            <span className="text-emerald-600 text-xs font-semibold">{train.speed} km/h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Modern Control Panel Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                    <Card className="bg-white/90 backdrop-blur-md border-[color:var(--irctc-blue)]/40 shadow-lg p-4">
                        <div className="grid grid-cols-8 gap-2">
                            {Object.entries(signals).map(([signalId, signal]) => (
                                <button
                                    key={signalId}
                                    onClick={() => toggleSignal(signalId)}
                                    className="group relative flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-all"
                                >
                                    <div className="relative">
                                        <div className={`absolute inset-0 ${signal.status === 'green' ? 'bg-emerald-500' :
                                            signal.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'
                                            } blur-md opacity-40 rounded-full`} />
                                        <div className={`relative w-9 h-9 rounded-full ${signal.status === 'green' ? 'bg-emerald-500' :
                                            signal.status === 'red' ? 'bg-red-500' : 'bg-yellow-500'
                                            } border-2 border-white shadow-lg group-hover:scale-110 transition-transform`} />
                                    </div>
                                    <div className="text-xs text-slate-700 font-semibold">{signal.id}</div>
                                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300 capitalize">
                                        {signal.status}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Status Indicators Top Right */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Card className="bg-white/90 backdrop-blur-md border-[color:var(--irctc-blue)]/40 shadow-md p-3">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-semibold">SYSTEM ACTIVE</span>
                        </div>
                    </Card>
                    <Card className="bg-white/90 backdrop-blur-md border-[color:var(--irctc-blue)]/40 shadow-md p-3">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-700">Active Trains</span>
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                    {Object.values(trainPositions).filter(t => t.status === 'running').length}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-700">Clear Signals</span>
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                    {Object.values(signals).filter(s => s.status === 'green').length}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-700">Caution</span>
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                    {Object.values(signals).filter(s => s.status === 'yellow').length}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TrackControl;