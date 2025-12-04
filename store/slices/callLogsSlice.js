import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    callLogs: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
    },
};

const callLogsSlice = createSlice({
    name: 'callLogs',
    initialState,
    reducers: {
        setCallLogs: (state, action) => {
            state.callLogs = action.payload;
            state.loading = false;
            state.error = null;
        },

        addCallLog: (state, action) => {
            state.callLogs.unshift(action.payload);
        },

        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },

        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },

        clearCallLogs: (state) => {
            state.callLogs = [];
            state.pagination = initialState.pagination;
        },
    },
});

export const {
    setCallLogs,
    addCallLog,
    setPagination,
    setLoading,
    setError,
    clearCallLogs
} = callLogsSlice.actions;

export default callLogsSlice.reducer;

// Selectors
export const selectCallLogs = (state) => state.callLogs.callLogs;
export const selectCallLogsLoading = (state) => state.callLogs.loading;
export const selectCallLogsPagination = (state) => state.callLogs.pagination;
