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

export const payInvoice = async (invoiceId: string, paymentData: any): Promise<Invoice> => {
    const response = await api.post(`/api/invoices/${invoiceId}/pay`, paymentData);
    return response.data.data;
};
