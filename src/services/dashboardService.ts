import api from './api';

export interface DashboardFilters {
    country?: string;
    branch?: string;
    startDate?: string;
    endDate?: string;
    onlyKpi?: boolean;
}

export const getFinancialDashboardSummary = async (params: DashboardFilters = {}) => {
    const response = await api.get('/api/dashboard/financial-summary', { params });
    return response.data.data;
};

export const getVehicleMovementData = async (params: DashboardFilters = {}) => {
    const response = await api.get('/api/dashboard/vehicle-movement', { params });
    return response.data.data;
};
