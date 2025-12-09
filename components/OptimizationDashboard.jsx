import TimeDistanceGraph from './TimeDistanceGraph';
import AIRecommendations from './AIRecommendations';
import FreightCapacity from './FreightCapacity';

/**
 * Optimization Dashboard
 * 
 * Combined view with:
 * - Time-Distance Graph (main visualization)
 * - AI Recommendations panel
 * - Freight Capacity widget
 */
export default function OptimizationDashboard() {
    return (
        <div className="grid grid-cols-12 gap-4 h-full">
            {/* Main Graph - Takes 8 columns */}
            <div className="col-span-12 lg:col-span-8">
                <TimeDistanceGraph />
            </div>

            {/* Right side - AI Recommendations + Freight Capacity */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                {/* AI Recommendations */}
                <div className="flex-1 min-h-0">
                    <AIRecommendations />
                </div>

                {/* Freight Capacity */}
                <div className="flex-shrink-0">
                    <FreightCapacity />
                </div>
            </div>
        </div>
    );
}
