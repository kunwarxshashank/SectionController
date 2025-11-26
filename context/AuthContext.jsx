import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginFn, logout as logoutFn, getAdminData, isAuthenticated } from '../lib/auth';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        // Check authentication status on mount
        const checkAuth = () => {
            const isAuth = isAuthenticated();
            setAuthenticated(isAuth);

            if (isAuth) {
                const adminData = getAdminData();
                setAdmin(adminData);
            }

            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        const result = await loginFn(email, password);

        if (result.success) {
            setAdmin(result.admin);
            setAuthenticated(true);
        }

        return result;
    };

    const logout = () => {
        logoutFn();
        setAdmin(null);
        setAuthenticated(false);
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
