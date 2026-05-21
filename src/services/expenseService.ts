import api from './api';

export interface Expense {
    _id: string;
    expenseNumber: string;
    expenseAccount: {
        _id: string;
        code: string;
        name: string;
        category: string;
    };
    paidThroughAccount: {
        _id: string;
        code: string;
        name: string;
        category: string;
    };
    amount: number;
    expenseDate: string;
    supplier?: {
        _id: string;
        name: string;
    };
    customer?: {
        _id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
    };
    branch: {
        _id: string;
        name: string;
        code: string;
    };
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ExpenseFilters {
    search?: string;
    branch?: string;
    supplier?: string;
    customer?: string;
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
}

export const getAllExpenses = async (filters: ExpenseFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.branch) params.append('branch', filters.branch);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.customer) params.append('customer', filters.customer);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const res = await api.get(`/api/expenses?${params.toString()}`);
    return res.data;
};

export const getExpenseById = async (id: string) => {
    const res = await api.get(`/api/expenses/${id}`);
    return res.data;
};

export const createExpense = async (data: any) => {
    const res = await api.post('/api/expenses', data);
    return res.data;
};

export const updateExpense = async (id: string, data: any) => {
    const res = await api.put(`/api/expenses/${id}`, data);
    return res.data;
};

export const deleteExpense = async (id: string) => {
    const res = await api.delete(`/api/expenses/${id}`);
    return res.data;
};
