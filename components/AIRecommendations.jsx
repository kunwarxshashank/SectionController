import { useState, useEffect } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { RefreshCw, Zap, Check, X, AlertCircle } from 'lucide-react';
import { getPriorityBadge, formatTrainNumber } from '@/lib/trainUtils';

export default function AIRecommendations() {
    const { recommendations, subscribeToRecommendations } = useWebSocket();
    const [processing, setProcessing] = useState({});

    useEffect(() => {
        // Subscribe to recommendations on mount
        subscribeToRecommendations();
    }, [subscribeToRecommendations]);

    const handleAction = (recommendationId, action) => {
        setProcessing((prev) => ({ ...prev, [recommendationId]: action }));

        // Simulate processing
        setTimeout(() => {
            setProcessing((prev) => {
                const newState = { ...prev };
                delete newState[recommendationId];
                return newState;
            });
        }, 2000);
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 90) return 'text-green-400';
        if (confidence >= 75) return 'text-yellow-400';
        return 'text-orange-400';
    };

    const getActionIcon = (actionType) => {
        if (actionType?.toLowerCase().includes('hold')) return '⏸️';
        if (actionType?.toLowerCase().includes('priority')) return '⚡';
        if (actionType?.toLowerCase().includes('reroute')) return '🔄';
        if (actionType?.toLowerCase().includes('speed')) return '🏃';
        return '📍';
    };

    return (
        <div className="card h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
                        <Zap size={24} className="text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">AI Recommendations</h2>
                        <p className="text-xs text-gray-400">
                            {recommendations.length} active {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => subscribeToRecommendations()}
                    className="p-2 text-ir-cream hover:bg-white/10 rounded-lg transition-all"
                    title="Refresh"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Recommendations List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {recommendations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Zap size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No recommendations</p>
                        <p className="text-xs mt-2">AI is monitoring traffic</p>
                    </div>
                ) : (
                    recommendations.map((rec, index) => {
                        const recId = rec.id || index;
                        const isProcessing = processing[recId];

                        return (
                            <div
                                key={recId}
                                className="glass-orange p-4 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all"
                            >
                                {/* Train Info and Priority */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-lg font-bold text-white">
                                                {formatTrainNumber(rec.train_id || rec.train_number)}
                                            </span>
                                            <span className="text-sm text-ir-cream">
                                                {rec.train_name || ''}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        <span className={`badge ${getPriorityBadge(rec.priority)}`}>
                                            {rec.priority || 'Medium'}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Type */}
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="text-2xl">{getActionIcon(rec.action_type)}</span>
                                    <span className="text-sm font-semibold text-ir-orange">
                                        {rec.action_type || 'Recommendation'}
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-gray-200 mb-3 line-clamp-3">
                                    {rec.rationale || rec.description || 'AI-generated recommendation for optimal traffic flow.'}
                                </p>

                                {/* Metadata */}
                                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                                    {rec.confidence !== undefined && (
                                        <div className="flex justify-between bg-black/20 rounded px-2 py-1">
                                            <span className="text-gray-400">Confidence:</span>
                                            <span className={`font-bold ${getConfidenceColor(rec.confidence)}`}>
                                                {rec.confidence}%
                                            </span>
                                        </div>
                                    )}
                                    {rec.delay !== undefined && (
                                        <div className="flex justify-between bg-black/20 rounded px-2 py-1">
                                            <span className="text-gray-400">Delay:</span>
                                            <span className="font-bold text-red-400">{rec.delay} min</span>
                                        </div>
                                    )}
                                    {rec.delay_status && (
                                        <div className="flex justify-between bg-black/20 rounded px-2 py-1">
                                            <span className="text-gray-400">Status:</span>
                                            <span className="font-bold text-yellow-400">{rec.delay_status}</span>
                                        </div>
                                    )}
                                    {rec.estimatedBenefit && (
                                        <div className="flex justify-between bg-black/20 rounded px-2 py-1">
                                            <span className="text-gray-400">Benefit:</span>
                                            <span className="font-bold text-green-400">{rec.estimatedBenefit}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleAction(recId, 'accept')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-sm font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'accept' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={16} />
                                                <span>Accept</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleAction(recId, 'override')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-white text-sm font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'override' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={16} />
                                                <span>Override</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleAction(recId, 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-sm font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'reject' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={16} />
                                                <span>Reject</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
