import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import * as billService from '../../../../services/billService';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    bill: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const DeleteBillModal = ({ isOpen, bill, onClose, onSuccess }: Props) => {
    const [submitting, setSubmitting] = useState(false);
    const [resolutionData, setResolutionData] = useState<{
        amountPaid: number;
        hasOtherOpenBills: boolean;
        otherOpenBills: Array<{ _id: string; billNumber: string; balanceDue: number }>;
    } | null>(null);

    const [paymentAction, setPaymentAction] = useState<'CONVERT_TO_ADVANCE' | 'REASSIGN_TO_BILL'>('CONVERT_TO_ADVANCE');
    const [targetBillId, setTargetBillId] = useState<string>('');

    if (!isOpen || !bill) return null;

    const handleDelete = async (actionOverride?: string, targetIdOverride?: string) => {
        setSubmitting(true);
        try {
            const payload: any = {};
            if (actionOverride || paymentAction) {
                payload.paymentAction = actionOverride || paymentAction;
            }
            if ((actionOverride === 'REASSIGN_TO_BILL' || paymentAction === 'REASSIGN_TO_BILL') && (targetIdOverride || targetBillId)) {
                payload.targetBillId = targetIdOverride || targetBillId;
            }

            const res = await billService.deleteBill(bill._id, payload);
            toast.success(res?.message || `Bill ${bill.billNumber} deleted successfully`);
            onSuccess();
            onClose();
        } catch (err: any) {
            const errData = err.response?.data;
            if (errData?.requiresPaymentAction) {
                setResolutionData({
                    amountPaid: errData.amountPaid,
                    hasOtherOpenBills: errData.hasOtherOpenBills,
                    otherOpenBills: errData.otherOpenBills || []
                });
                if (errData.hasOtherOpenBills && errData.otherOpenBills?.length > 0) {
                    setTargetBillId(errData.otherOpenBills[0]._id);
                }
            } else {
                toast.error(errData?.message || err.message || 'Failed to delete bill');
            }
        } finally {
            setSubmitting(false);
        }
    };

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
                                Delete Bill
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {bill.billNumber}
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
                            Are you sure you want to delete bill <span className="font-bold text-[#C8E600]">{bill.billNumber}</span>?
                        </p>
                        <p className="text-xs text-dim">
                            This will reverse the bill's liability entries and update Chart of Accounts balances.
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
                                    This bill has payments totaling <span className="font-bold text-white">${resolutionData.amountPaid.toLocaleString()}</span> applied to it. How would you like to handle these payments?
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Option 1: Convert to Advance */}
                            <label
                                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                                    paymentAction === 'CONVERT_TO_ADVANCE'
                                        ? 'border-[#C8E600] bg-[#C8E600]/5'
                                        : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="paymentAction"
                                    value="CONVERT_TO_ADVANCE"
                                    checked={paymentAction === 'CONVERT_TO_ADVANCE'}
                                    onChange={() => setPaymentAction('CONVERT_TO_ADVANCE')}
                                    className="mt-1 accent-[#C8E600]"
                                />
                                <div>
                                    <span className="font-bold text-xs block text-white">Convert to Vendor Advance</span>
                                    <span className="text-[11px] text-dim block mt-0.5">
                                        Restores ${resolutionData.amountPaid.toLocaleString()} as available advance credit on the supplier's account.
                                    </span>
                                </div>
                            </label>

                            {/* Option 2: Reassign to another open bill */}
                            {resolutionData.hasOtherOpenBills ? (
                                <label
                                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                                        paymentAction === 'REASSIGN_TO_BILL'
                                            ? 'border-[#C8E600] bg-[#C8E600]/5'
                                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentAction"
                                        value="REASSIGN_TO_BILL"
                                        checked={paymentAction === 'REASSIGN_TO_BILL'}
                                        onChange={() => setPaymentAction('REASSIGN_TO_BILL')}
                                        className="mt-1 accent-[#C8E600]"
                                    />
                                    <div className="w-full">
                                        <span className="font-bold text-xs block text-white">Reassign to Another Open Bill</span>
                                        <span className="text-[11px] text-dim block mt-0.5 mb-2">
                                            Transfer payments to an outstanding bill for this supplier.
                                        </span>
                                        {paymentAction === 'REASSIGN_TO_BILL' && (
                                            <select
                                                value={targetBillId}
                                                onChange={(e) => setTargetBillId(e.target.value)}
                                                className="w-full p-2.5 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                                            >
                                                {resolutionData.otherOpenBills.map((ob) => (
                                                    <option key={ob._id} value={ob._id}>
                                                        {ob.billNumber} (Balance Due: ${ob.balanceDue.toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </label>
                            ) : (
                                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-dim">
                                    This vendor has no other open bills. <strong>Convert to Vendor Advance</strong> is the only available option.
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
                                disabled={submitting || (paymentAction === 'REASSIGN_TO_BILL' && !targetBillId)}
                                className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2 cursor-pointer"
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

export default DeleteBillModal;
