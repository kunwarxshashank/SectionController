import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ThemeProvider } from '@/context/ThemeContext';

export default function App({ Component, pageProps }) {
    return (
        <ThemeProvider>
            <AuthProvider>
                <WebSocketProvider>
                    <Component {...pageProps} />
                </WebSocketProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
