import { createSlice } from "@reduxjs/toolkit";

// Helper to safely access localStorage (SSR-safe)
const getStoredData = () => {
  if (typeof window === 'undefined') {
    return { stationData: null, sectionData: null, otherStations: [], sectionId: null, isSectionAdmin: false, trainData: [] };
  }

  try {
    const stationData = localStorage.getItem('stationData');
    const sectionData = localStorage.getItem('sectionData');
    const otherStations = localStorage.getItem('otherStations');
    const sectionId = localStorage.getItem('sectionId');
    const isSectionAdmin = localStorage.getItem('isSectionAdmin');
    const trainData = localStorage.getItem('trainData');

    return {
      stationData: stationData ? JSON.parse(stationData) : null,
      sectionData: sectionData ? JSON.parse(sectionData) : null,
      otherStations: otherStations ? JSON.parse(otherStations) : [],
      sectionId: sectionId || null,
      isSectionAdmin: isSectionAdmin === 'true',
      trainData: trainData ? JSON.parse(trainData) : [],
    };
  } catch {
    return { stationData: null, sectionData: null, otherStations: [], sectionId: null, isSectionAdmin: false, trainData: [] };
  }
};

const initialState = {
  stationData: null,      // Single station data (for station admin)
  sectionData: null,      // Full section data with all stations (for section admin)
  otherStations: [],
  sectionId: null,
  isSectionAdmin: false,
  trainData: [],          // Train data from login API
  loading: true,
};

const stationSlice = createSlice({
  name: "station",
  initialState,
  reducers: {
    // Initialize station state from localStorage on app mount
    initializeStation: (state) => {
      const stored = getStoredData();
      state.stationData = stored.stationData;
      state.sectionData = stored.sectionData;
      state.otherStations = stored.otherStations;
      state.sectionId = stored.sectionId;
      state.isSectionAdmin = stored.isSectionAdmin;
      state.trainData = stored.trainData;
      state.loading = false;
    },

    // Set station data after login (for station admin)
    setStationData: (state, action) => {
      const { stationData, otherStations, sectionId, trainData } = action.payload;

      state.stationData = stationData;
      state.sectionData = null;  // Clear section data
      state.otherStations = otherStations || [];
      state.sectionId = sectionId || null;
      state.isSectionAdmin = false;
      state.trainData = trainData || [];
      state.loading = false;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('stationData', JSON.stringify(stationData));
        localStorage.removeItem('sectionData');
        localStorage.setItem('otherStations', JSON.stringify(otherStations || []));
        localStorage.setItem('isSectionAdmin', 'false');
        if (sectionId) localStorage.setItem('sectionId', sectionId);
        localStorage.setItem('trainData', JSON.stringify(trainData || []));
      }
    },

    // Set section data after login (for section admin)
    setSectionData: (state, action) => {
      const { sectionData, sectionId, trainData } = action.payload;

      state.sectionData = sectionData;
      state.stationData = null;  // Clear station data
      state.otherStations = [];
      state.sectionId = sectionId || null;
      state.isSectionAdmin = true;
      state.trainData = trainData || [];
      state.loading = false;

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('sectionData', JSON.stringify(sectionData));
        localStorage.removeItem('stationData');
        localStorage.setItem('otherStations', '[]');
        localStorage.setItem('isSectionAdmin', 'true');
        if (sectionId) localStorage.setItem('sectionId', sectionId);
        localStorage.setItem('trainData', JSON.stringify(trainData || []));
      }
    },

    // Clear station data (logout)
    clearStationData: (state) => {
      state.stationData = null;
      state.sectionData = null;
      state.otherStations = [];
      state.sectionId = null;
      state.isSectionAdmin = false;
      state.trainData = [];
      state.loading = false;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('stationData');
        localStorage.removeItem('sectionData');
        localStorage.removeItem('otherStations');
        localStorage.removeItem('sectionId');
        localStorage.removeItem('isSectionAdmin');
        localStorage.removeItem('trainData');
      }
    },

    // Set train data independently (for updates)
    setTrainData: (state, action) => {
      state.trainData = action.payload || [];
      if (typeof window !== 'undefined') {
        localStorage.setItem('trainData', JSON.stringify(action.payload || []));
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
  setSectionData,
  clearStationData,
  setLoading,
  setTrainData
} = stationSlice.actions;

export default stationSlice.reducer;

// Selectors
export const selectStationData = (state) => state.station.stationData;
export const selectSectionData = (state) => state.station.sectionData;
export const selectIsSectionAdmin = (state) => state.station.isSectionAdmin;
export const selectOtherStations = (state) => state.station.otherStations;
export const selectSectionId = (state) => state.station.sectionId;
export const selectStationLoading = (state) => state.station.loading;
export const selectTrainData = (state) => state.station.trainData;

// Check if any data is available (works for both admin types)
export const selectHasData = (state) => {
  return !!(state.station.stationData || state.station.sectionData);
};

// Get station name - works for both admin types
export const selectStationName = (state) => {
  if (state.station.isSectionAdmin && state.station.sectionData) {
    // sectionData is an object, not an array
    return state.station.sectionData.name || null;
  }
  return state.station.stationData?.stationName || null;
};

// Get station ID - works for both admin types  
export const selectStationId = (state) => {
  if (state.station.isSectionAdmin && state.station.sectionData) {
    // sectionData is an object with section_id property
    return state.station.sectionData.section_id || null;
  }
  return state.station.stationData?.stationId || null;
};

// Get all stations (for section admin, returns all stations; for station admin, returns single station in array)
export const selectAllStations = (state) => {
  if (state.station.isSectionAdmin && state.station.sectionData) {
    // sectionData is an object - stations might be inside it or needs to be derived from tracks
    return state.station.sectionData.stations || [];
  }
  if (state.station.stationData) {
    return [state.station.stationData];
  }
  return [];
};

// Get all tracks from sectionData
export const selectTracks = (state) => {
  if (state.station.sectionData?.tracks) {
    return state.station.sectionData.tracks;
  }
  return [];
};

// Get section name
export const selectSectionName = (state) => {
  if (state.station.sectionData?.name) {
    return state.station.sectionData.name;
  }
  return null;
};

// Get all nodes from all tracks (combined)
export const selectStationNodes = (state) => {
  const tracks = selectTracks(state);
  if (!tracks || tracks.length === 0) return [];

  // Combine nodes from all tracks
  const allNodes = [];
  tracks.forEach(track => {
    if (track.nodes && Array.isArray(track.nodes)) {
      allNodes.push(...track.nodes);
    }
  });
  return allNodes;
};

// Get all edges from all tracks (combined)
export const selectStationEdges = (state) => {
  const tracks = selectTracks(state);
  if (!tracks || tracks.length === 0) return [];

  // Combine edges from all tracks
  const allEdges = [];
  tracks.forEach(track => {
    if (track.edges && Array.isArray(track.edges)) {
      allEdges.push(...track.edges);
    }
  });
  return allEdges;
};
