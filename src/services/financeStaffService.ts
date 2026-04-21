import api from './api';

export interface FinanceStaff {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    branchId: any; // Can be object or string depending on population
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

export interface StaffFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    branchId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface CreateFinanceStaffPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
    permissions?: string[];
}

export interface UpdateFinanceStaffPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    permissions?: string[];
}

// GET all finance staff with filters
export const getAllFinanceStaff = async (filters: StaffFilters = {}): Promise<PaginatedResponse<FinanceStaff>> => {
    const response = await api.get('/api/finance-staff', {
        params: filters
    });
    return response.data;
};

// POST create a new finance staff
export const createFinanceStaff = async (
    payload: CreateFinanceStaffPayload
): Promise<FinanceStaff> => {
    const response = await api.post('/api/finance-staff', payload);
    return response.data;
};

// PUT update a finance staff
export const updateFinanceStaff = async (
    payload: UpdateFinanceStaffPayload
): Promise<FinanceStaff> => {
    const response = await api.put('/api/finance-staff/update', payload);
    return response.data;
};

// DELETE a finance staff by ID
export const deleteFinanceStaff = async (id: string): Promise<void> => {
    await api.delete(`/api/finance-staff/${id}`);
};
