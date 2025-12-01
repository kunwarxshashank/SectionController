import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');
    const [mounted, setMounted] = useState(false);

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const initialTheme = storedTheme || systemTheme;

        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
        setMounted(true);
    }, []);

    // Update theme
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    const setLightTheme = () => {
        setTheme('light');
        localStorage.setItem('theme', 'light');
        document.documentElement.setAttribute('data-theme', 'light');
    };

    const setDarkTheme = () => {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
    };

    // Prevent flash of unstyled content
    if (!mounted) {
        return <div className="min-h-screen bg-ir-darkblue" />;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setLightTheme, setDarkTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
