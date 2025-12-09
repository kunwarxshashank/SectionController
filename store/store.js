import { configureStore } from '@reduxjs/toolkit';
import callLogsReducer from './slices/callLogsSlice';
import callReducer from './slices/callSlice';
import adminReducer from "./slices/adminSlice";
import sectionReducer from "./slices/sectionSlice";
import stationReducer from "./slices/stationSlice";
import optimizationReducer from "./slices/optimizationSlice";

export const store = configureStore({
    reducer: {
        callLogs: callLogsReducer,
        call: callReducer,
        admin: adminReducer,
        section: sectionReducer,
        station: stationReducer,
        optimization: optimizationReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for serializable check
                ignoredActions: ['call/setIncomingCall'],
                ignoredPaths: ['call.incomingCall.offer'],
            },
        }),
});

// Export types for TypeScript support (optional)
export const getState = store.getState;
export const dispatch = store.dispatch;