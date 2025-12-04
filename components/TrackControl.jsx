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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/section/692ea55789d2e3506f170bb5/display`);
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

    const getBlockColor = (blockIdx) => {
        const colors = ['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#06b6d4', '#8b5cf6'];
        return colors[blockIdx % colors.length];
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

        const blockPosition = blockIndex / tracks[trackIndex].blocks.length;
        const offsetWithinBlock = (train.offset_m || 0) / (block.length_m || 2000);
        const position = (blockPosition + offsetWithinBlock / tracks[trackIndex].blocks.length) * 100;

        return { trackIndex, position, block, blockIndex };
    };

    // Loading state
    if (loading) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--brand-orange)' }} />
                    <div className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Loading Section Data...</div>
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

    // Calculate stats
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

    // Calculate SVG dimensions
    const maxBlocks = Math.max(...mainTracks.map(t => t.blocks.length), 1);
    const svgWidth = Math.max(1200, maxBlocks * 70);
    const svgHeight = mainTracks.length * 120 + 100;

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50 p-6' : 'card h-full'} flex flex-col`}
            style={{ background: isFullscreen ? '#000000' : undefined }}>

            {/* Main Signaling Diagram - Full Space */}
            <div className="flex-1 rounded-lg overflow-hidden relative" style={{ background: '#000000', border: '1px solid #333' }}>
                {/* Fullscreen Toggle Overlay */}
                <button
                    onClick={toggleFullscreen}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg transition-colors"
                    style={{
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                        backdropFilter: 'blur(8px)'
                    }}
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <div className="h-full overflow-auto p-8">
                    <svg width={svgWidth} height={svgHeight} className="mx-auto">
                        <defs>
                            {/* Signal glow filter */}
                            <filter id="signalGlow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Render each main track */}
                        {mainTracks.map((track, trackIdx) => {
                            const yPosition = 60 + trackIdx * 120;
                            const blockWidth = 70;

                            return (
                                <g key={track.id}>
                                    {/* Track name label */}
                                    <text
                                        x="10"
                                        y={yPosition + 5}
                                        fill="#ffffff"
                                        fontSize="12"
                                        fontWeight="600"
                                        fontFamily="monospace"
                                    >
                                        {track.name}
                                    </text>

                                    {/* Draw blocks with colored sections */}
                                    {track.blocks.map((block, blockIdx) => {
                                        const blockX = 120 + blockIdx * blockWidth;
                                        const nextBlockX = blockX + blockWidth;

                                        return (
                                            <g key={block.id}>
                                                {/* Colored block section */}
                                                <line
                                                    x1={blockX}
                                                    y1={yPosition}
                                                    x2={nextBlockX}
                                                    y2={yPosition}
                                                    stroke={getBlockColor(blockIdx)}
                                                    strokeWidth="6"
                                                    strokeLinecap="round"
                                                    opacity="0.9"
                                                />

                                                {/* White baseline */}
                                                <line
                                                    x1={blockX}
                                                    y1={yPosition}
                                                    x2={nextBlockX}
                                                    y2={yPosition}
                                                    stroke="#ffffff"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                />

                                                {/* Block boundary marker with circle */}
                                                <g>
                                                    {/* Vertical tick */}
                                                    <line
                                                        x1={blockX}
                                                        y1={yPosition - 8}
                                                        x2={blockX}
                                                        y2={yPosition + 8}
                                                        stroke="#ffffff"
                                                        strokeWidth="2"
                                                    />

                                                    {/* Circle marker */}
                                                    <circle
                                                        cx={blockX}
                                                        cy={yPosition}
                                                        r="4"
                                                        fill="#000000"
                                                        stroke="#ffffff"
                                                        strokeWidth="2"
                                                    />
                                                </g>

                                                {/* Block ID label */}
                                                <text
                                                    x={blockX + blockWidth / 2}
                                                    y={yPosition - 15}
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize="10"
                                                    fontWeight="500"
                                                    fontFamily="monospace"
                                                >
                                                    {block.block_id}
                                                </text>

                                                {/* Signal indicator */}
                                                {block.signal && (
                                                    <g>
                                                        {/* Signal diamond shape */}
                                                        <rect
                                                            x={blockX - 5}
                                                            y={yPosition - 5}
                                                            width="10"
                                                            height="10"
                                                            fill={getSignalColor(block.signal.aspect)}
                                                            stroke="#ffffff"
                                                            strokeWidth="1.5"
                                                            transform={`rotate(45 ${blockX} ${yPosition})`}
                                                            filter="url(#signalGlow)"
                                                            className="cursor-pointer"
                                                            onClick={() => setSelectedBlock(selectedBlock?.id === block.id ? null : block)}
                                                        />

                                                        {/* Signal aspect label */}
                                                        <text
                                                            x={blockX}
                                                            y={yPosition + 25}
                                                            textAnchor="middle"
                                                            fill={getSignalColor(block.signal.aspect)}
                                                            fontSize="8"
                                                            fontWeight="600"
                                                        >
                                                            {block.signal.aspect.charAt(0)}
                                                        </text>
                                                    </g>
                                                )}

                                                {/* Switch indicator (if multiple next blocks) */}
                                                {block.nextBlocks && block.nextBlocks.length > 1 && (
                                                    <g>
                                                        <circle
                                                            cx={nextBlockX}
                                                            cy={yPosition}
                                                            r="6"
                                                            fill="#3b82f6"
                                                            stroke="#ffffff"
                                                            strokeWidth="2"
                                                        />
                                                        <text
                                                            x={nextBlockX}
                                                            y={yPosition + 3}
                                                            textAnchor="middle"
                                                            fill="#ffffff"
                                                            fontSize="7"
                                                            fontWeight="700"
                                                        >
                                                            P
                                                        </text>
                                                    </g>
                                                )}
                                            </g>
                                        );
                                    })}

                                    {/* End marker for track */}
                                    <g>
                                        <line
                                            x1={120 + track.blocks.length * blockWidth}
                                            y1={yPosition - 8}
                                            x2={120 + track.blocks.length * blockWidth}
                                            y2={yPosition + 8}
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                        <circle
                                            cx={120 + track.blocks.length * blockWidth}
                                            cy={yPosition}
                                            r="4"
                                            fill="#000000"
                                            stroke="#ffffff"
                                            strokeWidth="2"
                                        />
                                    </g>
                                </g>
                            );
                        })}

                        {/* Render loop tracks as diagonal connections */}
                        {loopTracks.map((loopTrack) => {
                            const parentTrackIdx = mainTracks.findIndex(t => t.id === loopTrack.parentTrack);
                            if (parentTrackIdx === -1) return null;

                            const parentY = 60 + parentTrackIdx * 120;
                            const startBlock = loopTrack.blocks[0];
                            const endBlock = loopTrack.blocks[loopTrack.blocks.length - 1];
                            const blockWidth = 70;
                            const startX = 120 + (startBlock.index - 1) * blockWidth;
                            const endX = 120 + endBlock.index * blockWidth;

                            // Draw loop as diagonal line below main track
                            const loopY = parentY + 40;

                            return (
                                <g key={loopTrack.id}>
                                    {/* Loop path */}
                                    <path
                                        d={`M ${startX} ${parentY} L ${startX + 20} ${loopY} L ${endX - 20} ${loopY} L ${endX} ${parentY}`}
                                        stroke="#3b82f6"
                                        strokeWidth="4"
                                        fill="none"
                                        opacity="0.8"
                                    />

                                    {/* Loop track name */}
                                    <text
                                        x={(startX + endX) / 2}
                                        y={loopY + 5}
                                        textAnchor="middle"
                                        fill="#3b82f6"
                                        fontSize="10"
                                        fontWeight="600"
                                    >
                                        {loopTrack.name}
                                    </text>

                                    {/* Loop signals */}
                                    {loopTrack.blocks.filter(b => b.signal).map((block) => {
                                        const blockX = 120 + (block.index - 0.5) * blockWidth;

                                        return (
                                            <circle
                                                key={block.id}
                                                cx={blockX}
                                                cy={loopY}
                                                r="4"
                                                fill={getSignalColor(block.signal.aspect)}
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                                filter="url(#signalGlow)"
                                            />
                                        );
                                    })}
                                </g>
                            );
                        })}

                        {/* Station markers */}
                        {stations.map((station, idx) => {
                            const stationX = 150 + idx * 200;
                            const stationY = 30;

                            return (
                                <g key={station._id}>
                                    {/* Station marker box */}
                                    <rect
                                        x={stationX - 25}
                                        y={stationY - 12}
                                        width="50"
                                        height="24"
                                        fill="#000000"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        rx="3"
                                    />

                                    {/* Station code */}
                                    <text
                                        x={stationX}
                                        y={stationY + 5}
                                        textAnchor="middle"
                                        fill="#ffffff"
                                        fontSize="11"
                                        fontWeight="700"
                                        fontFamily="monospace"
                                    >
                                        {station.station_code}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Animated train positions */}
                        {trains.map((train) => {
                            const trainPos = calculateTrainPosition(train, mainTracks);
                            if (!trainPos) return null;

                            const yPosition = 60 + trainPos.trackIndex * 120;
                            const blockWidth = 70;
                            const trainX = 120 + (trainPos.position / 100) * (mainTracks[trainPos.trackIndex].blocks.length * blockWidth);

                            return (
                                <g key={train.id} className="transition-all duration-1000">
                                    {/* Train marker - filled circle */}
                                    <circle
                                        cx={trainX}
                                        cy={yPosition}
                                        r="7"
                                        fill={train.status === 'RUNNING' ? '#10b981' : '#ef4444'}
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        className="cursor-pointer"
                                    >
                                        <title>{`${train.name} (${train.number}) - ${train.speed_kmph.toFixed(0)} km/h`}</title>
                                    </circle>

                                    {/* Train number label */}
                                    <text
                                        x={trainX}
                                        y={yPosition + 20}
                                        textAnchor="middle"
                                        fill={train.status === 'RUNNING' ? '#10b981' : '#ef4444'}
                                        fontSize="9"
                                        fontWeight="700"
                                    >
                                        {train.number}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Status Bar */}
            <div className="grid grid-cols-5 gap-2">
                <div className="glass-dark rounded-lg p-2">
                    <div className="flex items-center justify-between">
                        <div className="font-medium" style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}>Active Trains</div>
                        <div className="text-lg font-bold text-green-400">{runningTrains}</div>
                    </div>
                </div>

                <div className="glass-dark rounded-lg p-2">
                    <div className="flex items-center justify-between">
                        <div className="font-medium" style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}>Total Trains</div>
                        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{trains.length}</div>
                    </div>
                </div>

                <div className="glass-dark rounded-lg p-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full signal-green" />
                            <div className="font-medium" style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}>Clear</div>
                        </div>
                        <div className="text-lg font-bold text-green-400">{greenSignals}</div>
                    </div>
                </div>

                <div className="glass-dark rounded-lg p-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full signal-yellow" />
                            <div className="font-medium" style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}>Caution</div>
                        </div>
                        <div className="text-lg font-bold text-yellow-400">{yellowSignals}</div>
                    </div>
                </div>

                <div className="glass-dark rounded-lg p-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full signal-red" />
                            <div className="font-medium" style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}>Stop</div>
                        </div>
                        <div className="text-lg font-bold text-red-400">{redSignals}</div>
                    </div>
                </div>
            </div>

            {/* Selected Block Info */}
            {selectedBlock && (
                <div
                    className="rounded-lg p-4 animate-slide-in"
                    style={{
                        background: 'rgba(234, 115, 23, 0.1)',
                        border: '1px solid var(--brand-orange)'
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold" style={{ color: 'var(--brand-orange)' }}>Selected Block</h3>
                        <button
                            onClick={() => setSelectedBlock(null)}
                            className="text-xs hover:underline"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                        {selectedBlock.block_id}
                    </div>
                    {selectedBlock.signal && (
                        <div className="flex items-center gap-2 mt-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: getSignalColor(selectedBlock.signal.aspect) }}
                            />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Signal: {selectedBlock.signal.aspect}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
