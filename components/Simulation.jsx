import React, { useState } from 'react';
import { Settings, GitBranch, Train, Activity, Zap, ArrowRight, Save, Radio } from 'lucide-react';

const Simulation = () => {
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

    const handleSubmit = (type) => {
        console.log(`Submitting ${type} params:`, type === 'node' ? nodeParams : type === 'edge' ? edgeParams : trainParams);
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
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all appearance-none cursor-pointer hover:bg-black/30"
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
            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder-gray-600"
        />
    );

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Settings className="text-blue-400" size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-railway" style={{ color: 'var(--text-primary)' }}>
                            Simulation Configuration
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">Configure parameters for What-If scenarios</p>
                    </div>
                </div>

                <button
                    className="px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center space-x-2 transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
                    style={{ background: 'var(--gradient-accent)', color: 'white' }}
                    onClick={() => console.log('Saving all configurations...')}
                >
                    <Save size={16} />
                    <span>Save Config</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
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

                        <button
                            onClick={() => handleSubmit('node')}
                            className="w-full mt-2 py-2.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-medium text-sm transition-all flex items-center justify-center space-x-2 group-hover:border-blue-500/50"
                        >
                            <span>Update Node</span>
                            <ArrowRight size={14} />
                        </button>
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

                        <button
                            onClick={() => handleSubmit('edge')}
                            className="w-full mt-2 py-2.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-medium text-sm transition-all flex items-center justify-center space-x-2 group-hover:border-emerald-500/50"
                        >
                            <span>Update Edge</span>
                            <ArrowRight size={14} />
                        </button>
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

                        <button
                            onClick={() => handleSubmit('train')}
                            className="w-full mt-2 py-2.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 font-medium text-sm transition-all flex items-center justify-center space-x-2 group-hover:border-purple-500/50"
                        >
                            <span>Update Train</span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulation;
