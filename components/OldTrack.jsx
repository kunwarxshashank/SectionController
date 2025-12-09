import { useState, useEffect } from 'react';
import { Train, Gauge, AlertCircle, Loader2, Maximize2, Minimize2 } from 'lucide-react';

export default function TrackControl() {
    const [sectionData, setSectionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null);

    // Fetch data from API
    const fetchSectionData = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/section/692ea55789d2e3506f170bb5/display');
            if (!response.ok) throw new Error('Failed to fetch section data');
            const data = await response.json();
            setSectionData(data);
            setLoading(false);
            setError(null);
        } catch (err) {
            console.error('Error fetching section data:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSectionData();

        // Update time every second
        const timeTimer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        // Refresh data every 5 seconds for real-time updates
        const dataTimer = setInterval(() => {
            fetchSectionData();
        }, 5000);

        return () => {
            clearInterval(timeTimer);
            clearInterval(dataTimer);
        };
    }, []);

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const getSignalColor = (aspect) => {
        switch (aspect?.toUpperCase()) {
            case 'GREEN': return '#10b981';
            case 'RED': return '#ef4444';
            case 'YELLOW': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const getTrainColor = (status) => {
        return status === 'RUNNING'
            ? 'from-green-500 to-emerald-600'
            : 'from-red-500 to-red-700';
    };

    // Calculate train position on track
    const calculateTrainPosition = (train, tracks) => {
        if (!train.blockId || !tracks) return null;

        let trackIndex = -1;
        let blockIndex = -1;
        let block = null;

        tracks.forEach((track, tIdx) => {
            const foundBlock = track.blocks.find((b, bIdx) => {
                if (b.id === train.blockId) {
                    blockIndex = bIdx;
                    return true;
                }
                return false;
            });
            if (foundBlock) {
                trackIndex = tIdx;
                block = foundBlock;
            }
        });

        if (trackIndex === -1 || !block) return null;

        const blockPosition = blockIndex / 20;
        const offsetWithinBlock = (train.offset_m || 0) / (block.length_m || 2000);
        const position = (blockPosition + offsetWithinBlock / 20) * 100;

        return { trackIndex, position, block };
    };

    // Loading state
    if (loading) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <div className="text-gray-300 font-semibold">Loading Section Data...</div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <div className="text-red-400 font-semibold mb-2">Error Loading Data</div>
                    <div className="text-red-300 text-sm">{error}</div>
                </div>
            </div>
        );
    }

    if (!sectionData) return null;

    const { section, tracks, trains, stations } = sectionData;

    // Filter main tracks and loop tracks
    const mainTracks = tracks.filter(t => !t.isLoop);
    const loopTracks = tracks.filter(t => t.isLoop);

    // Calculate total signals
    const totalSignals = tracks.reduce((acc, track) => {
        return acc + track.blocks.filter(b => b.signal).length;
    }, 0);

    const greenSignals = tracks.reduce((acc, track) => {
        return acc + track.blocks.filter(b => b.signal?.aspect === 'GREEN').length;
    }, 0);

    const yellowSignals = tracks.reduce((acc, track) => {
        return acc + track.blocks.filter(b => b.signal?.aspect === 'YELLOW').length;
    }, 0);

    const redSignals = tracks.reduce((acc, track) => {
        return acc + track.blocks.filter(b => b.signal?.aspect === 'RED').length;
    }, 0);

    const runningTrains = trains.filter(t => t.status === 'RUNNING').length;

    // Calculate SVG width based on number of blocks (ensure minimum width for scrolling)
    const maxBlocks = Math.max(...tracks.map(t => t.blocks.length));
    const svgWidth = Math.max(1000, maxBlocks * 50 + 100);
    const svgHeight = 100 + mainTracks.length * 100 + loopTracks.length * 20;

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : 'card h-full'} flex flex-col gap-4`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                        <Train size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">{section?.name || 'Track Control System'}</h2>
                        <p className="text-xs text-gray-400">{section?.code || 'SECTION-001'} • Real-time Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full live-pulse"></div>
                        <span className="text-xs text-green-300 font-medium">LIVE</span>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="text-xs text-gray-400">System Time</div>
                        <div className="text-sm font-bold text-white">
                            {currentTime.toLocaleTimeString()}
                        </div>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* Track Display - Scrollable */}
                <div className="flex-1 relative bg-black/30 rounded-lg overflow-hidden border border-gray-700/50">
                    {/* Scrollable Container */}
                    <div className="absolute inset-0 overflow-auto">
                        <div style={{ minWidth: `${svgWidth}px`, minHeight: `${svgHeight}px`, position: 'relative' }}>
                            {/* SVG Track Visualization */}
                            <svg
                                className="absolute top-0 left-0"
                                width={svgWidth}
                                height={svgHeight}
                                style={{ display: 'block' }}
                            >
                                <defs>
                                    <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#475569" stopOpacity="0.7" />
                                        <stop offset="50%" stopColor="#334155" stopOpacity="1" />
                                        <stop offset="100%" stopColor="#475569" stopOpacity="0.7" />
                                    </linearGradient>

                                    <filter id="signalGlow">
                                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Render Stations at Top */}
                                {stations.map((station, idx) => {
                                    const stationX = 150 + idx * 160;
                                    const stationY = 40;
                                    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#EA7317'];
                                    const color = colors[idx % colors.length];

                                    return (
                                        <g key={station._id}>
                                            <rect
                                                x={stationX - 30}
                                                y={stationY - 15}
                                                width="60"
                                                height="28"
                                                fill={color}
                                                fillOpacity="0.2"
                                                stroke={color}
                                                strokeWidth="2"
                                                rx="6"
                                            />
                                            <text
                                                x={stationX}
                                                y={stationY + 4}
                                                textAnchor="middle"
                                                fill={color}
                                                fontSize="12"
                                                fontWeight="700"
                                            >
                                                {station.station_code}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Render Main Tracks */}
                                {mainTracks.map((track, trackIdx) => {
                                    const yPosition = 100 + trackIdx * 100;
                                    const trackLength = track.blocks.length;
                                    const blockWidth = 45;

                                    return (
                                        <g key={track.id}>
                                            {/* Track Name Label */}
                                            <text
                                                x="30"
                                                y={yPosition - 25}
                                                fill="#FEF6E4"
                                                fontSize="14"
                                                fontWeight="700"
                                            >
                                                {track.name} ({track.direction})
                                            </text>

                                            {/* Track shadow */}
                                            <line
                                                x1="50"
                                                y1={yPosition + 2}
                                                x2={50 + trackLength * blockWidth}
                                                y2={yPosition + 2}
                                                stroke="#1e293b"
                                                strokeWidth="7"
                                                opacity="0.4"
                                            />

                                            {/* Main track */}
                                            <line
                                                x1="50"
                                                y1={yPosition}
                                                x2={50 + trackLength * blockWidth}
                                                y2={yPosition}
                                                stroke="url(#trackGradient)"
                                                strokeWidth="6"
                                            />

                                            {/* Track highlight */}
                                            <line
                                                x1="50"
                                                y1={yPosition - 1}
                                                x2={50 + trackLength * blockWidth}
                                                y2={yPosition - 1}
                                                stroke="#64748b"
                                                strokeWidth="1"
                                                opacity="0.6"
                                            />

                                            {/* Railway sleepers */}
                                            {track.blocks.map((_, i) => (
                                                <rect
                                                    key={i}
                                                    x={60 + i * blockWidth}
                                                    y={yPosition - 10}
                                                    width="4"
                                                    height="20"
                                                    fill="#64748b"
                                                    opacity="0.4"
                                                    rx="1"
                                                />
                                            ))}

                                            {/* Render Blocks and Signals */}
                                            {track.blocks.map((block, blockIdx) => {
                                                const blockX = 50 + blockIdx * blockWidth;
                                                const isSelected = selectedBlock?.id === block.id;

                                                return (
                                                    <g key={block.id}>
                                                        {/* Block boundary marker */}
                                                        <line
                                                            x1={blockX}
                                                            y1={yPosition - 18}
                                                            x2={blockX}
                                                            y2={yPosition + 18}
                                                            stroke="#64748b"
                                                            strokeWidth="1.5"
                                                            strokeDasharray="4,4"
                                                            opacity="0.5"
                                                        />

                                                        {/* Block ID label */}
                                                        <text
                                                            x={blockX + blockWidth / 2}
                                                            y={yPosition + 35}
                                                            textAnchor="middle"
                                                            fill="#94a3b8"
                                                            fontSize="9"
                                                            fontWeight="600"
                                                        >
                                                            {block.block_id}
                                                        </text>

                                                        {/* Block selection highlight */}
                                                        {isSelected && (
                                                            <rect
                                                                x={blockX}
                                                                y={yPosition - 20}
                                                                width={blockWidth}
                                                                height="40"
                                                                fill="#EA7317"
                                                                opacity="0.2"
                                                                stroke="#EA7317"
                                                                strokeWidth="2"
                                                                rx="4"
                                                                className="cursor-pointer"
                                                                onClick={() => setSelectedBlock(null)}
                                                            />
                                                        )}

                                                        {/* Signal at block end */}
                                                        {block.signal && (
                                                            <g>
                                                                {/* Signal glow */}
                                                                <circle
                                                                    cx={blockX + blockWidth}
                                                                    cy={yPosition - 30}
                                                                    r="12"
                                                                    fill={getSignalColor(block.signal.aspect)}
                                                                    filter="url(#signalGlow)"
                                                                    opacity="0.3"
                                                                />
                                                                {/* Signal light */}
                                                                <circle
                                                                    cx={blockX + blockWidth}
                                                                    cy={yPosition - 30}
                                                                    r="7"
                                                                    fill={getSignalColor(block.signal.aspect)}
                                                                    stroke="#FEF6E4"
                                                                    strokeWidth="2"
                                                                    opacity="0.95"
                                                                    className="cursor-pointer"
                                                                    onClick={() => setSelectedBlock(block)}
                                                                />
                                                                {/* Signal pole */}
                                                                <rect
                                                                    x={blockX + blockWidth - 1.5}
                                                                    y={yPosition - 23}
                                                                    width="3"
                                                                    height="15"
                                                                    fill="#475569"
                                                                    rx="1.5"
                                                                />
                                                            </g>
                                                        )}

                                                        {/* Show loop connections */}
                                                        {block.nextBlocks && block.nextBlocks.length > 1 && (
                                                            <g>
                                                                <circle
                                                                    cx={blockX + blockWidth}
                                                                    cy={yPosition}
                                                                    r="10"
                                                                    fill="#3b82f6"
                                                                    fillOpacity="0.3"
                                                                    stroke="#3b82f6"
                                                                    strokeWidth="2.5"
                                                                />
                                                                <text
                                                                    x={blockX + blockWidth}
                                                                    y={yPosition + 4}
                                                                    textAnchor="middle"
                                                                    fill="#FEF6E4"
                                                                    fontSize="9"
                                                                    fontWeight="700"
                                                                >
                                                                    SW
                                                                </text>
                                                            </g>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })}

                                {/* Render Loop Tracks */}
                                {loopTracks.map((loopTrack, loopIdx) => {
                                    const parentTrackIdx = mainTracks.findIndex(t => t.id === loopTrack.parentTrack);
                                    if (parentTrackIdx === -1) return null;

                                    const parentY = 100 + parentTrackIdx * 100;
                                    const loopY = parentY + 50 + loopIdx * 20;

                                    const startBlock = loopTrack.blocks[0];
                                    const endBlock = loopTrack.blocks[loopTrack.blocks.length - 1];
                                    const blockWidth = 45;
                                    const startX = 50 + (startBlock.index - 1) * blockWidth;
                                    const endX = 50 + endBlock.index * blockWidth;

                                    return (
                                        <g key={loopTrack.id}>
                                            <path
                                                d={`M ${startX} ${parentY} Q ${startX + 25} ${loopY - 15} ${startX + 50} ${loopY} L ${endX - 50} ${loopY} Q ${endX - 25} ${loopY - 15} ${endX} ${parentY}`}
                                                stroke="#3b82f6"
                                                strokeWidth="5"
                                                fill="none"
                                                opacity="0.7"
                                            />

                                            <text
                                                x={(startX + endX) / 2}
                                                y={loopY - 8}
                                                textAnchor="middle"
                                                fill="#3b82f6"
                                                fontSize="10"
                                                fontWeight="700"
                                            >
                                                {loopTrack.name}
                                            </text>

                                            {loopTrack.blocks.map((block) => {
                                                if (!block.signal) return null;
                                                const blockX = 50 + (block.index - 0.5) * blockWidth;

                                                return (
                                                    <g key={block.id}>
                                                        <circle
                                                            cx={blockX}
                                                            cy={loopY}
                                                            r="6"
                                                            fill={getSignalColor(block.signal.aspect)}
                                                            stroke="#FEF6E4"
                                                            strokeWidth="1.5"
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Animated Train Markers */}
                            {trains.map((train) => {
                                const trainPos = calculateTrainPosition(train, tracks);
                                if (!trainPos) return null;

                                const trackY = 85 + trainPos.trackIndex * 100;
                                const blockWidth = 45;

                                return (
                                    <div
                                        key={train.id}
                                        className="absolute transition-all duration-1000 ease-linear"
                                        style={{
                                            left: `${50 + (trainPos.position / 100) * (tracks[trainPos.trackIndex].blocks.length * blockWidth)}px`,
                                            top: `${trackY}px`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <div className="relative group">
                                            <div className={`absolute inset-0 bg-gradient-to-r ${getTrainColor(train.status)} blur-lg opacity-60 rounded-xl`} />
                                            <div className={`relative w-12 h-8 rounded-xl bg-gradient-to-r ${getTrainColor(train.status)} border-2 ${train.status === 'RUNNING' ? 'border-green-300' : 'border-red-300'} flex items-center justify-center shadow-lg transform group-hover:scale-125 transition-transform`}>
                                                <Train className="w-6 h-6 text-white" />
                                            </div>

                                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                <div className="bg-gray-800/95 backdrop-blur-sm border-2 border-blue-500 rounded-lg p-3 shadow-xl min-w-[160px]">
                                                    <div className="text-white text-sm font-bold mb-1">{train.name}</div>
                                                    <div className="text-gray-300 text-xs">#{train.number}</div>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <Gauge className="w-4 h-4 text-green-400" />
                                                        <span className="text-green-400 text-sm font-semibold">{train.speed_kmph.toFixed(0)} km/h</span>
                                                    </div>
                                                    {train.delay_min > 0 && (
                                                        <div className="text-red-400 text-xs mt-1">Delay: {train.delay_min}min</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Status Panel - Fixed on Right */}
                {/* <div className="w-72 flex flex-col gap-3 overflow-y-auto">

                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg p-4">
                        <div className="flex items-center gap-2 text-green-400 mb-3">
                            <div className="w-3 h-3 rounded-full bg-green-500 live-pulse" />
                            <span className="text-sm font-bold">SYSTEM ACTIVE</span>
                        </div>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-300 font-medium">Active Trains</span>
                                <span className="bg-green-500/20 text-green-300 border border-green-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {runningTrains}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-300 font-medium">Total Trains</span>
                                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {trains.length}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-gray-300 font-medium">Total Signals</span>
                                <span className="bg-gray-500/20 text-gray-300 border border-gray-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {totalSignals}
                                </span>
                            </div>
                            <div className="h-px bg-gray-700 my-2" />
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full signal-green" />
                                    <span className="text-sm text-gray-300 font-medium">Clear</span>
                                </div>
                                <span className="bg-green-500/20 text-green-300 border border-green-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {greenSignals}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full signal-yellow" />
                                    <span className="text-sm text-gray-300 font-medium">Caution</span>
                                </div>
                                <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {yellowSignals}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full signal-red" />
                                    <span className="text-sm text-gray-300 font-medium">Stop</span>
                                </div>
                                <span className="bg-red-500/20 text-red-300 border border-red-500/40 rounded px-3 py-1 text-xs font-bold">
                                    {redSignals}
                                </span>
                            </div>
                        </div>
                    </div>

  
                    <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-lg p-4">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Train className="w-4 h-4 text-blue-400" />
                            Active Trains
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {trains.map((train) => (
                                <div key={train.id} className="p-2 bg-black/30 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-white">{train.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${train.status === 'RUNNING' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                            {train.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400">#{train.number}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Gauge className="w-3 h-3 text-gray-500" />
                                        <span className="text-xs text-gray-300">{train.speed_kmph.toFixed(0)} km/h</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

      
                    {selectedBlock && (
                        <div className="bg-orange-500/10 backdrop-blur-md border border-orange-500/40 rounded-lg shadow-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-orange-300">Selected Block</h3>
                                <button
                                    onClick={() => setSelectedBlock(null)}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="text-white font-bold text-lg mb-1">{selectedBlock.block_id}</div>
                            {selectedBlock.signal && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: getSignalColor(selectedBlock.signal.aspect) }}
                                    />
                                    <span className="text-xs text-gray-300">
                                        Signal: {selectedBlock.signal.aspect}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div> */}
            </div>
        </div>
    );
}
