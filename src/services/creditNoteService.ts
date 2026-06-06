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
    const res = await api.post('/api/credit-notes', payload);
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
