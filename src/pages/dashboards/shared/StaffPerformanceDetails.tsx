import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    User, 
    Mail, 
    Phone, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    AlertCircle, 
    TrendingUp, 
    DollarSign, 
    Building2, 
    ArrowLeft,
    LogIn,
    LogOut,
    Shield,
    Briefcase
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
        <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-red-500 font-bold">{error || 'Staff member not found'}</p>
            <button onClick={() => navigate(-1)} className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">Go Back</button>
        </div>
    );

    const { profile, performance, payroll, attendance, hierarchy, roleAnalytics } = data;

    return (
        <div className="container-responsive space-y-8 animate-in fade-in duration-500 p-4 md:p-8">
            {/* Header / Profile */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(-1)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#C8E600] to-[#8fb200] flex items-center justify-center text-black text-3xl font-black shadow-xl shadow-[#C8E600]/20">
                            {profile.avatar}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{profile.fullName}</h1>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    profile.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                    {profile.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-2 opacity-60">
                                <span className="text-sm font-bold flex items-center gap-1.5"><Shield size={14} className="text-[#C8E600]" /> {profile.role}</span>
                                <span className="text-sm font-bold flex items-center gap-1.5"><Building2 size={14} className="text-[#C8E600]" /> {hierarchy.branch?.name || 'Unassigned'}</span>
                                <span className="text-sm font-bold flex items-center gap-1.5"><Calendar size={14} className="text-[#C8E600]" /> Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-full lg:w-auto">
                        <input 
                            type="date" 
                            value={dateRange.startDate} 
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent text-xs font-bold px-3 py-2 outline-none"
                        />
                        <span className="text-xs opacity-30">to</span>
                        <input 
                            type="date" 
                            value={dateRange.endDate} 
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-xs font-bold px-3 py-2 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Success Rate', value: `${performance.successRate}%`, icon: TrendingUp, color: '#C8E600' },
                    { label: 'Tasks Completed', value: performance.taskStats.completed, icon: CheckCircle2, color: '#22c55e' },
                    { label: 'Login Days', value: attendance.length, icon: Clock, color: '#3b82f6' },
                    { label: 'Base Salary', value: payroll.structure ? `${payroll.structure.currency} ${payroll.structure.baseSalary}` : 'N/A', icon: DollarSign, color: '#8b5cf6' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                            <stat.icon size={80} style={{ color: stat.color }} />
                        </div>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${stat.color}20` }}>
                            <stat.icon size={20} style={{ color: stat.color }} />
                        </div>
                        <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest">{stat.label}</h3>
                        <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Tabs Navigation */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit">
                {[
                    { id: 'performance', label: 'Performance', icon: TrendingUp },
                    { id: 'financials', label: 'Salary & Payroll', icon: DollarSign },
                    { id: 'attendance', label: 'Attendance logs', icon: Clock },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20' : 'hover:bg-white/5 opacity-50'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {activeTab === 'performance' && (
                        <div className="space-y-8">
                            {/* Performance Chart / Analytics */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                                <h2 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-[#C8E600] rounded-full" />
                                    Task Breakdown
                                </h2>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { name: 'Completed', count: performance.taskStats.completed, fill: '#22c55e' },
                                            { name: 'Pending', count: performance.taskStats.pending, fill: '#eab308' },
                                            { name: 'Onboarded', count: roleAnalytics.driversOnboarded || roleAnalytics.vehiclesProcessed || 0, fill: '#C8E600' }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                                            <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
                                                {[0, 1, 2].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : index === 1 ? '#eab308' : '#C8E600'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Recent Activities */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                                <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full" />
                                    Recent Work Log
                                </h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Task / Activity</th>
                                                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Status</th>
                                                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-right">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {performance.tasks.map((task: any) => (
                                                <tr key={task._id} className="hover:bg-white/5 transition-all">
                                                    <td className="px-4 py-4">
                                                        <p className="text-sm font-bold">{task.title}</p>
                                                        <p className="text-xs opacity-50">{task.description}</p>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                                            task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-xs opacity-60">
                                                        {new Date(task.createdAt).toLocaleString()}
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
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Salary Breakdown */}
                                <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                                    <h2 className="text-lg font-black uppercase tracking-tighter mb-6">Current Pay Structure</h2>
                                    {payroll.structure ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <span className="text-sm opacity-60">Base Monthly</span>
                                                <span className="text-lg font-black text-[#C8E600]">{payroll.structure.currency} {payroll.structure.baseSalary}</span>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 px-2">Allowances</p>
                                                {payroll.structure.allowances.map((a: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm px-2">
                                                        <span className="opacity-60">{a.name}</span>
                                                        <span className="font-bold">+{a.amount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 px-2">Deductions</p>
                                                {payroll.structure.deductions.map((d: any, i: number) => (
                                                    <div key={i} className="flex justify-between text-sm px-2">
                                                        <span className="opacity-60">{d.name}</span>
                                                        <span className="font-bold text-red-500">-{d.amount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center opacity-30 italic">No structure defined</div>
                                    )}
                                </div>

                                {/* Salary Stats AreaChart */}
                                <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                                    <h2 className="text-lg font-black uppercase tracking-tighter mb-6">Pay History</h2>
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={[...payroll.history].reverse()}>
                                                <XAxis dataKey="month" hide />
                                                <YAxis hide />
                                                <RechartsTooltip />
                                                <Area type="monotone" dataKey="netSalary" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Payment History Table */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                                <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Payroll Disbursements</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="py-4 opacity-40 uppercase text-[10px] font-black">Month/Year</th>
                                                <th className="py-4 opacity-40 uppercase text-[10px] font-black">Base</th>
                                                <th className="py-4 opacity-40 uppercase text-[10px] font-black">Net Paid</th>
                                                <th className="py-4 opacity-40 uppercase text-[10px] font-black text-right">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {payroll.history.map((pay: any) => (
                                                <tr key={pay._id}>
                                                    <td className="py-4 font-bold">{pay.month}/{pay.year}</td>
                                                    <td className="py-4 opacity-60">{pay.baseSalary}</td>
                                                    <td className="py-4 font-black text-[#C8E600]">{pay.netSalary}</td>
                                                    <td className="py-4 text-right opacity-60">{new Date(pay.paidAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                            <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                                <div className="w-2 h-6 bg-[#3b82f6] rounded-full" />
                                Login & Session History
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Login Time</th>
                                            <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Logout Time</th>
                                            <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-right">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {attendance.map((log: any, i: number) => (
                                            <tr key={i} className="hover:bg-white/5 transition-all">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-green-500">
                                                        <LogIn size={14} /> {new Date(log.loginTime).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {log.logoutTime ? (
                                                        <div className="flex items-center gap-2 text-sm font-bold text-red-500">
                                                            <LogOut size={14} /> {new Date(log.logoutTime).toLocaleString()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase tracking-widest bg-lime/10 text-lime px-2 py-0.5 rounded">Active Session</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-right text-xs opacity-50">{log.ipAddress || '---'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar context */}
                <div className="space-y-6">
                    {/* Organization / Hierarchy */}
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-orange-500 rounded-full" />
                            Organization
                        </h2>
                        <div className="space-y-6">
                            <div className="relative">
                                <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-white/5 border-l border-dashed border-white/20" />
                                
                                {/* Branch */}
                                <div className="flex gap-4 relative z-10 mb-8">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <Building2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Assigned Branch</p>
                                        <p className="text-sm font-black">{hierarchy.branch?.name || 'N/A'}</p>
                                        <p className="text-xs opacity-50">{hierarchy.branch?.code}</p>
                                    </div>
                                </div>

                                {/* Manager */}
                                <div className="flex gap-4 relative z-10">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Reporting Manager</p>
                                        {hierarchy.manager ? (
                                            <>
                                                <p className="text-sm font-black">{hierarchy.manager.fullName}</p>
                                                <p className="text-xs opacity-50">{hierarchy.manager.email}</p>
                                            </>
                                        ) : (
                                            <p className="text-sm font-black opacity-50 italic">No manager assigned</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Card */}
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-purple-500 rounded-full" />
                            Contact Details
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <Mail size={18} className="text-purple-500" />
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black uppercase opacity-40">Email</p>
                                    <p className="text-sm truncate font-bold">{profile.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                <Phone size={18} className="text-purple-500" />
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-40">Phone</p>
                                    <p className="text-sm font-bold">{profile.phone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPerformanceDetails;
