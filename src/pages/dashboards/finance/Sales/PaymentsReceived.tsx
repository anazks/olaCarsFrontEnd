import { useState, useEffect } from 'react';
import { 
    DollarSign, 
    Search, 
    Filter, 
    RefreshCw, 
    User, 
    Calendar, 
    CreditCard, 
    FileCheck, 
    X, 
    Receipt 
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
    const [methodFilter, setMethodFilter] = useState<string>('ALL');

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/payments-received', {
                headers: { 'X-Skip-Toast': 'true' }
            });
            if (res.data && res.data.success) {
                setPayments(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch payments received:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    // Filter computation
    const filteredPayments = payments.filter((pmt) => {
        const matchSearch = 
            pmt.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (pmt.driverId?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (pmt.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchMethod = methodFilter === 'ALL' || pmt.paymentMethod === methodFilter;
        
        return matchSearch && matchMethod;
    });

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
                <button
                    onClick={fetchPayments}
                    disabled={loading}
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-wider text-dim hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                    Refresh Records
                </button>
            </div>

            {/* Dynamic Unified Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5 p-2.5 rounded-2xl bg-black/20 border border-white/5 backdrop-blur-sm shadow-sm w-fit">
                {/* Search Wrapper */}
                <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search PR #, driver or ref..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/5 rounded-xl outline-none text-xs font-medium focus:border-brand-lime/30 transition-all duration-200"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>

                {/* Vertical Separator */}
                <div className="h-6 w-px bg-white/5 hidden sm:block"></div>

                {/* Method Selector */}
                <div className="relative flex items-center gap-2 bg-white/5 px-3 py-1.5 border border-white/5 rounded-xl transition-all hover:border-white/10 focus-within:border-brand-lime/30">
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
                        <option value="Card" style={{ background: 'var(--bg-card)' }}>Credit/Debit Card</option>
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
            <div className="rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5">
                                <th className="p-6">Payment Details</th>
                                <th className="p-6">Received From</th>
                                <th className="p-6">Payment Date</th>
                                <th className="p-6">Method</th>
                                <th className="p-6">Amount Received</th>
                                <th className="p-6">Invoices Applied</th>
                                <th className="p-6 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 animate-pulse">
                                            <div className="w-12 h-12 rounded-full border-t-2 border-brand-lime animate-spin"></div>
                                            <span className="text-xs font-black uppercase tracking-widest text-brand-lime/50">Fetching ledger transactions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-24 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4 opacity-50">
                                            <Receipt size={48} className="text-dim" />
                                            <span className="text-sm font-medium text-dim">No accounting records found.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((pmt) => (
                                    <tr key={pmt._id} className="group hover:bg-white/[0.04] transition-all duration-300">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black tracking-wide" style={{ color: 'var(--text-main)' }}>{pmt.paymentNumber}</span>
                                                {pmt.referenceNumber && (
                                                    <span className="text-[9px] font-mono text-dim mt-0.5">Ref: {pmt.referenceNumber}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-brand-lime/10 flex items-center justify-center text-brand-lime text-xs font-bold border border-brand-lime/20">
                                                    {pmt.driverId?.name?.charAt(0) || 'D'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{pmt.driverId?.name || 'Unassigned Driver'}</span>
                                                    <span className="text-[10px] text-dim truncate max-w-[150px]">{pmt.driverId?.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-xs font-medium text-dim">
                                                <Calendar size={14} />
                                                {new Date(pmt.paymentDate || pmt.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-1.5">
                                                <CreditCard size={12} className="text-dim" />
                                                <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>{pmt.paymentMethod}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                    ${pmt.amountReceived.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-wrap gap-1">
                                                {pmt.invoices?.length > 0 ? (
                                                    pmt.invoices.map((inv, idx) => (
                                                        <span 
                                                            key={idx} 
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black text-dim uppercase tracking-wider"
                                                        >
                                                            <FileCheck size={8} className="text-brand-lime" />
                                                            {inv.invoiceNumber}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-dim italic">Unapplied Balance</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span 
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                                                    ${pmt.status === 'COMPLETED' 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    }
                                                `}
                                            >
                                                {pmt.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsReceived;
