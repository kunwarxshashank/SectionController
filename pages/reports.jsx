import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Layout from '@/components/Layout';
import { FileText, Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
    const router = useRouter();
    const { authenticated, loading } = useAuth();
    const [reportType, setReportType] = useState('daily');

    // Mock data for charts
    const punctualityData = [
        { day: 'Mon', onTime: 85, delayed: 15 },
        { day: 'Tue', onTime: 88, delayed: 12 },
        { day: 'Wed', onTime: 82, delayed: 18 },
        { day: 'Thu', onTime: 90, delayed: 10 },
        { day: 'Fri', onTime: 87, delayed: 13 },
        { day: 'Sat', onTime: 85, delayed: 15 },
        { day: 'Sun', onTime: 92, delayed: 8 },
    ];

    const throughputData = [
        { hour: '00:00', trains: 12 },
        { hour: '04:00', trains: 8 },
        { hour: '08:00', trains: 24 },
        { hour: '12:00', trains: 28 },
        { hour: '16:00', trains: 30 },
        { hour: '20:00', trains: 22 },
    ];

    const trainTypeData = [
        { name: 'Express', value: 45, color: '#ef4444' },
        { name: 'Freight', value: 30, color: '#fbbf24' },
        { name: 'Local', value: 20, color: '#3b82f6' },
        { name: 'Special', value: 5, color: '#8b5cf6' },
    ];

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
                    <h1 className="text-3xl font-bold text-white font-railway">
                        📊 Reports & Analytics
                    </h1>
                    <button className="btn-primary flex items-center space-x-2">
                        <Download size={18} />
                        <span>Export PDF</span>
                    </button>
                </div>

                {/* Report Type Selector */}
                <div className="flex space-x-4 mb-6">
                    {['daily', 'weekly', 'monthly'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setReportType(type)}
                            className={`px-6 py-3 rounded-lg font-medium capitalize transition-all ${reportType === type
                                    ? 'bg-ir-orange text-white shadow-lg'
                                    : 'glass-dark text-ir-cream hover:bg-white/10'
                                }`}
                        >
                            <Calendar className="inline mr-2" size={18} />
                            {type}
                        </button>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-6 mb-6">
                    <div className="card">
                        <p className="text-sm text-gray-400 mb-2">Total Trains</p>
                        <p className="text-3xl font-bold text-white mb-1">156</p>
                        <div className="flex items-center text-green-400 text-sm">
                            <TrendingUp size={16} className="mr-1" />
                            <span>+8% from last week</span>
                        </div>
                    </div>

                    <div className="card">
                        <p className="text-sm text-gray-400 mb-2">Avg Delay</p>
                        <p className="text-3xl font-bold text-white mb-1">4.2 min</p>
                        <div className="flex items-center text-green-400 text-sm">
                            <TrendingDown size={16} className="mr-1" />
                            <span>-12% improvement</span>
                        </div>
                    </div>

                    <div className="card">
                        <p className="text-sm text-gray-400 mb-2">Punctuality</p>
                        <p className="text-3xl font-bold text-white mb-1">87%</p>
                        <div className="flex items-center text-green-400 text-sm">
                            <TrendingUp size={16} className="mr-1" />
                            <span>+3% from last week</span>
                        </div>
                    </div>

                    <div className="card">
                        <p className="text-sm text-gray-400 mb-2">AI Actions</p>
                        <p className="text-3xl font-bold text-white mb-1">42</p>
                        <div className="flex items-center text-yellow-400 text-sm">
                            <span>24 accepted, 18 overridden</span>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                    {/* Punctuality Chart */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-white mb-4">Punctuality Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={punctualityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="day" stroke="#999" />
                                <YAxis stroke="#999" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #444' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="onTime" fill="#10b981" name="On Time %" />
                                <Bar dataKey="delayed" fill="#ef4444" name="Delayed %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Throughput Chart */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-white mb-4">Section Throughput</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={throughputData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="hour" stroke="#999" />
                                <YAxis stroke="#999" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #444' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="trains" stroke="#EA7317" strokeWidth={3} name="Trains/Period" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    {/* Train Type Distribution */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-white mb-4">Train Type Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={trainTypeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {trainTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Recent Events */}
                    <div className="card">
                        <h3 className="text-xl font-semibold text-white mb-4">Recent Events</h3>
                        <div className="space-y-3">
                            {[
                                { type: 'success', message: 'Train 12345 departed on time', time: '10:32 AM' },
                                { type: 'warning', message: 'Speed restriction at Block-5', time: '10:15 AM' },
                                { type: 'info', message: 'AI recommended priority change', time: '09:45 AM' },
                                { type: 'success', message: 'Section clearance completed', time: '09:20 AM' },
                            ].map((event, idx) => (
                                <div key={idx} className="flex items-start space-x-3 glass-dark p-3 rounded-lg">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${event.type === 'success' ? 'bg-green-500' :
                                            event.type === 'warning' ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                        }`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-white">{event.message}</p>
                                        <p className="text-xs text-gray-400 mt-1">{event.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
