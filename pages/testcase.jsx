import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/slices/adminSlice';
import { selectSectionData, selectTrainData } from '@/store/slices/stationSlice';
import Layout from '@/components/Layout';
import {
    Beaker, MapPin, Radio, Package, Zap, GitBranch,
    Loader2, TrendingUp, AlertTriangle, CheckCircle,
    ArrowUpCircle, ArrowDownCircle, ChevronRight
} from 'lucide-react';
import { testCaseLoopApi, testCaseSignallingApi, testCaseFreightApi, testCaseAutoBlockUpgradeApi, testCaseLoopSimulateApi } from '@/lib/api';

/**
 * Test Cases Page
 * 
 * 5 Separate Test Cases:
 * 1. Where to add loop line - Find best station
 * 2. Where to add automatic signalling - Find best sections
 * 3. What if we add more freight trains - Capacity analysis
 * 4. Auto Block Upgrade - What-if for upgrading a segment to automatic signalling
 * 5. Loop Placement Simulator - Simulate adding a loop at a specific station
 */
export default function TestCasePage() {
    const router = useRouter();
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);
    const sectionData = useSelector(selectSectionData);
    const trainData = useSelector(selectTrainData);

    const [activeTestCase, setActiveTestCase] = useState(null);
    const [testLoading, setTestLoading] = useState(null);
    const [error, setError] = useState(null);
    const [results, setResults] = useState({
        loop: null,
        signalling: null,
        freight: null,
        autoblockupgrade: null,
        loopsimulator: null
    });

    // Station selection for auto block upgrade
    const [fromStationId, setFromStationId] = useState('');
    const [toStationId, setToStationId] = useState('');

    // Station selection for loop placement simulator
    const [targetStationId, setTargetStationId] = useState('');

    // Get available stations from section data
    const stations = sectionData?.stations || [];

    const testCases = [
        {
            id: 'loop',
            title: 'Where to Add Loop Line',
            description: 'Find the best station to add a loop for maximum freight throughput',
            icon: MapPin,
            color: '#22c55e',
            gradient: 'from-green-500 to-emerald-600',
            api: testCaseLoopApi
        },
        {
            id: 'signalling',
            title: 'Where to Add Automatic Signalling',
            description: 'Find the best block sections to upgrade to automatic signalling',
            icon: Radio,
            color: '#8b5cf6',
            gradient: 'from-purple-500 to-violet-600',
            api: testCaseSignallingApi
        },
        {
            id: 'freight',
            title: 'What If We Add More Freight',
            description: 'Simulate adding extra freight trains and see impact on schedule',
            icon: Package,
            color: '#f97316',
            gradient: 'from-orange-500 to-amber-600',
            api: testCaseFreightApi
        },
        {
            id: 'autoblockupgrade',
            title: 'Auto Block Upgrade What-If',
            description: 'Simulate upgrading a segment to automatic signalling',
            icon: Zap,
            color: '#eab308',
            gradient: 'from-yellow-500 to-amber-600',
            api: testCaseAutoBlockUpgradeApi
        },
        {
            id: 'loopsimulator',
            title: 'Loop Placement Simulator',
            description: 'Simulate adding a loop at a specific station and see impact',
            icon: GitBranch,
            color: '#06b6d4',
            gradient: 'from-cyan-500 to-teal-600',
            api: testCaseLoopSimulateApi
        }
    ];

    const runTestCase = async (testCase) => {
        if (!sectionData || !trainData) {
            setError('No section or train data available. Please login first.');
            return;
        }

        // Special validation for auto block upgrade
        if (testCase.id === 'autoblockupgrade') {
            if (!fromStationId || !toStationId) {
                setError('Please select both From Station and To Station for Auto Block Upgrade.');
                return;
            }
            if (fromStationId === toStationId) {
                setError('From Station and To Station must be different.');
                return;
            }
        }

        // Special validation for loop simulator
        if (testCase.id === 'loopsimulator') {
            if (!targetStationId) {
                setError('Please select a Target Station for Loop Placement Simulator.');
                return;
            }
        }

        setActiveTestCase(testCase.id);
        setTestLoading(testCase.id);
        setError(null);

        try {
            let result;
            if (testCase.id === 'autoblockupgrade') {
                result = await testCase.api(sectionData, trainData, fromStationId, toStationId);
            } else if (testCase.id === 'loopsimulator') {
                result = await testCase.api(sectionData, trainData, targetStationId);
            } else {
                result = await testCase.api(sectionData, trainData);
            }
            setResults(prev => ({ ...prev, [testCase.id]: result }));
        } catch (err) {
            setError(`${testCase.title} failed: ${err.message}`);
            console.error(err);
        } finally {
            setTestLoading(null);
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'HIGH': return 'text-red-500';
            case 'MEDIUM': return 'text-yellow-500';
            default: return 'text-green-500';
        }
    };

    const getRecommendationBadge = (rec) => {
        switch (rec) {
            case 'SAFE': return { bg: 'bg-green-500', text: '✓ Safe' };
            case 'CAUTION': return { bg: 'bg-yellow-500', text: '⚠ Caution' };
            default: return { bg: 'bg-red-500', text: '✕ Not Recommended' };
        }
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
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                            <Beaker size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold font-railway" style={{ color: 'var(--text-primary)' }}>
                                🧪 Infrastructure Test Cases
                            </h1>
                            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                Run infrastructure analysis scenarios
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-400" />
                            <span className="text-red-400">{error}</span>
                        </div>
                    </div>
                )}

                {/* Test Case Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {testCases.map((tc) => {
                        const Icon = tc.icon;
                        const isActive = activeTestCase === tc.id;
                        const isLoading = testLoading === tc.id;
                        const hasResults = results[tc.id] !== null;

                        return (
                            <div
                                key={tc.id}
                                className={`card cursor-pointer transition-all duration-300 hover:scale-105 ${isActive ? 'ring-2' : ''}`}
                                style={{
                                    borderColor: isActive ? tc.color : 'var(--border-primary)',
                                    boxShadow: isActive ? `0 0 20px ${tc.color}40` : undefined
                                }}
                                onClick={() => runTestCase(tc)}
                            >
                                {/* Icon & Title */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className={`p-3 rounded-xl bg-gradient-to-br ${tc.gradient} shadow-lg`}
                                    >
                                        <Icon size={24} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {tc.title}
                                        </h3>
                                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                            Test Case {testCases.indexOf(tc) + 1}
                                        </p>
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    {tc.description}
                                </p>

                                {/* Station Selection for Auto Block Upgrade */}
                                {tc.id === 'autoblockupgrade' && (
                                    <div className="space-y-2 mb-4" onClick={(e) => e.stopPropagation()}>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">From Station</label>
                                            <select
                                                value={fromStationId}
                                                onChange={(e) => setFromStationId(e.target.value)}
                                                className="w-full p-2 rounded-lg text-sm"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-primary)'
                                                }}
                                            >
                                                <option value="">Select station...</option>
                                                {stations.map((station) => (
                                                    <option key={station.stationId || station._id} value={station.stationId || station._id}>
                                                        {station.stationName} ({station.stationCode || station.stationId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">To Station</label>
                                            <select
                                                value={toStationId}
                                                onChange={(e) => setToStationId(e.target.value)}
                                                className="w-full p-2 rounded-lg text-sm"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-primary)'
                                                }}
                                            >
                                                <option value="">Select station...</option>
                                                {stations.map((station) => (
                                                    <option key={station.stationId || station._id} value={station.stationId || station._id}>
                                                        {station.stationName} ({station.stationCode || station.stationId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Station Selection for Loop Simulator */}
                                {tc.id === 'loopsimulator' && (
                                    <div className="space-y-2 mb-4" onClick={(e) => e.stopPropagation()}>
                                        <div>
                                            <label className="text-xs text-gray-400 block mb-1">Target Station</label>
                                            <select
                                                value={targetStationId}
                                                onChange={(e) => setTargetStationId(e.target.value)}
                                                className="w-full p-2 rounded-lg text-sm"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    color: 'var(--text-primary)',
                                                    border: '1px solid var(--border-primary)'
                                                }}
                                            >
                                                <option value="">Select station...</option>
                                                {stations.map((station) => (
                                                    <option key={station.stationId || station._id} value={station.stationId || station._id}>
                                                        {station.stationName} ({station.stationCode || station.stationId})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Run Button */}
                                <button
                                    disabled={isLoading}
                                    className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                                    style={{
                                        background: `linear-gradient(135deg, ${tc.color} 0%, ${tc.color}dd 100%)`,
                                        boxShadow: `0 4px 15px ${tc.color}40`
                                    }}
                                >
                                    {isLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Running...</>
                                    ) : hasResults ? (
                                        <><CheckCircle size={16} /> View Results</>
                                    ) : (
                                        <><Beaker size={16} /> Run Test Case</>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Results Panel */}
                {activeTestCase && results[activeTestCase] && (
                    <div className="card" style={{ border: `1px solid ${testCases.find(t => t.id === activeTestCase)?.color}40` }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div
                                className={`p-2 rounded-lg bg-gradient-to-br ${testCases.find(t => t.id === activeTestCase)?.gradient}`}
                            >
                                {activeTestCase === 'loop' && <MapPin size={20} className="text-white" />}
                                {activeTestCase === 'signalling' && <Radio size={20} className="text-white" />}
                                {activeTestCase === 'freight' && <Package size={20} className="text-white" />}
                                {activeTestCase === 'autoblockupgrade' && <Zap size={20} className="text-white" />}
                                {activeTestCase === 'loopsimulator' && <GitBranch size={20} className="text-white" />}
                            </div>
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                {testCases.find(t => t.id === activeTestCase)?.title} Results
                            </h2>
                        </div>

                        {/* Loop Results */}
                        {activeTestCase === 'loop' && results.loop && (
                            <div className="space-y-4">
                                {/* Best Station */}
                                {results.loop.bestStationToAddLoop && (
                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                        <div className="text-xs font-medium text-green-400 mb-2">RECOMMENDED LOCATION</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-green-500/20">
                                                    <MapPin size={32} className="text-green-500" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-green-400">
                                                        {results.loop.bestStationToAddLoop.stationName}
                                                    </div>
                                                    <div className="text-sm text-gray-400">
                                                        Station Code: {results.loop.bestStationToAddLoop.stationCode}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-bold text-green-400">
                                                    +{results.loop.bestStationToAddLoop.estimatedExtraFreightTrainsIfOneMoreLoop}
                                                </div>
                                                <div className="text-sm text-gray-400">extra freight trains/day</div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-4 gap-4 mt-4">
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">UP Loops</div>
                                                <div className="text-lg font-bold text-green-400">
                                                    {results.loop.bestStationToAddLoop.existingLoops?.UP || 0}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">DOWN Loops</div>
                                                <div className="text-lg font-bold text-red-400">
                                                    {results.loop.bestStationToAddLoop.existingLoops?.DOWN || 0}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Passenger UP</div>
                                                <div className="text-lg font-bold text-blue-400">
                                                    {results.loop.bestStationToAddLoop.passengerTrainsPassing?.UP || 0}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Passenger DOWN</div>
                                                <div className="text-lg font-bold text-purple-400">
                                                    {results.loop.bestStationToAddLoop.passengerTrainsPassing?.DOWN || 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Station Rankings */}
                                {results.loop.stationRankings && (
                                    <div>
                                        <div className="text-sm font-bold text-gray-400 mb-2">All Stations Ranked</div>
                                        <div className="space-y-2">
                                            {results.loop.stationRankings.map((station, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 rounded-lg"
                                                    style={{ background: 'var(--surface-glass)' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                {station.stationName}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{station.stationCode}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-400">
                                                            +{station.estimatedExtraFreightTrainsIfOneMoreLoop}
                                                        </div>
                                                        <div className="text-xs text-gray-500">extra freight</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Signalling Results */}
                        {activeTestCase === 'signalling' && results.signalling && (
                            <div className="space-y-4">
                                {/* Best Segment */}
                                {results.signalling.bestSegmentToConvert && (
                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                        <div className="text-xs font-medium text-purple-400 mb-2">RECOMMENDED SEGMENT TO UPGRADE</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-purple-500/20">
                                                    <Radio size={32} className="text-purple-500" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-purple-400">
                                                        {results.signalling.bestSegmentToConvert.fromStation} → {results.signalling.bestSegmentToConvert.toStation}
                                                    </div>
                                                    <div className="text-sm text-gray-400">
                                                        {results.signalling.bestSegmentToConvert.segmentBlocks} block sections • {results.signalling.bestSegmentToConvert.segmentLengthKm} km
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-bold text-green-400">
                                                    +{results.signalling.bestSegmentToConvert.extraFreightIfAutomatic}
                                                </div>
                                                <div className="text-sm text-gray-400">extra freight trains/day</div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-3 gap-4 mt-4">
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Passenger Trains</div>
                                                <div className="text-lg font-bold text-green-400">
                                                    {results.signalling.bestSegmentToConvert.passengerTrains}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Freight Trains</div>
                                                <div className="text-lg font-bold text-orange-400">
                                                    {results.signalling.bestSegmentToConvert.freightTrains}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Currently Active</div>
                                                <div className="text-lg font-bold text-blue-400">
                                                    {results.signalling.bestSegmentToConvert.currentTrains}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Segment Rankings */}
                                {results.signalling.segmentRankings && results.signalling.segmentRankings.length > 0 && (
                                    <div>
                                        <div className="text-sm font-bold text-gray-400 mb-2">All Segments Ranked</div>
                                        <div className="space-y-2">
                                            {results.signalling.segmentRankings.map((segment, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 rounded-lg"
                                                    style={{ background: 'var(--surface-glass)' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                {segment.fromStation} → {segment.toStation}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {segment.segmentBlocks} blocks • {segment.segmentLengthKm} km
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-green-400">+{segment.extraFreightIfAutomatic}</div>
                                                        <div className="text-xs text-gray-500">extra freight</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Freight Results */}
                        {activeTestCase === 'freight' && results.freight && (
                            <div className="space-y-4">
                                {/* Current State */}
                                {results.freight.currentState && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <div className="text-3xl font-bold text-green-400">{results.freight.currentState.passengerTrains}</div>
                                            <div className="text-xs text-gray-400">Passenger Trains</div>
                                        </div>
                                        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                                            <div className="text-3xl font-bold text-orange-400">{results.freight.currentState.freightTrains}</div>
                                            <div className="text-xs text-gray-400">Freight Trains</div>
                                        </div>
                                        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                            <div className="text-3xl font-bold text-purple-400">{results.freight.currentState.totalLoops}</div>
                                            <div className="text-xs text-gray-400">Total Loops</div>
                                        </div>
                                    </div>
                                )}

                                {/* Recommendation */}
                                <div className="p-6 rounded-xl text-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(249, 115, 22, 0.1))', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                    <div className="text-sm text-gray-400 mb-2">Maximum Safe Additional Freight</div>
                                    <div className="text-6xl font-bold text-green-400 mb-2">
                                        +{results.freight.recommendedMaxAdditionalFreight}
                                    </div>
                                    <div className="text-sm text-gray-500">trains can be added safely</div>
                                </div>

                                {/* Scenarios */}
                                {results.freight.scenarios && (
                                    <div>
                                        <div className="text-sm font-bold text-gray-400 mb-2">What-If Scenarios</div>
                                        <div className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-primary)' }}>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr style={{ background: 'var(--surface-glass)' }}>
                                                        <th className="p-3 text-left text-gray-400">Additional</th>
                                                        <th className="p-3 text-left text-gray-400">Total</th>
                                                        <th className="p-3 text-left text-gray-400">Delay Impact</th>
                                                        <th className="p-3 text-left text-gray-400">Risk</th>
                                                        <th className="p-3 text-left text-gray-400">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {results.freight.scenarios.map((scenario, idx) => {
                                                        const badge = getRecommendationBadge(scenario.recommendation);
                                                        return (
                                                            <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                                                                <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                                                                    +{scenario.additionalFreightTrains}
                                                                </td>
                                                                <td className="p-3 text-gray-400">{scenario.totalFreightTrains}</td>
                                                                <td className="p-3 text-gray-400">{scenario.estimatedAvgPassengerDelayMinutes} min</td>
                                                                <td className={`p-3 font-bold ${getRiskColor(scenario.conflictRisk)}`}>
                                                                    {scenario.conflictRisk}
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-1 rounded text-xs font-bold text-white ${badge.bg}`}>
                                                                        {badge.text}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Auto Block Upgrade Results */}
                        {activeTestCase === 'autoblockupgrade' && results.autoblockupgrade && (
                            <div className="space-y-4">
                                {/* Segment Info */}
                                {results.autoblockupgrade.segment && (
                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                                        <div className="text-xs font-medium text-yellow-400 mb-2">SEGMENT TO UPGRADE</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-yellow-500/20">
                                                    <Zap size={32} className="text-yellow-500" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-yellow-400">
                                                        {results.autoblockupgrade.segment.fromStationName} → {results.autoblockupgrade.segment.toStationName}
                                                    </div>
                                                    <div className="text-sm text-gray-400">
                                                        {results.autoblockupgrade.segment.fromStationCode} → {results.autoblockupgrade.segment.toStationCode} • {results.autoblockupgrade.segment.segmentLengthKm} km
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-4xl font-bold text-green-400">
                                                    +{results.autoblockupgrade.segment.estimatedExtraFreightTrainsIfAutomatic}
                                                </div>
                                                <div className="text-sm text-gray-400">extra freight trains/day</div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-5 gap-3 mt-4">
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Current Blocks</div>
                                                <div className="text-lg font-bold text-red-400">
                                                    {results.autoblockupgrade.segment.currentBlockCount}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Auto Count</div>
                                                <div className="text-lg font-bold text-green-400">
                                                    {results.autoblockupgrade.segment.currentAutomaticCount}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Est. Auto Blocks</div>
                                                <div className="text-lg font-bold text-yellow-400">
                                                    {results.autoblockupgrade.segment.estimatedAutomaticBlocks}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Capacity Gain</div>
                                                <div className="text-lg font-bold text-blue-400">
                                                    {results.autoblockupgrade.segment.capacityGainFactor}x
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-lg text-center" style={{ background: 'var(--surface-glass)' }}>
                                                <div className="text-xs text-gray-400">Target Block Len</div>
                                                <div className="text-lg font-bold text-purple-400">
                                                    {results.autoblockupgrade.segment.targetAutomaticBlockLengthKm} km
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Train Counts */}
                                {results.autoblockupgrade.segment && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <div className="text-3xl font-bold text-green-400">
                                                {results.autoblockupgrade.segment.passengerTrainsPassing}
                                            </div>
                                            <div className="text-xs text-gray-400">Passenger Trains Passing</div>
                                        </div>
                                        <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                                            <div className="text-3xl font-bold text-orange-400">
                                                {results.autoblockupgrade.segment.freightTrainsPassing}
                                            </div>
                                            <div className="text-xs text-gray-400">Freight Trains Passing</div>
                                        </div>
                                    </div>
                                )}

                                {/* Baseline vs Upgraded Comparison */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Baseline */}
                                    {results.autoblockupgrade.baseline?.summary && (
                                        <div className="p-4 rounded-xl" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-primary)' }}>
                                            <div className="text-xs font-medium text-gray-400 mb-3">BASELINE (Current)</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Freight Completed:</span>
                                                    <span className="font-bold text-orange-400">
                                                        {results.autoblockupgrade.baseline.summary.freightCompleted || 0}
                                                    </span>
                                                </div>
                                                {results.autoblockupgrade.baseline.summary.totalTrains && (
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Total Trains:</span>
                                                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                            {results.autoblockupgrade.baseline.summary.totalTrains}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Upgraded */}
                                    {results.autoblockupgrade.upgraded && (
                                        <div className="p-4 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <div className="text-xs font-medium text-green-400 mb-3">UPGRADED (Automatic Signalling)</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Extra Freight Possible:</span>
                                                    <span className="font-bold text-green-400">
                                                        +{results.autoblockupgrade.upgraded.estimatedExtraFreightTrainsIfAutomatic}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Message */}
                                {results.autoblockupgrade.message && (
                                    <div className="p-3 rounded-lg flex items-center gap-2"
                                        style={{
                                            background: results.autoblockupgrade.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${results.autoblockupgrade.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}
                                    >
                                        {results.autoblockupgrade.success ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={16} className="text-red-400" />
                                        )}
                                        <span className={results.autoblockupgrade.success ? 'text-green-400' : 'text-red-400'}>
                                            {results.autoblockupgrade.message}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Loop Simulator Results */}
                        {activeTestCase === 'loopsimulator' && results.loopsimulator && (
                            <div className="space-y-4">
                                {/* Target Station Info */}
                                {results.loopsimulator.targetStation && (
                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                        <div className="text-xs font-medium text-cyan-400 mb-2">TARGET STATION FOR NEW LOOP</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-cyan-500/20">
                                                    <GitBranch size={32} className="text-cyan-500" />
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-cyan-400">
                                                        {results.loopsimulator.targetStation.stationName}
                                                    </div>
                                                    <div className="text-sm text-gray-400">
                                                        Station Code: {results.loopsimulator.targetStation.stationCode}
                                                    </div>
                                                </div>
                                            </div>
                                            {results.loopsimulator.simulatedState && (
                                                <div className="text-right">
                                                    <div className="text-4xl font-bold text-green-400">
                                                        +{results.loopsimulator.simulatedState.estimatedExtraFreightTrains}
                                                    </div>
                                                    <div className="text-sm text-gray-400">extra freight trains/day</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Current vs Simulated State */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Current State */}
                                    {results.loopsimulator.currentState && (
                                        <div className="p-4 rounded-xl" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-primary)' }}>
                                            <div className="text-xs font-medium text-gray-400 mb-3">CURRENT STATE</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Existing Loops (UP):</span>
                                                    <span className="font-bold text-orange-400">
                                                        {results.loopsimulator.currentState.existingLoops?.UP || 0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Existing Loops (DOWN):</span>
                                                    <span className="font-bold text-orange-400">
                                                        {results.loopsimulator.currentState.existingLoops?.DOWN || 0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Passenger Trains:</span>
                                                    <span className="font-bold text-blue-400">
                                                        {results.loopsimulator.currentState.passengerTrains}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Freight Trains:</span>
                                                    <span className="font-bold text-orange-400">
                                                        {results.loopsimulator.currentState.freightTrains}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Total Trains:</span>
                                                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        {results.loopsimulator.currentState.totalTrains}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Simulated State */}
                                    {results.loopsimulator.simulatedState && (
                                        <div className="p-4 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <div className="text-xs font-medium text-green-400 mb-3">AFTER ADDING LOOP</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">New Loops (UP):</span>
                                                    <span className="font-bold text-green-400">
                                                        {results.loopsimulator.simulatedState.newLoops?.UP || 0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">New Loops (DOWN):</span>
                                                    <span className="font-bold text-green-400">
                                                        {results.loopsimulator.simulatedState.newLoops?.DOWN || 0}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Capacity Increase:</span>
                                                    <span className="font-bold text-cyan-400">
                                                        {results.loopsimulator.simulatedState.capacityIncrease}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Conflict Reduction:</span>
                                                    <span className="font-bold text-purple-400">
                                                        {results.loopsimulator.simulatedState.conflictReduction}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Extra Freight Trains:</span>
                                                    <span className="font-bold text-green-400">
                                                        +{results.loopsimulator.simulatedState.estimatedExtraFreightTrains}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Impact Analysis */}
                                {results.loopsimulator.impactAnalysis && (
                                    <div className="p-4 rounded-xl" style={{ background: 'var(--surface-glass)', border: '1px solid var(--border-primary)' }}>
                                        <div className="text-xs font-medium text-cyan-400 mb-3">IMPACT ANALYSIS</div>

                                        {/* Summary */}
                                        <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {results.loopsimulator.impactAnalysis.summary}
                                            </p>
                                        </div>

                                        {/* Benefited Trains */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-green-400 mb-2 font-medium">
                                                    BENEFITED TRAINS ({results.loopsimulator.impactAnalysis.benefitedTrains?.length || 0})
                                                </div>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {results.loopsimulator.impactAnalysis.benefitedTrains?.slice(0, 5).map((train, idx) => (
                                                        <div key={idx} className="p-2 rounded text-xs" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                                            <div className="font-bold text-green-400">{train.trainName}</div>
                                                            <div className="text-gray-400">{train.benefit}</div>
                                                        </div>
                                                    ))}
                                                    {(results.loopsimulator.impactAnalysis.benefitedTrains?.length || 0) > 5 && (
                                                        <div className="text-xs text-gray-400 text-center pt-1">
                                                            +{results.loopsimulator.impactAnalysis.benefitedTrains.length - 5} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-gray-400 mb-2 font-medium">
                                                    UNAFFECTED TRAINS ({results.loopsimulator.impactAnalysis.unaffectedTrains?.length || 0})
                                                </div>
                                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                                    {results.loopsimulator.impactAnalysis.unaffectedTrains?.slice(0, 5).map((train, idx) => (
                                                        <div key={idx} className="p-2 rounded text-xs" style={{ background: 'var(--surface-glass)' }}>
                                                            <div className="font-bold" style={{ color: 'var(--text-secondary)' }}>{train.trainName}</div>
                                                            <div className="text-gray-500">{train.category} • {train.direction}</div>
                                                        </div>
                                                    ))}
                                                    {(results.loopsimulator.impactAnalysis.unaffectedTrains?.length || 0) > 5 && (
                                                        <div className="text-xs text-gray-400 text-center pt-1">
                                                            +{results.loopsimulator.impactAnalysis.unaffectedTrains.length - 5} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Message */}
                                {results.loopsimulator.message && (
                                    <div className="p-3 rounded-lg flex items-center gap-2"
                                        style={{
                                            background: results.loopsimulator.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            border: `1px solid ${results.loopsimulator.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}
                                    >
                                        {results.loopsimulator.success ? (
                                            <CheckCircle size={16} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={16} className="text-red-400" />
                                        )}
                                        <span className={results.loopsimulator.success ? 'text-green-400' : 'text-red-400'}>
                                            {results.loopsimulator.message}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
