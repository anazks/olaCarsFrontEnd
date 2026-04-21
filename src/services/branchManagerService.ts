import api from './api';

export interface BranchManager {
    _id: string;
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    branchId: string;
    status: 'ACTIVE' | 'INACTIVE';
    twoFactorEnabled: boolean;
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

export interface ManagerFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    country?: string;
    branchId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface CreateBranchManagerPayload {
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    branchId: string;
    status?: 'ACTIVE' | 'INACTIVE';
    twoFactorEnabled?: boolean;
    permissions?: string[];
}

export interface UpdateBranchManagerPayload extends Partial<CreateBranchManagerPayload> {
    id: string;
}

// GET all branch managers with filters
export const getAllBranchManagers = async (filters: ManagerFilters = {}): Promise<PaginatedResponse<BranchManager>> => {
    const response = await api.get('/api/branch-manager', {
        params: filters
    });
    return response.data;
};

// GET single branch manager
export const getBranchManagerById = async (id: string): Promise<BranchManager> => {
    const response = await api.get(`/api/branch-manager/${id}`);
    return response.data.data;
};

// POST create branch manager
export const createBranchManager = async (payload: CreateBranchManagerPayload): Promise<BranchManager> => {
    const response = await api.post('/api/branch-manager', payload);
    return response.data;
};

// PUT update branch manager
export const updateBranchManager = async (payload: UpdateBranchManagerPayload): Promise<BranchManager> => {
    const response = await api.put(`/api/branch-manager/${payload.id}`, payload);
    return response.data;
};

// DELETE branch manager
export const deleteBranchManager = async (id: string): Promise<void> => {
    await api.delete(`/api/branch-manager/${id}`);
};
