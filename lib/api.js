import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if available
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle token refresh on 401
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/admin/refresh`, {
                        refreshToken,
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // If refresh fails, logout user
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('admin');
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ============================================================
// AUTH APIs
// ============================================================

export const loginApi = async (id, password) => {
    const response = await apiClient.post('/admin/login', { id, password });
    return response.data;
};

export const refreshTokenApi = async (refreshToken) => {
    const response = await apiClient.post('/admin/refresh', { refreshToken });
    return response.data;
};

// ============================================================
// LOGS APIs
// ============================================================

export const fetchLogsApi = async (filters = {}) => {
    const response = await apiClient.get('/logs', { params: filters });
    return response.data;
};

export const fetchSectionLogsApi = async (sectionId) => {
    const response = await apiClient.get(`/logs/section/${sectionId}`);
    return response.data;
};

export const fetchTrainLogsApi = async (trainId) => {
    const response = await apiClient.get(`/logs/train/${trainId}`);
    return response.data;
};

export const addLogApi = async (logData) => {
    const response = await apiClient.post('/logs', logData);
    return response.data;
};

// ============================================================
// SECTION APIs
// ============================================================

export const fetchSectionDataApi = async () => {
    const response = await apiClient.get('/sections');
    return response.data;
};

export default apiClient;
