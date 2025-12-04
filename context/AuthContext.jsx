import { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    initializeAuth,
    setCredentials,
    clearCredentials,
    selectCurrentAdmin,
    selectIsAuthenticated,
    selectAuthLoading
} from '@/store/slices/authSlice';
import { loginApi } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();
    const admin = useSelector(selectCurrentAdmin);
    const authenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectAuthLoading);

    useEffect(() => {
        // Initialize auth state from localStorage on mount
        dispatch(initializeAuth());
    }, [dispatch]);

    const login = async (email, password) => {
        try {
            const response = await loginApi(email, password);
            const { accessToken, refreshToken, admin: adminData } = response;

            // Store in Redux (which also persists to localStorage)
            dispatch(setCredentials({ admin: adminData, accessToken, refreshToken }));

            return { success: true, admin: adminData };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.msg || 'Login failed',
            };
        }
    };

    const logout = () => {
        dispatch(clearCredentials());

        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    };

    const value = {
        admin,
        authenticated,
        loading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
