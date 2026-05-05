import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    BarChart3, TrendingUp, TrendingDown, Users, Download, 
    Calendar, Filter, FileText, ChevronDown, Loader2, 
    ArrowUpRight, ArrowDownRight, Activity, MapPin, Building2
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, Legend, Cell
} from 'recharts';
import { getDecodedToken } from '../../../utils/auth';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getAllCountryManagers, type CountryManager } from '../../../services/countryManagerService';
import { 
    getDailyFinanceReport, 
    getDriverPerformanceReport, 
    getStaffPerformanceReport,
    type DailyFinanceData,
    type DriverPerformanceData,
    type StaffPerformanceData
} from '../../../services/reportingService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const Reports = () => {
    const { t } = useTranslation();
    const user = getDecodedToken();
    const isCM = user?.role?.toLowerCase() === 'countrymanager';
    const isBM = user?.role?.toLowerCase() === 'branchmanager';
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'financeadmin';

    // State
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [countryManagers, setCountryManagers] = useState<CountryManager[]>([]);
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        branch: isBM ? user?.branchId : '',
        country: isCM ? user?.country : ''
    });

    const [dailyFinance, setDailyFinance] = useState<DailyFinanceData[]>([]);
    const [driverPerformance, setDriverPerformance] = useState<DriverPerformanceData[]>([]);
    const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceData[]>([]);

    const [activeTab, setActiveTab] = useState<'finance' | 'drivers' | 'staff'>('finance');

    // Fetch filters data
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [branchRes, managerRes] = await Promise.all([
                    getAllBranches({ limit: 100 }),
                    isAdmin ? getAllCountryManagers({ limit: 100 }) : Promise.resolve({ data: [] })
                ]);
                setBranches(branchRes.data);
                if (isAdmin) {
                    setCountryManagers(managerRes.data);
                }
            } catch (err) {
                console.error('Failed to fetch filter data', err);
            }
        };
        if (!isBM) fetchFilters();
    }, [isBM, isAdmin]);

    // Main fetch function
    const fetchData = async () => {
        setLoading(true);
        try {
            const [financeRes, driverRes, staffRes] = await Promise.all([
                getDailyFinanceReport(filters),
                getDriverPerformanceReport(filters),
                activeTab === 'staff' ? getStaffPerformanceReport(filters) : Promise.resolve({ data: [] })
            ]);
            setDailyFinance(financeRes.data);
            setDriverPerformance(driverRes.data);
            if (activeTab === 'staff') setStaffPerformance(staffRes.data);
        } catch (err) {
            toast.error('Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters, activeTab]);

    // Totals
    const totals = useMemo(() => {
        const income = dailyFinance.reduce((acc, curr) => acc + curr.income, 0);
        const expenses = dailyFinance.reduce((acc, curr) => acc + curr.expenses, 0);
        return { income, expenses, profit: income - expenses };
    }, [dailyFinance]);

    // Export Excel
    const exportExcel = () => {
        let data: any[] = [];
        let filename = 'Report';

        if (activeTab === 'finance') {
            data = dailyFinance.map(d => ({ Date: d.date, Income: d.income, Expenses: d.expenses, Profit: d.income - d.expenses }));
            filename = `Financial_Report_${filters.startDate}_to_${filters.endDate}`;
        } else if (activeTab === 'drivers') {
            data = driverPerformance.map(d => ({ Name: d.name, Branch: d.branch, 'Avg Speed': d.avgSpeed, 'Total Distance': d.totalDistance, 'Driving Score': d.drivingScore, 'Fuel Efficiency': d.fuelEfficiency, 'Rent Status': d.rentStatus, 'Rent Balance': d.rentBalance }));
            filename = `Driver_Performance_Report`;
        } else {
            data = staffPerformance.map(s => ({ Name: s.name, Role: s.role, 'Tasks Completed': s.tasksCompleted, 'Total Tasks': s.totalTasks, 'Completion Rate': `${s.taskCompletionRate.toFixed(1)}%`, 'Targets Met': s.targetsMet }));
            filename = `Staff_Performance_Report`;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    // Export PDF
    const exportPDF = () => {
        const doc = new jsPDF();
        const filename = activeTab.charAt(0).toUpperCase() + activeTab.slice(1) + ' Report';
        
        doc.setFontSize(18);
        doc.text(filename, 14, 22);
        doc.setFontSize(11);
        doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 14, 30);
        if (filters.country) doc.text(`Country: ${filters.country}`, 14, 35);
        if (filters.branch) {
            const bName = branches.find(b => b._id === filters.branch)?.name || filters.branch;
            doc.text(`Branch: ${bName}`, 14, 40);
        }

        let body: any[] = [];
        let head: any[] = [];

        if (activeTab === 'finance') {
            head = [['Date', 'Income', 'Expenses', 'Profit']];
            body = dailyFinance.map(d => [d.date, d.income.toFixed(2), d.expenses.toFixed(2), (d.income - d.expenses).toFixed(2)]);
        } else if (activeTab === 'drivers') {
            head = [['Name', 'Branch', 'Score', 'Distance', 'Rent Status']];
            body = driverPerformance.map(d => [d.name, d.branch, d.drivingScore, d.totalDistance, d.rentStatus]);
        } else {
            head = [['Name', 'Role', 'Tasks', 'Rate', 'Targets Met']];
            body = staffPerformance.map(s => [s.name, s.role, `${s.tasksCompleted}/${s.totalTasks}`, `${s.taskCompletionRate.toFixed(1)}%`, s.targetsMet]);
        }

        autoTable(doc, {
            head,
            body,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
        });

        doc.save(`${filename}.pdf`);
    };



    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                        {t('reports.title', 'Operational Reports')}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        {t('reports.subtitle', 'Comprehensive performance analytics and financial tracking')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={exportExcel}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                    >
                        <Download size={16} /> Excel
                    </button>
                    <button 
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                        style={{ background: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                    >
                        <FileText size={16} /> PDF Report
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 rounded-2xl border flex flex-wrap items-center gap-4" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(200,230,0,0.05)' }}>
                    <Filter size={16} style={{ color: 'var(--brand-lime)' }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--brand-lime)' }}>Filters</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                        <input 
                            type="date" 
                            value={filters.startDate}
                            onChange={e => setFilters({...filters, startDate: e.target.value})}
                            className="bg-transparent outline-none text-sm font-medium"
                            style={{ color: 'var(--text-main)' }}
                        />
                    </div>
                    <span style={{ color: 'var(--text-dim)' }}>—</span>
                    <input 
                        type="date" 
                        value={filters.endDate}
                        onChange={e => setFilters({...filters, endDate: e.target.value})}
                        className="bg-transparent outline-none text-sm font-medium"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                <div className="h-6 w-px" style={{ background: 'var(--border-main)' }} />

                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <MapPin size={14} style={{ color: 'var(--text-dim)' }} />
                        <select 
                            value={filters.country}
                            onChange={e => setFilters({...filters, country: e.target.value, branch: ''})}
                            className="bg-transparent outline-none text-sm font-medium cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="">All Managers / Countries</option>
                            {countryManagers.map(m => (
                                <option key={m._id} value={m.country}>
                                    {m.fullName} ({m.country})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {(isAdmin || isCM) && (
                    <div className="flex items-center gap-2">
                        <Building2 size={14} style={{ color: 'var(--text-dim)' }} />
                        <select 
                            value={filters.branch}
                            onChange={e => setFilters({...filters, branch: e.target.value})}
                            className="bg-transparent outline-none text-sm font-medium cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <option value="">All Branches</option>
                            {branches
                                .filter(b => !filters.country || b.country === filters.country)
                                .map(b => <option key={b._id} value={b._id}>{b.name}</option>)
                            }
                        </select>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-input)' }}>
                <button 
                    onClick={() => setActiveTab('finance')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'finance' ? 'shadow-lg scale-[1.02]' : 'opacity-50 hover:opacity-100'}`}
                    style={{ 
                        background: activeTab === 'finance' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'finance' ? 'var(--brand-lime)' : 'var(--text-main)'
                    }}
                >
                    Financial Trend
                </button>
                <button 
                    onClick={() => setActiveTab('drivers')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'drivers' ? 'shadow-lg scale-[1.02]' : 'opacity-50 hover:opacity-100'}`}
                    style={{ 
                        background: activeTab === 'drivers' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'drivers' ? 'var(--brand-lime)' : 'var(--text-main)'
                    }}
                >
                    Driver Performance
                </button>
                <button 
                    onClick={() => setActiveTab('staff')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'shadow-lg scale-[1.02]' : 'opacity-50 hover:opacity-100'}`}
                    style={{ 
                        background: activeTab === 'staff' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'staff' ? 'var(--brand-lime)' : 'var(--text-main)'
                    }}
                >
                    Staff Metrics
                </button>
            </div>

            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4">
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--brand-lime)' }} />
                    <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--text-dim)' }}>Generating deep insights...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {activeTab === 'finance' && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 rounded-3xl border relative overflow-hidden group" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-2xl" style={{ background: 'rgba(0,200,80,0.1)' }}>
                                                <TrendingUp size={24} style={{ color: '#22c55e' }} />
                                            </div>
                                            <ArrowUpRight size={20} className="opacity-30 group-hover:opacity-100 transition-all" />
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Total Revenue</p>
                                        <h3 className="text-3xl font-black mt-1">$ {totals.income.toLocaleString()}</h3>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full bg-green-500" />
                                </div>

                                <div className="p-6 rounded-3xl border relative overflow-hidden group" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,80,80,0.1)' }}>
                                                <TrendingDown size={24} style={{ color: '#ef4444' }} />
                                            </div>
                                            <ArrowDownRight size={20} className="opacity-30 group-hover:opacity-100 transition-all" />
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Total Expenses</p>
                                        <h3 className="text-3xl font-black mt-1">$ {totals.expenses.toLocaleString()}</h3>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-10 rounded-full bg-red-500" />
                                </div>

                                <div className="p-6 rounded-3xl border relative overflow-hidden group" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.03)' }}>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-2xl" style={{ background: 'rgba(200,230,0,0.1)' }}>
                                                <Activity size={24} style={{ color: 'var(--brand-lime)' }} />
                                            </div>
                                            <TrendingUp size={20} className="opacity-30 group-hover:opacity-100 transition-all" />
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-widest opacity-50">Net Profit</p>
                                        <h3 className="text-3xl font-black mt-1" style={{ color: 'var(--brand-lime)' }}>$ {totals.profit.toLocaleString()}</h3>
                                    </div>
                                    <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-lime-400" />
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="p-6 rounded-3xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-lg font-bold">Revenue vs Expenses Over Time</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--brand-lime)' }} />
                                            <span className="text-xs font-bold opacity-50">Revenue</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
                                            <span className="text-xs font-bold opacity-50">Expenses</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyFinance}>
                                            <defs>
                                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--brand-lime)" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="var(--brand-lime)" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                                                dy={10}
                                            />
                                            <YAxis 
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
                                            />
                                            <Tooltip 
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" dataKey="income" stroke="var(--brand-lime)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                            <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'drivers' && (
                        <div className="rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Driver</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Branch</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50 text-center">Score</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50 text-center">Total KM</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50 text-center">Fuel Eff.</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50 text-center">Rent Status</th>
                                            <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50 text-right">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {driverPerformance.map(driver => (
                                            <tr key={driver.id} className="border-t hover:bg-white/5 transition-all" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                                            {driver.name.charAt(0)}
                                                        </div>
                                                        <span className="font-bold">{driver.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm opacity-70">{driver.branch}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-xs font-black px-2 py-1 rounded-full ${driver.drivingScore > 80 ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                        {driver.drivingScore}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center text-sm font-mono">{driver.totalDistance.toLocaleString()} km</td>
                                                <td className="p-4 text-center text-sm opacity-70">{driver.fuelEfficiency} %</td>
                                                <td className="p-4 text-center">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${driver.rentStatus === 'PAID' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {driver.rentStatus}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-black" style={{ color: driver.rentBalance > 0 ? '#ef4444' : 'var(--text-main)' }}>
                                                    $ {driver.rentBalance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'staff' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {staffPerformance.map(staff => (
                                <div key={staff.id} className="p-6 rounded-3xl border flex flex-col gap-4" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold">{staff.name}</h4>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{staff.role}</span>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                            {Math.round(staff.taskCompletionRate)}%
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="opacity-50">Tasks Completed</span>
                                            <span className="font-bold">{staff.tasksCompleted} / {staff.totalTasks}</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000" 
                                                style={{ width: `${staff.taskCompletionRate}%`, background: 'var(--brand-lime)' }} 
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center gap-2">
                                            <TrendingUp size={14} className="text-green-500" />
                                            <span className="text-xs font-bold">{staff.targetsMet} Targets Met</span>
                                        </div>
                                        <span className="text-[10px] font-black opacity-30">{staff.activeTargets} Total Targets</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
