import { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    RefreshCw, Zap, Check, X, AlertCircle,
    Sparkles, Train, AlertTriangle, Info,
    ChevronDown, ChevronUp, Loader2, Clock,
    ArrowRight, RotateCcw
} from 'lucide-react';
import {
    selectRecommendations,
    selectOptimizationSummary,
    selectOptimizationLoading,
    selectOptimizationError
} from '@/store/slices/optimizationSlice';
import { selectSectionData, selectTrainData } from '@/store/slices/stationSlice';
import { setOptimizationLoading, setOptimizationResults, setOptimizationError } from '@/store/slices/optimizationSlice';
import { optimizeScheduleApi } from '@/lib/api';

// Mockup recommendations when none are available
const MOCKUP_RECOMMENDATIONS = [
    {
        type: 'LOOP_DIVERSION',
        priority: 'HIGH',
        trainId: 'BCNA-103',
        trainName: 'Coal Rake Express',
        station: 'Vidisha',
        action: 'Divert to Loop Line 2',
        description: 'Passenger train 12001 approaching. Freight rake will clear in 8 minutes.',
        reason: 'Passenger priority crossing'
    },
    {
        type: 'DELAY',
        priority: 'MEDIUM',
        trainId: 'BOXN-201',
        trainName: 'Iron Ore Rake 1',
        station: 'Bhopal',
        action: 'Hold for 5 minutes',
        description: 'Allow Coal Rake BCNA-101 to depart first for optimal spacing.',
        reason: 'Headway optimization'
    },
    {
        type: 'SPEED_ADJUST',
        priority: 'LOW',
        trainId: '12627',
        trainName: 'Karnataka Express',
        station: null,
        action: 'Reduce speed to 100 km/h',
        description: 'Maintain 3-minute headway with preceding Shatabdi Express.',
        reason: 'Block section optimization'
    },
    {
        type: 'INFO',
        priority: 'LOW',
        trainId: null,
        trainName: null,
        station: null,
        action: 'All systems operating normally',
        description: 'Current schedule allows 5 additional freight trains without conflicts.',
        reason: 'Capacity assessment'
    }
];

/**
 * AI Recommendations Component
 * Shows optimization recommendations with mockup fallback
 */
export default function AIRecommendations() {
    const dispatch = useDispatch();
    const recommendations = useSelector(selectRecommendations);
    const summary = useSelector(selectOptimizationSummary);
    const loading = useSelector(selectOptimizationLoading);
    const error = useSelector(selectOptimizationError);
    const sectionData = useSelector(selectSectionData);
    const trainData = useSelector(selectTrainData);

    const [processing, setProcessing] = useState({});
    const [expandedRec, setExpandedRec] = useState(null);
    const [showMockup, setShowMockup] = useState(false);

    // Use real data or mockup
    const displayRecommendations = useMemo(() => {
        if (recommendations && recommendations.length > 0) {
            return recommendations;
        }
        // Show mockup when empty but we have data
        if (showMockup || !recommendations || recommendations.length === 0) {
            return MOCKUP_RECOMMENDATIONS;
        }
        return [];
    }, [recommendations, showMockup]);

    const isMockupData = !recommendations || recommendations.length === 0;

    const handleRefresh = async () => {
        if (!sectionData || !trainData) {
            console.warn('No section/train data available');
            return;
        }

        dispatch(setOptimizationLoading());

        try {
            const result = await optimizeScheduleApi(sectionData, trainData);
            dispatch(setOptimizationResults(result));
        } catch (err) {
            dispatch(setOptimizationError(err.message || 'Optimization failed'));
        }
    };

    const handleAction = (recIndex, action) => {
        setProcessing(prev => ({ ...prev, [recIndex]: action }));
        setTimeout(() => {
            setProcessing(prev => {
                const newState = { ...prev };
                delete newState[recIndex];
                return newState;
            });
        }, 1500);
    };

    const getPriorityStyle = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'HIGH':
            case 'CRITICAL':
                return {
                    color: '#ef4444',
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.3)',
                    icon: AlertTriangle
                };
            case 'MEDIUM':
                return {
                    color: '#f59e0b',
                    bg: 'rgba(245, 158, 11, 0.1)',
                    border: 'rgba(245, 158, 11, 0.3)',
                    icon: AlertCircle
                };
            default:
                return {
                    color: '#22c55e',
                    bg: 'rgba(34, 197, 94, 0.1)',
                    border: 'rgba(34, 197, 94, 0.3)',
                    icon: Info
                };
        }
    };

    const getTypeBadge = (type) => {
        switch (type?.toUpperCase()) {
            case 'LOOP_DIVERSION':
                return { label: '🔄 Loop', color: '#8b5cf6' };
            case 'DELAY':
                return { label: '⏱️ Delay', color: '#f59e0b' };
            case 'SPEED_ADJUST':
                return { label: '⚡ Speed', color: '#3b82f6' };
            case 'INFO':
                return { label: 'ℹ️ Info', color: '#22c55e' };
            default:
                return { label: type || 'Action', color: '#6b7280' };
        }
    };

    return (
        <div className="card h-full flex flex-col" style={{ maxHeight: 500 }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div
                        className="p-2 rounded-lg relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                        }}
                    >
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            AI Recommendations
                        </h2>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {displayRecommendations.length} suggestion{displayRecommendations.length !== 1 ? 's' : ''}
                            {isMockupData && ' (demo)'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isMockupData && (
                        <button
                            onClick={() => setShowMockup(!showMockup)}
                            className="px-2 py-1 rounded text-[10px] font-medium"
                            style={{
                                background: showMockup ? 'rgba(139, 92, 246, 0.2)' : 'var(--surface-glass)',
                                color: showMockup ? '#8b5cf6' : 'var(--text-tertiary)'
                            }}
                        >
                            {showMockup ? 'Hide Demo' : 'Show Demo'}
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="p-2 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                        style={{
                            background: 'var(--surface-glass)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Summary */}
            {summary && summary.totalTrains > 0 && (
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {[
                        { label: 'Passenger', value: summary.passengerTrains, color: 'text-green-500' },
                        { label: 'Freight', value: summary.freightTrains, color: 'text-orange-500' },
                        { label: 'Loops', value: summary.totalLoopUsages || 0, color: 'text-purple-500' },
                        { label: 'Done', value: summary.freightCompleted, color: 'text-blue-500' },
                    ].map(stat => (
                        <div key={stat.label} className="rounded-lg p-1.5 text-center" style={{ background: 'var(--surface-glass)' }}>
                            <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                            <div className="text-[9px] text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Recommendations List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {error && (
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} className="text-red-400" />
                            <span className="text-xs text-red-400">{error}</span>
                        </div>
                    </div>
                )}

                {loading && displayRecommendations.length === 0 && (
                    <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" />
                        <p className="text-xs text-gray-500">Running optimization...</p>
                    </div>
                )}

                {displayRecommendations.map((rec, index) => {
                    const priority = getPriorityStyle(rec.priority);
                    const typeBadge = getTypeBadge(rec.type);
                    const isExpanded = expandedRec === index;
                    const isProcessing = processing[index];
                    const PriorityIcon = priority.icon;

                    return (
                        <div
                            key={index}
                            className="rounded-lg p-2.5 transition-all"
                            style={{
                                background: priority.bg,
                                border: `1px solid ${priority.border}`,
                                opacity: isMockupData ? 0.85 : 1
                            }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <PriorityIcon size={14} style={{ color: priority.color }} />
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {rec.trainName || rec.action?.slice(0, 20)}
                                    </span>
                                    {rec.trainId && (
                                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                                            {rec.trainId}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                                        style={{ background: typeBadge.color, color: 'white' }}
                                    >
                                        {typeBadge.label}
                                    </span>
                                </div>
                            </div>

                            {/* Action */}
                            <div className="mb-1.5">
                                <p className="text-xs font-medium" style={{ color: priority.color }}>
                                    {rec.action}
                                </p>
                                {rec.station && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <Train size={10} className="text-gray-500" />
                                        <span className="text-[10px] text-gray-500">At {rec.station}</span>
                                    </div>
                                )}
                            </div>

                            {/* Expand */}
                            {rec.description && (
                                <>
                                    <button
                                        onClick={() => setExpandedRec(isExpanded ? null : index)}
                                        className="flex items-center gap-1 text-[10px] mb-1.5"
                                        style={{ color: priority.color }}
                                    >
                                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        {isExpanded ? 'Less' : 'More'}
                                    </button>
                                    {isExpanded && (
                                        <div className="text-[10px] p-1.5 rounded mb-1.5" style={{ background: 'var(--surface-glass)' }}>
                                            <p style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                                            {rec.reason && (
                                                <p className="mt-1 italic text-gray-500">Reason: {rec.reason}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Actions (only for actionable items) */}
                            {rec.priority !== 'LOW' && rec.type !== 'INFO' && (
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => handleAction(index, 'accept')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                                        style={{
                                            background: isProcessing === 'accept' ? 'rgba(34, 197, 94, 0.3)' : '#22c55e',
                                            color: 'white'
                                        }}
                                    >
                                        {isProcessing === 'accept' ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(index, 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-all hover:scale-105 disabled:opacity-50"
                                        style={{
                                            background: isProcessing === 'reject' ? 'rgba(239, 68, 68, 0.3)' : '#ef4444',
                                            color: 'white'
                                        }}
                                    >
                                        {isProcessing === 'reject' ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Empty state with toggle */}
                {!loading && displayRecommendations.length === 0 && !showMockup && (
                    <div className="text-center py-6">
                        <Zap size={32} className="mx-auto mb-2 text-gray-400 opacity-30" />
                        <p className="text-xs text-gray-500">No recommendations</p>
                        <button
                            onClick={() => setShowMockup(true)}
                            className="mt-2 text-[10px] text-purple-500 hover:underline"
                        >
                            View demo suggestions
                        </button>
                    </div>
                )}
            </div>

            {/* Mockup indicator */}
            {isMockupData && showMockup && (
                <div className="mt-2 pt-2 border-t text-center" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-[9px] text-gray-500">
                        📋 Showing demo data • Run optimization for real results
                    </span>
                </div>
            )}
        </div>
    );
}
