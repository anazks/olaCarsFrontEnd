import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock3, MapPin, TrendingUp, Calendar, BarChart3,
    ArrowUpRight, Activity, ChevronDown, Users, CheckCircle, Award, Search, Target
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    LineChart, Line, AreaChart, Area
} from 'recharts';

import { getStaffPerformance, type StaffPerformanceData, type BranchManagerPerformanceData, type CountryManagerPerformanceData, type GlobalAdminPerformanceData, type TargetComparison } from '../../../services/staffPerformanceService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUserRole } from '../../../utils/auth';
import { StatCard } from '../../../components/dashboard/widgets/StatusCards';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const StaffPerformanceDashboard = () => {
    const userRole = getUserRole() || '';
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [finStaff, setFinStaff] = useState<StaffPerformanceData[]>([]);
    const [opStaff, setOpStaff] = useState<StaffPerformanceData[]>([]);
    const [branchManagers, setBranchManagers] = useState<BranchManagerPerformanceData[]>([]);
    const [countryManagers, setCountryManagers] = useState<CountryManagerPerformanceData[]>([]);
    const [globalAdmins, setGlobalAdmins] = useState<GlobalAdminPerformanceData[]>([]);
    const [targetComparisons, setTargetComparisons] = useState<TargetComparison[]>([]);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    
    const [staffType, setStaffType] = useState<'all' | 'finance' | 'operation' | 'branch-manager' | 'country-manager' | 'finance-admin' | 'operation-admin'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const isBranchScoped = ['branchmanager'].includes(userRole?.toLowerCase().replace(' ', '') || '');
    const isAdmin = ['admin'].includes(userRole?.toLowerCase().replace(' ', '') || '');

    useEffect(() => {
        fetchData();
        if (!isBranchScoped) {
            fetchBranches();
        }
    }, [selectedBranch, staffType, dateRange]);

    const fetchBranches = async () => {
        try {
            const data = await getAllBranches({ limit: 100 });
            setBranches(data.data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getStaffPerformance({
                branch: isBranchScoped ? undefined : selectedBranch || undefined,
                type: staffType,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });
            setFinStaff(data.data.financeStaff || []);
            setOpStaff(data.data.operationStaff || []);
            setBranchManagers(data.data.branchManagers || []);
            setCountryManagers(data.data.countryManagers || []);
            setGlobalAdmins(data.data.globalAdmins || []);
            setTargetComparisons(data.data.targetComparison || []);
        } catch (error) {
            console.error('Error fetching staff performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const displayStaff = () => {
        let combined: any[] = [];
        
        if (staffType === 'all' || staffType === 'finance') {
            combined = [...combined, ...finStaff.map(s => ({ ...s, _listType: 'finance' as const }))];
        }
        if (staffType === 'all' || staffType === 'operation') {
            combined = [...combined, ...opStaff.map(s => ({ ...s, _listType: 'operation' as const }))];
        }
        if (!isBranchScoped && (staffType === 'all' || staffType === 'branch-manager')) {
            combined = [...combined, ...branchManagers.map(s => ({ ...s, _listType: 'branch-manager' as const } as any))];
        }
        if (isAdmin && (staffType === 'all' || staffType === 'country-manager')) {
            combined = [...combined, ...countryManagers.map(s => ({ ...s, _listType: 'country-manager' as const } as any))];
        }
        if (isAdmin && (staffType === 'all' || staffType === 'finance-admin')) {
            combined = [...combined, ...globalAdmins.filter(a => a.role === 'finance-admin').map(s => ({ ...s, _listType: 'finance-admin' as const } as any))];
        }
        if (isAdmin && (staffType === 'all' || staffType === 'operation-admin')) {
            combined = [...combined, ...globalAdmins.filter(a => a.role === 'operation-admin').map(s => ({ ...s, _listType: 'operation-admin' as const } as any))];
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            combined = combined.filter(s => 
                s.fullName.toLowerCase().includes(q) || 
                s.email.toLowerCase().includes(q) ||
                (s.branchName && s.branchName.toLowerCase().includes(q)) ||
                ((s as any).country && (s as any).country.toLowerCase().includes(q))
            );
        }

        return combined.sort((a, b) => b.metrics.totalStageActions - a.metrics.totalStageActions);
    };

    const combinedList = displayStaff();

    const totalStaffCount = finStaff.length + opStaff.length;
    let totalActions = 0;
    let totalOnboardings = 0;
    let avgHours = 0;
    let staffWithTime = 0;

    combinedList.forEach(s => {
        if (s._listType === 'finance-admin' || s._listType === 'operation-admin') {
            totalOnboardings += (s.metrics.totalGlobalDrivers || 0) + (s.metrics.totalGlobalVehicles || 0);
        } else if (s._listType === 'country-manager') {
            totalOnboardings += (s.metrics.totalCountryDrivers || 0) + (s.metrics.totalCountryVehicles || 0);
        } else if (s._listType === 'branch-manager') {
            totalOnboardings += (s.metrics.totalBranchDrivers || 0) + (s.metrics.totalBranchVehicles || 0);
        } else {
            totalActions += s.metrics.totalStageActions || 0;
            totalOnboardings += (s.metrics.totalDriversOnboarded || 0) + (s.metrics.totalVehiclesOnboarded || 0);
            if (s.metrics.avgTimePerStageHours > 0) {
                avgHours += s.metrics.avgTimePerStageHours;
                staffWithTime++;
            }
        }
    });

    const fleetAvgTime = staffWithTime > 0 ? (avgHours / staffWithTime).toFixed(1) : '0';

    const chartData = useMemo(() => {
        const distribution: Record<string, number> = {};

        combinedList.forEach(s => {
            const roleName = s._listType.replace('-', ' ').toUpperCase();
            distribution[roleName] = (distribution[roleName] || 0) + 1;
        });

        const staffMomentum = combinedList
            .map(s => ({
                name: s.fullName.split(' ')[0],
                thisMonth: s.metrics.actionsThisMonth || 0,
                historical: s.metrics.totalStageActions || 0
            }))
            .slice(0, 8);

        const staffDeployment = combinedList
            .map(s => ({
                name: s.fullName.split(' ')[0],
                drivers: s.metrics.totalDriversOnboarded ?? s.metrics.totalBranchDrivers ?? s.metrics.totalCountryDrivers ?? s.metrics.totalGlobalDrivers ?? 0,
                vehicles: s.metrics.totalVehiclesOnboarded ?? s.metrics.totalBranchVehicles ?? s.metrics.totalCountryVehicles ?? s.metrics.totalGlobalVehicles ?? 0
            }))
            .slice(0, 8);

        const targetData = targetComparisons.map(t => ({
            name: t.category.replace('_', ' '),
            Target: t.targetValue,
            Actual: t.actualValue
        }));

        return {
            distribution: Object.keys(distribution).map((k) => ({ name: k, value: distribution[k] })),
            momentum: staffMomentum,
            deployment: staffDeployment,
            targets: targetData
        };
    }, [combinedList, targetComparisons]);

    const getStatusColor = (status: string) => {
        return status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
               status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
               'bg-rose-500/10 text-rose-400 border-rose-500/20';
    };

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar" style={{ backgroundColor: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Staff Performance Dashboard', active: true }]} />

            {/* Compact Header & Controls */}
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Activity size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Resource Intelligence
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Telemetry analytics and workforce performance.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-1.5 p-1.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-x-auto no-scrollbar max-w-[90vw]">
                            {(
                                isBranchScoped 
                                    ? ['all', 'finance', 'operation'] 
                                    : isAdmin 
                                        ? ['all', 'finance', 'operation', 'branch-manager', 'country-manager', 'finance-admin', 'operation-admin']
                                        : ['all', 'finance', 'operation', 'branch-manager']
                            ).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setStaffType(type as any)}
                                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                        staffType === type 
                                            ? 'bg-brand-lime text-black shadow-lg shadow-lime/20 scale-[1.02]' 
                                            : 'hover:bg-white/5 text-dim hover:text-white'
                                    }`}
                                    style={{ backgroundColor: staffType === type ? 'var(--brand-lime)' : '' }}
                                >
                                    {type === 'country-manager' ? 'Region' : 
                                     type === 'branch-manager' ? 'Branch' : 
                                     type === 'finance-admin' ? 'HQ Finance' :
                                     type === 'operation-admin' ? 'HQ Ops' :
                                     type === 'all' ? 'Universal' :
                                     type}
                                </button>
                            ))}
                        </div>

                        {!isBranchScoped && (
                            <div className="relative group">
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="appearance-none pl-9 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer"
                                    style={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        borderColor: 'var(--border-main)', 
                                        color: 'var(--text-main)' 
                                    }}
                                >
                                    <option value="">All Branch Nodes</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lime opacity-60" />
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1.5 rounded-xl border border-[var(--border-main)]">
                            <Calendar size={12} className="ml-2 text-lime opacity-60" />
                            <input 
                                type="date" 
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                className="bg-transparent text-[10px] font-black focus:outline-none p-1 text-[var(--text-main)] uppercase w-24"
                            />
                            <div className="w-px h-3 bg-[var(--border-main)]" />
                            <input 
                                type="date" 
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                className="bg-transparent text-[10px] font-black focus:outline-none p-1 text-[var(--text-main)] uppercase w-24"
                            />
                        </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 pt-2">
                    <StatCard 
                        superTitle="Network Assets"
                        title="Tracked Staff" 
                        value={totalStaffCount} 
                        icon={<Users size={16} />} 
                        color="rgba(59, 130, 246, 0.15)"
                    />
                    <StatCard 
                        superTitle="Successful Cycles"
                        title="Total Onboarded" 
                        value={totalOnboardings} 
                        icon={<CheckCircle size={16} />} 
                        color="rgba(200, 230, 0, 0.15)"
                    />
                    <StatCard 
                        superTitle="Operational Volume"
                        title="Workflow Actions" 
                        value={totalActions} 
                        icon={<Activity size={16} />} 
                        color="rgba(139, 92, 246, 0.15)"
                    />
                    <StatCard 
                        superTitle="Velocity Metrics"
                        title="Avg Processing" 
                        value={`${fleetAvgTime}h`} 
                        icon={<Clock3 size={16} />} 
                        color="rgba(245, 158, 11, 0.15)"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-[1600px] mx-auto space-y-12 pb-24">
                
                {/* 2 per Row Charts - Strict Grid */}
                {!loading && combinedList.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. Distribution Matrix */}
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                        <Award size={20} />
                                    </div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Distribution Matrix</h2>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-[#C8E600] px-3 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                                    HEADCOUNT BY ROLE
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.distribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Line type="monotone" dataKey="value" name="Headcount" stroke="#C8E600" strokeWidth={3} dot={{ r: 5, stroke: '#C8E600', strokeWidth: 2, fill: 'var(--bg-card)' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Task Momentum */}
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                                        <TrendingUp size={20} />
                                    </div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Task Momentum</h2>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                        <span className="text-[9px] font-black uppercase opacity-40">This Month</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[9px] font-black uppercase opacity-40">Historical</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.momentum} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#C8E600" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#C8E600" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorHist" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} />
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Area type="monotone" dataKey="thisMonth" name="This Month" stroke="#C8E600" strokeWidth={2} fillOpacity={1} fill="url(#colorMonth)" />
                                        <Area type="monotone" dataKey="historical" name="Historical" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHist)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Asset Deployment */}
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-lime/10 text-lime">
                                        <BarChart3 size={20} />
                                    </div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Asset Deployment</h2>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                        <span className="text-[9px] font-black uppercase opacity-40">Drivers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[9px] font-black uppercase opacity-40">Vehicles</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.deployment} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Line type="monotone" dataKey="drivers" name="Drivers" stroke="#C8E600" strokeWidth={3} dot={{ r: 4, stroke: '#C8E600', strokeWidth: 2, fill: 'var(--bg-card)' }} />
                                        <Line type="monotone" dataKey="vehicles" name="Vehicles" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: 'var(--bg-card)' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Target vs Actual Performance */}
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400">
                                        <Target size={20} />
                                    </div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Target Performance</h2>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        <span className="text-[9px] font-black uppercase opacity-40">Target</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                        <span className="text-[9px] font-black uppercase opacity-40">Actual</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.targets} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                        <Line type="monotone" dataKey="Target" name="Target" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: 'var(--bg-card)' }} />
                                        <Line type="monotone" dataKey="Actual" name="Actual" stroke="#C8E600" strokeWidth={3} dot={{ r: 5, stroke: '#C8E600', strokeWidth: 2, fill: 'var(--bg-card)' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Roster Table */}
                <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                    <div className="p-8 border-b border-[var(--border-main)] flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--bg-card)]">
                        <div>
                            <h2 className="text-lg font-black text-[var(--text-main)]">Staff Telemetry Ledger</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dim mt-1">Real-time performance audit of network resources</p>
                        </div>

                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-lime opacity-40 group-focus-within:opacity-100 transition-opacity" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3.5 rounded-2xl border w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all font-bold text-[10px] uppercase tracking-widest bg-[var(--bg-input)] border-[var(--border-main)] text-[var(--text-main)]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-input)] opacity-50">
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Resource</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Designation</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Hub Node</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Output</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Velocity</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-main)]">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="p-6"><div className="h-4 bg-[var(--bg-input)] rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : combinedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-dim font-bold uppercase tracking-widest italic opacity-30">No matching resources found</td>
                                    </tr>
                                ) : (
                                    combinedList.map(staff => (
                                        <tr key={staff.staffId} className="hover:bg-[var(--bg-input)] transition-colors group">
                                            <td className="p-5 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime font-black text-sm border border-lime/10">
                                                        {staff.fullName.split(' ')[0].charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[var(--text-main)] group-hover:text-lime transition-colors">{staff.fullName}</p>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1 inline-block ${getStatusColor(staff.status)}`}>
                                                            {staff.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
                                                    {staff._listType.replace('-', ' ')}
                                                </p>
                                                <p className="text-[9px] font-bold text-dim mt-0.5">{staff.email}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
                                                    {staff._listType === 'country-manager' ? (staff as any).country : 
                                                     (staff._listType === 'finance-admin' || staff._listType === 'operation-admin') ? 'Global HQ' : 
                                                     staff.branchName}
                                                </p>
                                                <p className="text-[9px] font-bold text-dim mt-0.5 flex items-center gap-1">
                                                    <MapPin size={8} className="text-lime" /> Telemetry Active
                                                </p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <p className="text-lg font-black text-[var(--text-main)] leading-none">
                                                    {staff.metrics.totalDriversOnboarded ?? staff.metrics.totalVehiclesOnboarded ?? 0}
                                                </p>
                                                <p className="text-[8px] font-black uppercase text-dim tracking-widest mt-1">Onboarded</p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <p className="text-lg font-black text-orange-400 leading-none">
                                                    {staff.metrics.avgTimePerStageHours}h
                                                </p>
                                                <p className="text-[8px] font-black uppercase text-dim tracking-widest mt-1">Avg Cycle</p>
                                            </td>
                                            <td className="p-5 text-right pr-8">
                                                <button 
                                                    onClick={() => {
                                                        const currentPath = window.location.pathname;
                                                        const basePath = currentPath.split('/staff-performance')[0];
                                                        navigate(`${basePath}/staff-performance/${staff.staffId}`);
                                                    }}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--bg-input)] hover:bg-lime text-dim hover:text-black transition-all border border-[var(--border-main)] hover:border-lime font-black text-[10px] uppercase tracking-widest"
                                                >
                                                    Profile <ArrowUpRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPerformanceDashboard;
