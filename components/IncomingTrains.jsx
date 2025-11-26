import { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { Search, Filter, Train as TrainIcon } from 'lucide-react';
import { getTrainTypeBadge, getPriorityBadge, getDelayStatus, formatTrainNumber } from '@/lib/trainUtils';
import { format } from 'date-fns';

export default function IncomingTrains() {
    const { trains } = useWebSocket();
    const [timeFilter, setTimeFilter] = useState('6hr');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredTrains, setFilteredTrains] = useState([]);

    const timeFilters = [
        { label: '3hr', value: '3hr' },
        { label: '6hr', value: '6hr' },
        { label: '12hr', value: '12hr' },
        { label: '24hr', value: '24hr' },
    ];

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

    return (
        <div className="card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                    <TrainIcon size={24} className="mr-2 text-ir-orange" />
                    Active Trains
                </h2>
                <div className="text-sm text-ir-cream/70">
                    {filteredTrains.length} trains
                </div>
            </div>

            {/* Time Filters */}
            <div className="flex space-x-2 mb-4">
                {timeFilters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setTimeFilter(filter.value)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${timeFilter === filter.value
                                ? 'bg-ir-orange text-white'
                                : 'bg-white/5 text-ir-cream hover:bg-white/10'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search trains..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ir-orange"
                />
            </div>

            {/* Trains List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {filteredTrains.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <TrainIcon size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No active trains</p>
                    </div>
                ) : (
                    filteredTrains.map((train, index) => {
                        const delayInfo = getDelayStatus(train.delay || 0);

                        return (
                            <div
                                key={train.train_id || index}
                                className="card-hover border border-white/10 hover:border-ir-orange/50"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-lg font-bold text-white">
                                                {formatTrainNumber(train.train_number || train.train_id)}
                                            </span>
                                            <span className={`badge ${getTrainTypeBadge(train.train_type)}`}>
                                                {train.train_type || 'Express'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-ir-cream font-medium">
                                            {train.train_name || 'Unknown Train'}
                                        </p>
                                    </div>
                                    <span className={`badge ${getPriorityBadge(train.priority)}`}>
                                        {train.priority || 'Medium'}
                                    </span>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between text-gray-300">
                                        <span>Location:</span>
                                        <span className="text-white font-medium">
                                            {train.current_station || train.currentBlock || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-300">
                                        <span>Status:</span>
                                        <span className={`font-medium text-${delayInfo.color}-400`}>
                                            {delayInfo.status}
                                        </span>
                                    </div>
                                    {train.eta && (
                                        <div className="flex justify-between text-gray-300">
                                            <span>ETA:</span>
                                            <span className="text-white font-medium">
                                                {typeof train.eta === 'string' ? train.eta : format(new Date(train.eta), 'HH:mm')}
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
