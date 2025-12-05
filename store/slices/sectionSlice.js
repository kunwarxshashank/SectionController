import { createSlice } from "@reduxjs/toolkit";

const sectionSlice = createSlice({
  name: "section",
  initialState: {
    sectionData: null
  },

  reducers: {
    setSectionData: (state, action) => {
      state.sectionData = action.payload;
    },

    clearSectionData: (state) => {
      state.sectionData = null;
    }
  }
});

export const { setSectionData, clearSectionData } = sectionSlice.actions;
export default sectionSlice.reducer;
