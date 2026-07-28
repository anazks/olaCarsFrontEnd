import api from './api';

export interface DebitNote {
    _id: string;
    debitNoteNumber: string;
    customerId?: {
        _id: string;
        customerId?: string;
        name?: string;
        email?: string;
        phone?: string;
    };
    supplierId?: {
        _id: string;
        supplierCode?: string;
        name?: string;
        companyName?: string;
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
    amountPaid?: number;
    balance?: number;
    isDeposit?: boolean;
    debitNoteDate: string;
    reason: string;
    notes?: string;
    status: 'OPEN' | 'APPLIED' | 'CLOSED' | 'VOID' | 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'DRAFT';
    supportingDocument?: {
        name: string;
        url: string;
        uploadedAt: string;
    };
    createdAt: string;
}

export interface CreateDebitNotePayload {
    customerId: string;
    driverId?: string;
    invoiceId?: string;
    amount: number;
    reason: string;
    notes?: string;
    debitNoteDate?: string;
    supportingDocument?: File;
}

export const getAllDebitNotes = async (params: any = {}) => {
    const res = await api.get('/api/debit-notes', { 
        params,
        headers: { 'X-Skip-Toast': 'true' } 
    });
    return res.data;
};

export const getDebitNoteById = async (id: string) => {
    const res = await api.get(`/api/debit-notes/${id}`);
    return res.data;
};

export const createDebitNote = async (payload: CreateDebitNotePayload) => {
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
    const res = await api.post('/api/debit-notes', body, {
        headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return res.data;
};

export const voidDebitNote = async (id: string) => {
    const res = await api.put(`/api/debit-notes/${id}/void`);
    return res.data;
};

export const updateDebitNote = async (id: string, payload: any) => {
    const res = await api.put(`/api/debit-notes/${id}`, payload);
    return res.data;
};

export const applyDebitNote = async (id: string, invoiceId: string) => {
    const res = await api.put(`/api/debit-notes/${id}/apply`, { invoiceId });
    return res.data;
};

export const bulkUploadDebitNotes = async (payload: { rows: any[] }) => {
    const res = await api.post('/api/debit-notes/bulk-upload', payload);
    return res.data;
};
