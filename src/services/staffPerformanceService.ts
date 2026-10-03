import api from './api';

export interface RecentActivity {
    driverId?: string;
    driverName?: string;
    vehicleId?: string;
    vehicleName?: string;
    status: string;
    timestamp: string;
    notes?: string;
}

export interface Metrics {
    totalDriversOnboarded?: number;
    totalVehiclesOnboarded?: number;
    totalDriversTouched?: number;
    totalVehiclesTouched?: number;
    totalStageActions: number;
    actionsThisWeek: number;
    actionsThisMonth: number;
    avgTimePerStageHours: number;
    stageBreakdown: Record<string, number>;
}

export interface StaffPerformanceData {
    staffId: string;
    fullName: string;
    email: string;
    phone: string;
    branchId: string;
    branchName: string;
    status: string;
    lastLoginAt: string;
    createdAt: string;
    metrics: Metrics;
    recentActivity: RecentActivity[];
    targetStats?: TargetStats;
}

export interface BranchManagerMetrics {
    totalBranchDrivers: number;
    activeBranchDrivers: number;
    totalBranchVehicles: number;
    activeBranchVehicles: number;
}

export interface TargetStats {
    [category: string]: {
        target: number;
        actual: number;
        percent: number;
    };
}

export interface BranchManagerPerformanceData {
    staffId: string;
    fullName: string;
    email: string;
    phone: string;
    branchId: string;
    branchName: string;
    status: string;
    lastLoginAt: string;
    createdAt: string;
    metrics: BranchManagerMetrics;
    recentActivity: RecentActivity[];
    targetStats?: TargetStats;
}

export interface CountryManagerMetrics {
    totalCountryBranches: number;
    totalCountryDrivers: number;
    activeCountryDrivers: number;
    totalCountryVehicles: number;
    activeCountryVehicles: number;
}

export interface CountryManagerPerformanceData {
    staffId: string;
    fullName: string;
    email: string;
    phone: string;
    country: string;
    status: string;
    lastLoginAt: string;
    createdAt: string;
    metrics: CountryManagerMetrics;
    recentActivity: RecentActivity[];
    targetStats?: TargetStats;
}

export interface GlobalAdminMetrics {
    totalGlobalBranches: number;
    totalGlobalDrivers: number;
    activeGlobalDrivers: number;
    totalGlobalVehicles: number;
    activeGlobalVehicles: number;
}

export interface GlobalAdminPerformanceData {
    staffId: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'finance-admin' | 'operation-admin';
    status: string;
    lastLoginAt: string;
    createdAt: string;
    metrics: GlobalAdminMetrics;
    recentActivity: RecentActivity[];
}

export interface TargetComparison {
    category: 'DRIVER_ACQUISITION' | 'RENTAL' | 'VEHICLE_ACQUISITION';
    targetValue: number;
    actualValue: number;
    period: string;
    startDate: string;
    endDate: string;
}

export interface StaffPerformanceResponse {
    success: boolean;
    data: {
        financeStaff: StaffPerformanceData[];
        operationStaff: StaffPerformanceData[];
        branchManagers?: BranchManagerPerformanceData[];
        countryManagers?: CountryManagerPerformanceData[];
        globalAdmins?: GlobalAdminPerformanceData[];
        targetComparison?: TargetComparison[];
    };
}

export interface PerformanceFilters {
    branch?: string;
    country?: string;
    type?: 'all' | 'finance' | 'operation' | 'branch-manager' | 'country-manager' | 'finance-admin' | 'operation-admin';
    startDate?: string;
    endDate?: string;
}

// Client-side In-Memory Cache (TTL: 90 seconds)
const clientPerfCache = new Map<string, { data: StaffPerformanceResponse; timestamp: number }>();
const clientIndividualPerfCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_TTL = 90 * 1000;

export const clearClientStaffPerformanceCache = () => {
    clientPerfCache.clear();
    clientIndividualPerfCache.clear();
};

export const getStaffPerformance = async (
    filters: PerformanceFilters = {},
    bypassCache = false
): Promise<StaffPerformanceResponse> => {
    const isBypass = bypassCache || (filters as any).refresh === 'true' || (filters as any).bypassCache === 'true';
    const cacheKey = JSON.stringify(filters);

    if (!isBypass) {
        const cached = clientPerfCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CLIENT_CACHE_TTL)) {
            return cached.data;
        }
    }

    const headers: Record<string, string> = {};
    if (isBypass) {
        headers['x-bypass-cache'] = 'true';
    }

    const response = await api.get('/api/staff-performance', { params: filters, headers });
    const data = response.data;

    if (clientPerfCache.size >= 50) {
        const first = clientPerfCache.keys().next().value;
        if (first) clientPerfCache.delete(first);
    }
    clientPerfCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
};

export const getIndividualStaffPerformance = async (
    id: string,
    startDate?: string,
    endDate?: string,
    bypassCache = false
) => {
    const cacheKey = `${id}:${startDate || ''}:${endDate || ''}`;
    if (!bypassCache) {
        const cached = clientIndividualPerfCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CLIENT_CACHE_TTL)) {
            return cached.data;
        }
    }

    const headers: Record<string, string> = {};
    if (bypassCache) {
        headers['x-bypass-cache'] = 'true';
    }

    const response = await api.get(`/api/staff-performance/${id}/details`, {
        params: { startDate, endDate },
        headers
    });
    const data = response.data;

    if (clientIndividualPerfCache.size >= 50) {
        const first = clientIndividualPerfCache.keys().next().value;
        if (first) clientIndividualPerfCache.delete(first);
    }
    clientIndividualPerfCache.set(cacheKey, { data, timestamp: Date.now() });

    return data;
};
