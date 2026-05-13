import api from './api';

export interface CollectionsMetricData {
    totalInvoiced: number;
    totalCollected: number;
    pendingCollected: number;
    overdueAmount: number;
    forecastAmount: number;
    mtdCollected: number;
}

export interface TrendDataPoint {
    label: string;
    collected: number;
    expected: number;
}

export interface OverdueEntry {
    id: string;
    invoiceNumber: string;
    driverName: string;
    fleetNumber: string;
    dueDate: string;
    balance: number;
    daysOverdue: number;
}

export interface UpcomingEntry {
    id: string;
    invoiceNumber: string;
    driverName: string;
    fleetNumber: string;
    dueDate: string;
    totalDue: number;
    balance: number;
}

export interface CollectionsOverviewResponse {
    metrics: CollectionsMetricData;
    trend: TrendDataPoint[];
    recentOverdue: OverdueEntry[];
    upcomingPayments: UpcomingEntry[];
}

export interface CollectionListItem {
    id: string;
    invoiceNumber: string;
    driverId: string;
    driverName: string;
    vehicleNumber: string;
    fleetNumber: string;
    branch: string;
    country: string;
    dueDate: string;
    totalAmountDue: number;
    amountPaid: number;
    balance: number;
    status: string;
    generatedAt: string;
    daysOverdue?: number;
}

export interface CollectionsListResponse {
    items: CollectionListItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface CollectionsQueryParams {
    country?: string;
    branch?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    listType?: 'OVERDUE' | 'UPCOMING' | 'GENERAL' | string;
}

export const getCollectionsOverview = async (params: CollectionsQueryParams = {}): Promise<CollectionsOverviewResponse> => {
    const response = await api.get('/api/collections/overview', { params, headers: { 'X-Skip-Toast': 'true' } });
    return response.data.data;
};

export const getCollectionsList = async (params: CollectionsQueryParams = {}): Promise<CollectionsListResponse> => {
    const response = await api.get('/api/collections/list', { params, headers: { 'X-Skip-Toast': 'true' } });
    return response.data.data;
};
