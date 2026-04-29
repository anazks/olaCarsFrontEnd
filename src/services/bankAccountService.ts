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
}

export const getAllBankAccounts = async () => {
    const response = await api.get('/api/bank-accounts');
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
