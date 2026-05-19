import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getAllPayments,
    type PaymentTransaction
} from '../../../services/paymentService';
import {
    Receipt,
    Search,
    RefreshCw,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { useTheme } from '../../../context/ThemeContext';

const getOneMonthAgo = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
};

const getToday = () => {
    return new Date().toISOString().split('T')[0];
};

const PurchaseBillList = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useTranslation();
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState(getOneMonthAgo());
    const [endDate, setEndDate] = useState(getToday());

    // Keep end date valid relative to start date
    useEffect(() => {
        if (startDate && endDate && endDate < startDate) {
            setEndDate('');
        }
    }, [startDate, endDate]);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset to page 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch, startDate, endDate]);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = {
                transactionCategory: 'EXPENSE',
                page,
                limit,
                search: debouncedSearch,
                status: statusFilter !== 'ALL' ? statusFilter : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            const response = await getAllPayments(filters);
            setPayments(response?.data || []);
            setTotal(response?.pagination?.total || 0);
            setTotalPages(response?.pagination?.totalPages || 0);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.purchaseBills.fetchFailed', { defaultValue: 'Failed to fetch payments' }));
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, startDate, endDate, t]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const statusConfig: any = {
        PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} /> },
        COMPLETED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: <CheckCircle2 size={14} /> },
        FAILED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> },
        CANCELLED: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <XCircle size={14} /> }
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Purchase Bills', active: true }
                ]} 
            />
            
            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Receipt size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.purchaseBills.title')}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">{t('management.purchaseBills.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchPayments}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-3xl border bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                {/* Search */}
                <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search PO #, Supplier, or Notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:border-brand-lime/30"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Status */}
                <div className="w-full sm:w-auto min-w-[140px]">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border outline-none text-xs cursor-pointer focus:border-brand-lime/30"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-main)]">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                    <div className="w-px h-4 bg-white/10"></div>
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
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                </div>

                {/* Clear Button */}
                {(searchQuery || statusFilter !== 'ALL' || startDate !== getOneMonthAgo() || endDate !== getToday()) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setStartDate(getOneMonthAgo());
                            setEndDate(getToday());
                        }}
                        title="Clear Filters"
                        className="p-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Content Container */}
            <div className="rounded-[32px] border bg-white/[0.02] overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-bold opacity-40 uppercase tracking-widest">{t('management.purchaseBills.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="py-24 text-center space-y-4">
                        <AlertCircle size={48} className="mx-auto text-red-500 opacity-20" />
                        <p className="text-red-500 font-bold">{error}</p>
                        <button onClick={fetchPayments} className="px-6 py-3 bg-[#C8E600] text-black rounded-2xl font-black text-xs uppercase tracking-widest">{t('management.common.tryAgain')}</button>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="py-24 text-center space-y-4">
                        <Receipt size={64} className="mx-auto opacity-10" style={{ color: 'var(--text-main)' }} />
                        <p className="text-xl font-black opacity-30 uppercase tracking-tighter">{t('management.purchaseBills.empty.noBills')}</p>
                        <p className="text-sm opacity-20 font-medium">{t('management.purchaseBills.empty.refine')}</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">{t('management.purchaseBills.table.dateMethod')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Supplier / PO</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">{t('management.purchaseBills.table.description')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">{t('management.purchaseBills.table.amount')}</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-center">{t('management.common.table.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {payments.map(p => {
                                        const sc = statusConfig[p.status] || statusConfig.PENDING;
                                        return (
                                            <tr key={p._id} className="hover:bg-white/[0.03] transition-all group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-[#C8E600]/20 transition-all">
                                                            <Calendar size={18} className="opacity-40" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                                                                {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                                                            </p>
                                                            <p className="text-[10px] uppercase font-black opacity-30 tracking-widest mt-0.5">{p.paymentMethod.replace('_', ' ')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-brand-lime truncate max-w-[150px]">
                                                            {(p as any).supplier?.name || 'Unknown Supplier'}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 opacity-40">
                                                            <ArrowUpRight size={12} />
                                                            <span className="text-[10px] font-bold">#{(p as any).po?.purchaseOrderNumber || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 max-w-xs">
                                                    <p className="text-xs font-bold leading-relaxed line-clamp-1" style={{ color: 'var(--text-main)' }}>
                                                        {p.notes || t('management.common.noDescription')}
                                                    </p>
                                                    <p className="text-[10px] font-bold opacity-30 mt-1 uppercase tracking-tighter">{(p as any).accountingCode?.name || 'Expense'}</p>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="text-lg font-black text-[#C8E600] tracking-tighter">
                                                        ${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-1 opacity-30 mt-0.5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Tax:</span>
                                                        <span className="text-[10px] font-bold">${p.taxAmount.toFixed(2)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border transition-all group-hover:scale-105"
                                                            style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}33` }}>
                                                            {sc.icon} {t(`management.purchaseBills.statusLabels.${p.status}`)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Professional Pagination Footer */}
                        <div className="p-6 border-t bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Rows per page</p>
                                    <select 
                                        value={limit}
                                        onChange={(e) => setLimit(Number(e.target.value))}
                                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer hover:border-brand-lime/30 transition-all"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} bills</option>)}
                                    </select>
                                </div>
                                <div className="w-px h-8 bg-white/10 hidden md:block"></div>
                                <p className="text-xs font-bold opacity-40">
                                    Showing <span className="text-brand-lime font-black">{((page-1)*limit)+1}</span> to <span className="text-brand-lime font-black">{Math.min(page*limit, total)}</span> of <span className="text-[var(--text-main)] font-black">{total}</span> records
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all active:scale-90"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pNum = i + 1;
                                        // Show 5 pages max around current
                                        if (totalPages > 5 && (pNum < page - 2 || pNum > page + 2)) return null;
                                        return (
                                            <button
                                                key={pNum}
                                                onClick={() => setPage(pNum)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-90 ${page === pNum ? 'bg-brand-lime text-black shadow-[0_0_15px_rgba(200,230,0,0.3)]' : 'hover:bg-white/5 border border-white/5 opacity-40'}`}
                                                style={{ color: page === pNum ? '#000' : 'var(--text-main)' }}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all active:scale-90"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PurchaseBillList;
