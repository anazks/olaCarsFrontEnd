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

