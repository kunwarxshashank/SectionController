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

// ============================================================
// OPTIMIZATION / DECISION ENGINE APIs
// ============================================================

// Decision engine base URL (separate from main backend)
const DECISION_ENGINE_URL = process.env.NEXT_PUBLIC_DECISION_ENGINE_URL || 'http://localhost:5002';

/**
 * Run schedule optimization via the decision engine
 * @param {Object} sectionData - Section data with tracks, stations
 * @param {Array} trains - Array of train objects
 * @returns {Object} Optimization results with trainSchedules, recommendations, etc.
 */
export const optimizeScheduleApi = async (sectionData, trains) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/optimize`, {
        sectionData,
        trains
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 second timeout for optimization
    });
    return response.data;
};

/**
 * Validate section/train data before optimization
 */
export const validateScheduleDataApi = async (data) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/validate`, data, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

/**
 * Get time-distance profiles only
 */
export const getTimeDistanceApi = async (sectionData, trains) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/time-distance`, {
        sectionData,
        trains
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return response.data;
};

/**
 * TEST CASE 1: Where to add loop line
 * Finds the best station to add a loop for maximum freight throughput.
 */
export const testCaseLoopApi = async (sectionData, trains) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/testcase/loop`, {
        sectionData,
        trains
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return response.data;
};

/**
 * TEST CASE 2: Where to add automatic signalling
 * Finds the best block sections to upgrade to automatic signalling.
 */
export const testCaseSignallingApi = async (sectionData, trains) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/testcase/signalling`, {
        sectionData,
        trains
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return response.data;
};


/**
 * TEST CASE 3: What if we add extra freight trains
 * Simulates adding more freight trains and shows impact on schedule.
 */
export const testCaseFreightApi = async (sectionData, trains) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/testcase/freight`, {
        sectionData,
        trains
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return response.data;
};


/**
 * TEST CASE 4: Automatic Block Upgrade Simulation
 * Given two stations (fromStation, toStation), simulate upgrading the segment
 * 
 * @param {Object} sectionData - Section data with tracks, stations
 * @param {Array} trains - Array of train objects
 * @param {string} fromStationId - Starting station ID (e.g., "bhopal", "BPL")
 * @param {string} toStationId - Ending station ID (e.g., "vidisha", "VDA")
 */
export const testCaseAutoBlockUpgradeApi = async (sectionData, trains, fromStationId, toStationId) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/testcase/autoblockupgrade`, {
        sectionData,
        trains,
        fromStationId,
        toStationId
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // 2 minute timeout for CP-SAT optimization
    });
    return response.data;
};


/**
 * TEST CASE 4: Loop Placement Simulation
 * Given a specific station, simulate adding a loop and return:
 * - Impact on trains (benefited/unaffected)
 * - Time-distance graph data (before/after)
 * - Estimated extra freight trains possible
 * 
 * @param {Object} sectionData - Section data with tracks, stations
 * @param {Array} trains - Array of train objects
 * @param {string} targetStationId - Station ID where to add the loop (e.g., "bhopal", "vidisha", "bina")
 */
export const testCaseLoopSimulateApi = async (sectionData, trains, targetStationId) => {
    const response = await axios.post(`${DECISION_ENGINE_URL}/api/testcase/loop-simulate`, {
        sectionData,
        trains,
        targetStationId
    }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    return response.data;
};

export default apiClient;

