import { createSlice } from "@reduxjs/toolkit";

const stationSlice = createSlice({
  name: "station",
  initialState: {
    stationData: null,
    otherStations: []
  },

  reducers: {
    setStationData: (state, action) => {
      state.stationData = action.payload.stationData;
      state.otherStations = action.payload.otherStations;
    },

    clearStationData: (state) => {
      state.stationData = null;
      state.otherStations = [];
    }
  }
});

export const { setStationData, clearStationData } = stationSlice.actions;
export default stationSlice.reducer;
