import api from './api';

export interface InventoryPart {
    _id: string;
    partName: string;
    partNumber: string;
    category: string;
    description?: string;
    unit: string;
    unitCost: number;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable?: number; // Virtual field calculated from (quantityOnHand - quantityReserved)
    reorderLevel: number;
    branchId: { _id: string; name: string } | string;
    supplierId?: { _id: string; name: string } | string | null;
    supplierPartNumber?: string;
    leadTimeDays?: number;
    purchaseAccountId?: { _id: string; code: string; name: string } | string | null;
    incomeAccountId?: { _id: string; code: string; name: string } | string | null;
    inventoryAccountId?: { _id: string; code: string; name: string } | string | null;
    taxId?: { _id: string; name: string; rate: number } | string | null;
    lastRestockedAt?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface PartTransaction {
    _id: string;
    partId: string;
    branchId: string;
    workOrderId?: { _id: string; workOrderNumber: string } | string | null;
    transactionType: 'RESTOCK' | 'RESERVE' | 'RELEASE' | 'INSTALL' | 'ADJUSTMENT' | 'RETURN';
    quantity: number;
    performedBy: { _id: string; name: string } | string;
    role: string;
    notes?: string;
    createdAt: string;
}

export const getParts = async (params?: any): Promise<InventoryPart[]> => {
    const response = await api.get('/api/inventory', { params });
    return response.data.data || response.data;
};

export const getPartById = async (id: string): Promise<InventoryPart> => {
    const response = await api.get(`/api/inventory/${id}`);
    return response.data.data || response.data;
};

export const createPart = async (payload: any): Promise<InventoryPart> => {
    const response = await api.post('/api/inventory', payload);
    return response.data.data || response.data;
};

export const updatePart = async (id: string, payload: any): Promise<InventoryPart> => {
    const response = await api.put(`/api/inventory/${id}`, payload);
    return response.data.data || response.data;
};

export const deletePart = async (id: string): Promise<any> => {
    const response = await api.delete(`/api/inventory/${id}`);
    return response.data;
};

export const restockPart = async (id: string, quantity: number): Promise<InventoryPart> => {
    const response = await api.put(`/api/inventory/${id}/restock`, { quantity });
    return response.data.data || response.data;
};

export const getPartTransactions = async (id: string): Promise<PartTransaction[]> => {
    const response = await api.get(`/api/inventory/${id}/transactions`);
    return response.data.data || response.data;
};

export const bulkCreateParts = async (parts: any[], branch?: string): Promise<any> => {
    const response = await api.post('/api/inventory/bulk', { parts, branch });
    return response.data;
};
