import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Search, Download, DollarSign, User, Calendar, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { getInvoices, payInvoice } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { useTheme } from '../../../context/ThemeContext';
import { format } from 'date-fns';

const InvoiceList = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('ALL');
    const getOneMonthAgo = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return format(d, 'yyyy-MM-dd');
    };

    const getToday = () => {
        return format(new Date(), 'yyyy-MM-dd');
    };

    const [startDate, setStartDate] = useState(getOneMonthAgo());
    const [endDate, setEndDate] = useState(getToday());

    // Keep end date valid relative to start date
    useEffect(() => {
        if (startDate && endDate && endDate < startDate) {
            setEndDate(startDate);
        }
    }, [startDate, endDate]);

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
    };

    const handleEndDateChange = (val: string) => {
        if (startDate && val && val < startDate) {
            setEndDate(startDate);
            return;
        }
        setEndDate(val);
    };
    
    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
    
    // Payment Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentNote, setPaymentNote] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset to page 1 on filter changes
    useEffect(() => {
        setPage(1);
    }, [statusFilter, invoiceTypeFilter, debouncedSearch, startDate, endDate]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {
                page,
                limit
            };
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (invoiceTypeFilter !== 'ALL') filters.invoiceType = invoiceTypeFilter;
            if (debouncedSearch) filters.search = debouncedSearch;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const response = await getInvoices(filters);
            setInvoices(response.data || []);
            if (response.pagination) {
                setPagination(response.pagination);
            }
        } catch (err: any) {
            toast.error('Error loading invoices');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, invoiceTypeFilter, debouncedSearch, page, limit, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        if (paymentAmount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        setProcessingPayment(true);
        try {
            await payInvoice(selectedInvoice._id, {
                amount: paymentAmount,
                paymentMethod,
                note: paymentNote
            });
            toast.success('Payment recorded successfully');
            setSelectedInvoice(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setProcessingPayment(false);
        }
    };

    // Filtering is now handled on the server

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Rent Invoices', active: true }
                ]} 
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <FileText size={28} className="text-brand-lime" />
                        Invoices Management
                    </h1>
                    <p className="text-sm font-medium opacity-60" style={{ color: 'var(--text-dim)' }}>Monitor rent invoices and record manual payments</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-dim hover:text-white transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-3xl border bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                {/* Search */}
                <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search Invoice # or Driver..."
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
                        <option value="PARTIAL">Partial</option>
                        <option value="PAID">Paid</option>
                        <option value="OVERDUE">Overdue</option>
                    </select>
                </div>

                {/* Invoice Type */}
                <div className="w-full sm:w-auto min-w-[140px]">
                    <select 
                        value={invoiceTypeFilter}
                        onChange={(e) => setInvoiceTypeFilter(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border outline-none text-xs cursor-pointer focus:border-brand-lime/30"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="ALL">All Types</option>
                        <option value="RENTAL">Rental Only</option>
                        <option value="WORKSHOP">Workshop Only</option>
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-main)]">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                    <div className="w-px h-4 bg-white/10"></div>
                    <input 
                        type="date" 
                        value={endDate}
                        min={startDate}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                </div>

                {/* Clear Button (Icon only) */}
                {(searchQuery || statusFilter !== 'ALL' || startDate || endDate) && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setInvoiceTypeFilter('ALL');
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

            {/* Table */}
            <div className="rounded-[2rem] border overflow-hidden bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5">
                                <th className="p-6">Invoice Details</th>
                                <th className="p-6">Type</th>
                                <th className="p-6">Driver</th>
                                <th className="p-6">Due Date</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Balance</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && invoices.length === 0 ? (
                                <tr><td colSpan={7} className="p-20 text-center animate-pulse text-xs font-black uppercase tracking-widest opacity-40">Loading Invoices...</td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={7} className="p-20 text-center text-dim text-sm font-medium">No invoices found matching your criteria.</td></tr>
                            ) : invoices.map((inv) => (
                                <tr key={inv._id} className="group hover:bg-white/[0.02] transition-all">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{inv.invoiceNumber}</span>
                                            <span className="text-[10px] font-bold text-dim uppercase tracking-wider">{inv.invoiceType === 'WORKSHOP' ? 'Workshop Bill' : inv.weekLabel}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                            inv.invoiceType === 'WORKSHOP' 
                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                                                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                            {inv.invoiceType}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-brand-lime/10 flex items-center justify-center text-brand-lime">
                                                <User size={14} />
                                            </div>
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                {(inv.driver as any)?.personalInfo?.fullName || 'Unknown Driver'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-2 text-xs font-medium text-dim">
                                            <Calendar size={14} />
                                            {new Date(inv.dueDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>${inv.totalAmountDue.toLocaleString()}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className={`text-sm font-black ${inv.balance > 0 ? 'text-orange-400' : 'text-brand-lime'}`}>
                                            ${inv.balance.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <StatusBadge status={inv.status} />
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setPaymentAmount(inv.balance);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-lime text-black text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-brand-lime/20 transition-all"
                                                >
                                                    <DollarSign size={14} />
                                                    Pay
                                                </button>
                                            )}
                                            <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-dim hover:text-white transition-all">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && invoices.length > 0 && pagination && (
                    <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
                        <p className="text-[10px] font-black text-dim uppercase tracking-widest">
                            Showing <span className="text-[var(--text-main)]">{((page - 1) * limit) + 1}</span> - <span className="text-[var(--text-main)]">{Math.min(page * limit, pagination.totalItems)}</span> of <span className="text-[var(--text-main)]">{pagination.totalItems}</span> Invoices
                        </p>
                        
                        <div className="flex items-center gap-3">
                            <select 
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-3 py-1.5 text-[10px] font-bold text-[var(--text-main)] outline-none cursor-pointer"
                            >
                                <option value="10">10 / PAGE</option>
                                <option value="25">25 / PAGE</option>
                                <option value="50">50 / PAGE</option>
                                <option value="100">100 / PAGE</option>
                            </select>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 hover:bg-white/5"
                                    style={{ color: page === 1 ? 'var(--text-dim)' : '#C8E600' }}
                                >
                                    Prev
                                </button>
                                
                                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                                    <span className="text-[10px] font-black text-[var(--text-main)] italic">
                                        {page} <span className="text-dim opacity-30 mx-1">/</span> {pagination.totalPages}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages}
                                    className="px-4 py-2 rounded-xl border border-[var(--border-main)] text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 hover:bg-white/5"
                                    style={{ color: page === pagination.totalPages ? 'var(--text-dim)' : '#C8E600' }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md border rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Record Payment</h2>
                            <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--text-dim)' }}>Invoice: {selectedInvoice.invoiceNumber}</p>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Amount (USD)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-lime" size={18} />
                                    <input 
                                        type="number"
                                        required
                                        max={selectedInvoice.balance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-3 border rounded-2xl font-bold outline-none focus:border-brand-lime transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--text-dim)' }}>Remaining Balance: ${selectedInvoice.balance}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Method</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-brand-lime appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="Cash" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Cash</option>
                                    <option value="Bank Transfer" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Bank Transfer</option>
                                    <option value="Card" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Credit/Debit Card</option>
                                    <option value="Mobile Money" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Mobile Money</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Notes / Reference</label>
                                <textarea 
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="Any additional details..."
                                    className="w-full px-4 py-3 border rounded-2xl text-sm outline-none focus:border-brand-lime h-24 resize-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="flex-1 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={processingPayment}
                                    className="flex-1 py-3 rounded-2xl bg-brand-lime text-black font-black text-[10px] uppercase tracking-widest hover:shadow-lg hover:shadow-brand-lime/20 transition-all disabled:opacity-50"
                                >
                                    {processingPayment ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                        
                        {/* Payment History */}
                        {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                            <div className="px-8 pb-8 space-y-4">
                                <div className="pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-dim)' }}>Payment History</h3>
                                    <div className="space-y-2">
                                        {selectedInvoice.payments.map((p: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl border"
                                                 style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                                        <DollarSign size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>${p.amount.toLocaleString()}</p>
                                                        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{p.paymentMethod} • {new Date(p.paidAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                {p.transactionId && (
                                                    <span className="text-[8px] font-mono opacity-40" style={{ color: 'var(--text-dim)' }}>Ref: {p.transactionId.slice(-8)}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PAID':
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[9px] font-black uppercase border border-green-500/20"><CheckCircle2 size={10} /> Paid</span>;
        case 'PARTIAL':
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase border border-yellow-500/20"><Clock size={10} /> Partial</span>;
        case 'OVERDUE':
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black uppercase border border-red-500/20"><AlertCircle size={10} /> Overdue</span>;
        default:
            return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-dim text-[9px] font-black uppercase border border-white/10">Pending</span>;
    }
};

export default InvoiceList;
