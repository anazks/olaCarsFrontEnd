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
import toast from 'react-hot-toast';

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
            const isAuthAction = url.includes('login') || url.includes('logout') || url.includes('change-password');
            
            // Determine a descriptive fallback based on the URL if no message is provided
            let defaultMessage = 'Action completed successfully';
            
            if (isAuthAction) {
                if (url.includes('login')) defaultMessage = 'Logged in successfully';
                if (url.includes('logout')) defaultMessage = 'Logged out successfully';
                if (url.includes('change-password')) defaultMessage = 'Password changed successfully';
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
            
            toast.success(message);
        }

        return response;
    },
    (error) => {
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
        if (status === 401) {
            toast.error('Session expired or unauthorized. Please login again.');
            logout();
            return Promise.reject(error);
        } 
        
        if (status === 403 && (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN')) {
            toast.error('Your session has expired. Please login again.');
            logout();
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
