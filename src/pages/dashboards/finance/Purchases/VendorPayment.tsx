import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Coins, Search, Filter, RefreshCw, Calendar, CreditCard, X, FileText,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, MoreHorizontal, Plus
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../../services/api';
import CreatePaymentMadeModal from './CreatePaymentMadeModal';

interface BillReference {
    billId: string;
    billNumber: string;
    amountApplied: number;
}

interface SupplierReference {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
}

interface PaymentMade {
    _id: string;
    paymentNumber: string;
    supplier: SupplierReference;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    bills: BillReference[];
    status: 'COMPLETED' | 'VOID';
    createdAt: string;
}

const VendorPayment = () => {
    const navigate = useNavigate();
    const isFinancialAdmin = window.location.pathname.includes('/financial-admin');
    const baseDashboardPath = isFinancialAdmin ? '/admin/financial-admin' : '/admin/admin';

    const [payments, setPayments] = useState<PaymentMade[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [methodFilter, setMethodFilter] = useState<string>('ALL');

    // Pagination
    const [page, setPage] = useState<number>(1);
    const [limit] = useState<number>(10);
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

    const getPageNumbers = () => {
        const pagesToShow = 5;
        let startPage = Math.max(1, page - Math.floor(pagesToShow / 2));
        let endPage = startPage + pagesToShow - 1;

        if (endPage > pagination.pages) {
            endPage = pagination.pages;
            startPage = Math.max(1, endPage - pagesToShow + 1);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit, sortBy, sortOrder };
            if (methodFilter !== 'ALL') params.paymentMethod = methodFilter;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

            const res = await api.get('/api/payments-made', {
                params,
                headers: { 'X-Skip-Toast': 'true' }
            });
            if (res && res.data) {
                const dataArray = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
                setPayments(dataArray);
                
                const paginationData = res.data.pagination || {
                    total: dataArray.length,
                    pages: 1
                };
                setPagination({
                    total: paginationData.total || 0,
                    pages: paginationData.pages || 1
                });
            }
        } catch (error) {
            console.error('Failed to fetch payments made:', error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, methodFilter, sortBy, sortOrder]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Purchases', path: '#' },
                    { label: 'Vendor Payment', active: true }
                ]} 
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Coins size={20} className="text-brand-lime" />
                        Vendor Payment
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Live disbursements tracker for suppliers and vendor bills</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => fetchPayments()} 
                        className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button 
                            onClick={() => setIsCreateModalOpen(true)} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-brand-lime text-black text-xs font-black uppercase tracking-wider rounded-xl hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            Record Payment Made
                        </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl border shadow-sm w-fit" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search PMT #, supplier or ref..."
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
                        <option value="Cheque" style={{ background: 'var(--bg-card)' }}>Cheque</option>
                        <option value="Other" style={{ background: 'var(--bg-card)' }}>Other</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim text-[8px]">▼</div>
                </div>

                {/* Clear Filter */}
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

            {/* Table */}
            <div className="rounded-[2.5rem] border shadow-2xl overflow-hidden relative" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="overflow-x-auto relative z-10 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('paymentNumber')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Payment # <SortIcon field="paymentNumber" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-left w-[25%] group cursor-pointer select-none" onClick={() => handleSort('supplier')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Supplier <SortIcon field="supplier" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('paymentDate')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         <Calendar size={12}/> Paid Date <SortIcon field="paymentDate" />
                                     </div>
                                 </th>
                                <th className="py-4 px-6 text-right w-[15%] group cursor-pointer select-none" onClick={() => handleSort('amount')}>
                                     <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Amount Paid <SortIcon field="amount" />
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
                                        <div className="flex flex-col items-center justify-center gap-4">
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
                                        className="transition-colors cursor-pointer group hover:bg-white/[0.02]"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onClick={() => navigate(`${baseDashboardPath}/vendor-payment/${pmt._id}`)}
                                    >
                                        <td className="p-6">
                                            <span className="font-black text-sm block" style={{ color: 'var(--text-main)' }}>{pmt.paymentNumber}</span>
                                            {pmt.bills && pmt.bills.length > 0 && (
                                                <span className="text-[10px] text-dim flex items-center gap-1 mt-0.5">
                                                    <FileText size={10} /> {pmt.bills[0].billNumber}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>{pmt.supplier?.name || 'N/A'}</div>
                                            {pmt.referenceNumber && (
                                                <div className="text-[9px] text-dim font-medium mt-0.5">Ref: {pmt.referenceNumber}</div>
                                            )}
                                        </td>
                                        <td className="p-6 text-xs text-dim">{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                                        <td className="p-6 text-right font-black text-brand-lime">${pmt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="p-6 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                             <div className="flex items-center gap-1.5">
                                                 <CreditCard size={12} className="opacity-40" />
                                                 {pmt.paymentMethod}
                                             </div>
                                         </td>
                                        <td className="p-6 text-center">
                                            <span 
                                                className="text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider" 
                                                style={{ 
                                                    background: pmt.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                                    borderColor: pmt.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: pmt.status === 'COMPLETED' ? 'var(--brand-lime)' : '#ef4444' 
                                                }}
                                            >
                                                {pmt.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center"><MoreHorizontal size={16} className="text-dim hover:text-white transition-colors" /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && payments.length > 0 && pagination && pagination.pages > 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" 
                         style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold text-dim">
                            Showing {payments.length} of {pagination.total} payments
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === pageNum ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                        style={{ 
                                            background: page === pageNum ? 'var(--brand-lime)' : 'transparent',
                                            color: page === pageNum ? '#000' : 'var(--text-main)',
                                            border: page === pageNum ? 'none' : '1px solid var(--border-main)'
                                        }}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>
                            
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === pagination.pages || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreatePaymentMadeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchPayments}
            />
        </div>
    );
};

export default VendorPayment;
