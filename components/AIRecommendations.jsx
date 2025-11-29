import { useState, useEffect } from 'react';
import { RefreshCw, Zap, Check, X, AlertCircle, Clock, ArrowRight } from 'lucide-react';

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
            const response = await fetch(`http://127.0.0.1:8000/api/orengine?sectionid=${sectionId}`);
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
                    onClick={fetchRecommendations}
                    disabled={loading}
                    className="p-2 text-ir-cream hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-3">
                        <div className="flex items-center space-x-2 text-red-400">
                            <AlertCircle size={20} />
                            <span className="font-semibold">Error loading data</span>
                        </div>
                        <p className="text-sm text-red-300 mt-2">{error}</p>
                    </div>
                )}

                {loading && recommendations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading recommendations...</p>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Zap size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No recommendations</p>
                        <p className="text-xs mt-2">OR Engine is optimizing traffic</p>
                    </div>
                ) : (
                    recommendations.map((rec, index) => {
                        const recId = index;
                        const isProcessing = processing[recId];

                        return (
                            <div
                                key={recId}
                                className="glass-orange p-4 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all"
                            >
                                {/* SIMPLE HEADER */}
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-lg font-bold text-white">
                                        Recommendation #{index + 1}
                                    </span>

                                    <span className={`badge ${rec.use_loop ? 'badge-success' : 'badge-info'}`}>
                                        {rec.use_loop ? '🔄 Loop' : '→ Direct'}
                                    </span>
                                </div>

                                {/* ONLY THE STRING */}
                                <div className="bg-black/20 rounded-lg p-3 mb-3">
                                    <div className="text-xs text-gray-400 mb-1">Instruction</div>
                                    <div className="text-sm font-medium text-ir-orange leading-relaxed">
                                        {rec.instruction}
                                    </div>
                                </div>

                                {/* BUTTONS (unchanged) */}
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => handleAction(recId, 'accept')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white text-xs font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'accept' ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={14} />
                                                <span>Accept</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'override')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-500/50 text-white text-xs font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'override' ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={14} />
                                                <span>Override</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handleAction(recId, 'reject')}
                                        disabled={isProcessing}
                                        className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white text-xs font-medium rounded-lg transition-all"
                                    >
                                        {isProcessing === 'reject' ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={14} />
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
