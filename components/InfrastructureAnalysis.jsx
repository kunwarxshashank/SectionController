import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Beaker, Loader2, MapPin, Radio, Package,
    ChevronDown, ChevronUp, TrendingUp, AlertTriangle,
    CheckCircle, XCircle, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { selectSectionData, selectTrainData } from '@/store/slices/stationSlice';
import { analyzeInfrastructureApi } from '@/lib/api';

/**
 * Infrastructure Analysis Component
 * 
 * "Generate Test Case" button that runs analysis and shows:
 * - Best station to add loop
 * - Best sections for automatic signalling
 * - How many more freight trains can be accommodated
 */
export default function InfrastructureAnalysis() {
    const sectionData = useSelector(selectSectionData);
    const trainData = useSelector(selectTrainData);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [expanded, setExpanded] = useState({
        loop: true,
        signalling: false,
        freight: true
    });

    const handleGenerateTestCase = async () => {
        if (!sectionData || !trainData) {
            setError('No section or train data available');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await analyzeInfrastructureApi(sectionData, trainData);
            setResults(result);
        } catch (err) {
            setError(err.message || 'Analysis failed');
            console.error('Infrastructure analysis error:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
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

    return (
        <div className="card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                        <Beaker size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            Infrastructure Test Cases
                        </h2>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            Analyze improvements
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleGenerateTestCase}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50 flex items-center gap-2"
                    style={{
                        background: loading ? 'rgba(6, 182, 212, 0.3)' : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                        color: 'white',
                        boxShadow: '0 2px 10px rgba(6, 182, 212, 0.4)'
                    }}
                >
                    {loading ? (
                        <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
                    ) : (
                        <><Beaker size={14} /> Generate Test Case</>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-2 mb-3 rounded-lg text-xs" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <span className="text-red-400">{error}</span>
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">

                    {/* Summary */}
                    {results.summary && (
                        <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            <div className="text-xs font-bold mb-2 text-cyan-400">📋 Analysis Summary</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Best Loop Station:</span>
                                    <span className="ml-2 font-bold text-cyan-400">{results.summary.bestStationForLoop || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Extra Freight:</span>
                                    <span className="ml-2 font-bold text-green-400">+{results.summary.extraFreightFromLoop || 0}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Max Add'l Freight:</span>
                                    <span className="ml-2 font-bold text-orange-400">+{results.summary.recommendedMaxAdditionalFreight || 0}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Best Signal Section:</span>
                                    <span className="ml-2 font-bold text-purple-400">{results.summary.bestSectionForSignalling?.slice(0, 15) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loop Placement */}
                    {results.loopPlacement?.bestStationToAddLoop && (
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            <button
                                onClick={() => toggleSection('loop')}
                                className="w-full p-2 flex items-center justify-between text-left"
                                style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-green-500" />
                                    <span className="text-xs font-bold text-green-400">Best Loop Location</span>
                                </div>
                                {expanded.loop ? <ChevronUp size={14} className="text-green-400" /> : <ChevronDown size={14} className="text-green-400" />}
                            </button>

                            {expanded.loop && (
                                <div className="p-3 space-y-2" style={{ background: 'rgba(34, 197, 94, 0.05)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/20">
                                            <MapPin size={20} className="text-green-500" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-green-400">
                                                {results.loopPlacement.bestStationToAddLoop.stationName}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Code: {results.loopPlacement.bestStationToAddLoop.stationCode}
                                            </div>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <div className="text-2xl font-bold text-green-400">
                                                +{results.loopPlacement.bestStationToAddLoop.estimatedExtraFreightTrainsIfOneMoreLoop}
                                            </div>
                                            <div className="text-[10px] text-gray-500">extra freight/day</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                                        <div className="p-2 rounded" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="text-gray-500">Existing Loops</div>
                                            <div className="font-bold">
                                                UP: {results.loopPlacement.bestStationToAddLoop.existingLoops?.UP || 0} |
                                                DOWN: {results.loopPlacement.bestStationToAddLoop.existingLoops?.DOWN || 0}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="text-gray-500">Passenger Traffic</div>
                                            <div className="font-bold">
                                                UP: {results.loopPlacement.bestStationToAddLoop.passengerTrainsPassing?.UP || 0} |
                                                DOWN: {results.loopPlacement.bestStationToAddLoop.passengerTrainsPassing?.DOWN || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Signalling */}
                    {results.signalling?.bestSectionsForAutomaticSignalling?.length > 0 && (
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                            <button
                                onClick={() => toggleSection('signalling')}
                                className="w-full p-2 flex items-center justify-between text-left"
                                style={{ background: 'rgba(168, 85, 247, 0.1)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <Radio size={14} className="text-purple-500" />
                                    <span className="text-xs font-bold text-purple-400">Automatic Signalling</span>
                                </div>
                                {expanded.signalling ? <ChevronUp size={14} className="text-purple-400" /> : <ChevronDown size={14} className="text-purple-400" />}
                            </button>

                            {expanded.signalling && (
                                <div className="p-3 space-y-2" style={{ background: 'rgba(168, 85, 247, 0.05)' }}>
                                    <div className="text-xs text-gray-400 mb-2">
                                        Convert these block sections to automatic for better throughput:
                                    </div>
                                    {results.signalling.bestSectionsForAutomaticSignalling.slice(0, 3).map((section, idx) => (
                                        <div key={idx} className="p-2 rounded text-xs" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-purple-400">{section.edgeId}</span>
                                                <span className="text-green-400">+{section.estimatedExtraTrainsPerDay} trains</span>
                                            </div>
                                            <div className="text-gray-500">
                                                {section.length} km • Save ~{section.estimatedTimeSavingsMinutes} min
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Freight Capacity */}
                    {results.freightCapacity?.scenarios && (
                        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                            <button
                                onClick={() => toggleSection('freight')}
                                className="w-full p-2 flex items-center justify-between text-left"
                                style={{ background: 'rgba(249, 115, 22, 0.1)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <Package size={14} className="text-orange-500" />
                                    <span className="text-xs font-bold text-orange-400">Freight Capacity Analysis</span>
                                </div>
                                {expanded.freight ? <ChevronUp size={14} className="text-orange-400" /> : <ChevronDown size={14} className="text-orange-400" />}
                            </button>

                            {expanded.freight && (
                                <div className="p-3 space-y-2" style={{ background: 'rgba(249, 115, 22, 0.05)' }}>
                                    {/* Current State */}
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="p-2 rounded" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="text-gray-500">Passenger</div>
                                            <div className="font-bold text-green-400">{results.freightCapacity.currentState?.passengerTrains}</div>
                                        </div>
                                        <div className="p-2 rounded" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="text-gray-500">Freight</div>
                                            <div className="font-bold text-orange-400">{results.freightCapacity.currentState?.freightTrains}</div>
                                        </div>
                                        <div className="p-2 rounded" style={{ background: 'var(--surface-glass)' }}>
                                            <div className="text-gray-500">Loops</div>
                                            <div className="font-bold text-purple-400">{results.freightCapacity.currentState?.totalLoops}</div>
                                        </div>
                                    </div>

                                    {/* Recommended Max */}
                                    <div className="p-3 rounded-lg text-center" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(249, 115, 22, 0.1))' }}>
                                        <div className="text-xs text-gray-400">Recommended Maximum Additional</div>
                                        <div className="text-3xl font-bold text-green-400">
                                            +{results.freightCapacity.recommendedMaxAdditionalFreight}
                                        </div>
                                        <div className="text-xs text-gray-500">freight trains safely</div>
                                    </div>

                                    {/* Scenarios */}
                                    <div className="text-xs text-gray-400 mt-2">What if we add more freight:</div>
                                    <div className="space-y-1">
                                        {results.freightCapacity.scenarios.slice(1).map((scenario, idx) => {
                                            const badge = getRecommendationBadge(scenario.recommendation);
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded text-xs" style={{ background: 'var(--surface-glass)' }}>
                                                    <span className="font-bold">+{scenario.additionalFreightTrains}</span>
                                                    <span className="text-gray-500">Delay: {scenario.estimatedAvgPassengerDelayMinutes}m</span>
                                                    <span className={getRiskColor(scenario.conflictRisk)}>{scenario.conflictRisk}</span>
                                                    <span className={`px-2 py-0.5 rounded text-white text-[9px] ${badge.bg}`}>
                                                        {badge.text}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!results && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <Beaker size={40} className="text-gray-400 opacity-30 mb-3" />
                    <p className="text-sm text-gray-500">Click "Generate Test Case"</p>
                    <p className="text-xs text-gray-400 mt-1">
                        to analyze loop placement, signalling, and freight capacity
                    </p>
                </div>
            )}
        </div>
    );
}
