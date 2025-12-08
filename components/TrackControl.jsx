import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Train, AlertCircle, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import {
    selectStationNodes,
    selectStationEdges,
    selectStationLoading,
    selectHasData,
    selectStationName,
    selectStationId
} from '@/store/slices/stationSlice';

export default function TrackControl() {
    const hasData = useSelector(selectHasData);
    const stationName = useSelector(selectStationName);
    const stationId = useSelector(selectStationId);
    const nodes = useSelector(selectStationNodes);
    const dbEdges = useSelector(selectStationEdges);
    const stationLoading = useSelector(selectStationLoading);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    // Track colors matching Indian Railway conventions
    const trackColors = {
        down_main: '#FF4136',      // DOWN - Red
        up_main: '#2ECC40',        // UP - Green  
        both_main: '#FFDC00',      // Both direction - Yellow
        down_loop: '#0074D9',      // Down loop - Blue
        up_loop: '#B10DC9',        // Up loop - Purple
        yard: '#FF851B',           // Yard - Orange
        crossing: '#888888',       // Crossover - Gray
    };

    // Edge color mapping from database
    const edgeColorMap = {
        'red': '#FF4136',
        'green': '#2ECC40',
        'blue': '#0074D9',
        'yellow': '#FFDC00',
        'purple': '#B10DC9',
        'orange': '#FF851B',
        'black': '#333333',
    };

    // Get track color from edge data
    const getEdgeColor = (edge) => {
        if (edge.edgeColor && edgeColorMap[edge.edgeColor]) {
            return edgeColorMap[edge.edgeColor];
        }
        // Fallback based on stream
        if (edge.stream?.includes('upstream')) return '#2ECC40';
        if (edge.stream?.includes('downstream')) return '#FF4136';
        if (edge.stream?.includes('bidirectional')) return '#FFDC00';
        if (edge.stream?.includes('loop')) return '#B10DC9';
        if (edge.stream?.includes('yard')) return '#FF851B';
        return '#666666';
    };

    // Get track color for node line
    const getTrackColor = (line) => trackColors[line] || '#666666';

    // Get signal color with glow effect
    const getSignalColor = (signalColor) => {
        switch (signalColor?.toLowerCase()) {
            case 'green': return '#00FF00';
            case 'red': return '#FF0000';
            case 'yellow': return '#FFFF00';
            case 'double_yellow': return '#FFD700';
            default: return '#888888';
        }
    };

    // Get node shape based on type
    const getNodeShape = (nodeType) => {
        switch (nodeType) {
            case 'stationStart':
            case 'stationEnd':
                return 'station';
            case 'loopStart':
            case 'loopEnd':
                return 'switch';
            case 'loopCorner':
                return 'corner';
            case 'turningPoint':
                return 'diamond';
            case 'yard':
                return 'square';
            default:
                return 'circle';
        }
    };

    // Create node map for quick lookup
    const nodeMap = useMemo(() => {
        if (!nodes || nodes.length === 0) return new Map();
        return new Map(nodes.map(n => [n.nodeId, n]));
    }, [nodes]);

    // Process edges from database - map startNode/endNode to actual node objects
    const edges = useMemo(() => {
        if (!dbEdges || dbEdges.length === 0 || nodeMap.size === 0) return [];

        return dbEdges.map(edge => {
            const sourceNode = nodeMap.get(edge.startNode);
            const targetNode = nodeMap.get(edge.endNode);

            if (!sourceNode || !targetNode) {
                console.warn(`Edge ${edge.edgeId}: Missing node - start: ${edge.startNode}, end: ${edge.endNode}`);
                return null;
            }

            return {
                id: edge.edgeId || edge._id,
                source: sourceNode,
                target: targetNode,
                stream: edge.stream,
                edgeColor: edge.edgeColor,
                edgeType: edge.edgeType,
                direction: edge.direction,
                edgeLength: edge.edgeLength,
                speedLimit: edge.speed_limit,
                status: edge.status,
                color: getEdgeColor(edge)
            };
        }).filter(Boolean);
    }, [dbEdges, nodeMap]);

    // Calculate bounds for SVG viewport
    const bounds = useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return { minX: 0, maxX: 1000, minY: 0, maxY: 500 };
        }

        const xValues = nodes.map(n => n.x);
        const yValues = nodes.map(n => n.y);

        return {
            minX: Math.min(...xValues) - 200,
            maxX: Math.max(...xValues) + 200,
            minY: Math.min(...yValues) - 150,
            maxY: Math.max(...yValues) + 150
        };
    }, [nodes]);

    const svgWidth = bounds.maxX - bounds.minX;
    const svgHeight = bounds.maxY - bounds.minY;

    // Calculate stats
    const nodeStats = useMemo(() => {
        if (!nodes) return {};

        const stats = {};
        nodes.forEach(node => {
            stats[node.nodeType] = (stats[node.nodeType] || 0) + 1;
        });
        return stats;
    }, [nodes]);

    // Handle pan
    const handleMouseDown = (e) => {
        if (e.button === 0) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning) {
            setPanOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 3));
    };

    // Render dual rails with sleepers
    const renderTrack = (edge) => {
        const { source, target } = edge;
        // Use the color from database edge, fallback to gray
        const trackColor = edge.color || '#666666';
        const railGap = 8;
        const sleeperSpacing = 25;

        // Calculate track direction
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / length;
        const uy = dy / length;

        // Perpendicular direction
        const px = -uy;
        const py = ux;

        // Rail positions
        const rail1Start = { x: source.x + px * railGap / 2, y: source.y + py * railGap / 2 };
        const rail1End = { x: target.x + px * railGap / 2, y: target.y + py * railGap / 2 };
        const rail2Start = { x: source.x - px * railGap / 2, y: source.y - py * railGap / 2 };
        const rail2End = { x: target.x - px * railGap / 2, y: target.y - py * railGap / 2 };

        
        // Calculate sleepers
        const sleepers = [];
        const numSleepers = Math.floor(length / sleeperSpacing);
        for (let i = 1; i < numSleepers; i++) {
            const t = i / numSleepers;
            const cx = source.x + dx * t;
            const cy = source.y + dy * t;
            sleepers.push({
                x1: cx + px * (railGap + 4),
                y1: cy + py * (railGap + 4),
                x2: cx - px * (railGap + 4),
                y2: cy - py * (railGap + 4)
            });
        }

        return (
            <g key={edge.id}>
                {/* Track bed (gravel) */}
                <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#3a3a3a"
                    strokeWidth="20"
                    strokeLinecap="round"
                    opacity="0.5"
                />

                {/* Sleepers */}
                {sleepers.map((sleeper, idx) => (
                    <line
                        key={`sleeper-${edge.id}-${idx}`}
                        x1={sleeper.x1}
                        y1={sleeper.y1}
                        x2={sleeper.x2}
                        y2={sleeper.y2}
                        stroke="#4a3728"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                ))}

                {/* Left rail */}
                <line
                    x1={rail1Start.x}
                    y1={rail1Start.y}
                    x2={rail1End.x}
                    y2={rail1End.y}
                    stroke={trackColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Right rail */}
                <line
                    x1={rail2Start.x}
                    y1={rail2Start.y}
                    x2={rail2End.x}
                    y2={rail2End.y}
                    stroke={trackColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Rail shine effect */}
                <line
                    x1={rail1Start.x}
                    y1={rail1Start.y}
                    x2={rail1End.x}
                    y2={rail1End.y}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.3"
                />
                <line
                    x1={rail2Start.x}
                    y1={rail2Start.y}
                    x2={rail2End.x}
                    y2={rail2End.y}
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeLinecap="round"
                    opacity="0.3"
                />
            </g>
        );
    };

    // Render node with proper shape
    const renderNode = (node) => {
        const isSelected = selectedNode?.nodeId === node.nodeId;
        const signalColor = getSignalColor(node.signalColor);
        const shape = getNodeShape(node.nodeType);
        const size = isSelected ? 16 : 12;

        const getNodeElement = () => {
            switch (shape) {
                case 'station':
                    return (
                        <>
                            {/* Station building marker */}
                            <rect
                                x={node.x - size}
                                y={node.y - size / 2}
                                width={size * 2}
                                height={size}
                                rx="3"
                                fill="#1a1a2e"
                                stroke={signalColor}
                                strokeWidth="3"
                            />
                            {/* Platform indicator */}
                            <rect
                                x={node.x - size - 5}
                                y={node.y - size / 2 - 3}
                                width={size * 2 + 10}
                                height="3"
                                fill="#f0e68c"
                                rx="1"
                            />
                        </>
                    );
                case 'switch':
                    return (
                        <>
                            {/* Switch/Turnout indicator */}
                            <polygon
                                points={`${node.x},${node.y - size} ${node.x + size},${node.y + size / 2} ${node.x - size},${node.y + size / 2}`}
                                fill="#1a1a2e"
                                stroke={signalColor}
                                strokeWidth="2"
                            />
                        </>
                    );
                case 'diamond':
                    return (
                        <>
                            <rect
                                x={node.x - size / 1.4}
                                y={node.y - size / 1.4}
                                width={size * 1.4}
                                height={size * 1.4}
                                transform={`rotate(45, ${node.x}, ${node.y})`}
                                fill="#1a1a2e"
                                stroke={signalColor}
                                strokeWidth="2"
                            />
                        </>
                    );
                case 'corner':
                    return (
                        <>
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={size * 0.7}
                                fill="#1a1a2e"
                                stroke={signalColor}
                                strokeWidth="2"
                            />
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={size * 0.4}
                                fill={signalColor}
                                opacity="0.6"
                            />
                        </>
                    );
                case 'square':
                    return (
                        <>
                            <rect
                                x={node.x - size}
                                y={node.y - size}
                                width={size * 2}
                                height={size * 2}
                                rx="2"
                                fill="#1a1a2e"
                                stroke="#FF851B"
                                strokeWidth="2"
                            />
                            <text
                                x={node.x}
                                y={node.y + 4}
                                textAnchor="middle"
                                fill="#FF851B"
                                fontSize="10"
                                fontWeight="bold"
                            >
                                Y
                            </text>
                        </>
                    );
                default:
                    return (
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={size}
                            fill="#1a1a2e"
                            stroke={signalColor}
                            strokeWidth="2"
                        />
                    );
            }
        };

        return (
            <g
                key={node.nodeId}
                className="cursor-pointer"
                onClick={() => setSelectedNode(isSelected ? null : node)}
                style={{ transition: 'all 0.2s ease' }}
            >
                {/* Signal glow effect */}
                <defs>
                    <filter id={`glow-${node.nodeId}`}>
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <radialGradient id={`signal-grad-${node.nodeId}`}>
                        <stop offset="0%" stopColor={signalColor} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={signalColor} stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Signal glow background */}
                <circle
                    cx={node.x}
                    cy={node.y}
                    r={size * 2}
                    fill={`url(#signal-grad-${node.nodeId})`}
                    opacity={isSelected ? 0.8 : 0.4}
                />

                {/* Main node shape */}
                {getNodeElement()}

                {/* Signal light */}
                <circle
                    cx={node.x}
                    cy={node.y - size - 15}
                    r="6"
                    fill={signalColor}
                    filter={`url(#glow-${node.nodeId})`}
                />
                <circle
                    cx={node.x}
                    cy={node.y - size - 15}
                    r="3"
                    fill="#ffffff"
                    opacity="0.8"
                />

                {/* Node ID label */}
                <text
                    x={node.x}
                    y={node.y + size + 18}
                    textAnchor="middle"
                    fill="#e0e0e0"
                    fontSize="11"
                    fontWeight="600"
                    fontFamily="'Courier New', monospace"
                    style={{ textShadow: '0 0 4px #000' }}
                >
                    {node.name || node.nodeId}
                </text>

                {/* Line type indicator */}
                <text
                    x={node.x}
                    y={node.y + size + 30}
                    textAnchor="middle"
                    fill={getTrackColor(node.line)}
                    fontSize="8"
                    fontWeight="500"
                    opacity="0.8"
                >
                    {node.line?.replace('_', ' ').toUpperCase() || ''}
                </text>
            </g>
        );
    };

    // Loading state
    if (stationLoading) {
        return (
            <div className="card h-full flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#00ff00' }} />
                    <div className="font-semibold text-green-400">Initializing Section Controller...</div>
                    <div className="text-xs text-gray-500 mt-2">Loading station topology</div>
                </div>
            </div>
        );
    }

    // No data state
    if (!hasData || !nodes || nodes.length === 0) {
        return (
            <div className="card h-full flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <div className="font-semibold mb-2 text-red-400">Section Offline</div>
                    <div className="text-sm text-gray-500">No station data available. Please login to connect.</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${isFullscreen ? 'fixed inset-0 z-50' : 'card h-full'} flex flex-col`}
            style={{
                background: isFullscreen ? '#000000' : 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
                border: isFullscreen ? 'none' : '1px solid #2a2a4a'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: '#2a2a4a' }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-bold text-lg uppercase tracking-wider" style={{ color: '#00ff00' }}>
                            {stationName}
                        </span>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a2e', color: '#888' }}>
                        ID: {stationId}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Zoom controls */}
                    <button
                        onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))}
                        className="p-1.5 rounded transition-colors hover:bg-white/10"
                        style={{ color: '#888' }}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.3))}
                        className="p-1.5 rounded transition-colors hover:bg-white/10"
                        style={{ color: '#888' }}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-2" />

                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded transition-colors hover:bg-white/10"
                        style={{ color: '#888' }}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main Track Diagram */}
            <div
                className="flex-1 overflow-hidden relative"
                style={{ background: '#0a0a0f', cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Grid background */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(40,40,60,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(40,40,60,0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />

                <svg
                    width="100%"
                    height="100%"
                    viewBox={`${bounds.minX} ${bounds.minY} ${svgWidth} ${svgHeight}`}
                    style={{
                        transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
                        transformOrigin: 'center center'
                    }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    <defs>
                        {/* Track gradient */}
                        <linearGradient id="trackShine" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>

                    {/* Render tracks (edges) */}
                    {edges.map(edge => renderTrack(edge))}

                    {/* Render nodes */}
                    {nodes.map(node => renderNode(node))}
                </svg>
            </div>

            {/* Status Bar */}
            <div className="grid grid-cols-7 gap-1 p-2 border-t" style={{ borderColor: '#2a2a4a', background: '#0a0a0f' }}>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] text-gray-500 uppercase">Nodes</div>
                    <div className="text-sm font-bold text-white">{nodes.length}</div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#2ECC40' }}>UP Main</div>
                    <div className="text-sm font-bold" style={{ color: '#2ECC40' }}>
                        {nodes.filter(n => n.line === 'up_main').length}
                    </div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#FF4136' }}>DN Main</div>
                    <div className="text-sm font-bold" style={{ color: '#FF4136' }}>
                        {nodes.filter(n => n.line === 'down_main').length}
                    </div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#FFDC00' }}>Both</div>
                    <div className="text-sm font-bold" style={{ color: '#FFDC00' }}>
                        {nodes.filter(n => n.line === 'both_main').length}
                    </div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#B10DC9' }}>Loops</div>
                    <div className="text-sm font-bold" style={{ color: '#B10DC9' }}>
                        {nodes.filter(n => n.line?.includes('loop')).length}
                    </div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#FF851B' }}>Yards</div>
                    <div className="text-sm font-bold" style={{ color: '#FF851B' }}>
                        {nodes.filter(n => n.line === 'yard').length}
                    </div>
                </div>

                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase text-green-500">Signals</div>
                    <div className="text-sm font-bold text-green-400">
                        {nodes.filter(n => n.signalColor === 'green').length}/{nodes.length}
                    </div>
                </div>
            </div>

            {/* Selected Node Info Panel */}
            {
                selectedNode && (
                    <div
                        className="absolute bottom-20 left-4 right-4 rounded-lg p-4"
                        style={{
                            background: 'rgba(10, 10, 15, 0.95)',
                            border: '1px solid #00ff00',
                            boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
                        }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold" style={{ color: '#00ff00' }}>
                                Node Details: {selectedNode.name || selectedNode.nodeId}
                            </h3>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="text-xs hover:underline text-gray-500"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Node ID</div>
                                <div className="font-mono text-sm text-white">{selectedNode.nodeId}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Type</div>
                                <div className="text-sm font-semibold" style={{ color: getTrackColor(selectedNode.line) }}>
                                    {selectedNode.nodeType?.replace(/([A-Z])/g, ' $1').trim()}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Line</div>
                                <div className="text-sm font-semibold" style={{ color: getTrackColor(selectedNode.line) }}>
                                    {selectedNode.line?.replace('_', ' ').toUpperCase() || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Position</div>
                                <div className="text-sm font-mono text-white">
                                    X:{selectedNode.x} Y:{selectedNode.y}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase">Signal</div>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{
                                            backgroundColor: getSignalColor(selectedNode.signalColor),
                                            boxShadow: `0 0 10px ${getSignalColor(selectedNode.signalColor)}`
                                        }}
                                    />
                                    <span className="text-sm text-white uppercase">{selectedNode.signalColor}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Legend */}
            <div
                className="flex items-center justify-center gap-4 py-2 text-[10px] border-t"
                style={{ borderColor: '#2a2a4a', background: '#0a0a0f' }}
            >
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#FF4136' }} />
                    <span className="text-gray-500">DOWN</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#2ECC40' }} />
                    <span className="text-gray-500">UP</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#FFDC00' }} />
                    <span className="text-gray-500">BOTH</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#0074D9' }} />
                    <span className="text-gray-500">DN LOOP</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#B10DC9' }} />
                    <span className="text-gray-500">UP LOOP</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#FF851B' }} />
                    <span className="text-gray-500">YARD</span>
                </div>
                <div className="w-px h-3 bg-gray-700" />
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-gray-500">GREEN</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-gray-500">RED</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-gray-500">YELLOW</span>
                </div>
            </div>
        </div >
    );
}
