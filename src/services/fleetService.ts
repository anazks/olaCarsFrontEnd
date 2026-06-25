import api from './api';

export interface Fleet {
    _id: string;
    fleetNumber: string;
    assignedStaff?: any;
    assignedStaffModel: 'OperationStaff' | 'FinanceStaff';
    status: 'ACTIVE' | 'INACTIVE';
    description?: string;
    vehicles?: any[];
    createdAt?: string;
    updatedAt?: string;
}

export interface GetFleetsResponse {
    success: boolean;
    data: Fleet[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const getFleets = async (params: any = {}): Promise<GetFleetsResponse> => {
    const response = await api.get('/api/fleet', { params });
    return response.data;
};

export const getFleetById = async (id: string): Promise<{ success: boolean; data: Fleet }> => {
    const response = await api.get(`/api/fleet/${id}`);
    return response.data;
};

export const createFleet = async (data: Partial<Fleet>): Promise<{ success: boolean; data: Fleet }> => {
    const response = await api.post('/api/fleet', data);
    return response.data;
};

export const updateFleet = async (id: string, data: Partial<Fleet>): Promise<{ success: boolean; data: Fleet }> => {
    const response = await api.put(`/api/fleet/${id}`, data);
    return response.data;
};

export const deleteFleet = async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/fleet/${id}`);
    return response.data;
};

export const getNextFleetNumber = async (): Promise<{ success: boolean; data: { fleetNumber: string } }> => {
    const response = await api.get('/api/fleet/next-number');
    return response.data;
};
