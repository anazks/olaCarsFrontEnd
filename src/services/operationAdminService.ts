import api from './api';

export const getOperationDashboardStats = async (params = {}) => {
    const response = await api.get('/api/operational-admin/dashboard/stats', { 
        params,


        // @ts-ignore
        skipToast: true 
    });
    return response.data;
};
