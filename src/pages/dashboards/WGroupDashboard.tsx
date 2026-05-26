import { useState } from 'react';
import {
    ResponsiveContainer, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, AreaChart, Area
} from 'recharts';
import {
    Car, Wallet, Building, HardHat, TrendingUp, Users, DollarSign,
    ArrowUpRight, AlertCircle, RefreshCw, BarChart2, Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import OlaLoader from '../../components/common/OlaLoader';
import { useEffect } from 'react';

interface BusinessData {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    metrics: {
        revenue: string;
        growth: string;
        employees: string;
        operations: string;
    };
    chartData: { month: string; performance: number; users: number }[];
}

const WGroupDashboard = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 900);
        return () => clearTimeout(timer);
    }, []);

    // Consolidated dummy data
    const businesses: BusinessData[] = [
        {
            id: 'ola-cars',
            name: 'OLA Cars',
            icon: <Car size={24} />,
            color: '#C8E600', // Brand Lime
            description: 'Next-gen mobility and premium fleet management services across multiple branches.',
            metrics: {
                revenue: '$2.4M',
                growth: '+14.2%',
                employees: '142',
                operations: '1,200 Active Fleet'
            },
            chartData: [
                { month: 'Jan', performance: 4000, users: 2400 },
                { month: 'Feb', performance: 3000, users: 1398 },
                { month: 'Mar', performance: 2000, users: 9800 },
                { month: 'Apr', performance: 2780, users: 3908 },
                { month: 'May', performance: 1890, users: 4800 },
                { month: 'Jun', performance: 2390, users: 3800 },
                { month: 'Jul', performance: 3490, users: 4300 }
            ]
        },
        {
            id: 'ola-credits',
            name: 'Ola Credits',
            icon: <Wallet size={24} />,
            color: '#3B82F6', // Sleek Blue
            description: 'Digital micro-lending and driver financial services ecosystem.',
            metrics: {
                revenue: '$850K',
                growth: '+22.5%',
                employees: '38',
                operations: '8,400 active lines'
            },
            chartData: [
                { month: 'Jan', performance: 1500, users: 3400 },
                { month: 'Feb', performance: 2100, users: 4500 },
                { month: 'Mar', performance: 2800, users: 5100 },
                { month: 'Apr', performance: 3200, users: 6000 },
                { month: 'May', performance: 4000, users: 7800 },
                { month: 'Jun', performance: 4900, users: 9200 },
                { month: 'Jul', performance: 5800, users: 11000 }
            ]
        },
        {
            id: 'w-group',
            name: 'W-Group Parent',
            icon: <Building size={24} />,
            color: '#8B5CF6', // Royal Violet
            description: 'Parent holding company supervising governance, compliance, and capital allocation.',
            metrics: {
                revenue: '$4.1M',
                growth: '+8.7%',
                employees: '12',
                operations: '4 Subsidiary units'
            },
            chartData: [
                { month: 'Jan', performance: 3000, users: 12000 },
                { month: 'Feb', performance: 3200, users: 12500 },
                { month: 'Mar', performance: 3400, users: 13000 },
                { month: 'Apr', performance: 3600, users: 13800 },
                { month: 'May', performance: 3800, users: 14200 },
                { month: 'Jun', performance: 4000, users: 14800 },
                { month: 'Jul', performance: 4100, users: 15400 }
            ]
        },
        {
            id: 'construction',
            name: 'Construction Division',
            icon: <HardHat size={24} />,
            color: '#E67E22', // Amber Orange
            description: 'Commercial infrastructure development and branch workshop renovations.',
            metrics: {
                revenue: '$1.8M',
                growth: '+5.1%',
                employees: '85',
                operations: '3 ongoing projects'
            },
            chartData: [
                { month: 'Jan', performance: 2500, users: 300 },
                { month: 'Feb', performance: 1800, users: 400 },
                { month: 'Mar', performance: 3100, users: 450 },
                { month: 'Apr', performance: 2900, users: 500 },
                { month: 'May', performance: 2200, users: 550 },
                { month: 'Jun', performance: 3500, users: 650 },
                { month: 'Jul', performance: 3800, users: 700 }
            ]
        }
    ];

    // Combine chart data for consolidated view
    const consolidatedChartData = [
        { month: 'Jan', 'OLA Cars': 4000, 'Ola Credits': 1500, 'W-Group': 3000, 'Construction': 2500 },
        { month: 'Feb', 'OLA Cars': 3000, 'Ola Credits': 2100, 'W-Group': 3200, 'Construction': 1800 },
        { month: 'Mar', 'OLA Cars': 2000, 'Ola Credits': 2800, 'W-Group': 3400, 'Construction': 3100 },
        { month: 'Apr', 'OLA Cars': 2780, 'Ola Credits': 3200, 'W-Group': 3600, 'Construction': 2900 },
        { month: 'May', 'OLA Cars': 1890, 'Ola Credits': 4000, 'W-Group': 3800, 'Construction': 2200 },
        { month: 'Jun', 'OLA Cars': 2390, 'Ola Credits': 4900, 'W-Group': 4000, 'Construction': 3500 },
        { month: 'Jul', 'OLA Cars': 3490, 'Ola Credits': 5800, 'W-Group': 4100, 'Construction': 3800 }
    ];

    const chartColors = {
        grid: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(0, 0, 0, 0.05)',
        text: isDark ? '#94A3B8' : '#64748B',
        tooltipBg: isDark ? '#1C1C1C' : '#FFFFFF',
        tooltipBorder: isDark ? '#2A2A2A' : '#E5E7EB',
        tooltipText: isDark ? '#FFFFFF' : '#0A0A0A'
    };

    // Calculate aggregated stats
    const totalAssets = '$9.15M';
    const totalEmployeesCount = 277;
    const globalGrowth = '+12.8%';

    const filteredBusinesses = selectedBusiness === 'all'
        ? businesses
        : businesses.filter(b => b.id === selectedBusiness);

    if (loading) {
        return <OlaLoader fullScreen size="lg" />;
    }

    return (
        <div
            className="p-6 md:p-8 min-h-screen transition-colors duration-300"
            style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Layers className="text-[#C8E600] animate-pulse" /> W-Group Ecosystem
                        <span className="text-xs px-2.5 py-1 rounded-full font-extrabold uppercase tracking-widest bg-rose-600 text-white animate-bounce">
                            Beta
                        </span>
                    </h1>
                    <p className="font-semibold text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        Unified Conglomerate Command Center
                    </p>
                </div>

                {/* Switcher tabs */}
                <div
                    className="flex flex-wrap gap-2 p-1.5 rounded-2xl border transition-colors shadow-inner"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <button
                        onClick={() => setSelectedBusiness('all')}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition-all duration-300 ${selectedBusiness === 'all' ? 'bg-[#C8E600] text-black shadow-md' : 'opacity-70 hover:opacity-100'}`}
                    >
                        Consolidated View
                    </button>
                    {businesses.map((biz) => (
                        <button
                            key={biz.id}
                            onClick={() => setSelectedBusiness(biz.id)}
                            className={`px-4 py-2 text-xs font-black rounded-xl transition-all duration-300 flex items-center gap-1.5 ${selectedBusiness === biz.id ? 'bg-white text-black shadow-md' : 'opacity-70 hover:opacity-100'}`}
                            style={{
                                borderLeft: selectedBusiness === biz.id ? `4px solid ${biz.color}` : '4px solid transparent'
                            }}
                        >
                            <span style={{ color: selectedBusiness === biz.id ? 'inherit' : biz.color }}>
                                {biz.icon}
                            </span>
                            {biz.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* CRITICAL WARNING BANNER */}
            <div
                className="mb-8 p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-center gap-4 transition-all duration-300 relative overflow-hidden bg-rose-500/10 border-rose-500/30"
            >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 flex-shrink-0">
                    <AlertCircle size={24} className="animate-spin-slow" />
                </div>
                <div className="text-center sm:text-left flex-1">
                    <h3 className="font-black text-rose-500 text-lg uppercase tracking-wider">Dummy Data Preview Banner</h3>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-main)' }}>
                        This was only dummy data configured for demonstration purposes. System is currently running mock simulations to showcase W-Group operations.
                    </p>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500/60 bg-rose-500/5 px-3 py-1 rounded-full border border-rose-500/20">
                    BETA SIMULATOR
                </div>
            </div>

            {/* Aggregated Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                    className="rounded-3xl p-6 shadow-sm border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <DollarSign size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                            <ArrowUpRight size={10} /> {globalGrowth}
                        </span>
                    </div>
                    <div className="mt-6">
                        <div className="text-3xl font-black">{totalAssets}</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-75 mt-1" style={{ color: 'var(--text-dim)' }}>
                            Ecosystem Revenue
                        </div>
                    </div>
                </div>

                <div
                    className="rounded-3xl p-6 shadow-sm border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                            <Users size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/10 text-indigo-500">
                            FTE Staff
                        </span>
                    </div>
                    <div className="mt-6">
                        <div className="text-3xl font-black">{totalEmployeesCount}</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-75 mt-1" style={{ color: 'var(--text-dim)' }}>
                            Consolidated Employees
                        </div>
                    </div>
                </div>

                <div
                    className="rounded-3xl p-6 shadow-sm border flex flex-col justify-between transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                            <TrendingUp size={20} />
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#C8E600]/20 text-[#C8E600]">
                            Live
                        </span>
                    </div>
                    <div className="mt-6">
                        <div className="text-3xl font-black">4 Sectors</div>
                        <div className="text-xs font-bold uppercase tracking-wider opacity-75 mt-1" style={{ color: 'var(--text-dim)' }}>
                            Active Business Spheres
                        </div>
                    </div>
                </div>
            </div>

            {/* Sector Information Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
                {/* Sector Cards */}
                <div className="xl:col-span-6 flex flex-col gap-6">
                    <h2 className="text-xl font-black flex items-center gap-2">
                        <BarChart2 className="text-rose-500" /> Segment Details
                    </h2>
                    {filteredBusinesses.map((biz) => (
                        <div
                            key={biz.id}
                            className="rounded-3xl p-6 shadow-sm border transition-all duration-300 flex flex-col justify-between hover:shadow-lg relative overflow-hidden"
                            style={{
                                background: 'var(--bg-card)',
                                borderColor: 'var(--border-main)',
                                borderLeft: `6px solid ${biz.color}`
                            }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                        style={{ background: `${biz.color}15`, color: biz.color }}
                                    >
                                        {biz.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">{biz.name}</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 uppercase tracking-widest text-[#C8E600]">
                                            Ecosystem Unit
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-black" style={{ color: biz.color }}>
                                        {biz.metrics.revenue}
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-0.5">
                                        <ArrowUpRight size={12} /> {biz.metrics.growth}
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs font-semibold mt-4 mb-4 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                {biz.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Employees
                                    </span>
                                    <span className="text-xs font-black">{biz.metrics.employees} staff members</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Operations Base
                                    </span>
                                    <span className="text-xs font-black">{biz.metrics.operations}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Analytical Charts */}
                <div
                    className="xl:col-span-6 rounded-3xl p-6 shadow-sm border transition-colors flex flex-col justify-between min-h-[450px]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Trend Analysis</h3>
                                <p className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
                                    {selectedBusiness === 'all' ? 'Ecosystem Consolidated Performance (USD)' : `${filteredBusinesses[0].name} Performance Details`}
                                </p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-rose-500 animate-spin-slow">
                                <RefreshCw size={15} />
                            </div>
                        </div>

                        <div className="h-[300px]">
                            {selectedBusiness === 'all' ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={consolidatedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartColors.grid} />
                                        <XAxis dataKey="month" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke={chartColors.text} fontSize={10} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: chartColors.tooltipBg,
                                                border: `1px solid ${chartColors.tooltipBorder}`,
                                                borderRadius: '12px',
                                                color: chartColors.tooltipText
                                            }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        <Line type="monotone" dataKey="OLA Cars" stroke="#C8E600" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="Ola Credits" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="W-Group" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="Construction" stroke="#E67E22" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={filteredBusinesses[0].chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="bizColor" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={filteredBusinesses[0].color} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={filteredBusinesses[0].color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartColors.grid} />
                                        <XAxis dataKey="month" stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke={chartColors.text} fontSize={10} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            contentStyle={{
                                                backgroundColor: chartColors.tooltipBg,
                                                border: `1px solid ${chartColors.tooltipBorder}`,
                                                borderRadius: '12px',
                                                color: chartColors.tooltipText
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="performance"
                                            stroke={filteredBusinesses[0].color}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#bizColor)"
                                            dot={{ fill: filteredBusinesses[0].color, r: 4 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    <div className="pt-6 border-t mt-4 flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500">
                            NOTE: DATA IS PRE-PRODUCTION SIMULATION ONLY.
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default WGroupDashboard;
