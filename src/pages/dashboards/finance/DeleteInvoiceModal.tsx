import { useState, useEffect, useRef } from 'react';
import { X, Trash2, AlertTriangle, ChevronDown, Check, FileText } from 'lucide-react';
import * as invoiceService from '../../../services/invoiceService';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    invoice: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const DeleteInvoiceModal = ({ isOpen, invoice, onClose, onSuccess }: Props) => {
    const [submitting, setSubmitting] = useState(false);
    const [resolutionData, setResolutionData] = useState<{
        amountPaid: number;
        hasOtherOpenInvoices: boolean;
        otherOpenInvoices: Array<{ _id: string; invoiceNumber: string; balance: number; totalAmountDue: number }>;
    } | null>(null);

    const [paymentAction, setPaymentAction] = useState<'CONVERT_TO_CUSTOMER_ADVANCE' | 'REASSIGN_TO_INVOICE'>('CONVERT_TO_CUSTOMER_ADVANCE');
    const [targetInvoiceId, setTargetInvoiceId] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setResolutionData(null);
            setPaymentAction('CONVERT_TO_CUSTOMER_ADVANCE');
            setTargetInvoiceId('');
            setIsDropdownOpen(false);
            setSubmitting(false);
        }
    }, [isOpen, invoice]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    if (!isOpen || !invoice) return null;

    const handleDelete = async (actionOverride?: string, targetIdOverride?: string) => {
        setSubmitting(true);
        try {
            const payload: any = {};
            if (actionOverride) {
                payload.paymentAction = actionOverride;
            } else if (resolutionData && paymentAction) {
                payload.paymentAction = paymentAction;
            }
            if ((actionOverride === 'REASSIGN_TO_INVOICE' || (resolutionData && paymentAction === 'REASSIGN_TO_INVOICE')) && (targetIdOverride || targetInvoiceId)) {
                payload.targetInvoiceId = targetIdOverride || targetInvoiceId;
            }

            const res = await invoiceService.deleteInvoice(invoice._id, payload);
            toast.success(res?.message || `Invoice ${invoice.invoiceNumber} deleted successfully`);
            onSuccess();
            onClose();
        } catch (err: any) {
            const errData = err.response?.data;
            if (errData?.requiresPaymentAction) {
                const currentInvoiceId = invoice?._id?.toString();
                const currentInvoiceNum = invoice?.invoiceNumber;
                const filteredInvoices = (errData.otherOpenInvoices || []).filter(
                    (oi: any) => oi._id?.toString() !== currentInvoiceId && oi.invoiceNumber !== currentInvoiceNum
                );

                setResolutionData({
                    amountPaid: errData.amountPaid,
                    hasOtherOpenInvoices: filteredInvoices.length > 0,
                    otherOpenInvoices: filteredInvoices
                });
                if (filteredInvoices.length > 0) {
                    setTargetInvoiceId(filteredInvoices[0]._id);
                } else {
                    setPaymentAction('CONVERT_TO_CUSTOMER_ADVANCE');
                    setTargetInvoiceId('');
                }
            } else {
                toast.error(errData?.message || err.message || 'Failed to delete invoice');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const selectedTargetInvoice = resolutionData?.otherOpenInvoices.find(
        (oi) => oi._id === targetInvoiceId
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
                className="w-full max-w-lg rounded-3xl border p-6 space-y-6 shadow-2xl relative"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3 text-red-500">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>
                                Delete Invoice
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {invoice.invoiceNumber}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all text-dim hover:text-white cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {!resolutionData ? (
                    <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>
                            Are you sure you want to delete invoice <span className="font-bold text-[#C8E600]">{invoice.invoiceNumber}</span>?
                        </p>
                        <p className="text-xs text-dim">
                            This will reverse the invoice's accounts receivable and income ledger entries and sync Chart of Accounts balances.
                        </p>

                        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl border font-bold text-xs hover:bg-white/5 transition-all cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete()}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer"
                            >
                                {submitting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-400">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <div className="text-xs space-y-1">
                                <p className="font-bold">Payment Resolution Required</p>
                                <p className="opacity-90">
                                    This invoice has recorded payments totaling <span className="font-bold text-white">${resolutionData.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> applied to it. How would you like to handle these payments?
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Option 1: Convert to Customer Advance */}
                            <div
                                onClick={() => setPaymentAction('CONVERT_TO_CUSTOMER_ADVANCE')}
                                className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                                    paymentAction === 'CONVERT_TO_CUSTOMER_ADVANCE'
                                        ? 'border-[#C8E600] bg-[#C8E600]/5 shadow-sm'
                                        : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentAction"
                                    value="CONVERT_TO_CUSTOMER_ADVANCE"
                                    checked={paymentAction === 'CONVERT_TO_CUSTOMER_ADVANCE'}
                                    onChange={() => setPaymentAction('CONVERT_TO_CUSTOMER_ADVANCE')}
                                    className="mt-1 accent-[#C8E600] cursor-pointer"
                                />
                                <div>
                                    <span className="font-bold text-xs block text-white">Convert to Customer Advance</span>
                                    <span className="text-[11px] text-dim block mt-0.5 leading-relaxed">
                                        Reclassifies ${resolutionData.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} as available customer advance liability (Account 2.1.02) for future invoices.
                                    </span>
                                </div>
                            </div>

                            {/* Option 2: Reassign to another open invoice */}
                            {resolutionData.hasOtherOpenInvoices ? (
                                <div
                                    onClick={() => setPaymentAction('REASSIGN_TO_INVOICE')}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                        paymentAction === 'REASSIGN_TO_INVOICE'
                                            ? 'border-[#C8E600] bg-[#C8E600]/5 shadow-sm'
                                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5">
                                        <input
                                            type="radio"
                                            name="paymentAction"
                                            value="REASSIGN_TO_INVOICE"
                                            checked={paymentAction === 'REASSIGN_TO_INVOICE'}
                                            onChange={() => setPaymentAction('REASSIGN_TO_INVOICE')}
                                            className="mt-1 accent-[#C8E600] cursor-pointer"
                                        />
                                        <div className="w-full">
                                            <span className="font-bold text-xs block text-white">Reassign to Another Open Invoice</span>
                                            <span className="text-[11px] text-dim block mt-0.5 leading-relaxed">
                                                Transfer payments directly to an outstanding invoice for this customer.
                                            </span>

                                            {/* Rich Ola UI Target Invoice Picker */}
                                            {paymentAction === 'REASSIGN_TO_INVOICE' && (
                                                <div className="mt-3.5 relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-dim block mb-1.5">
                                                        Select Destination Invoice
                                                    </label>

                                                    <button
                                                        type="button"
                                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                        className="w-full p-3 rounded-2xl border bg-black/50 text-left flex items-center justify-between transition-all hover:border-[#C8E600]/60 focus:border-[#C8E600] cursor-pointer group"
                                                        style={{ borderColor: isDropdownOpen ? '#C8E600' : 'rgba(255,255,255,0.15)' }}
                                                    >
                                                        {selectedTargetInvoice ? (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600] flex-shrink-0">
                                                                    <FileText size={15} />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-black text-white group-hover:text-[#C8E600] transition-colors">
                                                                        {selectedTargetInvoice.invoiceNumber}
                                                                    </span>
                                                                    <span className="text-[10px] text-dim">
                                                                        Balance Due: <strong className="font-mono text-amber-400 font-bold">${(selectedTargetInvoice.balance ?? selectedTargetInvoice.totalAmountDue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-dim">Select an outstanding invoice...</span>
                                                        )}
                                                        <ChevronDown size={16} className={`text-dim transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-[#C8E600]' : ''}`} />
                                                    </button>

                                                    {/* Floating Options Panel */}
                                                    {isDropdownOpen && (
                                                        <div
                                                            className="absolute z-50 left-0 right-0 mt-2 rounded-2xl border shadow-2xl p-2 max-h-56 overflow-y-auto space-y-1.5 backdrop-blur-2xl"
                                                            style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.15)' }}
                                                        >
                                                            {resolutionData.otherOpenInvoices.map((oi) => {
                                                                const isSelected = oi._id === targetInvoiceId;
                                                                return (
                                                                    <div
                                                                        key={oi._id}
                                                                        onClick={() => {
                                                                            setTargetInvoiceId(oi._id);
                                                                            setIsDropdownOpen(false);
                                                                        }}
                                                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                                            isSelected
                                                                                ? 'bg-[#C8E600]/10 border-[#C8E600]/40 text-white shadow-sm'
                                                                                : 'border-transparent hover:bg-white/5 text-dim hover:text-white'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-2.5">
                                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#C8E600] text-black font-black' : 'bg-white/5 text-dim'}`}>
                                                                                <FileText size={13} />
                                                                            </div>
                                                                            <div>
                                                                                <p className={`text-xs font-black ${isSelected ? 'text-[#C8E600]' : 'text-white'}`}>
                                                                                    {oi.invoiceNumber}
                                                                                </p>
                                                                                <p className="text-[10px] font-mono text-dim">
                                                                                    Total: ${(oi.totalAmountDue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex items-center gap-3">
                                                                            <div>
                                                                                <span className="text-[9px] uppercase tracking-wider block font-bold text-dim">Balance Due</span>
                                                                                <span className="text-xs font-mono font-black text-amber-400">
                                                                                    ${(oi.balance ?? oi.totalAmountDue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                </span>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <div className="w-5 h-5 rounded-full bg-[#C8E600] text-black flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                                    <Check size={12} strokeWidth={3} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-dim">
                                    This customer has no other open invoices. <strong>Convert to Customer Advance</strong> is the only available option.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                type="button"
                                onClick={() => setResolutionData(null)}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl border font-bold text-xs hover:bg-white/5 transition-all text-dim cursor-pointer"
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete()}
                                disabled={submitting || (paymentAction === 'REASSIGN_TO_INVOICE' && !targetInvoiceId)}
                                className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {submitting ? 'Processing...' : 'Confirm & Delete'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteInvoiceModal;
