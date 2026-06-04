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

export interface ProcurementRequest {
    _id: string;
    requestNumber: string;
    part: ProcurementRequestPart;
    quantity: number;
    status: 'PENDING' | 'PENDING_FINANCE_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO';
    branch: ProcurementRequestBranch;
    requestedBy: ProcurementRequestUser;
    requestedByRole: string;
    approvedBy?: ProcurementRequestUser;
    approvedByRole?: string;
    rejectionReason?: string;
    supplier?: ProcurementRequestSupplier;
    notes?: string;
    merchandiserPrice?: number;
    merchandiserTotalAmount?: number;
    originalTotalAmount?: number;
    documents?: string[];
    rejectionNote?: string;
    approvalNote?: string;
    createdAt: string;
    updatedAt: string;
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
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PO' | 'PENDING_FINANCE_APPROVAL';
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

export const getWorkshopProcurementRequestById = async (
    id: string
): Promise<ProcurementRequest> => {
    const response = await api.get(`/api/workshop-procurement/${id}`);
    return response.data.data;
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
    data: { status: 'APPROVED' | 'REJECTED'; note?: string }
) => {
    const response = await api.put(`/api/workshop-procurement/${id}/finance-approve`, data);
    return response.data.data || response.data;
};

