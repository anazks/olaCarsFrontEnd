import api from './api';

export interface FinancialAdmin {
    _id: string;
    fullName: string;
    email: string;
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

export interface AdminFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    role?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'fullName' | 'createdAt' | 'email';
    sortOrder?: 'asc' | 'desc';
}

export interface CreateFinancialAdminPayload {
    fullName: string;
    email: string;
    password: string;
    permissions?: string[];
}

export interface UpdateFinancialAdminPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled?: boolean;
    permissions?: string[];
}

// GET all financial admins with filters, sorting, and pagination
export const getAllFinancialAdmins = async (filters: AdminFilters = {}): Promise<PaginatedResponse<FinancialAdmin>> => {
    const response = await api.get('/api/finance-admin', {
        params: filters
    });
    return response.data;
};

// GET a financial admin by ID
export const getFinancialAdminById = async (id: string): Promise<FinancialAdmin> => {
    const response = await api.get(`/api/finance-admin/${id}`);
    return response.data;
};

// POST create a new financial admin
export const createFinancialAdmin = async (
    payload: CreateFinancialAdminPayload
): Promise<FinancialAdmin> => {
    const response = await api.post('/api/finance-admin', payload);
    return response.data;
};

// PUT update a financial admin
export const updateFinancialAdmin = async (
    payload: UpdateFinancialAdminPayload
): Promise<FinancialAdmin> => {
    const response = await api.put('/api/finance-admin/update', payload);
    return response.data;
};

// DELETE a financial admin by ID
export const deleteFinancialAdmin = async (id: string): Promise<void> => {
    await api.delete(`/api/finance-staff/${id}`);
};
