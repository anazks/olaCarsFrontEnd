import api from './api';

export interface LedgerEntry {
    _id: string;
    date: string;
    description: string;
    accountingCode: {
        code: string;
        name: string;
        category: string;
    };
    debit?: number;
    credit?: number;
    amount?: number;
    type?: 'DEBIT' | 'CREDIT';
    entryDate?: string;
    referenceId?: string;
    createdAt?: string;
}

export const getLedgerEntries = async (filters: Record<string, any> = {}): Promise<LedgerEntry[]> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/ledger${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data.data || response.data;
};
