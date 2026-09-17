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

export const getBankAccountUploadStatus = async (id: string) => {
    const response = await api.get(`/api/bank-accounts/${id}/upload-status?_t=${Date.now()}`);
    return response.data;
};

export interface BulkUploadProgressEvent {
    type: 'progress';
    processedCount: number;
    totalCount: number;
    percentage: number;
    insertedCount: number;
    skippedCount: number;
    setOffCount: number;
    estimatedSecondsRemaining: number;
    statusMessage: string;
    stage?: string;
}

export const bulkUploadBankAccountTransactions = async (
    id: string,
    data: { 
        clearExisting?: boolean; 
        transactions: any[]; 
        batchIndex?: number; 
        totalBatches?: number; 
        fileName?: string;
        isLastBatch?: boolean;
        skipRecalculate?: boolean;
    },
    onProgress?: (progress: BulkUploadProgressEvent) => void
) => {
    const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const token = localStorage.getItem('token');

    const response = await fetch(`${baseURL}/api/bank-accounts/${id}/bulk-upload`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        let errMessage = 'Bulk upload failed';
        try {
            const errData = await response.json();
            errMessage = errData.message || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error('ReadableStream not supported by browser');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed.type === 'progress') {
                    if (onProgress) onProgress(parsed);
                } else if (parsed.type === 'complete') {
                    finalResult = parsed;
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.message || 'Upload failed');
                }
            } catch (e: any) {
                if (e.message && e.message !== 'Upload failed' && !e.message.startsWith('Unexpected')) {
                    throw e;
                }
            }
        }
    }

    if (buffer.trim()) {
        try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.type === 'complete') {
                finalResult = parsed;
            } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'Upload failed');
            }
        } catch (e: any) {
            if (e.message && e.message !== 'Upload failed' && !e.message.startsWith('Unexpected')) {
                throw e;
            }
        }
    }

    if (!finalResult) {
        throw new Error('Upload completed without a final response from server');
    }

    return finalResult;
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

export const updateTransactionDate = async (transactionId: string, data: { date: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/date`, data);
    return response.data;
};

export const updateTransactionDescription = async (transactionId: string, data: { description: string }) => {
    const response = await api.put(`/api/bank-accounts/transactions/${transactionId}/description`, data);
    return response.data;
};

export const downloadBankAccountLedgerPdf = async (id: string, params?: any) => {
    const response = await api.get(`/api/bank-accounts/${id}/ledger/pdf`, {
        params,
        responseType: 'blob'
    });
    return response.data;
};

export const recalculateBankAccountBalances = async (id: string) => {
    const response = await api.post(`/api/bank-accounts/${id}/recalculate-balances`);
    return response.data;
};
