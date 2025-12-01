import { useState, useEffect } from 'react';
import { Search, Filter, Train as TrainIcon, Clock, MapPin, TrendingUp } from 'lucide-react';
import { getTrainTypeBadge, getPriorityBadge, getDelayStatus, formatTrainNumber } from '@/lib/trainUtils';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5000/api/section/6926a23c2b59850b5b5b28cf/display';
const REFRESH_INTERVAL = 5000; // 5 seconds

export default function IncomingTrains() {
    const [trains, setTrains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeFilter, setTimeFilter] = useState('6hr');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTrains, setFilteredTrains] = useState([]);

    const timeFilters = [
        { label: '3hr', value: '3hr' },
        { label: '6hr', value: '6hr' },
        { label: '12hr', value: '12hr' },
        { label: '24hr', value: '24hr' },
    ];

    // Fetch trains from API
    const fetchTrains = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Transform API data to match component format
            const transformedTrains = data.trains.map(train => ({
                train_id: train.id,
                train_number: train.number,
                train_name: train.name,
                train_type: train.type,
                priority: train.priority >= 10 ? 'HIGH' : train.priority >= 5 ? 'MEDIUM' : 'LOW',
                current_station: `Block ${train.blockId.slice(-4)}`,
                currentBlock: train.blockId,
                delay: train.delay_min,
                speed: train.speed_kmph,
                direction: train.direction,
                status: train.status,
                offset_m: train.offset_m,
                eta: null // Calculate if needed
            }));

            setTrains(transformedTrains);
            setError(null);
        } catch (err) {
            console.error('Error fetching trains:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and periodic refresh
    useEffect(() => {
        fetchTrains();
        const interval = setInterval(fetchTrains, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Filter trains based on search and time
    useEffect(() => {
        let filtered = trains || [];

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(train =>
                train.train_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                train.train_name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredTrains(filtered);
    }, [trains, searchQuery, timeFilter]);

    if (loading && trains.length === 0) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <TrainIcon
                        size={64}
                        className="mx-auto mb-4 opacity-20 animate-pulse"
                        style={{ color: 'var(--text-tertiary)' }}
                    />
                    <p className="text-lg font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        Loading trains...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg font-medium mb-2" style={{ color: '#ef4444' }}>
                        Error loading trains
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {error}
                    </p>
                    <button
                        onClick={fetchTrains}
                        className="mt-4 px-4 py-2 rounded-lg font-semibold"
                        style={{
                            background: 'var(--gradient-accent)',
                            color: '#ffffff'
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                    <div
                        className="p-2.5 rounded-lg"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <TrainIcon size={24} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <h2
                            className="text-l font-bold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Active Trains
                        </h2>
                        <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {filteredTrains.length} trains in section
                        </p>
                    </div>
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex space-x-2 mb-4 justify-center">
                {timeFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setTimeFilter(filter.value)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-105"
                        style={{
                            background: timeFilter === filter.value
                                ? 'var(--gradient-accent)'
                                : 'linear-gradient(135deg, #2C5282 0%, #1D2E4E 100%)',
                            color: timeFilter === filter.value ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: timeFilter === filter.value ? '0 4px 12px rgba(234, 115, 23, 0.3)' : 'none',
                            border: `1px solid ${timeFilter === filter.value ? 'transparent' : 'var(--border-primary)'}`
                        }}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                />
                <input
                    type="text"
                    placeholder="Search trains by number or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg font-medium transition-all duration-200 focus:scale-[1.02]"
                    style={{
                        background: 'var(--surface-glass)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                />
            </div>

            {/* Trains List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                {filteredTrains.length === 0 ? (
                    <div className="text-center py-16">
                        <TrainIcon
                            size={64}
                            className="mx-auto mb-4 opacity-20"
                            style={{ color: 'var(--text-tertiary)' }}
                        />
                        <p
                            className="text-lg font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            No active trains
                        </p>
                        <p
                            className="text-sm mt-2"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            {searchQuery ? 'Try a different search' : 'Waiting for incoming trains...'}
                        </p>
                    </div>
                ) : (
                    filteredTrains.map((train, index) => {
                        const delayInfo = getDelayStatus(train.delay || 0);

                        return (
                            <div
                                key={train.train_id || index}
                                className="card-hover p-4 animate-slide-in"
                                style={{
                                    background: 'var(--surface-card)',
                                    border: '1px solid var(--border-primary)',
                                    animationDelay: `${index * 0.05}s`
                                }}
                            >
                                {/* Header Row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span
                                                className="text-lg font-bold tracking-wide"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {formatTrainNumber(train.train_number || train.train_id)}
                                            </span>
                                            <span className={`badge ${getTrainTypeBadge(train.train_type)}`}>
                                                {train.train_type || 'Express'}
                                            </span>
                                        </div>
                                        <p
                                            className="text-sm font-semibold"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {train.train_name || 'Unknown Train'}
                                        </p>
                                    </div>
                                    <span className={`badge ${getPriorityBadge(train.priority)}`}>
                                        {train.priority || 'Medium'}
                                    </span>
                                </div>

                                {/* Info Grid */}
                                <div className="space-y-2">
                                    <div
                                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                                        style={{ background: 'var(--surface-glass)' }}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <MapPin size={16} style={{ color: 'var(--brand-orange)' }} />
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: 'var(--text-tertiary)' }}
                                            >
                                                Location
                                            </span>
                                        </div>
                                        <span
                                            className="text-sm font-bold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {train.current_station || train.currentBlock || 'Unknown'}
                                        </span>
                                    </div>

                                    <div
                                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                                        style={{ background: 'var(--surface-glass)' }}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <TrendingUp size={16} style={{ color: delayInfo.color === 'green' ? '#22c55e' : delayInfo.color === 'yellow' ? '#eab308' : '#ef4444' }} />
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: 'var(--text-tertiary)' }}
                                            >
                                                Status
                                            </span>
                                        </div>
                                        <span
                                            className="text-sm font-bold"
                                            style={{
                                                color: delayInfo.color === 'green' ? '#86efac' : delayInfo.color === 'yellow' ? '#fde047' : '#fca5a5'
                                            }}
                                        >
                                            {delayInfo.status}
                                        </span>
                                    </div>

                                    {train.speed && (
                                        <div
                                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                                            style={{ background: 'var(--surface-glass)' }}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <Clock size={16} style={{ color: 'var(--brand-blue)' }} />
                                                <span
                                                    className="text-xs font-medium"
                                                    style={{ color: 'var(--text-tertiary)' }}
                                                >
                                                    Speed
                                                </span>
                                            </div>
                                            <span
                                                className="text-sm font-bold font-mono"
                                                style={{ color: 'var(--text-primary)' }}
                                            >
                                                {train.speed.toFixed(1)} km/h
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}