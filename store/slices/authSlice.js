import { createSlice } from '@reduxjs/toolkit';

// Helper to safely access localStorage (SSR-safe)
const getStoredAuth = () => {
    if (typeof window === 'undefined') return { admin: null, accessToken: null, refreshToken: null };

    try {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const admin = localStorage.getItem('admin');

        return {
            accessToken,
            refreshToken,
            admin: admin ? JSON.parse(admin) : null,
        };
    } catch {
        return { admin: null, accessToken: null, refreshToken: null };
    }
};

const initialState = {
    admin: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: true,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Initialize auth state from localStorage
        initializeAuth: (state) => {
            const stored = getStoredAuth();
            state.admin = stored.admin;
            state.accessToken = stored.accessToken;
            state.refreshToken = stored.refreshToken;
            state.isAuthenticated = !!stored.accessToken;
            state.loading = false;
        },

        // Set auth data after login
        setCredentials: (state, action) => {
            const { admin, accessToken, refreshToken } = action.payload;
            state.admin = admin;
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            state.loading = false;

            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('admin', JSON.stringify(admin));
            }
        },

        // Update tokens (for refresh)
        updateTokens: (state, action) => {
            const { accessToken, refreshToken } = action.payload;
            state.accessToken = accessToken;
            if (refreshToken) state.refreshToken = refreshToken;

            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', accessToken);
                if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            }
        },

        // Clear auth (logout)
        clearCredentials: (state) => {
            state.admin = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.isAuthenticated = false;
            state.loading = false;

            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('admin');
            }
        },

        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const {
    initializeAuth,
    setCredentials,
    updateTokens,
    clearCredentials,
    setLoading
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentAdmin = (state) => state.auth.admin;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAccessToken = (state) => state.auth.accessToken;
