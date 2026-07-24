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
    runningBalance?: number;
    attachments?: {
        name: string;
        url: string;
        uploadedAt?: string;
        _id?: string;
    }[];
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

export interface LedgerEntriesResponse {
    data: LedgerEntry[];
    summary?: {
        totalDebit: number;
        totalCredit: number;
        netMovement: number;
        openingBalance?: number;
        closingBalance?: number;
    };
    pagination?: any;
}

export const getLedgerEntries = async (filters: Record<string, any> = {}): Promise<LedgerEntriesResponse> => {
    const cleanFilters: Record<string, string> = {};
    Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
            cleanFilters[key] = String(filters[key]);
        }
    });
    const params = new URLSearchParams(cleanFilters).toString();
    const url = `/api/ledger${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return {
        data: response.data.data,
        summary: response.data.summary,
        pagination: response.data.pagination
    };
};

export const getLedgerEntryById = async (id: string): Promise<LedgerEntry> => {
    const response = await api.get(`/api/ledger/${id}`);
    return response.data.data;
};

export const updateLedgerEntry = async (
    id: string,
    data: { description?: string; accountingCode?: string; existingAttachments?: any[]; files?: File[] }
): Promise<LedgerEntry> => {
    const formData = new FormData();
    if (data.description !== undefined) {
        formData.append("description", data.description);
    }
    if (data.accountingCode !== undefined) {
        formData.append("accountingCode", data.accountingCode);
    }
    if (data.existingAttachments !== undefined) {
        formData.append("existingAttachments", JSON.stringify(data.existingAttachments));
    }
    if (data.files && data.files.length > 0) {
        data.files.forEach((file) => {
            formData.append("files", file);
        });
    }

    const response = await api.put(`/api/ledger/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
};

export const clearLedgerEntriesByCode = async (
    accountingCode: string, 
    startDate?: string, 
    endDate?: string
): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const paramStr = params.toString();
    const response = await api.delete(`/api/ledger/clear/${accountingCode}${paramStr ? `?${paramStr}` : ''}`);
    return response.data;
};

export const createManualJournal = async (payload: CreateJournalPayload): Promise<any> => {
    const response = await api.post('/api/ledger/journals', payload);
    return response.data.data;
};

export interface ManualJournalsResponse {
    data: ManualJournal[];
    pagination?: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const getManualJournals = async (filters: Record<string, any> = {}): Promise<ManualJournalsResponse> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/ledger/journals${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return {
        data: response.data.data,
        pagination: response.data.pagination
    };
};

// --- Voucher System ---

export type VoucherType = 'SALES' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface Voucher {
    _id: string;
    voucherNumber: string;
    date: string;
    type: VoucherType;
    branch: any;
    narration: string;
    referenceInfo?: {
        referenceNumber?: string;
        partyName?: string;
        partyId?: string;
        partyType?: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER';
    };
    lines: JournalLine[];
    totalAmount: number;
    status: VoucherStatus;
    createdBy: any;
    creatorRole: string;
    postedAt?: string;
    postedBy?: any;
    postedByRole?: string;
    createdAt: string;
}

export interface CreateVoucherPayload {
    type: VoucherType;
    date: string;
    branch: string;
    narration: string;
    referenceInfo?: {
        referenceNumber?: string;
        partyName?: string;
        partyId?: string;
        partyType?: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER';
    };
    lines: JournalLine[];
}

export const createVoucher = async (payload: CreateVoucherPayload): Promise<any> => {
    const response = await api.post('/api/vouchers', payload);
    return response.data.data;
};

export const getVouchers = async (filters: Record<string, any> = {}): Promise<{ vouchers: Voucher[], pagination: any }> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/vouchers${params ? `?${params}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
};

export const getVoucherById = async (id: string): Promise<Voucher> => {
    const response = await api.get(`/api/vouchers/${id}`);
    return response.data.data;
};

// --- Bulk Import ---

export const bulkImportLedgerEntries = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/ledger/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const bulkImportLedgerRows = async (rows: any[]): Promise<any> => {
    const response = await api.post('/api/ledger/import', { rows });
    return response.data;
};

/**
 * Delete a ledger entry and its entire parent journal (all double-entry partners).
 * ADMIN only.
 */
export const deleteLedgerJournal = async (entryId: string): Promise<any> => {
    const response = await api.delete(`/api/ledger/${entryId}`);
    return response.data;
};
