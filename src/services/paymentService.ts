import api from './api';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'CHEQUE' | 'OTHER';

export interface PaymentTransaction {
    _id: string;
    accountingCode: string | any;
    referenceId: string;
    referenceModel: 'PurchaseOrder';
    transactionCategory: 'EXPENSE';
    transactionType: 'DEBIT';
    paymentMethod: PaymentMethod;
    isTaxInclusive: boolean;
    baseAmount: number;
    taxAmount: number;
    totalAmount: number;
    taxApplied?: string | any;
    status: PaymentStatus;
    notes?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreatePaymentPayload {
    accountingCode: string;
    referenceId: string;
    referenceModel: 'PurchaseOrder';
    transactionCategory: 'EXPENSE';
    transactionType: 'DEBIT';
    paymentMethod: PaymentMethod;
    isTaxInclusive: boolean;
    baseAmount?: number;
    totalAmount?: number;
    taxApplied?: string;
    status: PaymentStatus;
    notes?: string;
}

export const getAllPayments = async (filters?: any): Promise<PaymentTransaction[]> => {
    const response = await api.get('/api/payment', { params: filters });
    return response.data.data || response.data;
};

export const getPaymentById = async (id: string): Promise<PaymentTransaction> => {
    const response = await api.get(`/api/payment/${id}`);
    return response.data.data || response.data;
};

export const createPayment = async (payload: CreatePaymentPayload): Promise<PaymentTransaction> => {
    const response = await api.post('/api/payment', payload);
    return response.data.data || response.data;
};

export const updatePaymentStatus = async (id: string, status: PaymentStatus): Promise<PaymentTransaction> => {
    const response = await api.put(`/api/payment/${id}/status`, { status });
    return response.data.data || response.data;
};
