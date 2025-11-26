import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';

export default function App({ Component, pageProps }) {
    return (
        <AuthProvider>
            <WebSocketProvider>
                <Component {...pageProps} />
            </WebSocketProvider>
        </AuthProvider>
    );
}
