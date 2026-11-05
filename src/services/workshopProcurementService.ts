import api from './api';

export interface ProcurementRequestPart {
    _id: string;
    partName: string;
    partNumber?: string;
    unitCost: number;
    unit?: string;
}

export interface ProcurementRequestBranch {
    _id: string;
    name: string;
}

export interface ProcurementRequestUser {
    _id: string;
    fullName: string;
}

export interface ProcurementRequestSupplier {
    _id: string;
    name: string;
}

export interface EditHistoryEntry {
    editedAt: string;
    editedBy?: {
        _id: string;
        fullName?: string;
        name?: string;
        email?: string;
        role?: string;
    } | string;
    editorRole: string;
    previousStatus: string;
    changesSummary: string;
}

export type PRStatus =
    | 'PENDING'
    | 'PENDING_WORKSHOP_MANAGER_APPROVAL'
    | 'APPROVED'
    | 'PARTIALLY_CONVERTED'
    | 'CONVERTED_TO_PO'
    | 'COST_APPROVED'
    | 'IN_TRANSIT'
    | 'RECEIVED'
    | 'WAITING_QUOTATION'
    | 'REJECTED'
    | 'PENDING_FINANCE_APPROVAL';

export interface PRPOAllocationLink {
    poId: string;
    poNumber: string;
    allocatedQuantity: number;
    allocatedAt?: string;
    poStatus?: string;
}

export interface ProcurementRequest {
    _id: string;
    requestNumber: string;
    part: ProcurementRequestPart;
    quantity: number;
    fulfilledQuantity?: number;
    remainingQuantity?: number;
    status: PRStatus;
    branch: ProcurementRequestBranch;
    requestedBy: ProcurementRequestUser;
    requestedByRole: string;
    approvedBy?: ProcurementRequestUser;
    approvedByRole?: string;
    rejectionReason?: string;
    supplier?: ProcurementRequestSupplier;
    supplierDetails?: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    notes?: string;
    merchandiserPrice?: number;
    merchandiserTotalAmount?: number;
    originalTotalAmount?: number;
    documents?: string[];
    rejectionNote?: string;
    approvalNote?: string;
    transportationMode?: 'SEA' | 'AIR' | 'LAND';
    qualityPreference?: 'GENUINE_OEM' | 'AFTERMARKET_ANY_BRAND';
    fullSizePhoto?: string;
    closeUpPhoto?: string;
    createdAt: string;
    updatedAt: string;
    editHistory?: EditHistoryEntry[];
    linkedPO?: any;
    linkedPOs?: PRPOAllocationLink[];
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

export interface ProcurementRequestFilters {
    page?: number;
    limit?: number;
    status?: PRStatus;
    branch?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const getWorkshopProcurementRequests = async (
    filters: ProcurementRequestFilters = {}
): Promise<PaginatedResponse<ProcurementRequest>> => {
    const response = await api.get('/api/workshop-procurement', {
        params: filters,
    });
    return response.data;
};

export const getApprovedProcurementRequests = async (
    params: { branch?: string; search?: string } = {}
): Promise<ProcurementRequest[]> => {
    const response = await api.get('/api/workshop-procurement', {
        params: {
            ...params,
            status: 'APPROVED,WAITING_QUOTATION',
            limit: 1000
        }
    });
    return response.data?.data || response.data || [];
};

export const getWorkshopProcurementRequestById = async (
    id: string
): Promise<ProcurementRequest> => {
    const response = await api.get(`/api/workshop-procurement/${id}`);
    return response.data.data;
};

export const workshopManagerApproveProcurementRequest = async (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED'; note?: string; rejectionReason?: string }
) => {
    const response = await api.put(`/api/workshop-procurement/${id}/approve`, data);
    return response.data.data || response.data;
};

export const approveProcurementRequest = async (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED', supplier?: string, rejectionReason?: string, quantity?: number }
) => {
    const response = await api.put(`/api/workshop-procurement/${id}/approve`, data);
    return response.data.data || response.data;
};

export const financeApproveProcurementRequest = async (
    id: string,
    data: { status: 'APPROVED' | 'REJECTED', note?: string }
) => {
    const response = await api.put(`/api/workshop-procurement/${id}/finance-approve`, data);
    return response.data.data || response.data;
};
