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
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBranchManagerPayload {
    fullName: string;
    email: string;
    password?: string;
    phone: string;
    branchId: string;
    status?: 'ACTIVE' | 'INACTIVE';
    twoFactorEnabled?: boolean;
}

export interface UpdateBranchManagerPayload extends Partial<CreateBranchManagerPayload> {
    _id: string;
}

// GET all branch managers
export const getAllBranchManagers = async (): Promise<BranchManager[]> => {
    const response = await api.get('/api/branch-manager');
    return response.data.data;
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
    const response = await api.put(`/api/branch-manager/${payload._id}`, payload);
    return response.data;
};

// DELETE branch manager
export const deleteBranchManager = async (id: string): Promise<void> => {
    await api.delete(`/api/branch-manager/${id}`);
};
