import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { Home, Radio, FileText, ScrollText, FlaskConical, LogOut, Train } from 'lucide-react';
import Link from 'next/link';

export default function Layout({ children }) {
    const router = useRouter();
    const { logout, admin } = useAuth();
    const currentPath = router.pathname;

    const navigation = [
        { name: 'Home', href: '/home', icon: Home },
        { name: 'Broadcast', href: '/broadcast', icon: Radio },
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
        <div className="min-h-screen bg-gradient-to-br from-ir-darkblue via-ir-blue to-ir-darkblue">
            {/* Top Navigation Bar */}
            <nav className="glass-dark border-b border-white/10">
                <div className="max-w-full px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo and Branding */}
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-ir-orange rounded-lg">
                                <Train size={32} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold font-railway text-white">
                                    भारतीय रेल - INDIAN RAILWAYS
                                </h1>
                                <p className="text-sm text-ir-cream/70">Section Controller Portal</p>
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
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive
                                                ? 'bg-ir-orange text-white shadow-lg shadow-orange-500/30'
                                                : 'text-ir-cream hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span className="font-medium">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User Info and Logout */}
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-white">{admin?.email || 'Admin'}</p>
                                <p className="text-xs text-ir-cream/70">Section Controller</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-ir-cream hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all duration-200"
                                title="Logout"
                            >
                                <LogOut size={20} />
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
            <footer className="glass-dark border-t border-white/10 py-4 mt-12">
                <div className="max-w-full px-6 text-center text-ir-cream/60 text-sm">
                    <p>© 2025 Indian Railways. All rights reserved. | Powered by AI-Optimized Traffic Control System</p>
                </div>
            </footer>
        </div>
    );
}
