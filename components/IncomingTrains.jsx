import { useState, useEffect } from 'react';
import { Search, Filter, Train as TrainIcon, Clock, MapPin, TrendingUp } from 'lucide-react';
import { getTrainTypeBadge, getPriorityBadge, getDelayStatus, formatTrainNumber } from '@/lib/trainUtils';
import { format } from 'date-fns';

const API_URL = 'http://localhost:5000/api/section/692ea55789d2e3506f170bb5/display';
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
        <div className="card h-full flex flex-col animate-fade-in" style={{ padding: '12px' }}>
            {/* Header with Search on Right */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5">
                    <div
                        className="p-1 rounded-lg"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <TrainIcon size={12} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <h2
                            className="text-xs font-bold leading-tight"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Active Trains
                        </h2>
                        <p
                            className="font-medium leading-tight"
                            style={{ color: 'var(--text-tertiary)', fontSize: '9px' }}
                        >
                            {filteredTrains.length} in section
                        </p>
                    </div>
                </div>

                {/* Search on Right */}
                <div className="relative" style={{ width: '140px' }}>
                    <Search
                        size={10}
                        className="absolute left-1.5 top-1/2 transform -translate-y-1/2"
                        style={{ color: 'var(--text-tertiary)' }}
                    />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-5 pr-1.5 py-1 rounded font-medium transition-all"
                        style={{
                            background: 'var(--surface-glass)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '9px'
                        }}
                    />
                </div>
            </div>

            {/* Trains List - Horizontal Scroll */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                {filteredTrains.length === 0 ? (
                    <div className="text-center py-4">
                        <TrainIcon
                            size={32}
                            className="mx-auto mb-2 opacity-20"
                            style={{ color: 'var(--text-tertiary)' }}
                        />
                        <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {searchQuery ? 'No trains found' : 'No active trains'}
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2 pb-1">
                        {filteredTrains.map((train, index) => {
                            const delayInfo = getDelayStatus(train.delay || 0);

                            return (
                                <div
                                    key={train.train_id || index}
                                    className="card-hover animate-slide-in flex-shrink-0"
                                    style={{
                                        background: 'var(--surface-card)',
                                        border: '1px solid var(--border-primary)',
                                        animationDelay: `${index * 0.05}s`,
                                        minWidth: '180px',
                                        maxWidth: '180px',
                                        padding: '8px'
                                    }}
                                >
                                    {/* Compact Header */}
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-0.5 mb-0.5">
                                                <span
                                                    className="font-bold tracking-wide truncate"
                                                    style={{ color: 'var(--text-primary)', fontSize: '9px' }}
                                                >
                                                    {formatTrainNumber(train.train_number || train.train_id)}
                                                </span>
                                                <span className={`badge ${getTrainTypeBadge(train.train_type)}`}
                                                    style={{ fontSize: '7px', padding: '1px 3px' }}
                                                >
                                                    {train.train_type?.substring(0, 3) || 'EXP'}
                                                </span>
                                            </div>
                                            <p
                                                className="font-semibold truncate"
                                                style={{ color: 'var(--text-secondary)', fontSize: '8px' }}
                                                title={train.train_name}
                                            >
                                                {train.train_name || 'Unknown Train'}
                                            </p>
                                        </div>
                                        <span className={`badge ${getPriorityBadge(train.priority)}`}
                                            style={{ fontSize: '7px', padding: '1px 3px' }}
                                        >
                                            {train.priority?.substring(0, 1) || 'M'}
                                        </span>
                                    </div>

                                    {/* Ultra Compact Info */}
                                    <div className="space-y-0.5">
                                        <div
                                            className="flex items-center justify-between px-1 py-0.5 rounded"
                                            style={{ background: 'var(--surface-glass)' }}
                                        >
                                            <div className="flex items-center gap-0.5">
                                                <MapPin size={8} style={{ color: 'var(--brand-orange)' }} />
                                                <span
                                                    className="font-medium"
                                                    style={{ color: 'var(--text-tertiary)', fontSize: '8px' }}
                                                >
                                                    Loc
                                                </span>
                                            </div>
                                            <span
                                                className="font-bold truncate ml-1"
                                                style={{ color: 'var(--text-primary)', fontSize: '8px' }}
                                                title={train.current_station || train.currentBlock}
                                            >
                                                {(train.current_station || train.currentBlock || 'Unknown').substring(0, 10)}
                                            </span>
                                        </div>

                                        <div
                                            className="flex items-center justify-between px-1 py-0.5 rounded"
                                            style={{ background: 'var(--surface-glass)' }}
                                        >
                                            <div className="flex items-center gap-0.5">
                                                <TrendingUp size={8} style={{ color: delayInfo.color === 'green' ? '#22c55e' : delayInfo.color === 'yellow' ? '#eab308' : '#ef4444' }} />
                                                <span
                                                    className="font-medium"
                                                    style={{ color: 'var(--text-tertiary)', fontSize: '8px' }}
                                                >
                                                    Status
                                                </span>
                                            </div>
                                            <span
                                                className="font-bold"
                                                style={{
                                                    color: delayInfo.color === 'green' ? '#86efac' : delayInfo.color === 'yellow' ? '#fde047' : '#fca5a5',
                                                    fontSize: '8px'
                                                }}
                                            >
                                                {delayInfo.status}
                                            </span>
                                        </div>

                                        {train.speed && (
                                            <div
                                                className="flex items-center justify-between px-1 py-0.5 rounded"
                                                style={{ background: 'var(--surface-glass)' }}
                                            >
                                                <div className="flex items-center gap-0.5">
                                                    <Clock size={8} style={{ color: 'var(--brand-blue)' }} />
                                                    <span
                                                        className="font-medium"
                                                        style={{ color: 'var(--text-tertiary)', fontSize: '8px' }}
                                                    >
                                                        Speed
                                                    </span>
                                                </div>
                                                <span
                                                    className="font-bold font-mono"
                                                    style={{ color: 'var(--text-primary)', fontSize: '8px' }}
                                                >
                                                    {train.speed.toFixed(0)} km/h
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}