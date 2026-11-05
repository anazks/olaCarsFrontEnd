import api from './api';
import type { Supplier } from './supplierService';
import type { Branch } from './branchService';

export type POStatus = 
    | 'REQUESTED' 
    | 'PENDING_MERCHANDISER'
    | 'UNIT_REVISION_REQUESTED'
    | 'UNIT_REVISION_APPROVED'
    | 'UNIT_REVISION_REJECTED'
    | 'PENDING_ADMIN_APPROVAL'
    | 'WAITING_QUOTATION'
    | 'QUOTATION_SUBMITTED'
    | 'QUOTATION_REVISION_REQUESTED'
    | 'QUOTATION_APPROVED'
    | 'MANAGER_APPROVED' 
    | 'WAITING' 
    | 'REVISION_REQUESTED'
    | 'REVISION_APPROVED'
    | 'PO_ISSUED'
    | 'APPROVED' 
    | 'REJECTED' 
    | 'DISPOSED' 
    | 'PENDING_FINANCE_APPROVAL' 
    | 'RECEIVED'
    | 'IN_TRANSIT';

export type POPurpose = 'Vehicle' | 'Spare Parts' | 'Others';

export interface PRItemAllocation {
    prId: string;
    prNumber: string;
    allocatedQuantity: number;
    originalPRQuantity?: number;
}

export interface PurchaseOrderItem {
    itemName: string;
    quantity: number;
    description?: string;
    unitPrice: number;
    accountId?: string;
    merchandiserPrice?: number;
    proposedQuantity?: number;
    images?: (File | string)[]; // File for upload, string for view
    prAllocations?: PRItemAllocation[];
}

export interface QuotationRevisionEntry {
    revisedAt: string;
    revisedBy: string;
    role?: string;
    unitPrice: number;
    totalAmount: number;
    supplierId: string;
    supplierName?: string;
    documents?: string[];
    notes?: string;
}

export interface POQuotation {
    supplierId: string;
    supplierName: string;
    quotationNumber?: string;
    unitPrice: number;
    totalAmount: number;
    validUntil?: string;
    documents?: string[];
    status: 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' | 'REJECTED';
    notes?: string;
    revisionReason?: string;
    approvedBy?: string;
    approvedAt?: string;
    revisionHistory?: QuotationRevisionEntry[];
}

export interface POUnitRevisionRequest {
    requestedBy: string;
    requestedAt: string;
    reason: string;
    status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    proposedItems: {
        itemName: string;
        currentQuantity: number;
        proposedQuantity: number;
        reason?: string;
    }[];
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
    linkedPR?: any;
    linkedPRs?: PRItemAllocation[];
    unitRevisionRequest?: POUnitRevisionRequest;
    quotation?: POQuotation;
    quotations?: POQuotation[];
    revisionReason?: string;
    revisionDecisionNote?: string;
    isRevisionAllowed?: boolean;
    deliveryDate?: string;
    paymentTerms?: string;
    shippingTerms?: string;
    officialPONumber?: string;
}

export interface CreatePurchaseOrderPayload {
    purpose: POPurpose;
    items: PurchaseOrderItem[];
    supplier: string;
    paymentDate?: string;
    branch?: string; // Optional for Staff, required for CountryManager+
    linkedPRs?: PRItemAllocation[];
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
    if (payload.linkedPRs && payload.linkedPRs.length > 0) {
        formData.append('linkedPRs', JSON.stringify(payload.linkedPRs));
    }

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
        if (item.prAllocations && item.prAllocations.length > 0) {
            formData.append(`items[${index}][prAllocations]`, JSON.stringify(item.prAllocations));
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

// PUT Unit Revision APIs
export const requestPOUnitRevision = async (
    id: string,
    payload: { proposedItems: { itemName: string; currentQuantity: number; proposedQuantity: number; reason?: string }[]; reason: string }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/unit-revision-request`, payload);
    return response.data?.data || response.data;
};

export const approveRejectPOUnitRevision = async (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/unit-revision-review`, payload);
    return response.data?.data || response.data;
};

export const submitRevisedPOUnits = async (
    id: string,
    payload: { items: PurchaseOrderItem[]; note?: string }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/submit-revised-units`, payload);
    return response.data?.data || response.data;
};

// Quotation APIs
export const submitPOQuotation = async (
    id: string,
    payload: { supplierId: string; supplierName: string; quotationNumber?: string; unitPrice: number; totalAmount: number; validUntil?: string; notes?: string; documents?: string[] }
): Promise<PurchaseOrder> => {
    const response = await api.post(`/api/purchase-order/${id}/quotation`, payload);
    return response.data?.data || response.data;
};

export const requestPOQuotationRevision = async (
    id: string,
    payload: { reason: string; targetPrice?: number }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/quotation/revision-request`, payload);
    return response.data?.data || response.data;
};

export const approveRejectPOQuotation = async (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; note?: string }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/quotation/review`, payload);
    return response.data?.data || response.data;
};

// Merchandiser Revision Request Review by Finance Admin / Admin
export const reviewQuotationRevisionRequest = async (
    id: string,
    payload: { decision: 'APPROVE' | 'REJECT'; note?: string }
): Promise<PurchaseOrder> => {
    const response = await api.put(`/api/purchase-order/${id}/review-revision`, payload);
    return response.data?.data || response.data;
};
