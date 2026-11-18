import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, TrendingUp, Calendar, BarChart3,
    ArrowUpRight, Activity, ChevronDown, Users, CheckCircle, Search, RefreshCw,
    FileText, Receipt, ArrowLeftRight, UploadCloud
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    AreaChart, Area, BarChart, Bar
} from 'recharts';

import { 
    getStaffPerformance, 
    type StaffPerformanceData, 
    type BranchManagerPerformanceData, 
    type CountryManagerPerformanceData, 
    type GlobalAdminPerformanceData,
    type DailyTrendPoint,
    type PerformanceSummary
} from '../../../services/staffPerformanceService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUserRole } from '../../../utils/auth';
import { StatCard } from '../../../components/dashboard/widgets/StatusCards';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(val);
};

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
    const [summaryData, setSummaryData] = useState<PerformanceSummary | null>(null);
    const [dailyTrendData, setDailyTrendData] = useState<DailyTrendPoint[]>([]);

    const [dateRange, setDateRange] = useState(() => {
        const start = new Date();
        start.setDate(start.getDate() - 29); // Past 30 days
        return {
            startDate: start.toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        };
    });
    
    const [staffType, setStaffType] = useState<'all' | 'finance' | 'operation' | 'branch-manager' | 'country-manager' | 'finance-admin' | 'operation-admin' | 'admin'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const normalizedRole = userRole?.toLowerCase().replace(/[ _-]/g, '') || '';
    const isBranchScoped = ['branchmanager'].includes(normalizedRole);
    const isAdmin = ['admin', 'financeadmin', 'operationadmin'].includes(normalizedRole);

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

    const fetchData = async (forceRefresh = false) => {
        setLoading(true);
        try {
            const data = await getStaffPerformance({
                branch: isBranchScoped ? undefined : selectedBranch || undefined,
                type: staffType,
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                ...(forceRefresh ? { refresh: 'true' } as any : {})
            }, forceRefresh);
            setFinStaff(data.data.financeStaff || []);
            setOpStaff(data.data.operationStaff || []);
            setBranchManagers(data.data.branchManagers || []);
            setCountryManagers(data.data.countryManagers || []);
            setGlobalAdmins(data.data.globalAdmins || []);
            setSummaryData(data.data.summary || null);
            setDailyTrendData(data.data.dailyTrend || []);
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
        if (isAdmin && (staffType === 'all' || staffType === 'admin')) {
            combined = [...combined, ...globalAdmins.filter(a => a.role === 'admin' || (a as any).role === 'ADMIN').map(s => ({ ...s, _listType: 'admin' as const } as any))];
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

        return combined.sort((a, b) => {
            const workA = a.workMetrics?.totalDailyWorkDone ?? a.metrics?.totalStageActions ?? 0;
            const workB = b.workMetrics?.totalDailyWorkDone ?? b.metrics?.totalStageActions ?? 0;
            return workB - workA;
        });
    };

    const combinedList = displayStaff();

    // Summary calculations fallback if not returned by backend
    const computedSummary = useMemo(() => {
        if (summaryData) return summaryData;

        let totalInvoices = 0, totalInvoiceAmount = 0;
        let totalBills = 0, totalBillAmount = 0;
        let totalDebitNotes = 0, totalDebitNoteAmount = 0;
        let totalCreditNotes = 0, totalCreditNoteAmount = 0;
        let totalBankTransactions = 0, totalBankTransactionAmount = 0;
        let totalUploads = 0;

        combinedList.forEach(s => {
            const wm = s.workMetrics;
            if (wm) {
                totalInvoices += wm.invoicesCount || 0;
                totalInvoiceAmount += wm.invoicesTotalAmount || 0;
                totalBills += wm.billsCount || 0;
                totalBillAmount += wm.billsTotalAmount || 0;
                totalDebitNotes += wm.debitNotesCount || 0;
                totalDebitNoteAmount += wm.debitNotesTotalAmount || 0;
                totalCreditNotes += wm.creditNotesCount || 0;
                totalCreditNoteAmount += wm.creditNotesTotalAmount || 0;
                totalBankTransactions += wm.bankTransactionsCount || 0;
                totalBankTransactionAmount += wm.bankTransactionsTotalAmount || 0;
                totalUploads += wm.uploadsCount || 0;
            }
        });

        const totalDailyWorkDone = totalInvoices + totalBills + totalDebitNotes + totalCreditNotes + totalBankTransactions + totalUploads;

        return {
            totalInvoices,
            totalInvoiceAmount,
            totalBills,
            totalBillAmount,
            totalDebitNotes,
            totalDebitNoteAmount,
            totalCreditNotes,
            totalCreditNoteAmount,
            totalBankTransactions,
            totalBankTransactionAmount,
            totalUploads,
            totalDailyWorkDone,
            activeStaffCount: combinedList.length
        };
    }, [summaryData, combinedList]);

    // Visual Chart Analytics
    const chartData = useMemo(() => {
        // Staff Leaderboard (Top 8 contributors)
        const leaderboard = combinedList
            .slice(0, 8)
            .map(s => {
                const wm = s.workMetrics;
                return {
                    name: s.fullName.split(' ')[0],
                    invoices: wm?.invoicesCount || 0,
                    bills: wm?.billsCount || 0,
                    notes: (wm?.debitNotesCount || 0) + (wm?.creditNotesCount || 0),
                    bankTx: wm?.bankTransactionsCount || 0,
                    total: (wm?.invoicesCount || 0) + (wm?.billsCount || 0) + (wm?.debitNotesCount || 0) + (wm?.creditNotesCount || 0) + (wm?.bankTransactionsCount || 0)
                };
            });

        return {
            dailyVelocity: dailyTrendData,
            leaderboard
        };
    }, [combinedList, dailyTrendData]);

    const getStatusColor = (status: string) => {
        return status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
               status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
               'bg-rose-500/10 text-rose-400 border-rose-500/20';
    };

    return (
        <div className={`flex-1 w-full overflow-y-auto h-screen custom-scrollbar transition-all duration-300 ${loading ? 'opacity-65 pointer-events-none' : ''}`} style={{ backgroundColor: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Resource Intelligence', active: true }]} />

            {/* Header & Controls */}
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Activity size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Resource Intelligence & Daily Work Telemetry
                            <button
                                onClick={() => fetchData(true)}
                                disabled={loading}
                                className="p-1 rounded-lg hover:bg-white/10 transition-colors ml-1 cursor-pointer disabled:opacity-50"
                                title="Force refresh data"
                            >
                                <RefreshCw className={`${loading ? 'animate-spin' : ''} text-brand-lime`} size={16} />
                            </button>
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">
                            Real-time operational productivity: Invoices, Bills, Debit/Credit Notes, Bank Transactions, and Central Upload Tracking.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Role filter buttons */}
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

                        {/* Date Range Picker */}
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

                {/* 6 High-Impact Operational KPI Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-2">
                    <StatCard 
                        superTitle="Billing Output"
                        title="Invoices Created" 
                        value={computedSummary.totalInvoices} 
                        subValue={formatCurrency(computedSummary.totalInvoiceAmount)}
                        icon={<FileText size={16} />} 
                        color="rgba(200, 230, 0, 0.15)"
                    />
                    <StatCard 
                        superTitle="Accounts Payable"
                        title="Bills Processed" 
                        value={computedSummary.totalBills} 
                        subValue={formatCurrency(computedSummary.totalBillAmount)}
                        icon={<Receipt size={16} />} 
                        color="rgba(59, 130, 246, 0.15)"
                    />
                    <StatCard 
                        superTitle="Adjustments"
                        title="Debit/Credit Notes" 
                        value={computedSummary.totalDebitNotes + computedSummary.totalCreditNotes} 
                        subValue={formatCurrency(computedSummary.totalDebitNoteAmount + computedSummary.totalCreditNoteAmount)}
                        icon={<ArrowLeftRight size={16} />} 
                        color="rgba(139, 92, 246, 0.15)"
                    />
                    <StatCard 
                        superTitle="Treasury Operations"
                        title="Bank Transactions" 
                        value={computedSummary.totalBankTransactions} 
                        subValue={formatCurrency(computedSummary.totalBankTransactionAmount)}
                        icon={<Activity size={16} />} 
                        color="rgba(245, 158, 11, 0.15)"
                    />
                    <StatCard 
                        superTitle="Document Integrity"
                        title="Attached Proofs & Docs" 
                        value={computedSummary.totalUploads} 
                        subValue="Verified Attachments"
                        icon={<UploadCloud size={16} />} 
                        color="rgba(16, 185, 129, 0.15)"
                    />
                    <StatCard 
                        superTitle="Daily Throughput"
                        title="Total Work Done" 
                        value={computedSummary.totalDailyWorkDone} 
                        subValue={`${computedSummary.activeStaffCount} Active Staff`}
                        icon={<CheckCircle size={16} />} 
                        color="rgba(200, 230, 0, 0.25)"
                    />
                </div>
            </div>

            {/* Main Content & Visual Analytics */}
            <div className="p-8 max-w-[1600px] mx-auto space-y-10 pb-24">
                
                {/* Visual Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* 1. Daily Operational Velocity (Area Chart) */}
                    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-lime/10 text-lime">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Operational Velocity</h2>
                                    <p className="text-[10px] text-dim mt-0.5">Daily volume of financial & system activities</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-black text-brand-lime px-3 py-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                                TIME SERIES TELEMETRY
                            </div>
                        </div>

                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.dailyVelocity} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#C8E600" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#C8E600" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="billGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                    <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} 
                                        itemStyle={{ color: 'var(--text-main)' }} 
                                    />
                                    <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#C8E600" strokeWidth={2} fill="url(#invGrad)" />
                                    <Area type="monotone" dataKey="bills" name="Bills" stroke="#3B82F6" strokeWidth={2} fill="url(#billGrad)" />
                                    <Area type="monotone" dataKey="debitNotes" name="Debit Notes" stroke="#8B5CF6" strokeWidth={2} fillOpacity={0} />
                                    <Area type="monotone" dataKey="creditNotes" name="Credit Notes" stroke="#EC4899" strokeWidth={2} fillOpacity={0} />
                                    <Area type="monotone" dataKey="bankTransactions" name="Bank Tx" stroke="#F59E0B" strokeWidth={2} fillOpacity={0} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Staff Productivity Leaderboard (Stacked Bar) */}
                    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-8 relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                                    <BarChart3 size={20} />
                                </div>
                                <div>
                                    <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-dim">Top Staff Output Leaderboard</h2>
                                    <p className="text-[10px] text-dim mt-0.5">Comparative throughput across financial operations</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] font-black uppercase opacity-60">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C8E600]" /> Invoices</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Bills</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8B5CF6]" /> Notes</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Bank Tx</span>
                            </div>
                        </div>

                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.leaderboard} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                    <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} 
                                        itemStyle={{ color: 'var(--text-main)' }} 
                                    />
                                    <Bar dataKey="invoices" name="Invoices" stackId="a" fill="#C8E600" />
                                    <Bar dataKey="bills" name="Bills" stackId="a" fill="#3B82F6" />
                                    <Bar dataKey="notes" name="Notes" stackId="a" fill="#8B5CF6" />
                                    <Bar dataKey="bankTx" name="Bank Tx" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Staff Daily Work Performance Table */}
                <div className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-[var(--border-main)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--text-main)] flex items-center gap-3">
                                <Users size={18} className="text-brand-lime" />
                                Employee Daily Work & Productivity Matrix
                            </h2>
                            <p className="text-xs font-medium text-dim mt-1">
                                Exact volume of Invoices, Bills, Debit/Credit Notes, Bank Transactions, and Uploads processed by each account.
                            </p>
                        </div>

                        <div className="relative min-w-[280px]">
                            <input 
                                type="text"
                                placeholder="Filter by resource name, email, node..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] pl-10 focus:outline-none focus:border-brand-lime transition-colors"
                            />
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-input)] opacity-60">
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Account / Resource</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Designation & Node</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Invoices</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Bills</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Debit / Credit</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Bank Tx</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Attached Docs</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Total Output</th>
                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-main)]">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={9} className="p-6"><div className="h-4 bg-[var(--bg-input)] rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : combinedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="p-20 text-center text-dim font-bold uppercase tracking-widest italic opacity-30">
                                            No matching employee activity found for the selected period
                                        </td>
                                    </tr>
                                ) : (
                                    combinedList.map(staff => {
                                        const wm = staff.workMetrics || {
                                            invoicesCount: 0,
                                            invoicesTotalAmount: 0,
                                            billsCount: 0,
                                            billsTotalAmount: 0,
                                            debitNotesCount: 0,
                                            creditNotesCount: 0,
                                            bankTransactionsCount: 0,
                                            uploadsCount: 0,
                                            totalDailyWorkDone: 0
                                        };

                                        return (
                                            <tr key={staff.staffId} className="hover:bg-[var(--bg-input)] transition-colors group">
                                                {/* Staff identity */}
                                                <td className="p-4 pl-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-lime/10 flex items-center justify-center text-lime font-black text-sm border border-lime/10">
                                                            {staff.fullName.split(' ')[0].charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-[var(--text-main)] group-hover:text-lime transition-colors">
                                                                {staff.fullName}
                                                            </p>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-0.5 inline-block ${getStatusColor(staff.status)}`}>
                                                                {staff.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Role & Branch */}
                                                <td className="p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">
                                                        {staff._listType.replace('-', ' ')}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-dim mt-0.5 flex items-center gap-1">
                                                        <MapPin size={8} className="text-lime" />
                                                        {staff._listType === 'country-manager' ? (staff as any).country : 
                                                         (staff._listType === 'finance-admin' || staff._listType === 'operation-admin' || staff._listType === 'admin') ? 'Global HQ' : 
                                                         staff.branchName || 'Main Node'}
                                                    </p>
                                                </td>

                                                {/* Invoices */}
                                                <td className="p-4 text-center">
                                                    <p className="text-sm font-black text-[var(--text-main)]">
                                                        {wm.invoicesCount}
                                                    </p>
                                                    {wm.invoicesTotalAmount > 0 && (
                                                        <p className="text-[8px] font-bold text-emerald-400">
                                                            {formatCurrency(wm.invoicesTotalAmount)}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Bills */}
                                                <td className="p-4 text-center">
                                                    <p className="text-sm font-black text-[var(--text-main)]">
                                                        {wm.billsCount}
                                                    </p>
                                                    {wm.billsTotalAmount > 0 && (
                                                        <p className="text-[8px] font-bold text-blue-400">
                                                            {formatCurrency(wm.billsTotalAmount)}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Debit & Credit Notes */}
                                                <td className="p-4 text-center">
                                                    <p className="text-sm font-black text-[var(--text-main)]">
                                                        {wm.debitNotesCount + wm.creditNotesCount}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-dim">
                                                        {wm.debitNotesCount} DN / {wm.creditNotesCount} CN
                                                    </p>
                                                </td>

                                                {/* Bank Transactions */}
                                                <td className="p-4 text-center">
                                                    <p className="text-sm font-black text-[var(--text-main)]">
                                                        {wm.bankTransactionsCount}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-amber-400">
                                                        {wm.bankTransactionsCount > 0 ? 'Reconciled' : '—'}
                                                    </p>
                                                </td>

                                                {/* Uploads */}
                                                <td className="p-4 text-center">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs border border-emerald-500/20">
                                                        <UploadCloud size={10} /> {wm.uploadsCount}
                                                    </span>
                                                </td>

                                                {/* Total Daily Output */}
                                                <td className="p-4 text-center">
                                                    <span className="inline-block px-3 py-1 rounded-xl bg-lime/10 text-brand-lime font-black text-sm border border-lime/20">
                                                        {wm.totalDailyWorkDone}
                                                    </span>
                                                    <p className="text-[8px] font-black uppercase text-dim tracking-widest mt-0.5">Actions</p>
                                                </td>

                                                {/* Actions: Profile */}
                                                <td className="p-4 text-right pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                const currentPath = window.location.pathname;
                                                                const basePath = currentPath.split('/staff-performance')[0];
                                                                navigate(`${basePath}/staff-performance/${staff.staffId}`);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-dim hover:text-[var(--text-main)] transition-all border border-[var(--border-main)] font-black text-[9px] uppercase tracking-wider cursor-pointer"
                                                            title="View full employee profile"
                                                        >
                                                            Profile <ArrowUpRight size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
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
