import { useState, useEffect, useCallback } from 'react';
import { 
    DollarSign, Search, Filter, RefreshCw, User, Calendar, CreditCard, FileCheck, X, Receipt,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, MoreHorizontal
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../../services/api';

interface InvoiceReference {
    invoiceId: string;
    invoiceNumber: string;
    amountApplied: number;
}

interface DriverReference {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

interface PaymentReceived {
    _id: string;
    paymentNumber: string;
    driverId: DriverReference;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    invoices: InvoiceReference[];
    status: 'COMPLETED' | 'VOID';
    createdAt: string;
}

const PaymentsReceived = () => {
    const [payments, setPayments] = useState<PaymentReceived[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [methodFilter, setMethodFilter] = useState<string>('ALL');

    // Pagination
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, methodFilter, sortBy, sortOrder]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit, sortBy, sortOrder };
            if (methodFilter !== 'ALL') params.paymentMethod = methodFilter;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

            const res = await api.get('/api/payments-received', {
                params,
                headers: { 'X-Skip-Toast': 'true' }
            });
            if (res) {
                const dataArray = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
                setPayments(dataArray);
                if (res.data?.pagination) {
                    setPagination({
                        total: res.data.pagination.total || 0,
                        pages: res.data.pagination.pages || 1
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch payments received:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, methodFilter, sortBy, sortOrder]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
    };

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Payments Received', active: true }
                ]} 
            />

            {/* Compact Standardized Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <DollarSign size={20} className="text-brand-lime" />
                        Payments Received
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Live accounting tracker for recorded customer payments</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => fetchPayments()} 
                        className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Dynamic Unified Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl border shadow-sm w-fit" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Wrapper */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search PR #, driver or ref..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 border rounded-xl outline-none text-xs font-medium focus:border-brand-lime/30 transition-all duration-200"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }}></div>

                {/* Method Selector */}
                <div className="relative flex items-center gap-2 px-3 py-1.5 border rounded-xl transition-all hover:border-white/10 focus-within:border-brand-lime/30" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Filter size={12} className="text-dim" />
                    <select 
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="bg-transparent outline-none text-xs font-semibold pr-6 cursor-pointer appearance-none relative z-10"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="ALL" style={{ background: 'var(--bg-card)' }}>All Methods</option>
                        <option value="Cash" style={{ background: 'var(--bg-card)' }}>Cash</option>
                        <option value="Bank Transfer" style={{ background: 'var(--bg-card)' }}>Bank Transfer</option>
                        <option value="Card" style={{ background: 'var(--bg-card)' }}>Card</option>
                        <option value="Mobile Money" style={{ background: 'var(--bg-card)' }}>Mobile Money</option>
                        <option value="Other" style={{ background: 'var(--bg-card)' }}>Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim text-[8px]">▼</div>
                </div>

                {/* Clear Filter Button */}
                {(searchQuery || methodFilter !== 'ALL') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setMethodFilter('ALL');
                        }}
                        className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
                        title="Reset Constraints"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Standardized Table Container */}
            <div className="rounded-[2.5rem] border shadow-2xl overflow-hidden relative" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="overflow-x-auto relative z-10 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('paymentNumber')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Receipt # <SortIcon field="paymentNumber" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-left w-[25%] group cursor-pointer select-none" onClick={() => handleSort('driverId')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Operator <SortIcon field="driverId" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('paymentDate')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         <Calendar size={12}/> Received <SortIcon field="paymentDate" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-right w-[15%] group cursor-pointer select-none" onClick={() => handleSort('amountReceived')}>
                                     <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         <DollarSign size={12}/> Amount <SortIcon field="amountReceived" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('paymentMethod')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Method <SortIcon field="paymentMethod" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-center w-[10%] group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        Status <SortIcon field="status" />
                                    </div>
                                </th>
                                <th className="py-4 px-6 text-center w-[5%] text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
                                            <div className="w-12 h-12 rounded-full border-t-2 border-brand-lime animate-spin"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-24 text-center text-sm font-medium text-dim">No records found.</td>
                                </tr>
                            ) : (
                                payments.map((pmt) => (
                                    <tr 
                                        key={pmt._id} 
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td className="p-6 font-black text-sm">{pmt.paymentNumber}</td>
                                        <td className="p-6 font-bold text-xs">{pmt.driverId?.name || 'N/A'}</td>
                                        <td className="p-6 text-xs text-dim">{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right font-black text-brand-lime">${pmt.amountReceived.toLocaleString()}</td>
                                        <td className="p-6 text-xs font-medium">{pmt.paymentMethod}</td>
                                        <td className="p-6 text-center">
                                            <span className="text-[9px] font-black px-2 py-1 rounded-md border" style={{ color: pmt.status === 'COMPLETED' ? 'var(--brand-lime)' : 'red' }}>{pmt.status}</span>
                                        </td>
                                        <td className="p-6 text-center"><MoreHorizontal size={16} className="text-dim" /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && payments.length > 0 && pagination && pagination.pages >= 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                            Showing {payments.length} of {pagination.total} payments
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: pagination.pages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPage(i + 1)}
                                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${page === i + 1 ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70'}`}
                                        style={{ 
                                            background: page === i + 1 ? 'var(--brand-lime)' : 'transparent',
                                            color: page === i + 1 ? '#000' : 'var(--text-main)',
                                            border: page === i + 1 ? 'none' : '1px solid var(--border-main)'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === pagination.pages}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentsReceived;
