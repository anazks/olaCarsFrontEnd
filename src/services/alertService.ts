import api from './api';

export interface Alert {
    _id: string;
    type: 'MAINTENANCE' | 'INSURANCE' | 'REGISTRATION' | 'OTHER';
    vehicleId: {
        _id: string;
        basicDetails: {
            make: string;
            model: string;
            vin: string;
            year: number;
        };
        purchaseDetails: {
            branch: {
                name: string;
            };
        };
        status: string;
    };
    status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    message: string;
    metadata?: any;
    createdAt: string;
    updatedAt: string;
}

/**
 * Fetches all active alerts.
 */
export const getActiveAlerts = async (params?: { type?: string; vehicleId?: string }): Promise<Alert[]> => {
    const response = await api.get('/api/alerts', { params });
    return response.data.data;
};

/**
 * Resolves a specific alert.
 */
export const resolveAlert = async (id: string): Promise<Alert> => {
    const response = await api.put(`/api/alerts/${id}/resolve`);
    return response.data.data;
};

/**
 * Fetches all alerts (active, resolved, dismissed).
 */
export const getAllAlerts = async (params?: { type?: string; vehicleId?: string; status?: string }): Promise<Alert[]> => {
    const response = await api.get('/api/alerts/all', { params });
    return response.data.data;
};

const alertService = {
    getActiveAlerts,
    getAllAlerts,
    resolveAlert
};

export default alertService;
