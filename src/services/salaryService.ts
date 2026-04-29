import api from './api';

export interface SalaryStructure {
    _id?: string;
    staffId: string;
    staffRole: string;
    baseSalary: number;
    allowances: { name: string; amount: number }[];
    bonuses: { name: string; amount: number }[];
    deductions: { name: string; amount: number }[];
    currency: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export const getSalaryStructures = async () => {
    const response = await api.get('/api/salaries/structures');
    return response.data;
};

export const updateSalaryStructure = async (data: any) => {
    const response = await api.post('/api/salaries/structures', data);
    return response.data;
};

export const processPayroll = async (data: any) => {
    const response = await api.post('/api/salaries/process', data);
    return response.data;
};
