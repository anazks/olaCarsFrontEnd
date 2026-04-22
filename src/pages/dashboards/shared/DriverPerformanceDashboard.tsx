import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Gauge, Zap, TrendingUp, ShieldCheck, CreditCard, AlertCircle, Search, ChevronDown, ChevronUp, Building2, Filter, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Eye } from 'lucide-react';
import { getAllDrivers } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getAllBranches } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────
type SortKey = 'name' | 'drivingScore' | 'avgSpeed' | 'totalDistance' | 'fuelEfficiency' | 'safetyTotal' | 'outstanding' | 'weeklyRent';
type SortDir = 'asc' | 'desc';

interface DriverMetrics {
    driver: Driver;
    branchName: string;
    outstanding: number;
    overdue: number;
    totalPaid: number;
    collectionRate: number;
    safetyTotal: number;
    currentWeekStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'N/A';
    weeklyRent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────
const deduplicateRent = (tracking: Driver['rentTracking']): NonNullable<Driver['rentTracking']> => {
    if (!tracking || tracking.length === 0) return [];
    return tracking.reduce((acc: NonNullable<Driver['rentTracking']>, current) => {
        const existing = acc.find(item => item.weekNumber === current.weekNumber);
        if (!existing) {
            acc.push(current);
        } else if ((current.amountPaid || 0) > (existing.amountPaid || 0)) {
            const idx = acc.indexOf(existing);
            acc[idx] = current;
        }
        return acc;
    }, []);
};

const computeDriverMetrics = (driver: Driver): Omit<DriverMetrics, 'branchName'> => {
    const deduped = deduplicateRent(driver.rentTracking);
    const now = new Date();

    const outstanding = deduped.reduce((acc, r) => {
        const base = r.totalDue || r.amount || 0;
        const paid = r.amountPaid || 0;
        return acc + Math.max(0, base - paid);
    }, 0);

    const overdue = deduped
        .filter(r => r.status !== 'PAID' && r.dueDate && new Date(r.dueDate) < now)
        .reduce((acc, r) => {
            const base = r.totalDue || r.amount || 0;
            const paid = r.amountPaid || 0;
            return acc + Math.max(0, base - paid);
        }, 0);

    const totalPaid = deduped.reduce((acc, r) => acc + (r.amountPaid || 0), 0);
    const totalDue = deduped.reduce((acc, r) => acc + (r.totalDue || r.amount || 0), 0);
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

    const safetyTotal = (driver.performance?.safetyEvents?.braking || 0) +
        (driver.performance?.safetyEvents?.speeding || 0) +
        (driver.performance?.safetyEvents?.acceleration || 0);

    // Current week status
    const pendingSorted = deduped
        .filter(r => r.status !== 'PAID')
        .sort((a, b) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            return a.weekNumber - b.weekNumber;
        });

    let currentWeekStatus: DriverMetrics['currentWeekStatus'] = 'N/A';
    if (pendingSorted.length > 0) {
        const next = pendingSorted[0];
        const isOverdue = next.dueDate && new Date(next.dueDate) < now;
        if (isOverdue) currentWeekStatus = 'OVERDUE';
        else if (next.status === 'PARTIAL') currentWeekStatus = 'PARTIAL';
        else currentWeekStatus = 'PENDING';
    } else if (deduped.length > 0) {
        currentWeekStatus = 'PAID';
    }

    // Weekly rent from the first tracking entry
    const weeklyRent = deduped.length > 0 ? deduped[0].amount : 0;

    return { driver, outstanding, overdue, totalPaid, collectionRate, safetyTotal, currentWeekStatus, weeklyRent };
};

// ─── Main Component ───────────────────────────────────────────────────
const DriverPerformanceDashboard = () => {
    const navigate = useNavigate();
    const currentUser = getUser();
    const userRole = getUserRole();

    const isGlobalRole = ['admin', 'countrymanager', 'operationadmin', 'financeadmin'].includes(userRole || '');
    const isBranchScoped = ['branchmanager', 'financestaff', 'operationstaff'].includes(userRole || '');

    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('outstanding');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // Fetch branches for filter dropdown (global roles)
                if (isGlobalRole) {
                    const branchRes = await getAllBranches({ limit: 100 });
                    setBranches(branchRes.data || []);
                }

                // Build filter params
                const filters: any = { status: 'ACTIVE', limit: 500 };
                if (isBranchScoped && currentUser?.branch) {
                    filters.branch = typeof currentUser.branch === 'object' ? currentUser.branch._id : currentUser.branch;
                }

                const res = await getAllDrivers(filters);
                setDrivers(res.data || []);
            } catch (error) {
                console.error('Error fetching driver data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Process metrics
    const driverMetrics: DriverMetrics[] = useMemo(() => {
        return drivers.map(d => {
            const metrics = computeDriverMetrics(d);
            const branchName = typeof d.branch === 'object' ? (d.branch as any).name : 'Unknown';
            return { ...metrics, branchName };
        });
    }, [drivers]);

    // Filter + search + sort
    const filteredMetrics = useMemo(() => {
        let filtered = driverMetrics;

        // Branch filter
        if (selectedBranch !== 'all') {
            filtered = filtered.filter(m => {
                const branchId = typeof m.driver.branch === 'object' ? (m.driver.branch as any)._id : m.driver.branch;
                return branchId === selectedBranch;
            });
        }

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(m =>
                m.driver.personalInfo?.fullName?.toLowerCase().includes(q) ||
                m.branchName.toLowerCase().includes(q)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal: number, bVal: number;
            switch (sortKey) {
                case 'name':
                    const nameA = a.driver.personalInfo?.fullName || '';
                    const nameB = b.driver.personalInfo?.fullName || '';
                    return sortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                case 'drivingScore':
                    aVal = a.driver.performance?.drivingScore || 0;
                    bVal = b.driver.performance?.drivingScore || 0;
                    break;
                case 'avgSpeed':
                    aVal = a.driver.performance?.avgSpeed || 0;
                    bVal = b.driver.performance?.avgSpeed || 0;
                    break;
                case 'totalDistance':
                    aVal = a.driver.performance?.totalDistance || 0;
                    bVal = b.driver.performance?.totalDistance || 0;
                    break;
                case 'fuelEfficiency':
                    aVal = a.driver.performance?.fuelEfficiency || 0;
                    bVal = b.driver.performance?.fuelEfficiency || 0;
                    break;
                case 'safetyTotal':
                    aVal = a.safetyTotal;
                    bVal = b.safetyTotal;
                    break;
                case 'outstanding':
                    aVal = a.outstanding;
                    bVal = b.outstanding;
                    break;
                case 'weeklyRent':
                    aVal = a.weeklyRent;
                    bVal = b.weeklyRent;
                    break;
                default:
                    return 0;
            }
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [driverMetrics, selectedBranch, searchQuery, sortKey, sortDir]);

    // Pagination
    const paginatedMetrics = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredMetrics.slice(start, start + pageSize);
    }, [filteredMetrics, currentPage]);

    const totalPages = Math.ceil(filteredMetrics.length / pageSize);

    // KPI Aggregates
    const kpis = useMemo(() => {
        const fm = filteredMetrics;
        const count = fm.length;
        const avgScore = count > 0 ? fm.reduce((a, m) => a + (m.driver.performance?.drivingScore || 0), 0) / count : 0;
        const avgSpeed = count > 0 ? fm.reduce((a, m) => a + (m.driver.performance?.avgSpeed || 0), 0) / count : 0;
        const totalOutstanding = fm.reduce((a, m) => a + m.outstanding, 0);
        const totalOverdue = fm.reduce((a, m) => a + m.overdue, 0);
        const totalCollected = fm.reduce((a, m) => a + m.totalPaid, 0);
        const totalSafetyEvents = fm.reduce((a, m) => a + m.safetyTotal, 0);
        const totalBraking = fm.reduce((a, m) => a + (m.driver.performance?.safetyEvents?.braking || 0), 0);
        const totalSpeeding = fm.reduce((a, m) => a + (m.driver.performance?.safetyEvents?.speeding || 0), 0);
        const totalAcceleration = fm.reduce((a, m) => a + (m.driver.performance?.safetyEvents?.acceleration || 0), 0);
        const overdueDrivers = fm.filter(m => m.overdue > 0).length;
        const paidUpDrivers = fm.filter(m => m.currentWeekStatus === 'PAID').length;

        // Payment Driver Statuses
        const statusCounts = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0, 'N/A': 0 };
        fm.forEach(m => {
            if (m.currentWeekStatus in statusCounts) {
                statusCounts[m.currentWeekStatus as keyof typeof statusCounts]++;
            }
        });
        const paymentData = [
            { name: 'Fully Paid', value: statusCounts.PAID, color: '#22c55e' },
            { name: 'Partial', value: statusCounts.PARTIAL, color: '#eab308' },
            { name: 'Pending', value: statusCounts.PENDING, color: '#3b82f6' },
            { name: 'Overdue', value: statusCounts.OVERDUE, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Score Buckets
        const scoreBuckets = { 'Needs Attention (<60)': 0, 'Good (60-79)': 0, 'Excellent (80+)': 0 };
        fm.forEach(m => {
            const s = m.driver.performance?.drivingScore || 0;
            if (s >= 80) scoreBuckets['Excellent (80+)']++;
            else if (s >= 60) scoreBuckets['Good (60-79)']++;
            else scoreBuckets['Needs Attention (<60)']++;
        });
        const scoreData = Object.keys(scoreBuckets).map(k => ({
            name: k,
            Drivers: scoreBuckets[k as keyof typeof scoreBuckets],
            fill: k.includes('Excellent') ? '#22c55e' : k.includes('Good') ? '#eab308' : '#ef4444'
        }));

        // Fleet Rents Overall Amounts
        const rentData = [
            { name: 'Collected', value: totalCollected, color: '#22c55e' },
            { name: 'Pending', value: Math.max(0, totalOutstanding - totalOverdue), color: '#3b82f6' },
            { name: 'Overdue', value: totalOverdue, color: '#ef4444' },
        ].filter(d => d.value > 0);

        // Distance Covered
        const distanceBuckets = { '0-500km': 0, '500-2000km': 0, '2000-5000km': 0, '5000km+': 0 };
        fm.forEach(m => {
            const d = m.driver.performance?.totalDistance || 0;
            if (d < 500) distanceBuckets['0-500km']++;
            else if (d < 2000) distanceBuckets['500-2000km']++;
            else if (d < 5000) distanceBuckets['2000-5000km']++;
            else distanceBuckets['5000km+']++;
        });
        const distanceData = Object.keys(distanceBuckets).map(k => ({
            name: k,
            Drivers: distanceBuckets[k as keyof typeof distanceBuckets],
            fill: '#C8E600'
        }));

        return {
            count, avgScore, avgSpeed, totalOutstanding, totalOverdue, totalCollected,
            totalSafetyEvents, totalBraking, totalSpeeding, totalAcceleration,
            overdueDrivers, paidUpDrivers,
            chartData: { paymentData, scoreData, rentData, distanceData }
        };
    }, [filteredMetrics]);

    // Sort handler
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <ChevronDown size={12} className="opacity-30" />;
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-lime" /> : <ChevronDown size={12} className="text-brand-lime" />;
    };

    const navigateToDriver = (driverId: string) => {
        navigate(`../drivers/${driverId}`);
    };

    // Payment status badge
    const StatusBadge = ({ status }: { status: DriverMetrics['currentWeekStatus'] }) => {
        const styles: Record<string, string> = {
            'PAID': 'bg-brand-lime/10 text-brand-lime border-brand-lime/20',
            'PARTIAL': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            'PENDING': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'OVERDUE': 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
            'N/A': 'bg-white/5 text-dim border-white/10',
        };
        return (
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${styles[status]}`}>
                {status}
            </span>
        );
    };

    // Score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-brand-lime';
        if (score >= 60) return 'text-yellow-400';
        if (score >= 40) return 'text-orange-400';
        return 'text-red-500';
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6 animate-pulse">
                <div className="h-10 w-72 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }} />
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-32 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                    ))}
                </div>
                <div className="h-96 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
            </div>
        );
    }

    return (
        <div className="p-6 container-responsive space-y-8">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-2xl bg-brand-lime/10 text-brand-lime">
                            <BarChart3 size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                Fleet Performance
                            </h1>
                            <p className="text-xs font-medium opacity-60">
                                Collective driver overview — Performance · Payments · Safety
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Branch Filter */}
                    {isGlobalRole && branches.length > 0 && (
                        <div className="relative">
                            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                            <select
                                value={selectedBranch}
                                onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                className="pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-brand-lime transition-all appearance-none cursor-pointer"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="all">All Branches</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                        <input
                            type="text"
                            placeholder="Search driver..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-9 pr-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-brand-lime transition-all w-56"
                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KPICard
                    label="Active Drivers"
                    value={kpis.count.toString()}
                    icon={<Users size={22} />}
                    color="text-brand-lime"
                    bgColor="bg-brand-lime/5"
                    borderColor="border-brand-lime/20"
                    sub={`${kpis.paidUpDrivers} fully paid`}
                />
                <KPICard
                    label="Fleet Score"
                    value={`${Math.round(kpis.avgScore)}/100`}
                    icon={<ShieldCheck size={22} />}
                    color={getScoreColor(kpis.avgScore)}
                    bgColor="bg-green-500/5"
                    borderColor="border-green-500/20"
                    sub={kpis.avgScore >= 80 ? 'Excellent' : kpis.avgScore >= 60 ? 'Good' : 'Needs Attention'}
                />
                <KPICard
                    label="Avg Speed"
                    value={`${Math.round(kpis.avgSpeed)} km/h`}
                    icon={<Zap size={22} />}
                    color="text-blue-400"
                    bgColor="bg-blue-500/5"
                    borderColor="border-blue-500/20"
                />
                <KPICard
                    label="Total Collected"
                    value={`$${kpis.totalCollected.toLocaleString()}`}
                    icon={<DollarSign size={22} />}
                    color="text-brand-lime"
                    bgColor="bg-brand-lime/5"
                    borderColor="border-brand-lime/20"
                    trend={kpis.totalCollected > 0 ? 'up' : undefined}
                />
                <KPICard
                    label="Outstanding"
                    value={`$${kpis.totalOutstanding.toLocaleString()}`}
                    icon={<CreditCard size={22} />}
                    color="text-orange-400"
                    bgColor="bg-orange-500/5"
                    borderColor="border-orange-500/20"
                />
                <KPICard
                    label="Overdue"
                    value={`$${kpis.totalOverdue.toLocaleString()}`}
                    icon={<AlertCircle size={22} />}
                    color="text-red-500"
                    bgColor="bg-red-500/5"
                    borderColor="border-red-500/20"
                    sub={kpis.overdueDrivers > 0 ? `${kpis.overdueDrivers} driver${kpis.overdueDrivers > 1 ? 's' : ''}` : 'None'}
                    pulse={kpis.totalOverdue > 0}
                />
            </div>

            {/* ── Graphical Analytics ────────────────────────────────────── */}
            {filteredMetrics.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Payment Status */}
                    <div className="rounded-2xl border p-5 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-dim mb-4">Driver Payment Status</h3>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={kpis.chartData.paymentData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                                        {kpis.chartData.paymentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Fleet Rents */}
                    <div className="rounded-2xl border p-5 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-dim mb-4">Fleet Rents Value ($)</h3>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={kpis.chartData.rentData} innerRadius={45} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                                        {kpis.chartData.rentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => `$${Number(value).toLocaleString()}`} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Score Distribution */}
                    <div className="rounded-2xl border p-5 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-dim mb-4">Driving Scores</h3>
                        <div className="h-[180px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kpis.chartData.scoreData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    <Bar dataKey="Drivers" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                        {kpis.chartData.scoreData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distance Distribution */}
                    <div className="rounded-2xl border p-5 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-dim mb-4">Distance Covered (km)</h3>
                        <div className="h-[180px] w-full mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={kpis.chartData.distanceData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    <Bar dataKey="Drivers" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                        {kpis.chartData.distanceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Content Grid ────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* Driver Table (3/4 width) */}
                <div className="xl:col-span-3 rounded-3xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    {/* Table Header Bar */}
                    <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                                    Driver Overview
                                </h2>
                                <p className="text-[10px] font-medium text-dim">
                                    {filteredMetrics.length} driver{filteredMetrics.length !== 1 ? 's' : ''} · Sorted by {sortKey}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    {[
                                        { key: 'name' as SortKey, label: 'Driver' },
                                        { key: 'drivingScore' as SortKey, label: 'Score' },
                                        { key: 'avgSpeed' as SortKey, label: 'Avg Speed' },
                                        { key: 'totalDistance' as SortKey, label: 'Distance' },
                                        { key: 'fuelEfficiency' as SortKey, label: 'Fuel Eff.' },
                                        { key: 'safetyTotal' as SortKey, label: 'Incidents' },
                                        { key: 'weeklyRent' as SortKey, label: 'Weekly Rent' },
                                        { key: 'outstanding' as SortKey, label: 'Outstanding' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            onClick={() => handleSort(col.key)}
                                            className="px-4 py-3 text-left cursor-pointer hover:bg-white/5 transition-all select-none"
                                        >
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-dim">{col.label}</span>
                                                <SortIcon col={col.key} />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-dim">Status</span>
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMetrics.map((m) => (
                                    <tr
                                        key={m.driver._id}
                                        className="border-b transition-all hover:bg-white/[0.02] group cursor-pointer"
                                        style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                                        onClick={() => navigateToDriver(m.driver._id)}
                                    >
                                        {/* Driver Name + Branch */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-brand-lime/10 text-brand-lime flex items-center justify-center text-xs font-black uppercase shrink-0">
                                                    {m.driver.personalInfo?.fullName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold truncate max-w-[140px]" style={{ color: 'var(--text-main)' }}>
                                                        {m.driver.personalInfo?.fullName}
                                                    </p>
                                                    <p className="text-[9px] font-medium text-dim flex items-center gap-1">
                                                        <Building2 size={8} /> {m.branchName}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Driving Score */}
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-black ${getScoreColor(m.driver.performance?.drivingScore || 0)}`}>
                                                {m.driver.performance?.drivingScore || 0}
                                            </span>
                                        </td>

                                        {/* Avg Speed */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                {m.driver.performance?.avgSpeed || 0} <span className="text-dim text-[9px]">km/h</span>
                                            </span>
                                        </td>

                                        {/* Total Distance */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                {(m.driver.performance?.totalDistance || 0).toLocaleString()} <span className="text-dim text-[9px]">km</span>
                                            </span>
                                        </td>

                                        {/* Fuel Efficiency */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                {m.driver.performance?.fuelEfficiency || 0} <span className="text-dim text-[9px]">km/L</span>
                                            </span>
                                        </td>

                                        {/* Safety Incidents */}
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-black ${m.safetyTotal > 5 ? 'text-red-500' : m.safetyTotal > 0 ? 'text-yellow-400' : 'text-brand-lime'}`}>
                                                {m.safetyTotal}
                                            </span>
                                        </td>

                                        {/* Weekly Rent */}
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                ${m.weeklyRent.toLocaleString()}
                                            </span>
                                        </td>

                                        {/* Outstanding */}
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-black ${m.outstanding > 0 ? 'text-orange-400' : 'text-brand-lime'}`}>
                                                ${m.outstanding.toLocaleString()}
                                            </span>
                                            {m.overdue > 0 && (
                                                <p className="text-[8px] font-black text-red-500 mt-0.5">
                                                    ${m.overdue.toLocaleString()} overdue
                                                </p>
                                            )}
                                        </td>

                                        {/* Status Badge */}
                                        <td className="px-4 py-3">
                                            <StatusBadge status={m.currentWeekStatus} />
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-3">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Eye size={16} className="text-brand-lime" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMetrics.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <AlertCircle size={32} className="mx-auto text-dim opacity-20 mb-4" />
                                            <p className="text-xs font-bold text-dim uppercase tracking-wider">No active drivers found</p>
                                            <p className="text-[10px] text-dim mt-1">Try adjusting your filters</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold text-dim">
                                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredMetrics.length)} of {filteredMetrics.length}
                            </p>
                            <div className="flex gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${page === currentPage ? 'bg-brand-lime text-black' : 'bg-white/5 text-dim hover:bg-white/10'}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (1/4 width) */}
                <div className="space-y-6">

                    {/* Collection Rate */}
                    <div className="p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="flex items-center gap-2 mb-6 relative z-10">
                            <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime">
                                <TrendingUp size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Collection Overview</h3>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {/* Collection Rate Bar */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold text-dim uppercase">Collection Rate</span>
                                    <span className="text-lg font-black text-brand-lime">
                                        {kpis.count > 0 ? Math.round(filteredMetrics.reduce((a, m) => a + m.collectionRate, 0) / filteredMetrics.length) : 0}%
                                    </span>
                                </div>
                                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-brand-lime/80 to-brand-lime transition-all duration-1000"
                                        style={{ width: `${kpis.count > 0 ? Math.round(filteredMetrics.reduce((a, m) => a + m.collectionRate, 0) / filteredMetrics.length) : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-3 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-dim flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-brand-lime" /> Collected
                                    </span>
                                    <span className="text-xs font-black text-brand-lime">${kpis.totalCollected.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-dim flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-orange-400" /> Pending
                                    </span>
                                    <span className="text-xs font-black text-orange-400">${Math.max(0, kpis.totalOutstanding - kpis.totalOverdue).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-dim flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-red-500" /> Overdue
                                    </span>
                                    <span className="text-xs font-black text-red-500">${kpis.totalOverdue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Safety Summary */}
                    <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                <Gauge size={18} />
                            </div>
                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Safety Alerts</h3>
                        </div>

                        <div className="space-y-3">
                            <SafetyStat label="Harsh Braking" count={kpis.totalBraking} color="red" />
                            <SafetyStat label="Speeding" count={kpis.totalSpeeding} color="orange" />
                            <SafetyStat label="Rapid Accel." count={kpis.totalAcceleration} color="yellow" />
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-dim">Total Incidents</span>
                            <span className={`text-lg font-black ${kpis.totalSafetyEvents > 10 ? 'text-red-500' : kpis.totalSafetyEvents > 0 ? 'text-yellow-400' : 'text-brand-lime'}`}>
                                {kpis.totalSafetyEvents}
                            </span>
                        </div>
                    </div>

                    {/* Top Overdue Drivers */}
                    {kpis.overdueDrivers > 0 && (
                        <div className="p-6 rounded-3xl border shadow-sm border-red-500/20" style={{ backgroundColor: 'var(--bg-card)' }}>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                    <AlertCircle size={18} />
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Top Overdue</h3>
                            </div>

                            <div className="space-y-3">
                                {filteredMetrics
                                    .filter(m => m.overdue > 0)
                                    .sort((a, b) => b.overdue - a.overdue)
                                    .slice(0, 5)
                                    .map((m, i) => (
                                        <div
                                            key={m.driver._id}
                                            className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10 cursor-pointer hover:bg-red-500/10 transition-all"
                                            onClick={() => navigateToDriver(m.driver._id)}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[9px] font-black shrink-0">
                                                    {i + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold truncate" style={{ color: 'var(--text-main)' }}>
                                                        {m.driver.personalInfo?.fullName}
                                                    </p>
                                                    <p className="text-[8px] font-medium text-dim">{m.branchName}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-black text-red-500 shrink-0 ml-2">
                                                ${m.overdue.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Sub-Components ───────────────────────────────────────────────────

const KPICard = ({ label, value, icon, color, bgColor, borderColor, sub, trend, pulse }: {
    label: string; value: string; icon: React.ReactNode; color: string;
    bgColor: string; borderColor: string; sub?: string; trend?: 'up' | 'down'; pulse?: boolean;
}) => (
    <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition-all hover:scale-[1.02] hover:shadow-lg ${borderColor} ${pulse ? 'animate-pulse' : ''}`} style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-10 -mt-10 ${bgColor} opacity-60`} />
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${bgColor} ${color} group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-0.5 ${trend === 'up' ? 'text-brand-lime' : 'text-red-500'}`}>
                        {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    </div>
                )}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-1">{label}</p>
            <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{value}</p>
            {sub && <p className="text-[9px] font-bold text-dim mt-0.5">{sub}</p>}
        </div>
    </div>
);

const SafetyStat = ({ label, count, color }: { label: string; count: number; color: 'red' | 'orange' | 'yellow' }) => {
    const colors = {
        red: { bg: 'bg-red-500/10', text: 'text-red-500', bar: 'bg-red-500' },
        orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', bar: 'bg-orange-500' },
        yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', bar: 'bg-yellow-500' },
    };
    const c = colors[color];
    return (
        <div className={`flex items-center justify-between p-3 rounded-xl ${c.bg} border border-white/5`}>
            <div className="flex items-center gap-2">
                <div className={`w-1.5 h-6 rounded-full ${c.bar}`} />
                <span className="text-[10px] font-black uppercase tracking-tight text-dim">{label}</span>
            </div>
            <span className={`text-sm font-black ${c.text}`}>{count}</span>
        </div>
    );
};

export default DriverPerformanceDashboard;
