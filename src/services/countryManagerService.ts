import api from './api';

export interface CountryManager {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    country: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled: boolean;
    permissions: string[];
    lastLoginAt?: string;
    isDeleted: boolean;
    createdBy?: string;
    creatorRole?: string;
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

export interface ManagerFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    country?: string;
    branchId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface CreateCountryManagerPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    country: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled?: boolean;
    permissions?: string[];
}

export interface UpdateCountryManagerPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    country?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled?: boolean;
    permissions?: string[];
}

// GET all country managers with filters
export const getAllCountryManagers = async (filters: ManagerFilters = {}): Promise<PaginatedResponse<CountryManager>> => {
    const response = await api.get('/api/country-manager', {
        params: filters
    });
    return response.data;
};

// POST create a new country manager
export const createCountryManager = async (
    payload: CreateCountryManagerPayload
): Promise<CountryManager> => {
    const response = await api.post('/api/country-manager', payload);
    return response.data;
};

// PUT update a country manager
export const updateCountryManager = async (
    payload: UpdateCountryManagerPayload
): Promise<CountryManager> => {
    const response = await api.put('/api/country-manager/update', payload);
    return response.data;
};

// DELETE a country manager by ID
export const deleteCountryManager = async (id: string): Promise<void> => {
    await api.delete(`/api/country-manager/${id}`);
};
