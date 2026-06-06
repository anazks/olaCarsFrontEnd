import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format, startOfMonth } from 'date-fns';

// Store & Actions
import type { RootState } from '../store';
import {
    setExecutiveDashboardData,
    setFinanceDashboardData,
    setCollectionsDashboardData,
    setFleetDashboardData
} from '../store/dashboardSlice';

// Auth Helpers
import { getUser, getUserRole, getToken } from '../utils/auth';

// Services
import { getLedgerEntries } from '../services/ledgerService';
import { getAllDrivers } from '../services/driverService';
import { getAllVehicles } from '../services/vehicleService';
import { getAllPurchaseOrders } from '../services/purchaseOrderService';
import { getStaffPerformance } from '../services/staffPerformanceService';
import alertService from '../services/alertService';
import { getTasks } from '../services/taskService';
import { getInvoices } from '../services/invoiceService';
import { getAllBills } from '../services/billService';
import { getAllExpenses } from '../services/expenseService';
import { getAllBranches } from '../services/branchService';
import { getCollectionsOverview, getCollectionsList } from '../services/collectionService';

// Data Aggregation helper
import { aggregateExecutiveData } from '../utils/dashboardAggregator';

export const useDashboardPrefetcher = () => {
    const dispatch = useDispatch();
    const isPrefetching = useRef(false);

    // Read state caches
    const executiveState = useSelector((state: RootState) => state.dashboard.executive);
    const financeState = useSelector((state: RootState) => state.dashboard.finance);
    const collectionsState = useSelector((state: RootState) => state.dashboard.collections);
    const fleetState = useSelector((state: RootState) => state.dashboard.fleet);

    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const role = getUserRole();
        if (!role) return;

        const user = getUser();
        const userId = user?.id || user?._id;

        // Skip if prefetch is already running
        if (isPrefetching.current) return;
        isPrefetching.current = true;

        const prefetch = async () => {
            const now = Date.now();
            const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

            // Define individual prefetch tasks
            const tasks: Promise<any>[] = [];

            // 1. Executive Control Center
            const execCacheAge = now - (executiveState.lastFetched || 0);
            const shouldPrefetchExec = role === 'admin' && (!executiveState.isLoaded || execCacheAge > CACHE_TIMEOUT);
            if (shouldPrefetchExec) {
                tasks.push((async () => {
                    try {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const oneMonthAgoDate = new Date();
                        oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
                        const oneMonthAgoStr = oneMonthAgoDate.toISOString().split('T')[0];

                        const startD = new Date(oneMonthAgoStr);
                        const endD = new Date(todayStr);
                        endD.setHours(23, 59, 59, 999);
                        startD.setHours(0, 0, 0, 0);

                        const twelveMonthsAgo = new Date();
                        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                        twelveMonthsAgo.setHours(0, 0, 0, 0);

                        const fetchStartDate = (startD < twelveMonthsAgo) ? startD : twelveMonthsAgo;

                        const baseFilters: any = {};
                        baseFilters.sortOrder = 'desc';
                        baseFilters.sortBy = 'createdAt';
                        baseFilters.startDate = fetchStartDate.toISOString().split('T')[0];

                        let fetchedBranches: any[] = [];
                        try {
                            const brRes = await getAllBranches({ limit: 100 });
                            if (brRes.data) fetchedBranches = brRes.data;
                        } catch (e) {
                            console.error("Prefetcher: Failed to load branches", e);
                        }

                        const [ledgerRes, driverRes, vehicleRes, poRes, staffRes, alertRes, taskRes] = await Promise.allSettled([
                            getLedgerEntries({ limit: 10000, ...baseFilters }),
                            getAllDrivers({ limit: 1000, ...baseFilters }),
                            getAllVehicles({ limit: 1000, ...baseFilters }),
                            getAllPurchaseOrders({ limit: 500, ...baseFilters }),
                            getStaffPerformance({ type: 'all', ...baseFilters }),
                            alertService.getActiveAlerts(),
                            getTasks({ limit: 1000, ...baseFilters })
                        ]);

                        const aggregated = aggregateExecutiveData(
                            ledgerRes,
                            driverRes,
                            vehicleRes,
                            poRes,
                            staffRes,
                            alertRes,
                            taskRes,
                            startD,
                            endD,
                            executiveState.kpiData
                        );

                        dispatch(setExecutiveDashboardData({
                            ...aggregated,
                            branches: fetchedBranches
                        }));
                    } catch (err) {
                        console.error('Prefetcher: Executive Dashboard prefetch failed', err);
                    }
                })());
            }

            // 2. Finance Dashboard
            const finCacheAge = now - (financeState.lastFetched || 0);
            const allowedFinRoles = ['admin', 'financialadmin', 'financeadmin', 'financestaff', 'countrymanager', 'branchmanager'];
            const shouldPrefetchFin = allowedFinRoles.includes(role) && (!financeState.isLoaded || finCacheAge > CACHE_TIMEOUT);
            if (shouldPrefetchFin) {
                tasks.push((async () => {
                    try {
                        const [ledgerRes, taskRes, invoiceRes, billRes, expenseRes, poRes] = await Promise.all([
                            getLedgerEntries().catch(() => ({ data: [] })),
                            getTasks({ assignedTo: userId }).catch(() => []),
                            getInvoices({ limit: 1000 }).catch(() => ({ data: [] })),
                            getAllBills({ limit: 1000 }).catch(() => ({ data: [] })),
                            getAllExpenses({ limit: 1000 }).catch(() => ({ data: [] })),
                            getAllPurchaseOrders({ status: 'PENDING_FINANCE_APPROVAL', limit: 1000 }).catch((err) => {
                                console.error("Prefetcher: Fetch POs failed:", err);
                                return { data: [] };
                            })
                        ]);

                        const resolvedLedger = Array.isArray(ledgerRes) ? ledgerRes : (ledgerRes && 'data' in ledgerRes && Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
                        const resolvedTasks = Array.isArray(taskRes) ? taskRes : (taskRes && 'data' in taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
                        const resolvedInvoices = (invoiceRes && Array.isArray(invoiceRes.data)) ? invoiceRes.data : [];

                        let resolvedBills: any[] = [];
                        if (billRes && 'data' in billRes && Array.isArray(billRes.data)) {
                            resolvedBills = billRes.data;
                        } else if (Array.isArray(billRes)) {
                            resolvedBills = billRes;
                        }

                        let resolvedExpenses: any[] = [];
                        if (expenseRes && 'data' in expenseRes && Array.isArray(expenseRes.data)) {
                            resolvedExpenses = expenseRes.data;
                        } else if (Array.isArray(expenseRes)) {
                            resolvedExpenses = expenseRes;
                        }

                        let resolvedPOs: any[] = [];
                        if (poRes && 'data' in poRes && Array.isArray(poRes.data)) {
                            resolvedPOs = poRes.data;
                        } else if (Array.isArray(poRes)) {
                            resolvedPOs = poRes;
                        }

                        dispatch(setFinanceDashboardData({
                            liveData: {
                                invoices: resolvedInvoices,
                                bills: resolvedBills,
                                expenses: resolvedExpenses,
                                ledger: resolvedLedger
                            },
                            pendingPOs: resolvedPOs,
                            tasks: resolvedTasks.slice(0, 5)
                        }));
                    } catch (err) {
                        console.error('Prefetcher: Finance Dashboard prefetch failed', err);
                    }
                })());
            }

            // 3. Collections Dashboard
            const collCacheAge = now - (collectionsState.lastFetched || 0);
            const allowedCollRoles = ['admin', 'financialadmin', 'financeadmin', 'financestaff', 'countrymanager', 'branchmanager', 'operationadmin', 'operationstaff', 'branchopstaff'];
            const shouldPrefetchColl = allowedCollRoles.includes(role) && (!collectionsState.isLoaded || collCacheAge > CACHE_TIMEOUT);
            if (shouldPrefetchColl) {
                tasks.push((async () => {
                    try {
                        const defaultFilters = {
                            country: '',
                            branch: '',
                            startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                            endDate: format(new Date(), 'yyyy-MM-dd')
                        };

                        const listPayload = {
                            ...defaultFilters,
                            search: '',
                            status: '',
                            page: 1,
                            limit: 10
                        };

                        const [branchesRes, overviewRes, listRes] = await Promise.all([
                            getAllBranches({ limit: 1000 }).catch(() => ({ data: [] })),
                            getCollectionsOverview(defaultFilters).catch(() => ({ metrics: null, trend: [], recentOverdue: [], upcomingPayments: [] })),
                            getCollectionsList(listPayload).catch(() => ({ items: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 } }))
                        ]);

                        dispatch(setCollectionsDashboardData({
                            metrics: overviewRes.metrics,
                            trend: overviewRes.trend,
                            recentOverdue: overviewRes.recentOverdue,
                            upcomingPayments: overviewRes.upcomingPayments,
                            branches: branchesRes.data || [],
                            listItems: listRes.items || [],
                            pagination: {
                                page: listRes.pagination.page,
                                total: listRes.pagination.total,
                                pages: listRes.pagination.pages
                            }
                        }));
                    } catch (err) {
                        console.error('Prefetcher: Collections Dashboard prefetch failed', err);
                    }
                })());
            }

            // 4. Fleet Dashboard (Driver Performance)
            const fleetCacheAge = now - (fleetState.lastFetched || 0);
            const allowedFleetRoles = ['admin', 'financialadmin', 'financeadmin', 'operationadmin', 'operationstaff', 'countrymanager', 'branchmanager', 'financestaff'];
            const shouldPrefetchFleet = allowedFleetRoles.includes(role) && (!fleetState.isLoaded || fleetCacheAge > CACHE_TIMEOUT);
            if (shouldPrefetchFleet) {
                tasks.push((async () => {
                    try {
                        const isBranchScoped = ['branchmanager', 'financestaff', 'operationstaff'].includes(role);
                        const filters: any = { status: 'ACTIVE', limit: 500 };
                        if (isBranchScoped && user?.branch) {
                            filters.branch = typeof user.branch === 'object' ? user.branch._id : user.branch;
                        }

                        const [branchesRes, driversRes] = await Promise.all([
                            getAllBranches({ limit: 100 }).catch(() => ({ data: [] })),
                            getAllDrivers(filters).catch(() => ({ data: [] }))
                        ]);

                        dispatch(setFleetDashboardData({
                            drivers: driversRes.data || [],
                            branches: branchesRes.data || []
                        }));
                    } catch (err) {
                        console.error('Prefetcher: Fleet Dashboard prefetch failed', err);
                    }
                })());
            }

            if (tasks.length > 0) {
                await Promise.allSettled(tasks);
            }
            isPrefetching.current = false;
        };

        prefetch();
    }, [dispatch, executiveState, financeState, collectionsState, fleetState]);
};
