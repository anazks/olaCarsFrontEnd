import api from './api';

export interface MerchendiseUser {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    permissions: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMetadata;
}

export interface MerchendiseFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface CreateMerchendisePayload {
    fullName: string;
    email: string;
    password?: string;
    phone?: string;
    status?: string;
    permissions?: string[];
}

export interface UpdateMerchendisePayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    permissions?: string[];
}

// GET all merchendisers with filters
export const getAllMerchendisers = async (filters: MerchendiseFilters = {}): Promise<PaginatedResponse<MerchendiseUser>> => {
    const response = await api.get('/api/merchendise', {
        params: filters
    });
    return response.data;
};

// POST create a new merchendiser
export const createMerchendiser = async (
    payload: CreateMerchendisePayload
): Promise<MerchendiseUser> => {
    const response = await api.post('/api/merchendise', payload);
    return response.data;
};

// PUT update a merchendiser
export const updateMerchendiser = async (
    payload: UpdateMerchendisePayload
): Promise<MerchendiseUser> => {
    const response = await api.put(`/api/merchendise/${payload.id}`, payload);
    return response.data;
};

// DELETE a merchendiser by ID
export const deleteMerchendiser = async (id: string): Promise<void> => {
    await api.delete(`/api/merchendise/${id}`);
};
