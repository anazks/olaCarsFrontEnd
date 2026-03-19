import api from './api';

export interface Supplier {
    _id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    category: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateSupplierPayload {
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    category: string;
    isActive?: boolean;
}

export interface UpdateSupplierPayload extends Partial<CreateSupplierPayload> {
    id: string;
}

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationMetadata;
}

export interface SupplierFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// GET all suppliers
export const getAllSuppliers = async (filters: SupplierFilters = {}): Promise<PaginatedResponse<Supplier>> => {
    const response = await api.get('/api/supplier', {
        params: filters
    });
    return response.data;
};

// GET single supplier
export const getSupplierById = async (id: string): Promise<Supplier> => {
    const response = await api.get(`/api/supplier/${id}`);
    return response.data.data;
};

// POST create supplier
export const createSupplier = async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const response = await api.post('/api/supplier', payload);
    return response.data;
};

// put api is passing id in body
// PUT update supplier
export const updateSupplier = async (payload: UpdateSupplierPayload): Promise<Supplier> => {
    const response = await api.put(`/api/supplier/${payload.id}`, payload);
    return response.data;
};

// DELETE supplier
export const deleteSupplier = async (id: string): Promise<void> => {
    await api.delete(`/api/supplier/${id}`);
};
