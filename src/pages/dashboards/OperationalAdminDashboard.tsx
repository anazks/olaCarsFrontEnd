import { useState, useEffect } from 'react';
import { 
    AlertTriangle, 
    CheckCircle2, 
    Car, 
    Users, 
    Clock, 
    ClipboardList,
    ChevronRight,
    MoreVertical,
    Activity,
    Calendar,
    Building2,
    RefreshCw,
    Filter
} from 'lucide-react';

import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip as RechartsTooltip
} from 'recharts';
import { getOperationDashboardStats } from '../../services/operationAdminService';
import { getAllBranches } from '../../services/branchService';
import type { Branch } from '../../services/branchService';

const StatCard = ({ title, value, icon, color, trend }: any) => (
    <div 
        className="relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
    >
        <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform" style={{ background: color }} />
        
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-2xl" style={{ background: `${color}15`, color: color }}>
                {icon}
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend.positive ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                    {trend.value}
                </div>
            )}
        </div>
        
        <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-dim)' }}>{title}</p>
            <h3 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{value}</h3>
        </div>
    </div>
);

const OperationalAdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    
    const getOneMonthAgo = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    };

    const getToday = () => {
        return new Date().toISOString().split('T')[0];
    };

    // Filter states - Default to last 30 days
    const [branchId, setBranchId] = useState('');
    const [startDate, setStartDate] = useState(getOneMonthAgo());
    const [endDate, setEndDate] = useState(getToday());

    // Keep end date valid relative to start date
    useEffect(() => {
        if (startDate && endDate && endDate < startDate) {
            setEndDate(startDate);
        }
    }, [startDate, endDate]);

    const fetchBranches = async () => {
        try {
            const res = await getAllBranches({ limit: 100 });
            if (res.success) {
                setBranches(res.data);
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (branchId) params.branchId = branchId;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await getOperationDashboardStats(params);
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error("Dashboard Data Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchData();
    }, [branchId, startDate, endDate]);

    if (loading && !data) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#148F85] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container-responsive space-y-6 md:space-y-8 py-4 md:py-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 rounded-lg bg-[#148F85]/10 text-[#148F85]">
                            <Activity size={18} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-[#148F85]">Live Operations</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Operations Command</h1>
                    <p className="text-xs md:text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Real-time fleet & logistics monitoring</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="bg-card-glow p-1.5 md:p-2 rounded-2xl border border-white/5 backdrop-blur-md flex items-center flex-1 lg:flex-none">
                        <div className="px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 w-full justify-center" style={{ background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <Clock size={16} />
                            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3 md:p-4 rounded-3xl border flex flex-col lg:flex-row items-stretch lg:items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex items-center gap-3 pr-2 border-r border-white/10 hidden lg:flex">
                    <div className="p-2 bg-[#148F85]/10 rounded-xl text-[#148F85]">
                        <Filter size={18} />
                    </div>
                </div>

                {/* Branch Filter */}
                <div className="w-full lg:flex-1 relative">
                    <Building2 size={16} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-dim pointer-events-none sm:scale-100 scale-90" />
                    <select 
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border bg-transparent text-xs sm:text-sm font-bold focus:ring-2 focus:ring-[#148F85]/50 outline-none transition-all appearance-none cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="">All Operating Branches</option>
                        {branches.map(branch => (
                            <option key={branch._id} value={branch._id}>{branch.name} ({branch.code})</option>
                        ))}
                    </select>
                    <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <ChevronRight size={14} className="rotate-90" />
                    </div>
                </div>

                {/* Date Filters */}
                <div className="w-full lg:flex-[2] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-dim pointer-events-none sm:scale-100 scale-90" />
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-8 sm:pl-11 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border bg-transparent text-[10px] sm:text-sm font-bold focus:ring-2 focus:ring-[#148F85]/50 outline-none transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <span className="text-dim font-bold hidden sm:block text-[10px] sm:text-xs text-center">to</span>
                    <div className="relative flex-1">
                        <Calendar size={14} className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-dim pointer-events-none sm:scale-100 scale-90" />
                        <input 
                            type="date"
                            value={endDate}
                            min={startDate}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (startDate && val && val < startDate) {
                                    setEndDate(startDate);
                                } else {
                                    setEndDate(val);
                                }
                            }}
                            className="w-full pl-8 sm:pl-11 pr-2 sm:pr-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border bg-transparent text-[10px] sm:text-sm font-bold focus:ring-2 focus:ring-[#148F85]/50 outline-none transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                <button 
                    onClick={fetchData}
                    className="w-full lg:w-auto p-2.5 rounded-2xl bg-[#148F85]/10 text-[#148F85] hover:bg-[#148F85]/20 transition-all flex items-center justify-center"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>







            {/* Vehicle KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <StatCard 
                    title="Total Vehicles" 
                    value={data.vehicleKpis.totalVehicles.toLocaleString()} 
                    icon={<Car size={24} />} 
                    color="#6366F1"
                    trend={{ value: '+4.6%', positive: true }}
                />
                <StatCard 
                    title="Available Vehicles" 
                    value={data.vehicleKpis.availableVehicles.toLocaleString()} 
                    icon={<CheckCircle2 size={24} />} 
                    color="#10B981"
                />
                <StatCard 
                    title="Active Drivers" 
                    value={data.driverKpis.activeDrivers.toLocaleString()} 
                    icon={<Users size={24} />} 
                    color="#148F85"
                    trend={{ value: '+2.1%', positive: true }}
                />
                <StatCard 
                    title="Vehicles Rented" 
                    value={data.vehicleKpis.activeVehicles.toLocaleString()} 
                    icon={<ClipboardList size={24} />} 
                    color="#F59E0B"
                />
                <StatCard 
                    title="In Maintenance" 
                    value={data.vehicleKpis.maintenanceVehicles.toLocaleString()} 
                    icon={<AlertTriangle size={24} />} 
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alerts Section */}
                <div className="lg:col-span-2 rounded-3xl border p-4 md:p-6 flex flex-col relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Active Alerts</h4>
                        <button className="text-dim hover:text-main transition-colors"><MoreVertical size={20} /></button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-2xl bg-[#EF4444] text-white group cursor-pointer hover:scale-[1.02] transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={20} /></div>
                                <div className="bg-white/20 p-1.5 rounded-full"><ChevronRight size={16} /></div>
                            </div>
                            <h3 className="text-2xl font-black">{data.alertsSummary.critical}</h3>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Critical</p>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-[#F59E0B] text-white group cursor-pointer hover:scale-[1.02] transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-white/20 rounded-xl"><Clock size={20} /></div>
                                <div className="bg-white/20 p-1.5 rounded-full"><ChevronRight size={16} /></div>
                            </div>
                            <h3 className="text-2xl font-black">{data.alertsSummary.major}</h3>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Major</p>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-[#3B82F6] text-white group cursor-pointer hover:scale-[1.02] transition-all relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-white/20 rounded-xl"><CheckCircle2 size={20} /></div>
                                <div className="bg-white/20 p-1.5 rounded-full"><ChevronRight size={16} /></div>
                            </div>
                            <h3 className="text-2xl font-black">{data.alertsSummary.minor}</h3>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Minor</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl border bg-white/5 border-white/5">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0 bg-red-500/10 flex items-center justify-center text-red-500"><AlertTriangle size={18} /></div>
                                <div className="min-w-0">
                                    <h5 className="text-xs md:text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>Vehicle Accident Reported</h5>
                                    <p className="text-[10px] md:text-xs text-dim">KL-07-AD-2390 • Just now</p>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-white/5 rounded-lg transition-all shrink-0"><ChevronRight size={18} /></button>
                        </div>
                        <div className="flex items-center justify-between p-3 md:p-4 rounded-2xl border bg-white/5 border-white/5">
                            <div className="flex items-center gap-3 md:gap-4">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full shrink-0 bg-blue-500/10 flex items-center justify-center text-blue-500"><Clock size={18} /></div>
                                <div className="min-w-0">
                                    <h5 className="text-xs md:text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>Routine Maintenance Due</h5>
                                    <p className="text-[10px] md:text-xs text-dim">TN-01-BK-4567 • 2 hours ago</p>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-white/5 rounded-lg transition-all shrink-0"><ChevronRight size={18} /></button>
                        </div>
                    </div>
                </div>


                {/* Operations Overview */}
                <div className="rounded-3xl border p-6 flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Operations Overview</h4>
                        <button className="text-dim hover:text-main transition-colors"><MoreVertical size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10 text-center flex flex-col items-center">
                            <div className="text-red-500 mb-1"><Clock size={18} /></div>
                            <p className="text-xl font-black text-red-500">{data.tasks.overdue}</p>
                            <p className="text-[10px] font-black uppercase text-red-500/70">Overdue</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 text-center flex flex-col items-center">
                            <div className="text-orange-500 mb-1"><ClipboardList size={18} /></div>
                            <p className="text-xl font-black text-orange-500">{data.tasks.upcoming}</p>
                            <p className="text-[10px] font-black uppercase text-orange-500/70">Upcoming</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#148F85]/5 border border-[#148F85]/10 text-center flex flex-col items-center">
                            <div className="text-[#148F85] mb-1"><CheckCircle2 size={18} /></div>
                            <p className="text-xl font-black text-[#148F85]">{data.tasks.assigned}</p>
                            <p className="text-[10px] font-black uppercase text-[#148F85]/70">Assigned</p>
                        </div>
                    </div>

                    {/* Fleet Status Donut */}
                    <div className="flex-1 flex flex-col items-center justify-center relative pt-4">
                        <h5 className="text-xs font-black uppercase tracking-widest text-dim mb-4">Fleet Distribution</h5>
                        <div className="w-full h-[180px] md:h-[200px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.fleetStatus}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.fleetStatus.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ 
                                            background: 'var(--bg-popover)', 
                                            border: '1px solid var(--border-main)', 
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl md:text-2xl font-black" style={{ color: 'var(--text-main)' }}>{data.fleetUtilization}%</span>
                                <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: 'var(--text-dim)' }}>Utilization</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full mt-6">
                            {data.fleetStatus.map((s: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                                    <span className="text-[10px] md:text-xs font-bold truncate" style={{ color: 'var(--text-dim)' }}>{s.name} ({s.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default OperationalAdminDashboard;
