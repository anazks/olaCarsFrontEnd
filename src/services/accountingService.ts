import api from './api';

export type AccountingCategory = 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';

export interface AccountingCode {
    _id: string;
    code: string;
    name: string;
    category: AccountingCategory;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateAccountingCodePayload {
    code: string;
    name: string;
    category: AccountingCategory;
}

export const getAllAccountingCodes = async (): Promise<AccountingCode[]> => {
    const response = await api.get('/api/accounting-code');
    return response.data.data || response.data;
};

export const createAccountingCode = async (payload: CreateAccountingCodePayload): Promise<AccountingCode> => {
    const response = await api.post('/api/accounting-code', payload);
    return response.data.data || response.data;
};

export const updateAccountingCode = async (id: string, payload: Partial<CreateAccountingCodePayload>): Promise<AccountingCode> => {
    const response = await api.put(`/api/accounting-code/${id}`, payload);
    return response.data.data || response.data;
};

export const deleteAccountingCode = async (id: string): Promise<void> => {
    await api.delete(`/api/accounting-code/${id}`);
};
