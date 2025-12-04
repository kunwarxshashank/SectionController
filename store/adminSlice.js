import { createSlice } from "@reduxjs/toolkit";

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    admin: null,
    accessToken: null,
    refreshToken: null,
    isSectionAdmin: false,
    stationId: null,
    sectionId: null
  },

  reducers: {
    setAdminData: (state, action) => {
      const { admin, accessToken, refreshToken } = action.payload;

      state.admin = admin;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isSectionAdmin = admin.isSectionAdmin;
      state.stationId = admin.stationId;
      state.sectionId = admin.sectionId;
    },

    logoutAdmin: (state) => {
      return {
        admin: null,
        accessToken: null,
        refreshToken: null,
        isSectionAdmin: false,
        stationId: null,
        sectionId: null
      };
    }
  }
});

export const { setAdminData, logoutAdmin } = adminSlice.actions;
export default adminSlice.reducer;
