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
        isLoaded: false
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
        isLoaded: false
    }
};

const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        setExecutiveDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['executive'], 'isLoaded'>>>) => {
            state.executive = {
                ...state.executive,
                ...action.payload,
                isLoaded: true
            };
        },
        setFinanceDashboardData: (state, action: PayloadAction<Partial<Omit<DashboardState['finance'], 'isLoaded'>>>) => {
            state.finance = {
                ...state.finance,
                ...action.payload,
                isLoaded: true
            };
        },
        clearDashboardCache: (state) => {
            state.executive.isLoaded = false;
            state.finance.isLoaded = false;
        }
    }
});

export const { setExecutiveDashboardData, setFinanceDashboardData, clearDashboardCache } = dashboardSlice.actions;
export default dashboardSlice.reducer;
