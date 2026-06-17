import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    ResponsiveContainer, AreaChart, Area, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    BarChart, Bar, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import {
    Library, DollarSign, ShieldAlert, Calendar,
    MapPin, Building, Search, Filter,
    TrendingUp, Wallet, FileText, Clock, FilterX,
    RefreshCw
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../store';
import { setCollectionsDashboardData } from '../../../store/dashboardSlice';

// Services
import { 
    getCollectionsOverview, 
    getCollectionsList, 
    type CollectionsMetricData, 
    type TrendDataPoint, 
    type OverdueEntry, 
    type UpcomingEntry, 
    type CollectionListItem 
} from '../../../services/collectionService';
import { getAllBranches } from '../../../services/branchService';
import { useTheme } from '../../../context/ThemeContext';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CollectionsDashboard = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const navigate = useNavigate();

    const getRoutePrefix = () => {
        const role = getUserRole();
        switch (role) {
            case 'admin':
                return '/admin/admin';
            case 'financeadmin':
            case 'financialadmin':
                return '/admin/financial-admin';
            case 'operationadmin':
            case 'operationaladmin':
                return '/admin/operational-admin';
            case 'countrymanager':
                return '/admin/country-manager';
            case 'branchmanager':
                return '/admin/branch-manager';
            case 'financestaff':
                return '/admin/branch-fin-staff';
            case 'operationstaff':
                return '/admin/branch-op-staff';
            default:
                return '/admin/financial-admin';
        }
    };

    // Color map matching dashboard layout specs
    const chartColors = {
        grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        text: isDark ? '#94A3B8' : '#64748B',
        tooltipBg: isDark ? '#1C1C1C' : '#FFFFFF',
        tooltipBorder: isDark ? '#2A2A2A' : '#E5E7EB',
        tooltipText: isDark ? '#FFFFFF' : '#0A0A0A',
    };

    const dispatch = useDispatch();
    const collectionsState = useSelector((state: RootState) => state.dashboard.collections);

    const isFirstMount = useRef(true);
    const isListFirstMount = useRef(true);

    // Loading & Stats state
    const [loading, setLoading] = useState(!collectionsState.isLoaded);
    const [metrics, setMetrics] = useState<CollectionsMetricData | null>(collectionsState.metrics);
    const [trend, setTrend] = useState<TrendDataPoint[]>(collectionsState.trend);
    const [recentOverdue, setRecentOverdue] = useState<OverdueEntry[]>(collectionsState.recentOverdue);
    const [upcomingPayments, setUpcomingPayments] = useState<UpcomingEntry[]>(collectionsState.upcomingPayments);

    // List and Paginated state
    const [listItems, setListItems] = useState<CollectionListItem[]>(collectionsState.listItems);
    const [listLoading, setListLoading] = useState(false);
    const [pagination, setPagination] = useState(collectionsState.pagination);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Lookup collections
    const [allBranches, setAllBranches] = useState<any[]>(collectionsState.branches);

    // Filter presets
    const [filters, setFilters] = useState({
        country: '',
        branch: '',
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    const efficiencyIndex = useMemo(() => {
        if (!metrics || !metrics.totalInvoiced) return 0;
        return (metrics.totalCollected / metrics.totalInvoiced) * 100;
    }, [metrics]);

    const statusCounts = useMemo(() => {
        const counts = { PAID: 0, OVERDUE: 0, PARTIAL: 0, PENDING: 0 };
        
        listItems.forEach(item => {
            const status = item.status as keyof typeof counts;
            if (counts[status] !== undefined) {
                counts[status] += 1;
            }
        });
        
        return [
            { name: 'Settled', count: counts.PAID, fill: '#10B981' },
            { name: 'Overdue', count: counts.OVERDUE, fill: '#EF4444' },
            { name: 'Partial', count: counts.PARTIAL, fill: '#F59E0B' },
            { name: 'Pending', count: counts.PENDING, fill: '#3B82F6' },
        ];
    }, [listItems]);

    // 1. Fetch Initial Setup (Branches)
    useEffect(() => {
        const loadBranches = async () => {
            if (collectionsState.branches.length > 0) {
                setAllBranches(collectionsState.branches);
                return;
            }
            try {
                const res = await getAllBranches({ limit: 1000 });
                const brData = res.data || [];
                setAllBranches(brData);
                dispatch(setCollectionsDashboardData({ branches: brData }));
            } catch (err) {
                console.error('Error loading branches', err);
            }
        };
        loadBranches();
    }, []);

    // Resolving country and cascaded branch options
    const availableCountries = useMemo(() => {
        const countries = allBranches.map(b => b.country).filter(c => !!c);
        return Array.from(new Set(countries)).sort();
    }, [allBranches]);

    const filteredBranches = useMemo(() => {
        if (!filters.country) return allBranches;
        return allBranches.filter(b => b.country === filters.country);
    }, [filters.country, allBranches]);

    // Auto clear selected branch if country removes it from bounds
    useEffect(() => {
        if (filters.branch) {
            const exists = filteredBranches.some(b => b._id === filters.branch);
            if (!exists) setFilters(p => ({ ...p, branch: '' }));
        }
    }, [filters.country, filteredBranches]);

    // Debounce search string input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 2. Fetch Primary Analytics/Overview
    const loadAnalytics = async () => {
        if (!collectionsState.isLoaded) {
            setLoading(true);
        }
        try {
            const data = await getCollectionsOverview(filters);
            setMetrics(data.metrics);
            setTrend(data.trend);
            setRecentOverdue(data.recentOverdue);
            setUpcomingPayments(data.upcomingPayments);

            dispatch(setCollectionsDashboardData({
                metrics: data.metrics,
                trend: data.trend,
                recentOverdue: data.recentOverdue,
                upcomingPayments: data.upcomingPayments
            }));
        } catch (err) {
            console.error('Failed fetching collections overview', err);
        } finally {
            setLoading(false);
        }
    };

    // 3. Fetch Detailed Invoices List
    const loadList = async (pageNumber = 1) => {
        setListLoading(true);
        try {
            const payload = {
                ...filters,
                search: debouncedSearch,
                status: statusFilter,
                page: pageNumber,
                limit: 10
            };
            const data = await getCollectionsList(payload);
            setListItems(data.items || []);
            setPagination({
                page: data.pagination.page,
                total: data.pagination.total,
                pages: data.pagination.pages
            });

            dispatch(setCollectionsDashboardData({
                listItems: data.items || [],
                pagination: {
                    page: data.pagination.page,
                    total: data.pagination.total,
                    pages: data.pagination.pages
                }
            }));
        } catch (err) {
            console.error('Failed fetching invoice grid', err);
        } finally {
            setListLoading(false);
        }
    };

    // Sync primary analytics trigger on core filters change
    useEffect(() => {
        const cacheAge = Date.now() - (collectionsState.lastFetched || 0);
        const isCacheFresh = collectionsState.isLoaded && cacheAge < 5 * 60 * 1000;

        if (isFirstMount.current && isCacheFresh) {
            isFirstMount.current = false;
            return;
        }
        isFirstMount.current = false;
        loadAnalytics();
    }, [filters.country, filters.branch, filters.startDate, filters.endDate]);

    // Sync list fetch on any interactive element change
    useEffect(() => {
        const cacheAge = Date.now() - (collectionsState.lastFetched || 0);
        const isCacheFresh = collectionsState.isLoaded && cacheAge < 5 * 60 * 1000;

        if (isListFirstMount.current && isCacheFresh) {
            isListFirstMount.current = false;
            return;
        }
        isListFirstMount.current = false;
        loadList(1);
    }, [filters.country, filters.branch, filters.startDate, filters.endDate, debouncedSearch, statusFilter]);

    const updateFilter = (key: string, val: string) => {
        setFilters(p => ({ ...p, [key]: val }));
    };

    const clearDates = () => {
        setFilters(p => ({ ...p, startDate: '', endDate: '' }));
    };

    const getPageNumbers = () => {
        const totalPages = pagination.pages;
        const currentPage = pagination.page;
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always include first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis-start');
            }

            // Determine range around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            let finalStart = start;
            let finalEnd = end;
            if (currentPage <= 3) {
                finalEnd = 4;
            } else if (currentPage >= totalPages - 2) {
                finalStart = totalPages - 3;
            }

            for (let i = finalStart; i <= finalEnd; i++) {
                if (i > 1 && i < totalPages) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pages.push('ellipsis-end');
            }

            // Always include last page
            pages.push(totalPages);
        }
        return pages;
    };

    // Inline Loading spinner component
    if (loading && !metrics) {
        return <CollectionsDashboardSkeleton />;
    }

    return (
        <div className={`p-6 md:p-8 min-h-screen transition-all duration-300 ${loading ? 'opacity-60 pointer-events-none' : ''}`} style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Collections Dashboard', active: true }]} />

            
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-6">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Library size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Collections Central
                        {loading && <RefreshCw className="animate-spin text-brand-lime ml-1" size={16} />}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5 flex items-center gap-2">
                        <span>Aggregate recovery analysis and forecasts</span>
                        <span className="text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                            ({filters.startDate || filters.endDate 
                                ? `Span: ${filters.startDate ? format(new Date(filters.startDate), 'MMM d') : 'Start'} - ${filters.endDate ? format(new Date(filters.endDate), 'MMM d') : 'Now'}`
                                : 'All-Time Dataset'})
                        </span>
                    </p>
                </div>
            </div>

                {/* CONTROL BOARD: FILTERS */}
                <div className="shadow-sm border p-2.5 rounded-2xl flex flex-wrap items-center gap-3 w-full xl:w-auto transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    
                    {/* Country Dropdown */}
                    <div className="relative">
                        <select value={filters.country} 
                                onChange={(e) => updateFilter('country', e.target.value)}
                                className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer transition-colors"
                                style={{ color: 'var(--text-main)' }}>
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Countries</option>
                            {availableCountries.map(c => <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>)}
                        </select>
                        <MapPin size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                    {/* Branch Select */}
                    <div className="relative">
                        <select value={filters.branch} 
                                onChange={(e) => updateFilter('branch', e.target.value)}
                                className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer max-w-[160px] transition-colors"
                                style={{ color: 'var(--text-main)' }}>
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Branches</option>
                            {filteredBranches.map(b => <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)' }}>{b.name}</option>)}
                        </select>
                        <Building size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                    {/* Date Constraints */}
                    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-colors" 
                         style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <Calendar size={15} style={{ color: 'var(--text-dim)' }} />
                        <input type="date" value={filters.startDate} 
                               onChange={(e) => updateFilter('startDate', e.target.value)}
                               className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer"
                               style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>-</span>
                        <input type="date" value={filters.endDate} 
                               onChange={(e) => updateFilter('endDate', e.target.value)}
                               className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer"
                               style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }} />
                        {(filters.startDate || filters.endDate) && (
                            <button onClick={clearDates} className="ml-1 text-red-500 hover:text-red-600" title="Clear dates">
                                <FilterX size={14} />
                            </button>
                        )}
                    </div>
                </div>


            {/* STAT CARDS COMPACT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 my-8">
                <MetricStatCard 
                    title="Total Billed" 
                    value={`$${(metrics?.totalInvoiced || 0).toLocaleString()}`} 
                    description="Gross expected revenue"
                    icon={<FileText size={22} className="text-blue-500" />}
                    iconBg="bg-blue-500/10"
                />
                <MetricStatCard 
                    title="Collections Received" 
                    value={`$${(metrics?.totalCollected || 0).toLocaleString()}`} 
                    description="Settled payments"
                    icon={<Wallet size={22} className="text-[#C8E600]" />}
                    iconBg="bg-[#C8E600]/10"
                />
                <MetricStatCard 
                    title="Pending Recoveries" 
                    value={`$${(metrics?.pendingCollected || 0).toLocaleString()}`} 
                    description="Awaiting deposit"
                    icon={<Clock size={22} className="text-amber-500" />}
                    iconBg="bg-amber-500/10"
                />
                <MetricStatCard 
                    title="Total Overdue" 
                    value={`$${(metrics?.overdueAmount || 0).toLocaleString()}`} 
                    description="Delinquent balance"
                    highlight={true}
                    icon={<ShieldAlert size={22} className="text-red-500" />}
                    iconBg="bg-red-500/10"
                />
            </div>

            {/* REVENUE FLOW CHART & HIGHLIGHT STATS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                
                {/* EXPECTED VS REALIZED CHART */}
                <div className="lg:col-span-8 rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <h3 className="text-lg font-bold">Expected vs Realized Collections</h3>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">Projected billing targets compared against actual deposits</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full border border-dashed border-blue-400" /> Projected
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#C8E600]" /> Realized
                            </div>
                        </div>
                    </div>

                    <div className="h-[210px] w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C8E600" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#C8E600" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="label" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px', color: chartColors.tooltipText }}
                                    formatter={(v: any) => [`$${v.toLocaleString()}`, '']}
                                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Area type="monotone" dataKey="expected" stroke="#3B82F6" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Expected" />
                                <Area type="monotone" dataKey="collected" stroke="#C8E600" strokeWidth={4} fillOpacity={1} fill="url(#gradCollected)" name="Collected" dot={{ fill: '#C8E600', r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SECONDARY KPI PILLS PANEL */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="rounded-3xl p-6 border shadow-sm flex-1 flex flex-col justify-between transition-colors"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp size={24} className="text-emerald-500" />
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500">MTD Active</div>
                        </div>
                        <div className="mt-8">
                            <div className="text-3xl font-black text-emerald-500">${(metrics?.mtdCollected || 0).toLocaleString()}</div>
                            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Month-To-Date Collected</p>
                            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Consolidated total of settled receipts logged since first call of the current month cycle.</p>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 border shadow-sm flex-1 flex flex-col justify-between transition-colors"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center">
                                <DollarSign size={24} className="text-[#C8E600]" />
                            </div>
                            <div className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400">Forecast 30d</div>
                        </div>
                        <div className="mt-8">
                            <div className="text-3xl font-black text-[var(--text-main)]">${(metrics?.forecastAmount || 0).toLocaleString()}</div>
                            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Projected Collections</p>
                            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Calculated future billing inflows pending execution between today and the coming 30 days.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATUS BREAKDOWN & DISTRIBUTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                {/* BAR CHART BREAKDOWN */}
                <div className="lg:col-span-8 rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Ledger Distribution by Invoice State</h3>
                        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>Analysis of payment status and outstanding balances</p>
                    </div>
                    
                    <div className="h-[250px] w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusCounts}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="name" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip 
                                    contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px', color: chartColors.tooltipText }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Invoices Count">
                                    {statusCounts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* QUICK STATS / COLLECTION POLICY GUIDE */}
                <div className="lg:col-span-4 rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div>
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Credit Risk Profile</h3>
                        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>System-wide collection guidelines & health indicators</p>
                    </div>
                    
                    <div className="space-y-4 mt-6">
                        <div className="p-3.5 rounded-2xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="text-xs font-bold uppercase tracking-wider text-red-500">Overdue Risk Warning</div>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Accounts exceeding 30+ days overdue are automatically flagged for direct fleet operations intervention.</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">Target Efficiency Goal</div>
                            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Maintain a system collection efficiency index of 95%+ monthly to ensure optimal branch liquidity.</p>
                        </div>
                        <div className="p-3.5 rounded-2xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="flex justify-between items-center">
                                <div className="text-xs font-bold uppercase tracking-wider text-indigo-500">Collection Efficiency Index</div>
                                <span className="text-xs font-black text-indigo-500">{efficiencyIndex.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, efficiencyIndex)}%` }}></div>
                            </div>
                            <p className="text-[10px] mt-1.5 opacity-70" style={{ color: 'var(--text-muted)' }}>Ratio of settled receipts against net total billing expected.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* MID-WAY LOGS: OVERDUE VS UPCOMING SPLIT VIEW */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                
                {/* TOP OVERDUE ITEMS LIST */}
                <div className="rounded-3xl p-6 border shadow-sm transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="text-red-500" size={18} /> Critical Aging Receivables</h3>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-red-500/10 text-red-500 uppercase">Highest Risk</span>
                    </div>
                    <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)' }}>
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                                <tr className="text-[11px] font-black tracking-wider uppercase border-b opacity-60" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <th className="py-4 pl-4 pr-2 w-10">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </th>
                                    <th className="py-4 px-3">Account / Fleet</th>
                                    <th className="py-4 px-3">Due Date</th>
                                    <th className="py-4 px-3 text-right">Aging</th>
                                    <th className="py-4 pr-4 pl-3 text-right">Arrears</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {recentOverdue.map(entry => (
                                    <tr key={entry.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-4 pr-2">
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </td>
                                        <td className="py-4 px-3">
                                            <div 
                                                className="font-bold cursor-pointer hover:underline text-blue-500 hover:text-blue-600"
                                                onClick={() => (entry.customerId || entry.driverId) && navigate(`${getRoutePrefix()}/customers/${entry.customerId || entry.driverId}`)}
                                            >
                                                {entry.customerName || entry.driverName}
                                            </div>
                                            <div className="text-[10px] font-medium tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                <span 
                                                    className="cursor-pointer hover:underline hover:text-blue-500"
                                                    onClick={() => navigate(`${getRoutePrefix()}/invoices/${entry.id}`)}
                                                >
                                                    {entry.invoiceNumber}
                                                </span>
                                                {entry.driverName && entry.driverName !== 'N/A' && entry.driverName !== entry.customerName && (
                                                    <>
                                                        {' • '}
                                                        <span className="opacity-70">Driver: {entry.driverName}</span>
                                                    </>
                                                )}
                                                {entry.fleetNumber && entry.fleetNumber !== 'N/A' && (
                                                    <>
                                                        {' • '}
                                                        <span 
                                                            className="cursor-pointer hover:underline hover:text-blue-500"
                                                            onClick={() => entry.vehicleId && navigate(`${getRoutePrefix()}/vehicles/${entry.vehicleId}`)}
                                                        >
                                                            Fleet #{entry.fleetNumber}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{format(new Date(entry.dueDate), 'MMM dd, yyyy')}</td>
                                        <td className="py-4 px-3 text-right"><span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">{entry.daysOverdue} Days</span></td>
                                        <td className="py-4 pr-4 pl-3 text-right font-black text-red-500">${entry.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {recentOverdue.length === 0 && (
                                    <tr><td colSpan={5} className="py-10 text-center text-sm font-bold opacity-50 uppercase tracking-widest">Fantastic. Perfect sheet, zero aging debts found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* UPCOMING INFLOWS LIST */}
                <div className="rounded-3xl p-6 border shadow-sm transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2"><Clock className="text-blue-400" size={18} /> Imminent Receivables (Forecast)</h3>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase">Next Inflow</span>
                    </div>
                    <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)' }}>
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                                <tr className="text-[11px] font-black tracking-wider uppercase border-b opacity-60" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <th className="py-4 pl-4 pr-2 w-10">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </th>
                                    <th className="py-4 px-3">Account / Fleet</th>
                                    <th className="py-4 px-3">Incoming Due</th>
                                    <th className="py-4 px-3 text-right">Target Value</th>
                                    <th className="py-4 pr-4 pl-3 text-right">Net Outstanding</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {upcomingPayments.map(entry => (
                                    <tr key={entry.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-4 pr-2">
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </td>
                                        <td className="py-4 px-3">
                                            <div 
                                                className="font-bold cursor-pointer hover:underline text-blue-500 hover:text-blue-600"
                                                onClick={() => (entry.customerId || entry.driverId) && navigate(`${getRoutePrefix()}/customers/${entry.customerId || entry.driverId}`)}
                                            >
                                                {entry.customerName || entry.driverName}
                                            </div>
                                            <div className="text-[10px] font-medium tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                                <span 
                                                    className="cursor-pointer hover:underline hover:text-blue-500"
                                                    onClick={() => navigate(`${getRoutePrefix()}/invoices/${entry.id}`)}
                                                >
                                                    {entry.invoiceNumber}
                                                </span>
                                                {entry.driverName && entry.driverName !== 'N/A' && entry.driverName !== entry.customerName && (
                                                    <>
                                                        {' • '}
                                                        <span className="opacity-70">Driver: {entry.driverName}</span>
                                                    </>
                                                )}
                                                {entry.fleetNumber && entry.fleetNumber !== 'N/A' && (
                                                    <>
                                                        {' • '}
                                                        <span 
                                                            className="cursor-pointer hover:underline hover:text-blue-500"
                                                            onClick={() => entry.vehicleId && navigate(`${getRoutePrefix()}/vehicles/${entry.vehicleId}`)}
                                                        >
                                                            Fleet #{entry.fleetNumber}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{format(new Date(entry.dueDate), 'MMM dd, yyyy')}</td>
                                        <td className="py-4 px-3 text-right font-bold" style={{ color: 'var(--text-muted)' }}>${entry.totalDue.toLocaleString()}</td>
                                        <td className="py-4 pr-4 pl-3 text-right font-black" style={{ color: 'var(--text-main)' }}>${entry.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {upcomingPayments.length === 0 && (
                                    <tr><td colSpan={5} className="py-10 text-center text-sm font-bold opacity-50 uppercase tracking-widest">No near-future billing queues pending execution.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* BOTTOM CORE LEDGER: COMPLETE PAGINATED GRID */}
            <div className="rounded-3xl p-6 border shadow-sm transition-colors"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* INTERACTIVE FILTER BAR FOR DATA TABLE */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold">Collections Ledger</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 md:min-w-[300px]">
                            <input 
                                type="text" 
                                placeholder="Search customer, plate, fleet, ID..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border py-2.5 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none focus:border-brand-lime transition-all"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                        </div>
                        
                        <div className="relative">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-4 pr-10 py-2 rounded-xl border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer transition-colors"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="" style={{ background: 'var(--bg-card)' }}>All Invoice States</option>
                                <option value="PENDING" style={{ background: 'var(--bg-card)' }}>Pending</option>
                                <option value="PARTIAL" style={{ background: 'var(--bg-card)' }}>Partial</option>
                                <option value="PAID" style={{ background: 'var(--bg-card)' }}>Settled</option>
                                <option value="OVERDUE" style={{ background: 'var(--bg-card)' }}>Overdue</option>
                            </select>
                            <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <FileText size={16} /> Export
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)' }}>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                            <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <th className="py-4 pl-4 pr-2 w-10">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="py-4 px-3">Sl No.</th>
                                <th className="py-4 px-3">Invoice #</th>
                                <th className="py-4 px-3">Customer Details</th>
                                <th className="py-4 px-3">Fleet / Asset</th>
                                <th className="py-4 px-3">Branch (Country)</th>
                                <th className="py-4 px-3">Due Date</th>
                                <th className="py-4 px-3 text-right">Billed</th>
                                <th className="py-4 px-3 text-right">Net Paid</th>
                                <th className="py-4 px-3 text-right">Balance</th>
                                <th className="py-4 pr-4 pl-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                             {listItems.map((item, index) => (
                                 <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                     <td className="py-4 pl-4 pr-2">
                                         <input type="checkbox" className="rounded border-gray-300" />
                                     </td>
                                     <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1 + (pagination.page - 1) * 10).toString().padStart(2, '0')}</td>
                                     <td 
                                         className="py-4 px-3 font-bold cursor-pointer hover:underline text-blue-500 hover:text-blue-600"
                                         onClick={() => navigate(`${getRoutePrefix()}/invoices/${item.id}`)}
                                     >
                                         {item.invoiceNumber}
                                     </td>
                                     <td 
                                         className="py-4 px-3 font-bold cursor-pointer hover:underline text-blue-500 hover:text-blue-600"
                                         onClick={() => (item.customerId || item.driverId) && navigate(`${getRoutePrefix()}/customers/${item.customerId || item.driverId}`)}
                                     >
                                         <div className="flex flex-col">
                                             <span>{item.customerName || item.driverName}</span>
                                             {item.driverName && item.driverName !== 'N/A' && item.driverName !== item.customerName && (
                                                 <span className="text-[9px] font-medium text-dim mt-0.5">Driver: {item.driverName}</span>
                                             )}
                                         </div>
                                     </td>
                                     <td className="py-4 px-3">
                                         <div 
                                             className="font-semibold cursor-pointer hover:underline hover:text-blue-500"
                                             onClick={() => item.vehicleId && navigate(`${getRoutePrefix()}/vehicles/${item.vehicleId}`)}
                                         >
                                             {item.vehicleNumber}
                                         </div>
                                         <div 
                                             className="text-[10px] uppercase font-black tracking-widest mt-0.5 cursor-pointer hover:underline hover:text-blue-500"
                                             onClick={() => item.vehicleId && navigate(`${getRoutePrefix()}/vehicles/${item.vehicleId}`)}
                                         >
                                             Fleet #{item.fleetNumber}
                                         </div>
                                     </td>
                                     <td className="py-4 px-3">
                                         <div className="font-medium" style={{ color: 'var(--text-main)' }}>{item.branch}</div>
                                         <div className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.country}</div>
                                     </td>
                                     <td className="py-4 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>{format(new Date(item.dueDate), 'MM/dd/yyyy')}</td>
                                     <td className="py-4 px-3 text-right font-semibold" style={{ color: 'var(--text-muted)' }}>${item.totalAmountDue.toLocaleString()}</td>
                                     <td className="py-4 px-3 text-right font-bold text-green-500">${item.amountPaid.toLocaleString()}</td>
                                     <td className="py-4 px-3 text-right font-black" style={{ color: 'var(--text-main)' }}>${item.balance.toLocaleString()}</td>
                                     <td className="py-4 pr-4 pl-3 text-center">
                                         <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                             item.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                                             item.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500' :
                                             item.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-500/10 text-gray-500'
                                         }`}>
                                             • {item.status}
                                         </span>
                                     </td>
                                 </tr>
                             ))}
                            {listItems.length === 0 && !listLoading && (
                                <tr><td colSpan={11} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">No collections invoices match chosen filter matrix. Try relaxing boundaries.</td></tr>
                            )}
                            {listLoading && (
                                <tr><td colSpan={11} className="py-12 text-center"><div className="animate-pulse font-bold text-[#D4F12E] uppercase tracking-widest text-sm">Refreshing record arrays...</div></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2">
                        <select className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer shadow-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <option value="10" style={{ background: 'var(--bg-card)' }}>10 ˅</option>
                            <option value="50" style={{ background: 'var(--bg-card)' }}>50 ˅</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold">
                        <button 
                            disabled={pagination.page <= 1}
                            onClick={() => loadList(pagination.page - 1)}
                            className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {'<'}
                        </button>
                        {getPageNumbers().map((item, index) => {
                            if (typeof item === 'string') {
                                return (
                                    <span key={`ellipsis-${index}`} className="px-1 text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                        ...
                                    </span>
                                );
                            }
                            return (
                                <button 
                                    key={item}
                                    onClick={() => loadList(item)}
                                    className={`px-2.5 py-1 rounded ${pagination.page === item ? 'bg-[#D4F12E] text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    {item.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                        <button 
                            disabled={pagination.page >= pagination.pages}
                            onClick={() => loadList(pagination.page + 1)}
                            className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {'>'}
                        </button>
                    </div>
                </div>

            </div>

        </div>
    );
};

// Helper Visual Components matching Dashboard specs
const MetricStatCard = ({ title, value, description, icon, iconBg, highlight }: any) => (
    <div className={`rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:-translate-y-1 duration-300 transition-all`}
         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="flex justify-between items-start">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
        </div>
        <div className="mt-6">
            <div className={`text-3xl font-black leading-none tracking-tight ${highlight ? 'text-red-500' : ''}`} style={{ color: highlight ? undefined : 'var(--text-main)' }}>{value}</div>
            <p className="text-[11px] font-black tracking-wider uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
            <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
    </div>
);

const CollectionsDashboardSkeleton = () => (
    <div className="p-6 md:p-8 min-h-screen transition-all duration-300 animate-pulse" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        {/* Breadcrumbs placeholder */}
        <div className="h-4 w-48 bg-white/5 rounded-lg mb-4" />

        {/* Compact Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 mb-6">
            <div className="space-y-2">
                <div className="h-7 w-48 bg-white/10 rounded-lg" />
                <div className="h-4 w-96 max-w-full bg-white/5 rounded-lg" />
            </div>
        </div>

        {/* Control Board Filters Skeleton */}
        <div className="shadow-sm border p-2.5 rounded-2xl flex flex-wrap items-center gap-3 w-full xl:w-auto mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
            <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/5" />
            <div className="h-10 w-36 bg-white/5 rounded-xl border border-white/5" />
            <div className="h-10 w-48 bg-white/5 rounded-xl border border-white/5" />
        </div>

        {/* Metric Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="rounded-3xl p-6 border shadow-sm flex flex-col justify-between h-[160px]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="w-11 h-11 rounded-2xl bg-white/5" />
                    <div className="mt-6 space-y-2">
                        <div className="h-8 w-24 bg-white/10 rounded" />
                        <div className="h-3 w-28 bg-white/5 rounded" />
                        <div className="h-3.5 w-32 bg-white/5 rounded" />
                    </div>
                </div>
            ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Area Chart Card Skeleton */}
            <div className="lg:col-span-8 rounded-3xl p-6 border h-[380px] flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="h-5 w-40 bg-white/10 rounded" />
                <div className="h-[280px] bg-white/5 rounded-2xl flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-white/5 border-t-white/10 animate-spin" />
                </div>
            </div>

            {/* Bar Chart Card Skeleton */}
            <div className="lg:col-span-4 rounded-3xl p-6 border h-[380px] flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="h-5 w-32 bg-white/10 rounded" />
                <div className="h-[280px] bg-white/5 rounded-2xl flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-4 border-white/5 border-t-white/10 animate-spin" />
                </div>
            </div>
        </div>

        {/* Bottom tables skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {[1, 2].map(idx => (
                <div key={idx} className="lg:col-span-6 rounded-3xl p-6 border h-[340px] flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="h-5 w-40 bg-white/10 rounded" />
                    <div className="h-56 bg-white/5 rounded-2xl mt-4 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-4 border-white/5 border-t-white/10 animate-spin" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default CollectionsDashboard;
