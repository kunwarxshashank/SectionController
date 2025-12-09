import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Train, AlertCircle, Loader2, Maximize2, Minimize2, ZoomIn, ZoomOut, MapPin, Activity } from 'lucide-react';
import {
    selectStationNodes,
    selectStationEdges,
    selectStationLoading,
    selectHasData,
    selectSectionName,
    selectTracks,
    selectTrainData
} from '@/store/slices/stationSlice';

/**
 * TrackControl - Railway Section Visualization Component
 * 
 * Visualizes track layout based on data.json format:
 * - X axis: Distance in KM (0-52 km for BPL-BINA section)
 * - Y axis: Track position in meters (100-900m)
 *   - UP Main: y=600
 *   - MAIN (bidirectional): y=500
 *   - DOWN Main: y=400
 *   - UP Loops: y=700, 800, 900
 *   - DOWN Loops: y=300, 200, 100
 */
export default function TrackControl() {
    const hasData = useSelector(selectHasData);
    const sectionName = useSelector(selectSectionName);
    const nodes = useSelector(selectStationNodes);
    const edges = useSelector(selectStationEdges);
    const tracks = useSelector(selectTracks);
    const trainData = useSelector(selectTrainData);
    const stationLoading = useSelector(selectStationLoading);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [showTrains, setShowTrains] = useState(true);

    // Scale factors - X is in km (multiply to get display units), Y is in meters
    const SCALE_X = 20; // 1 km = 20 display units
    const SCALE_Y = 1;  // 1 meter = 1 display unit

    // Track colors matching Indian Railway conventions
    const trackColors = {
        UP: '#2ECC40',           // UP - Green
        DOWN: '#FF4136',         // DOWN - Red
        MAIN: '#FFDC00',         // Main (bidirectional) - Yellow
        UP_LOOP: '#B10DC9',      // UP loop - Purple
        DOWN_LOOP: '#0074D9',    // Down loop - Blue
        BOTH: '#FFDC00',         // Both direction - Yellow
    };

    // Edge type colors
    const edgeTypeColors = {
        block: '#8888aa',        // Normal block - Gray-blue
        automatic: '#00BFFF',    // Automatic signaling - Cyan
        loop: '#B10DC9',         // Loop line - Purple
        crossing: '#FF851B',     // Crossing/Turnout - Orange
    };

    // Get track color based on direction/line
    const getTrackColor = (line) => {
        if (!line) return '#666666';
        const upper = line.toUpperCase();
        if (upper.includes('UP') && upper.includes('LOOP')) return trackColors.UP_LOOP;
        if (upper.includes('DOWN') && upper.includes('LOOP')) return trackColors.DOWN_LOOP;
        if (upper === 'UP') return trackColors.UP;
        if (upper === 'DOWN') return trackColors.DOWN;
        if (upper === 'MAIN') return trackColors.MAIN;
        if (upper === 'BOTH') return trackColors.BOTH;
        return '#666666';
    };

    // Get edge color based on type and direction
    const getEdgeColor = (edge) => {
        // First check edge type
        if (edge.edgeType === 'loop') return '#B10DC9';
        if (edge.edgeType === 'crossing') return '#FF851B';
        if (edge.edgeType === 'automatic') return '#00BFFF';

        // Then by direction
        const dir = edge.direction?.toUpperCase() || '';
        if (dir === 'UP') return trackColors.UP;
        if (dir === 'DOWN') return trackColors.DOWN;
        if (dir === 'BOTH') return trackColors.MAIN;

        return '#888888';
    };

    // Get signal color with glow
    const getSignalColor = (signalColor) => {
        switch (signalColor?.toLowerCase()) {
            case 'green': return '#00FF00';
            case 'red': return '#FF0000';
            case 'yellow': return '#FFFF00';
            default: return '#888888';
        }
    };

    // Station definitions with positions (km from origin)
    const stations = useMemo(() => [
        { id: 'bhopal', name: 'Bhopal', code: 'BPL', xKm: 10, yBase: 500 },
        { id: 'vidisha', name: 'Vidisha', code: 'VDA', xKm: 32, yBase: 500 },
        { id: 'bina', name: 'Bina', code: 'BINA', xKm: 50, yBase: 500 },
    ], []);

    // Create node map for quick lookup
    const nodeMap = useMemo(() => {
        if (!nodes || nodes.length === 0) return new Map();
        return new Map(nodes.map(n => [n.nodeId, n]));
    }, [nodes]);

    // Process edges with proper node lookup
    const processedEdges = useMemo(() => {
        if (!edges || edges.length === 0 || nodeMap.size === 0) return [];

        return edges.map(edge => {
            const sourceNode = nodeMap.get(edge.startNode);
            const targetNode = nodeMap.get(edge.endNode);

            if (!sourceNode || !targetNode) {
                return null;
            }

            return {
                id: edge.edgeId || edge._id,
                source: sourceNode,
                target: targetNode,
                edgeType: edge.edgeType || 'block',
                direction: edge.direction,
                stream: edge.stream,
                stationCode: edge.stationCode,
                loopGroup: edge.loopGroup,
                loopNumber: edge.loopNumber,
                length: edge.length,
                maxSpeed: edge.maxspeed,
                isOccupied: edge.isOccupied,
                color: getEdgeColor(edge)
            };
        }).filter(Boolean);
    }, [edges, nodeMap]);

    // Train positions on edges
    const trainPositions = useMemo(() => {
        if (!trainData || trainData.length === 0) return [];

        return trainData.map(train => {
            // Find the edge where train is located
            const currentEdge = processedEdges.find(e => e.id === train.currentEdge);
            if (!currentEdge) return null;

            // Position train at midpoint of edge
            const midX = (currentEdge.source.x + currentEdge.target.x) / 2;
            const midY = (currentEdge.source.y + currentEdge.target.y) / 2;

            return {
                ...train,
                x: midX * SCALE_X,
                y: midY * SCALE_Y,
                direction: train.direction,
                isPassenger: train.trainCategory === 'Passenger',
            };
        }).filter(Boolean);
    }, [trainData, processedEdges]);

    // Calculate SVG bounds
    const bounds = useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return { minX: -50, maxX: 1200, minY: 0, maxY: 1000 };
        }

        const xValues = nodes.map(n => n.x * SCALE_X);
        const yValues = nodes.map(n => n.y * SCALE_Y);

        return {
            minX: Math.min(...xValues) - 100,
            maxX: Math.max(...xValues) + 100,
            minY: Math.min(...yValues) - 100,
            maxY: Math.max(...yValues) + 100
        };
    }, [nodes]);

    const svgWidth = bounds.maxX - bounds.minX;
    const svgHeight = bounds.maxY - bounds.minY;

    // Stats
    const stats = useMemo(() => {
        const upEdges = processedEdges.filter(e => e.direction === 'UP' && e.edgeType !== 'loop');
        const downEdges = processedEdges.filter(e => e.direction === 'DOWN' && e.edgeType !== 'loop');
        const loopEdges = processedEdges.filter(e => e.edgeType === 'loop');
        const crossingEdges = processedEdges.filter(e => e.edgeType === 'crossing');
        const occupiedEdges = processedEdges.filter(e => e.isOccupied);

        return {
            totalNodes: nodes?.length || 0,
            totalEdges: processedEdges.length,
            upEdges: upEdges.length,
            downEdges: downEdges.length,
            loops: loopEdges.length,
            crossings: crossingEdges.length,
            occupied: occupiedEdges.length,
            trains: trainData?.length || 0,
        };
    }, [nodes, processedEdges, trainData]);

    // Pan/zoom handlers
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

    const handleMouseUp = () => setIsPanning(false);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.3), 3));
    };

    // Render track (edge) with dual rails
    const renderEdge = (edge) => {
        const { source, target } = edge;
        const x1 = source.x * SCALE_X;
        const y1 = source.y * SCALE_Y;
        const x2 = target.x * SCALE_X;
        const y2 = target.y * SCALE_Y;

        const trackColor = edge.color;
        const isLoop = edge.edgeType === 'loop';
        const isCrossing = edge.edgeType === 'crossing';
        const isOccupied = edge.isOccupied;

        const railGap = isLoop ? 6 : 8;
        const strokeWidth = isLoop ? 2 : 3;

        // Direction vectors
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length === 0) return null;

        const ux = dx / length;
        const uy = dy / length;
        const px = -uy;
        const py = ux;

        // Rail positions
        const rail1 = {
            x1: x1 + px * railGap / 2, y1: y1 + py * railGap / 2,
            x2: x2 + px * railGap / 2, y2: y2 + py * railGap / 2
        };
        const rail2 = {
            x1: x1 - px * railGap / 2, y1: y1 - py * railGap / 2,
            x2: x2 - px * railGap / 2, y2: y2 - py * railGap / 2
        };

        // Sleepers
        const sleepers = [];
        const sleeperSpacing = isLoop ? 15 : 20;
        const numSleepers = Math.max(2, Math.floor(length / sleeperSpacing));

        for (let i = 1; i < numSleepers; i++) {
            const t = i / numSleepers;
            const cx = x1 + dx * t;
            const cy = y1 + dy * t;
            sleepers.push({
                x1: cx + px * (railGap + 3),
                y1: cy + py * (railGap + 3),
                x2: cx - px * (railGap + 3),
                y2: cy - py * (railGap + 3)
            });
        }

        return (
            <g key={edge.id} className="cursor-pointer" onClick={() => setSelectedEdge(edge)}>
                {/* Track bed */}
                <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isOccupied ? '#ff4400' : '#2a2a3a'}
                    strokeWidth={isLoop ? 14 : 18}
                    strokeLinecap="round"
                    opacity={0.5}
                />

                {/* Sleepers */}
                {sleepers.map((s, idx) => (
                    <line
                        key={`slp-${edge.id}-${idx}`}
                        x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                        stroke={isOccupied ? '#553322' : '#3a3020'}
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                ))}

                {/* Left rail */}
                <line
                    x1={rail1.x1} y1={rail1.y1} x2={rail1.x2} y2={rail1.y2}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* Right rail */}
                <line
                    x1={rail2.x1} y1={rail2.y1} x2={rail2.x2} y2={rail2.y2}
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />

                {/* Shine effect */}
                <line
                    x1={rail1.x1} y1={rail1.y1} x2={rail1.x2} y2={rail1.y2}
                    stroke="#ffffff" strokeWidth={1} opacity={0.2}
                />

                {/* Crossing indicator */}
                {isCrossing && (
                    <g>
                        <circle
                            cx={(x1 + x2) / 2}
                            cy={(y1 + y2) / 2}
                            r={8}
                            fill="#FF851B"
                            stroke="#000"
                            strokeWidth={1}
                        />
                        <text
                            x={(x1 + x2) / 2}
                            y={(y1 + y2) / 2 + 3}
                            textAnchor="middle"
                            fontSize="8"
                            fill="#000"
                            fontWeight="bold"
                        >
                            X
                        </text>
                    </g>
                )}

                {/* Occupied indicator */}
                {isOccupied && (
                    <circle
                        cx={(x1 + x2) / 2}
                        cy={(y1 + y2) / 2}
                        r={10}
                        fill="none"
                        stroke="#ff4400"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                    >
                        <animate
                            attributeName="r"
                            values="8;12;8"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    </circle>
                )}
            </g>
        );
    };

    // Render node
    const renderNode = (node) => {
        const x = node.x * SCALE_X;
        const y = node.y * SCALE_Y;
        const isSelected = selectedNode?.nodeId === node.nodeId;
        const signalColor = getSignalColor(node.signalColor);
        const isLoopNode = node.nodeType === 'loop' || node.line?.includes('LOOP');
        const size = isSelected ? 10 : (isLoopNode ? 6 : 8);

        return (
            <g
                key={node.nodeId}
                className="cursor-pointer"
                onClick={() => setSelectedNode(isSelected ? null : node)}
            >
                {/* Glow effect */}
                <circle
                    cx={x} cy={y}
                    r={size * 2}
                    fill={signalColor}
                    opacity={isSelected ? 0.4 : 0.15}
                />

                {/* Node shape */}
                <circle
                    cx={x} cy={y}
                    r={size}
                    fill="#1a1a2e"
                    stroke={getTrackColor(node.line)}
                    strokeWidth={2}
                />

                {/* Signal light */}
                {node.blockBoundary && (
                    <circle
                        cx={x}
                        cy={y - size - 8}
                        r={4}
                        fill={signalColor}
                    />
                )}

                {/* Node label (only for main nodes) */}
                {!isLoopNode && (
                    <text
                        x={x}
                        y={y + size + 14}
                        textAnchor="middle"
                        fill="#888"
                        fontSize="8"
                        fontFamily="monospace"
                    >
                        {node.nodeId}
                    </text>
                )}
            </g>
        );
    };

    // Render station marker
    const renderStation = (station) => {
        const x = station.xKm * SCALE_X;
        const y = station.yBase * SCALE_Y;

        return (
            <g key={station.id}>
                {/* Station platform */}
                <rect
                    x={x - 30}
                    y={y - 60}
                    width={60}
                    height={120}
                    fill="rgba(255,220,0,0.1)"
                    stroke="#FFDC00"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    rx={4}
                />

                {/* Station name */}
                <text
                    x={x}
                    y={y - 75}
                    textAnchor="middle"
                    fill="#FFDC00"
                    fontSize="14"
                    fontWeight="bold"
                    style={{ textShadow: '0 0 8px #000' }}
                >
                    {station.name}
                </text>

                {/* Station code */}
                <text
                    x={x}
                    y={y - 60}
                    textAnchor="middle"
                    fill="#888"
                    fontSize="10"
                >
                    [{station.code}]
                </text>

                {/* Station marker */}
                <circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill="#FFDC00"
                    stroke="#000"
                    strokeWidth={2}
                />
            </g>
        );
    };

    // Render train
    const renderTrain = (train) => {
        const isPassenger = train.isPassenger;
        const color = isPassenger ? '#00BFFF' : '#FF851B';
        const rotation = train.direction === 'UP' ? 0 : 180;

        return (
            <g key={train.trainId} transform={`translate(${train.x}, ${train.y})`}>
                {/* Train glow */}
                <circle r={20} fill={color} opacity={0.3}>
                    <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Train body */}
                <g transform={`rotate(${rotation})`}>
                    <rect x={-15} y={-8} width={30} height={16} rx={4} fill={color} stroke="#fff" strokeWidth={1} />
                    <polygon points="-15,0 -25,0 -20,-5 -20,5" fill={color} />
                </g>

                {/* Train ID */}
                <text
                    y={-20}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                >
                    {train.trainId}
                </text>
            </g>
        );
    };

    // Render axis with km labels (X) and meter labels (Y)
    const renderAxes = () => {
        const xTicks = [0, 10, 20, 30, 40, 50, 52];
        const yTicks = [100, 200, 300, 400, 500, 600, 700, 800, 900];

        return (
            <g className="axes">
                {/* X axis labels (km) */}
                {xTicks.map(km => (
                    <g key={`x-${km}`}>
                        <line
                            x1={km * SCALE_X}
                            y1={bounds.minY}
                            x2={km * SCALE_X}
                            y2={bounds.maxY}
                            stroke="#333"
                            strokeWidth={0.5}
                            strokeDasharray="4 4"
                        />
                        <text
                            x={km * SCALE_X}
                            y={bounds.maxY - 10}
                            textAnchor="middle"
                            fill="#666"
                            fontSize="10"
                        >
                            {km} km
                        </text>
                    </g>
                ))}

                {/* Y axis labels (meters) - representing track lines */}
                {yTicks.map(m => {
                    let label = `${m}m`;
                    let color = '#666';

                    if (m === 600) { label = 'UP Main'; color = trackColors.UP; }
                    else if (m === 500) { label = 'MAIN'; color = trackColors.MAIN; }
                    else if (m === 400) { label = 'DOWN Main'; color = trackColors.DOWN; }
                    else if (m === 700) { label = 'UP Loop 1'; color = trackColors.UP_LOOP; }
                    else if (m === 800) { label = 'UP Loop 2'; color = trackColors.UP_LOOP; }
                    else if (m === 900) { label = 'UP Loop 3'; color = trackColors.UP_LOOP; }
                    else if (m === 300) { label = 'DN Loop 1'; color = trackColors.DOWN_LOOP; }
                    else if (m === 200) { label = 'DN Loop 2'; color = trackColors.DOWN_LOOP; }
                    else if (m === 100) { label = 'DN Loop 3'; color = trackColors.DOWN_LOOP; }

                    return (
                        <g key={`y-${m}`}>
                            <line
                                x1={bounds.minX + 10}
                                y1={m * SCALE_Y}
                                x2={bounds.maxX - 10}
                                y2={m * SCALE_Y}
                                stroke="#222"
                                strokeWidth={0.5}
                            />
                            <text
                                x={bounds.minX + 15}
                                y={m * SCALE_Y + 4}
                                fill={color}
                                fontSize="9"
                                fontWeight="600"
                            >
                                {label}
                            </text>
                        </g>
                    );
                })}
            </g>
        );
    };

    // Loading/Error states
    if (stationLoading) {
        return (
            <div className="card h-full flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: '#00ff00' }} />
                    <div className="font-semibold text-green-400">Loading Section Data...</div>
                </div>
            </div>
        );
    }

    if (!hasData || !nodes || nodes.length === 0) {
        return (
            <div className="card h-full flex items-center justify-center" style={{ background: '#0a0a0f' }}>
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                    <div className="font-semibold mb-2 text-red-400">No Track Data</div>
                    <div className="text-sm text-gray-500">Please login to load section data</div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${isFullscreen ? 'fixed inset-0 z-50' : 'card h-full'} flex flex-col`}
            style={{
                background: isFullscreen ? '#000' : 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
                border: isFullscreen ? 'none' : '1px solid #2a2a4a'
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: '#2a2a4a' }}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-400" />
                        <span className="font-bold text-lg uppercase tracking-wider" style={{ color: '#00ff00' }}>
                            {sectionName || 'Section Controller'}
                        </span>
                    </div>
                    <div className="text-xs px-2 py-0.5 rounded" style={{ background: '#1a1a2e', color: '#888' }}>
                        {stats.totalNodes} nodes • {stats.totalEdges} edges
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Train toggle */}
                    <button
                        onClick={() => setShowTrains(!showTrains)}
                        className={`px-2 py-1 rounded text-xs ${showTrains ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-400'}`}
                    >
                        <Train className="w-4 h-4 inline mr-1" />
                        Trains ({stats.trains})
                    </button>

                    {/* Zoom controls */}
                    <button onClick={() => setZoom(prev => Math.min(prev * 1.2, 3))} className="p-1.5 rounded hover:bg-white/10" style={{ color: '#888' }}>
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(prev => Math.max(prev * 0.8, 0.3))} className="p-1.5 rounded hover:bg-white/10" style={{ color: '#888' }}>
                        <ZoomOut className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-gray-700 mx-2" />

                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 rounded hover:bg-white/10" style={{ color: '#888' }}>
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main SVG Canvas */}
            <div
                className="flex-1 overflow-hidden relative"
                style={{ background: '#0a0a0f', cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
            >
                {/* Grid */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(40,40,60,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(40,40,60,0.2) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
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
                    {/* Axis grid and labels */}
                    {renderAxes()}

                    {/* Station markers */}
                    {stations.map(renderStation)}

                    {/* Edges (tracks) */}
                    {processedEdges.map(renderEdge)}

                    {/* Nodes */}
                    {nodes.map(renderNode)}

                    {/* Trains */}
                    {showTrains && trainPositions.map(renderTrain)}
                </svg>
            </div>

            {/* Status Bar */}
            <div className="grid grid-cols-8 gap-1 p-2 border-t" style={{ borderColor: '#2a2a4a', background: '#0a0a0f' }}>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] text-gray-500 uppercase">Tracks</div>
                    <div className="text-sm font-bold text-white">{tracks?.length || 0}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: trackColors.UP }}>UP</div>
                    <div className="text-sm font-bold" style={{ color: trackColors.UP }}>{stats.upEdges}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: trackColors.DOWN }}>DOWN</div>
                    <div className="text-sm font-bold" style={{ color: trackColors.DOWN }}>{stats.downEdges}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: trackColors.UP_LOOP }}>Loops</div>
                    <div className="text-sm font-bold" style={{ color: trackColors.UP_LOOP }}>{stats.loops}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase" style={{ color: '#FF851B' }}>Crossings</div>
                    <div className="text-sm font-bold" style={{ color: '#FF851B' }}>{stats.crossings}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase text-red-500">Occupied</div>
                    <div className="text-sm font-bold text-red-400">{stats.occupied}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase text-cyan-500">Trains</div>
                    <div className="text-sm font-bold text-cyan-400">{stats.trains}</div>
                </div>
                <div className="rounded px-2 py-1.5 text-center" style={{ background: '#1a1a2e' }}>
                    <div className="text-[10px] uppercase text-green-500">Signals</div>
                    <div className="text-sm font-bold text-green-400">
                        {nodes.filter(n => n.signalColor === 'green').length}/{stats.totalNodes}
                    </div>
                </div>
            </div>

            {/* Selected Edge/Node Info Panel */}
            {(selectedEdge || selectedNode) && (
                <div
                    className="absolute bottom-24 left-4 right-4 rounded-lg p-4"
                    style={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid #00ff00',
                        boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
                    }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold" style={{ color: '#00ff00' }}>
                            {selectedEdge ? `Edge: ${selectedEdge.id}` : `Node: ${selectedNode.nodeId}`}
                        </h3>
                        <button
                            onClick={() => { setSelectedEdge(null); setSelectedNode(null); }}
                            className="text-xs hover:underline text-gray-500"
                        >
                            ✕ Close
                        </button>
                    </div>

                    <div className="grid grid-cols-6 gap-4 text-sm">
                        {selectedEdge ? (
                            <>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Type</div>
                                    <div className="font-semibold" style={{ color: edgeTypeColors[selectedEdge.edgeType] }}>
                                        {selectedEdge.edgeType?.toUpperCase()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Direction</div>
                                    <div style={{ color: getTrackColor(selectedEdge.direction) }}>
                                        {selectedEdge.direction}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Station</div>
                                    <div className="text-white">{selectedEdge.stationCode || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Length</div>
                                    <div className="text-white">{selectedEdge.length ? `${selectedEdge.length} km` : '—'}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Max Speed</div>
                                    <div className="text-white">{selectedEdge.maxSpeed || '120'} km/h</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Status</div>
                                    <div className={selectedEdge.isOccupied ? 'text-red-400' : 'text-green-400'}>
                                        {selectedEdge.isOccupied ? 'OCCUPIED' : 'FREE'}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Node ID</div>
                                    <div className="font-mono text-white">{selectedNode.nodeId}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Type</div>
                                    <div className="text-white">{selectedNode.nodeType}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Line</div>
                                    <div style={{ color: getTrackColor(selectedNode.line) }}>
                                        {selectedNode.line}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Position</div>
                                    <div className="font-mono text-white">
                                        X: {selectedNode.x} km, Y: {selectedNode.y}m
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Signal</div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: getSignalColor(selectedNode.signalColor) }}
                                        />
                                        <span className="text-white">{selectedNode.signalColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase">Block Boundary</div>
                                    <div className={selectedNode.blockBoundary ? 'text-yellow-400' : 'text-gray-500'}>
                                        {selectedNode.blockBoundary ? 'YES' : 'NO'}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 py-2 text-[10px] border-t" style={{ borderColor: '#2a2a4a', background: '#0a0a0f' }}>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: trackColors.UP }} />
                    <span className="text-gray-500">UP</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: trackColors.DOWN }} />
                    <span className="text-gray-500">DOWN</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: trackColors.MAIN }} />
                    <span className="text-gray-500">MAIN</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: trackColors.UP_LOOP }} />
                    <span className="text-gray-500">LOOP</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-1 rounded" style={{ background: '#FF851B' }} />
                    <span className="text-gray-500">CROSSING</span>
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
                <div className="w-px h-3 bg-gray-700" />
                <span className="text-gray-600">X: Distance (km) • Y: Track Position (m)</span>
            </div>
        </div>
    );
}
