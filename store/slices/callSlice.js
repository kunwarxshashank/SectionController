import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    onlineUsers: [],
    activeCall: null,
    incomingCall: null,
    callStatus: '', // idle, calling, ringing, connected
    isMuted: false,
    isTranscribing: false,
    currentTranscript: '',
};

const callSlice = createSlice({
    name: 'call',
    initialState,
    reducers: {
        setOnlineUsers: (state, action) => {
            state.onlineUsers = action.payload;
        },

        setActiveCall: (state, action) => {
            state.activeCall = action.payload;
        },

        setIncomingCall: (state, action) => {
            state.incomingCall = action.payload;
        },

        setCallStatus: (state, action) => {
            state.callStatus = action.payload;
        },

        setMuted: (state, action) => {
            state.isMuted = action.payload;
        },

        setTranscribing: (state, action) => {
            state.isTranscribing = action.payload;
        },

        setCurrentTranscript: (state, action) => {
            state.currentTranscript = action.payload;
        },

        resetCallState: (state) => {
            state.activeCall = null;
            state.incomingCall = null;
            state.callStatus = '';
            state.isMuted = false;
            state.isTranscribing = false;
            state.currentTranscript = '';
        },
    },
});

export const {
    setOnlineUsers,
    setActiveCall,
    setIncomingCall,
    setCallStatus,
    setMuted,
    setTranscribing,
    setCurrentTranscript,
    resetCallState
} = callSlice.actions;

export default callSlice.reducer;

// Selectors
export const selectOnlineUsers = (state) => state.call.onlineUsers;
export const selectActiveCall = (state) => state.call.activeCall;
export const selectIncomingCall = (state) => state.call.incomingCall;
export const selectCallStatus = (state) => state.call.callStatus;
export const selectIsMuted = (state) => state.call.isMuted;
