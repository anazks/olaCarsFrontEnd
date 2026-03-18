import api from './api';

export interface Tax {
    _id: string;
    name: string;
    rate: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTaxPayload {
    name: string;
    rate: number;
}

export const getAllTaxes = async (): Promise<Tax[]> => {
    const response = await api.get('/api/tax');
    return response.data.data || response.data;
};

export const createTax = async (payload: CreateTaxPayload): Promise<Tax> => {
    const response = await api.post('/api/tax', payload);
    return response.data.data || response.data;
};

export const updateTaxStatus = async (id: string, isActive: boolean): Promise<Tax> => {
    const response = await api.put(`/api/tax/${id}`, { isActive });
    return response.data.data || response.data;
};
