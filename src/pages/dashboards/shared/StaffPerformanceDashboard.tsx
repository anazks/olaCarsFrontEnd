import { useState, useEffect, useMemo } from 'react';
import { 
    Users, Briefcase, Activity, Clock, Search, ChevronDown, CheckCircle, 
    Clock3, MapPin, AlignLeft, TrendingUp, UserCheck
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend 
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getStaffPerformance, type StaffPerformanceData, type BranchManagerPerformanceData, type CountryManagerPerformanceData, type GlobalAdminPerformanceData } from '../../../services/staffPerformanceService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';

const StaffPerformanceDashboard = () => {
    const userRole = getUserRole() || '';
    
    
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [finStaff, setFinStaff] = useState<StaffPerformanceData[]>([]);
    const [opStaff, setOpStaff] = useState<StaffPerformanceData[]>([]);
    const [branchManagers, setBranchManagers] = useState<BranchManagerPerformanceData[]>([]);
    const [countryManagers, setCountryManagers] = useState<CountryManagerPerformanceData[]>([]);
    const [globalAdmins, setGlobalAdmins] = useState<GlobalAdminPerformanceData[]>([]);
    
    // Filters
    const [staffType, setStaffType] = useState<'all' | 'finance' | 'operation' | 'branch-manager' | 'country-manager' | 'finance-admin' | 'operation-admin'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

    const isBranchScoped = ['branchmanager'].includes(userRole?.toLowerCase().replace(' ', '') || '');
    const isAdmin = ['admin'].includes(userRole?.toLowerCase().replace(' ', '') || '');

    useEffect(() => {
        fetchData();
        if (!isBranchScoped) {
            fetchBranches();
        }
    }, [selectedBranch, staffType]);

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
            // Note: BranchManager naturally gets scoped by the backend using req.user.branchId
            const data = await getStaffPerformance({
                branch: isBranchScoped ? undefined : selectedBranch || undefined,
                type: staffType
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

    // -- Calculated KPIs --
    const totalStaff = finStaff.length + opStaff.length;
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

    // -- Analytical Chart Data --
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

        const COLORS = ['#148F85', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];

        return {
            distribution: Object.keys(distribution).map((k, i) => ({ name: k, value: distribution[k], color: COLORS[i % COLORS.length] })),
            output: [
                { name: 'Drivers', value: driversOutput, fill: '#148F85' },
                { name: 'Vehicles', value: vehiclesOutput, fill: '#3b82f6' }
            ].filter(x => x.value > 0),
            velocity: topAvgTime,
            frequency: [
                { name: 'This Month', value: monthActions, fill: '#f59e0b' },
                { name: 'Historical', value: Math.max(0, historicActions - monthActions), fill: '#6366f1' }
            ].filter(x => x.value > 0)
        };
    }, [combinedList]);

    const formatDateStr = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        return status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
               status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
               'bg-rose-500/10 text-rose-500 border-rose-500/20';
    };

    const KPICard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
        <div className="p-6 rounded-3xl border transition-all hover:-translate-y-1" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${colorClass}`}>
                    <Icon size={24} />
                </div>
            </div>
            <h3 style={{ color: 'var(--text-dim)' }} className="text-sm font-medium mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-plus-jakarta" style={{ color: 'var(--text-main)' }}>
                    {value}
                </span>
                {subtext && <span className="text-sm font-medium" style={{ color: 'var(--brand-lime)' }}>{subtext}</span>}
            </div>
        </div>
    );

    return (
        <div className="flex-1 w-full flex flex-col h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-lighter)' }}>
            {/* Header */}
            <div className="flex-none p-4 md:p-8 border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold font-plus-jakarta tracking-tight mb-2 flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            <UserCheck className="text-[var(--brand-lime)]" size={32} />
                            Staff Performance tracking
                        </h1>
                        <p style={{ color: 'var(--text-dim)' }} className="text-base flex items-center gap-2">
                            <Activity size={16} /> Measuring operational efficiency via onboarding telemetry
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-lighter)' }}>
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
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        staffType === type 
                                            ? 'shadow-sm' 
                                            : 'hover:bg-white/5 opacity-60'
                                    }`}
                                    style={staffType === type ? { 
                                        backgroundColor: 'var(--brand-lime)', 
                                        color: '#000000' 
                                    } : { color: 'var(--text-main)' }}
                                >
                                    {type === 'country-manager' ? 'Country Manager' : 
                                     type === 'branch-manager' ? 'Branch Manager' : 
                                     type === 'finance-admin' ? 'Finance Admin' :
                                     type === 'operation-admin' ? 'Operation Admin' :
                                     type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>

                        {!isBranchScoped && (
                            <div className="relative">
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                    className="appearance-none pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 transition-all font-medium"
                                    style={{ 
                                        backgroundColor: 'var(--bg-main)', 
                                        borderColor: 'var(--border-main)', 
                                        color: 'var(--text-main)' 
                                    }}
                                >
                                    <option value="">All Branches</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                                <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-main)' }} />
                                <ChevronDown size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: 'var(--text-main)' }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* KPIs */}
                <div className="p-4 rounded-3xl border bg-black/5 dark:bg-white/5 shadow-inner" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <div className="flex lg:grid lg:grid-cols-4 gap-4 min-w-max lg:min-w-full">
                            <div className="w-[280px] lg:w-auto shrink-0">
                                <KPICard 
                                    title="Total Tracked Staff" 
                                    value={totalStaff} 
                                    icon={Users} 
                                    colorClass="bg-blue-500/10 text-blue-500" 
                                />
                            </div>
                        <div className="w-[280px] lg:w-auto shrink-0">
                            <KPICard 
                                title="Completed Onboardings" 
                                value={totalOnboardings} 
                                subtext="Active"
                                icon={CheckCircle} 
                                colorClass="bg-[var(--brand-lime)]/10 text-[var(--brand-lime)]" 
                            />
                        </div>
                        <div className="w-[280px] lg:w-auto shrink-0">
                            <KPICard 
                                title="Total Workflow Actions" 
                                value={totalActions} 
                                icon={Activity} 
                                colorClass="bg-purple-500/10 text-purple-500" 
                            />
                        </div>
                        <div className="w-[280px] lg:w-auto shrink-0">
                            <KPICard 
                                title="Avg Stage Processing" 
                                value={`${fleetAvgTime}h`} 
                                icon={Clock3} 
                                colorClass="bg-amber-500/10 text-amber-500" 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8">

                {/* Analytical Grapsh */}
                {!loading && combinedList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                        {/* 1. Staff Hierarchy */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                                    <Users size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Staff Hierarchy</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {chartData.distribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData.distribution} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                                                {chartData.distribution.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Staff Data</div>
                                )}
                            </div>
                        </div>

                        {/* 2. Onboarding Output */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-[#148F85]/10 text-[#148F85]">
                                    <CheckCircle size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Total Onboarded</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {chartData.output.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.output} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                            <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                {chartData.output.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Deployments</div>
                                )}
                            </div>
                        </div>

                        {/* 3. Pace & Velocity */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                    <Clock3 size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Stage Bottlenecks (Hrs)</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {chartData.velocity.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.velocity} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" horizontal={false} />
                                            <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} width={40} />
                                            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                            <Bar dataKey="hours" name="Avg Hours" radius={[0, 4, 4, 0]} maxBarSize={20} fill="#f97316" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Timing Data</div>
                                )}
                            </div>
                        </div>

                        {/* 4. Action Frequency */}
                        <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                    <TrendingUp size={20} />
                                </div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-dim">Task Momentum</h2>
                            </div>
                            <div className="h-[220px] w-full">
                                {chartData.frequency.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={chartData.frequency} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                                {chartData.frequency.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Tasks Logged</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold font-plus-jakarta" style={{ color: 'var(--text-main)' }}>
                        Staff Roster & Telemetry
                    </h2>
                    <div className="relative">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" style={{ color: 'var(--text-main)' }} />
                        <input
                            type="text"
                            placeholder="Search name, branch..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2.5 rounded-xl border w-64 focus:outline-none focus:ring-2 transition-all font-medium text-sm"
                            style={{ 
                                backgroundColor: 'var(--bg-main)', 
                                borderColor: 'var(--border-main)', 
                                color: 'var(--text-main)' 
                            }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--brand-lime)' }}></div>
                    </div>
                ) : combinedList.length === 0 ? (
                    <div className="text-center py-16 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 opacity-30 bg-black/5 dark:bg-white/5">
                            <Search size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">No Staff Found</h3>
                        <p style={{ color: 'var(--text-dim)' }}>Try adjusting your branch or type filters.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mb-20">
                        {combinedList.map(staff => (
                            <div key={staff.staffId} className="rounded-2xl border overflow-hidden transition-all" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                {/* Row Header */}
                                <div 
                                    className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                                    onClick={() => setExpandedStaffId(expandedStaffId === staff.staffId ? null : staff.staffId)}
                                >
                                    <div className="flex items-center gap-4 min-w-[200px] flex-1">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" 
                                             style={{ backgroundColor: 'var(--bg-lighter)', color: 'var(--brand-lime)', border: '1px solid var(--border-main)' }}>
                                            {staff.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                {staff.fullName}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(staff.status)}`}>
                                                    {staff.status}
                                                </span>
                                            </h3>
                                            <div className="flex items-center gap-3 text-xs opacity-70 mt-1 font-medium">
                                                <span className="flex items-center gap-1"><MapPin size={12}/> {
                                                    staff._listType === 'country-manager' ? (staff as any).country : 
                                                    (staff._listType === 'finance-admin' || staff._listType === 'operation-admin') ? 'Global Platform' : 
                                                    staff.branchName
                                                }</span>
                                                <span className="flex items-center gap-1 uppercase">
                                                    {(staff._listType === 'finance' || staff._listType === 'finance-admin') ? <Briefcase size={12}/> : <AlignLeft size={12}/>}
                                                    {staff._listType.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-12 text-sm">
                                        {(staff._listType === 'finance-admin' || staff._listType === 'operation-admin') ? (
                                            <>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Plat. Drivers</p>
                                                    <p className="font-bold text-lg text-[var(--brand-lime)]">
                                                        {staff.metrics.totalGlobalDrivers}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Plat. Vehicles</p>
                                                    <p className="font-bold text-lg">{staff.metrics.totalGlobalVehicles}</p>
                                                </div>
                                                <div className="text-center hidden sm:block">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Active Assets</p>
                                                    <p className="font-bold text-lg text-amber-500">{staff.metrics.activeGlobalDrivers + staff.metrics.activeGlobalVehicles}</p>
                                                </div>
                                            </>
                                        ) : staff._listType === 'country-manager' ? (
                                            <>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Nat. Drivers</p>
                                                    <p className="font-bold text-lg text-[var(--brand-lime)]">
                                                        {staff.metrics.totalCountryDrivers}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Nat. Vehicles</p>
                                                    <p className="font-bold text-lg">{staff.metrics.totalCountryVehicles}</p>
                                                </div>
                                                <div className="text-center hidden sm:block">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Active Assets</p>
                                                    <p className="font-bold text-lg text-amber-500">{staff.metrics.activeCountryDrivers + staff.metrics.activeCountryVehicles}</p>
                                                </div>
                                            </>
                                        ) : staff._listType === 'branch-manager' ? (
                                            <>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Branch Drivers</p>
                                                    <p className="font-bold text-lg text-[var(--brand-lime)]">
                                                        {staff.metrics.totalBranchDrivers}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Branch Vehicles</p>
                                                    <p className="font-bold text-lg">{staff.metrics.totalBranchVehicles}</p>
                                                </div>
                                                <div className="text-center hidden sm:block">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Active Assets</p>
                                                    <p className="font-bold text-lg text-amber-500">{staff.metrics.activeBranchDrivers + staff.metrics.activeBranchVehicles}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Onboarded</p>
                                                    <p className="font-bold text-lg text-[var(--brand-lime)]">
                                                        {staff.metrics.totalDriversOnboarded ?? staff.metrics.totalVehiclesOnboarded ?? 0}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Total Actions</p>
                                                    <p className="font-bold text-lg">{staff.metrics.totalStageActions}</p>
                                                </div>
                                                <div className="text-center hidden sm:block">
                                                    <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Avg Time/Stage</p>
                                                    <p className="font-bold text-lg text-amber-500">{staff.metrics.avgTimePerStageHours}h</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="pl-4 border-l border-white/10 hidden lg:block">
                                        <p className="opacity-60 mb-1 text-[11px] uppercase tracking-wider font-bold">Last Login</p>
                                        <p className="font-medium">{formatDateStr(staff.lastLoginAt)}</p>
                                    </div>

                                    <div className="p-2 ml-auto opacity-50">
                                        <ChevronDown size={20} className={`transform transition-transform ${expandedStaffId === staff.staffId ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {expandedStaffId === staff.staffId && (
                                    <div className="p-6 border-t border-dashed grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                        {/* Left Side: Stats & Breakdown */}
                                        <div className="space-y-6">
                                            {(staff._listType === 'finance-admin' || staff._listType === 'operation-admin') ? (
                                                <div>
                                                    <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                        <TrendingUp size={16} className="text-[var(--brand-lime)]" /> 
                                                        Global Portfolio Health
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="col-span-2 p-4 rounded-xl border flex flex-col justify-center text-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Total Branches Overseen</span>
                                                            <span className="text-3xl font-bold">{staff.metrics.totalGlobalBranches}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Drivers</span>
                                                            <span className="text-2xl font-bold">{staff.metrics.activeGlobalDrivers} <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalGlobalDrivers}</span></span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalGlobalDrivers ? (staff.metrics.activeGlobalDrivers / staff.metrics.totalGlobalDrivers) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Vehicles</span>
                                                            <span className="text-2xl font-bold tracking-tight">
                                                                {staff.metrics.activeGlobalVehicles}
                                                                <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalGlobalVehicles}</span>
                                                            </span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalGlobalVehicles ? (staff.metrics.activeGlobalVehicles / staff.metrics.totalGlobalVehicles) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : staff._listType === 'country-manager' ? (
                                                <div>
                                                    <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                        <TrendingUp size={16} className="text-[var(--brand-lime)]" /> 
                                                        National Portfolio Health
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div className="col-span-2 p-4 rounded-xl border flex flex-col justify-center text-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Total Branches Overseen</span>
                                                            <span className="text-3xl font-bold">{staff.metrics.totalCountryBranches}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Drivers</span>
                                                            <span className="text-2xl font-bold">{staff.metrics.activeCountryDrivers} <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalCountryDrivers}</span></span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalCountryDrivers ? (staff.metrics.activeCountryDrivers / staff.metrics.totalCountryDrivers) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Vehicles</span>
                                                            <span className="text-2xl font-bold tracking-tight">
                                                                {staff.metrics.activeCountryVehicles}
                                                                <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalCountryVehicles}</span>
                                                            </span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalCountryVehicles ? (staff.metrics.activeCountryVehicles / staff.metrics.totalCountryVehicles) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : staff._listType === 'branch-manager' ? (
                                                <div>
                                                    <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                        <TrendingUp size={16} className="text-[var(--brand-lime)]" /> 
                                                        Branch Portfolio Health
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Drivers</span>
                                                            <span className="text-2xl font-bold">{staff.metrics.activeBranchDrivers} <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalBranchDrivers}</span></span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalBranchDrivers ? (staff.metrics.activeBranchDrivers / staff.metrics.totalBranchDrivers) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                            <span className="text-xs font-bold uppercase opacity-60 mb-1">Active / Total Vehicles</span>
                                                            <span className="text-2xl font-bold tracking-tight">
                                                                {staff.metrics.activeBranchVehicles}
                                                                <span className="text-sm font-normal opacity-60 ml-2">/ {staff.metrics.totalBranchVehicles}</span>
                                                            </span>
                                                            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1 mt-2">
                                                                <div className="h-full rounded-full" style={{ width: `${staff.metrics.totalBranchVehicles ? (staff.metrics.activeBranchVehicles / staff.metrics.totalBranchVehicles) * 100 : 0}%`, backgroundColor: 'var(--brand-lime)' }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div>
                                                        <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                            <TrendingUp size={16} className="text-[var(--brand-lime)]" /> 
                                                            Volume & Velocity
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                                <span className="text-xs font-bold uppercase opacity-60 mb-1">Actions This Month</span>
                                                                <span className="text-2xl font-bold">{staff.metrics.actionsThisMonth} <span className="text-sm font-normal opacity-60 ml-2">actions</span></span>
                                                            </div>
                                                            <div className="p-4 rounded-xl border flex flex-col justify-center" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                                                                <span className="text-xs font-bold uppercase opacity-60 mb-1">Items Touched</span>
                                                                <span className="text-2xl font-bold tracking-tight">
                                                                    {staff.metrics.totalDriversTouched ?? staff.metrics.totalVehiclesTouched ?? 0}
                                                                    <span className="text-sm font-normal opacity-60 ml-2">entities</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                            <AlignLeft size={16} className="text-[var(--brand-lime)]" /> 
                                                            Stage Breakdown (All Time)
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {(Object.entries(staff.metrics.stageBreakdown || {}) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([stage, count], i) => (
                                                                <div key={i} className="flex items-center gap-3">
                                                                    <div className="flex-1 text-sm font-medium">{stage}</div>
                                                                    <div className="w-1/2 bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                                                                        <div 
                                                                            className="h-full rounded-full" 
                                                                            style={{ 
                                                                                width: `${(count / Math.max(...(Object.values(staff.metrics.stageBreakdown || {}) as number[]))) * 100}%`,
                                                                                backgroundColor: 'var(--brand-lime)'
                                                                            }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className="w-10 text-right font-bold text-sm tracking-widest">{count}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Right Side: Timeline Activity */}
                                        <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-6 border" style={{ borderColor: 'var(--border-main)' }}>
                                            <h4 className="font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                <Clock size={16} className="text-[var(--brand-lime)]" /> 
                                                Recent Activity Log
                                            </h4>
                                            
                                            {staff.recentActivity && staff.recentActivity.length > 0 ? (
                                                <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                                                    {staff.recentActivity.map((log: any, idx: number) => (
                                                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                            <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"
                                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--brand-lime)' }}>
                                                            </div>
                                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl border shadow-sm transition-all hover:-translate-y-0.5"
                                                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="font-bold text-xs uppercase tracking-wider text-[var(--brand-lime)]">
                                                                        {log.status}
                                                                    </span>
                                                                    <span className="text-[10px] opacity-60 font-medium">
                                                                        {formatDateStr(log.timestamp)}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm font-medium mb-1 truncate">
                                                                    {(log.driverName || log.vehicleName) && (
                                                                        <span className="opacity-70 mr-1">For</span>
                                                                    )}
                                                                    {log.driverName || log.vehicleName || 'Unknown Entity'}
                                                                </div>
                                                                {log.notes && (
                                                                    <div className="text-[11px] opacity-60 italic border-t pt-1 mt-1 border-white/5 line-clamp-2">
                                                                        "{log.notes}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 opacity-50">
                                                    No recent activity recorded
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffPerformanceDashboard;
