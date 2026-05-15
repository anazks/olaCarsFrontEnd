import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, AreaChart, Area
} from 'recharts';
import {
    Car, Users, DollarSign, ShieldAlert, ArrowUpRight, Calendar,
    MapPin, Building, ChevronRight, Briefcase, CheckCircle, TrendingUp, Wallet, FilterX
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { format, startOfMonth } from 'date-fns';

// Context & Services
// import { useTheme } from '../../context/ThemeContext';
import { getFinancialDashboardSummary } from '../../services/dashboardService';
import { getAllBranches } from '../../services/branchService';

// import { useTheme } from '../../context/ThemeContext';

const FinancialAdminDashboard = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    
    // Computed Colors for Recharts based on active theme
    const isDark = theme === 'dark';
    const chartColors = {
        grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        text: isDark ? '#94A3B8' : '#64748B',
        tooltipBg: isDark ? '#1C1C1C' : '#FFFFFF',
        tooltipBorder: isDark ? '#2A2A2A' : '#E5E7EB',
        tooltipText: isDark ? '#FFFFFF' : '#0A0A0A',
    };
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [allBranches, setAllBranches] = useState<any[]>([]);

    // New Tabs State
    const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'collections'>('overview');

    // Set Initial Filter state with current month's span so inputs aren't blank
    const [filters, setFilters] = useState({
        country: '',
        branch: '',
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });

    // 1. Fetch Config
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const bRes = await getAllBranches({ limit: 1000 });
                setAllBranches(bRes.data || []);
            } catch (err) {
                console.error('Error loading configs', err);
            }
        };
        loadConfig();
    }, []);

    // 2. Filter Lookups
    const availableCountries = useMemo(() => {
        const list = allBranches.map(b => b.country).filter(c => !!c);
        return Array.from(new Set(list)).sort();
    }, [allBranches]);

    const filteredBranches = useMemo(() => {
        if (!filters.country) return allBranches;
        return allBranches.filter(b => b.country === filters.country);
    }, [filters.country, allBranches]);

    // Reset child filter if parent changes and child becomes invalid
    useEffect(() => {
        if (filters.branch) {
            const match = filteredBranches.find(b => b._id === filters.branch);
            if (!match) setFilters(prev => ({ ...prev, branch: '' }));
        }
    }, [filters.country, filteredBranches]);

    // 3. Primary Data Fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getFinancialDashboardSummary(filters);
            setDashboardData(data);
        } catch (error) {
            console.error('Error loading dashboard metrics', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.country, filters.branch, filters.startDate, filters.endDate]);

    const handleFilterChange = (key: string, val: string) => {
        setFilters(prev => ({ ...prev, [key]: val }));
    };

    if (loading && !dashboardData) {
        return (
            <div
                className="h-screen w-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--bg-main)' }}
            >
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#C8E600]"></div>
            </div>
        );
    }

    const { stats, alerts, fleetStatus, revenueOverview, overduePayments, vehicleMovement } = dashboardData || {};
    const totalVehicles = dashboardData?.totalVehicles || 0;
    const utilizationRate = totalVehicles > 0 ? Math.round(((fleetStatus?.rented || 0) / totalVehicles) * 100) : 0;
    const currentTotalRevenue = (revenueOverview || []).reduce((a: any, b: any) => a + (b.currentYear || 0), 0);

    const donutData = [
        { name: 'Available', value: fleetStatus?.available || 0, color: '#C8E600' }, // Brand Lime
        { name: 'Maintenance', value: fleetStatus?.maintenance || 0, color: '#E67E22' },
        { name: 'Rented', value: fleetStatus?.rented || 0, color: '#3B82F6' },
        { name: 'Retired', value: fleetStatus?.retired || 0, color: '#94A3B8' }
    ].filter(i => i.value > 0);

    return (
        <div
            className="p-6 md:p-8 min-h-screen transition-colors duration-300"
            style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >

            {/* HEADER SECTION */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        <Briefcase className="text-[#C8E600]" /> Financial Dashboard
                    </h1>
                    <p className="font-medium" style={{ color: 'var(--text-dim)' }}>Ecosystem Telemetry</p>
                </div>

                {/* FILTER WIDGET (Mapped to app background standards) */}
                <div
                    className="shadow-sm border p-2 rounded-2xl flex flex-wrap items-center gap-3 w-full lg:w-auto transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >

                    {/* Dynamic Country */}
                    <div className="relative">
                        <select
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer transition-colors"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Countries</option>
                            {availableCountries.map(c => <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>)}
                        </select>
                        <MapPin size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                    {/* Cascaded Branch */}
                    <div className="relative">
                        <select
                            value={filters.branch}
                            onChange={(e) => handleFilterChange('branch', e.target.value)}
                            className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer max-w-[160px] transition-colors"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Branches</option>
                            {filteredBranches.map(b => <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)' }}>{b.name}</option>)}
                        </select>
                        <Building size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    </div>

                    <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                    {/* Explicit Date Range Inputs */}
                    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-colors" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <Calendar size={15} style={{ color: 'var(--text-dim)' }} />
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer transition-colors"
                            style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>-</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer transition-colors"
                            style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }}
                        />
                        {(filters.startDate || filters.endDate) && (
                            <button onClick={() => setFilters(p => ({ ...p, startDate: '', endDate: '' }))} className="ml-1 text-red-500 hover:text-red-600">
                                <FilterX size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 1. PRIMARY METRIC ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

                {/* Large Stats Grid */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <DashboardStatCard
                        title="Total Active Vehicles"
                        value={(stats?.totalActiveVehicles || 0).toLocaleString()}
                        trend="+4.6%"
                        trendUp={true}
                        icon={<Car className="text-[#C8E600]" />}
                        iconBg="bg-[#C8E600]/10"
                    />
                    <DashboardStatCard
                        title="Monthly Revenue"
                        value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
                        trend="+12.3%"
                        trendUp={true}
                        icon={<DollarSign className="text-emerald-500" />}
                        iconBg="bg-emerald-500/10"
                    />
                    <DashboardStatCard
                        title="Pending Collections"
                        value={`$${(stats?.outstandingCollections || 0).toLocaleString()}`}
                        trend="-3.8%"
                        trendUp={false}
                        icon={<Briefcase className="text-orange-500" />}
                        iconBg="bg-orange-500/10"
                    />
                    <DashboardStatCard
                        title="Active Drivers"
                        value={(stats?.activeDrivers || 0).toLocaleString()}
                        trend="+2.1%"
                        trendUp={true}
                        icon={<Users className="text-blue-500" />}
                        iconBg="bg-blue-500/10"
                    />
                </div>

                {/* Alerts Side Strip */}
                <div
                    className="lg:col-span-4 rounded-3xl p-6 shadow-sm border flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold">Priority Alerts</h3>
                        <button 
                            onClick={() => navigate('alerts')}
                            className="p-2 rounded-xl bg-white text-black shadow-sm border border-gray-100 hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center"
                            title="View All Alerts"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-3 flex-1 justify-center">
                        <AlertPill title="Critical" count={alerts?.CRITICAL || 0} colorClass="bg-red-600" desc="Incident response required" onClick={() => navigate('alerts')} />
                        <AlertPill title="Major" count={alerts?.MAJOR || 0} colorClass="bg-orange-500" desc="Pending reconciliation tasks" onClick={() => navigate('alerts')} />
                        <AlertPill title="Minor" count={alerts?.MINOR || 0} colorClass="bg-blue-600" desc="General fleet notifications" onClick={() => navigate('alerts')} />
                    </div>
                </div>
            </div>

            {/* ── 2. ANALYTICS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                {/* Main Revenue Chart */}
                <div
                    className="lg:col-span-8 rounded-3xl p-6 shadow-sm border transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold">Revenue Breakdown</h3>
                            <div className="flex gap-4 text-xs font-semibold mt-1" style={{ color: 'var(--text-dim)' }}>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: isDark ? '#4B5563' : '#CBD5E1' }}></div> Prev Year</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#C8E600]"></div> Curr Year</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Total Ledger Income</p>
                            <h4 className="text-2xl font-black text-[#C8E600] mt-1">${currentTotalRevenue.toLocaleString()}</h4>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Expected Dues</p>
                            <h4 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>${(stats?.outstandingCollections || 0).toLocaleString()}</h4>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Collection Rate</p>
                            <h4 className="text-2xl font-black text-emerald-500 mt-1">{stats?.collectionCompliance || 94}%</h4>
                        </div>
                    </div>

                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={revenueOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C8E600" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#C8E600" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartColors.grid} />
                                <XAxis dataKey="name" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: '12px', color: chartColors.tooltipText }}
                                    itemStyle={{ color: '#C8E600' }}
                                    labelStyle={{ color: chartColors.text }}
                                />
                                <Area type="monotone" dataKey="previousYear" stroke={isDark ? "#64748B" : "#94A3B8"} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                                <Area type="monotone" dataKey="currentYear" stroke="#C8E600" strokeWidth={4} fillOpacity={1} fill="url(#brandGrad)" dot={{ fill: '#C8E600', r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fleet Donut */}
                <div
                    className="lg:col-span-4 rounded-3xl p-6 shadow-sm border flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h3 className="text-lg font-bold">Fleet Utilization</h3>
                    <p className="text-xs font-medium mb-6" style={{ color: 'var(--text-dim)' }}>Distribution snapshot</p>

                    <div className="h-[220px] relative flex items-center justify-center flex-1">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={donutData} innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}>
                                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>{totalVehicles}</span>
                            <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>TOTAL</span>
                        </div>

                        <div
                            className="absolute right-0 top-2 rounded-xl p-2 text-center shadow-lg border transition-colors"
                            style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-dim)' }}>In Use</div>
                            <div className="text-lg font-black text-[#C8E600]">{utilizationRate}%</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                        {donutData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    {item.name}
                                </div>
                                <div className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 3. BOTTOM SECTION: FUNCTIONAL TABS & TABLE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

                {/* Interactive Detailed Metrics Card */}
                <div
                    className="lg:col-span-7 rounded-3xl shadow-sm border overflow-hidden flex flex-col min-h-[300px] transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >

                    {/* Functional Tab Headers */}
                    <div className="flex border-b px-6 pt-4 gap-8" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[#C8E600] text-[#C8E600]' : 'border-transparent hover:text-[#C8E600]'}`}
                            style={{ color: activeTab === 'overview' ? '#C8E600' : 'var(--text-dim)' }}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('vehicles')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'vehicles' ? 'border-[#C8E600] text-[#C8E600]' : 'border-transparent hover:text-[#C8E600]'}`}
                            style={{ color: activeTab === 'vehicles' ? '#C8E600' : 'var(--text-dim)' }}
                        >
                            Vehicles
                        </button>
                        <button
                            onClick={() => setActiveTab('collections')}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'collections' ? 'border-[#C8E600] text-[#C8E600]' : 'border-transparent hover:text-[#C8E600]'}`}
                            style={{ color: activeTab === 'collections' ? '#C8E600' : 'var(--text-dim)' }}
                        >
                            Collections
                        </button>
                    </div>

                    <div className="p-8 flex-1 flex flex-col justify-center transition-all duration-300">

                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x w-full items-center animate-fadeIn gap-6 md:gap-0" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="pb-6 md:pb-0 md:pr-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600] flex-shrink-0"><TrendingUp size={24} /></div>
                                        <div className="min-w-0">
                                            <div className="text-2xl sm:text-3xl font-black truncate" style={{ color: 'var(--text-main)' }}>${(stats?.monthlyRevenue || 0).toLocaleString()}</div>
                                            <div className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Collected Revenue</div>
                                        </div>
                                    </div>
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>Summary generated based on actual payment settlements deposited in specified date window.</p>
                                </div>
                                <div className="py-6 md:py-0 md:px-6 text-center flex flex-col items-center justify-center" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="text-4xl font-black text-[#C8E600] mb-2">{stats?.collectionCompliance || 94}%</div>
                                    <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Realization</div>
                                    <div className="w-full h-1.5 rounded-full overflow-hidden max-w-[100px]" style={{ background: 'var(--bg-input)' }}>
                                        <div className="h-full bg-[#C8E600]" style={{ width: `${stats?.collectionCompliance || 94}%` }}></div>
                                    </div>
                                </div>
                                <div className="pt-6 md:pt-0 md:pl-6" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="text-2xl font-black mb-1 truncate" style={{ color: 'var(--text-main)' }}>${(stats?.outstandingBalance || 0).toLocaleString()}</div>
                                    <div className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-2">Awaiting Settlement</div>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Accumulated ledger deficit currently flagged for recovery pipeline tracking.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'vehicles' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x w-full items-center animate-fadeIn gap-6 md:gap-0" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="pb-6 md:pb-0 md:pr-6">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0"><Car size={24} /></div>
                                        <div className="min-w-0">
                                            <div className="text-2xl sm:text-3xl font-black truncate" style={{ color: 'var(--text-main)' }}>{totalVehicles}</div>
                                            <div className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Total Global Fleet</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="py-6 md:py-0 md:px-6 flex flex-col justify-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Rented Out</span> <span className="text-lg font-bold text-blue-500">{fleetStatus?.rented || 0}</span></div>
                                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Standby Yard</span> <span className="text-lg font-bold text-[#C8E600]">{fleetStatus?.available || 0}</span></div>
                                </div>
                                <div className="pt-6 md:pt-0 md:pl-6 flex flex-col justify-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Workshops</span> <span className="text-lg font-bold text-orange-500">{fleetStatus?.maintenance || 0}</span></div>
                                    <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Decommissioned</span> <span className="text-lg font-bold" style={{ color: 'var(--text-dim)' }}>{fleetStatus?.retired || 0}</span></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'collections' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x w-full items-center animate-fadeIn gap-6 md:gap-0" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="pb-6 md:pb-0 md:pr-6 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0"><Wallet size={32} /></div>
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm uppercase font-bold mb-1" style={{ color: 'var(--text-dim)' }}>Recovered Funds</div>
                                        <div className="text-3xl sm:text-4xl font-black truncate" style={{ color: 'var(--text-main)' }}>${(stats?.monthlyRevenue || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="pt-6 md:pt-0 md:pl-6 flex items-center gap-4" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 flex-shrink-0"><ShieldAlert size={32} /></div>
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm uppercase font-bold mb-1" style={{ color: 'var(--text-dim)' }}>Overdue Arrears</div>
                                        <div className="text-3xl sm:text-4xl font-black text-red-500 truncate">${(stats?.outstandingCollections || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Dynamic Overdue Table */}
                <div
                    className="lg:col-span-5 rounded-3xl p-6 shadow-sm border transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h3 className="text-lg font-bold mb-4 flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                        Recent Arrears
                        {overduePayments?.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs">{overduePayments.length} Accounts</span>}
                    </h3>
                    <div className="overflow-x-auto max-h-[220px] custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-bold uppercase border-b transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    <th className="pb-3">Driver / Asset</th>
                                    <th className="pb-3 text-right">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs divide-y transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                {overduePayments?.map((pay: any, i: number) => (
                                    <tr key={i} className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-3 font-bold truncate max-w-[150px]">
                                            {pay.customerName}
                                            <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>{pay.vehicleNumber}</div>
                                        </td>
                                        <td className="py-3 text-right font-black text-red-500 text-sm">
                                            ${pay.amount?.toLocaleString()}
                                            <div className="text-[9px] font-bold mt-0.5" style={{ color: 'var(--text-dim)' }}>{pay.daysOverdue}d due</div>
                                        </td>
                                    </tr>
                                ))}
                                {(!overduePayments || overduePayments.length === 0) && (
                                    <tr><td colSpan={2} className="text-center py-10 font-medium italic" style={{ color: 'var(--text-dim)' }}>Clean sheet. No active accounts in arrears.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── 4. FULL WIDTH MOVEMENT TREND ── */}
            <div
                className="lg:col-span-12 rounded-3xl p-6 shadow-sm border transition-colors"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <h3 className="text-lg font-black tracking-wide uppercase mb-6" style={{ color: 'var(--text-main)' }}>Vehicle Movement Flow</h3>
                <div className="h-[350px] w-full">
                    {vehicleMovement && vehicleMovement.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={vehicleMovement} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => format(new Date(str), 'MM/dd')}
                                    fontSize={11}
                                    stroke={chartColors.text}
                                    axisLine={false}
                                />
                                <YAxis stroke={chartColors.text} fontSize={12} axisLine={false} tickLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, color: chartColors.tooltipText, borderRadius: '8px' }}
                                    labelStyle={{ color: chartColors.text }}
                                />
                                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: chartColors.text }} />
                                <Line type="stepAfter" dataKey="removed" stroke="#E67E22" strokeWidth={4} dot={{ r: 3 }} name="Derailed" />
                                <Line type="monotone" dataKey="returned" stroke="#3B82F6" strokeWidth={4} dot={{ r: 3 }} name="Returned" />
                                <Line type="monotone" dataKey="sale" stroke="#C8E600" strokeWidth={5} dot={{ r: 4, fill: '#000', strokeWidth: 2 }} name="Deployed" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center italic border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Waiting for historical fleet movement logs.</div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>

        </div>
    );
};

// ── HELPER COMPONENTS TIED TO APP DARK THEME VARS ──

const DashboardStatCard = ({ title, value, trend, trendUp, icon, iconBg }: any) => (
    <div
        className="rounded-3xl p-6 shadow-sm flex flex-col justify-between border transition-all hover:-translate-y-1 duration-300"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
    >
        <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {trendUp ? <ArrowUpRight size={12} /> : <div className="rotate-90"><ArrowUpRight size={12} /></div>} {trend}
            </div>
        </div>
        <div className="mt-8">
            <div className="text-3xl font-black leading-none tracking-tight" style={{ color: 'var(--text-main)' }}>{value}</div>
            <div className="text-sm font-bold mt-2 uppercase tracking-wider text-[11px]" style={{ color: 'var(--text-dim)' }}>{title}</div>
        </div>
    </div>
);

const AlertPill = ({ title, count, colorClass, desc }: any) => (
    <div className={`${colorClass} text-white rounded-2xl p-4 flex items-center shadow-md relative overflow-hidden group`}>
        <div className="flex-1 relative z-10">
            <div className="font-black text-xl leading-none">{count}</div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">{title} Notifications</div>
            <div className="text-[10px] opacity-80 mt-0.5">{desc}</div>
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center relative z-10">
            <ChevronRight size={18} />
        </div>
        <div className="absolute right-[-10px] bottom-[-10px] text-white opacity-10 transform rotate-[-12deg]">
            <ShieldAlert size={64} />
        </div>
    </div>
);

export default FinancialAdminDashboard;
