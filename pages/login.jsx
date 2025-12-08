import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '@/context/ThemeContext';
import { Train, Lock, Shield, User } from 'lucide-react';
import { loginApi } from '@/lib/api';
import {
    setCredentials,
    selectIsAuthenticated,
    selectAuthLoading
} from '@/store/slices/adminSlice';
import { setStationData, setSectionData } from '@/store/slices/stationSlice';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const dispatch = useDispatch();
    const { theme } = useTheme();
    const authenticated = useSelector(selectIsAuthenticated);
    const authLoading = useSelector(selectAuthLoading);

    useEffect(() => {
        if (authenticated) {
            router.push('/home');
        }
    }, [authenticated, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        setLoading(true);

        try {
            const response = await loginApi(username, password);
            const { accessToken, refreshToken, admin, stationData, sectionData, sectionId, otherStations, trainData } = response;

            // Store auth in Redux (which also persists to localStorage)
            dispatch(setCredentials({ admin, accessToken, refreshToken }));

            // Check if section admin (has sectionData) or station admin (has stationData)
            if (admin.isSectionAdmin && sectionData) {
                // Section admin - store full section data with all stations
                dispatch(setSectionData({ sectionData, sectionId: admin.sectionId || sectionData.section_id, trainData }));
            } else if (stationData) {
                // Station admin - store single station data AND sectionData (both are provided)
                // sectionData contains tracks with nodes/edges, stationData is the specific station info
                dispatch(setStationData({ 
                    stationData, 
                    sectionData, // Also store sectionData for station admin (contains tracks)
                    otherStations, 
                    sectionId: sectionId || stationData.sectionId, 
                    trainData 
                }));
            }

            router.push('/home');
        } catch (err) {
            setError(err.response?.data?.msg || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center"
                style={{ background: 'var(--gradient-primary)' }}
            >
                <div className="spinner mb-4"></div>
                <p
                    className="text-lg font-semibold animate-pulse"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Loading...
                </p>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden transition-all duration-300"
            style={{
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, #001233 0%, #002B5B 50%, #001233 100%)'
                    : 'linear-gradient(135deg, #F0F4F8 0%, #E0E7EF 50%, #D1D9E6 100%)'
            }}
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 railway-pattern"></div>
            </div>

            {/* Gradient Overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: theme === 'dark'
                        ? 'radial-gradient(circle at 50% 50%, rgba(234, 115, 23, 0.1) 0%, transparent 50%)'
                        : 'radial-gradient(circle at 50% 50%, rgba(29, 46, 78, 0.08) 0%, transparent 50%)'
                }}
            ></div>

            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div
                            className="p-4 rounded-2xl shadow-2xl"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(135deg, #EA7317 0%, #FF9933 100%)'
                                    : 'linear-gradient(135deg, #1D2E4E 0%, #2A4365 100%)',
                                boxShadow: theme === 'dark'
                                    ? '0 10px 30px rgba(234, 115, 23, 0.4)'
                                    : '0 10px 30px rgba(29, 46, 78, 0.3)'
                            }}
                        >
                            <Train size={40} className="text-white" />
                        </div>
                    </div>
                    <h1
                        className="text-3xl font-bold font-railway mb-2"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        भारतीय रेल • INDIAN RAILWAYS
                    </h1>
                    <p
                        className="text-sm font-medium mb-1"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Section Controller Portal
                    </p>
                    <div className="flex items-center justify-center space-x-2 mt-3">
                        <Shield size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                            Secure Access • अधिकृत प्रवेश
                        </p>
                    </div>
                </div>

                {/* Login Card */}
                <div
                    className="glass-dark rounded-2xl p-8 shadow-2xl animate-slide-in"
                    style={{ border: '1px solid var(--border-primary)' }}
                >
                    <div className="flex items-center justify-center space-x-2 mb-6">
                        <Lock size={20} style={{ color: 'var(--brand-orange)' }} />
                        <h3
                            className="text-lg font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Administrator Login
                        </h3>
                    </div>

                    {error && (
                        <div
                            className="mb-4 p-3 rounded-lg text-sm font-medium animate-slide-in"
                            style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#fca5a5'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="text"
                                className="block text-xs font-bold uppercase tracking-wider mb-2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Enter Your User ID
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={18} style={{ color: 'var(--text-tertiary)' }} />
                                </div>
                                <input
                                    id="text"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg font-medium transition-all duration-200"
                                    style={{
                                        background: 'var(--surface-glass)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                    placeholder="Enter Your ID."
                                    disabled={loading}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-bold uppercase tracking-wider mb-2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={18} style={{ color: 'var(--text-tertiary)' }} />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg font-medium transition-all duration-200"
                                    style={{
                                        background: 'var(--surface-glass)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                    placeholder="••••••••"
                                    disabled={loading}
                                    autoComplete="current-password"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--border-accent)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-primary)'}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 font-bold rounded-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(135deg, #EA7317 0%, #FF9933 100%)'
                                    : 'linear-gradient(135deg, #1D2E4E 0%, #2A4365 100%)',
                                color: '#ffffff',
                                boxShadow: theme === 'dark'
                                    ? '0 4px 20px rgba(234, 115, 23, 0.4)'
                                    : '0 4px 20px rgba(29, 46, 78, 0.3)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner-sm mr-2"></div>
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Shield size={18} className="mr-2" />
                                    Secure Sign In
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div
                    className="mt-6 text-center text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    <p className="font-semibold">🔒 Authorized Personnel Only</p>
                    <p className="mt-2">© 2025 Indian Railways. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
