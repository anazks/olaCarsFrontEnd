import api from './api';

export interface OperationalAdmin {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled: boolean;
    lastLoginAt?: string;
    isDeleted: boolean;
    createdBy?: string;
    creatorRole?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateOperationalAdminPayload {
    fullName: string;
    email: string;
    password: string;
}

export interface UpdateOperationalAdminPayload {
    _id: string;
    fullName?: string;
    email?: string;
    password?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'LOCKED';
    twoFactorEnabled?: boolean;
}

// GET all operational admins
export const getAllOperationalAdmins = async (): Promise<OperationalAdmin[]> => {
    const response = await api.get('/api/operational-admin');
    return response.data.data;
};

// POST create a new operational admin
export const createOperationalAdmin = async (
    payload: CreateOperationalAdminPayload
): Promise<OperationalAdmin> => {
    const response = await api.post('/api/operational-admin', payload);
    console.log(response,'ewsd');
    return response.data;
};

// PUT update an operational admin
export const updateOperationalAdmin = async (
    payload: UpdateOperationalAdminPayload
): Promise<OperationalAdmin> => {
    const response = await api.put('/api/operational-admin/update', payload);
    return response.data;
};

// DELETE an operational admin by ID
export const deleteOperationalAdmin = async (id: string): Promise<void> => {
    await api.delete(`/api/operational-admin/${id}`);
};
