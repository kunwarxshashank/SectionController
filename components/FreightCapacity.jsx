import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TrendingUp, Package, ArrowUpCircle, ArrowDownCircle, Zap, Clock, Gauge } from 'lucide-react';
import { selectOptimizationSummary, selectTrainSchedules } from '@/store/slices/optimizationSlice';

/**
 * Freight Capacity Component
 * 
 * Shows how many additional freight trains can be accommodated
 * based on the current schedule optimization.
 */
export default function FreightCapacity() {
    const summary = useSelector(selectOptimizationSummary);
    const trainSchedules = useSelector(selectTrainSchedules);

    // Calculate capacity metrics
    const capacity = useMemo(() => {
        const totalTrains = summary?.totalTrains || 20;
        const freightCompleted = summary?.freightCompleted || 15;
        const passengerTrains = summary?.passengerTrains || 5;
        const freightTrains = summary?.freightTrains || 15;
        const loopUsages = summary?.totalLoopUsages || 0;

        // Calculate time slots used
        const usedTimeSlots = totalTrains;
        const maxCapacity = 30; // Maximum trains per day on this section
        const remainingSlots = maxCapacity - usedTimeSlots;

        // Calculate loop utilization
        const totalLoops = 6; // 3 UP + 3 DOWN loops
        const loopUtilization = Math.min(100, (loopUsages / (totalLoops * 24)) * 100);

        // Calculate direction breakdown
        let upFreight = 0, downFreight = 0;
        if (trainSchedules && trainSchedules.length > 0) {
            trainSchedules.forEach(t => {
                if (t.isFreight) {
                    if (t.direction === 'UP') upFreight++;
                    else downFreight++;
                }
            });
        } else {
            upFreight = Math.ceil(freightTrains / 2);
            downFreight = Math.floor(freightTrains / 2);
        }

        // Additional capacity by direction
        const maxPerDirection = 12;
        const additionalUp = Math.max(0, maxPerDirection - upFreight);
        const additionalDown = Math.max(0, maxPerDirection - downFreight);

        return {
            freightCompleted,
            freightTrains,
            additionalTotal: Math.max(0, remainingSlots),
            additionalUp,
            additionalDown,
            loopUtilization: loopUtilization.toFixed(0),
            throughputPercent: ((usedTimeSlots / maxCapacity) * 100).toFixed(0),
            upFreight,
            downFreight,
        };
    }, [summary, trainSchedules]);

    // Gauge ring component
    const GaugeRing = ({ value, max, color, size = 80 }) => {
        const percent = Math.min(100, (value / max) * 100);
        const radius = (size - 8) / 2;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;

        return (
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(100,100,100,0.2)" strokeWidth="6"
                />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
            </svg>
        );
    };

    return (
        <div className="card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
                    <Package size={20} className="text-white" />
                </div>
                <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        Freight Capacity
                    </h2>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Additional trains possible
                    </p>
                </div>
            </div>

            {/* Main Capacity Display */}
            <div className="flex items-center justify-center gap-6 mb-4">
                {/* Capacity Gauge */}
                <div className="relative flex items-center justify-center">
                    <GaugeRing value={capacity.additionalTotal} max={15} color="#22c55e" size={100} />
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold text-green-500">{capacity.additionalTotal}</span>
                        <span className="text-[10px] text-gray-500">MORE</span>
                    </div>
                </div>

                {/* Direction breakdown */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <ArrowUpCircle size={24} className="text-green-500" />
                        <div>
                            <div className="text-lg font-bold text-green-500">+{capacity.additionalUp}</div>
                            <div className="text-[10px] text-gray-500">UP Direction</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <ArrowDownCircle size={24} className="text-red-500" />
                        <div>
                            <div className="text-lg font-bold text-red-500">+{capacity.additionalDown}</div>
                            <div className="text-[10px] text-gray-500">DOWN Direction</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-auto">
                <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-glass)' }}>
                    <Zap size={16} className="mx-auto mb-1 text-yellow-500" />
                    <div className="text-lg font-bold text-yellow-500">{capacity.throughputPercent}%</div>
                    <div className="text-[9px] text-gray-500">Throughput</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-glass)' }}>
                    <TrendingUp size={16} className="mx-auto mb-1 text-orange-500" />
                    <div className="text-lg font-bold text-orange-500">{capacity.freightCompleted}</div>
                    <div className="text-[9px] text-gray-500">Completed</div>
                </div>
                <div className="rounded-lg p-2 text-center" style={{ background: 'var(--surface-glass)' }}>
                    <Gauge size={16} className="mx-auto mb-1 text-purple-500" />
                    <div className="text-lg font-bold text-purple-500">{capacity.loopUtilization}%</div>
                    <div className="text-[9px] text-gray-500">Loop Use</div>
                </div>
            </div>

            {/* Current distribution */}
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Current Freight Distribution
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className="flex h-full">
                            <div
                                className="bg-green-500"
                                style={{ width: `${(capacity.upFreight / capacity.freightTrains) * 100}%` }}
                            />
                            <div
                                className="bg-red-500"
                                style={{ width: `${(capacity.downFreight / capacity.freightTrains) * 100}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-500">
                        {capacity.upFreight}↑ / {capacity.downFreight}↓
                    </span>
                </div>
            </div>
        </div>
    );
}
