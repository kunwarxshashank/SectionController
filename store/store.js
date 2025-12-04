import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import callLogsReducer from './slices/callLogsSlice';
import callReducer from './slices/callSlice';
import adminsReducer from './slices/adminsSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        callLogs: callLogsReducer,
        call: callReducer,
        admins: adminsReducer,
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