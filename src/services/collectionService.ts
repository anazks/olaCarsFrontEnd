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
    customerId?: string;
    customerName?: string;
    driverId?: string;
    vehicleId?: string;
    driverName: string;
    fleetNumber: string;
    dueDate: string;
    balance: number;
    daysOverdue: number;
}

export interface UpcomingEntry {
    id: string;
    invoiceNumber: string;
    customerId?: string;
    customerName?: string;
    driverId?: string;
    vehicleId?: string;
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
    customerId?: string;
    customerName?: string;
    driverId: string;
    driverName: string;
    vehicleId?: string;
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

// Client-side In-Memory Cache (TTL: 90 seconds)
const clientListCache = new Map<string, { data: CollectionsListResponse; timestamp: number }>();
const clientOverviewCache = new Map<string, { data: CollectionsOverviewResponse; timestamp: number }>();
const CLIENT_CACHE_TTL = 90 * 1000;

export const clearClientCollectionsCache = () => {
    clientListCache.clear();
    clientOverviewCache.clear();
};

export const getCollectionsOverview = async (
    params: CollectionsQueryParams = {},
    bypassCache = false
): Promise<CollectionsOverviewResponse> => {
    const isBypass = bypassCache || (params as any).refresh === 'true' || (params as any).bypassCache === 'true';
    const cacheKey = JSON.stringify(params);

    if (!isBypass) {
        const cached = clientOverviewCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CLIENT_CACHE_TTL)) {
            return cached.data;
        }
    }

    const headers: Record<string, string> = { 'X-Skip-Toast': 'true' };
    if (isBypass) {
        headers['x-bypass-cache'] = 'true';
    }

    const response = await api.get('/api/collections/overview', { params, headers });
    const data = response.data.data;

    if (clientOverviewCache.size >= 50) {
        const first = clientOverviewCache.keys().next().value;
        if (first) clientOverviewCache.delete(first);
    }
    clientOverviewCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
};

export const getCollectionsList = async (
    params: CollectionsQueryParams = {},
    bypassCache = false
): Promise<CollectionsListResponse> => {
    const isBypass = bypassCache || (params as any).refresh === 'true' || (params as any).bypassCache === 'true';
    const cacheKey = JSON.stringify(params);

    if (!isBypass) {
        const cached = clientListCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CLIENT_CACHE_TTL)) {
            return cached.data;
        }
    }

    const headers: Record<string, string> = { 'X-Skip-Toast': 'true' };
    if (isBypass) {
        headers['x-bypass-cache'] = 'true';
    }

    const response = await api.get('/api/collections/list', { params, headers });
    const data = response.data.data;

    if (clientListCache.size >= 50) {
        const first = clientListCache.keys().next().value;
        if (first) clientListCache.delete(first);
    }
    clientListCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
};
