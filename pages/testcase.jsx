import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/slices/adminSlice';
import Layout from '@/components/Layout';
import { FlaskConical, Play, Pause, RotateCcw, Settings, Zap } from 'lucide-react';

export default function TestCasePage() {
    const router = useRouter();
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [simulationRunning, setSimulationRunning] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [results, setResults] = useState(null);

    const scenarios = [
        {
            id: 'congestion',
            name: 'Platform Congestion',
            description: 'Simulate heavy traffic with multiple trains approaching simultaneously',
            difficulty: 'Medium',
            duration: '15 min',
            params: { trains: 8, platforms: 3, timeWindow: 30 },
        },
        {
            id: 'breakdown',
            name: 'Train Breakdown',
            description: 'Simulate emergency scenario with train breakdown blocking main line',
            difficulty: 'High',
            duration: '20 min',
            params: { affectedTrains: 5, blockDuration: 45, alternateRoutes: 2 },
        },
        {
            id: 'priority_conflict',
            name: 'Priority Conflict',
            description: 'Multiple high-priority trains competing for limited resources',
            difficulty: 'High',
            duration: '18 min',
            params: { priorityTrains: 4, conflicts: 3 },
        },
        {
            id: 'weather',
            name: 'Adverse Weather',
            description: 'Speed restrictions due to fog/rain affecting schedule',
            difficulty: 'Medium',
            duration: '25 min',
            params: { speedReduction: 40, affectedSections: 5 },
        },
        {
            id: 'maintenance',
            name: 'Track Maintenance',
            description: 'Scheduled maintenance window with traffic rerouting',
            difficulty: 'Low',
            duration: '30 min',
            params: { maintenanceBlocks: 3, divertedTrains: 6 },
        },
        {
            id: 'rush_hour',
            name: 'Rush Hour Traffic',
            description: 'Peak traffic period with maximum throughput requirement',
            difficulty: 'High',
            duration: '45 min',
            params: { trainsPerHour: 25, localTrains: 12 },
        },
    ];

    const startSimulation = () => {
        setSimulationRunning(true);
        setSimulationProgress(0);

        // Simulate progress
        const interval = setInterval(() => {
            setSimulationProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setSimulationRunning(false);
                    generateResults();
                    return 100;
                }
                return prev + (10 / simulationSpeed);
            });
        }, 1000);
    };

    const pauseSimulation = () => {
        setSimulationRunning(false);
    };

    const resetSimulation = () => {
        setSimulationRunning(false);
        setSimulationProgress(0);
        setResults(null);
    };

    const generateResults = () => {
        const recommendations = [
            { id: 1, action: 'Hold Train 12345 for 3 minutes', confidence: 92, impact: '+5 min saved' },
            { id: 2, action: 'Reroute Train 22692 to Platform 3', confidence: 87, impact: '-12 min delay avoided' },
            { id: 3, action: 'Priority adjustment for Express 11078', confidence: 95, impact: '+8% efficiency' },
        ];

        setResults({
            totalTime: '15:32',
            trainsProcessed: 8,
            avgDelay: 3.4,
            punctuality: 91,
            aiRecommendations: recommendations,
            baselineComparison: {
                timeImprovement: '+12%',
                delayReduction: '-37%',
            },
        });
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Low': return 'badge-low';
            case 'Medium': return 'badge-medium';
            case 'High': return 'badge-high';
            default: return 'badge-low';
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
                <h1 className="text-3xl font-bold mb-6 font-railway" style={{ color: 'var(--text-primary)' }}>
                    🧪 Test Case Simulation
                </h1>

                <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Scenario Selection */}
                    <div className="col-span-4">
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Select Scenario</h2>
                            <div className="space-y-3">
                                {scenarios.map((scenario) => (
                                    <div
                                        key={scenario.id}
                                        onClick={() => setSelectedScenario(scenario)}
                                        className={`card-hover border cursor-pointer transition-all ${selectedScenario?.id === scenario.id
                                            ? 'border-ir-orange bg-ir-orange/10'
                                            : 'border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{scenario.name}</h3>
                                            <span className={`badge ${getDifficultyColor(scenario.difficulty)}`}>
                                                {scenario.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-300 mb-2">{scenario.description}</p>
                                        <p className="text-xs text-gray-400">⏱️ {scenario.duration}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Simulation Controls & Results */}
                    <div className="col-span-8">
                        {!selectedScenario ? (
                            <div className="card h-full flex items-center justify-center">
                                <div className="text-center">
                                    <FlaskConical size={64} className="mx-auto mb-4 text-gray-400 opacity-30" />
                                    <p className="text-gray-400">Select a scenario to begin simulation</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Simulation Info */}
                                <div className="card">
                                    <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{selectedScenario.name}</h2>
                                    <p className="text-gray-300 mb-4">{selectedScenario.description}</p>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        {Object.entries(selectedScenario.params).map(([key, value]) => (
                                            <div key={key} className="glass-dark p-3 rounded-lg">
                                                <p className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Simulation Controls */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex space-x-2">
                                            {!simulationRunning ? (
                                                <button
                                                    onClick={startSimulation}
                                                    disabled={simulationProgress === 100}
                                                    className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold rounded-lg transition-all flex items-center space-x-2"
                                                >
                                                    <Play size={20} />
                                                    <span>Start</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={pauseSimulation}
                                                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all flex items-center space-x-2"
                                                >
                                                    <Pause size={20} />
                                                    <span>Pause</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={resetSimulation}
                                                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all flex items-center space-x-2"
                                            >
                                                <RotateCcw size={20} />
                                                <span>Reset</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <span className="text-sm text-gray-400">Speed:</span>
                                            {[1, 2, 5, 10].map((speed) => (
                                                <button
                                                    key={speed}
                                                    onClick={() => setSimulationSpeed(speed)}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${simulationSpeed === speed
                                                        ? ''
                                                        : 'bg-white/5 hover:bg-white/10'
                                                        }`}
                                                    style={simulationSpeed === speed ? {
                                                        background: 'var(--gradient-accent)',
                                                        color: 'white'
                                                    } : {
                                                        color: 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {speed}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-400">Progress</span>
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{Math.round(simulationProgress)}%</span>
                                        </div>
                                        <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-ir-orange to-yellow-500 h-full transition-all duration-300"
                                                style={{ width: `${simulationProgress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Results */}
                                {results && (
                                    <div className="card">
                                        <div className="flex items-center mb-4">
                                            <Zap size={24} className="text-yellow-400 mr-2" />
                                            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Simulation Results</h3>
                                        </div>

                                        {/* KPIs */}
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="glass-dark p-4 rounded-lg text-center">
                                                <p className="text-xs text-gray-400 mb-1">Total Time</p>
                                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{results.totalTime}</p>
                                            </div>
                                            <div className="glass-dark p-4 rounded-lg text-center">
                                                <p className="text-xs text-gray-400 mb-1">Trains</p>
                                                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{results.trainsProcessed}</p>
                                            </div>
                                            <div className="glass-dark p-4 rounded-lg text-center">
                                                <p className="text-xs text-gray-400 mb-1">Avg Delay</p>
                                                <p className="text-2xl font-bold text-green-400">{results.avgDelay} min</p>
                                            </div>
                                            <div className="glass-dark p-4 rounded-lg text-center">
                                                <p className="text-xs text-gray-400 mb-1">Punctuality</p>
                                                <p className="text-2xl font-bold text-green-400">{results.punctuality}%</p>
                                            </div>
                                        </div>

                                        {/* AI Recommendations */}
                                        <div className="mb-4">
                                            <h4 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>AI Recommendations</h4>
                                            <div className="space-y-2">
                                                {results.aiRecommendations.map((rec) => (
                                                    <div key={rec.id} className="glass-orange p-3 rounded-lg flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{rec.action}</p>
                                                            <p className="text-xs text-gray-300 mt-1">Impact: {rec.impact}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold text-green-400">{rec.confidence}%</span>
                                                            <p className="text-xs text-gray-400">confidence</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Baseline Comparison */}
                                        <div className="glass-dark p-4 rounded-lg">
                                            <h4 className="text-sm font-semibold text-white mb-2">vs Baseline Performance</h4>
                                            <div className="flex space-x-6">
                                                <div>
                                                    <p className="text-xs text-gray-400">Time Improvement</p>
                                                    <p className="text-xl font-bold text-green-400">{results.baselineComparison.timeImprovement}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400">Delay Reduction</p>
                                                    <p className="text-xl font-bold text-green-400">{results.baselineComparison.delayReduction}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
