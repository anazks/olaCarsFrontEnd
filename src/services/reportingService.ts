import api from './api';

export interface PLReport {
    income: { name: string; amount: number }[];
    expenses: { name: string; amount: number }[];
    netProfit: number;
}

export interface BalanceSheetReport {
    assets: { name: string; amount: number }[];
    liabilities: { name: string; amount: number }[];
    equity: { name: string; amount: number }[];
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
}


export const getPLReport = async (filters: Record<string, any> = {}): Promise<PLReport> => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/reporting/pl?${params}`);
    return response.data.data;
};

export const getBalanceSheetReport = async (filters: Record<string, any> = {}): Promise<BalanceSheetReport> => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/api/reporting/balance-sheet?${params}`);
    return response.data.data;
};
