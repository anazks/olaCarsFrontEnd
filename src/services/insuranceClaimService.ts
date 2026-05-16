import api from './api';

export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAYMENT_RECEIVED' | 'CLOSED';

export interface InsuranceClaim {
    _id: string;
    claimNumber: string;
    workOrderId?: string;
    vehicleId: any;
    branchId: any;
    incidentDate: string;
    incidentDescription: string;
    incidentLocation?: string;
    policeReportNumber?: string;
    policeReportDocument?: string;
    insurerName: string;
    policyNumber: string;
    insuranceType?: string;
    excessAmount: number;
    claimAmount: number;
    approvedAmount?: number;
    excessDeducted: number;
    netPayable?: number;
    status: ClaimStatus;
    documents: any[];
    paymentReference?: string;
    paymentDate?: string;
    paymentAmount?: number;
    rejectionReason?: string;
    submittedAt?: string;
    reviewStartedAt?: string;
    resolvedAt?: string;
    notes?: string;
    insurerNotes?: string;
    statusHistory: any[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateClaimPayload {
    workOrderId?: string;
    vehicleId?: string;
    incidentDate: string;
    incidentDescription: string;
    incidentLocation?: string;
    policeReportNumber?: string;
    claimAmount: number;
    excessAmount?: number;
    notes?: string;
}

export interface ProgressClaimPayload {
    targetStatus: ClaimStatus;
    approvedAmount?: number;
    rejectionReason?: string;
    paymentReference?: string;
    paymentAmount?: number;
    insurerNotes?: string;
    notes?: string;
}

export const getClaims = async (filters: any = {}): Promise<{ success: boolean; data: InsuranceClaim[] }> => {
    const response = await api.get('/api/insurance-claims', { params: filters });
    return response.data;
};

export const getClaimById = async (id: string): Promise<InsuranceClaim> => {
    const response = await api.get(`/api/insurance-claims/${id}`);
    return response.data.data;
};

export const createClaim = async (payload: CreateClaimPayload): Promise<InsuranceClaim> => {
    const response = await api.post('/api/insurance-claims', payload);
    return response.data.data;
};

export const progressClaim = async (id: string, payload: ProgressClaimPayload): Promise<InsuranceClaim> => {
    const response = await api.put(`/api/insurance-claims/${id}/progress`, payload);
    return response.data.data;
};
