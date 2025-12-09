import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { selectAdmin, selectIsAuthenticated, selectAuthLoading } from '@/store/slices/adminSlice';
import { setCallLogs, setLoading as setCallLogsLoading, selectCallLogs, selectCallLogsLoading } from '@/store/slices/callLogsSlice';
import Layout from '@/components/Layout';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight, Phone, PhoneIncoming, PhoneOutgoing, Clock, FileText, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { format } from 'date-fns';

export default function LogsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);
    const admin = useSelector(selectAdmin);
    const [activeTab, setActiveTab] = useState('activity');

    // Activity logs state
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Call logs from Redux
    const callLogs = useSelector(selectCallLogs);
    const loadingCallLogs = useSelector(selectCallLogsLoading);
    const [expandedTranscript, setExpandedTranscript] = useState(null);

    // AI Recommendation logs state
    const [aiLogs, setAiLogs] = useState([]);
    const [loadingAiLogs, setLoadingAiLogs] = useState(false);

    // Mock activity logs data
    const mockLogs = [
        {
            _id: '1',
            action: 'HOLD',
            message: 'Train 12345 held at Block-3 for 5 minutes',
            performedBy: { email: 'admin@railway.gov.in' },
            trainId: { name: 'Jhelum Express' },
            createdAt: new Date(Date.now() - 3600000),
        },
        {
            _id: '2',
            action: 'PRIORITY_CHANGE',
            message: 'Priority changed for Train 11078 from Medium to High',
            performedBy: { email: 'admin@railway.gov.in' },
            trainId: { name: 'Rajdhani Express' },
            createdAt: new Date(Date.now() - 7200000),
        },
        {
            _id: '3',
            action: 'REROUTE',
            message: 'Train 22692 rerouted to Platform 3',
            performedBy: { email: 'admin@railway.gov.in' },
            trainId: { name: 'Superfast Express' },
            createdAt: new Date(Date.now() - 10800000),
        },
        {
            _id: '4',
            action: 'SIGNAL_CHANGE',
            message: 'Signal at Block-5 changed to RED',
            performedBy: { email: 'system@railway.gov.in' },
            trainId: null,
            createdAt: new Date(Date.now() - 14400000),
        },
    ];

    // Mock AI recommendation logs
    const mockAiLogs = [
        {
            _id: 'ai1',
            recommendation: 'Reduce speed of Train 12345 to 40 km/h approaching Block-7',
            reason: 'Congestion detected ahead',
            status: 'ACCEPTED',
            trainId: { name: 'Jhelum Express' },
            createdAt: new Date(Date.now() - 1800000),
        },
        {
            _id: 'ai2',
            recommendation: 'Divert Train 11078 to alternate route via Platform 5',
            reason: 'Platform 3 maintenance in progress',
            status: 'REJECTED',
            trainId: { name: 'Rajdhani Express' },
            createdAt: new Date(Date.now() - 5400000),
        },
        {
            _id: 'ai3',
            recommendation: 'Hold Train 22692 for 3 minutes at Block-2',
            reason: 'Allow priority train to pass',
            status: 'PENDING',
            trainId: { name: 'Superfast Express' },
            createdAt: new Date(Date.now() - 9000000),
        },
    ];

    useEffect(() => {
        if (activeTab === 'activity') {
            loadLogs();
        } else if (activeTab === 'calls') {
            loadCallLogs();
        } else if (activeTab === 'ai') {
            loadAiLogs();
        }
    }, [activeTab, currentPage]);

    useEffect(() => {
        filterLogs();
    }, [logs, searchQuery, actionFilter]);

    const loadLogs = async () => {
        setLoadingLogs(true);
        try {
            setLogs(mockLogs);
            setTotalPages(1);
        } catch (error) {
            console.error('Error loading logs:', error);
            setLogs(mockLogs);
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadCallLogs = async () => {
        dispatch(setCallLogsLoading(true));
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/call-logs?callerId=${admin?.email}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                dispatch(setCallLogs(data.data || []));
            } else {
                dispatch(setCallLogs([]));
            }
        } catch (error) {
            console.error('Error loading call logs:', error);
            dispatch(setCallLogs([]));
        }
    };

    const loadAiLogs = async () => {
        setLoadingAiLogs(true);
        try {
            // Using mock data for AI logs
            setAiLogs(mockAiLogs);
        } catch (error) {
            console.error('Error loading AI logs:', error);
            setAiLogs(mockAiLogs);
        } finally {
            setLoadingAiLogs(false);
        }
    };

    const filterLogs = () => {
        let filtered = logs;

        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => log.action === actionFilter);
        }

        if (searchQuery) {
            filtered = filtered.filter(log =>
                log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.trainId?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredLogs(filtered);
    };

    const getActionBadge = (action) => {
        const badges = {
            HOLD: 'badge-medium',
            PRIORITY_CHANGE: 'badge-high',
            REROUTE: 'badge-freight',
            SIGNAL_CHANGE: 'badge-express',
            SPEED_CHANGE: 'badge-low',
        };
        return badges[action] || 'badge-low';
    };

    const getAiStatusBadge = (status) => {
        const badges = {
            ACCEPTED: 'bg-green-500/20 text-green-400',
            REJECTED: 'bg-red-500/20 text-red-400',
            PENDING: 'bg-yellow-500/20 text-yellow-400',
        };
        return badges[status] || 'bg-gray-500/20 text-gray-400';
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const toggleTranscript = (callId) => {
        setExpandedTranscript(expandedTranscript === callId ? null : callId);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!authenticated) {
        router.push('/login');
        return null;
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold font-railway" style={{ color: 'var(--text-primary)' }}>
                        📜 System Logs
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex space-x-2 mb-6">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'activity' ? 'shadow-lg' : 'glass-dark hover:bg-white/10'
                            }`}
                        style={activeTab === 'activity' ? {
                            background: 'var(--gradient-accent)',
                            color: 'white'
                        } : {
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <ScrollText size={18} />
                        <span>Activity Logs</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'ai' ? 'shadow-lg' : 'glass-dark hover:bg-white/10'
                            }`}
                        style={activeTab === 'ai' ? {
                            background: 'var(--gradient-accent)',
                            color: 'white'
                        } : {
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <Brain size={18} />
                        <span>AI Recommendations</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('calls')}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all ${activeTab === 'calls' ? 'shadow-lg' : 'glass-dark hover:bg-white/10'
                            }`}
                        style={activeTab === 'calls' ? {
                            background: 'var(--gradient-accent)',
                            color: 'white'
                        } : {
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <Phone size={18} />
                        <span>Call Logs</span>
                    </button>
                </div>

                {/* Activity Logs Tab */}
                {activeTab === 'activity' && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search logs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ir-orange"
                                />
                            </div>

                            {/* Action Filter */}
                            <div className="flex items-center space-x-2">
                                <Filter size={18} className="text-gray-400" />
                                <select
                                    value={actionFilter}
                                    onChange={(e) => setActionFilter(e.target.value)}
                                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-ir-orange"
                                >
                                    <option value="all">All Actions</option>
                                    <option value="HOLD">Hold</option>
                                    <option value="PRIORITY_CHANGE">Priority Change</option>
                                    <option value="REROUTE">Reroute</option>
                                    <option value="SIGNAL_CHANGE">Signal Change</option>
                                    <option value="SPEED_CHANGE">Speed Change</option>
                                </select>
                            </div>
                        </div>

                        {loadingLogs ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-gray-400 text-left">
                                        <tr>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3">Action</th>
                                            <th className="px-4 py-3">Train</th>
                                            <th className="px-4 py-3">Message</th>
                                            <th className="px-4 py-3">Performed By</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: 'var(--text-primary)' }}>
                                        {filteredLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                                    No logs found
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLogs.map((log) => (
                                                <tr key={log._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`badge ${getActionBadge(log.action)}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {log.trainId?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 max-w-md truncate">
                                                        {log.message}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-400">
                                                        {log.performedBy?.email || 'System'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Recommendations Tab */}
                {activeTab === 'ai' && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                AI Recommendation History
                            </h2>
                            <div className="text-sm text-gray-400">
                                Total: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{aiLogs.length}</span>
                            </div>
                        </div>

                        {loadingAiLogs ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {aiLogs.length === 0 ? (
                                    <div className="text-center text-gray-400 py-12">
                                        No AI recommendations found
                                    </div>
                                ) : (
                                    aiLogs.map((log) => (
                                        <div key={log._id} className="glass-dark p-4 rounded-xl border border-white/10">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                                        <Brain size={20} className="text-purple-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {log.recommendation}
                                                        </p>
                                                        <p className="text-sm text-gray-400 mt-1">
                                                            Reason: {log.reason}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAiStatusBadge(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                                                <span>Train: {log.trainId?.name || 'N/A'}</span>
                                                <span>•</span>
                                                <span>{format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Call Logs Tab */}
                {activeTab === 'calls' && (
                    <div className="card mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Call History
                            </h2>
                            <div className="text-sm text-gray-400">
                                Total Calls: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{callLogs.length}</span>
                            </div>
                        </div>

                        {loadingCallLogs ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="spinner"></div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {callLogs.length === 0 ? (
                                    <div className="text-center text-gray-400 py-12">
                                        <Phone size={48} className="mx-auto mb-4 opacity-50" />
                                        <p>No call logs found</p>
                                        <p className="text-sm mt-2">Your call history will appear here</p>
                                    </div>
                                ) : (
                                    callLogs.map((call) => (
                                        <div key={call._id} className="glass-dark p-4 rounded-xl border border-white/10">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${call.callType === 'outgoing' ? 'bg-blue-500/20' : 'bg-green-500/20'
                                                        }`}>
                                                        {call.callType === 'outgoing' ? (
                                                            <PhoneOutgoing size={20} className="text-blue-400" />
                                                        ) : (
                                                            <PhoneIncoming size={20} className="text-green-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {call.callType === 'outgoing' ? call.calleeName : call.callerId}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                                            <span className={`px-2 py-0.5 rounded text-xs ${call.callType === 'outgoing' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'
                                                                }`}>
                                                                {call.callType === 'outgoing' ? 'Outgoing' : 'Incoming'}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {formatDuration(call.duration)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">
                                                        {format(new Date(call.startTime), 'dd/MM/yyyy')}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {format(new Date(call.startTime), 'HH:mm')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Transcript Toggle */}
                                            {call.transcript && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <button
                                                        onClick={() => toggleTranscript(call._id)}
                                                        className="flex items-center gap-2 text-sm text-ir-orange hover:text-ir-orange/80 transition-colors"
                                                    >
                                                        <FileText size={14} />
                                                        <span>{expandedTranscript === call._id ? 'Hide' : 'Show'} Transcript</span>
                                                        {expandedTranscript === call._id ? (
                                                            <ChevronUp size={14} />
                                                        ) : (
                                                            <ChevronDown size={14} />
                                                        )}
                                                    </button>

                                                    {expandedTranscript === call._id && (
                                                        <div className="mt-3 p-3 bg-black/30 rounded-lg">
                                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">
                                                                {call.transcript || 'No transcript available'}
                                                            </p>
                                                            {call.transcriptSegments && call.transcriptSegments.length > 0 && (
                                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                                    <p className="text-xs text-gray-500 mb-2">Segments:</p>
                                                                    {call.transcriptSegments.map((segment, idx) => (
                                                                        <div key={idx} className="text-xs text-gray-400 mb-1">
                                                                            <span className="text-gray-500">
                                                                                [{format(new Date(segment.timestamp), 'HH:mm:ss')}]
                                                                            </span>{' '}
                                                                            {segment.text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!call.transcript && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        <FileText size={12} />
                                                        No transcript recorded
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination for Activity Logs */}
                {activeTab === 'activity' && totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center space-x-1"
                            >
                                <ChevronLeft size={16} />
                                <span>Previous</span>
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center space-x-1"
                            >
                                <span>Next</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
