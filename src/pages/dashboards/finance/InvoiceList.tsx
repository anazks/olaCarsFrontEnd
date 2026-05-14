import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Filter, Search, Download, DollarSign, User, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { getInvoices, payInvoice } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import toast from 'react-hot-toast';

const InvoiceList = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    // Payment Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentNote, setPaymentNote] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = {};
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            
            const response = await getInvoices(filters);
            setInvoices(response.data || []);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch invoices');
            toast.error('Error loading invoices');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

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

    const filteredInvoices = invoices.filter(inv => {
        const query = searchQuery.toLowerCase();
        return (
            inv.invoiceNumber.toLowerCase().includes(query) ||
            (inv.driver as any)?.personalInfo?.fullName?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="container-responsive space-y-6">
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

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-3xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by Invoice # or Driver Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none text-sm transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border outline-none text-sm cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="PAID">Paid</option>
                        <option value="OVERDUE">Overdue</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-[2rem] border overflow-hidden bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
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
                            {loading ? (
                                <tr><td colSpan={7} className="p-20 text-center animate-pulse text-xs font-black uppercase tracking-widest opacity-40">Loading Invoices...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan={7} className="p-20 text-center text-dim text-sm font-medium">No invoices found matching your criteria.</td></tr>
                            ) : filteredInvoices.map((inv) => (
                                <tr key={inv._id} className="group hover:bg-white/[0.02] transition-all">
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
            </div>

            {/* Payment Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Record Payment</h2>
                            <p className="text-xs font-bold text-dim uppercase tracking-widest mt-1">Invoice: {selectedInvoice.invoiceNumber}</p>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Payment Amount (USD)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-lime" size={18} />
                                    <input 
                                        type="number"
                                        required
                                        max={selectedInvoice.balance}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-brand-lime transition-all"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-dim mt-1">Remaining Balance: ${selectedInvoice.balance}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Payment Method</label>
                                <select 
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-brand-lime appearance-none cursor-pointer"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Card">Credit/Debit Card</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Notes / Reference</label>
                                <textarea 
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="Any additional details..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-brand-lime h-24 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setSelectedInvoice(null)}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 text-dim font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
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
