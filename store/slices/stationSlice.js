import { createSlice } from "@reduxjs/toolkit";

// Helper to safely access localStorage (SSR-safe)
const getStoredStationData = () => {
  if (typeof window === 'undefined') {
    return { stationData: null, otherStations: [], sectionId: null };
  }

  try {
    const stationData = localStorage.getItem('stationData');
    const otherStations = localStorage.getItem('otherStations');
    const sectionId = localStorage.getItem('sectionId');

    return {
      stationData: stationData ? JSON.parse(stationData) : null,
      otherStations: otherStations ? JSON.parse(otherStations) : [],
      sectionId: sectionId || null,
    };
  } catch {
    return { stationData: null, otherStations: [], sectionId: null };
  }
};

const initialState = {
  stationData: null,
  otherStations: [],
  sectionId: null,
  loading: true,
};

const stationSlice = createSlice({
  name: "station",
  initialState,
  reducers: {
    // Initialize station state from localStorage on app mount
    initializeStation: (state) => {
      const stored = getStoredStationData();
      state.stationData = stored.stationData;
      state.otherStations = stored.otherStations;
      state.sectionId = stored.sectionId;
      state.loading = false;
    },

    // Set station data after login
    setStationData: (state, action) => {
      const { stationData, otherStations, sectionId } = action.payload;

      state.stationData = stationData;
      state.otherStations = otherStations || [];
      state.sectionId = sectionId || null;
      state.loading = false;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('stationData', JSON.stringify(stationData));
        localStorage.setItem('otherStations', JSON.stringify(otherStations || []));
        if (sectionId) localStorage.setItem('sectionId', sectionId);
      }
    },

    // Clear station data (logout)
    clearStationData: (state) => {
      state.stationData = null;
      state.otherStations = [];
      state.sectionId = null;
      state.loading = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('stationData');
        localStorage.removeItem('otherStations');
        localStorage.removeItem('sectionId');
      }
    },

    setLoading: (state, action) => {
      state.loading = action.payload;
    }
  }
});

export const {
  initializeStation,
  setStationData,
  clearStationData,
  setLoading
} = stationSlice.actions;

export default stationSlice.reducer;

// Selectors
export const selectStationData = (state) => state.station.stationData;
export const selectStationNodes = (state) => state.station.stationData?.nodes || [];
export const selectStationEdges = (state) => state.station.stationData?.edges || [];
export const selectOtherStations = (state) => state.station.otherStations;
export const selectSectionId = (state) => state.station.sectionId;
export const selectStationLoading = (state) => state.station.loading;
export const selectStationName = (state) => state.station.stationData?.stationName || null;
export const selectStationId = (state) => state.station.stationData?.stationId || null;

