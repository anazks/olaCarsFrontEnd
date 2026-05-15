import api from './api';

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
    driver: string | any;
    vehicle: string | any;
    weekNumber: number;
    weekLabel: string;
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
}

export const getInvoicesByDriver = async (driverId: string): Promise<Invoice[]> => {
    const response = await api.get(`/api/invoices?driver=${driverId}&limit=100`);
    return response.data.data.data || response.data.data || response.data;
};

export const getInvoices = async (filters: any = {}): Promise<{data: Invoice[], pagination?: any}> => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/api/invoices?${params.toString()}`);
    return { 
        data: response.data.data.data || [], 
        pagination: response.data.data.pagination 
    };
};

export const payInvoice = async (invoiceId: string, paymentData: any): Promise<Invoice> => {
    const response = await api.post(`/api/invoices/${invoiceId}/pay`, paymentData);
    return response.data.data;
};
