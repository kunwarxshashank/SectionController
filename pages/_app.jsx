import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Provider } from 'react-redux';
import { store } from '../store/index';

export default function App({ Component, pageProps }) {
    return (
        <Provider store={store}>
            <ThemeProvider>
                <AuthProvider>
                    <WebSocketProvider>
                        <Component {...pageProps} />
                    </WebSocketProvider>
                </AuthProvider>
            </ThemeProvider>
        </Provider>
    );
}
