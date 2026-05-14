import api from './api';

export interface DailyFinanceData {
    date: string;
    income: number;
    expenses: number;
}

export interface DriverPerformanceData {
    id: string;
    name: string;
    branch: string;
    avgSpeed: number;
    totalDistance: number;
    drivingScore: number;
    fuelEfficiency: number;
    rentStatus: string;
    rentBalance: number;
}

export interface StaffPerformanceData {
    id: string;
    name: string;
    role: string;
    tasksCompleted: number;
    totalTasks: number;
    taskCompletionRate: number;
    activeTargets: number;
    targetsMet: number;
}

export interface BalanceSheetReport {
    assets: { name: string; amount: number }[];
    liabilities: { name: string; amount: number }[];
    equity: { name: string; amount: number }[];
    assetsTotal: number;
    liabilitiesTotal: number;
    equityTotal: number;
}

export interface ReportFilters {
    startDate?: string;
    endDate?: string;
    branch?: string;
    country?: string;
}

export const getDailyFinanceReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/daily-finance', { params: filters });
    return response.data;
};

export const getDriverPerformanceReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/driver-performance', { params: filters });
    return response.data;
};

export const getStaffPerformanceReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/staff-performance', { params: filters });
    return response.data;
};

export const getPLReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/pl', { params: filters });
    return response.data;
};

export const getBalanceSheetReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/balance-sheet', { params: filters });
    return response.data;
};

export const getUnifiedStaff = async (filters: any) => {
    const response = await api.get('/api/reporting/staff/unified', { params: filters });
    return response.data;
};
