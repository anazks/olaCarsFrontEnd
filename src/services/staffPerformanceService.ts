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
}

export const getStaffPerformance = async (filters: PerformanceFilters = {}): Promise<StaffPerformanceResponse> => {
    const response = await api.get('/api/staff-performance', { params: filters });
    return response.data;
};
