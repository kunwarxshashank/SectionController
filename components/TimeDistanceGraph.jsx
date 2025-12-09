import React, { useMemo, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectTimeDistanceData, selectTrainSchedules, selectOptimizationLoading } from '@/store/slices/optimizationSlice';
import { Clock, Train, TrendingUp, Filter, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Railway Time-Distance Graph Component
 * 
 * Displays trains on a time-distance chart similar to Indian Railway charts.
 * X-axis: Time (HH:MM)
 * Y-axis: Distance/Stations (Bhopal 0km → Vidisha 22km → Bina 72km)
 */

const STATIONS = [
    { id: 'bhopal', name: 'Bhopal', code: 'BPL', km: 0 },
    { id: 'vidisha', name: 'Vidisha', code: 'VDA', km: 22 },
    { id: 'bina', name: 'Bina', code: 'BINA', km: 72 },
];

const COLORS = {
    passenger: {
        primary: '#22c55e',
        light: 'rgba(34, 197, 94, 0.15)',
    },
    freight: {
        primary: '#f97316',
        light: 'rgba(249, 115, 22, 0.15)',
    }
};

const TimeDistanceGraph = () => {
    const timeDistanceData = useSelector(selectTimeDistanceData);
    const trainSchedules = useSelector(selectTrainSchedules);
    const loading = useSelector(selectOptimizationLoading);

    const [filter, setFilter] = useState('all');
    const [hoveredTrain, setHoveredTrain] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const CHART = {
        width: 900,
        height: 360,
        padding: { top: 20, right: 35, bottom: 30, left: 60 },
        timeRange: { start: 5 * 60, end: 20 * 60 },
        kmRange: { start: 0, end: 75 }
    };

    const scaleX = (minutes) => {
        const { start, end } = CHART.timeRange;
        const chartWidth = CHART.width - CHART.padding.left - CHART.padding.right;
        return CHART.padding.left + ((minutes - start) / (end - start)) * chartWidth;
    };

    const scaleY = (km) => {
        const chartHeight = CHART.height - CHART.padding.top - CHART.padding.bottom;
        return CHART.padding.top + (km / CHART.kmRange.end) * chartHeight;
    };

    const processedTrains = useMemo(() => {
        // Use timeDistanceGraphData if available
        if (timeDistanceData && timeDistanceData.length > 0) {
            return timeDistanceData.map((train, idx) => {
                const isPassenger = !train.train?.includes('-') && /^\d+$/.test(train.train);
                const color = isPassenger ? COLORS.passenger.primary : COLORS.freight.primary;

                const points = [];
                const bplTime = timeToMinutes(train.departureFromBhopal || train.arrivalAtBhopal);
                const vdaArr = timeToMinutes(train.arrivalAtVidisha);
                const vdaDep = timeToMinutes(train.departureFromVidisha);
                const binaTime = timeToMinutes(train.arrivalAtBina || train.departureFromBina);

                // Determine direction
                const direction = bplTime < binaTime ? 'UP' : 'DOWN';

                if (direction === 'UP') {
                    if (bplTime) points.push({ km: 0, time: bplTime });
                    if (vdaArr) points.push({ km: 22, time: vdaArr });
                    if (vdaDep && vdaDep !== vdaArr) points.push({ km: 22, time: vdaDep });
                    if (binaTime) points.push({ km: 72, time: binaTime });
                } else {
                    if (binaTime) points.push({ km: 72, time: timeToMinutes(train.departureFromBina) || binaTime });
                    if (vdaArr) points.push({ km: 22, time: vdaArr });
                    if (vdaDep && vdaDep !== vdaArr) points.push({ km: 22, time: vdaDep });
                    if (bplTime) points.push({ km: 0, time: timeToMinutes(train.arrivalAtBhopal) || bplTime });
                }

                return {
                    id: train.train,
                    name: train.trainName,
                    trainId: train.train,
                    isPassenger,
                    direction,
                    color,
                    points: points.filter(p => p.time > 0),
                    timeSpentAtVidisha: train.timeSpentAtVidisha,
                    arrivalBhopal: train.arrivalAtBhopal,
                    arrivalVidisha: train.arrivalAtVidisha,
                    arrivalBina: train.arrivalAtBina,
                };
            }).filter(t => t.points.length >= 2);
        }

        // Fallback to trainSchedules
        if (trainSchedules && trainSchedules.length > 0) {
            return trainSchedules.map((schedule) => {
                const isPassenger = schedule.isPassenger;
                const color = isPassenger ? COLORS.passenger.primary : COLORS.freight.primary;

                const points = (schedule.timeDistanceProfile || []).map(p => ({
                    km: STATIONS.find(s => s.id === p.stationId)?.km || p.yIndex * 36,
                    time: p.arrivalMinutes || timeToMinutes(p.arrival)
                }));

                return {
                    id: schedule.trainId,
                    name: schedule.trainName,
                    trainId: schedule.trainId,
                    isPassenger,
                    direction: schedule.direction,
                    color,
                    points,
                    maxSpeed: schedule.maxSpeed,
                };
            }).filter(t => t.points.length >= 2);
        }

        // Demo data
        return [
            {
                id: '12001', name: 'Shatabdi Express', isPassenger: true, direction: 'UP',
                color: COLORS.passenger.primary,
                points: [{ km: 0, time: 360 }, { km: 22, time: 385 }, { km: 72, time: 415 }]
            },
            {
                id: '12002', name: 'Shatabdi Express', isPassenger: true, direction: 'DOWN',
                color: COLORS.passenger.primary,
                points: [{ km: 72, time: 1080 }, { km: 22, time: 1105 }, { km: 0, time: 1135 }]
            },
            {
                id: 'BCNA-101', name: 'Coal Rake BPL-BINA', isPassenger: false, direction: 'UP',
                color: COLORS.freight.primary,
                points: [{ km: 0, time: 300 }, { km: 22, time: 345 }, { km: 72, time: 405 }]
            },
            {
                id: 'BCNA-102', name: 'Coal Rake BINA-BPL', isPassenger: false, direction: 'DOWN',
                color: COLORS.freight.primary,
                points: [{ km: 72, time: 330 }, { km: 22, time: 375 }, { km: 0, time: 435 }]
            }
        ];
    }, [timeDistanceData, trainSchedules]);

    const filteredTrains = useMemo(() => {
        if (filter === 'all') return processedTrains;
        if (filter === 'passenger') return processedTrains.filter(t => t.isPassenger);
        if (filter === 'freight') return processedTrains.filter(t => !t.isPassenger);
        return processedTrains;
    }, [processedTrains, filter]);

    const getTrainPath = (train) => {
        if (!train.points || train.points.length < 2) return '';
        return train.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.time)} ${scaleY(p.km)}`)
            .join(' ');
    };

    const formatTime = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const timeTicks = useMemo(() => {
        const ticks = [];
        for (let t = CHART.timeRange.start; t <= CHART.timeRange.end; t += 60) {
            ticks.push(t);
        }
        return ticks;
    }, []);

    const handleMouseMove = (e, train) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        setTooltipPos({
            x: e.clientX - rect.left + 10,
            y: e.clientY - rect.top - 10
        });
        setHoveredTrain(train);
    };

    const stats = useMemo(() => ({
        total: processedTrains.length,
        passenger: processedTrains.filter(t => t.isPassenger).length,
        freight: processedTrains.filter(t => !t.isPassenger).length,
        up: processedTrains.filter(t => t.direction === 'UP').length,
        down: processedTrains.filter(t => t.direction === 'DOWN').length,
    }), [processedTrains]);

    if (loading) {
        return (
            <div className="card h-full flex items-center justify-center" style={{ minHeight: 300 }}>
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Running optimization...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col p-3" style={{ minHeight: 320 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                        <TrendingUp size={16} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            Time-Distance Graph
                        </h2>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                            {stats.total} trains • {stats.passenger} pax • {stats.freight} freight
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {['all', 'passenger', 'freight'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${filter === f
                                ? f === 'passenger' ? 'bg-green-500 text-white'
                                    : f === 'freight' ? 'bg-orange-500 text-white'
                                        : 'bg-blue-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            {f === 'all' ? 'All' : f === 'passenger' ? '🚃 Pax' : '📦 Frt'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 relative overflow-hidden" ref={svgRef}>
                <svg
                    viewBox={`0 0 ${CHART.width} ${CHART.height}`}
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Background */}
                    <rect
                        x={CHART.padding.left}
                        y={CHART.padding.top}
                        width={CHART.width - CHART.padding.left - CHART.padding.right}
                        height={CHART.height - CHART.padding.top - CHART.padding.bottom}
                        fill="rgba(0,0,0,0.02)"
                        rx={4}
                    />

                    {/* Time axis */}
                    {timeTicks.map(t => (
                        <g key={`time-${t}`}>
                            <line
                                x1={scaleX(t)} y1={CHART.padding.top}
                                x2={scaleX(t)} y2={CHART.height - CHART.padding.bottom}
                                stroke="#e5e7eb" strokeDasharray="4 4"
                            />
                            <text x={scaleX(t)} y={CHART.height - CHART.padding.bottom + 20}
                                textAnchor="middle" fontSize={11} fill="#6b7280">
                                {formatTime(t)}
                            </text>
                        </g>
                    ))}

                    {/* Stations */}
                    {STATIONS.map(station => (
                        <g key={station.id}>
                            <line
                                x1={CHART.padding.left} y1={scaleY(station.km)}
                                x2={CHART.width - CHART.padding.right} y2={scaleY(station.km)}
                                stroke="#9ca3af" strokeWidth={1.5}
                            />
                            <rect
                                x={CHART.padding.left - 58} y={scaleY(station.km) - 10}
                                width={55} height={20} rx={3}
                                fill="rgba(255, 220, 0, 0.1)" stroke="#FFDC00" strokeWidth={1}
                            />
                            <text x={CHART.padding.left - 30} y={scaleY(station.km) + 4}
                                textAnchor="middle" fontSize={11} fill="#FFDC00" fontWeight="600">
                                {station.code}
                            </text>
                        </g>
                    ))}

                    {/* Train paths */}
                    {filteredTrains.map(train => (
                        <g
                            key={train.id}
                            onMouseMove={(e) => handleMouseMove(e, train)}
                            onMouseLeave={() => setHoveredTrain(null)}
                            className="cursor-pointer"
                            style={{ transition: 'opacity 0.2s' }}
                            opacity={hoveredTrain ? (hoveredTrain.id === train.id ? 1 : 0.3) : 1}
                        >
                            {/* Glow */}
                            <path
                                d={getTrainPath(train)} fill="none"
                                stroke={train.color} strokeWidth={hoveredTrain?.id === train.id ? 8 : 4}
                                strokeLinecap="round" strokeLinejoin="round" opacity={0.2}
                            />
                            {/* Main path */}
                            <path
                                d={getTrainPath(train)} fill="none"
                                stroke={train.color} strokeWidth={hoveredTrain?.id === train.id ? 4 : 2.5}
                                strokeLinecap="round" strokeLinejoin="round"
                            />
                            {/* Points */}
                            {train.points.map((p, i) => (
                                <circle
                                    key={i} cx={scaleX(p.time)} cy={scaleY(p.km)}
                                    r={hoveredTrain?.id === train.id ? 6 : 4}
                                    fill={train.color} stroke="white" strokeWidth={2}
                                />
                            ))}
                            {/* Train label on path */}
                            {hoveredTrain?.id === train.id && train.points.length > 1 && (
                                <text
                                    x={scaleX(train.points[Math.floor(train.points.length / 2)].time)}
                                    y={scaleY(train.points[Math.floor(train.points.length / 2)].km) - 12}
                                    textAnchor="middle" fontSize={10} fontWeight="bold"
                                    fill={train.color}
                                >
                                    {train.id}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Axis labels */}
                    <text x={CHART.width / 2} y={CHART.height - 3}
                        textAnchor="middle" fontSize={10} fill="#6b7280">
                        Time (HH:MM)
                    </text>
                    <text x={10} y={CHART.height / 2} textAnchor="middle" fontSize={10} fill="#6b7280"
                        transform={`rotate(-90, 10, ${CHART.height / 2})`}>
                        Distance (km)
                    </text>
                </svg>

                {/* Floating tooltip */}
                {hoveredTrain && (
                    <div
                        className="absolute pointer-events-none z-50 p-3 rounded-lg shadow-xl border"
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            background: 'rgba(0,0,0,0.9)',
                            borderColor: hoveredTrain.color,
                            maxWidth: 280,
                            transform: tooltipPos.x > 500 ? 'translateX(-110%)' : 'none'
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: hoveredTrain.color }} />
                            <span className="font-bold text-white text-sm">
                                {hoveredTrain.name || hoveredTrain.id}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="text-gray-400">Train ID:</div>
                            <div className="text-white font-mono">{hoveredTrain.id}</div>

                            <div className="text-gray-400">Type:</div>
                            <div className={hoveredTrain.isPassenger ? 'text-green-400' : 'text-orange-400'}>
                                {hoveredTrain.isPassenger ? '🚃 Passenger' : '📦 Freight'}
                            </div>

                            <div className="text-gray-400">Direction:</div>
                            <div className="text-white flex items-center gap-1">
                                {hoveredTrain.direction === 'UP' ? (
                                    <><ArrowUpRight size={12} className="text-green-400" /> UP</>
                                ) : (
                                    <><ArrowDownRight size={12} className="text-red-400" /> DOWN</>
                                )}
                            </div>

                            {hoveredTrain.arrivalBhopal && (
                                <>
                                    <div className="text-gray-400">At BPL:</div>
                                    <div className="text-white">{hoveredTrain.arrivalBhopal}</div>
                                </>
                            )}
                            {hoveredTrain.arrivalVidisha && (
                                <>
                                    <div className="text-gray-400">At VDA:</div>
                                    <div className="text-white">{hoveredTrain.arrivalVidisha}</div>
                                </>
                            )}
                            {hoveredTrain.arrivalBina && (
                                <>
                                    <div className="text-gray-400">At BINA:</div>
                                    <div className="text-white">{hoveredTrain.arrivalBina}</div>
                                </>
                            )}
                            {hoveredTrain.timeSpentAtVidisha && (
                                <>
                                    <div className="text-gray-400">Wait VDA:</div>
                                    <div className="text-yellow-400">{hoveredTrain.timeSpentAtVidisha}</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-1 flex items-center justify-center gap-4 text-[10px] pt-1.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 rounded bg-green-500" />
                    <span style={{ color: 'var(--text-secondary)' }}>Passenger ({stats.passenger})</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-1 rounded bg-orange-500" />
                    <span style={{ color: 'var(--text-secondary)' }}>Freight ({stats.freight})</span>
                </div>
                <div className="text-gray-400">|</div>
                <div className="flex items-center gap-0.5">
                    <ArrowUpRight size={10} className="text-green-400" />
                    <span style={{ color: 'var(--text-tertiary)' }}>UP ({stats.up})</span>
                </div>
                <div className="flex items-center gap-0.5">
                    <ArrowDownRight size={10} className="text-red-400" />
                    <span style={{ color: 'var(--text-tertiary)' }}>DOWN ({stats.down})</span>
                </div>
            </div>
        </div>
    );
};

export default TimeDistanceGraph;
