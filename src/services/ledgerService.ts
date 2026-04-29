import api from './api';

export interface LedgerEntry {
    _id: string;
    date: string;
    description: string;
    accountingCode: {
        _id: string;
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
    branch?: any;
    taxInfo?: {
        taxApplied?: any;
        taxAmount?: number;
        isTaxInclusive?: boolean;
    };
    createdBy?: any;
    creatorRole?: string;
    createdAt?: string;
}

export interface JournalLine {
    accountingCode: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    taxInfo?: {
        taxApplied?: string;
        taxAmount?: number;
        isTaxInclusive?: boolean;
    };
}

export interface ManualJournal {
    _id: string;
    journalNumber: string;
    description: string;
    date: string;
    branch: string;
    totalAmount: number;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    createdBy: any;
    creatorRole: string;
    createdAt: string;
}

export interface CreateJournalPayload {
    description: string;
    date: string;
    branch: string;
    lines: JournalLine[];
}

export const getLedgerEntries = async (filters: Record<string, any> = {}): Promise<LedgerEntry[]> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/ledger${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data.data || response.data;
};

export const createManualJournal = async (payload: CreateJournalPayload): Promise<any> => {
    const response = await api.post('/api/ledger/journals', payload);
    return response.data.data;
};

export const getManualJournals = async (filters: Record<string, any> = {}): Promise<ManualJournal[]> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/ledger/journals${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
};
