import api from './api';

export interface OperationStaff {
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

export interface CreateOperationStaffPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
    permissions?: string[];
}

export interface UpdateOperationStaffPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    permissions?: string[];
}

// GET all operation staff with filters
export const getAllOperationStaff = async (filters: StaffFilters = {}): Promise<PaginatedResponse<OperationStaff>> => {
    const response = await api.get('/api/operation-staff', {
        params: filters
    });
    return response.data;
};

// POST create a new operation staff
export const createOperationStaff = async (
    payload: CreateOperationStaffPayload
): Promise<OperationStaff> => {
    const response = await api.post('/api/operation-staff', payload);
    return response.data;
};

// PUT update an operation staff
export const updateOperationStaff = async (
    payload: UpdateOperationStaffPayload
): Promise<OperationStaff> => {
    const response = await api.put(`/api/operation-staff/${payload.id}`, payload);
    return response.data;
};

// DELETE an operation staff by ID
export const deleteOperationStaff = async (id: string): Promise<void> => {
    await api.delete(`/api/operation-staff/${id}`);
};
