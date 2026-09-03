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

export const bulkUploadBills = async (payload: { rows: any[] }): Promise<any> => {
    const response = await api.post('/api/bills/bulk-upload', payload);
    return response.data;
};
