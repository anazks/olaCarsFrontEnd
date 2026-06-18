import api from './api';

export interface LineItem {
    name: string;
    description?: string;
    qty: number;
    unitPrice: number;
    total: number;
}

export interface InvoicePayment {
    amount: number;
    paidAt: string;
    paymentMethod: string;
    transactionId?: string;
    note?: string;
}

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    invoiceType: 'RENTAL' | 'WORKSHOP' | 'MANUAL' | 'DEPOSIT';
    customer?: string | any;
    driver: string | any;
    vehicle: string | any;
    serviceBill?: string | any;
    weekNumber?: number;
    weekLabel?: string;
    dueDate: string;
    baseAmount: number;
    carryOverAmount: number;
    totalAmountDue: number;
    amountPaid: number;
    balance: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paidAt?: string;
    payments: InvoicePayment[];
    generatedAt: string;
    pdfS3Key?: string;
    createdAt?: string;
    updatedAt?: string;
    // Manual invoice fields
    lineItems?: LineItem[];
    subtotal?: number;
    discountType?: 'PERCENTAGE' | 'FIXED';
    discountValue?: number;
    discountAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    notes?: string;
}

export const getInvoicesByDriver = async (driverId: string): Promise<Invoice[]> => {
    const response = await api.get(`/api/invoices?driver=${driverId}&limit=100`);
    return response.data.data || [];
};

export const getInvoicesByCustomer = async (customerId: string): Promise<Invoice[]> => {
    const response = await api.get(`/api/invoices?customer=${customerId}&limit=100`);
    return response.data.data || [];
};

export const getDepositInvoicesByDriver = async (driverId: string): Promise<Invoice[]> => {
    const response = await api.get(`/api/invoices?driver=${driverId}&invoiceType=DEPOSIT&limit=100`);
    return response.data.data || [];
};

export const getInvoicesRegistry = async (filters: any = {}): Promise<{data: Invoice[], pagination?: any, metrics?: any}> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.status) params.append('status', filters.status);
    if (filters.month) params.append('month', filters.month);
    if (filters.year) params.append('year', filters.year);
    
    const response = await api.get(`/api/invoices?${params.toString()}`);
    return { 
        data: response.data.data || [], 
        pagination: response.data.pagination,
        metrics: response.data.metrics
    };
};

export const getPendingInvoicesByDriver = async (driverId: string): Promise<Invoice[]> => {
    const response = await api.get(`/api/invoices/driver/${driverId}/pending`);
    return response.data.data || [];
};

export const getInvoices = async (filters: any = {}): Promise<{data: Invoice[], pagination?: any}> => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.invoiceType && filters.invoiceType !== 'ALL') params.append('invoiceType', filters.invoiceType);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/api/invoices?${params.toString()}`);
    return { 
        data: response.data.data || [], 
        pagination: response.data.pagination 
    };
};

export const createInvoice = async (data: any): Promise<Invoice> => {
    const response = await api.post('/api/invoices', data);
    return response.data.data;
};

export const payInvoice = async (invoiceId: string, paymentData: any): Promise<Invoice> => {
    const response = await api.post(`/api/invoices/${invoiceId}/pay`, paymentData);
    return response.data.data;
};

export const updateInvoice = async (invoiceId: string, updateData: any): Promise<Invoice> => {
    const response = await api.put(`/api/invoices/${invoiceId}`, updateData);
    return response.data.data;
};

export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
    const response = await api.get(`/api/invoices/${invoiceId}`);
    return response.data.data;
};

export const deleteInvoice = async (invoiceId: string): Promise<void> => {
    await api.delete(`/api/invoices/${invoiceId}`);
};

export const deleteAllInvoices = async (): Promise<void> => {
    await api.delete('/api/invoices/all');
};

export const triggerWeeklyGeneration = async (): Promise<{generatedCount: number, skippedCount: number}> => {
    const response = await api.post('/api/invoices/generate-weekly');
    return response.data.data;
};

export const getGenerationSettings = async (): Promise<{generationDay: number}> => {
    const response = await api.get('/api/invoices/settings/generation');
    return response.data.data;
};

export const updateGenerationSettings = async (generationDay: number): Promise<void> => {
    await api.post('/api/invoices/settings/generation', { generationDay });
};

export const bulkUploadInvoices = async (data: { rows: any[], invoiceType: string }): Promise<any> => {
    const response = await api.post('/api/invoices/bulk-upload', data);
    return response.data.data;
};

