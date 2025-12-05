import '@/styles/globals.css';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Provider, useDispatch } from 'react-redux';
import { store } from '@/store/store';
import { useEffect } from 'react';
import { initializeAuth } from '@/store/slices/adminSlice';

// Component to initialize auth on app mount
function AuthInitializer({ children }) {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(initializeAuth());
    }, [dispatch]);

    return children;
}

export default function App({ Component, pageProps }) {
    return (
        <Provider store={store}>
            <AuthInitializer>
                <ThemeProvider>
                    <WebSocketProvider>
                        <Component {...pageProps} />
                    </WebSocketProvider>
                </ThemeProvider>
            </AuthInitializer>
        </Provider>
    );
}
