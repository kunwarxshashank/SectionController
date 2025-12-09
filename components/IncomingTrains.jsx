import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Search, Train as TrainIcon, Clock, MapPin, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { getTrainTypeBadge, getPriorityBadge, getDelayStatus, formatTrainNumber } from '@/lib/trainUtils';
import { selectTrainData } from '@/store/slices/stationSlice';
import { format, addHours, isWithinInterval, parse } from 'date-fns';

export default function IncomingTrains() {
    const trainData = useSelector(selectTrainData);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeFilter, setTimeFilter] = useState('3hr'); // Default to 3 hours
    const [filteredTrains, setFilteredTrains] = useState([]);

    const timeFilters = [
        { label: '3H', value: '3hr', hours: 3 },
        { label: '6H', value: '6hr', hours: 6 },
        { label: '12H', value: '12hr', hours: 12 },
        { label: '24H', value: '24hr', hours: 24 },
    ];

    // Helper to check if a schedule time is within the next N hours
    const isScheduledSoon = (schedule, hours) => {
        if (!schedule) return false;

        const now = new Date();
        const future = addHours(now, hours);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Check each station's schedule
        return Object.values(schedule).some(station => {
            // Check arrival
            if (station.scheduledArrival) {
                const [h, m] = station.scheduledArrival.split(':').map(Number);
                // Simple check: if time is within range (handling day wrap is complex without full dates, 
                // but assuming daily schedule for simplicity or "next occurrence")

                // Calculate minutes from now
                let diffMinutes = (h * 60 + m) - (currentHour * 60 + currentMinute);
                if (diffMinutes < 0) diffMinutes += 24 * 60; // Assume next day if time passed

                return diffMinutes <= hours * 60;
            }
            // Check departure
            if (station.scheduledDeparture) {
                const [h, m] = station.scheduledDeparture.split(':').map(Number);
                let diffMinutes = (h * 60 + m) - (currentHour * 60 + currentMinute);
                if (diffMinutes < 0) diffMinutes += 24 * 60;

                return diffMinutes <= hours * 60;
            }
            return false;
        });
    };

    // Transform train data from login API format to component display format
    const trains = useMemo(() => {
        if (!trainData || trainData.length === 0) return [];

        return trainData.map(train => {
            // Get priority label based on trainPriority value
            let priorityLabel = 'MEDIUM';
            if (train.trainPriority <= 3) priorityLabel = 'HIGH';
            else if (train.trainPriority >= 6) priorityLabel = 'LOW';

            // Get first scheduled station (for current location display)
            const scheduleEntries = Object.entries(train.schedule || {});
            const firstStation = scheduleEntries.length > 0 ? scheduleEntries[0][0] : 'Unknown';

            // Calculate delay
            let delay = 0;
            for (const [stationName, times] of scheduleEntries) {
                if (times.actualArrival && times.scheduledArrival) {
                    const scheduled = times.scheduledArrival.split(':');
                    const actual = times.actualArrival.split(':');
                    if (scheduled.length === 2 && actual.length === 2) {
                        const scheduledMin = parseInt(scheduled[0]) * 60 + parseInt(scheduled[1]);
                        const actualMin = parseInt(actual[0]) * 60 + parseInt(actual[1]);
                        delay = actualMin - scheduledMin;
                    }
                    break;
                }
            }

            return {
                train_id: train.trainId,
                train_number: train.trainNumber,
                train_name: train.trainName,
                train_type: train.trainType,
                priority: priorityLabel,
                current_station: firstStation.charAt(0).toUpperCase() + firstStation.slice(1),
                currentBlock: train.currentEdge || firstStation,
                delay: delay,
                speed: train.maxSpeed || 0,
                direction: train.direction,
                status: train.isEmergency ? 'EMERGENCY' : 'RUNNING',
                passengers: train.currentTrainPassenger,
                capacity: train.maxTrainCapacity,
                schedule: train.schedule,
                raw_schedule: train.schedule // Keep raw for filtering
            };
        });
    }, [trainData]);

    // Filter trains based on search and time
    useEffect(() => {
        let filtered = trains || [];

        // Apply time filter
        const selectedFilter = timeFilters.find(f => f.value === timeFilter);
        if (selectedFilter) {
            filtered = filtered.filter(train => isScheduledSoon(train.raw_schedule, selectedFilter.hours));
        }

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(train =>
                train.train_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                train.train_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredTrains(filtered);
    }, [trains, searchQuery, timeFilter]);

    return (
        <div
            className="h-full flex flex-col animate-fade-in rounded-xl overflow-hidden"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-6 py-3"
                style={{
                    borderBottom: '1px solid var(--border-primary)',
                    background: 'var(--bg-tertiary)'
                }}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="p-1.5 rounded-lg"
                        style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                    >
                        <TrainIcon size={16} style={{ color: 'var(--brand-blue, #3b82f6)' }} />
                    </div>
                    <div>
                        <h2
                            className="text-sm font-bold leading-none mb-1"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Incoming Trains
                        </h2>
                        <p
                            className="text-[10px] font-medium leading-none"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {filteredTrains.length} scheduled in next {timeFilters.find(f => f.value === timeFilter)?.hours}h
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Time Filters */}
                    <div
                        className="flex rounded-lg p-0.5"
                        style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-primary)'
                        }}
                    >
                        {timeFilters.map((filter) => (
                            <button
                                key={filter.value}
                                onClick={() => setTimeFilter(filter.value)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all"
                                style={timeFilter === filter.value
                                    ? {
                                        background: 'var(--brand-blue, #3b82f6)',
                                        color: 'white',
                                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                                    }
                                    : {
                                        color: 'var(--text-tertiary)',
                                        background: 'transparent'
                                    }
                                }
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative w-40 group">
                        <Search
                            size={12}
                            className="absolute left-2.5 top-1/2 transform -translate-y-1/2 transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                        />
                        <input
                            type="text"
                            placeholder="Search train..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs focus:outline-none transition-all"
                            style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Content - Horizontal Strip */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 scrollbar-thin">
                {filteredTrains.length === 0 ? (
                    <div
                        className="h-full flex flex-col items-center justify-center"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        <TrainIcon size={24} className="mb-2 opacity-40" />
                        <p className="text-xs font-medium">No trains scheduled in this window</p>
                    </div>
                ) : (
                    <div className="flex gap-3 h-full items-center">
                        {filteredTrains.map((train, index) => {
                            const delayInfo = getDelayStatus(train.delay || 0);

                            return (
                                <div
                                    key={train.train_id || index}
                                    className="group relative flex-shrink-0 w-64 h-full rounded-xl p-3 transition-all duration-300 hover:-translate-y-0.5"
                                    style={{
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-primary)',
                                        boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--brand-blue, #3b82f6)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-primary)';
                                        e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))';
                                    }}
                                >
                                    {/* Train Identity */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span
                                                    className="text-sm font-bold tracking-wide"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    {formatTrainNumber(train.train_number || train.train_id)}
                                                </span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getTrainTypeBadge(train.train_type)}`}>
                                                    {train.train_type?.substring(0, 3) || 'EXP'}
                                                </span>
                                            </div>
                                            <p
                                                className="text-[10px] font-medium truncate max-w-[140px]"
                                                title={train.train_name}
                                                style={{ color: 'var(--text-tertiary)' }}
                                            >
                                                {train.train_name || 'Unknown Train'}
                                            </p>
                                        </div>
                                        <div
                                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                            style={train.priority === 'HIGH'
                                                ? { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }
                                                : train.priority === 'MEDIUM'
                                                    ? { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }
                                                    : { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }
                                            }
                                        >
                                            P-{train.priority?.charAt(0)}
                                        </div>
                                    </div>

                                    {/* Status & Location */}
                                    <div className="space-y-1.5">
                                        <div
                                            className="flex items-center justify-between rounded px-2 py-1"
                                            style={{ background: 'var(--bg-tertiary)' }}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={10} style={{ color: 'var(--brand-orange, #ea7317)' }} />
                                                <span
                                                    className="text-[10px] font-medium"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    {(train.current_station || train.currentBlock || 'Unknown').substring(0, 15)}
                                                </span>
                                            </div>
                                            <span
                                                className="text-[10px] font-mono font-bold"
                                                style={{ color: 'var(--brand-blue, #3b82f6)' }}
                                            >
                                                {train.speed.toFixed(0)}
                                                <span
                                                    className="text-[8px]"
                                                    style={{ color: 'var(--text-tertiary)' }}
                                                >
                                                    km/h
                                                </span>
                                            </span>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                        style={delayInfo.color === 'green'
                                                            ? { background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }
                                                            : delayInfo.color === 'yellow'
                                                                ? { background: '#eab308', boxShadow: '0 0 8px rgba(234,179,8,0.6)' }
                                                                : { background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }
                                                        }
                                                    />
                                                    <span
                                                        className="text-[10px] font-bold truncate"
                                                        style={{
                                                            color: delayInfo.color === 'green' ? '#22c55e'
                                                                : delayInfo.color === 'yellow' ? '#eab308'
                                                                    : '#ef4444'
                                                        }}
                                                    >
                                                        {delayInfo.status}
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-[9px] font-medium flex-shrink-0 ml-2"
                                                    style={{ color: 'var(--text-tertiary)' }}
                                                >
                                                    {train.direction === 'forward' ? 'UP' : 'DN'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover Effect Decoration */}
                                    <div
                                        className="absolute bottom-0 left-0 w-full h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            background: 'linear-gradient(to right, transparent, var(--brand-blue, #3b82f6), transparent)'
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}