import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Driver {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    status: 'PENDING_APPLICATION' | 'CREDIT_CHECK_REQUIRED' | 'INTERVIEW_SCHEDULED' | 'TRIAL_PERIOD' | 'APPROVED' | 'REJECTED';
    branchId: string;
    experienceYears: number;
    licenseNumber: string;
    licenseExpiry: string;
    appliedAt: string;
    creditCheck?: {
        status: 'PENDING' | 'COMPLETED' | 'FAILED';
        score?: number;
        decision?: 'APPROVE' | 'DECLINE' | 'REFER';
        performedAt?: string;
    };
    documents?: {
        type: string;
        url: string;
        status: 'PENDING' | 'VERIFIED' | 'REJECTED';
        uploadedAt: string;
    }[];
}

export const driverService = {
    getAllDrivers: async (filters?: any) => {
        const response = await axios.get(`${API_URL}/drivers`, { params: filters, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    },

    getDriverById: async (id: string) => {
        const response = await axios.get(`${API_URL}/drivers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    },

    createDriver: async (driverData: any) => {
        const response = await axios.post(`${API_URL}/drivers`, driverData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    },

    updateDriver: async (id: string, updateData: any) => {
        const response = await axios.put(`${API_URL}/drivers/${id}`, updateData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    },

    progressDriver: async (id: string, action: string, data?: any) => {
        const response = await axios.post(`${API_URL}/drivers/${id}/progress`, { action, ...data }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    },

    uploadDocument: async (id: string, formData: FormData) => {
        const response = await axios.post(`${API_URL}/drivers/${id}/documents`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    },

    deleteDriver: async (id: string) => {
        const response = await axios.delete(`${API_URL}/drivers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        return response.data;
    }
};

export default driverService;
