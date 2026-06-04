import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface DashboardState {
    executive: {
        financeTotals: any[];
        vehicleData: any[];
        driverData: any[];
        staffData: any[];
        branches: any[];
        rentTrendData: any[];
        poTrendData: any[];
        kpiData: {
            totalActiveVehicles: number;
            monthlyRevenue: number;
            outstandingCollections: number;
            activeDrivers: number;
            collectionCompliance: number;
            last12MonthRevenue: number;
            outstandingBalance: number;
            activeAlerts: number;
            alertsDetailed: {
                critical: any[];
                major: any[];
                minor: any[];
            };
            tasks: {
                overdue: number;
                upcoming: number;
                assigned: number;
            };
        };
        isLoaded: boolean;
        lastFetched: number | null;
    };
    finance: {
        liveData: {
            invoices: any[];
            bills: any[];
            expenses: any[];
            ledger: any[];
        };
        pendingPOs: any[];
        tasks: any[];
        isLoaded: boolean;
        lastFetched: number | null;
    };
    collections: {
        metrics: any | null;
        trend: any[];
        recentOverdue: any[];
        upcomingPayments: any[];
        branches: any[];
        listItems: any[];
        pagination: {
            page: number;
            total: number;
            pages: number;
        };
        isLoaded: boolean;
        lastFetched: number | null;
    };
    fleet: {
        drivers: any[];
        branches: any[];
        isLoaded: boolean;
        lastFetched: number | null;
    };
    customers: {
        list: any[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        } | null;
        isLoaded: boolean;
        lastFetched: number | null;
    };
}

const initialState: DashboardState = {
    executive: {
        financeTotals: [],
        vehicleData: [],
        driverData: [],
        staffData: [],
        branches: [],
        rentTrendData: [],
        poTrendData: [],
        kpiData: {
            totalActiveVehicles: 0,
            monthlyRevenue: 0,
            outstandingCollections: 0,
            activeDrivers: 0,
            collectionCompliance: 0,
            last12MonthRevenue: 0,
            outstandingBalance: 0,
            activeAlerts: 0,
            alertsDetailed: {
                critical: [],
                major: [],
                minor: []
            },
            tasks: {
                overdue: 0,
                upcoming: 0,
                assigned: 0
            }
        },
        isLoaded: false,
        lastFetched: null
    },
    finance: {
        liveData: {
            invoices: [],
            bills: [],
            expenses: [],
            ledger: []
        },
        pendingPOs: [],
        tasks: [],
        isLoaded: false,
        lastFetched: null
    },
    collections: {
        metrics: null,
        trend: [],
        recentOverdue: [],
        upcomingPayments: [],
        branches: [],
        listItems: [],
        pagination: {
            page: 1,
            total: 0,
            pages: 1
        },
        isLoaded: false,
        lastFetched: null
    },
    fleet: {
        drivers: [],
        branches: [],
        isLoaded: false,
        lastFetched: null
    },
    customers: {
        list: [],
        pagination: null,
        isLoaded: false,
        lastFetched: null
    }
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setExecutiveDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['executive'], 'isLoaded' | 'lastFetched'>>>) => {
            state.executive = {
                ...state.executive,
                ...action.payload,
                isLoaded: true,
                lastFetched: Date.now()
            };
        },
        setFinanceDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['finance'], 'isLoaded' | 'lastFetched'>>>) => {
            state.finance = {
                ...state.finance,
                ...action.payload,
                isLoaded: true,
                lastFetched: Date.now()
            };
        },
        setCollectionsDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['collections'], 'isLoaded' | 'lastFetched'>>>) => {
            state.collections = {
                ...state.collections,
                ...action.payload,
                isLoaded: true,
                lastFetched: Date.now()
            };
        },
        setFleetDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['fleet'], 'isLoaded' | 'lastFetched'>>>) => {
            state.fleet = {
                ...state.fleet,
                ...action.payload,
                isLoaded: true,
                lastFetched: Date.now()
            };
        },
        setCustomersData: (state, action: PayloadAction<{ list: any[]; pagination: any | null }>) => {
            state.customers = {
                list: action.payload.list,
                pagination: action.payload.pagination,
                isLoaded: true,
                lastFetched: Date.now()
            };
        },
        addCustomer: (state, action: PayloadAction<any>) => {
            state.customers.list = [action.payload, ...state.customers.list];
            if (state.customers.pagination) {
                state.customers.pagination.total += 1;
            }
        },
        clearDashboardCache: (state) => {
            state.executive.isLoaded = false;
            state.executive.lastFetched = null;
            state.finance.isLoaded = false;
            state.finance.lastFetched = null;
            state.collections.isLoaded = false;
            state.collections.lastFetched = null;
            state.fleet.isLoaded = false;
            state.fleet.lastFetched = null;
            state.customers.isLoaded = false;
            state.customers.lastFetched = null;
            state.customers.list = [];
            state.customers.pagination = null;
        }
    }
});

export const { 
    setExecutiveDashboardData, 
    setFinanceDashboardData, 
    setCollectionsDashboardData, 
    setFleetDashboardData,
    setCustomersData,
    addCustomer,
    clearDashboardCache 
} = dashboardSlice.actions;
export default dashboardSlice.reducer;
