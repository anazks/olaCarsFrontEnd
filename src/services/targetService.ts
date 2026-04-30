import api from './api';

export interface Target {
    _id?: string;
    targetType: 'COUNTRY' | 'BRANCH' | 'STAFF';
    targetId: string;
    category: 'DRIVER_ACQUISITION' | 'RENTAL' | 'VEHICLE_ACQUISITION';
    targetValue: number;
    period: 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    startDate: string;
    endDate: string;
    notes?: string;
}

export const assignTarget = async (targetData: Target) => {
    const response = await api.post('/api/staff-performance/targets', targetData);
    return response.data;
};

export const getTargets = async (filters: any) => {
    const response = await api.get('/api/staff-performance/targets', { params: filters });
    return response.data;
};
