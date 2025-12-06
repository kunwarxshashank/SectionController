import '@/styles/globals.css';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Provider, useDispatch } from 'react-redux';
import { store } from '@/store/store';
import { useEffect } from 'react';
import { initializeAuth } from '@/store/slices/adminSlice';
import { initializeStation } from '@/store/slices/stationSlice';

// Component to initialize auth and station data on app mount
function AppInitializer({ children }) {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(initializeAuth());
        dispatch(initializeStation());
    }, [dispatch]);

    return children;
}

export default function App({ Component, pageProps }) {
    return (
        <Provider store={store}>
            <AppInitializer>
                <ThemeProvider>
                    <WebSocketProvider>
                        <Component {...pageProps} />
                    </WebSocketProvider>
                </ThemeProvider>
            </AppInitializer>
        </Provider>
    );
}
