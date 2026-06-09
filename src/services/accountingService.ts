import api from './api';

export type AccountingCategory = 'INCOME' | 'EXPENSE' | 'ASSET' | 'LIABILITY' | 'EQUITY';

export interface AccountingCode {
    _id: string;
    code: string;
    name: string;
    category: AccountingCategory;
    accountType?: string;
    description?: string;
    mileageRate?: number;
    mileageUnit?: string;
    isMileage?: boolean;
    accountNumber?: string;
    accountStatus?: string;
    currency?: string;
    parentAccount?: string | { _id: string; code: string; name: string } | null;
    cuentaEspanol?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateAccountingCodePayload {
    code: string;
    name: string;
    category: AccountingCategory;
    accountType?: string;
    description?: string;
    mileageRate?: number;
    mileageUnit?: string;
    isMileage?: boolean;
    accountNumber?: string;
    accountStatus?: string;
    currency?: string;
    parentAccount?: string | null;
    cuentaEspanol?: string;
}

export const getAllAccountingCodes = async (params?: any): Promise<AccountingCode[] & { data?: AccountingCode[]; pagination?: any }> => {
    const defaultParams = { limit: 1000, ...params };
    const response = await api.get('/api/accounting-code', { params: defaultParams });
    if (params && (params.page || params.limit || params.search)) {
        return response.data;
    }
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

export const bulkUpsertAccountingCodes = async (codes: Partial<CreateAccountingCodePayload>[]): Promise<any> => {
    const response = await api.post('/api/accounting-code/bulk', { codes });
    return response.data.data || response.data;
};
