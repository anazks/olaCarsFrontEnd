import api from './api';

export interface Customer {
    _id: string;
    customerId: string;
    driver?: {
        _id: string;
        driverId?: string;
        status?: string;
        rentTracking?: any[];
    };
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    branch: {
        _id: string;
        name: string;
        country?: string;
        city?: string;
    };
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    status: 'ACTIVE' | 'INACTIVE';
    isDeleted: boolean;
    createdAt: string;
}

export interface CreateCustomerPayload {
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    branch: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export const getAllCustomers = async (params: any = {}) => {
    const res = await api.get('/api/customers', { 
        params,
        headers: { 'X-Skip-Toast': 'true' } 
    });
    return res.data;
};

export const getCustomerById = async (id: string) => {
    const res = await api.get(`/api/customers/${id}`);
    return res.data;
};

export const createCustomer = async (payload: CreateCustomerPayload) => {
    const res = await api.post('/api/customers', payload);
    return res.data;
};

export const updateCustomer = async (id: string, payload: any) => {
    const res = await api.put(`/api/customers/${id}`, payload);
    return res.data;
};

export const deleteCustomer = async (id: string) => {
    const res = await api.delete(`/api/customers/${id}`);
    return res.data;
};
