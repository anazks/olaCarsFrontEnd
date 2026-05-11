import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Users,
    User,
    MapPin,
    Phone,
    Mail,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Search,
    Download,
    TrendingUp,
    Car,
    Eye
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip
} from 'recharts';
import { getBranchExtendedDetails } from '../../../services/branchService';

const BranchDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    useTranslation();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Date filter state (default 1 month)
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(now.getMonth() - 1);

        return {
            startDate: lastMonth.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
        };
    });

    const fetchDetails = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const result = await getBranchExtendedDetails(id, dateRange.startDate, dateRange.endDate);
            setData(result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch branch details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id, dateRange]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-500 font-bold">{error || 'Branch not found'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const { branch, analytics, staff } = data;
    const filteredStaff = staff.filter((s: any) =>
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Prepare trend data by filling missing dates in the range
    const trendData = (() => {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        const dateMap = new Map(analytics.driverStats.trends.map((t: any) => [t._id, t.count]));

        const filled = [];
        const curr = new Date(start);
        // Safety break for extremely large ranges
        let iterations = 0;
        while (curr <= end && iterations < 366) {
            const dateStr = curr.toISOString().split('T')[0];
            filled.push({
                _id: dateStr,
                count: dateMap.get(dateStr) || 0
            });
            curr.setDate(curr.getDate() + 1);
            iterations++;
        }
        return filled;
    })();

    return (
        <div className="container-responsive space-y-8 animate-in fade-in duration-500 p-4 md:p-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-95 border border-white/10"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                {branch.name}
                            </h1>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#C8E600]/10 text-[#C8E600] border border-[#C8E600]/20">
                                {branch.code}
                            </span>
                        </div>
                        <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <MapPin size={14} className="text-[#C8E600]" />
                            {branch.city}, {branch.country}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="bg-transparent text-xs font-bold px-3 py-2 outline-none"
                            style={{ color: 'var(--text-main)' }}
                        />
                        <span className="text-xs opacity-30">to</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-xs font-bold px-3 py-2 outline-none"
                            style={{ color: 'var(--text-main)' }}
                        />
                    </div>
                    <button className="p-3 rounded-2xl bg-[#C8E600] text-black font-black hover:shadow-lg hover:shadow-[#C8E600]/20 transition-all active:scale-95">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Drivers Onboarded', value: analytics.driverStats.onboarded, icon: Users, color: '#C8E600' },
                    { label: 'Active Drivers', value: analytics.driverStats.active, icon: TrendingUp, color: '#22c55e' },
                    { label: 'Active Vehicles', value: analytics.vehicleStats.active, icon: Car, color: '#3b82f6' },
                    { label: 'Tasks Completed', value: analytics.taskSummary.completed, icon: CheckCircle2, color: '#8b5cf6' },
                    { label: 'Tasks Pending', value: analytics.taskSummary.pending, icon: Clock, color: '#eab308' },
                ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group overflow-hidden relative">
                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                            <stat.icon size={80} style={{ color: stat.color }} />
                        </div>
                        <div className="relative z-10">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${stat.color}20` }}>
                                <stat.icon size={20} style={{ color: stat.color }} />
                            </div>
                            <h3 className="text-[10px] font-black opacity-60 uppercase tracking-widest leading-tight">{stat.label}</h3>
                            <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Branch Info & Manager */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Branch Manager Card */}
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <User className="opacity-10" size={60} />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-[#C8E600] rounded-full" />
                            Branch Manager
                        </h2>
                        {branch.branchManager ? (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                                        {typeof branch.branchManager === 'object' ? branch.branchManager.fullName : 'Manager'}
                                    </p>
                                    <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Full Time Overseer</p>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5"><Mail size={14} className="text-[#C8E600]" /></div>
                                        <span className="text-sm truncate">{typeof branch.branchManager === 'object' ? branch.branchManager.email : 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5"><Phone size={14} className="text-[#C8E600]" /></div>
                                        <span className="text-sm">{branch.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 text-center border-2 border-dashed border-white/10 rounded-2xl">
                                <p className="text-sm opacity-50 italic">No manager assigned</p>
                            </div>
                        )}
                    </div>

                    {/* Contact & Location */}
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                        <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            <div className="w-2 h-6 bg-blue-500 rounded-full" />
                            Location Details
                        </h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="p-3 rounded-2xl bg-white/5 h-fit"><MapPin size={20} className="text-blue-500" /></div>
                                <div>
                                    <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-1">Full Address</p>
                                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                        {branch.address}, {branch.city},<br />
                                        {branch.state}, {branch.country}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-3 rounded-2xl bg-white/5 h-fit"><Mail size={20} className="text-blue-500" /></div>
                                <div>
                                    <p className="text-sm font-bold opacity-60 uppercase tracking-widest mb-1">Official Email</p>
                                    <p className="text-sm truncate" style={{ color: 'var(--text-main)' }}>{branch.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Staff Analytics & List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="p-8 rounded-3xl border border-white/10 bg-white/5 min-h-[600px] flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full" />
                                    Staff Performance
                                </h2>
                                <p className="text-xs font-bold opacity-50 mt-1 uppercase tracking-widest">Showing all active personnel</p>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search staff..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none focus:border-[#C8E600]/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Personnel</th>
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40">Role</th>
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-center">Tasks</th>
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-center">Success</th>
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-right">Status</th>
                                        <th className="px-4 py-4 text-xs font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredStaff.map((person: any) => {
                                        const successRate = person.analytics.totalTasks > 0
                                            ? Math.round((person.analytics.completedTasks / person.analytics.totalTasks) * 100)
                                            : 0;

                                        return (
                                            <tr key={person._id} className="group hover:bg-white/5 transition-all">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C8E600] to-[#8fb200] flex items-center justify-center text-black font-black">
                                                            {person.fullName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{person.fullName}</p>
                                                            <p className="text-xs opacity-50">{person.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className="text-xs font-bold opacity-70 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                                                        {person.role.replace('STAFF', '')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <p className="text-sm font-black">{person.analytics.totalTasks}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-xs font-black" style={{ color: successRate > 70 ? '#22c55e' : successRate > 40 ? '#eab308' : '#ef4444' }}>
                                                            {successRate}%
                                                        </span>
                                                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full transition-all duration-1000"
                                                                style={{
                                                                    width: `${successRate}%`,
                                                                    backgroundColor: successRate > 70 ? '#22c55e' : successRate > 40 ? '#eab308' : '#ef4444'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${person.status === 'ACTIVE'
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                        {person.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex justify-end">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const currentPath = window.location.pathname;
                                                                const basePath = currentPath.split('/manage-branches')[0];
                                                                navigate(`${basePath}/staff-performance/${person._id}`);
                                                            }}
                                                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#C8E600]/10 hover:bg-[#C8E600] text-[#C8E600] hover:text-black transition-all border border-[#C8E600]/20 font-black text-[10px] uppercase tracking-wider shadow-lg shadow-[#C8E600]/5"
                                                            title="View Performance Profile"
                                                        >
                                                            <Eye size={14} />
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredStaff.length === 0 && (
                                <div className="py-20 text-center opacity-30">
                                    <Building2 size={48} className="mx-auto mb-4" />
                                    <p className="text-lg font-bold">No staff found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Charts Section */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <div className="w-2 h-6 bg-lime-500 rounded-full" />
                            Driver Onboarding Trends
                        </h2>
                        <p className="text-xs font-bold opacity-50 mt-1 uppercase tracking-widest">Growth analysis for the selected period</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorOnboard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C8E600" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#C8E600" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="_id"
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(str) => {
                                        const d = new Date(str);
                                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                    }}
                                />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    itemStyle={{ color: '#C8E600', fontWeight: 'bold' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#C8E600"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorOnboard)"
                                    name="Drivers Onboarded"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-sm opacity-30 font-bold uppercase italic tracking-widest">
                            No onboarding data for this period
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BranchDetails;
