import { useState } from 'react';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading } from '@/store/slices/adminSlice';
import Layout from '@/components/Layout';
import { FlaskConical, Play, Pause, RotateCcw, Settings, Zap, GitBranch, Train, ArrowRight, Radio } from 'lucide-react';

export default function TestCasePage() {
    const router = useRouter();
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);
    const [simulationRunning, setSimulationRunning] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(1);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [results, setResults] = useState(null);

    // Node State
    const [nodeParams, setNodeParams] = useState({
        nodeType: 'signal',
        line: 'UP',
        signalColor: 'red',
        signalType: 'automatic',
    });

    // Edge State
    const [edgeParams, setEdgeParams] = useState({
        stream: 'UP',
        direction: 'UP',
        edgeType: 'automatic',
        crossing: false,
    });

    // Train State
    const [trainParams, setTrainParams] = useState({
        trainCategory: 'express',
        trainType: 'passenger',
        trainPriority: 1,
        maxSpeed: 100,
    });

    const handleNodeChange = (e) => {
        const { name, value } = e.target;
        setNodeParams((prev) => ({ ...prev, [name]: value }));
    };

    const handleEdgeChange = (e) => {
        const { name, value } = e.target;
        setEdgeParams((prev) => ({
            ...prev,
            [name]: name === 'crossing' ? value === 'true' : value,
        }));
    };

    const handleTrainChange = (e) => {
        const { name, value } = e.target;
        setTrainParams((prev) => ({ ...prev, [name]: value }));
    };

    const InputGroup = ({ label, children }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">{label}</label>
            {children}
        </div>
    );

    const Select = ({ ...props }) => (
        <div className="relative">
            <select
                {...props}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-black/30"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );

    const Input = ({ ...props }) => (
        <input
            {...props}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder-gray-600"
        />
    );

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
            configuration: {
                node: nodeParams,
                edge: edgeParams,
                train: trainParams,
            },
        });
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
                    {/* Left Panel - Configuration (mirrors Simulation component) */}
                    <div className="col-span-5 space-y-4">
                        {/* Node Configuration */}
                        <div className="glass-dark p-1 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group h-fit">
                            <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                                        <Radio size={18} />
                                    </div>
                                    <h3 className="font-semibold text-lg text-blue-100">Node Settings</h3>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            </div>

                            <div className="p-5 space-y-5">
                                <InputGroup label="Node Type">
                                    <Select name="nodeType" value={nodeParams.nodeType} onChange={handleNodeChange}>
                                        <option value="signal">Signal</option>
                                        <option value="home">Home</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Line">
                                    <Select name="line" value={nodeParams.line} onChange={handleNodeChange}>
                                        <option value="UP">UP Line</option>
                                        <option value="DOWN">DOWN Line</option>
                                        <option value="BOTH">Both Lines</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Signal Color">
                                    <Select name="signalColor" value={nodeParams.signalColor} onChange={handleNodeChange}>
                                        <option value="red">Red</option>
                                        <option value="yellow">Yellow</option>
                                        <option value="doubleYellow">Double Yellow</option>
                                        <option value="green">Green</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Signal Type">
                                    <Select name="signalType" value={nodeParams.signalType} onChange={handleNodeChange}>
                                        <option value="home">Home Signal</option>
                                        <option value="starter">Starter Signal</option>
                                        <option value="automatic">Automatic Signal</option>
                                        <option value="advance">Advance Starter</option>
                                    </Select>
                                </InputGroup>
                            </div>
                        </div>

                        {/* Edge Configuration */}
                        <div className="glass-dark p-1 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group h-fit">
                            <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                        <GitBranch size={18} />
                                    </div>
                                    <h3 className="font-semibold text-lg text-emerald-100">Edge Settings</h3>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            </div>

                            <div className="p-5 space-y-5">
                                <InputGroup label="Stream">
                                    <Select name="stream" value={edgeParams.stream} onChange={handleEdgeChange}>
                                        <option value="UP">UP Stream</option>
                                        <option value="DOWN">DOWN Stream</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Direction">
                                    <Select name="direction" value={edgeParams.direction} onChange={handleEdgeChange}>
                                        <option value="UP">UP Direction</option>
                                        <option value="DOWN">DOWN Direction</option>
                                        <option value="BOTH">Bi-directional</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Edge Type">
                                    <Select name="edgeType" value={edgeParams.edgeType} onChange={handleEdgeChange}>
                                        <option value="automatic">Automatic Block</option>
                                        <option value="block">Absolute Block</option>
                                        <option value="loop">Loop Line</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Crossing">
                                    <Select name="crossing" value={edgeParams.crossing} onChange={handleEdgeChange}>
                                        <option value="false">No Crossing</option>
                                        <option value="true">Has Crossing</option>
                                    </Select>
                                </InputGroup>
                            </div>
                        </div>

                        {/* Train Configuration */}
                        <div className="glass-dark p-1 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group h-fit">
                            <div className="p-5 pb-4 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                                        <Train size={18} />
                                    </div>
                                    <h3 className="font-semibold text-lg text-purple-100">Train Settings</h3>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            </div>

                            <div className="p-5 space-y-5">
                                <InputGroup label="Category">
                                    <Select name="trainCategory" value={trainParams.trainCategory} onChange={handleTrainChange}>
                                        <option value="express">Express</option>
                                        <option value="superfast">Superfast</option>
                                        <option value="rajdhani">Rajdhani</option>
                                        <option value="passenger">Passenger</option>
                                        <option value="shatabdi">Shatabdi</option>
                                        <option value="mail">Mail</option>
                                    </Select>
                                </InputGroup>

                                <InputGroup label="Type">
                                    <Select name="trainType" value={trainParams.trainType} onChange={handleTrainChange}>
                                        <option value="passenger">Passenger</option>
                                        <option value="freight">Freight</option>
                                    </Select>
                                </InputGroup>

                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Priority">
                                        <Input
                                            type="number"
                                            name="trainPriority"
                                            value={trainParams.trainPriority}
                                            onChange={handleTrainChange}
                                            placeholder="1-10"
                                        />
                                    </InputGroup>

                                    <InputGroup label="Max Speed">
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                name="maxSpeed"
                                                value={trainParams.maxSpeed}
                                                onChange={handleTrainChange}
                                                placeholder="km/h"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">km/h</span>
                                        </div>
                                    </InputGroup>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Simulation Controls & Results */}
                    <div className="col-span-7">
                        <div className="space-y-6">
                            {/* Simulation Info */}
                            <div className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <Settings className="text-blue-400" size={22} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configure & Simulate</h2>
                                            <p className="text-sm text-gray-400">Uses the same inputs as the Simulation component</p>
                                        </div>
                                    </div>
                                    <div className="hidden lg:block">
                                        <FlaskConical size={32} className="text-gray-400 opacity-60" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="glass-dark p-3 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Node</p>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{nodeParams.nodeType} • {nodeParams.signalColor}</p>
                                        <p className="text-xs text-gray-500">{nodeParams.signalType} on {nodeParams.line}</p>
                                    </div>
                                    <div className="glass-dark p-3 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Edge</p>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{edgeParams.edgeType}</p>
                                        <p className="text-xs text-gray-500">{edgeParams.stream}/{edgeParams.direction} {edgeParams.crossing ? '• Crossing' : ''}</p>
                                    </div>
                                    <div className="glass-dark p-3 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Train</p>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{trainParams.trainCategory} ({trainParams.trainType})</p>
                                        <p className="text-xs text-gray-500">Priority {trainParams.trainPriority} • {trainParams.maxSpeed} km/h</p>
                                    </div>
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

                                    {/* Configuration echo */}
                                    <div className="glass-dark p-4 rounded-lg mb-4">
                                        <h4 className="text-sm font-semibold text-white mb-2">Configuration Used</h4>
                                        <div className="grid grid-cols-3 gap-4 text-xs text-gray-300">
                                            <div>
                                                <p className="text-gray-400">Node</p>
                                                <p>{results.configuration.node.nodeType}, {results.configuration.node.signalColor}</p>
                                                <p>{results.configuration.node.signalType} on {results.configuration.node.line}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400">Edge</p>
                                                <p>{results.configuration.edge.edgeType}</p>
                                                <p>{results.configuration.edge.stream}/{results.configuration.edge.direction} {results.configuration.edge.crossing ? '• Crossing' : ''}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400">Train</p>
                                                <p>{results.configuration.train.trainCategory} ({results.configuration.train.trainType})</p>
                                                <p>Priority {results.configuration.train.trainPriority} • {results.configuration.train.maxSpeed} km/h</p>
                                            </div>
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
                    </div>
                </div>
            </div>
        </Layout>
    );
}
