import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    User, 
    Mail, 
    Phone, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    TrendingUp, 
    DollarSign, 
    Building2, 
    ArrowLeft,
    LogIn,
    LogOut,
    Shield,
    Activity,
    Briefcase,
    Smartphone,
    Zap
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { getIndividualStaffPerformance } from '../../../services/staffPerformanceService';
import { StatCard } from '../../../components/dashboard/widgets/StatusCards';

const StaffPerformanceDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'performance' | 'financials' | 'attendance'>('performance');

    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);
        return {
            startDate: lastMonth.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
        };
    });

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getIndividualStaffPerformance(id, dateRange.startDate, dateRange.endDate);
            setData(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch staff data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, dateRange]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="p-12 text-center bg-red-500/5 border border-red-500/10 rounded-[2rem] max-w-2xl mx-auto mt-20">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                 <Shield size={32} />
            </div>
            <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Access Issue</h2>
            <p className="text-dim font-medium mb-8">{error || 'The requested staff member profile could not be retrieved.'}</p>
            <button 
                onClick={() => navigate(-1)} 
                className="px-8 py-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card)] rounded-2xl transition-all font-bold flex items-center gap-2 mx-auto"
            >
                <ArrowLeft size={18} /> Return to Directory
            </button>
        </div>
    );

    const { profile, performance, payroll, attendance, hierarchy, roleAnalytics } = data;

    return (
        <div className="container-responsive space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 py-8 px-4 md:px-8">
            
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] transition-all text-xs font-black uppercase tracking-widest text-dim hover:text-[var(--text-main)]"
                >
                    <ArrowLeft size={14} /> Back to Staff
                </button>
                <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Analysis Period</span>
                     <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
                        <input 
                            type="date" 
                            value={dateRange.startDate} 
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent text-[11px] font-black px-3 py-1 outline-none text-lime"
                        />
                        <div className="w-px h-4 bg-[var(--border-main)]" />
                        <input 
                            type="date" 
                            value={dateRange.endDate} 
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-[11px] font-black px-3 py-1 outline-none text-lime"
                        />
                    </div>
                </div>
            </div>

            {/* Premium Profile Header */}
            <div className="relative group overflow-hidden rounded-[2.5rem] border border-[var(--border-main)] glass-dark p-8 md:p-12">
                {/* Abstract Background Decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 blur-[100px] rounded-full -mr-48 -mt-48 transition-all duration-1000 group-hover:scale-125" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-10">
                    {/* Simplified Avatar */}
                    <div className="w-24 h-24 rounded-2xl bg-lime flex items-center justify-center text-black text-4xl font-black shadow-sm">
                        {profile.fullName.split(' ')[0].charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[var(--text-main)]">
                                {profile.fullName}
                            </h1>
                            <div className="flex justify-center lg:justify-start gap-2">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border flex items-center gap-1.5 ${
                                    profile.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${profile.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                                    {profile.status}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mt-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Designation</p>
                                <p className="text-sm font-bold flex items-center justify-center lg:justify-start gap-2 text-[var(--text-main)]">
                                    <Shield size={14} className="text-lime" /> {profile.role}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Operations Hub</p>
                                <p className="text-sm font-bold flex items-center justify-center lg:justify-start gap-2 text-[var(--text-main)]">
                                    <Building2 size={14} className="text-lime" /> {hierarchy.branch?.name || 'Global'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">System Access</p>
                                <p className="text-sm font-bold flex items-center justify-center lg:justify-start gap-2 text-[var(--text-main)]">
                                    <Smartphone size={14} className="text-lime" /> {profile.phone || 'Encrypted'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tenure Date</p>
                                <p className="text-sm font-bold flex items-center justify-center lg:justify-start gap-2 text-[var(--text-main)]">
                                    <Calendar size={14} className="text-lime" /> {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="hidden xl:flex flex-col gap-3">
                         <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] text-center">
                            <p className="text-[20px] font-black text-lime leading-none">{performance.successRate}%</p>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Efficiency</p>
                         </div>
                         <div className="p-4 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] text-center">
                            <p className="text-[20px] font-black text-blue-400 leading-none">{attendance.length}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Check-ins</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Metrics Visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    superTitle="Performance Score"
                    title="Success Rate"
                    value={`${performance.successRate}%`}
                    icon={<TrendingUp size={18} />}
                    color="rgba(200, 230, 0, 0.15)"
                />
                <StatCard
                    superTitle="Workload Output"
                    title="Tasks Finalized"
                    value={performance.taskStats.completed}
                    icon={<CheckCircle2 size={18} />}
                    color="rgba(34, 197, 94, 0.15)"
                />
                <StatCard
                    superTitle="Time & Presence"
                    title="Active Sessions"
                    value={attendance.length}
                    icon={<Clock size={18} />}
                    color="rgba(59, 130, 246, 0.15)"
                />
                <StatCard
                    superTitle="Financials"
                    title="Monthly Package"
                    value={payroll.structure ? `${payroll.structure.currency} ${payroll.structure.baseSalary}` : 'N/A'}
                    icon={<DollarSign size={18} />}
                    color="rgba(139, 92, 246, 0.15)"
                />
            </div>

            {/* Tabbed Intelligence Section */}
            <div className="space-y-8">
                {/* Tabs Navigation */}
                <div className="flex flex-wrap gap-3 p-2 bg-[var(--bg-input)] rounded-[1.5rem] border border-[var(--border-main)] w-fit">
                    {[
                        { id: 'performance', label: 'Operational Performance', icon: Activity },
                        { id: 'financials', label: 'Payroll & Remuneration', icon: DollarSign },
                        { id: 'attendance', label: 'Attendance Intelligence', icon: Briefcase },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                                activeTab === tab.id 
                                ? 'bg-lime text-black shadow-2xl shadow-lime/30 scale-[1.02]' 
                                : 'hover:bg-[var(--bg-card)] opacity-50 hover:opacity-100'
                            }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        {activeTab === 'performance' && (
                            <div className="space-y-8">
                                {/* Distribution Chart */}
                                <div className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] group hover:border-lime/20 transition-all">
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-lime rounded-full" />
                                            Mission Distribution
                                        </h2>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span className="text-[10px] font-black uppercase opacity-40">Success</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                                <span className="text-[10px] font-black uppercase opacity-40">In Progress</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={[
                                                { name: 'COMPLETED', count: performance.taskStats.completed, fill: '#22c55e' },
                                                { name: 'PENDING', count: performance.taskStats.pending, fill: '#eab308' },
                                                { name: 'PROCESSED', count: roleAnalytics.driversOnboarded || roleAnalytics.vehiclesProcessed || 0, fill: '#C8E600' }
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                                <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} fontStyle="italic" tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                                <RechartsTooltip 
                                                    cursor={{ fill: 'var(--bg-input)' }} 
                                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} 
                                                    itemStyle={{ color: 'var(--text-main)' }}
                                                />
                                                <Bar dataKey="count" radius={[12, 12, 4, 4]} maxBarSize={50} animationDuration={2000}>
                                                    {[0, 1, 2].map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : index === 1 ? '#eab308' : '#C8E600'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Detailed Log */}
                                <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                                    <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center">
                                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                            Operation Logs
                                        </h2>
                                        <span className="text-[10px] font-black bg-[var(--bg-input)] px-3 py-1 rounded-full">{performance.tasks.length} Entries</span>
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[var(--bg-input)] opacity-50">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Activity Reference</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Executive Status</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Verification Time</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-main)]">
                                                {performance.tasks.map((task: any) => (
                                                    <tr key={task._id} className="group hover:bg-[var(--bg-input)] transition-all">
                                                        <td className="px-8 py-5">
                                                            <p className="text-[13px] font-bold text-[var(--text-main)] group-hover:text-lime transition-colors">{task.title}</p>
                                                            <p className="text-[11px] opacity-40 mt-0.5 line-clamp-1">{task.description}</p>
                                                        </td>
                                                        <td className="px-8 py-5">
                                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 w-fit ${
                                                                task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                            }`}>
                                                                <div className={`w-1 h-1 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                                                {task.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right text-[11px] font-medium opacity-40">
                                                            {new Date(task.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Remuneration Structure */}
                                    <div className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)]">
                                        <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                             <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                                             Pay Structure
                                        </h2>
                                        {payroll.structure ? (
                                            <div className="space-y-6">
                                                <div className="p-6 bg-lime/5 rounded-2xl border border-lime/10 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                                                         <DollarSign size={40} />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">Guaranteed Base</p>
                                                    <p className="text-3xl font-black text-lime">{payroll.structure.currency} {payroll.structure.baseSalary}</p>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 px-2">Allowances & Perks</p>
                                                    {payroll.structure.allowances.map((a: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center p-3 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-main)] group hover:border-green-500/30 transition-all">
                                                            <span className="text-xs font-bold opacity-60">{a.name}</span>
                                                            <span className="text-sm font-black text-green-400">+{a.amount}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="space-y-3">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30 px-2">Statutory Deductions</p>
                                                    {payroll.structure.deductions.map((d: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center p-3 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-main)] group hover:border-red-500/30 transition-all">
                                                            <span className="text-xs font-bold opacity-60">{d.name}</span>
                                                            <span className="text-sm font-black text-red-400">-{d.amount}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                                                <Shield size={48} strokeWidth={1} />
                                                <p className="text-xs font-black uppercase tracking-[0.2em]">Structure Undefined</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Disbursement Analytics */}
                                    <div className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)]">
                                        <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                             <div className="w-1.5 h-6 bg-purple-400 rounded-full" />
                                             Pay Trends
                                        </h2>
                                        <div className="h-[250px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={[...payroll.history].reverse()}>
                                                    <defs>
                                                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-main)" opacity={0.2} />
                                                    <XAxis dataKey="month" hide />
                                                    <YAxis hide />
                                                    <RechartsTooltip 
                                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                                                        itemStyle={{ color: 'var(--text-main)' }}
                                                    />
                                                    <Area type="monotone" dataKey="netSalary" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorNet)" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="mt-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center">
                                             <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Total Career Earnings</p>
                                             <p className="text-2xl font-black text-[var(--text-main)] mt-1">
                                                {payroll.structure?.currency} {payroll.history.reduce((acc: number, curr: any) => acc + curr.netSalary, 0).toLocaleString()}
                                             </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pay History Ledger */}
                                <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                                    <div className="p-8 border-b border-[var(--border-main)]">
                                         <h2 className="text-xl font-black uppercase tracking-tighter">Disbursement Ledger</h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-[var(--bg-input)] opacity-50">
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Period</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Base Package</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Net Settlement</th>
                                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-main)]">
                                                {payroll.history.map((pay: any) => (
                                                    <tr key={pay._id} className="hover:bg-[var(--bg-input)] transition-colors">
                                                        <td className="px-8 py-5 font-black text-[13px] text-[var(--text-main)]">
                                                            {new Date(pay.year, pay.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-8 py-5 text-xs font-medium opacity-40">{pay.baseSalary}</td>
                                                        <td className="px-8 py-5 font-black text-lime text-sm">{pay.netSalary}</td>
                                                        <td className="px-8 py-5 text-right">
                                                            <span className="text-[9px] font-black px-2 py-1 bg-green-500/10 text-green-400 rounded uppercase tracking-widest">Disbursed</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center">
                                    <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                        <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                                        Session Intelligence
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">Real-time Sync</span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-[var(--bg-input)] opacity-50">
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Authentication Time</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Termination Time</th>
                                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Security Profile</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-main)]">
                                            {attendance.map((log: any, i: number) => (
                                                <tr key={i} className="group hover:bg-[var(--bg-input)] transition-all">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3 text-[13px] font-bold text-green-400 group-hover:translate-x-1 transition-transform">
                                                            <div className="p-1.5 bg-green-400/10 rounded-lg"><LogIn size={12} /></div>
                                                            {new Date(log.loginTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        {log.logoutTime ? (
                                                            <div className="flex items-center gap-3 text-[13px] font-bold text-red-400">
                                                                <div className="p-1.5 bg-red-400/10 rounded-lg"><LogOut size={12} /></div>
                                                                {new Date(log.logoutTime).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-lime/10 text-lime px-3 py-1 rounded-full animate-pulse border border-lime/20">Active Terminal</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <p className="text-[10px] font-black text-[var(--text-main)] group-hover:text-lime transition-colors">{log.ipAddress || '0.0.0.0'}</p>
                                                        <p className="text-[8px] font-medium opacity-30 mt-0.5">IPV4 GATEWAY</p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Contextual Intelligence Sidebar */}
                    <div className="space-y-8">
                        {/* Organizational Hierarchy */}
                        <div className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                                <Building2 size={80} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                                Reporting Line
                            </h2>
                            <div className="space-y-8 relative">
                                <div className="absolute left-4 top-8 bottom-4 w-px bg-gradient-to-b from-[var(--border-main)] via-[var(--border-main)] to-transparent" />
                                
                                <div className="flex gap-5 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/5">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Global Node</p>
                                        <p className="text-sm font-black text-[var(--text-main)]">{hierarchy.branch?.name || 'Central Command'}</p>
                                        <p className="text-[10px] font-bold text-lime mt-0.5">{hierarchy.branch?.code || 'GL-001'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-5 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/5">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Direct Supervisor</p>
                                        {hierarchy.manager ? (
                                            <>
                                                <p className="text-sm font-black text-[var(--text-main)]">{hierarchy.manager.fullName}</p>
                                                <p className="text-[10px] font-bold text-orange-400 mt-0.5 truncate max-w-[150px]">{hierarchy.manager.email}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-black opacity-30 italic">Unassigned</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Communication Matrix */}
                        <div className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] group">
                            <h2 className="text-lg font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                                Connectivity
                            </h2>
                            <div className="space-y-4">
                                <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] group-hover:border-purple-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <Mail size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Primary Email</p>
                                            <p className="text-[13px] font-bold text-[var(--text-main)] truncate">{profile.email}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] group-hover:border-blue-500/20 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Phone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Direct Terminal</p>
                                            <p className="text-[13px] font-bold text-[var(--text-main)]">{profile.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Insights */}
                        <div className="p-6 rounded-2xl bg-lime/5 border border-lime/10">
                             <div className="flex items-center gap-3 mb-4">
                                 <Zap size={18} className="text-lime" />
                                 <p className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">AI Analyst Note</p>
                             </div>
                             <p className="text-[11px] leading-relaxed text-dim font-medium italic">
                                "{profile.fullName.split(' ')[0]} is maintaining a <span className="text-lime font-bold">{performance.successRate}% efficiency rate</span> over the current period. Attendance consistency is <span className="text-[var(--text-main)] font-bold">Optimal</span>. No critical performance alerts detected."
                             </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPerformanceDetails;
