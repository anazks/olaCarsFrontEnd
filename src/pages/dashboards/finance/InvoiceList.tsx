import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Filter, Search, Download, DollarSign, User, Calendar, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';
import { getInvoices, payInvoice } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const InvoiceList = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
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
    }, [statusFilter, debouncedSearch, startDate, endDate]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = {
                page,
                limit
            };
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (debouncedSearch) filters.search = debouncedSearch;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const response = await getInvoices(filters);
            setInvoices(response.data || []);
            if (response.pagination) {
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch invoices');
            toast.error('Error loading invoices');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, debouncedSearch, page, limit, startDate, endDate]);

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
                    { label: 'Sales', path: '#' },
                    { label: 'Invoices', active: true }
                ]} 
            />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <FileText size={20} className="text-brand-lime" />
                        Invoices Management
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Monitor rent invoices and record manual payments</p>
                </div>
                <button
                    onClick={fetchData}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-wider text-dim hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                >
                    <RefreshCw size={13} className={`transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} /> 
                    Refresh
                </button>
            </div>

            {/* Premium Compact Filters Bar */}
            <div className="shadow-sm border p-2.5 rounded-2xl flex flex-wrap items-center gap-3 transition-colors w-fit max-w-full"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Search Inline Input */}
                <div className="relative min-w-[240px]">
                    <input 
                        type="text" 
                        placeholder="Search Invoice # or Driver..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border rounded-xl font-medium text-[11px] outline-none transition-all focus:border-brand-lime/40"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim opacity-50" size={14} />
                </div>

                <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                {/* Status Select */}
                <div className="relative">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-8 pr-6 py-2 border-none outline-none text-[11px] font-black uppercase tracking-wider bg-transparent appearance-none cursor-pointer transition-colors"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="ALL" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                        <option value="PENDING" style={{ background: 'var(--bg-card)' }}>• Pending</option>
                        <option value="PARTIAL" style={{ background: 'var(--bg-card)' }}>• Partial</option>
                        <option value="PAID" style={{ background: 'var(--bg-card)' }}>• Settled</option>
                        <option value="OVERDUE" style={{ background: 'var(--bg-card)' }}>• Overdue</option>
                    </select>
                    <Filter className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" size={13} style={{ color: 'var(--text-dim)' }} />
                </div>

                <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                {/* Date Span Constraints */}
                <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-colors" 
                     style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Calendar size={13} className="opacity-50" style={{ color: 'var(--text-dim)' }} />
                    <input type="date" value={startDate} 
                           onChange={(e) => setStartDate(e.target.value)}
                           className="bg-transparent text-[10px] font-bold border-none outline-none cursor-pointer"
                           style={{ colorScheme: 'dark', color: 'var(--text-main)' }} />
                    <span className="text-[10px] opacity-30">-</span>
                    <input type="date" value={endDate} 
                           onChange={(e) => setEndDate(e.target.value)}
                           className="bg-transparent text-[10px] font-bold border-none outline-none cursor-pointer"
                           style={{ colorScheme: 'dark', color: 'var(--text-main)' }} />
                    {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-rose-500 hover:text-rose-400 active:scale-95 ml-1 transition-all" title="Clear dates">
                            <X size={12}/>
                        </button>
                    )}
                </div>

                {/* Reset Constraints Button */}
                {(searchQuery || statusFilter !== 'ALL') && (
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                        }}
                        className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
                        title="Clear Constraints"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Premium Table Container */}
            <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5">
                                <th className="p-6">Invoice Details</th>
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
                                <tr><td colSpan={7} className="p-24 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
                                        <div className="w-12 h-12 rounded-full border-t-2 border-brand-lime animate-spin"></div>
                                        <span className="text-xs font-black uppercase tracking-widest text-brand-lime/50">Loading Invoices...</span>
                                    </div>
                                </td></tr>
                            ) : invoices.length === 0 ? (
                                <tr><td colSpan={7} className="p-24 text-center">
                                    <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                        <FileText size={48} className="text-dim" />
                                        <span className="text-sm font-medium text-dim">No invoices found matching your criteria.</span>
                                    </div>
                                </td></tr>
                            ) : invoices.map((inv) => (
                                <tr key={inv._id} className="group hover:bg-white/[0.04] transition-all duration-300 cursor-pointer">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{inv.invoiceNumber}</span>
                                            <span className="text-[10px] font-bold text-dim uppercase tracking-wider">{inv.weekLabel}</span>
                                        </div>
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
                                        <span className="text-sm font-black transition-colors" style={{ color: 'var(--text-main)' }}>${inv.totalAmountDue.toLocaleString()}</span>
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
                                        <div className="flex items-center justify-end gap-2.5">
                                            {inv.status !== 'PAID' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInvoice(inv);
                                                        setPaymentAmount(inv.balance);
                                                    }}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-lime text-[#0A0A0A] text-[10px] font-black uppercase tracking-wider shadow-md shadow-brand-lime/10 hover:scale-105 hover:shadow-brand-lime/20 active:scale-95 transition-all cursor-pointer"
                                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                                >
                                                    <DollarSign size={12} strokeWidth={3} />
                                                    Pay Now
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-dim hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                                                style={{ borderColor: 'var(--border-main)' }}
                                                title="Download Invoice"
                                            >
                                                <Download size={14} />
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
                    <div className="w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <h2 className="text-md font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                <DollarSign size={18} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                Record Payment
                            </h2>
                            <p className="text-xs font-medium text-dim mt-0.5">Invoice: {selectedInvoice.invoiceNumber}</p>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Payment Amount (USD)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-lime" style={{ color: 'var(--brand-lime)' }} size={16} />
                                    <input 
                                        type="number"
                                        required
                                        max={selectedInvoice.balance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-11 pr-4 py-2.5 border rounded-xl font-bold outline-none focus:border-brand-lime transition-all text-sm shadow-inner"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <p className="text-[10px] font-medium text-dim mt-1 flex justify-between">
                                    <span>Remaining Balance:</span>
                                    <span className="font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>${selectedInvoice.balance.toLocaleString()}</span>
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Payment Method</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none focus:border-brand-lime cursor-pointer text-sm"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="Cash" style={{ background: 'var(--bg-card)' }}>Cash</option>
                                    <option value="Bank Transfer" style={{ background: 'var(--bg-card)' }}>Bank Transfer</option>
                                    <option value="Card" style={{ background: 'var(--bg-card)' }}>Credit/Debit Card</option>
                                    <option value="Mobile Money" style={{ background: 'var(--bg-card)' }}>Mobile Money</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Notes / Reference</label>
                                <textarea 
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="Any additional details..."
                                    className="w-full px-4 py-2.5 border rounded-xl text-xs font-medium outline-none focus:border-brand-lime h-20 resize-none shadow-inner"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="flex-1 py-2.5 rounded-xl border bg-transparent text-dim font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={processingPayment}
                                    className="flex-1 py-2.5 rounded-xl bg-brand-lime text-[#0A0A0A] font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-md cursor-pointer"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {processingPayment ? 'Processing...' : 'Confirm Payment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PAID':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-green-500/10 text-green-500 text-[9px] font-black uppercase tracking-widest border border-green-500/20"><CheckCircle2 size={10} strokeWidth={3} /> Paid</span>;
        case 'PARTIAL':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase tracking-widest border border-yellow-500/20"><Clock size={10} strokeWidth={3} /> Partial</span>;
        case 'OVERDUE':
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20"><AlertCircle size={10} strokeWidth={3} /> Overdue</span>;
        default:
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-white/5 text-dim text-[9px] font-black uppercase tracking-widest border border-white/10">Pending</span>;
    }
};

export default InvoiceList;
