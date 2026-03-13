import api from './api';
import type { Supplier } from './supplierService';
import type { Branch } from './branchService';

export type POStatus = 'WAITING' | 'APPROVED' | 'REJECTED';
export type POPurpose = 'Vehicle' | 'Spare Parts' | 'Others';

export interface PurchaseOrderItem {
    itemName: string;
    quantity: number;
    description?: string;
    unitPrice: number;
    images?: (File | string)[]; // File for upload, string for view
}

export interface EditHistoryEntry {
    updatedAt: string;
    updatedBy: string;
    changeSummary: string;
}

export interface PurchaseOrder {
    _id: string;
    purchaseOrderNumber: string;
    status: POStatus;
    purpose: POPurpose;
    items: PurchaseOrderItem[];
    totalAmount: number;
    purchaseOrderDate: string;
    paymentDate?: string;
    branch: string | Branch;
    supplier: string | Supplier;
    createdBy: string;
    creatorRole: string;
    approvedBy?: string;
    approverRole?: string;
    isEdited: boolean;
    editHistory: EditHistoryEntry[];
    createdAt: string;
    updatedAt: string;
}

export interface CreatePurchaseOrderPayload {
    purpose: POPurpose;
    items: PurchaseOrderItem[];
    supplier: string;
    paymentDate?: string;
    branch?: string; // Optional for Staff, required for CountryManager+
}

export interface ApproveRejectPurchaseOrderPayload {
    status: 'APPROVED' | 'REJECTED';
    notes?: string;
    rejectionReason?: string;
}

export interface UpdatePurchaseOrderPayload {
    items: PurchaseOrderItem[];
    supplier: string;
    paymentDate?: string;
}

// GET all purchase orders
export const getAllPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    const response = await api.get('/api/purchase-order');
    return response.data.data;
};

// GET purchase orders filtered by purpose=Vehicle (for vehicle onboarding)
export const getVehiclePurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    const response = await api.get('/api/purchase-order?purpose=Vehicle&isUsed=false');
    return response.data.data;
};

// GET single purchase order
export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
    const response = await api.get(`/api/purchase-order/${id}`);
    return response.data.data;
};

// POST create purchase order
export const createPurchaseOrder = async (payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    const formData = new FormData();

    // Standard fields
    formData.append('purpose', payload.purpose);
    formData.append('supplier', payload.supplier);
    if (payload.branch) formData.append('branch', payload.branch);
    if (payload.paymentDate) formData.append('paymentDate', payload.paymentDate);

    // Append item fields individually
    payload.items.forEach((item, index) => {
        formData.append(`items[${index}][itemName]`, item.itemName);
        formData.append(`items[${index}][quantity]`, String(item.quantity));
        formData.append(`items[${index}][unitPrice]`, String(item.unitPrice));
        if (item.description) {
            formData.append(`items[${index}][description]`, item.description);
        }

        if (item.images && item.images.length > 0) {
            item.images.forEach((file) => {
                // Ensure file is an actual File object during upload
                if (file instanceof File) {
                    formData.append(`items[${index}][images]`, file);
                }
            });
        }
    });

    const response = await api.post('/api/purchase-order', formData, {
        headers: {
            'Content-Type': undefined, // Allow browser to set correct multipart boundary
        },
    });
    return response.data;
};

// PUT approve/reject purchase order
export const approveRejectPurchaseOrder = async (id: string, payload: ApproveRejectPurchaseOrderPayload): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/approve`, payload);
    return response.data;
};

// PUT update purchase order
export const updatePurchaseOrder = async (id: string, payload: UpdatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}`, payload);
    return response.data;
};
