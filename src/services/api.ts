import axios from 'axios';

// Create an Axios instance with base URL from environment variables
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach JWT token to requests if available
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

import { logout } from '../utils/auth';

// Response Interceptor: Handle global errors like 401 Unauthorized
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorCode = errorData?.code || errorData?.error;

        if (status === 401) {
            // Missing token
            console.warn('Unauthorized access - missing token. Redirecting to login');
            logout();
        } else if (status === 403) {
            // Token is expired or invalid
            if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN') {
                console.warn(`Forbidden access - ${errorCode}. Redirecting to login`);
                logout();
            }
        }
        return Promise.reject(error);
    }
);

export default api;
