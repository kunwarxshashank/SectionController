import { createSlice } from "@reduxjs/toolkit";

// Helper to safely access localStorage (SSR-safe)
const getStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { admin: null, accessToken: null, refreshToken: null };
  }

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
  isSectionAdmin: false,
  stationId: null,
  sectionId: null,
  isAuthenticated: false,
  loading: true,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    // Initialize auth state from localStorage on app mount
    initializeAuth: (state) => {
      const stored = getStoredAuth();
      if (stored.admin) {
        state.admin = stored.admin;
        state.accessToken = stored.accessToken;
        state.refreshToken = stored.refreshToken;
        state.isSectionAdmin = stored.admin.isSectionAdmin ?? false;
        state.stationId = stored.admin.stationId ?? null;
        state.sectionId = stored.admin.sectionId ?? null;
        state.isAuthenticated = !!stored.accessToken;
      }
      state.loading = false;
    },

    // Set auth data after login
    setCredentials: (state, action) => {
      const { admin, accessToken, refreshToken } = action.payload;

      state.admin = admin;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isSectionAdmin = admin.isSectionAdmin ?? false;
      state.stationId = admin.stationId ?? null;
      state.sectionId = admin.sectionId ?? null;
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
      state.isSectionAdmin = false;
      state.stationId = null;
      state.sectionId = null;
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
  }
});


export const {
  initializeAuth,
  setCredentials,
  updateTokens,
  clearCredentials,
  setLoading
} = adminSlice.actions;

export default adminSlice.reducer;


// Selectors
export const selectAdmin = (state) => state.admin.admin;
export const selectIsAuthenticated = (state) => state.admin.isAuthenticated;
export const selectAuthLoading = (state) => state.admin.loading;
export const selectAccessToken = (state) => state.admin.accessToken;
export const selectIsSectionAdmin = (state) => state.admin.isSectionAdmin;
export const selectSectionId = (state) => state.admin.sectionId;
export const selectStationId = (state) => state.admin.stationId;