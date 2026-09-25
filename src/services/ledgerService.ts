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
    referenceNumber?: string;
    description: string;
    date: string;
    branch: string;
    totalAmount: number;
    status: 'DRAFT' | 'POSTED' | 'CANCELLED';
    contact?: any;
    contactModel?: 'Customer' | 'Supplier';
    supplier?: any;
    autoSetOff?: boolean;
    invoices?: Array<{
        invoiceId: any;
        amountApplied: number;
    }>;
    bills?: Array<{
        billId: any;
        amountApplied: number;
    }>;
    setOffSummary?: {
        totalSettled: number;
        totalInvoicesAffected?: number;
        totalBillsAffected?: number;
        documents?: any[];
    };
    createdBy: any;
    creatorRole: string;
    createdAt: string;
}

export interface CreateJournalPayload {
    referenceNumber?: string;
    description: string;
    date: string;
    branch: string;
    lines: JournalLine[];
    contact?: string;
    contactModel?: 'Customer' | 'Supplier';
    supplier?: string;
    autoSetOff?: boolean;
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
    data: { 
        description?: string; 
        accountingCode?: string; 
        amount?: number;
        type?: 'DEBIT' | 'CREDIT';
        existingAttachments?: any[]; 
        files?: File[] 
    }
): Promise<LedgerEntry> => {
    const formData = new FormData();
    if (data.description !== undefined) {
        formData.append("description", data.description);
    }
    if (data.accountingCode !== undefined) {
        formData.append("accountingCode", data.accountingCode);
    }
    if (data.amount !== undefined) {
        formData.append("amount", String(data.amount));
    }
    if (data.type !== undefined) {
        formData.append("type", data.type);
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

export const deleteSingleLedgerEntry = async (id: string): Promise<any> => {
    const response = await api.delete(`/api/ledger/entries/${id}`);
    return response.data;
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

export interface JournalBulkUploadProgress {
    type: 'progress' | 'complete' | 'error';
    current?: number;
    total?: number;
    percentage?: number;
    reference?: string;
    statusMessage?: string;
    message?: string;
    data?: any;
}

export const bulkUploadManualJournals = async (
    payload: { journals?: any[]; rows?: any[]; stream?: boolean } | any[],
    onProgress?: (progress: JournalBulkUploadProgress) => void
): Promise<any> => {
    if (onProgress) {
        const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const token = localStorage.getItem('token');

        const bodyObj = Array.isArray(payload) ? { journals: payload, stream: true } : { ...payload, stream: true };

        const response = await fetch(`${baseURL}/api/ledger/journals/bulk-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(bodyObj)
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
            const json = await response.json();
            return json.data || json;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;
                try {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.type === 'progress') {
                        onProgress(parsed);
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

        if (buffer.trim() && !buffer.trim().startsWith(':')) {
            try {
                const parsed = JSON.parse(buffer.trim());
                if (parsed.type === 'complete') {
                    finalResult = parsed;
                } else if (parsed.type === 'error') {
                    throw new Error(parsed.message || 'Upload failed');
                }
            } catch (_) {}
        }

        return finalResult?.data || finalResult;
    }

    const response = await api.post('/api/ledger/journals/bulk-upload', payload);
    return response.data;
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

export const getManualJournalById = async (id: string): Promise<{ journal: ManualJournal; lines: LedgerEntry[] }> => {
    const response = await api.get(`/api/ledger/journals/${id}`);
    return response.data.data;
};

export const deleteManualJournal = async (id: string): Promise<any> => {
    const response = await api.delete(`/api/ledger/journals/${id}`);
    return response.data;
};

export interface UpdateManualJournalPayload {
    date?: string;
    branch?: string;
    referenceNumber?: string;
    description?: string;
    lines?: any[];
}

export const updateManualJournal = async (id: string, payload: UpdateManualJournalPayload): Promise<any> => {
    const response = await api.put(`/api/ledger/journals/${id}`, payload);
    return response.data;
};

// --- Voucher System ---

export type VoucherType = 'SALES' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA';
export type VoucherStatus = 'DRAFT' | 'POSTED' | 'CANCELLED';

export interface VoucherSetOffItem {
    invoiceId?: string;
    invoiceNumber?: string;
    billId?: string;
    billNumber?: string;
    amountApplied: number;
    newStatus?: string;
    newBalance?: number;
}

export interface VoucherSetOffSummary {
    totalSetOff: number;
    excessAmount: number;
    invoiceCount?: number;
    billCount?: number;
    itemsSetOff?: VoucherSetOffItem[];
}

export interface Voucher {
    _id: string;
    voucherNumber: string;
    date: string;
    type: VoucherType;
    branch: any;
    narration: string;
    autoSetOff?: boolean;
    setOffSummary?: VoucherSetOffSummary;
    paymentReceived?: any;
    paymentMade?: any;
    contact?: string;
    contactModel?: 'Customer' | 'Supplier' | 'Driver' | 'Other';
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
    autoSetOff?: boolean;
    contact?: string;
    contactModel?: 'Customer' | 'Supplier' | 'Driver' | 'Other';
    referenceInfo?: {
        referenceNumber?: string;
        partyName?: string;
        partyId?: string;
        partyType?: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER';
    };
    lines: JournalLine[];
}

export interface VoucherStatsResponse {
    totalVouchers: number;
    totalAmount: number;
    byType: Record<VoucherType, { count: number; totalAmount: number }>;
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

export const cancelVoucher = async (id: string): Promise<Voucher> => {
    const response = await api.patch(`/api/vouchers/${id}/cancel`);
    return response.data.data;
};

export const getVoucherStats = async (filters: Record<string, any> = {}): Promise<VoucherStatsResponse> => {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/vouchers/stats${params ? `?${params}` : ''}`;
    const response = await api.get(url);
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
