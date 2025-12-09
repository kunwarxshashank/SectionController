import { createSlice } from "@reduxjs/toolkit";

/**
 * Optimization Slice
 * Stores results from the decision engine /api/optimize endpoint
 */
const initialState = {
    // API response data
    success: false,
    message: '',
    summary: {
        totalTrains: 0,
        passengerTrains: 0,
        freightTrains: 0,
        freightCompleted: 0,
        totalLoopUsages: 0,
        solverStatus: '',
    },
    trainSchedules: [],
    timeDistanceGraphData: [],
    recommendations: [],
    loopDecisionStrings: [],
    explanation: '',
    
    // UI state
    loading: false,
    error: null,
    lastOptimized: null,
};

const optimizationSlice = createSlice({
    name: "optimization",
    initialState,
    reducers: {
        // Start optimization request
        setOptimizationLoading: (state) => {
            state.loading = true;
            state.error = null;
        },

        // Set optimization results from API
        setOptimizationResults: (state, action) => {
            const result = action.payload;
            
            state.success = result.success ?? false;
            state.message = result.message ?? '';
            state.summary = result.summary ?? initialState.summary;
            state.trainSchedules = result.trainSchedules ?? [];
            state.timeDistanceGraphData = result.timeDistanceGraphData ?? [];
            state.recommendations = result.recommendations ?? [];
            state.loopDecisionStrings = result.loopDecisionStrings ?? [];
            state.explanation = result.explanation ?? '';
            
            state.loading = false;
            state.error = null;
            state.lastOptimized = new Date().toISOString();
        },

        // Set optimization error
        setOptimizationError: (state, action) => {
            state.loading = false;
            state.error = action.payload;
            state.success = false;
        },

        // Clear all optimization data
        clearOptimization: (state) => {
            return { ...initialState };
        },
    }
});

export const {
    setOptimizationLoading,
    setOptimizationResults,
    setOptimizationError,
    clearOptimization,
} = optimizationSlice.actions;

export default optimizationSlice.reducer;

// Selectors
export const selectOptimizationLoading = (state) => state.optimization.loading;
export const selectOptimizationError = (state) => state.optimization.error;
export const selectOptimizationSuccess = (state) => state.optimization.success;
export const selectOptimizationSummary = (state) => state.optimization.summary;
export const selectTrainSchedules = (state) => state.optimization.trainSchedules;
export const selectTimeDistanceData = (state) => state.optimization.timeDistanceGraphData;
export const selectRecommendations = (state) => state.optimization.recommendations;
export const selectLoopDecisions = (state) => state.optimization.loopDecisionStrings;
export const selectExplanation = (state) => state.optimization.explanation;
export const selectLastOptimized = (state) => state.optimization.lastOptimized;
