import { configureStore } from "@reduxjs/toolkit";
import adminReducer from "./adminSlice";
import sectionReducer from "./sectionSlice";
import stationReducer from "./stationSlice";

export const store = configureStore({
  reducer: {
    admin: adminReducer,
    section: sectionReducer,
    station: stationReducer
  }
});
