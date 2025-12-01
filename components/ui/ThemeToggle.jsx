import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`relative p-2 rounded-lg transition-all duration-300 hover:scale-110 ${className}`}
            style={{
                background: theme === 'dark'
                    ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                    : 'linear-gradient(135deg, #1D2E4E 0%, #2A4365 100%)',
                boxShadow: theme === 'dark'
                    ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                    : '0 4px 15px rgba(29, 46, 78, 0.3)',
            }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className="relative w-6 h-6">
                {/* Sun Icon */}
                <Sun
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${theme === 'light'
                        ? 'opacity-100 rotate-0 scale-100'
                        : 'opacity-0 -rotate-90 scale-0'
                        }`}
                    style={{ color: '#fbbf24' }}
                />

                {/* Moon Icon */}
                <Moon
                    size={20}
                    className={`absolute inset-0 transition-all duration-300 ${theme === 'dark'
                        ? 'opacity-100 rotate-0 scale-100'
                        : 'opacity-0 rotate-90 scale-0'
                        }`}
                    style={{ color: '#93c5fd' }}
                />
            </div>
        </button>
    );
}
