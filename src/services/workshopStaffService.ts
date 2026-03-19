import api from './api';

export interface WorkshopStaff {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    branchId: any; // Can be object or string depending on population
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

export interface CreateWorkshopStaffPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
}

export interface UpdateWorkshopStaffPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
}

// GET all workshop staff with filters
export const getAllWorkshopStaff = async (filters: StaffFilters = {}): Promise<PaginatedResponse<WorkshopStaff>> => {
    const response = await api.get('/api/workshop-staff', {
        params: filters
    });
    return response.data;
};

// POST create a new workshop staff
export const createWorkshopStaff = async (
    payload: CreateWorkshopStaffPayload
): Promise<WorkshopStaff> => {
    const response = await api.post('/api/workshop-staff', payload);
    return response.data;
};

// PUT update a workshop staff
export const updateWorkshopStaff = async (
    payload: UpdateWorkshopStaffPayload
): Promise<WorkshopStaff> => {
    const response = await api.put('/api/workshop-staff/update', payload);
    return response.data;
};

// DELETE a workshop staff by ID
export const deleteWorkshopStaff = async (id: string): Promise<void> => {
    await api.delete(`/api/workshop-staff/${id}`);
};
