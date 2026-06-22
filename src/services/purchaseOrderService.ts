import api from './api';
import type { Supplier } from './supplierService';
import type { Branch } from './branchService';

export type POStatus = 'REQUESTED' | 'MANAGER_APPROVED' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'DISPOSED' | 'PENDING_FINANCE_APPROVAL' | 'RECEIVED';
export type POPurpose = 'Vehicle' | 'Spare Parts' | 'Others';

export interface PurchaseOrderItem {
    itemName: string;
    quantity: number;
    description?: string;
    unitPrice: number;
    accountId?: string;
    merchandiserPrice?: number;
    images?: (File | string)[]; // File for upload, string for view
}

export interface EditHistoryEntry {
    updatedAt: string;
    updatedBy: string;
    changeSummary: string;
    // Database raw fields fallback
    editedAt?: string;
    editedBy?: string | { name: string };
    editorRole?: string;
    changesSummary?: string;
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

export interface PurchaseOrder {
    _id: string;
    purchaseOrderNumber: string;
    status: POStatus;
    purpose: POPurpose;
    items: PurchaseOrderItem[];
    totalAmount: number;
    originalTotalAmount?: number;
    merchandiserTotalAmount?: number;
    documents?: string[];
    rejectionNote?: string;
    purchaseOrderDate: string;
    paymentDate?: string;
    branch: string | Branch;
    supplier: string | Supplier;
    supplierDetails?: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    createdBy: string;
    creatorRole: string;
    approvedBy?: string;
    approverRole?: string;
    isEdited: boolean;
    isBilled?: boolean;
    isUsed?: boolean;
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
    status: POStatus;
    notes?: string;
    rejectionReason?: string;
    rejectionNote?: string;
}

export interface UpdatePurchaseOrderPayload {
    items: PurchaseOrderItem[];
    supplier: string;
    paymentDate?: string;
}

export interface PurchaseOrderFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: POStatus;
    supplier?: string;
    branch?: string;
    isUsed?: boolean;
    isBilled?: boolean;
    startDate?: string;
    endDate?: string;
    sortBy?: 'createdAt' | 'totalAmount' | 'purchaseOrderDate';
    sortOrder?: 'asc' | 'desc';
}

// GET all purchase orders with filters, sorting, and pagination
export const getAllPurchaseOrders = async (filters: PurchaseOrderFilters = {}): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await api.get('/api/purchase-order', {
        params: filters
    });
    return response.data;
};

// GET purchase orders filtered by purpose=Vehicle (for vehicle onboarding)
export const getVehiclePurchaseOrders = async (page = 1, limit = 10, branchId?: string): Promise<PaginatedResponse<PurchaseOrder>> => {
    const params: any = { purpose: 'Vehicle', isUsed: false, page, limit };
    if (branchId) params.branch = branchId;
    const response = await api.get('/api/purchase-order', {
        params
    });
    return response.data;
};

// GET purchase orders eligible for billing
export const getEligiblePurchaseOrders = async (page = 1, limit = 10): Promise<PaginatedResponse<PurchaseOrder>> => {
    const response = await api.get('/api/purchase-order/eligible-for-billing', {
        params: { page, limit }
    });
    return response.data;
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
        if (item.accountId) {
            formData.append(`items[${index}][accountId]`, item.accountId);
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

// POST bulk upload purchase orders
export const bulkUploadPurchaseOrders = async (payload: { rows: any[] }): Promise<any> => {
    const response = await api.post('/api/purchase-order/bulk-upload', payload);
    return response.data;
};
