import { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { Activity, Maximize2 } from 'lucide-react';
import sectionDataImport from '../sectionData.json';
import { parseSectionData, getSignalColor, getTrackColor, calculateTrainSVGPosition } from '@/lib/sectionParser';

export default function TrackControl() {
    const { trains } = useWebSocket();
    const [parsedData, setParsedData] = useState(null);
    const [selectedBlock, setSelectedBlock] = useState(null);

    useEffect(() => {
        // Parse section data on mount
        const parsed = parseSectionData(sectionDataImport);
        setParsedData(parsed);
    }, []);

    if (!parsedData) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    const { stations, tracks, canvasSize, section } = parsedData;

    return (
        <div className="card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                        <Activity size={24} className="text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Track Control System</h2>
                        <p className="text-xs text-gray-400">{section?.name || 'Section View'}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full live-pulse"></div>
                        <span className="text-xs text-green-300 font-medium">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Track Visualization */}
            <div className="flex-1 bg-black/30 rounded-lg p-4 overflow-auto">
                <svg
                    width={canvasSize.width}
                    height={canvasSize.height}
                    className="w-full h-auto"
                    viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
                >
                    {/* Render Stations */}
                    {stations.map((station, idx) => (
                        <g key={station.id || idx}>
                            <circle
                                cx={station.svgX}
                                cy={station.svgY}
                                r={8}
                                fill="#EA7317"
                                stroke="#FEF6E4"
                                strokeWidth={2}
                            />
                            <text
                                x={station.svgX}
                                y={station.svgY - 15}
                                textAnchor="middle"
                                fill="#FEF6E4"
                                fontSize="12"
                                fontWeight="bold"
                            >
                                {station.name}
                            </text>
                        </g>
                    ))}

                    {/* Render Tracks and Blocks */}
                    {tracks.map((track, trackIdx) => {
                        const trackColor = getTrackColor(track.type, track.direction);

                        return (
                            <g key={track.id || trackIdx}>
                                {/* Track Label */}
                                <text
                                    x={20}
                                    y={100 + track.yOffset + 20}
                                    fill="#FEF6E4"
                                    fontSize="11"
                                    fontWeight="bold"
                                >
                                    {track.name || `${track.direction} ${track.type}`}
                                </text>

                                {/* Blocks */}
                                {track.blocks?.map((block, blockIdx) => {
                                    const isSelected = selectedBlock?.id === block.id;

                                    return (
                                        <g key={block.id || blockIdx}>
                                            {/* Block Rectangle */}
                                            <rect
                                                x={block.svgX}
                                                y={block.svgY}
                                                width={block.svgWidth}
                                                height={block.svgHeight}
                                                fill={isSelected ? trackColor : 'rgba(100, 100, 100, 0.3)'}
                                                stroke={trackColor}
                                                strokeWidth={2}
                                                rx={4}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setSelectedBlock(block)}
                                            />

                                            {/* Block ID */}
                                            <text
                                                x={block.svgX + block.svgWidth / 2}
                                                y={block.svgY + block.svgHeight / 2 + 5}
                                                textAnchor="middle"
                                                fill="white"
                                                fontSize="10"
                                            >
                                                {block.block_id}
                                            </text>

                                            {/* Signal */}
                                            {block.signal && (
                                                <circle
                                                    cx={block.signalX}
                                                    cy={block.signalY}
                                                    r={6}
                                                    className={getSignalColor(block.signal.aspect)}
                                                    stroke="white"
                                                    strokeWidth={1}
                                                />
                                            )}
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Render Trains */}
                    {trains.map((train, idx) => {
                        const position = calculateTrainSVGPosition(train, tracks);
                        if (!position) return null;

                        return (
                            <g key={train.train_id || idx}>
                                {/* Train icon */}
                                <rect
                                    x={position.x - 15}
                                    y={position.y - 10}
                                    width={30}
                                    height={20}
                                    fill="#EA7317"
                                    stroke="white"
                                    strokeWidth={2}
                                    rx={3}
                                />
                                <text
                                    x={position.x}
                                    y={position.y + 4}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="10"
                                    fontWeight="bold"
                                >
                                    {train.train_number || train.train_id}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4 text-xs">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full signal-green"></div>
                        <span className="text-gray-300">Green</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full signal-yellow"></div>
                        <span className="text-gray-300">Yellow</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 rounded-full signal-red"></div>
                        <span className="text-gray-300">Red</span>
                    </div>
                </div>
                {selectedBlock && (
                    <div className="text-gray-300">
                        Selected: <span className="text-white font-semibold">{selectedBlock.block_id}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
