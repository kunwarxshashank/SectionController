import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Train, Lock, Mail } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { login, authenticated } = useAuth();

    useEffect(() => {
        if (authenticated) {
            router.push('/home');
        }
    }, [authenticated, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            router.push('/home');
        } else {
            setError(result.error || 'Login failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center gradient-railway relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, #EA7317 0px, #EA7317 2px, transparent 2px, transparent 40px), repeating-linear-gradient(0deg, #EA7317 0px, #EA7317 2px, transparent 2px, transparent 40px)',
                }}></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-4 bg-ir-orange rounded-full shadow-lg shadow-orange-500/50">
                            <Train size={48} className="text-white" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold font-railway text-white mb-2">
                        भारतीय रेल
                    </h1>
                    <h2 className="text-2xl font-semibold text-ir-cream mb-2">
                        INDIAN RAILWAYS
                    </h2>
                    <p className="text-ir-cream/80 text-sm">
                        Section Controller Portal
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-dark rounded-2xl p-8 shadow-2xl">
                    <h3 className="text-2xl font-semibold text-white mb-6 text-center">
                        Admin Login
                    </h3>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-ir-cream mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail size={20} className="text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ir-orange focus:border-transparent transition-all"
                                    placeholder="admin@railway.gov.in"
                                    disabled={loading}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-ir-cream mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ir-orange focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    disabled={loading}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-ir-orange hover:bg-opacity-90 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-ir-cream/60 text-sm">
                    <p>Authorized Personnel Only</p>
                    <p className="mt-1">© 2025 Indian Railways. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
