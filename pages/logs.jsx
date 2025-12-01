import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchLogsApi } from '@/lib/api';
import { format } from 'date-fns';

export default function LogsPage() {
    const router = useRouter();
    const { authenticated, loading } = useAuth();
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Mock logs data
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

    useEffect(() => {
        loadLogs();
    }, [currentPage]);

    useEffect(() => {
        filterLogs();
    }, [logs, searchQuery, actionFilter]);

    const loadLogs = async () => {
        setLoadingLogs(true);
        try {
            // Try to fetch from API, fallback to mock data
            // const data = await fetchLogsApi({ page: currentPage, limit: 50 });
            // setLogs(data.logs || []);
            // setTotalPages(data.totalPages || 1);

            // Using mock data for now
            setLogs(mockLogs);
            setTotalPages(1);
        } catch (error) {
            console.error('Error loading logs:', error);
            setLogs(mockLogs);
        } finally {
            setLoadingLogs(false);
        }
    };

    const filterLogs = () => {
        let filtered = logs;

        // Apply action filter
        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => log.action === actionFilter);
        }

        // Apply search filter
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
                        📜 Activity Logs
                    </h1>
                    <div className="text-sm text-gray-400">
                        Total Logs: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{logs.length}</span>
                    </div>
                </div>

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

                    {/* Logs Table */}
                    {loadingLogs ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <>
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

                            {/* Pagination */}
                            {totalPages > 1 && (
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
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
}
