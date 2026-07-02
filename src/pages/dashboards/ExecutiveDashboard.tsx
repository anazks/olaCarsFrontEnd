import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setExecutiveDashboardData } from '../../store/dashboardSlice';
import { aggregateExecutiveData } from '../../utils/dashboardAggregator';
import {
    ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    LineChart, Line, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
    Car, Users, DollarSign, RefreshCw, Activity, ShoppingCart,
    AlertTriangle, CreditCard, AlertCircle,
    BarChart3, ArrowUpRight, ArrowDownRight, Clock, FileText, ClipboardList, Briefcase
} from 'lucide-react';
import { getAllDrivers } from '../../services/driverService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllPurchaseOrders } from '../../services/purchaseOrderService';
import { getStaffPerformance } from '../../services/staffPerformanceService';
import { getAllBranches } from '../../services/branchService';
import alertService from '../../services/alertService';
import { getTasks } from '../../services/taskService';
import { getInvoicesRegistry } from '../../services/invoiceService';

const COLORS = {
    green: '#22c55e', blue: '#3b82f6', red: '#ef4444',
    yellow: '#eab308', teal: '#14b8a6', purple: '#8b5cf6',
    orange: '#f97316', indigo: '#6366f1', pink: '#ec4899'
};

const ExecutiveDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const executiveState = useSelector((state: RootState) => state.dashboard.executive);

    const [kpiLoading, setKpiLoading] = useState(!executiveState.isLoaded);
    const [restLoading, setRestLoading] = useState(!executiveState.isLoaded);
    const [branches, setBranches] = useState<any[]>(executiveState.branches);
    const isFirstMount = useRef(true);

    const financeTotals = executiveState.financeTotals;
    const vehicleData = executiveState.vehicleData;
    const driverData = executiveState.driverData;
    const staffData = executiveState.staffData;
    const rentTrendData = executiveState.rentTrendData;
    const poTrendData = executiveState.poTrendData;
    const kpiData = executiveState.kpiData;

    const todayStr = new Date().toISOString().split('T')[0];
    const oneMonthAgoDate = new Date();
    oneMonthAgoDate.setDate(oneMonthAgoDate.getDate() - 30); // Exactly 30 days ago
    const oneMonthAgoStr = oneMonthAgoDate.toISOString().split('T')[0];

    // Global Filters (Applied)
    const [globalBranch, setGlobalBranch] = useState<string>('all');
    const [globalSort] = useState<'asc' | 'desc'>('desc');
    const [globalStartDate, setGlobalStartDate] = useState<string>(oneMonthAgoStr);
    const [globalEndDate, setGlobalEndDate] = useState<string>(todayStr);

    // Form Temporary States
    const [tempBranch, setTempBranch] = useState<string>('all');
    const [tempStartDate, setTempStartDate] = useState<string>(oneMonthAgoStr);
    const [tempEndDate, setTempEndDate] = useState<string>(todayStr);

    const handleApplyFilters = () => {
        setGlobalBranch(tempBranch);
        setGlobalStartDate(tempStartDate);
        setGlobalEndDate(tempEndDate);
    };

    const getDynamicRevenueLabel = () => {
        if (!globalStartDate || !globalEndDate) return "Last 12 Months Revenue";
        const start = new Date(globalStartDate);
        const end = new Date(globalEndDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const months = Math.max(1, Math.round(diffDays / 30));
        return `Last ${months} ${months === 1 ? 'Month' : 'Months'} Revenue`;
    };

    const fetchData = async (showLoadingSpinner = true) => {
        if (showLoadingSpinner) {
            setKpiLoading(true);
            setRestLoading(true);
        }
        try {
            let fetchedBranches = branches;
            if (branches.length === 0) {
                try {
                    const brRes = await getAllBranches({ limit: 100 });
                    if (brRes.data) {
                        fetchedBranches = brRes.data;
                        setBranches(brRes.data);
                    }
                } catch (e) {
                    console.error("Failed to load branches", e);
                }
            }

            const startD = globalStartDate ? new Date(globalStartDate + 'T00:00:00.000Z') : new Date(0);
            const endD = globalEndDate ? new Date(globalEndDate + 'T23:59:59.999Z') : new Date();

            const baseFilters: any = {};
            if (globalBranch !== 'all') baseFilters.branch = globalBranch;
            baseFilters.sortOrder = globalSort;
            baseFilters.sortBy = 'createdAt';
            baseFilters.startDate = globalStartDate;
            baseFilters.endDate = globalEndDate;

            const ledgerRes: PromiseSettledResult<any> = { status: 'fulfilled', value: { data: [] } };

            // Stage 1: Load KPI-related data first (Drivers, Vehicles, Alerts, Invoices)
            const [driverRes, vehicleRes, alertRes, invoiceRes] = await Promise.allSettled([
                getAllDrivers({ limit: 1000, status: 'ACTIVE', branch: baseFilters.branch }),
                getAllVehicles({ limit: 1000, branch: baseFilters.branch }),
                alertService.getActiveAlerts(),
                getInvoicesRegistry({
                    limit: 10000,
                    branch: baseFilters.branch,
                    startDate: baseFilters.startDate,
                    endDate: baseFilters.endDate
                })
            ]);

            const mockRejected = (): PromiseSettledResult<any> => ({
                status: 'rejected',
                reason: new Error('Not loaded yet')
            });

            // Perform initial partial aggregation for KPIs
            const partialAggregated = aggregateExecutiveData(
                ledgerRes,
                driverRes,
                vehicleRes,
                mockRejected(), // poRes
                mockRejected(), // staffRes
                alertRes,
                mockRejected(), // taskRes
                invoiceRes,
                startD,
                endD,
                executiveState.kpiData
            );

            dispatch(setExecutiveDashboardData({
                ...partialAggregated,
                branches: fetchedBranches
            }));
            setKpiLoading(false);

            // Stage 2: Load the remaining analytical/telemetry data (POs, Staff, Tasks)
            const [poRes, staffRes, taskRes] = await Promise.allSettled([
                getAllPurchaseOrders({
                    limit: 500,
                    branch: baseFilters.branch,
                    startDate: baseFilters.startDate,
                    endDate: baseFilters.endDate,
                    sortOrder: globalSort,
                    sortBy: 'createdAt'
                }),
                getStaffPerformance({ type: 'all', ...baseFilters }),
                getTasks({ limit: 1000, ...baseFilters })
            ]);

            // Perform complete aggregation with all data sources
            const fullAggregated = aggregateExecutiveData(
                ledgerRes,
                driverRes,
                vehicleRes,
                poRes,
                staffRes,
                alertRes,
                taskRes,
                invoiceRes,
                startD,
                endD,
                partialAggregated.kpiData
            );

            dispatch(setExecutiveDashboardData({
                ...fullAggregated,
                branches: fetchedBranches
            }));

        } catch (e) {
            console.error('Failed fetching data', e);
        } finally {
            setKpiLoading(false);
            setRestLoading(false);
        }
    };

    // Keep end date valid relative to start date
    useEffect(() => {
        if (tempStartDate && tempEndDate && tempEndDate < tempStartDate) {
            setTempEndDate(tempStartDate);
        }
    }, [tempStartDate, tempEndDate]);

    useEffect(() => {
        const cacheAge = Date.now() - (executiveState.lastFetched || 0);
        const isCacheFresh = executiveState.isLoaded && cacheAge < 5 * 60 * 1000; // 5 minutes fresh
        console.log('[DEBUG] ExecutiveDashboard useEffect triggered:', {
            isFirstMount: isFirstMount.current,
            isLoaded: executiveState.isLoaded,
            lastFetched: executiveState.lastFetched,
            cacheAge,
            isCacheFresh,
            globalStartDate,
            globalEndDate,
            globalBranch
        });
        
        // If it's initial mount and cache is fresh, completely skip API fetch
        if (isFirstMount.current && isCacheFresh) {
            console.log('[DEBUG] Skipping fetch (cache is fresh and it is first mount)');
            isFirstMount.current = false;
            return;
        }

        const shouldShowLoader = true;
        console.log('[DEBUG] Calling fetchData, shouldShowLoader:', shouldShowLoader);
        fetchData(shouldShowLoader);
        isFirstMount.current = false;
    }, [globalStartDate, globalEndDate, globalBranch]);

    // ─── Render Components ──────────────────────────────────────────

    if (kpiLoading && !executiveState.isLoaded) {
        return <ExecutiveDashboardSkeleton />;
    }

    return (
        <div className="container-responsive relative min-h-[600px] space-y-6 transition-all duration-300">

            {/* Simple Loading Circle Overlay */}
            {(kpiLoading || restLoading) && (
                <div className="absolute inset-0 bg-black/10 z-50 flex items-center justify-center rounded-3xl pointer-events-none">
                    <div className="bg-neutral-950/95 border border-white/5 rounded-full p-4 flex items-center justify-center shadow-2xl pointer-events-auto animate-in fade-in duration-200">
                        <RefreshCw className="animate-spin text-[#D4F12E]" size={28} />
                    </div>
                </div>
            )}

            {/* Header & Master Filters */}
            <div className="flex flex-row justify-between items-center gap-2 lg:gap-6 border-b pb-4 lg:pb-6 w-full" style={{ borderColor: 'var(--border-main)' }}>
                <div className="min-w-0 flex-1 mr-2">
                    <h1 className="flex items-center gap-2 lg:gap-3 text-lg lg:text-2xl font-black uppercase tracking-tighter min-w-0" style={{ color: 'var(--text-main)' }}>
                        <div className="w-7 h-7 lg:w-9 lg:h-9 bg-white rounded-full flex items-center justify-center border-2 border-[#D4F12E] overflow-hidden flex-shrink-0">
                            <div className="bg-black w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] rounded-full flex items-center justify-center">
                                <div className="bg-[#D4F12E] w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full"></div>
                            </div>
                        </div>
                        <span className="hidden sm:inline truncate">Executive Control Center</span>
                        <span className="sm:hidden truncate">Executive</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 lg:mt-1">
                        <p className="text-[10px] lg:text-xs font-medium truncate" style={{ color: 'var(--text-dim)' }}>
                            Real-time master aggregation across all operating domains
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] lg:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Clock size={10} /> Scope: {globalStartDate} to {globalEndDate}
                        </div>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-1.5 lg:gap-3 flex-shrink-0">
                    {/* Branch Filter */}
                    {branches.length > 0 && (
                        <select
                            value={tempBranch}
                            onChange={(e) => setTempBranch(e.target.value)}
                            className="px-2 py-1.5 lg:px-4 lg:py-2 border rounded-xl text-xs lg:text-sm outline-none transition-all cursor-pointer font-bold w-[70px] lg:w-[120px] truncate"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="all">All</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Date Filters */}
                    <div className="flex items-center gap-1 lg:gap-2">
                        <input
                            type="date"
                            value={tempStartDate}
                            max={tempEndDate || todayStr}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && val <= todayStr && (!tempEndDate || val <= tempEndDate)) {
                                    setTempStartDate(val);
                                } else if (!val) {
                                    setTempStartDate('');
                                }
                            }}
                            className="px-2 py-1.5 lg:px-4 lg:py-2 border rounded-xl text-xs lg:text-sm outline-none transition-all font-bold w-[100px] lg:w-auto"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest opacity-40">to</span>
                        <input
                            type="date"
                            value={tempEndDate}
                            min={tempStartDate}
                            max={todayStr}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && val <= todayStr) {
                                    if (tempStartDate && val < tempStartDate) {
                                        setTempEndDate(tempStartDate);
                                    } else {
                                        setTempEndDate(val);
                                    }
                                } else if (!val) {
                                    setTempEndDate('');
                                }
                            }}
                            className="px-2 py-1.5 lg:px-4 lg:py-2 border rounded-xl text-xs lg:text-sm outline-none transition-all font-bold w-[100px] lg:w-auto"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <button
                        onClick={handleApplyFilters}
                        disabled={kpiLoading || restLoading}
                        className="flex items-center gap-1.5 lg:gap-2 px-3 py-2 bg-[#D4F12E] hover:bg-lime-400 text-black rounded-xl text-xs lg:text-sm font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-lime/10"
                    >
                        <RefreshCw size={14} className={kpiLoading || restLoading ? 'animate-spin' : ''} />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            {/* Custom KPI Layout */}
                    <div className="flex flex-col gap-6 mb-6">
                        {/* Top Row: Left KPIs (2x2) and Right Alerts */}
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Left KPIs - 2x2 Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:w-[55%]">
                                {/* Total Active Vehicles */}
                                <div className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] text-[#22c55e] flex items-center justify-center">
                                                <Car size={20} />
                                            </div>
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                                {kpiLoading ? (
                                                    <span className="inline-block h-8 w-16 bg-white/10 rounded animate-pulse" />
                                                ) : (
                                                    kpiData.totalActiveVehicles.toLocaleString()
                                                )}
                                            </span>
                                        </div>
                                        <div className="bg-[#f0fdf4] text-[#22c55e] px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                            <ArrowUpRight size={14} /> 4.6%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium mt-3" style={{ color: 'var(--text-dim)' }}>Total Active Vehicles</span>
                                </div>

                                {/* Monthly Revenue */}
                                <div className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#f0fdf4] text-[#22c55e] flex items-center justify-center">
                                                <DollarSign size={20} />
                                            </div>
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                                {kpiLoading ? (
                                                    <span className="inline-block h-8 w-24 bg-white/10 rounded animate-pulse" />
                                                ) : kpiData.monthlyRevenue > 9999
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(kpiData.monthlyRevenue)
                                                    : `$${kpiData.monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                            </span>
                                        </div>
                                        <div className="bg-[#f0fdf4] text-[#22c55e] px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                            <ArrowUpRight size={14} /> 12.3%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium mt-3" style={{ color: 'var(--text-dim)' }}>Period Revenue</span>
                                </div>

                                {/* Outstanding Collections */}
                                <div className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#fff7ed] text-[#ea580c] flex items-center justify-center">
                                                <BarChart3 size={20} />
                                            </div>
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                                {kpiLoading ? (
                                                    <span className="inline-block h-8 w-24 bg-white/10 rounded animate-pulse" />
                                                ) : (
                                                    `$${kpiData.outstandingCollections.toLocaleString()}`
                                                )}
                                            </span>
                                        </div>
                                        <div className="bg-[#fef2f2] text-[#ef4444] px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                            <ArrowDownRight size={14} /> 3.8%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium mt-3" style={{ color: 'var(--text-dim)' }}>Outstanding Collections</span>
                                </div>

                                {/* Active Drivers */}
                                <div className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                                                <Users size={20} />
                                            </div>
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                                {kpiLoading ? (
                                                    <span className="inline-block h-8 w-16 bg-white/10 rounded animate-pulse" />
                                                ) : (
                                                    kpiData.activeDrivers.toLocaleString()
                                                )}
                                            </span>
                                        </div>
                                        <div className="bg-[#f0fdf4] text-[#22c55e] px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                            <ArrowUpRight size={14} /> 2.1%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium mt-3" style={{ color: 'var(--text-dim)' }}>Active Drivers</span>
                                </div>
                            </div>

                            {/* Right Alerts Section */}
                            <div className="rounded-2xl p-5 shadow-sm border lg:w-[45%] flex flex-col" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Alerts</h3>
                                    <button
                                        onClick={() => navigate('/admin/admin/alerts')}
                                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 cursor-pointer"
                                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-dim)', border: '1px solid var(--border-main)' }}
                                    >
                                        View All →
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                                    {/* Critical */}
                                    <div
                                        className="bg-[#ef4444] rounded-xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-all"
                                        onClick={() => navigate('/admin/admin/alerts')}
                                    >
                                        <div className="bg-white text-[#ef4444] p-1.5 rounded-md mb-3"><AlertTriangle size={16} /></div>
                                        <span className="text-3xl font-bold mb-1">
                                            {kpiLoading ? (
                                                <span className="inline-block h-8 w-8 bg-white/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.alertsDetailed.critical.length
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold opacity-90">Critical</span>
                                    </div>
                                    {/* Major */}
                                    <div
                                        className="bg-[#f97316] rounded-xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-all"
                                        onClick={() => navigate('/admin/admin/alerts')}
                                    >
                                        <div className="bg-white text-[#f97316] p-1.5 rounded-md mb-3"><AlertCircle size={16} /></div>
                                        <span className="text-3xl font-bold mb-1">
                                            {kpiLoading ? (
                                                <span className="inline-block h-8 w-8 bg-white/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.alertsDetailed.major.length
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold opacity-90">Major</span>
                                    </div>
                                    {/* Minor */}
                                    <div
                                        className="bg-[#4f46e5] rounded-xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-all"
                                        onClick={() => navigate('/admin/admin/alerts')}
                                    >
                                        <div className="bg-white text-[#4f46e5] p-1.5 rounded-md mb-3"><Clock size={16} /></div>
                                        <span className="text-3xl font-bold mb-1">
                                            {kpiLoading ? (
                                                <span className="inline-block h-8 w-8 bg-white/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.alertsDetailed.minor.length
                                            )}
                                        </span>
                                        <span className="text-xs font-semibold opacity-90">Minor</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row */}
                        <div className="rounded-2xl p-5 shadow-sm border flex flex-col xl:flex-row items-center justify-between gap-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                            <div className="flex items-center gap-4 w-full xl:w-auto xl:pr-6 xl:border-r border-opacity-50" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#f0fdf4] text-[#22c55e] flex items-center justify-center">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                            {kpiLoading ? (
                                                <span className="inline-block h-8 w-16 bg-white/10 rounded animate-pulse" />
                                            ) : (
                                                `${kpiData.collectionCompliance.toFixed(0)}%`
                                            )}
                                        </span>
                                        <div className="bg-[#f0fdf4] text-[#22c55e] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                                            <ArrowUpRight size={10} /> +2%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium block" style={{ color: 'var(--text-dim)' }}>Collection Compliance</span>
                                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>+2% week over week</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full xl:w-auto xl:pr-6 xl:border-r border-opacity-50" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                        {kpiLoading ? (
                                            <span className="inline-block h-8 w-28 bg-white/10 rounded animate-pulse" />
                                        ) : (
                                            `$${kpiData.last12MonthRevenue.toLocaleString()}`
                                        )}
                                    </span>
                                    <span className="text-sm font-medium block mt-1" style={{ color: 'var(--text-dim)' }}>{getDynamicRevenueLabel()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full xl:w-auto xl:pr-6 xl:border-r border-opacity-50" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>
                                            {kpiLoading ? (
                                                <span className="inline-block h-8 w-28 bg-white/10 rounded animate-pulse" />
                                            ) : (
                                                `$${kpiData.outstandingBalance.toLocaleString()}`
                                            )}
                                        </span>
                                        <div className="bg-[#f0fdf4] text-[#22c55e] px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                                            <ArrowUpRight size={10} /> +11%
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium block" style={{ color: 'var(--text-dim)' }}>Outstanding Balance</span>
                                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>+11% vs previous period</span>
                                </div>
                            </div>

                            {/* Operations Overview */}
                            <div className="w-full xl:w-auto flex flex-col justify-center">
                                <span className="text-sm font-bold mb-3" style={{ color: 'var(--text-main)' }}>Operations Overview</span>
                                <div className="flex flex-wrap gap-2">
                                    <div className="bg-[#fee2e2] text-[#b91c1c] px-3 py-2 rounded-xl flex items-center gap-2">
                                        <div className="bg-[#ef4444] text-white p-1 rounded-md"><Clock size={12} /></div>
                                        <span className="font-bold text-lg leading-none">
                                            {restLoading ? (
                                                <span className="inline-block h-4 w-6 bg-red-900/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.tasks.overdue < 10 ? `0${kpiData.tasks.overdue}` : kpiData.tasks.overdue
                                            )}
                                        </span>
                                        <span className="text-xs font-medium opacity-80">Overdue Tasks</span>
                                    </div>
                                    <div className="bg-[#fef3c7] text-[#b45309] px-3 py-2 rounded-xl flex items-center gap-2">
                                        <div className="bg-[#f59e0b] text-white p-1 rounded-md"><FileText size={12} /></div>
                                        <span className="font-bold text-lg leading-none">
                                            {restLoading ? (
                                                <span className="inline-block h-4 w-6 bg-yellow-900/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.tasks.upcoming < 10 ? `0${kpiData.tasks.upcoming}` : kpiData.tasks.upcoming
                                            )}
                                        </span>
                                        <span className="text-xs font-medium opacity-80">Upcoming Tasks</span>
                                    </div>
                                    <div className="bg-[#ccfbf1] text-[#0f766e] px-3 py-2 rounded-xl flex items-center gap-2">
                                        <div className="bg-[#14b8a6] text-white p-1 rounded-md"><ClipboardList size={12} /></div>
                                        <span className="font-bold text-lg leading-none">
                                            {restLoading ? (
                                                <span className="inline-block h-4 w-6 bg-teal-900/20 rounded animate-pulse" />
                                            ) : (
                                                kpiData.tasks.assigned < 10 ? `0${kpiData.tasks.assigned}` : kpiData.tasks.assigned
                                            )}
                                        </span>
                                        <span className="text-xs font-medium opacity-80">Assigned Tasks</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                        {/* 1. Finance (Clickable) */}
                        <div
                            onClick={() => navigate('finance-dashboard')}
                            className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-[#148F85] hover:shadow-[#148F85]/10 group transition-all duration-300 relative overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#148F85]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#148F85]/20 transition-all" />
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2.5 rounded-xl bg-[#148F85]/10 text-[#148F85]">
                                    <DollarSign size={20} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-[#148F85] transition-colors">Finance Analytics</h2>
                            </div>
                            <div className="h-[220px] w-full relative z-10">
                                {restLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <RefreshCw className="animate-spin text-lime" size={24} />
                                    </div>
                                ) : financeTotals.some(t => t.amount > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={financeTotals} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Line type="monotone" dataKey="amount" stroke="#148F85" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Financial Data</div>
                                )}
                            </div>
                        </div>

                        {/* 2. Fleet Performance (Clickable) */}
                        <div
                            onClick={() => navigate('driver-performance')}
                            className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-blue-500/10 group transition-all duration-300 relative overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                    <Users size={20} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-blue-500 transition-colors">Fleet Payables (Rent Trend)</h2>
                            </div>
                            <div className="h-[220px] w-full relative z-10">
                                {restLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <RefreshCw className="animate-spin text-lime" size={24} />
                                    </div>
                                ) : rentTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={rentTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="period" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                                            <Line type="monotone" dataKey="Paid" name="Paid" stroke={COLORS.green} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="Pending" name="Pending" stroke={COLORS.blue} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="Overdue" name="Overdue" stroke={COLORS.red} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Rent Data</div>
                                )}
                            </div>
                        </div>

                        {/* 3. Vehicle Analytics */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                                    <Car size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Vehicle Asset Distribution</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {restLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <RefreshCw className="animate-spin text-lime" size={24} />
                                    </div>
                                ) : vehicleData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={vehicleData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Bar dataKey="count" name="Vehicles" radius={[4, 4, 0, 0]}>
                                                {vehicleData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill || '#8b5cf6'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Vehicle Data</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Purchase Order Analytics (Clickable) */}
                        <div
                            onClick={() => navigate('purchase-orders')}
                            className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-yellow-500 hover:shadow-yellow-500/10 group transition-all duration-300 relative overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-500/20 transition-all" />
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                                    <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-yellow-500 transition-colors">PO Tracking (Trend)</h2>
                            </div>
                            <div className="h-[220px] w-full relative z-10">
                                {restLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <RefreshCw className="animate-spin text-lime" size={24} />
                                    </div>
                                ) : poTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={poTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="period" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                                            <Line type="monotone" dataKey="Approved" name="Approved" stroke={COLORS.green} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="Pending" name="Pending" stroke={COLORS.yellow} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="Rejected" name="Rejected" stroke={COLORS.red} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No PO Data</div>
                                )}
                            </div>
                        </div>

                        {/* 5. Staff Analytics (Clickable) */}
                        <div
                            onClick={() => navigate('staff-performance')}
                            className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-orange-500 hover:shadow-orange-500/10 group transition-all duration-300 relative overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-all" />
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                    <Briefcase size={20} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-orange-500 transition-colors">Staff Operations</h2>
                            </div>
                            <div className="h-[220px] w-full relative z-10">
                                {restLoading ? (
                                    <div className="h-full flex items-center justify-center">
                                        <RefreshCw className="animate-spin text-lime" size={24} />
                                    </div>
                                ) : staffData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={staffData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Bar dataKey="count" name="Staff" radius={[4, 4, 0, 0]}>
                                                {staffData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill || '#f97316'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Staff Data</div>
                                )}
                            </div>
                        </div>

                        {/* 6. Task Operations Overview */}
                        <div
                            className="rounded-3xl border p-6 flex flex-col shadow-sm relative overflow-hidden"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="flex items-center gap-3 mb-4 relative z-10">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                    <ClipboardList size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Task Operations</h2>
                            </div>
                            <div className="h-[220px] w-full relative z-10 flex items-center justify-center">
                                {restLoading ? (
                                    <RefreshCw className="animate-spin text-lime" size={24} />
                                ) : (kpiData.tasks?.overdue || kpiData.tasks?.upcoming || kpiData.tasks?.assigned) > 0 ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Overdue', value: kpiData.tasks?.overdue || 0, fill: COLORS.red },
                                                        { name: 'Upcoming', value: kpiData.tasks?.upcoming || 0, fill: COLORS.blue },
                                                        { name: 'Assigned', value: kpiData.tasks?.assigned || 0, fill: COLORS.yellow }
                                                    ].filter(x => x.value > 0)}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                >
                                                    {[
                                                        { name: 'Overdue', value: kpiData.tasks?.overdue || 0, fill: COLORS.red },
                                                        { name: 'Upcoming', value: kpiData.tasks?.upcoming || 0, fill: COLORS.blue },
                                                        { name: 'Assigned', value: kpiData.tasks?.assigned || 0, fill: COLORS.yellow }
                                                    ].filter(x => x.value > 0).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 600 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute flex flex-col items-center justify-center mb-6">
                                            <span className="text-xl font-black text-main">
                                                {(kpiData.tasks?.overdue || 0) + (kpiData.tasks?.upcoming || 0) + (kpiData.tasks?.assigned || 0)}
                                            </span>
                                            <span className="text-[9px] uppercase font-black tracking-wider text-dim">Tasks</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Tasks Data</div>
                                )}
                            </div>
                        </div>

                    </div>
        </div>
    );
};

const ExecutiveDashboardSkeleton = () => (
    <div className="container-responsive space-y-6 pb-12 animate-pulse">
        {/* Header & Master Filters */}
        <div className="flex flex-row justify-between items-center gap-2 lg:gap-6 border-b pb-4 lg:pb-6 w-full" style={{ borderColor: 'var(--border-main)' }}>
            <div className="min-w-0 flex-1 mr-2 space-y-2">
                <div className="h-8 w-64 bg-white/10 rounded-lg" />
                <div className="h-4 w-96 max-w-full bg-white/5 rounded-lg hidden md:block" />
            </div>
            <div className="flex flex-row items-center gap-1.5 lg:gap-3 flex-shrink-0">
                <div className="h-10 w-24 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-10 w-28 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-10 w-28 bg-white/5 rounded-xl border border-white/5" />
                <div className="h-10 w-10 bg-white/5 rounded-xl border border-white/5" />
            </div>
        </div>

        {/* Custom KPI Layout Skeleton */}
        <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left KPIs - 2x2 Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:w-[55%]">
                    {[1, 2, 3, 4].map(idx => (
                        <div key={idx} className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between h-[120px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                                    <div className="h-8 w-24 bg-white/10 rounded-lg" />
                                </div>
                                <div className="h-6 w-12 bg-white/5 rounded-md" />
                            </div>
                            <div className="h-4 w-32 bg-white/5 rounded mt-3" />
                        </div>
                    ))}
                </div>

                {/* Right Alerts Section Skeleton */}
                <div className="rounded-2xl p-5 shadow-sm border lg:w-[45%] flex flex-col h-[256px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-5 w-20 bg-white/10 rounded-lg" />
                        <div className="h-8 w-20 bg-white/5 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                        <div className="bg-red-500/10 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 border border-red-500/20">
                            <div className="w-8 h-8 rounded-md bg-white/10" />
                            <div className="h-6 w-8 bg-white/10 rounded" />
                            <div className="h-3 w-16 bg-white/5 rounded" />
                        </div>
                        <div className="bg-orange-500/10 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 border border-orange-500/20">
                            <div className="w-8 h-8 rounded-md bg-white/10" />
                            <div className="h-6 w-8 bg-white/10 rounded" />
                            <div className="h-3 w-16 bg-white/5 rounded" />
                        </div>
                        <div className="bg-indigo-500/10 rounded-xl p-4 flex flex-col items-center justify-center space-y-2 border border-indigo-500/20">
                            <div className="w-8 h-8 rounded-md bg-white/10" />
                            <div className="h-6 w-8 bg-white/10 rounded" />
                            <div className="h-3 w-16 bg-white/5 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row Skeleton */}
            <div className="rounded-2xl p-5 shadow-sm border flex flex-col xl:flex-row items-center justify-between gap-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {[1, 2, 3].map(idx => (
                    <div key={idx} className="flex items-center gap-4 w-full xl:w-auto xl:pr-6 xl:border-r border-opacity-50 space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />
                        <div className="space-y-2">
                            <div className="h-7 w-20 bg-white/10 rounded" />
                            <div className="h-4 w-32 bg-white/5 rounded" />
                        </div>
                    </div>
                ))}
                <div className="w-full xl:w-auto space-y-2">
                    <div className="h-4 w-36 bg-white/10 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-white/5 rounded-xl" />
                        <div className="h-8 w-24 bg-white/5 rounded-xl" />
                        <div className="h-8 w-24 bg-white/5 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>

        {/* 6 Analytics Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(idx => (
                <div key={idx} className="rounded-3xl border p-6 flex flex-col shadow-sm h-[320px] justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5" />
                        <div className="h-5 w-40 bg-white/10 rounded-lg" />
                    </div>
                    <div className="h-[220px] w-full bg-white/5 rounded-2xl flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-4 border-white/5 border-t-white/10 animate-spin" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ExecutiveDashboard;
