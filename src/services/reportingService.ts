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
    bankAccount?: string;
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

export const getBankBalanceSheetReport = async (filters: ReportFilters) => {
    const response = await api.get('/api/reporting/bank-balance-sheet', { params: filters });
    return response.data;
};

export const getUnifiedStaff = async (filters: any) => {
    const response = await api.get('/api/reporting/staff/unified', { params: filters });
    return response.data;
};

export const downloadExcelReport = async (reportType: string, filters: { startDate?: string; endDate?: string; branch?: string }) => {
    const response = await api.get('/api/reporting/export/excel', {
        params: {
            reportType,
            ...filters
        },
        responseType: 'blob'
    });
    
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `${reportType}_report_${dateStr}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};
