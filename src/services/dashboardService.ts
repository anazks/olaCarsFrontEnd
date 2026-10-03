import api from './api';

export interface DashboardFilters {
    country?: string;
    branch?: string;
    startDate?: string;
    endDate?: string;
    onlyKpi?: boolean;
    refresh?: boolean;
}

// Tier 1 In-Memory Client Cache (90s TTL)
const clientDashboardCache = new Map<string, { data: any; expiry: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CLIENT_CACHE_TTL_MS = 90 * 1000;

export const clearClientDashboardCache = () => {
    clientDashboardCache.clear();
    inFlightRequests.clear();
};

export const getFinancialDashboardSummary = async (params: DashboardFilters = {}) => {
    const isRefresh = params.refresh === true;
    const baseKey = `${params.country || 'all'}:${params.branch || 'all'}:${params.startDate || 'all'}:${params.endDate || 'all'}`;
    const cacheKey = `${baseKey}:${params.onlyKpi ? 'kpi' : 'full'}`;
    const fullKey = `${baseKey}:full`;
    const now = Date.now();

    if (!isRefresh) {
        // If onlyKpi requested, check if full summary is already in client cache
        if (params.onlyKpi && clientDashboardCache.has(fullKey)) {
            const cachedFull = clientDashboardCache.get(fullKey)!;
            if (now < cachedFull.expiry) {
                return {
                    stats: {
                        monthlyRevenue: cachedFull.data.stats?.monthlyRevenue || 0,
                        totalPayables: cachedFull.data.stats?.totalPayables || 0,
                        lastMonthBalanceDue: cachedFull.data.stats?.lastMonthBalanceDue || 0
                    }
                };
            }
        }

        // Check exact match in client cache
        if (clientDashboardCache.has(cacheKey)) {
            const cached = clientDashboardCache.get(cacheKey)!;
            if (now < cached.expiry) {
                return cached.data;
            }
        }

        // Deduplicate in-flight concurrent requests for the exact same key
        if (inFlightRequests.has(cacheKey)) {
            return inFlightRequests.get(cacheKey);
        }
    }

    const { refresh, ...apiParams } = params;
    const headers: Record<string, string> = {};
    if (isRefresh) {
        headers['x-bypass-cache'] = 'true';
    }

    const requestPromise = (async () => {
        try {
            const response = await api.get('/api/dashboard/financial-summary', {
                params: isRefresh ? { ...apiParams, refresh: 'true' } : apiParams,
                headers
            });
            const data = response.data.data;

            clientDashboardCache.set(cacheKey, { data, expiry: Date.now() + CLIENT_CACHE_TTL_MS });

            // If full summary returned, seed the KPI client cache as well
            if (!params.onlyKpi && data?.stats) {
                const kpiKey = `${baseKey}:kpi`;
                clientDashboardCache.set(kpiKey, {
                    data: {
                        stats: {
                            monthlyRevenue: data.stats.monthlyRevenue || 0,
                            totalPayables: data.stats.totalPayables || 0,
                            lastMonthBalanceDue: data.stats.lastMonthBalanceDue || 0
                        }
                    },
                    expiry: Date.now() + CLIENT_CACHE_TTL_MS
                });
            }

            return data;
        } finally {
            inFlightRequests.delete(cacheKey);
        }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

export const getVehicleMovementData = async (params: DashboardFilters = {}) => {
    const response = await api.get('/api/dashboard/vehicle-movement', { params });
    return response.data.data;
};
