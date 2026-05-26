import api from './api';

export interface PaymentRequest {
    _id: string;
    requestNumber: string;
    requestedBy: any;
    requestedByRole: string;
    country: string;
    branchId?: any;
    amount: number;
    currency: string;
    reason: string;
    expectedPaymentDate: string;
    additionalNotes?: string;
    category: string;
    supportingDocument?: {
        name: string;
        url: string;
        uploadedAt: string;
    };
    status: 'INITIATED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
    reviewedBy?: any;
    reviewNotes?: string;
    reviewedAt?: string;
    statusHistory: Array<{
        status: string;
        changedBy: any;
        changedByRole: string;
        timestamp: string;
        notes?: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePaymentRequestPayload {
    amount: number;
    currency?: string;
    reason: string;
    expectedPaymentDate: string;
    additionalNotes?: string;
    category?: string;
    country?: string;
    branchId?: string;
    supportingDocument?: File;
}

export interface PaymentRequestFilters {
    status?: string;
    country?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
}

/**
 * Create a new payment request (supports optional file upload)
 */
export const createPaymentRequest = async (
    payload: CreatePaymentRequestPayload
): Promise<PaymentRequest> => {
    const formData = new FormData();
    formData.append('amount', String(payload.amount));
    formData.append('reason', payload.reason);
    formData.append('expectedPaymentDate', payload.expectedPaymentDate);
    if (payload.currency) formData.append('currency', payload.currency);
    if (payload.additionalNotes) formData.append('additionalNotes', payload.additionalNotes);
    if (payload.category) formData.append('category', payload.category);
    if (payload.country) formData.append('country', payload.country);
    if (payload.branchId) formData.append('branchId', payload.branchId);
    if (payload.supportingDocument) {
        formData.append('supportingDocument', payload.supportingDocument);
    }

    const response = await api.post('/api/payment-requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
};

/**
 * Get all payment requests for current user (Country Manager sees own; Financial Admin sees all)
 */
export const getPaymentRequests = async (
    filters: PaymentRequestFilters = {}
): Promise<{ data: PaymentRequest[]; pagination: any }> => {
    const response = await api.get('/api/payment-requests', { params: filters });
    return response.data;
};

/**
 * Get a single payment request by ID
 */
export const getPaymentRequestById = async (id: string): Promise<PaymentRequest> => {
    const response = await api.get(`/api/payment-requests/${id}`);
    return response.data.data;
};

/**
 * Update payment request status (Financial Admin)
 */
export const updatePaymentRequestStatus = async (
    id: string,
    status: string,
    reviewNotes?: string
): Promise<PaymentRequest> => {
    const response = await api.patch(`/api/payment-requests/${id}/status`, {
        status,
        reviewNotes,
    });
    return response.data.data;
};

/**
 * Delete a payment request (only INITIATED)
 */
export const deletePaymentRequest = async (id: string): Promise<void> => {
    await api.delete(`/api/payment-requests/${id}`);
};
