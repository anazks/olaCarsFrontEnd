import { useState, useEffect, useCallback } from 'react';
import { 
    DollarSign, Search, Filter, RefreshCw, Calendar, X,
    ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, MoreHorizontal, Coins
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../../services/api';
import CreatePaymentReceivedModal from './CreatePaymentReceivedModal';
import PaymentReceivedDetail from './PaymentReceivedDetail';
import { getUserRole } from '../../../../utils/auth';

interface InvoiceReference {
    invoiceId: string;
    invoiceNumber: string;
    amountApplied: number;
}

interface DriverReference {
    _id: string;
    driverId?: string;
    personalInfo?: {
        fullName: string;
        email?: string;
        phone?: string;
    };
    name?: string;
    email?: string;
    avatarUrl?: string;
}

interface CustomerReference {
    _id: string;
    customerId?: string;
    name?: string;
}

interface DepositedAccountReference {
    _id: string;
    code: string;
    name: string;
}

interface PaymentReceived {
    _id: string;
    paymentNumber: string;
    customerId?: CustomerReference;
    driverId?: DriverReference;
    amountReceived: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    invoices: InvoiceReference[];
    status: 'COMPLETED' | 'VOID';
    depositedTo?: DepositedAccountReference;
    createdAt: string;
}

const PaymentsReceived = () => {
    const userRole = getUserRole();
    const [payments, setPayments] = useState<PaymentReceived[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [methodFilter, setMethodFilter] = useState<string>('ALL');
    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const getDefaultEndDate = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
    const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

    interface PaymentMetrics {
        totalReceived: number;
        totalSurplus: number;
        mtdTotal: number;
        methodBreakdown: Record<string, number>;
        monthlyTrends: { month: string; year: number; total: number }[];
    }
    const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);

    // Modals
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentReceived | null>(null);

    // Pagination
    const [page, setPage] = useState<number>(1);
    const limit = 25;
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    const getPageNumbers = () => {
        const totalPages = pagination.pages;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, page - 1);
        let end = Math.min(totalPages - 1, page + 1);

        if (page <= 3) {
            end = 4;
        }
        if (page >= totalPages - 2) {
            start = totalPages - 3;
        }

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
        return pages;
    };

    // Sorting
    const [sortBy, setSortBy] = useState('paymentDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, methodFilter, sortBy, sortOrder, startDate, endDate]);

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
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await api.get('/api/payments-received', {
                params,
                headers: { 'X-Skip-Toast': 'true' }
            });
            if (res) {
                const dataArray = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
                setPayments(dataArray);
                if (res.data?.metrics) {
                    setMetrics(res.data.metrics);
                }
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
    }, [page, limit, debouncedSearch, methodFilter, sortBy, sortOrder, startDate, endDate]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);


    if (selectedPayment) {
        return (
            <div className="container-responsive space-y-6 pb-12">
                <Breadcrumbs 
                    items={[
                        { label: 'Sales', path: '#' },
                        { label: 'Payments Received', active: false },
                        { label: `Receipt ${selectedPayment.paymentNumber}`, active: true }
                    ]} 
                />
                <PaymentReceivedDetail 
                    payment={selectedPayment}
                    onBack={() => setSelectedPayment(null)}
                />
            </div>
        );
    }

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
                    {userRole !== 'admin' && (
                        <button
                            onClick={() => setIsRecordModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-lime text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300 cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            <DollarSign size={14} />
                            Record Payment
                        </button>
                    )}
                </div>
            </div>

            {/* Monthly Dashboard Metrics */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Coins size={16} className="text-brand-lime animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-dim">
                                Total Amount Received (Filtered Date)
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: 'var(--text-main)' }}>
                            ${metrics.totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2 text-dim">
                            Total payments received within the selected date range
                        </p>
                    </div>

                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-dim">
                                Monthly Dashboard (MTD)
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2 text-emerald-400">
                            ${metrics.mtdTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2 text-dim">
                            Total payments received during current month
                        </p>
                    </div>

                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={16} className="text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-dim">
                                Surplus / Credit balance
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2 text-amber-400">
                            ${metrics.totalSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2 text-dim">
                            Prepayment credits not allocated to specific invoices
                        </p>
                    </div>
                </div>
            )}

            {/* Monthly Trend & Breakdown Dashboard Segment */}
            {metrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    {/* Method Breakdown */}
                    <div className="border shadow-md rounded-[2rem] p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-main)' }}>
                            Payments by Method
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(metrics.methodBreakdown).length === 0 ? (
                                <p className="text-xs text-dim italic">No method data recorded</p>
                            ) : (
                                Object.entries(metrics.methodBreakdown).map(([method, total]) => {
                                    const percentage = metrics.totalReceived > 0 ? (total / metrics.totalReceived) * 100 : 0;
                                    return (
                                        <div key={method} className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span style={{ color: 'var(--text-main)' }}>{method}</span>
                                                <span className="text-brand-lime font-black">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({percentage.toFixed(1)}%)</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                                <div 
                                                    className="h-full bg-brand-lime" 
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Monthly Trends */}
                    <div className="border shadow-md rounded-[2rem] p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-main)' }}>
                            Monthly Received Trends (Last 6 Months)
                        </h3>
                        <div className="space-y-3">
                            {metrics.monthlyTrends.map(({ month, year, total }) => {
                                const maxVal = Math.max(...metrics.monthlyTrends.map(t => t.total)) || 1;
                                const barWidth = (total / maxVal) * 100;
                                return (
                                    <div key={`${month}-${year}`} className="flex items-center gap-4 text-xs font-semibold">
                                        <span className="w-16 text-dim text-[10px] font-black uppercase">{month}</span>
                                        <div className="flex-1 h-3 rounded bg-white/5 overflow-hidden">
                                            <div 
                                                className="h-full bg-brand-lime opacity-80 rounded" 
                                                style={{ width: `${Math.max(3, barWidth)}%` }}
                                            />
                                        </div>
                                        <span className="w-20 text-right font-black" style={{ color: 'var(--text-main)' }}>
                                            ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Unified Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl border shadow-sm w-fit" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Wrapper */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search PR #, customer or ref..."
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

                {/* Date range filters */}
                <div className="relative flex items-center gap-2 px-3 py-1.5 border rounded-xl" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Calendar size={12} className="text-dim" />
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent outline-none text-xs font-semibold text-white focus:ring-0 cursor-pointer w-28"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
                <div className="text-[10px] font-black uppercase text-dim">to</div>
                <div className="relative flex items-center gap-2 px-3 py-1.5 border rounded-xl" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Calendar size={12} className="text-dim" />
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent outline-none text-xs font-semibold text-white focus:ring-0 cursor-pointer w-28"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                {/* Clear Filter Button */}
                {(searchQuery || methodFilter !== 'ALL' || startDate !== getDefaultStartDate() || endDate !== getDefaultEndDate()) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setMethodFilter('ALL');
                            setStartDate(getDefaultStartDate());
                            setEndDate(getDefaultEndDate());
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
                                <th className="py-4 px-6 text-left w-[25%] group cursor-pointer select-none" onClick={() => handleSort('customerId')}>
                                     <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                         Customer <SortIcon field="customerId" />
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
                                        onClick={() => setSelectedPayment(pmt)}
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td className="p-6 font-black text-sm">{pmt.paymentNumber}</td>
                                        <td className="p-6 font-bold text-xs">
                                            {typeof pmt.customerId === 'object' && pmt.customerId ? (
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white" style={{ color: 'var(--text-main)' }}>
                                                        {pmt.customerId.name || 'N/A'}
                                                    </span>
                                                    {pmt.customerId.customerId && (
                                                        <span className="text-[9px] font-mono text-dim tracking-wider uppercase mt-0.5">
                                                            {pmt.customerId.customerId}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : typeof pmt.driverId === 'object' && pmt.driverId ? (
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white" style={{ color: 'var(--text-main)' }}>
                                                        {pmt.driverId.personalInfo?.fullName || pmt.driverId.name || 'N/A'}
                                                    </span>
                                                    {pmt.driverId.driverId && (
                                                        <span className="text-[9px] font-mono text-dim tracking-wider uppercase mt-0.5">
                                                            {pmt.driverId.driverId}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-dim">N/A</span>
                                            )}
                                        </td>
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
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((p, index) => {
                                    if (p === '...') {
                                        return (
                                            <span key={`ell-${index}`} className="px-2 text-dim text-xs font-black select-none">
                                                ...
                                            </span>
                                        );
                                    }
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(Number(p))}
                                            className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === p ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70'}`}
                                            style={{ 
                                                background: page === p ? 'var(--brand-lime)' : 'transparent',
                                                color: page === p ? '#000' : 'var(--text-main)',
                                                border: page === p ? 'none' : '1px solid var(--border-main)'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === pagination.pages}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {isRecordModalOpen && (
                <CreatePaymentReceivedModal
                    isOpen={isRecordModalOpen}
                    onClose={() => setIsRecordModalOpen(false)}
                    onSuccess={() => fetchPayments()}
                />
            )}

        </div>
    );
};

export default PaymentsReceived;
