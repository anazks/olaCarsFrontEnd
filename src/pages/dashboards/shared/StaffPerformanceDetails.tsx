import { formatDate } from '../../../utils/dateUtils';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Calendar, 
    Building2, 
    ArrowLeft,
    Shield,
    Activity,
    Smartphone,
    FileText,
    Receipt,
    ArrowLeftRight,
    Download,
    ShieldCheck
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
import { getIndividualStaffPerformance } from '../../../services/staffPerformanceService';
import { StatCard } from '../../../components/dashboard/widgets/StatusCards';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(val);
};

const StaffPerformanceDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [auditCategory, setAuditCategory] = useState<string>('ALL');

    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const lastMonth = new Date();
        lastMonth.setDate(now.getDate() - 29);
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

    const filteredAuditHistory = useMemo(() => {
        if (!data?.auditHistory) return [];
        if (auditCategory === 'ALL') return data.auditHistory;
        return data.auditHistory.filter((item: any) => item.entityType === auditCategory);
    }, [data?.auditHistory, auditCategory]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="p-12 text-center bg-red-500/5 border border-red-500/10 rounded-[2rem] max-w-2xl mx-auto mt-20">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Staff Performance Details', active: true }]} />

            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                 <Shield size={32} />
            </div>
            <h2 className="text-lg font-black text-[var(--text-main)] mb-2">Access Issue</h2>
            <p className="text-dim font-medium mb-8">{error || 'The requested staff member profile could not be retrieved.'}</p>
            <button 
                onClick={() => navigate(-1)} 
                className="px-8 py-3 bg-[var(--bg-input)] hover:bg-[var(--bg-card)] rounded-2xl transition-all font-bold flex items-center gap-2 mx-auto cursor-pointer"
            >
                <ArrowLeft size={18} /> Return to Directory
            </button>
        </div>
    );

    const { profile, hierarchy, workSummary, dailyWorkBreakdown } = data;

    const summary = workSummary || {
        invoicesCount: 0,
        invoicesTotalAmount: 0,
        billsCount: 0,
        billsTotalAmount: 0,
        debitNotesCount: 0,
        debitNotesTotalAmount: 0,
        creditNotesCount: 0,
        creditNotesTotalAmount: 0,
        bankTransactionsCount: 0,
        bankTransactionsTotalAmount: 0,
        uploadsCount: 0,
        totalDailyWorkDone: 0
    };

    return (
        <div className="container-responsive space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 py-8 px-4 md:px-8">
            
            {/* Navigation & Controls */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate(-1)} 
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] transition-all text-xs font-black uppercase tracking-widest text-dim hover:text-[var(--text-main)] cursor-pointer"
                >
                    <ArrowLeft size={14} /> Back to Staff
                </button>
                <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Analysis Period</span>
                     <div className="flex items-center gap-2 p-1 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
                        <input 
                            type="date" 
                            value={dateRange.startDate} 
                            max={todayStr}
                            onChange={(e) => {
                                const newStart = e.target.value;
                                setDateRange(prev => ({
                                    startDate: newStart,
                                    endDate: newStart && prev.endDate && prev.endDate < newStart ? newStart : prev.endDate
                                }));
                            }}
                            className="bg-transparent text-[11px] font-bold px-3 py-1.5 outline-none cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                        />
                        <div className="w-px h-4 bg-[var(--border-main)]" />
                        <input 
                            type="date" 
                            value={dateRange.endDate} 
                            disabled={!dateRange.startDate}
                            min={dateRange.startDate}
                            max={todayStr}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="bg-transparent text-[11px] font-bold px-3 py-1.5 outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Profile Header */}
            <div className="relative group overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 md:p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-all duration-1000 group-hover:scale-125" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Avatar, Name & Designation */}
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-lime flex items-center justify-center text-black text-xl font-black shadow-sm shrink-0">
                            {profile.fullName.split(' ')[0].charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg md:text-xl font-black tracking-tight text-[var(--text-main)]">
                                    {profile.fullName}
                                </h1>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                                    profile.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    <div className={`w-1 h-1 rounded-full ${profile.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                                    {profile.status}
                                </span>
                            </div>
                            <p className="text-xs font-bold text-dim mt-1 flex items-center gap-1.5">
                                <Shield size={12} className="text-lime" /> {profile.role}
                            </p>
                        </div>
                    </div>

                    {/* Middle: Horizontal Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t md:border-t-0 border-[var(--border-main)] pt-4 md:pt-0">
                        <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-45">Hub Node</span>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-[var(--text-main)]">
                                <Building2 size={12} className="text-lime" /> {hierarchy.branch?.name || 'Global HQ'}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-45">Access Channel</span>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-[var(--text-main)]">
                                <Smartphone size={12} className="text-lime" /> {profile.phone || 'System Direct'}
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-45">Tenure Start</span>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-[var(--text-main)]">
                                <Calendar size={12} className="text-lime" /> {formatDate(profile.createdAt)}
                            </p>
                        </div>
                    </div>

                    {/* Right: Output Telemetry */}
                    <div className="flex items-center gap-3 border-t md:border-t-0 border-[var(--border-main)] pt-4 md:pt-0">
                         <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] text-center min-w-[90px]">
                            <p className="text-base font-black text-lime leading-none">{summary.totalDailyWorkDone}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-45 mt-1">Total Actions</p>
                         </div>
                         <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] text-center min-w-[90px]">
                            <p className="text-base font-black text-emerald-400 leading-none">{summary.uploadsCount}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest opacity-45 mt-1">Uploads</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* Daily Work Output Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    superTitle="Billing Output"
                    title="Invoices Created"
                    value={summary.invoicesCount}
                    subValue={formatCurrency(summary.invoicesTotalAmount)}
                    icon={<FileText size={18} />}
                    color="rgba(200, 230, 0, 0.15)"
                />
                <StatCard
                    superTitle="Accounts Payable"
                    title="Bills Processed"
                    value={summary.billsCount}
                    subValue={formatCurrency(summary.billsTotalAmount)}
                    icon={<Receipt size={18} />}
                    color="rgba(59, 130, 246, 0.15)"
                />
                <StatCard
                    superTitle="Adjustments Issued"
                    title="Debit & Credit Notes"
                    value={summary.debitNotesCount + summary.creditNotesCount}
                    subValue={formatCurrency(summary.debitNotesTotalAmount + summary.creditNotesTotalAmount)}
                    icon={<ArrowLeftRight size={18} />}
                    color="rgba(139, 92, 246, 0.15)"
                />
                <StatCard
                    superTitle="Treasury & Statement"
                    title="Bank Transactions"
                    value={summary.bankTransactionsCount}
                    subValue={formatCurrency(summary.bankTransactionsTotalAmount)}
                    icon={<Activity size={18} />}
                    color="rgba(245, 158, 11, 0.15)"
                />
            </div>

            {/* Daily Work Output & Analytics Section */}
            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Work Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-8">
                                
                                {/* Daily Output Velocity Trend */}
                                <div className="p-8 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] group hover:border-lime/20 transition-all">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-lime rounded-full" />
                                                Daily Work Output Velocity
                                            </h2>
                                            <p className="text-xs text-dim mt-1">Actions completed per day across financial modules</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-[9px] font-black uppercase opacity-60">
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#C8E600]" /> Invoices</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Bills</span>
                                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Bank Tx</span>
                                        </div>
                                    </div>

                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={dailyWorkBreakdown || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="invEmpGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#C8E600" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#C8E600" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} opacity={0.2} />
                                                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={5} />
                                                <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <RechartsTooltip 
                                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '16px' }} 
                                                    itemStyle={{ color: 'var(--text-main)' }} 
                                                />
                                                <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#C8E600" strokeWidth={2} fill="url(#invEmpGrad)" />
                                                <Area type="monotone" dataKey="bills" name="Bills" stroke="#3B82F6" strokeWidth={2} fillOpacity={0} />
                                                <Area type="monotone" dataKey="bankTransactions" name="Bank Tx" stroke="#F59E0B" strokeWidth={2} fillOpacity={0} />
                                                <Area type="monotone" dataKey="total" name="Total Daily Actions" stroke="#8B5CF6" strokeWidth={2} fillOpacity={0} strokeDasharray="3 3" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Granular Chronological Audit Log */}
                                <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                                    <div className="p-6 border-b border-[var(--border-main)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-3">
                                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                                Audit History & Daily Work Log
                                            </h2>
                                            <p className="text-xs text-dim mt-0.5">Chronological record of everything this employee processed</p>
                                        </div>

                                        {/* Filter tabs */}
                                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                            {['ALL', 'INVOICE', 'BILL', 'DEBIT_NOTE', 'CREDIT_NOTE', 'BANK_TRANSACTION', 'UPLOAD'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setAuditCategory(type)}
                                                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                                        auditCategory === type 
                                                            ? 'bg-lime text-black' 
                                                            : 'bg-[var(--bg-input)] text-dim hover:text-white'
                                                    }`}
                                                >
                                                    {type.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[var(--bg-input)] opacity-60">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Action & Identifier</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Module</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Value / Notes</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-main)]">
                                                {filteredAuditHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-12 text-center text-dim font-bold uppercase tracking-widest text-xs italic">
                                                            No activity records found for this category
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    filteredAuditHistory.map((item: any, idx: number) => (
                                                        <tr key={item.id || idx} className="group hover:bg-[var(--bg-input)] transition-all">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                                                        item.action === 'CREATE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                                        item.action === 'UPLOAD' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                                                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                                    }`}>
                                                                        {item.action}
                                                                    </span>
                                                                    <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-lime transition-colors">
                                                                        {item.entityIdentifier || item.fileName || 'Record'}
                                                                    </p>
                                                                </div>
                                                                <p className="text-[10px] text-dim mt-0.5">{item.description}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-[10px] font-black uppercase text-dim tracking-wider">
                                                                    {item.entityType.replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                {item.amount && item.amount > 0 ? (
                                                                    <span className="text-xs font-black text-lime">
                                                                        {formatCurrency(item.amount)}
                                                                    </span>
                                                                ) : item.fileUrl ? (
                                                                    <a 
                                                                        href={item.fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 hover:underline"
                                                                    >
                                                                        <Download size={10} /> {item.fileName || 'Attachment'}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-dim text-[10px]">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-[11px] font-medium opacity-50 whitespace-nowrap">
                                                                {new Date(item.timestamp).toLocaleString(undefined, { 
                                                                    month: 'short', 
                                                                    day: 'numeric', 
                                                                    hour: '2-digit', 
                                                                    minute: '2-digit' 
                                                                })}
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

                    {/* Right Column: Node Details & System Integrity */}
                    <div className="space-y-8">
                        {/* Reporting Hierarchy */}
                        <div className="p-8 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-dim">
                                <Building2 size={16} className="text-lime" />
                                Operational Node
                            </h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-[var(--bg-input)] rounded-xl">
                                    <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Assigned Branch</span>
                                    <p className="text-sm font-black text-[var(--text-main)] mt-0.5">{hierarchy.branch?.name || 'Global HQ'}</p>
                                    <p className="text-[10px] text-dim">{hierarchy.branch?.city || 'HQ'} ({hierarchy.branch?.code || 'GLB'})</p>
                                </div>
                                {hierarchy.manager && (
                                    <div className="p-4 bg-[var(--bg-input)] rounded-xl">
                                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Supervising Controller</span>
                                        <p className="text-sm font-black text-[var(--text-main)] mt-0.5">{hierarchy.manager.fullName}</p>
                                        <p className="text-[10px] text-dim">{hierarchy.manager.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* System Verification Card */}
                        <div className="p-8 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-dim">
                                <ShieldCheck size={16} className="text-lime" />
                                Verification Status
                            </h2>
                            <p className="text-xs text-dim mb-4">
                                Activity tracking and universal upload auditing are active. All financial entries and file attachments are signed with cryptographic timestamps.
                            </p>
                            <div className="p-4 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-lime">Auditing Status</span>
                                <span className="text-[10px] font-black uppercase tracking-wider text-lime">Active & Enforced</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default StaffPerformanceDetails;
