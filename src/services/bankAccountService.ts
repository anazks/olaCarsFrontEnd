import api from './api';

export interface BankAccount {
    _id: string;
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
    swiftCode?: string;
    ifscCode?: string;
    branchName?: string;
    currency: string;
    initialBalance: number;
    currentBalance: number;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    accountType?: 'Bank' | 'Credit Card';
    accountName?: string;
    accountCode?: string;
    description?: string;
    accountingCode?: any;
    transactionCount?: number;
}

export const getAllBankAccounts = async (params?: any) => {
    const response = await api.get('/api/bank-accounts', { params });
    return response.data;
};

export const createBankAccount = async (data: Partial<BankAccount>) => {
    const response = await api.post('/api/bank-accounts', data);
    return response.data;
};

export const updateBankAccount = async (id: string, data: Partial<BankAccount>) => {
    const response = await api.put(`/api/bank-accounts/${id}`, data);
    return response.data;
};

export const deleteBankAccount = async (id: string) => {
    const response = await api.delete(`/api/bank-accounts/${id}`);
    return response.data;
};

export const getBankAccountById = async (id: string) => {
    const response = await api.get(`/api/bank-accounts/${id}`);
    return response.data;
};

export const uploadBankStatement = async (id: string, branchId: string, transactions: any[]) => {
    const response = await api.post(`/api/bank-accounts/${id}/statement`, { branchId, transactions });
    return response.data;
};

export const recordManualPayment = async (id: string, data: FormData) => {
    const response = await api.post(`/api/bank-accounts/${id}/manual-payment`, data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deleteAllTransactions = async (id: string) => {
    const response = await api.delete(`/api/bank-accounts/${id}/transactions`);
    return response.data;
};

export const bulkUploadBankAccountTransactions = async (id: string, data: { branchId?: string; transactions: any[]; clearExisting?: boolean }) => {
    const response = await api.post(`/api/bank-accounts/${id}/bulk-upload`, data);
    return response.data;
};

export const getBankAccountTransactions = async (id: string, params?: any) => {
    const response = await api.get(`/api/bank-accounts/${id}/transactions`, { params });
    return response.data;
};

export const getBankTransactionById = async (transactionId: string): Promise<any> => {
    const response = await api.get(`/api/bank-accounts/transactions/${transactionId}`);
    return response.data.data || response.data;
};

export const bulkDeleteBankAccountTransactions = async (id: string, transactionIds: string[]) => {
    const response = await api.post(`/api/bank-accounts/${id}/transactions/bulk-delete`, { transactionIds });
    return response.data;
};

export const bulkEditBankAccountTransactions = async (id: string, updates: any[]) => {
    const response = await api.post(`/api/bank-accounts/${id}/transactions/bulk-edit`, { updates });
    return response.data;
};

export const bulkEditBankTransactions = bulkEditBankAccountTransactions;

export const updateCustomerTransactionAmount = async (transactionId: string, data: { amount: number; notes?: string; entryDate?: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/customer-amount`, data);
    return response.data;
};

export const updateCustomerContact = async (transactionId: string, data: { newCustomerId: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/customer-contact`, data);
    return response.data;
};

export const updateVendorTransactionAmount = async (transactionId: string, data: { amount: number; notes?: string; entryDate?: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/vendor-amount`, data);
    return response.data;
};

export const updateVendorContact = async (transactionId: string, data: { newSupplierId: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/vendor-contact`, data);
    return response.data;
};

export const updateInterBankTransactionAmount = async (transactionId: string, data: { amount: number; notes?: string; entryDate?: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/inter-bank-amt-edit`, data);
    return response.data;
};

export const updateLinkedAccountingCode = async (transactionId: string, data: { newAccountingCodeId: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/linked-account`, data);
    return response.data;
};

export const downloadBankAccountLedgerPdf = async (id: string, params?: any) => {
    const response = await api.get(`/api/bank-accounts/${id}/ledger/pdf`, {
        params,
        responseType: 'blob'
    });
    return response.data;
};


