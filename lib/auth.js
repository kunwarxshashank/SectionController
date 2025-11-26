import { jwtDecode } from 'jwt-decode';
import { loginApi } from './api';

// ============================================================
// Token Management
// ============================================================

export const getStoredTokens = () => {
    if (typeof window === 'undefined') return null;

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const admin = localStorage.getItem('admin');

    return {
        accessToken,
        refreshToken,
        admin: admin ? JSON.parse(admin) : null,
    };
};

export const setTokens = (accessToken, refreshToken, admin) => {
    if (typeof window === 'undefined') return;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('admin', JSON.stringify(admin));
};

export const clearTokens = () => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('admin');
};

// ============================================================
// Token Validation
// ============================================================

export const isTokenValid = (token) => {
    if (!token) return false;

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        // Check if token is expired
        return decoded.exp > currentTime;
    } catch (error) {
        return false;
    }
};

export const isAuthenticated = () => {
    const { accessToken } = getStoredTokens();
    return isTokenValid(accessToken);
};

// ============================================================
// Auth Functions
// ============================================================

export const login = async (email, password) => {
    try {
        const response = await loginApi(email, password);

        const { accessToken, refreshToken, admin } = response;

        // Store tokens and admin data
        setTokens(accessToken, refreshToken, admin);

        return { success: true, admin };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data?.msg || 'Login failed',
        };
    }
};

export const logout = () => {
    clearTokens();

    if (typeof window !== 'undefined') {
        window.location.href = '/login';
    }
};

export const getAdminData = () => {
    const { admin } = getStoredTokens();
    return admin;
};
