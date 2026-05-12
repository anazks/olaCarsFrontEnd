import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock3, MapPin, AlignLeft, TrendingUp, UserCheck, Calendar, BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';

import { getStaffPerformance, type StaffPerformanceData, type BranchManagerPerformanceData, type CountryManagerPerformanceData, type GlobalAdminPerformanceData, type TargetComparison } from '../../../services/staffPerformanceService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUserRole } from '../../../utils/auth';
import { StatCard } from '../../../components/dashboard/widgets/StatusCards';

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
        let driversOutput = 0;
        let vehiclesOutput = 0;
        
        let avgTimeArray: any[] = [];
        let monthActions = 0;
        let historicActions = 0;

        combinedList.forEach(s => {
            const roleName = s._listType.replace('-', ' ').toUpperCase();
            distribution[roleName] = (distribution[roleName] || 0) + 1;

            if (s._listType === 'finance-admin' || s._listType === 'operation-admin') {
                driversOutput += s.metrics.totalGlobalDrivers || 0;
                vehiclesOutput += s.metrics.totalGlobalVehicles || 0;
            } else if (s._listType === 'country-manager') {
                driversOutput += s.metrics.totalCountryDrivers || 0;
                vehiclesOutput += s.metrics.totalCountryVehicles || 0;
            } else if (s._listType === 'branch-manager') {
                driversOutput += s.metrics.totalBranchDrivers || 0;
                vehiclesOutput += s.metrics.totalBranchVehicles || 0;
            } else {
                driversOutput += s.metrics.totalDriversOnboarded || 0;
                vehiclesOutput += s.metrics.totalVehiclesOnboarded || 0;
                
                if (s.metrics.avgTimePerStageHours > 0) {
                    avgTimeArray.push({
                        name: s.fullName.split(' ')[0], 
                        hours: s.metrics.avgTimePerStageHours,
                        role: roleName
                    });
                }
                
                monthActions += s.metrics.actionsThisMonth || 0;
                historicActions += s.metrics.totalStageActions || 0;
            }
        });

        avgTimeArray.sort((a,b) => b.hours - a.hours);
        const topAvgTime = avgTimeArray.slice(0, 8);

        const COLORS = ['#C8E600', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

        return {
            distribution: Object.keys(distribution).map((k, i) => ({ name: k, value: distribution[k], color: COLORS[i % COLORS.length] })),
            output: [
                { name: 'Drivers', value: driversOutput, fill: '#C8E600' },
                { name: 'Vehicles', value: vehiclesOutput, fill: '#3b82f6' }
            ].filter(x => x.value > 0),
            velocity: topAvgTime,
            frequency: [
                { name: 'This Month', value: monthActions, fill: '#f59e0b' },
                { name: 'Historical', value: Math.max(0, historicActions - monthActions), fill: '#6366f1' }
            ].filter(x => x.value > 0)
        };
    }, [combinedList]);

    const getStatusColor = (status: string) => {
        return status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
               status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
               'bg-rose-500/10 text-rose-400 border-rose-500/20';
    };

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar" style={{ backgroundColor: 'var(--bg-main)' }}>
            
            {/* Command Header */}
            <div className="p-8 border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 blur-[100px] rounded-full -mr-48 -mt-48" />
                
                <div className="max-w-[1600px] mx-auto relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-lime/10 flex items-center justify-center text-lime shadow-2xl shadow-lime/5 border border-lime/20">
                                <Activity size={32} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter text-white">Resource Intelligence</h1>
                                <p className="text-dim font-medium flex items-center gap-2 mt-1 uppercase text-[10px] tracking-[0.2em]">
                                    <Shield size={14} className="text-lime" /> Platform Telemetry & Staff Performance
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-[90vw]">
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
                                        className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                            staffType === type 
                                                ? 'bg-lime text-black shadow-lg shadow-lime/20 scale-[1.02]' 
                                                : 'hover:bg-white/5 text-dim hover:text-white'
                                        }`}
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
                                        className="appearance-none pl-12 pr-12 py-3 rounded-2xl border focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[11px] font-black uppercase tracking-widest cursor-pointer group-hover:border-lime/40"
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
                                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-lime opacity-60" />
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                                <Calendar size={14} className="ml-3 text-lime opacity-60" />
                                <input 
                                    type="date" 
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    className="bg-transparent text-[11px] font-black focus:outline-none p-1 text-white uppercase"
                                />
                                <div className="w-px h-4 bg-white/10" />
                                <input 
                                    type="date" 
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    className="bg-transparent text-[11px] font-black focus:outline-none p-1 text-white uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            superTitle="Network Assets"
                            title="Tracked Staff" 
                            value={totalStaffCount} 
                            icon={<Users size={18} />} 
                            color="rgba(59, 130, 246, 0.15)"
                        />
                        <StatCard 
                            superTitle="Successful Cycles"
                            title="Total Onboarded" 
                            value={totalOnboardings} 
                            icon={<CheckCircle size={18} />} 
                            color="rgba(200, 230, 0, 0.15)"
                        />
                        <StatCard 
                            superTitle="Operational Volume"
                            title="Workflow Actions" 
                            value={totalActions} 
                            icon={<Activity size={18} />} 
                            color="rgba(139, 92, 246, 0.15)"
                        />
                        <StatCard 
                            superTitle="Velocity Metrics"
                            title="Avg Processing" 
                            value={`${fleetAvgTime}h`} 
                            icon={<Clock3 size={18} />} 
                            color="rgba(245, 158, 11, 0.15)"
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-8 max-w-[1600px] mx-auto space-y-12 pb-24">
                
                {/* 2 per Row Charts - Strict Grid */}
                {!loading && combinedList.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 1. Distribution Matrix */}
                        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-8 relative overflow-hidden group">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                        <Award size={20} />
                                    </div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Distribution Matrix</h2>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-white px-3 py-1 rounded-lg bg-white/5 border border-white/5">
                                    FINANCE vs OPERATION
                                </div>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.distribution} innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                            {chartData.distribution.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ background: '#111', border: 'none', borderRadius: '16px' }} />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Task Momentum */}
                        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-8 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                                    <TrendingUp size={20} />
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Task Momentum</h2>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData.frequency} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                                            {chartData.frequency.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ background: '#111', border: 'none', borderRadius: '16px' }} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Asset Deployment */}
                        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-8 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-lime/10 text-lime">
                                    <BarChart3 size={20} />
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Asset Deployment</h2>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.output} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ background: '#111', border: 'none', borderRadius: '12px' }} />
                                        <Bar dataKey="value" name="Total" radius={[10, 10, 2, 2]} maxBarSize={40}>
                                            {chartData.output.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 4. Process Bottlenecks */}
                        <div className="rounded-[2rem] border border-white/5 bg-white/5 p-8 relative overflow-hidden group">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400">
                                    <Clock3 size={20} />
                                </div>
                                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Process Bottlenecks</h2>
                            </div>
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.velocity} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                                        <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="white" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} width={60} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ background: '#111', border: 'none', borderRadius: '12px' }} />
                                        <Bar dataKey="hours" name="Avg Hours" radius={[0, 8, 8, 0]} maxBarSize={15} fill="#f97316" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Roster Table */}
                <div className="rounded-[2.5rem] border border-white/5 bg-white/5 overflow-hidden">
                    <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                        <div>
                            <h2 className="text-2xl font-black text-white">Staff Telemetry Ledger</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-dim mt-1">Real-time performance audit of network resources</p>
                        </div>

                        <div className="relative group">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-lime opacity-40 group-focus-within:opacity-100 transition-opacity" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-6 py-3.5 rounded-2xl border w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all font-bold text-[10px] uppercase tracking-widest bg-black/40 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/20">
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 pl-8">Resource</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5">Designation</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5">Hub Node</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-center">Output</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-center">Velocity</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={6} className="p-6"><div className="h-4 bg-white/5 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : combinedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-dim font-bold uppercase tracking-widest italic opacity-30">No matching resources found</td>
                                    </tr>
                                ) : (
                                    combinedList.map(staff => (
                                        <tr key={staff.staffId} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-5 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime font-black text-sm border border-lime/10">
                                                        {staff.fullName.split(' ')[0].charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white group-hover:text-lime transition-colors">{staff.fullName}</p>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1 inline-block ${getStatusColor(staff.status)}`}>
                                                            {staff.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                                                    {staff._listType.replace('-', ' ')}
                                                </p>
                                                <p className="text-[9px] font-bold text-dim mt-0.5">{staff.email}</p>
                                            </td>
                                            <td className="p-5">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                                                    {staff._listType === 'country-manager' ? (staff as any).country : 
                                                     (staff._listType === 'finance-admin' || staff._listType === 'operation-admin') ? 'Global HQ' : 
                                                     staff.branchName}
                                                </p>
                                                <p className="text-[9px] font-bold text-dim mt-0.5 flex items-center gap-1">
                                                    <MapPin size={8} className="text-lime" /> Telemetry Active
                                                </p>
                                            </td>
                                            <td className="p-5 text-center">
                                                <p className="text-lg font-black text-white leading-none">
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
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-lime text-dim hover:text-black transition-all border border-white/5 hover:border-lime font-black text-[10px] uppercase tracking-widest"
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
