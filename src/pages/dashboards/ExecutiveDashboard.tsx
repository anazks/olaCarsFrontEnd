import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import OlaLoader from '../../components/common/OlaLoader';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    LineChart, Line
} from 'recharts';
import {
    Car, Users, DollarSign, RefreshCw, Activity, ShoppingCart,
    AlertTriangle, CreditCard, AlertCircle,
    BarChart3, ArrowUpRight, ArrowDownRight, Clock, FileText, ClipboardList, Briefcase
} from 'lucide-react';
import { getLedgerEntries } from '../../services/ledgerService';
import { getAllDrivers } from '../../services/driverService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllPurchaseOrders } from '../../services/purchaseOrderService';
import { getStaffPerformance } from '../../services/staffPerformanceService';
import { getAllBranches } from '../../services/branchService';
import alertService from '../../services/alertService';
import { getTasks } from '../../services/taskService';

const COLORS = {
    green: '#22c55e', blue: '#3b82f6', red: '#ef4444',
    yellow: '#eab308', teal: '#14b8a6', purple: '#8b5cf6',
    orange: '#f97316', indigo: '#6366f1', pink: '#ec4899'
};

const ExecutiveDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [financeTotals, setFinanceTotals] = useState<{ name: string; amount: number; fill: string }[]>([]);
    const [vehicleData, setVehicleData] = useState<any[]>([]);
    const [driverData, setDriverData] = useState<any[]>([]);
    const [staffData, setStaffData] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [rentTrendData, setRentTrendData] = useState<any[]>([]);
    const [poTrendData, setPoTrendData] = useState<any[]>([]);
    // KPI States
    const [kpiData, setKpiData] = useState({
        totalActiveVehicles: 0,
        monthlyRevenue: 0,
        outstandingCollections: 0,
        activeDrivers: 0,
        collectionCompliance: 0,
        last12MonthRevenue: 0,
        outstandingBalance: 0,
        activeAlerts: 0,
        alertsDetailed: {
            critical: [] as any[],
            major: [] as any[],
            minor: [] as any[]
        },
        tasks: {
            overdue: 0,
            upcoming: 0,
            assigned: 0
        }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const oneMonthAgoDate = new Date();
    oneMonthAgoDate.setMonth(oneMonthAgoDate.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgoDate.toISOString().split('T')[0];

    // Global Filters
    const [globalBranch, setGlobalBranch] = useState<string>('all');
    const [globalSort] = useState<string>('desc');
    const [globalStartDate, setGlobalStartDate] = useState<string>(oneMonthAgoStr);
    const [globalEndDate, setGlobalEndDate] = useState<string>(todayStr);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (branches.length === 0) {
                try {
                    const brRes = await getAllBranches({ limit: 100 });
                    if (brRes.data) setBranches(brRes.data);
                } catch (e) {
                    console.error("Failed to load branches", e);
                }
            }

            const baseFilters: any = {};
            if (globalBranch !== 'all') baseFilters.branch = globalBranch;
            // We fetch all records and filter locally by date range to allow cross-period KPI calculations
            baseFilters.sortOrder = globalSort;
            baseFilters.sortBy = 'createdAt';

            const [ledgerRes, driverRes, vehicleRes, poRes, staffRes, alertRes, taskRes] = await Promise.allSettled([
                getLedgerEntries({ limit: 5000, ...baseFilters }),
                getAllDrivers({ limit: 1000, ...baseFilters }),
                getAllVehicles({ limit: 1000, ...baseFilters }),
                getAllPurchaseOrders({ limit: 500, ...baseFilters }),
                getStaffPerformance({ type: 'all', ...baseFilters }),
                alertService.getActiveAlerts(),
                getTasks({ limit: 1000, ...baseFilters })
            ]);

            const startD = globalStartDate ? new Date(globalStartDate) : new Date(0);
            const endD = globalEndDate ? new Date(globalEndDate) : new Date();
            endD.setHours(23, 59, 59, 999);
            startD.setHours(0, 0, 0, 0);
            const diffDays = (endD.getTime() - startD.getTime()) / (1000 * 3600 * 24);
            const groupByDay = diffDays <= 60;

            // KPI Calculations
            let newKpi = { ...kpiData };

            if (alertRes.status === 'fulfilled') {
                const allAlerts = alertRes.value || [];
                // Filter alerts by date range
                const alerts = allAlerts.filter(a => {
                    const alertDate = new Date(a.createdAt);
                    return alertDate >= startD && alertDate <= endD;
                });
                newKpi.activeAlerts = alerts.length;
                newKpi.alertsDetailed = {
                    critical: alerts.filter(a => a.priority === 'HIGH'),
                    major: alerts.filter(a => a.priority === 'MEDIUM'),
                    minor: alerts.filter(a => a.priority === 'LOW')
                };
            }

            if (taskRes.status === 'fulfilled') {
                const tasks = taskRes.value.data || [];
                let overdue = 0, upcoming = 0, assigned = 0;
                const now = new Date();

                tasks.forEach((t: any) => {
                    if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
                        if (t.dueDate) {
                            const dd = new Date(t.dueDate);
                            if (dd >= startD && dd <= endD) {
                                assigned++;
                                if (dd < now) overdue++;
                                else upcoming++;
                            }
                        } else {
                            const cd = new Date(t.createdAt);
                            if (cd >= startD && cd <= endD) {
                                assigned++;
                                upcoming++;
                            }
                        }
                    }
                });
                newKpi.tasks = { overdue, upcoming, assigned };
            }

            if (ledgerRes.status === 'fulfilled') {
                const ledgerValue = ledgerRes.value;
                const ledgerData = Array.isArray(ledgerValue)
                    ? ledgerValue
                    : (ledgerValue && Array.isArray(ledgerValue.data) ? ledgerValue.data : []);
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

                let periodRev = 0;
                let twelveMonthRev = 0;

                ledgerData.forEach((entry: any) => {
                    const d = new Date(entry.entryDate || entry.date);
                    if (isNaN(d.getTime())) return;

                    const cat = entry.accountingCode?.category?.toUpperCase();
                    let amt = entry.amount !== undefined ? entry.amount : (entry.debit || entry.credit || 0);
                    let isDebit = entry.amount !== undefined ? entry.type === 'DEBIT' : ((entry.debit || 0) > 0);

                    if (cat === 'INCOME') {
                        const incomeToAdd = isDebit ? -amt : amt;

                        // Period revenue
                        if (d >= startD && d <= endD) {
                            periodRev += incomeToAdd;
                        }

                        // Last 12 months (ignores date picker)
                        if (d >= twelveMonthsAgo) {
                            twelveMonthRev += incomeToAdd;
                        }
                    }
                });
                newKpi.monthlyRevenue = periodRev;
                newKpi.last12MonthRevenue = twelveMonthRev;
            }

            if (driverRes.status === 'fulfilled') {
                const drivers = driverRes.value.data || [];
                let activeDriversCount = 0;
                let totalOverdue = 0;
                let totalPending = 0;
                let totalDuePeriod = 0;
                let totalPaidPeriod = 0;

                drivers.forEach(d => {
                    if (d.status === 'ACTIVE') activeDriversCount++;

                    const rt = d.rentTracking || [];
                    rt.forEach((week: any) => {
                        const wd = new Date(week.dueDate || week.startDate || new Date());
                        if (wd >= startD && wd <= endD) {
                            const amtDue = week.totalDue || 0;
                            const amtPaid = week.amountPaid || 0;
                            const bal = week.balance || 0;

                            totalDuePeriod += amtDue;
                            totalPaidPeriod += amtPaid;

                            if (week.status !== 'PAID') {
                                const isOverdue = new Date(week.dueDate || '') < new Date();
                                if (isOverdue) totalOverdue += bal;
                                else totalPending += bal;
                            }
                        }
                    });
                });

                newKpi.activeDrivers = activeDriversCount;
                newKpi.outstandingCollections = totalOverdue;
                newKpi.outstandingBalance = totalOverdue + totalPending;
                newKpi.collectionCompliance = totalDuePeriod > 0 ? (totalPaidPeriod / totalDuePeriod) * 100 : 0;
            }

            if (vehicleRes.status === 'fulfilled') {
                const vecs = vehicleRes.value.data || [];
                let activeVecs = 0;
                vecs.forEach(v => {
                    if (v.status === 'ACTIVE — RENTED' || v.status === 'ACTIVE — AVAILABLE') {
                        activeVecs++;
                    }
                });
                newKpi.totalActiveVehicles = activeVecs;
            }

            setKpiData(newKpi);

            // 1. Finance Aggregation
            if (ledgerRes.status === 'fulfilled') {
                const ledgerValue = ledgerRes.value;
                const ledgerData = Array.isArray(ledgerValue)
                    ? ledgerValue
                    : (ledgerValue && Array.isArray(ledgerValue.data) ? ledgerValue.data : []);

                // Aggregate category totals
                let totalIncome = 0;
                let totalExpense = 0;
                let totalAssets = 0;
                let totalLiability = 0;

                ledgerData.forEach((entry: any) => {
                    const d = new Date(entry.entryDate || entry.date);
                    if (isNaN(d.getTime())) return;
                    if (d < startD || d > endD) return;

                    const cat = entry.accountingCode?.category?.toUpperCase();
                    let amt = entry.amount !== undefined ? entry.amount : (entry.debit || entry.credit || 0);
                    let isDebit = entry.amount !== undefined ? entry.type === 'DEBIT' : ((entry.debit || 0) > 0);

                    if (cat === 'INCOME') {
                        totalIncome += isDebit ? -amt : amt;
                    } else if (cat === 'EXPENSE') {
                        totalExpense += isDebit ? amt : -amt;
                    } else if (cat === 'ASSET') {
                        totalAssets += isDebit ? amt : -amt;
                    } else if (cat === 'LIABILITY') {
                        totalLiability += isDebit ? -amt : amt;
                    }
                });

                setFinanceTotals([
                    { name: 'Income', amount: Math.max(0, totalIncome), fill: '#22c55e' },
                    { name: 'Expense', amount: Math.max(0, totalExpense), fill: '#ef4444' },
                    { name: 'Assets', amount: Math.max(0, totalAssets), fill: '#3b82f6' },
                    { name: 'Liability', amount: Math.max(0, totalLiability), fill: '#f59e0b' }
                ]);


            }

            // 2. Fleet & Driver Aggregation
            if (driverRes.status === 'fulfilled') {
                const drivers = driverRes.value.data || [];
                const statusCounts = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0 };
                const scoreCounts = { 'Unscored': 0, '<60': 0, '60-80': 0, '80+': 0 };
                const rentMap = new Map<string, { period: string; Paid: number; Pending: number; Overdue: number }>();

                drivers.forEach(d => {
                    // Fleet Collections logic
                    const rt = d.rentTracking || [];
                    const periodRt = rt.filter((week: any) => {
                        const wd = new Date(week.dueDate || week.startDate || new Date());
                        return wd >= startD && wd <= endD;
                    });

                    if (periodRt.length > 0) {
                        const pending = periodRt.filter((x: any) => x.status !== 'PAID').sort((a: any, b: any) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
                        if (pending.length > 0) {
                            const isOverdue = new Date(pending[0].dueDate || '') < new Date();
                            if (isOverdue) statusCounts.OVERDUE++;
                            else statusCounts.PENDING++;
                        } else {
                            statusCounts.PAID++;
                        }
                    }

                    // Rent trend logic
                    rt.forEach((week: any) => {
                        const wd = new Date(week.dueDate || week.startDate || new Date());
                        if (wd < startD || wd > endD) return;
                        
                        const pKey = groupByDay 
                            ? wd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : wd.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                            
                        const curr = rentMap.get(pKey) || { period: pKey, Paid: 0, Pending: 0, Overdue: 0 };
                        const amtPaid = week.amountPaid || 0;
                        const bal = week.balance || 0;
                        if (week.status === 'PAID') {
                            curr.Paid += amtPaid;
                        } else {
                            const isOverdue = new Date(week.dueDate || '') < new Date();
                            if (isOverdue) curr.Overdue += bal;
                            else curr.Pending += bal;
                        }
                        rentMap.set(pKey, curr);
                    });

                    // Score Logic
                    const s = d.performance?.drivingScore || 0;
                    if (s === 0) scoreCounts.Unscored++;
                    else if (s < 60) scoreCounts['<60']++;
                    else if (s < 80) scoreCounts['60-80']++;
                    else scoreCounts['80+']++;
                });

                setDriverData([
                    { name: 'Unscored', Drivers: scoreCounts.Unscored, fill: COLORS.teal },
                    { name: '<60', Drivers: scoreCounts['<60'], fill: COLORS.red },
                    { name: '60-80', Drivers: scoreCounts['60-80'], fill: COLORS.yellow },
                    { name: '80+', Drivers: scoreCounts['80+'], fill: COLORS.green }
                ].filter(d => d.Drivers > 0));

                const rTrend = Array.from(rentMap.values()).sort((a,b) => {
                    if (groupByDay) {
                        const da = new Date(`${a.period} ${new Date().getFullYear()}`);
                        const db = new Date(`${b.period} ${new Date().getFullYear()}`);
                        return da.getTime() - db.getTime();
                    }
                    return new Date(`01 ${a.period}`).getTime() - new Date(`01 ${b.period}`).getTime();
                });
                setRentTrendData(rTrend);
            }

            // 3. Vehicle Analytics
            if (vehicleRes.status === 'fulfilled') {
                const vecs = vehicleRes.value.data || [];
                const vDisplayCounts = { Active: 0, Maintenance: 0, Available: 0, Suspended: 0, Other: 0 };

                vecs.forEach(v => {
                    const cd = new Date(v.createdAt);
                    if (cd >= startD && cd <= endD) {
                        const status = v.status;
                        if (status === 'ACTIVE — RENTED') vDisplayCounts.Active++;
                        else if (status === 'ACTIVE — MAINTENANCE' || status === 'REPAIR IN PROGRESS') vDisplayCounts.Maintenance++;
                        else if (status === 'ACTIVE — AVAILABLE') vDisplayCounts.Available++;
                        else if (status === 'SUSPENDED' || status === 'RETIRED') vDisplayCounts.Suspended++;
                        else vDisplayCounts.Other++;
                    }
                });

                setVehicleData([
                    { name: 'Active', count: vDisplayCounts.Active, fill: COLORS.green },
                    { name: 'Maintenance', count: vDisplayCounts.Maintenance, fill: COLORS.orange },
                    { name: 'Available', count: vDisplayCounts.Available, fill: COLORS.blue },
                    { name: 'Suspended', count: vDisplayCounts.Suspended, fill: COLORS.red },
                    { name: 'Pipeline', count: vDisplayCounts.Other, fill: COLORS.purple }
                ].filter(d => d.count > 0));
            }

            // 4. Purchase Order Analytics
            if (poRes.status === 'fulfilled') {
                const pos = poRes.value.data || [];
                let approved = 0, waiting = 0, rejected = 0;
                const poMap = new Map<string, { period: string; Approved: number; Pending: number; Rejected: number }>();

                pos.forEach(p => {
                    if (p.status === 'APPROVED') approved++;
                    else if (p.status === 'REJECTED') rejected++;
                    else waiting++; // WAITING or others

                    const pd = new Date(p.createdAt || p.purchaseOrderDate || new Date());
                    if (pd < startD || pd > endD) return;
                    
                    const pKey = groupByDay 
                        ? pd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        : pd.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                        
                    const curr = poMap.get(pKey) || { period: pKey, Approved: 0, Pending: 0, Rejected: 0 };
                    const amt = p.totalAmount || 1;
                    if (p.status === 'APPROVED') curr.Approved += amt;
                    else if (p.status === 'REJECTED') curr.Rejected += amt;
                    else curr.Pending += amt;
                    poMap.set(pKey, curr);
                });

                const poTrend = Array.from(poMap.values()).sort((a,b) => {
                    if (groupByDay) {
                        const da = new Date(`${a.period} ${new Date().getFullYear()}`);
                        const db = new Date(`${b.period} ${new Date().getFullYear()}`);
                        return da.getTime() - db.getTime();
                    }
                    return new Date(`01 ${a.period}`).getTime() - new Date(`01 ${b.period}`).getTime();
                });
                setPoTrendData(poTrend);
            }

            // 5. Staff Analytics
            if (staffRes.status === 'fulfilled') {
                const sd = staffRes.value.data;
                setStaffData([
                    { name: 'Branch Mgrs', count: sd.branchManagers?.length || 0, fill: COLORS.indigo },
                    { name: 'Finance Staff', count: sd.financeStaff?.length || 0, fill: COLORS.pink },
                    { name: 'Operation Staff', count: sd.operationStaff?.length || 0, fill: COLORS.teal },
                    { name: 'Country Mgrs', count: sd.countryManagers?.length || 0, fill: COLORS.yellow },
                    { name: 'Global Admins', count: sd.globalAdmins?.length || 0, fill: COLORS.green }
                ].filter(x => x.count > 0));
            }

        } catch (e) {
            console.error('Failed fetching data', e);
        } finally {
            setTimeout(() => {
                setLoading(false);
            }, 900);
        }
    };

    // Keep end date valid relative to start date
    useEffect(() => {
        if (globalStartDate && globalEndDate && globalEndDate < globalStartDate) {
            setGlobalEndDate(globalStartDate);
        }
    }, [globalStartDate, globalEndDate]);

    useEffect(() => {
        fetchData();
    }, []);

    // ─── Render Components ──────────────────────────────────────────

    if (loading) {
        return <OlaLoader fullScreen size="lg" />;
    }

    return (
        <div className="container-responsive space-y-6">

            {/* Header & Master Filters */}
            <div className="flex flex-row justify-between items-center gap-2 lg:gap-6 border-b pb-4 lg:pb-6 w-full" style={{ borderColor: 'var(--border-main)' }}>
                <div className="min-w-0 flex-1 mr-2">
                    <h1 className="flex items-center gap-2 lg:gap-3 text-lg lg:text-2xl font-black uppercase tracking-tighter min-w-0" style={{ color: 'var(--text-main)' }}>
                        {/* <Activity className="inline mr-2 lg:mr-3 mb-1 min-w-[20px]" style={{ color: '#148F85' }} />  */}
                        <div className="w-7 h-7 lg:w-9 lg:h-9 bg-white rounded-full flex items-center justify-center border-2 border-[#D4F12E] overflow-hidden flex-shrink-0">
                            <div className="bg-black w-[18px] h-[18px] lg:w-[22px] lg:h-[22px] rounded-full flex items-center justify-center">
                                <div className="bg-[#D4F12E] w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full"></div>
                            </div>
                        </div>
                        <span className="hidden sm:inline truncate">Executive Control Center</span>
                        <span className="sm:hidden truncate">Executive</span>
                    </h1>
                    <p className="text-[10px] lg:text-xs font-medium mt-0.5 lg:mt-1 truncate hidden md:block" style={{ color: 'var(--text-dim)' }}>
                        Real-time master aggregation across all operating domains
                    </p>
                </div>

                <div className="flex flex-row items-center gap-1.5 lg:gap-3 flex-shrink-0">
                    {/* Branch Filter */}
                    {branches.length > 0 && (
                        <select
                            value={globalBranch}
                            onChange={(e) => setGlobalBranch(e.target.value)}
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
                            value={globalStartDate}
                            max={globalEndDate || todayStr}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && val <= todayStr && (!globalEndDate || val <= globalEndDate)) {
                                    setGlobalStartDate(val);
                                } else if (!val) {
                                    setGlobalStartDate('');
                                }
                            }}
                            className="px-2 py-1.5 lg:px-4 lg:py-2 border rounded-xl text-xs lg:text-sm outline-none transition-all font-bold w-[100px] lg:w-auto"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest opacity-40">to</span>
                        <input
                            type="date"
                            value={globalEndDate}
                            min={globalStartDate}
                            max={todayStr}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val && val <= todayStr) {
                                    if (globalStartDate && val < globalStartDate) {
                                        setGlobalEndDate(globalStartDate);
                                    } else {
                                        setGlobalEndDate(val);
                                    }
                                } else if (!val) {
                                    setGlobalEndDate('');
                                }
                            }}
                            className="px-2 py-1.5 lg:px-4 lg:py-2 border rounded-xl text-xs lg:text-sm outline-none transition-all font-bold w-[100px] lg:w-auto"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>


                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-1 lg:gap-2 px-2 py-1.5 lg:px-4 lg:py-2 bg-lime text-black rounded-lg text-xs lg:text-sm font-bold transition-all hover:bg-lime/90 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden xl:inline">{t('dashboards.common.refreshData')}</span>
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
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{kpiData.totalActiveVehicles.toLocaleString()}</span>
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
                                                {kpiData.monthlyRevenue > 9999
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
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>${kpiData.outstandingCollections.toLocaleString()}</span>
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
                                            <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{kpiData.activeDrivers.toLocaleString()}</span>
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
                                        <span className="text-3xl font-bold mb-1">{kpiData.alertsDetailed.critical.length}</span>
                                        <span className="text-xs font-semibold opacity-90">Critical</span>
                                    </div>
                                    {/* Major */}
                                    <div
                                        className="bg-[#f97316] rounded-xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-all"
                                        onClick={() => navigate('/admin/admin/alerts')}
                                    >
                                        <div className="bg-white text-[#f97316] p-1.5 rounded-md mb-3"><AlertCircle size={16} /></div>
                                        <span className="text-3xl font-bold mb-1">{kpiData.alertsDetailed.major.length}</span>
                                        <span className="text-xs font-semibold opacity-90">Major</span>
                                    </div>
                                    {/* Minor */}
                                    <div
                                        className="bg-[#4f46e5] rounded-xl p-4 text-white flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-all"
                                        onClick={() => navigate('/admin/admin/alerts')}
                                    >
                                        <div className="bg-white text-[#4f46e5] p-1.5 rounded-md mb-3"><Clock size={16} /></div>
                                        <span className="text-3xl font-bold mb-1">{kpiData.alertsDetailed.minor.length}</span>
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
                                        <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{kpiData.collectionCompliance.toFixed(0)}%</span>
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
                                    <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>${kpiData.last12MonthRevenue.toLocaleString()}</span>
                                    <span className="text-sm font-medium block mt-1" style={{ color: 'var(--text-dim)' }}>Last 12 Months Revenue</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full xl:w-auto xl:pr-6 xl:border-r border-opacity-50" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>${kpiData.outstandingBalance.toLocaleString()}</span>
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
                                        <span className="font-bold text-lg leading-none">{kpiData.tasks.overdue < 10 ? `0${kpiData.tasks.overdue}` : kpiData.tasks.overdue}</span>
                                        <span className="text-xs font-medium opacity-80">Overdue Tasks</span>
                                    </div>
                                    <div className="bg-[#fef3c7] text-[#b45309] px-3 py-2 rounded-xl flex items-center gap-2">
                                        <div className="bg-[#f59e0b] text-white p-1 rounded-md"><FileText size={12} /></div>
                                        <span className="font-bold text-lg leading-none">{kpiData.tasks.upcoming < 10 ? `0${kpiData.tasks.upcoming}` : kpiData.tasks.upcoming}</span>
                                        <span className="text-xs font-medium opacity-80">Upcoming Tasks</span>
                                    </div>
                                    <div className="bg-[#ccfbf1] text-[#0f766e] px-3 py-2 rounded-xl flex items-center gap-2">
                                        <div className="bg-[#14b8a6] text-white p-1 rounded-md"><ClipboardList size={12} /></div>
                                        <span className="font-bold text-lg leading-none">{kpiData.tasks.assigned < 10 ? `0${kpiData.tasks.assigned}` : kpiData.tasks.assigned}</span>
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
                                {financeTotals.some(t => t.amount > 0) ? (
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
                                {rentTrendData.length > 0 ? (
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

                        {/* 3. Driver Analytics */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
                                    <Activity size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Driving Apptitude</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {driverData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={driverData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Line type="monotone" dataKey="Drivers" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Drive Score Data</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Vehicle Analytics */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                                    <Car size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Vehicle Asset Distribution</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {vehicleData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={vehicleData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Line type="monotone" dataKey="count" name="Vehicles" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Vehicle Data</div>
                                )}
                            </div>
                        </div>

                        {/* 5. Purchase Order Analytics (Clickable) */}
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
                                {poTrendData.length > 0 ? (
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

                        {/* 6. Staff Analytics (Clickable) */}
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
                                {staffData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={staffData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Line type="monotone" dataKey="count" name="Staff" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Staff Data</div>
                                )}
                            </div>
                        </div>

                    </div>
        </div>
    );
};

export default ExecutiveDashboard;
