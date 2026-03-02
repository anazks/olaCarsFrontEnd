import api from './api';

export interface FinanceStaff {
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

export interface CreateFinanceStaffPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
}

export interface UpdateFinanceStaffPayload {
    _id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
}

// GET all finance staff
export const getAllFinanceStaff = async (): Promise<FinanceStaff[]> => {
    const response = await api.get('/api/finance-staff');
    return response.data.data;
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
