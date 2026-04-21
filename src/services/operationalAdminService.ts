import api from './api';

export interface OperationalAdmin {
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

export interface CreateOperationalAdminPayload {
    fullName: string;
    email: string;
    password: string;
    permissions?: string[];
}

export interface UpdateOperationalAdminPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled?: boolean;
    permissions?: string[];
}

// GET all operational admins with filters, sorting, and pagination
export const getAllOperationalAdmins = async (filters: AdminFilters = {}): Promise<PaginatedResponse<OperationalAdmin>> => {
    const response = await api.get('/api/operational-admin', {
        params: filters
    });
    return response.data;
};

// POST create a new operational admin
export const createOperationalAdmin = async (
    payload: CreateOperationalAdminPayload
): Promise<OperationalAdmin> => {
    const response = await api.post('/api/operational-admin', payload);
    console.log(response,'ewsd');
    return response.data;
};

// PUT update an operational admin
export const updateOperationalAdmin = async (
    payload: UpdateOperationalAdminPayload
): Promise<OperationalAdmin> => {
    const response = await api.put('/api/operational-admin/update', payload);
    console.log(response,'2w22');
    
    return response.data;
};

// DELETE an operational admin by ID
export const deleteOperationalAdmin = async (id: string): Promise<void> => {
    await api.delete(`/api/operational-admin/${id}`);
};
