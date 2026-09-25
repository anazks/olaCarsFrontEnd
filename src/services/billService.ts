import api from './api';
import type { PurchaseOrder } from './purchaseOrderService';
import type { Supplier } from './supplierService';
import type { Branch } from './branchService';
import type { AccountingCode } from './accountingService';

export type BillStatus = 'DRAFT' | 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

export interface BillItem {
    itemName: string;
    quantity: number;
    unitPrice: number;
    accountId: string | AccountingCode;
    description?: string;
}

export interface BillPayment {
    _id?: string;
    amount: number;
    paidAt: string;
    paymentMethod: string;
    transactionId?: string;
    note?: string;
}

export interface Bill {
    _id: string;
    billNumber: string;
    purchaseOrder: string | PurchaseOrder;
    supplier: string | Supplier;
    branch: string | Branch;
    billDate: string;
    dueDate: string;
    paidAt?: string;
    items: BillItem[];
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: BillStatus;
    purchaseType?: 'CASH' | 'BANK' | 'CREDIT';
    creditAccountId?: string | AccountingCode;
    payments?: BillPayment[];
    isInclusiveTax?: boolean;
    taxId?: any;
    taxPercentage?: number;
    taxAmount?: number;
    notes?: string;
    ledgerEntries?: any[];
    createdAt: string;
    updatedAt: string;
}

export const getAllBills = async (params: any = {}): Promise<{ 
    success: boolean; 
    data: Bill[]; 
    count: number; 
    pagination?: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        limit: number;
    };
    metrics?: {
        totalGrossBilled?: number;
        totalNetSettled?: number;
        totalCurrentBalance?: number;
        totalBilled: number;
        totalBalanceDue: number;
        openCount: number;
        partialCount: number;
        paidCount: number;
        isFilteredPeriod: boolean;
    };
}> => {
    const response = await api.get('/api/bills', { params });
    return response.data;
};

export const getBillById = async (id: string): Promise<{ success: boolean; data: Bill }> => {
    const response = await api.get(`/api/bills/${id}`);
    return response.data;
};

export const convertPoToBill = async (poId: string, overrides: any = {}): Promise<{ success: boolean; data: Bill }> => {
    const response = await api.post('/api/bills/convert-po', { poId, ...overrides });
    return response.data;
};

export const disposePO = async (poId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/bills/dispose-po/${poId}`);
    return response.data;
};

export const recordBillPayment = async (billId: string, payload: any): Promise<any> => {
    const response = await api.post(`/api/bills/${billId}/record-payment`, payload);
    return response.data;
};

export const createBill = async (billData: any): Promise<{ success: boolean; data: Bill }> => {
    const response = await api.post('/api/bills', billData);
    return response.data;
};

export interface BillBulkUploadProgress {
    type: 'progress' | 'complete' | 'error';
    processedCount: number;
    totalCount: number;
    percentage: number;
    insertedCount: number;
    updatedCount?: number;
    skippedCount: number;
    errorCount?: number;
    estimatedSecondsRemaining?: number;
    statusMessage: string;
}

export const bulkUploadBills = async (
    payload: { rows: any[]; stream?: boolean; skipDuplicates?: boolean },
    onProgress?: (progress: BillBulkUploadProgress) => void
): Promise<any> => {
    if (payload.stream || onProgress) {
        const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const token = localStorage.getItem('token');

        const response = await fetch(`${baseURL}/api/bills/bulk-upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/x-ndjson',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ ...payload, stream: true })
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
            } catch (_) {}
        }

        return finalResult?.data || finalResult;
    }

    const response = await api.post('/api/bills/bulk-upload', payload);
    return response.data;
};


export const updateBill = async (id: string, payload: any): Promise<{ success: boolean; data: Bill; message: string }> => {
    const response = await api.put(`/api/bills/${id}`, payload);
    return response.data;
};

export const deleteBill = async (id: string, payload: { paymentAction?: string; targetBillId?: string } = {}): Promise<any> => {
    const response = await api.delete(`/api/bills/${id}`, {
        data: payload,
        headers: { 'X-Skip-Toast': 'true' }
    });
    return response.data;
};

export interface BulkDeleteResolution {
    billId: string;
    action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE';
    targetBillId?: string;
}

export interface BulkDeleteBillsPayload {
    billIds: string[];
    resolutions?: BulkDeleteResolution[];
}

export interface BulkDeleteCandidateBill {
    _id: string;
    billNumber: string;
    balanceDue: number;
    totalAmount: number;
    billDate?: string;
    dueDate?: string;
}

export interface BulkDeletePreviewBill {
    _id: string;
    billNumber: string;
    supplier?: { _id: string; name: string; supplierCode?: string };
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    billDate?: string;
    dueDate?: string;
    status: string;
    hasOtherOpenBills?: boolean;
    otherOpenBills?: BulkDeleteCandidateBill[];
}

export interface BulkDeletePreviewResponse {
    totalSelected: number;
    unpaidBills: BulkDeletePreviewBill[];
    paidBills: BulkDeletePreviewBill[];
}

export const previewBulkDeleteBills = async (billIds: string[]): Promise<BulkDeletePreviewResponse> => {
    const response = await api.post('/api/bills/bulk-delete/preview', { billIds });
    return response.data?.data || response.data;
};

export const bulkDeleteBills = async (payload: BulkDeleteBillsPayload): Promise<any> => {
    const response = await api.post('/api/bills/bulk-delete', payload);
    return response.data;
};
