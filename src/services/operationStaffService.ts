import api from './api';

export interface OperationStaff {
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

export interface CreateOperationStaffPayload {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    branchId: string;
    status?: string;
}

export interface UpdateOperationStaffPayload {
    id: string;
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
    branchId?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
}

// GET all operation staff
export const getAllOperationStaff = async (): Promise<OperationStaff[]> => {
    const response = await api.get('/api/operation-staff');
    return response.data.data;
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
    const response = await api.put('/api/operation-staff/update', payload);
    return response.data;
};

// DELETE an operation staff by ID
export const deleteOperationStaff = async (id: string): Promise<void> => {
    await api.delete(`/api/operation-staff/${id}`);
};
