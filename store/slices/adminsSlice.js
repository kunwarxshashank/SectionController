import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    admins: [],
    loading: false,
    error: null,
};

const adminsSlice = createSlice({
    name: 'admins',
    initialState,
    reducers: {
        setAdmins: (state, action) => {
            state.admins = action.payload;
            state.loading = false;
            state.error = null;
        },

        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        setError: (state, action) => {
            state.error = action.payload;
            state.loading = false;
        },

        clearAdmins: (state) => {
            state.admins = [];
            state.error = null;
        },
    },
});

export const { setAdmins, setLoading, setError, clearAdmins } = adminsSlice.actions;

export default adminsSlice.reducer;

// Selectors
export const selectAdmins = (state) => state.admins.admins;
export const selectAdminsLoading = (state) => state.admins.loading;
