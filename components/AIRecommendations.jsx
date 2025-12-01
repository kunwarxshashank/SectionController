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
            const sectionId = '6926a23c2b59850b5b5b28cf';
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
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3">
                    <div
                        className="p-2.5 rounded-lg relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                        }}
                    >
                        <Sparkles size={24} style={{ color: 'var(--text-primary)' }} className="animate-pulse" />
                        <div
                            className="absolute inset-0 loading-shimmer opacity-30"
                            style={{ background: 'var(--shimmer-gradient)' }}
                        />
                    </div>
                    <div>
                        <h2
                            className="text-l font-bold"
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
            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {error && (
                    <div
                        className="p-4 rounded-xl animate-slide-in"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}
                    >
                        <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle size={20} style={{ color: '#fca5a5' }} />
                            <span
                                className="font-bold text-sm"
                                style={{ color: '#fca5a5' }}
                            >
                                Error loading data
                            </span>
                        </div>
                        <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                    </div>
                )}

                {loading && recommendations.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="spinner mx-auto mb-4"></div>
                        <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Loading AI recommendations...
                        </p>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-16">
                        <Zap
                            size={64}
                            className="mx-auto mb-4 opacity-20"
                            style={{ color: 'var(--text-tertiary)' }}
                        />
                        <p
                            className="text-lg font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            No recommendations
                        </p>
                        <p
                            className="text-sm mt-2"
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
                                className="card-hover p-4 animate-slide-in"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(234, 115, 23, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
                                    border: '1px solid var(--border-accent)',
                                    animationDelay: `${index * 0.05}s`
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                                            style={{
                                                background: 'var(--gradient-accent)',
                                                color: 'white'
                                            }}
                                        >
                                            {index + 1}
                                        </div>
                                        <span
                                            className="text-s font-bold"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            A.I
                                        </span>
                                    </div>

                                    <span className={`badge ${rec.use_loop ? 'badge-info' : 'badge-success'}`}>
                                        {rec.use_loop ? '🔄 Loop' : '→ Direct'}
                                    </span>
                                </div>

                                {/* Instruction Box */}
                                <div
                                    className="rounded-lg p-3 mb-3"
                                    style={{
                                        background: 'var(--surface-glass)',
                                        border: '1px solid var(--border-secondary)'
                                    }}
                                >
                                    <div
                                        className="text-xs font-bold uppercase tracking-wider mb-2"
                                        style={{ color: 'var(--text-tertiary)' }}
                                    >
                                        AI Instruction
                                    </div>
                                    <div
                                        className="text-sm font-medium leading-relaxed"
                                        style={{
                                            color: 'var(--brand-orange)',
                                            lineHeight: '1.6'
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
                                        className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <div className="spinner-sm"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={14} />
                                                <span className="hidden sm:inline">Accept</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'override')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <div className="spinner-sm"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={14} />
                                                <span className="hidden sm:inline">Override</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                                <div className="spinner-sm"></div>
                                                <span className="hidden sm:inline">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={14} />
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
