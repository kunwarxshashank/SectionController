import { useState, useEffect } from 'react';
import { RefreshCw, Zap, Check, X, AlertCircle, Clock, ArrowRight, Sparkles } from 'lucide-react';

export default function AIRecommendations() {
    const [recommendations, setRecommendations] = useState([]);
    const [processing, setProcessing] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const sectionId = '692ea55789d2e3506f170bb5';
            const response = await fetch(`${process.env.NEXT_PUBLIC_AIENGINE}/api/orengine?sectionid=${sectionId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }
            const data = await response.json();
            setRecommendations(generateTrainInstructions(data));
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
        const interval = setInterval(fetchRecommendations, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = (recommendationId, action) => {
        setProcessing((prev) => ({ ...prev, [recommendationId]: action }));
        setTimeout(() => {
            setProcessing((prev) => {
                const newState = { ...prev };
                delete newState[recommendationId];
                return newState;
            });
        }, 2000);
    };

    function generateTrainInstructions(scheduleData) {
        return scheduleData.map(train => {
            const { train_name, use_loop, enter_at_s, exit_at_s, duration_s } = train;
            let instruction = "";

            if (use_loop) {
                instruction = `Loop the train ${train_name}. Start at ${enter_at_s}s and remove at ${exit_at_s}s.`;
            } else {
                const speedKmH = ((2 / duration_s) * 3600).toFixed(2);

                if (enter_at_s === 0) {
                    instruction = `Move this train ${train_name} with the speed of ${speedKmH} km/h for 2 km.`;
                } else {
                    instruction = `Delay this train ${train_name} for ${enter_at_s}s and after that start it with the speed of ${speedKmH} km/h for 2 km.`;
                }
            }

            return {
                ...train,
                instruction,
            };
        });
    }

    return (
        <div className="card h-full flex flex-col animate-fade-in">
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
                        <Sparkles size={20} style={{ color: 'var(--text-primary)' }} className="animate-pulse" />
                        <div
                            className="absolute inset-0 loading-shimmer opacity-30"
                            style={{ background: 'var(--shimmer-gradient)' }}
                        />
                    </div>
                    <div>
                        <h2
                            className="text-sm font-bold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            AI Recommendations
                        </h2>
                        <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {recommendations.length} active {recommendations.length === 1 ? 'suggestion' : 'suggestions'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchRecommendations}
                    disabled={loading}
                    className="p-2.5 rounded-lg transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'var(--surface-glass)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)'
                    }}
                    title="Refresh recommendations"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {error && (
                    <div
                        className="p-3 rounded-xl animate-slide-in"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <div className="flex items-center space-x-2 mb-1">
                            <AlertCircle size={16} style={{ color: '#fca5a5' }} />
                            <span
                                className="font-bold text-xs"
                                style={{ color: '#fca5a5' }}
                            >
                                Error loading data
                            </span>
                        </div>
                        <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>
                    </div>
                )}

                {loading && recommendations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="spinner mx-auto mb-3 w-6 h-6"></div>
                        <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Loading AI recommendations...
                        </p>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-12">
                        <Zap
                            size={48}
                            className="mx-auto mb-3 opacity-20"
                            style={{ color: 'var(--text-tertiary)' }}
                        />
                        <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            No recommendations
                        </p>
                        <p
                            className="text-xs mt-1"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            OR Engine is optimizing traffic
                        </p>
                    </div>
                ) : (
                    recommendations.map((rec, index) => {
                        const recId = index;
                        const isProcessing = processing[recId];

                        return (
                            <div
                                key={recId}
                                className="card-hover p-3 animate-slide-in rounded-lg"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(234, 115, 23, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                    border: '1px solid var(--border-accent)',
                                    animationDelay: `${index * 0.05}s`
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs"
                                            style={{
                                                background: 'var(--gradient-accent)',
                                                color: 'white'
                                            }}
                                        >
                                            {index + 1}
                                        </div>
                                        <span
                                            className="text-xs font-bold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            A.I
                                        </span>
                                    </div>

                                    <span className={`badge text-[10px] px-1.5 py-0.5 ${rec.use_loop ? 'badge-info' : 'badge-success'}`}>
                                        {rec.use_loop ? '🔄 Loop' : '→ Direct'}
                                    </span>
                                </div>

                                {/* Instruction Box */}
                                <div
                                    className="rounded-lg p-2 mb-2"
                                    style={{
                                        background: 'var(--surface-glass)',
                                        border: '1px solid var(--border-secondary)'
                                    }}
                                >
                                    <div
                                        className="text-[10px] font-bold uppercase tracking-wider mb-1"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    >
                                        AI Instruction
                                    </div>
                                    <div
                                        className="text-xs font-medium leading-relaxed"
                                        style={{
                                            color: 'var(--brand-orange)',
                                            lineHeight: '1.5'
                                        }}
                                    >
                                        {rec.instruction}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleAction(recId, 'accept')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: isProcessing === 'accept'
                                                ? 'rgba(34, 197, 94, 0.3)'
                                                : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                            color: 'var(--text-primary)',
                                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                                            minWidth: '0'
                                        }}
                                    >
                                        {isProcessing === 'accept' ? (
                                            <>
                                                <div className="spinner-sm w-3 h-3"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={12} />
                                                <span className="hidden sm:inline">Accept</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'override')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: isProcessing === 'override'
                                                ? 'rgba(234, 179, 8, 0.3)'
                                                : 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                                            color: 'var(--text-primary)',
                                            boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
                                            minWidth: '0'
                                        }}
                                    >
                                        {isProcessing === 'override' ? (
                                            <>
                                                <div className="spinner-sm w-3 h-3"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={12} />
                                                <span className="hidden sm:inline">Override</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            background: isProcessing === 'reject'
                                                ? 'rgba(239, 68, 68, 0.3)'
                                                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                            color: 'var(--text-primary)',
                                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                            minWidth: '0'
                                        }}
                                    >
                                        {isProcessing === 'reject' ? (
                                            <>
                                                <div className="spinner-sm w-3 h-3"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={12} />
                                                <span className="hidden sm:inline">Reject</span>
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
