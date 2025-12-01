import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Home, Radio, FileText, ScrollText, FlaskConical, LogOut, Train } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ui/ThemeToggle';

export default function Layout({ children }) {
    const router = useRouter();
    const { logout, admin } = useAuth();
    const { theme } = useTheme();
    const currentPath = router.pathname;

    const navigation = [
        { name: 'Home', href: '/home', icon: Home },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Logs', href: '/logs', icon: ScrollText },
        { name: 'Test Cases', href: '/testcase', icon: FlaskConical },
    ];

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <div
            className="min-h-screen transition-all duration-300"
            style={{
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, #001233 0%, #002B5B 50%, #001233 100%)'
                    : 'linear-gradient(135deg, #F0F4F8 0%, #E0E7EF 50%, #D1D9E6 100%)'
            }}
        >

            {/* Top Navigation Bar */}
            <nav className="glass-dark border-b railway-pattern" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="max-w-full px-6 py-3">
                    <div className="flex items-center justify-between">
                        {/* Logo and Branding */}
                        <div className="flex items-center space-x-3">
                            <div
                                className="p-2 rounded-lg transition-all duration-300 hover:scale-110"
                                style={{
                                    background: theme === 'dark'
                                        ? 'linear-gradient(135deg, #EA7317 0%, #FF9933 100%)'
                                        : 'linear-gradient(135deg, #1D2E4E 0%, #2A4365 100%)',
                                    boxShadow: theme === 'dark'
                                        ? '0 4px 15px rgba(234, 115, 23, 0.3)'
                                        : '0 4px 15px rgba(29, 46, 78, 0.3)'
                                }}
                            >
                                <Train size={28} className="text-white" />
                            </div>
                            <div>
                                <h1
                                    className="text-lg font-bold font-railway tracking-wide"
                                    style={{
                                        background: 'var(--gradient-accent)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    }}
                                >
                                    भारतीय रेल • INDIAN RAILWAYS
                                </h1>
                                <p
                                    className="text-sm font-medium mt-1"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    Section Controller Portal  •  सेक्शन नियंत्रक पोर्टल
                                </p>
                            </div>
                        </div>


                        {/* Navigation Links */}
                        <div className="flex items-center space-x-2">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = currentPath === item.href;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`group relative flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${isActive
                                            ? 'scale-105'
                                            : 'hover:scale-105'
                                            }`}
                                        style={{
                                            background: isActive
                                                ? 'var(--gradient-accent)'
                                                : 'transparent',
                                            color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                            boxShadow: isActive ? '0 4px 15px rgba(234, 115, 23, 0.4)' : 'none',
                                        }}
                                    >
                                        <Icon
                                            size={20}
                                            className={`transition-all duration-300 ${!isActive && 'group-hover:scale-110'
                                                }`}
                                        />
                                        <span>{item.name}</span>
                                        {isActive && (
                                            <div
                                                className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, transparent, #ffffff, transparent)' }}
                                            />
                                        )}
                                        {!isActive && (
                                            <div
                                                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                style={{ background: 'var(--surface-glass)' }}
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>


                        {/* User Info, Theme Toggle and Logout */}
                        <div className="flex items-center space-x-4">
                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* User Info */}
                            <div className="text-right px-4 py-2 glass rounded-lg">
                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {admin?.email || 'Admin'}
                                </p>
                                <p
                                    className="text-xs font-medium"
                                    style={{ color: 'var(--text-tertiary)' }}
                                >
                                    Section Controller
                                </p>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="p-2.5 rounded-lg transition-all duration-300 hover:scale-110 group"
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                }}
                                title="Logout"
                            >
                                <LogOut
                                    size={20}
                                    className="transition-colors duration-300"
                                    style={{ color: '#fca5a5' }}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="p-6">
                {children}
            </main>


            {/* Footer */}
            <footer
                className="glass-dark border-t py-4 mt-12"
                style={{ borderColor: 'var(--border-primary)' }}
            >
                <div className="max-w-full px-6">
                    <div className="flex items-center justify-between">
                        <p
                            className="text-sm font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            © 2025 Indian Railways. All rights reserved.
                        </p>
                        <div className="flex items-center space-x-2">
                            <div
                                className="w-2 h-2 rounded-full live-pulse"
                                style={{ background: '#22c55e' }}
                            />
                            <p
                                className="text-xs font-semibold"
                                style={{ color: 'var(--text-tertiary)' }}
                            >
                                Powered by AI-Optimized Traffic Control System
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
