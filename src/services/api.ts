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
            if (typeof config.headers.set === 'function') {
                config.headers.set('Authorization', `Bearer ${token}`);
            } else {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

import { logout } from '../utils/auth';
import toast from 'react-hot-toast';

// Variables to handle token refresh queueing
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response Interceptor: Handle global success and error notifications
api.interceptors.response.use(
    (response) => {
        const { config } = response;
        // @ts-ignore - support both skipToast and X-Skip-Toast header
        const skipToast = config.skipToast || config.headers?.['X-Skip-Toast'];

        // Normalize method to lowercase safely
        const method = (config.method || '').toLowerCase();
        const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
        
        // Show success toast for mutations (excluding common non-CRUD POSTs if needed, like login)
        if (isMutation && !skipToast) {
            const url = config.url || '';
            const isAuthAction = url.includes('login') || url.includes('logout') || url.includes('change-password') || url.includes('refresh');
            
            // Determine a descriptive fallback based on the URL if no message is provided
            let defaultMessage = 'Action completed successfully';
            
            if (isAuthAction) {
                if (url.includes('login')) defaultMessage = 'Logged in successfully';
                if (url.includes('logout')) defaultMessage = 'Logged out successfully';
                if (url.includes('change-password')) defaultMessage = 'Password changed successfully';
                // Don't show toast for refresh
                if (url.includes('refresh')) defaultMessage = '';
            } else if (url.includes('admin') || url.includes('manager') || url.includes('staff')) {
                const action = method === 'post' ? 'created' : method === 'put' || method === 'patch' ? 'updated' : 'deleted';
                defaultMessage = `Role ${action} successfully`;
            }

            // Priority: response.data.message -> response.data.data.message -> response.data.status -> default
            // We only use data.status if it's a string (avoid catching numeric status codes)
            const message = response.data?.message || 
                          response.data?.data?.message || 
                          (typeof response.data?.status === 'string' ? response.data.status : null) ||
                          defaultMessage;
            
            if (message) {
                toast.success(message);
            }
        }

        return response;
    },
    async (error) => {
        const { config } = error;
        // @ts-ignore
        const skipToast = config?.skipToast || config?.headers?.['X-Skip-Toast'];
        
        const response = error.response;
        const status = response?.status;
        const errorData = response?.data;
        
        // Extract error message reliably
        const errorMessage = errorData?.message || errorData?.error || error.message || 'An unexpected error occurred';
        const errorCode = errorData?.code || errorData?.error;

        // 1. Handle Authentication Errors (always show toast and logout)
        if (status === 401 || (status === 403 && (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN'))) {
            const originalRequest = config;
            
            // If the retried request itself fails, we must force logout to avoid infinite loops
            if (originalRequest._retry) {
                logout('expired');
                return Promise.reject(error);
            }

            const refreshToken = localStorage.getItem('refreshToken');
            const apiRole = localStorage.getItem('apiRole');

            if (refreshToken && apiRole) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    })
                        .then((token) => {
                            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
                                originalRequest.headers.set('Authorization', `Bearer ${token}`);
                            } else {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                            }
                            return api(originalRequest);
                        })
                        .catch((err) => {
                            return Promise.reject(err);
                        });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    // Use the centralized refresh function to avoid race conditions
                    const { performTokenRefresh } = await import('../hooks/useAuthRefresh');
                    const result = await performTokenRefresh();

                    if (result && result.accessToken) {
                        if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
                            originalRequest.headers.set('Authorization', `Bearer ${result.accessToken}`);
                        } else {
                            originalRequest.headers.Authorization = `Bearer ${result.accessToken}`;
                        }
                        processQueue(null, result.accessToken);
                        return api(originalRequest);
                    } else {
                        throw new Error('No tokens returned from refresh');
                    }
                } catch (err) {
                    processQueue(err, null);
                    logout('expired');
                    return Promise.reject(err);
                } finally {
                    isRefreshing = false;
                }
            }

            // No refresh token or role stored, force logout
            logout('expired');
            return Promise.reject(error);
        }

        // 2. Handle Other Errors (if not explicitly skipped)
        if (!skipToast) {
            toast.error(errorMessage);
        }

        return Promise.reject(error);
    }
);

export default api;
