import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getWebSocketManager } from '../lib/websocket';

const WebSocketContext = createContext();

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const [trains, setTrains] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [sectionMetadata, setSectionMetadata] = useState(null);
    const [wsManager, setWsManager] = useState(null);

    useEffect(() => {
        // Initialize WebSocket manager
        const manager = getWebSocketManager();
        setWsManager(manager);

        // Set up event listeners
        manager.on('connected', (isConnected) => {
            setConnected(isConnected);
        });

        manager.on('sectionUpdate', (data) => {
            setTrains(data.trains || []);
            setSectionMetadata(data.metadata);
        });

        manager.on('recommendationsUpdate', (data) => {
            setRecommendations(data.recommendations || []);
        });

        // Connect to WebSocket
        manager.connect();

        // Cleanup on unmount
        return () => {
            manager.disconnect();
        };
    }, []);

    const subscribeToSection = useCallback((sectionId) => {
        if (wsManager) {
            wsManager.subscribeToSection(sectionId);
        }
    }, [wsManager]);

    const subscribeToRecommendations = useCallback(() => {
        if (wsManager) {
            wsManager.subscribeToRecommendations();
        }
    }, [wsManager]);

    const value = {
        connected,
        trains,
        recommendations,
        sectionMetadata,
        subscribeToSection,
        subscribeToRecommendations,
    };

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
