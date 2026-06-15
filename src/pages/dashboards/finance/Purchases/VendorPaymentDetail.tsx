import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar, FolderOpen,
    ShoppingBag, FileText, Printer,
    AlertCircle, RefreshCw, CreditCard
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

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

interface AccountingCodeReference {
    _id: string;
    name: string;
    code: string;
}

interface BranchReference {
    _id: string;
    name: string;
    code: string;
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
    paidThroughAccount?: AccountingCodeReference;
    branch?: BranchReference;
    status: 'COMPLETED' | 'VOID';
    createdAt: string;
    updatedAt: string;
}

const VendorPaymentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [payment, setPayment] = useState<PaymentMade | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isFinancialAdmin = window.location.pathname.includes('/financial-admin');
    const baseDashboardPath = isFinancialAdmin ? '/admin/financial-admin' : '/admin/admin';

    const fetchPaymentDetails = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const res = await api.get(`/api/payments-made/${id}`);
            if (res && res.data && res.data.success) {
                setPayment(res.data.data);
            } else {
                setError('Failed to fetch payment details.');
            }
        } catch (err: any) {
            console.error('Error fetching vendor payment details:', err);
            setError(err.response?.data?.message || 'Failed to fetch vendor payment details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchPaymentDetails();
        }
    }, [id, fetchPaymentDetails]);

    const fmt = (n: number | undefined | null) => {
        if (n === undefined || n === null || typeof n !== 'number') return '0.00';
        return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handlePrint = () => {
        toast.success("Opening print dialog...");
        window.print();
    };

    if (loading) {
        return (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-brand-lime" size={32} />
                <span className="text-[10px] font-black tracking-widest text-dim uppercase">Loading Vendor Payment Details...</span>
            </div>
        );
    }

    if (error || !payment) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-[2rem] border text-center space-y-4 my-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-rose-500 opacity-60 animate-bounce" />
                <h1 className="text-lg font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Payment Record Not Found</h1>
                <p className="text-xs font-semibold text-dim">{error || "The vendor payment record you are looking for does not exist or has been deleted."}</p>
                <button
                    onClick={() => navigate(`${baseDashboardPath}/vendor-payment`)}
                    className="px-6 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wide hover:bg-white/10 transition-all cursor-pointer"
                    style={{ color: 'var(--text-main)' }}
                >
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="container-responsive max-w-5xl space-y-6 pb-20 select-text">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Purchases', path: '#' },
                    { label: 'Vendor Payments', path: `${baseDashboardPath}/vendor-payment` },
                    { label: payment.paymentNumber, active: true }
                ]}
            />

            {/* Header / Actions row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`${baseDashboardPath}/vendor-payment`)}
                        className="p-2.5 rounded-xl border hover:bg-white/5 active:scale-95 transition-all text-brand-lime cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                {payment.paymentNumber}
                            </h1>
                            <span
                                className="px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border"
                                style={{
                                    background: payment.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                    borderColor: payment.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: payment.status === 'COMPLETED' ? 'var(--brand-lime)' : '#ef4444'
                                }}
                            >
                                {payment.status}
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-dim mt-0.5">Recorded disbursement to supplier/vendor</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handlePrint}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-sm border hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Printer size={13} /> Print Record
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Payment Sheet */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Amount Banner */}
                    <div className="rounded-[2rem] p-8 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-hidden shadow-sm" style={{ background: 'rgba(200, 230, 0, 0.03)', borderColor: 'rgba(200, 230, 0, 0.12)' }}>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim opacity-50">Total Disbursed</span>
                            <p className="text-4xl font-black text-brand-lime tracking-tight">${fmt(payment.amount)}</p>
                        </div>
                        <div className="font-medium text-right sm:text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim opacity-50 block">Payment Date</span>
                            <span className="text-xs font-bold text-white mt-1 block" style={{ color: 'var(--text-main)' }}>
                                {new Date(payment.paymentDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Applied Bills */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">Setted Vendor Bills</h3>
                        <div className="border rounded-[2rem] overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            {payment.bills && payment.bills.length > 0 ? (
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead style={{ background: 'rgba(0,0,0,0.08)', borderColor: 'var(--border-main)' }}>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="py-4 px-6 font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Bill Number</th>
                                            <th className="py-4 px-6 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Amount Settled</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                        {payment.bills.map((bill) => (
                                            <tr key={bill.billId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="py-4 px-6">
                                                    <button
                                                        onClick={() => navigate(`${baseDashboardPath}/bills/${bill.billId}`)}
                                                        className="font-bold text-brand-lime hover:underline text-xs text-left cursor-pointer"
                                                    >
                                                        {bill.billNumber}
                                                    </button>
                                                </td>
                                                <td className="py-4 px-6 text-right font-mono font-black text-xs text-brand-lime">
                                                    ${fmt(bill.amountApplied)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-xs text-dim italic">
                                    No bills directly associated or settled with this payment.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Accountant Double Entry Ledger Details */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">General Ledger Impact</h3>
                        <div className="border rounded-[2rem] overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <table className="w-full border-collapse text-left text-xs">
                                <thead style={{ background: 'rgba(0,0,0,0.08)', borderColor: 'var(--border-main)' }}>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <th className="py-4 px-6 font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Account Details</th>
                                        <th className="py-4 px-6 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                        <th className="py-4 px-6 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {/* Debit Line (Accounts Payable / Supplier liability reduction) */}
                                    <tr className="border-b border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs" style={{ color: 'var(--text-main)' }}>
                                                    Accounts Payable — {payment.supplier?.name}
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-brand-lime mt-0.5">Liability</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-brand-lime font-black text-sm">${fmt(payment.amount)}</td>
                                        <td className="py-4 px-6 text-right font-mono text-dim opacity-40">—</td>
                                    </tr>
                                    {/* Credit Line (Cash/Bank / Paid Through Account asset reduction) */}
                                    <tr className="border-b border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs" style={{ color: 'var(--text-main)' }}>
                                                    {payment.paidThroughAccount?.name || 'Cash/Bank Account'}
                                                </span>
                                                <span className="text-[9px] font-black uppercase text-rose-400 mt-0.5">
                                                    {payment.paidThroughAccount?.code || 'ASSET'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-dim opacity-40">—</td>
                                        <td className="py-4 px-6 text-right font-mono text-rose-400 font-black text-sm">${fmt(payment.amount)}</td>
                                    </tr>
                                    {/* Totals */}
                                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                        <td className="py-4 px-6 font-black uppercase tracking-wider text-[9px] text-dim">Balanced Ledger Total</td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-brand-lime text-sm border-t" style={{ borderColor: 'var(--border-main)' }}>${fmt(payment.amount)}</td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-rose-400 text-sm border-t" style={{ borderColor: 'var(--border-main)' }}>${fmt(payment.amount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Memo / Notes Card */}
                    <div className="p-6 rounded-[2rem] border space-y-2.5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-dim opacity-60 flex items-center gap-1.5">
                            <FileText size={12} className="text-brand-lime" /> Notes / Memo
                        </h4>
                        <p className="text-xs text-white/90 leading-relaxed font-semibold" style={{ color: 'var(--text-main)' }}>
                            {payment.notes || 'No description memo recorded for this vendor payment.'}
                        </p>
                    </div>

                </div>

                {/* Sidebar Details Panel */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">Transactional Context</h3>

                    <div className="p-6 rounded-[2rem] border space-y-5 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                        {/* Branch */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FolderOpen size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Allocated Branch</span>
                                <span className="text-xs font-bold text-white mt-0.5 leading-tight" style={{ color: 'var(--text-main)' }}>
                                    {payment.branch?.name || 'General Branch'}
                                </span>
                                {payment.branch?.code && (
                                    <span className="text-[9px] font-black uppercase text-brand-lime mt-0.5">{payment.branch?.code}</span>
                                )}
                            </div>
                        </div>

                        {/* Vendor/Supplier */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ShoppingBag size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Vendor / Supplier</span>
                                <span
                                    onClick={() => navigate(`${baseDashboardPath}/manage-suppliers/${payment.supplier?._id}`)}
                                    className="text-xs font-bold text-brand-lime hover:underline mt-0.5 leading-tight cursor-pointer"
                                >
                                    {payment.supplier?.name}
                                </span>
                                {payment.supplier?.email && (
                                    <span className="text-[10px] text-dim mt-0.5">{payment.supplier.email}</span>
                                )}
                                {payment.supplier?.phone && (
                                    <span className="text-[10px] text-dim mt-0.5">{payment.supplier.phone}</span>
                                )}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <CreditCard size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Payment Method</span>
                                <span className="text-xs font-bold text-white mt-0.5 leading-tight" style={{ color: 'var(--text-main)' }}>
                                    {payment.paymentMethod}
                                </span>
                                {payment.referenceNumber && (
                                    <span className="text-[9px] font-black uppercase text-brand-lime mt-1">Ref: {payment.referenceNumber}</span>
                                )}
                            </div>
                        </div>

                        {/* Audit Details */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">System Registration</span>
                                <span className="text-[10px] font-semibold text-dim mt-0.5">
                                    Logged: {new Date(payment.createdAt).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-semibold text-dim mt-0.5">
                                    Last Updated: {new Date(payment.updatedAt).toLocaleString()}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default VendorPaymentDetail;
