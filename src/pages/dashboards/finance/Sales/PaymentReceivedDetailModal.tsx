import { X, Calendar, User, Landmark, Coins, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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
}

interface DepositedAccountReference {
    _id: string;
    code: string;
    name: string;
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
    depositedTo?: DepositedAccountReference;
    createdAt: string;
}

interface Props {
    payment: PaymentReceived | null;
    onClose: () => void;
}

const PaymentReceivedDetailModal = ({ payment, onClose }: Props) => {
    if (!payment) return null;

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totalApplied = payment.invoices?.reduce((sum, inv) => sum + (inv.amountApplied || 0), 0) || 0;
    const prepaymentAdvance = Math.max(0, payment.amountReceived - totalApplied);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#0A0A0A]/85 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div 
                className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] border shadow-2xl flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-200 select-text"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute right-6 top-6 p-2 rounded-xl border hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <X size={15} />
                </button>

                {/* Header */}
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 border border-brand-lime/25 flex items-center justify-center flex-shrink-0">
                        <Coins className="text-brand-lime" size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Payment Receipt</h2>
                            <span 
                                className="text-[9px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 uppercase tracking-wider"
                                style={{ 
                                    color: payment.status === 'COMPLETED' ? 'var(--brand-lime)' : '#f87171',
                                    borderColor: payment.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                                    background: payment.status === 'COMPLETED' ? 'rgba(200, 230, 0, 0.03)' : 'rgba(248, 113, 113, 0.03)'
                                }}
                            >
                                {payment.status === 'COMPLETED' ? (
                                    <>
                                        <CheckCircle2 size={10} /> {payment.status}
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={10} /> {payment.status}
                                    </>
                                )}
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-dim mt-0.5">Receipt # {payment.paymentNumber}</p>
                    </div>
                </div>

                {/* Body Content */}
                <div className="space-y-6">

                    {/* Operator Details Card */}
                    <div className="p-4 rounded-[2rem] border flex items-center gap-4" style={{ background: 'rgba(255, 255, 255, 0.01)', borderColor: 'var(--border-main)' }}>
                        <div className="w-10 h-10 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                            <User className="text-brand-lime" size={18} />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Customer / Operator</span>
                            <span className="text-xs font-black text-white block mt-0.5" style={{ color: 'var(--text-main)' }}>
                                {typeof payment.driverId === 'object' && payment.driverId ? (
                                    payment.driverId.personalInfo?.fullName || payment.driverId.name || 'N/A'
                                ) : (
                                    String(payment.driverId || 'N/A')
                                )}
                            </span>
                            <span className="text-[9px] font-mono uppercase text-dim block mt-0.5">
                                Driver ID: {typeof payment.driverId === 'object' && payment.driverId ? (payment.driverId.driverId || 'N/A') : 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Settlement and Bank Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Summary Block */}
                        <div className="p-5 rounded-[2rem] border flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div>
                                <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Total Amount Received</span>
                                <span className="text-2xl font-black font-mono text-brand-lime mt-1 block">
                                    ${fmt(payment.amountReceived)}
                                </span>
                            </div>
                            <div className="border-t pt-3 mt-4 grid grid-cols-2 gap-2 text-center" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
                                <div>
                                    <span className="text-[8px] font-bold uppercase text-dim block">Applied</span>
                                    <span className="text-xs font-bold text-white block mt-0.5" style={{ color: 'var(--text-main)' }}>${fmt(totalApplied)}</span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-bold uppercase text-dim block">Surplus/Credit</span>
                                    <span className="text-xs font-bold text-brand-lime block mt-0.5">${fmt(prepaymentAdvance)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Accounting Block */}
                        <div className="p-5 rounded-[2rem] border space-y-3.5" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <Landmark size={14} className="text-brand-lime" />
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Deposited Account</span>
                                    <span className="text-xs font-bold text-white block mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        {payment.depositedTo ? `${payment.depositedTo.code} – ${payment.depositedTo.name}` : 'Main Operating Bank'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-brand-lime" />
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Received Date</span>
                                    <span className="text-xs font-semibold text-white block mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        {new Date(payment.paymentDate).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Coins size={14} className="text-brand-lime" />
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Payment Method</span>
                                    <span className="text-xs font-semibold text-white block mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        {payment.paymentMethod}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Reference # / Notes */}
                    {(payment.referenceNumber || payment.notes) && (
                        <div className="p-4 rounded-[2rem] border space-y-2.5" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                            {payment.referenceNumber && (
                                <div className="text-xs font-semibold">
                                    <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Reference Number</span>
                                    <span className="text-white mt-0.5 block" style={{ color: 'var(--text-main)' }}>{payment.referenceNumber}</span>
                                </div>
                            )}
                            {payment.notes && (
                                <div className="text-xs font-semibold">
                                    <span className="text-[9px] font-black uppercase text-dim block tracking-widest">Memo / Notes</span>
                                    <p className="text-dim mt-0.5 font-medium leading-relaxed">{payment.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applied Invoices Section */}
                    <div className="border rounded-[2rem] overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">Allocations / Applied Invoices</h4>
                            <FileText size={12} className="text-dim" />
                        </div>
                        <div className="p-4">
                            {!payment.invoices || payment.invoices.length === 0 ? (
                                <div className="py-6 text-center text-xs text-dim italic">
                                    This payment was booked as an unapplied prepayment credit balance.
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-left text-xs font-semibold">
                                    <thead className="text-[9px] font-bold text-dim uppercase" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                        <tr>
                                            <th className="py-2.5 px-3">Invoice Number</th>
                                            <th className="py-2.5 px-3 text-right">Amount Settled</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: 'var(--text-main)' }}>
                                        {payment.invoices.map((inv) => (
                                            <tr key={inv.invoiceId} className="border-b last:border-0 hover:bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="py-3 px-3">
                                                    <Link 
                                                        to={`/admin/financial-admin/invoices/${inv.invoiceId}`}
                                                        className="font-black text-brand-lime hover:underline cursor-pointer"
                                                    >
                                                        {inv.invoiceNumber}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-3 text-right text-brand-lime font-black">${fmt(inv.amountApplied)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer Action */}
                <div className="flex justify-end pt-6 border-t mt-6" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl text-black bg-brand-lime text-xs font-black uppercase tracking-wide hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        Close Details
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PaymentReceivedDetailModal;
