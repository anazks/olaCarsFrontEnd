import api from './api';

export interface CreditNote {
    _id: string;
    creditNoteNumber: string;
    customerId?: {
        _id: string;
        customerId?: string;
        name?: string;
        email?: string;
        phone?: string;
    };
    driverId?: {
        _id: string;
        driverId?: string;
        personalInfo?: {
            fullName?: string;
            email?: string;
        };
    };
    invoiceId?: {
        _id: string;
        invoiceNumber?: string;
        totalAmountDue?: number;
        balance?: number;
        status?: string;
    };
    amount: number;
    creditNoteDate: string;
    reason: string;
    notes?: string;
    status: 'OPEN' | 'APPLIED' | 'CLOSED' | 'VOID';
    supportingDocument?: {
        name: string;
        url: string;
        uploadedAt: string;
    };
    createdAt: string;
}

export interface CreateCreditNotePayload {
    customerId: string;
    driverId?: string;
    invoiceId?: string;
    amount: number;
    reason: string;
    notes?: string;
    creditNoteDate?: string;
    supportingDocument?: File;
}

export const getAllCreditNotes = async (params: any = {}) => {
    const res = await api.get('/api/credit-notes', { 
        params,
        headers: { 'X-Skip-Toast': 'true' } 
    });
    return res.data;
};

export const getCreditNoteById = async (id: string) => {
    const res = await api.get(`/api/credit-notes/${id}`);
    return res.data;
};

export const createCreditNote = async (payload: CreateCreditNotePayload) => {
    let body: any = payload;
    if (payload.supportingDocument && payload.supportingDocument instanceof File) {
        const formData = new FormData();
        Object.keys(payload).forEach((key) => {
            const val = (payload as any)[key];
            if (val !== undefined && val !== null) {
                formData.append(key, val instanceof File ? val : String(val));
            }
        });
        body = formData;
    }
    const res = await api.post('/api/credit-notes', body, {
        headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return res.data;
};

export const voidCreditNote = async (id: string) => {
    const res = await api.put(`/api/credit-notes/${id}/void`);
    return res.data;
};

export const updateCreditNote = async (id: string, payload: any) => {
    const res = await api.put(`/api/credit-notes/${id}`, payload);
    return res.data;
};

export const applyCreditNote = async (id: string, invoiceId: string) => {
    const res = await api.put(`/api/credit-notes/${id}/apply`, { invoiceId });
    return res.data;
};

export const refundCreditNote = async (id: string) => {
    const res = await api.put(`/api/credit-notes/${id}/refund`);
    return res.data;
};

export const bulkUploadCreditNotes = async (payload: { rows: any[] }) => {
    const res = await api.post('/api/credit-notes/bulk-upload', payload);
    return res.data;
};
