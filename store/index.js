import { useDispatch, useSelector } from 'react-redux';

// Auth hooks
export {
    selectCurrentAdmin,
    selectIsAuthenticated,
    selectAuthLoading,
    selectAccessToken
} from './slices/authSlice';

// Call logs hooks
export {
    selectCallLogs,
    selectCallLogsLoading,
    selectCallLogsPagination
} from './slices/callLogsSlice';

// Call hooks
export {
    selectOnlineUsers,
    selectActiveCall,
    selectIncomingCall,
    selectCallStatus,
    selectIsMuted
} from './slices/callSlice';

// Admins hooks
export { selectAdmins, selectAdminsLoading } from './slices/adminsSlice';

// Export store and dispatch for direct usage
export { store, dispatch, getState } from './store';

// Re-export all actions for convenience
export * from './slices/authSlice';
export * from './slices/callLogsSlice';
export * from './slices/callSlice';
export * from './slices/adminsSlice';

// Custom typed hooks (useful for TypeScript)
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
