import api from './api';

export interface Branch {
    _id: string;
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    managerId?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBranchPayload {
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    managerId?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface UpdateBranchPayload extends Partial<CreateBranchPayload> {
    id: string;
}

// GET all branches
export const getAllBranches = async (): Promise<Branch[]> => {
    const response = await api.get('/api/branch');
    console.log(response,'e2323')
    return response.data.data;
};

// GET single branch
export const getBranchById = async (id: string): Promise<Branch> => {
    const response = await api.get(`/api/branch/${id}`);
    return response.data.data;
};

// POST create branch
export const createBranch = async (payload: CreateBranchPayload): Promise<Branch> => {
    const response = await api.post('/api/branch', payload);
    return response.data;
};

// PUT update branch
export const updateBranch = async (payload: UpdateBranchPayload): Promise<Branch> => {
    const response = await api.put('/api/branch/', payload);
    return response.data;
};

// DELETE branch
export const deleteBranch = async (id: string): Promise<void> => {
    await api.delete(`/api/branch/${id}`);
};
