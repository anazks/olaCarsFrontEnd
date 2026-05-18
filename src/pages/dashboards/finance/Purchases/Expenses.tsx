import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CreditCard, Plus, Search, Filter, RefreshCw, 
    ArrowUpDown, ArrowUp, ArrowDown, ShoppingBag, User, Tag, Landmark,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import * as expenseService from '../../../../services/expenseService';
import type { Expense } from '../../../../services/expenseService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import CreateExpenseModal from './CreateExpenseModal';

const Expenses = () => {
    const navigate = useNavigate();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [pagination, setPagination] = useState<any>(null);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Sorting
    const [sortBy, setSortBy] = useState<string>('expenseDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = {
                page,
                limit
            };
            if (search.trim()) filters.search = search.trim();
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await expenseService.getAllExpenses(filters);
            setExpenses(res.data || []);
            setPagination(res.pagination || null);
        } catch (err: any) {
            console.error('Error fetching expenses:', err);
            setError(err.message || 'Failed to load expenses list.');
        } finally {
            setLoading(false);
        }
    }, [search, branchFilter, startDate, endDate, page, limit]);

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [search, branchFilter, startDate, endDate]);

    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const res = await getAllBranches({ limit: 100 });
                setBranches(res.data || []);
            } catch (err) {
                console.error('Error fetching branches:', err);
            }
        };
        fetchBranchesData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    // Sorting Logic
    const sortedExpenses = [...expenses].sort((a: any, b: any) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Deep mapping for nested keys
        if (sortBy === 'expenseAccount') {
            valA = a.expenseAccount?.name || '';
            valB = b.expenseAccount?.name || '';
        } else if (sortBy === 'paidThroughAccount') {
            valA = a.paidThroughAccount?.name || '';
            valB = b.paidThroughAccount?.name || '';
        } else if (sortBy === 'supplier') {
            valA = a.supplier?.name || '';
            valB = b.supplier?.name || '';
        } else if (sortBy === 'customer') {
            valA = a.customer?.firstName || a.customer?.name || '';
            valB = b.customer?.firstName || b.customer?.name || '';
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Purchases', path: '#' },
                    { label: 'Expenses', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <CreditCard size={20} className="text-brand-lime" />
                            Operational Expenses
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Record and monitor immediate cash/bank operational expenses</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={fetchData} 
                            className="p-2.5 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95 cursor-pointer"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            title="Refresh registry"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 cursor-pointer"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} /> Record Expense
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={15} />
                            <input
                                type="text"
                                placeholder="Search by expense number, notes..."
                                className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative flex-shrink-0">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={13} />
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="pl-10 pr-8 py-2.5 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">ALL BRANCHES</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date filtration and Default helper info */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3.5 py-1.5 border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">From Date</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3.5 py-1.5 border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">To Date</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-[9px] font-black uppercase tracking-widest text-brand-lime hover:underline cursor-pointer"
                            >
                                Clear Custom Dates
                            </button>
                        )}
                        {!search && branchFilter === 'ALL' && !startDate && !endDate && (
                            <span className="text-[9px] font-bold text-dim italic ml-2 opacity-50">
                                * Defaulting to last 1 month of expenses for performance. Adjust dates or search to fetch full history.
                            </span>
                        )}
                    </div>
                </div>

                {/* Table Registry */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('expenseNumber')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Expense # <SortIcon field="expenseNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('expenseDate')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Date <SortIcon field="expenseDate" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('expenseAccount')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Debit Account <SortIcon field="expenseAccount" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('paidThroughAccount')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Paid Through <SortIcon field="paidThroughAccount" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('supplier')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Vendor <SortIcon field="supplier" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('customer')}>
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer <SortIcon field="customer" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Notes / Memo</div>
                                    </th>
                                    <th className="py-4 px-6 text-right group cursor-pointer select-none" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Amount <SortIcon field="amount" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-semibold text-xs" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={24} />
                                                <span className="text-[10px] font-black tracking-widest text-dim uppercase">Fetching Expenses...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <p className="text-xs font-black uppercase text-rose-500">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : sortedExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center text-dim uppercase">
                                            <p className="text-[10px] font-black tracking-widest opacity-60">No Expenses Recorded</p>
                                            <p className="text-[9px] lowercase opacity-40 mt-1">Click Record Expense to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedExpenses.map((exp) => (
                                        <tr 
                                            key={exp._id} 
                                            onClick={() => navigate(exp._id)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer" 
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                        >
                                            {/* Expense # */}
                                            <td className="py-4.5 px-6 font-black text-brand-lime select-all" style={{ color: 'var(--brand-lime)' }}>
                                                {exp.expenseNumber}
                                            </td>

                                            {/* Date */}
                                            <td className="py-4.5 px-6" style={{ color: 'var(--text-main)' }}>
                                                {new Date(exp.expenseDate).toLocaleDateString()}
                                            </td>

                                            {/* Debit Account */}
                                            <td className="py-4.5 px-6" style={{ color: 'var(--text-main)' }}>
                                                <div className="flex items-center gap-1.5">
                                                    <Tag size={12} className="text-brand-lime/75" />
                                                    <span>{exp.expenseAccount?.code} - {exp.expenseAccount?.name}</span>
                                                </div>
                                            </td>

                                            {/* Paid Through (Credit) */}
                                            <td className="py-4.5 px-6" style={{ color: 'var(--text-main)' }}>
                                                <div className="flex items-center gap-1.5">
                                                    <Landmark size={12} className="text-[#C8E600]/75" />
                                                    <span>{exp.paidThroughAccount?.code} - {exp.paidThroughAccount?.name}</span>
                                                </div>
                                            </td>

                                            {/* Vendor */}
                                            <td className="py-4.5 px-6" style={{ color: 'var(--text-main)' }}>
                                                {exp.supplier ? (
                                                    <span className="flex items-center gap-1.5 opacity-80"><ShoppingBag size={12} /> {exp.supplier.name}</span>
                                                ) : <span className="opacity-30">—</span>}
                                            </td>

                                            {/* Customer */}
                                            <td className="py-4.5 px-6" style={{ color: 'var(--text-main)' }}>
                                                {exp.customer ? (
                                                    <span className="flex items-center gap-1.5 opacity-80"><User size={12} /> {exp.customer.name || exp.customer.firstName}</span>
                                                ) : <span className="opacity-30">—</span>}
                                            </td>

                                            {/* Notes */}
                                            <td className="py-4.5 px-6 text-dim italic truncate max-w-xs font-normal" title={exp.notes}>
                                                {exp.notes || '—'}
                                            </td>

                                            {/* Amount */}
                                            <td className="py-4.5 px-6 text-right font-black font-mono text-sm" style={{ color: 'var(--text-main)' }}>
                                                ${fmt(exp.amount)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination controls */}
                    {!loading && expenses.length > 0 && pagination && pagination.totalPages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {expenses.length} of {pagination.total} expenses
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum: number;
                                        if (pagination.totalPages <= 5) pageNum = i + 1;
                                        else if (page <= 3) pageNum = i + 1;
                                        else if (page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                        else pageNum = page - 2 + i;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === pageNum ? 'bg-brand-lime text-black shadow-lg scale-110' : 'text-dim hover:bg-white/5 border border-white/5'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <CreateExpenseModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
            />

        </div>
    );
};

export default Expenses;
