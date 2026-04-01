import api from './api';

export interface WorkshopManager {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    branchId: any;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
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
    branchId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface CreateWorkshopManagerPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
}

export interface UpdateWorkshopManagerPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
}

export const getAllWorkshopManagers = async (filters: ManagerFilters = {}): Promise<PaginatedResponse<WorkshopManager>> => {
    const response = await api.get('/api/workshop-manager', {
        params: filters
    });
    return response.data;
};

export const createWorkshopManager = async (
    payload: CreateWorkshopManagerPayload
): Promise<WorkshopManager> => {
    const response = await api.post('/api/workshop-manager', payload);
    return response.data;
};

export const updateWorkshopManager = async (
    payload: UpdateWorkshopManagerPayload
): Promise<WorkshopManager> => {
    const response = await api.put(`/api/workshop-manager/${payload.id}`, payload);
    return response.data;
};

export const deleteWorkshopManager = async (id: string): Promise<void> => {
    await api.delete(`/api/workshop-manager/${id}`);
};
