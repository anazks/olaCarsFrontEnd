import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, RefreshCw, CreditCard } from 'lucide-react';
import * as billService from '../../../../services/billService';
import type { BulkDeletePreviewResponse, BulkDeleteResolution } from '../../../../services/billService';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    billIds: string[];
    onClose: () => void;
    onSuccess: () => void;
}

export const BulkDeleteBillsModal: React.FC<Props> = ({ isOpen, billIds, onClose, onSuccess }) => {
    const [loadingPreview, setLoadingPreview] = useState(true);
    const [previewData, setPreviewData] = useState<BulkDeletePreviewResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Map of billId -> resolution
    const [resolutions, setResolutions] = useState<Record<string, { action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE'; targetBillId?: string }>>({});

    useEffect(() => {
        if (isOpen && billIds.length > 0) {
            loadPreview();
        } else {
            setPreviewData(null);
            setResolutions({});
            setSubmitting(false);
        }
    }, [isOpen, billIds]);

    const loadPreview = async () => {
        setLoadingPreview(true);
        try {
            const data = await billService.previewBulkDeleteBills(billIds);
            setPreviewData(data);

            // Initialize default resolutions for paid bills
            const initialRes: Record<string, { action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE'; targetBillId?: string }> = {};
            (data.paidBills || []).forEach(bill => {
                if (bill.hasOtherOpenBills && bill.otherOpenBills && bill.otherOpenBills.length > 0) {
                    initialRes[bill._id] = {
                        action: 'REASSIGN_TO_BILL',
                        targetBillId: bill.otherOpenBills[0]._id
                    };
                } else {
                    initialRes[bill._id] = {
                        action: 'CONVERT_TO_ADVANCE'
                    };
                }
            });
            setResolutions(initialRes);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to analyze selected bills for deletion');
            onClose();
        } finally {
            setLoadingPreview(false);
        }
    };

    if (!isOpen) return null;

    const handleActionChange = (billId: string, action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE') => {
        setResolutions(prev => {
            const current = prev[billId] || {};
            const bill = previewData?.paidBills.find(b => b._id === billId);
            const defaultTarget = (action === 'REASSIGN_TO_BILL' && bill?.otherOpenBills?.length) 
                ? bill.otherOpenBills[0]._id 
                : undefined;

            return {
                ...prev,
                [billId]: {
                    action,
                    targetBillId: action === 'REASSIGN_TO_BILL' ? (current.targetBillId || defaultTarget) : undefined
                }
            };
        });
    };

    const handleTargetChange = (billId: string, targetBillId: string) => {
        setResolutions(prev => ({
            ...prev,
            [billId]: {
                action: 'REASSIGN_TO_BILL',
                targetBillId
            }
        }));
    };

    const setAllToAdvance = () => {
        if (!previewData?.paidBills) return;
        const updated: Record<string, { action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE'; targetBillId?: string }> = {};
        previewData.paidBills.forEach(b => {
            updated[b._id] = { action: 'CONVERT_TO_ADVANCE' };
        });
        setResolutions(updated);
    };

    const setAllToReassign = () => {
        if (!previewData?.paidBills) return;
        const updated: Record<string, { action: 'REASSIGN_TO_BILL' | 'CONVERT_TO_ADVANCE'; targetBillId?: string }> = {};
        previewData.paidBills.forEach(b => {
            if (b.hasOtherOpenBills && b.otherOpenBills && b.otherOpenBills.length > 0) {
                updated[b._id] = {
                    action: 'REASSIGN_TO_BILL',
                    targetBillId: b.otherOpenBills[0]._id
                };
            } else {
                updated[b._id] = { action: 'CONVERT_TO_ADVANCE' };
            }
        });
        setResolutions(updated);
    };

    const handleConfirmDelete = async () => {
        setSubmitting(true);
        try {
            const formattedResolutions: BulkDeleteResolution[] = Object.keys(resolutions).map(billId => ({
                billId,
                action: resolutions[billId].action,
                targetBillId: resolutions[billId].targetBillId
            }));

            const res = await billService.bulkDeleteBills({
                billIds,
                resolutions: formattedResolutions
            });

            toast.success(res?.message || `Successfully deleted ${billIds.length} bills.`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to bulk delete bills');
        } finally {
            setSubmitting(false);
        }
    };

    const totalUnpaid = previewData?.unpaidBills?.length || 0;
    const totalPaid = previewData?.paidBills?.length || 0;
    const totalPaidAmount = (previewData?.paidBills || []).reduce((sum, b) => sum + (b.amountPaid || 0), 0);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div
                className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden my-8"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                Delete Purchase Bills
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {billIds.length} bill{billIds.length > 1 ? 's' : ''} selected for permanent deletion
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {loadingPreview ? (
                        <div className="py-16 flex flex-col items-center justify-center gap-4">
                            <RefreshCw size={32} className="animate-spin text-[#C8E600]" />
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Analyzing selected bills and vendor balances...</p>
                        </div>
                    ) : (
                        <>
                            {/* Warning Banner */}
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-500 text-xs leading-relaxed">
                                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Permanent Deletion Warning</p>
                                    <p className="mt-0.5 text-amber-500/90">
                                        Deleting bills will permanently remove their records, reverse initial expense and liability ledger bookings, and reset any linked Purchase Orders.
                                    </p>
                                </div>
                            </div>

                            {/* Summary Pills */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Unpaid Bills
                                    </span>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-xl font-black text-emerald-400">{totalUnpaid}</span>
                                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>deleted directly</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Bills with Settled Payments
                                    </span>
                                    <div className="mt-1 flex items-baseline gap-2">
                                        <span className="text-xl font-black text-amber-400">{totalPaid}</span>
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                            (${totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} total paid)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Paid Bills Resolution Section */}
                            {totalPaid > 0 && (
                                <div className="space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                                                Settled Payments Resolution
                                            </h3>
                                            <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                                                Select whether to reassign payments to other open bills or credit as Vendor Advance.
                                            </p>
                                        </div>

                                        {/* Quick Batch Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={setAllToReassign}
                                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                                style={{ color: '#C8E600' }}
                                                title="Reassign to open bills where available"
                                            >
                                                Reassign All Open
                                            </button>
                                            <button
                                                type="button"
                                                onClick={setAllToAdvance}
                                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                                style={{ color: 'var(--text-dim)' }}
                                                title="Convert all to vendor advance credit"
                                            >
                                                All to Advance
                                            </button>
                                        </div>
                                    </div>

                                    {/* Per-Bill Cards */}
                                    <div className="space-y-3">
                                        {previewData?.paidBills.map(bill => {
                                            const currentRes = resolutions[bill._id] || { action: 'CONVERT_TO_ADVANCE' };
                                            const hasOpen = bill.hasOtherOpenBills && bill.otherOpenBills && bill.otherOpenBills.length > 0;
                                            const supplierName = bill.supplier?.name || 'Unknown Supplier';

                                            return (
                                                <div
                                                    key={bill._id}
                                                    className="p-4 rounded-2xl border space-y-3"
                                                    style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'var(--border-main)' }}
                                                >
                                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-black text-sm" style={{ color: 'var(--text-main)' }}>
                                                                    {bill.billNumber}
                                                                </span>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/5 border border-white/10" style={{ color: 'var(--text-dim)' }}>
                                                                    {supplierName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs font-bold text-amber-400">
                                                            Paid: ${(bill.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </div>
                                                    </div>

                                                    {/* Action Selection */}
                                                    <div className="space-y-2 pt-2 border-t border-white/5 text-xs">
                                                        {hasOpen ? (
                                                            <>
                                                                {/* Option A: Reassign to Open Bill */}
                                                                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                                                    <input
                                                                        type="radio"
                                                                        name={`res_${bill._id}`}
                                                                        checked={currentRes.action === 'REASSIGN_TO_BILL'}
                                                                        onChange={() => handleActionChange(bill._id, 'REASSIGN_TO_BILL')}
                                                                        className="mt-1 accent-[#C8E600]"
                                                                    />
                                                                    <div className="flex-1 space-y-1.5">
                                                                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                                            Reassign to Open Bill
                                                                        </span>
                                                                        {currentRes.action === 'REASSIGN_TO_BILL' && (
                                                                            <select
                                                                                value={currentRes.targetBillId || ''}
                                                                                onChange={(e) => handleTargetChange(bill._id, e.target.value)}
                                                                                className="w-full px-3 py-2 rounded-xl border text-xs outline-none font-bold"
                                                                                style={{
                                                                                    background: 'var(--bg-input)',
                                                                                    borderColor: 'var(--border-main)',
                                                                                    color: 'var(--text-main)'
                                                                                }}
                                                                            >
                                                                                {bill.otherOpenBills?.map(ob => (
                                                                                    <option key={ob._id} value={ob._id}>
                                                                                        {ob.billNumber} — Due: ${(ob.balanceDue || 0).toFixed(2)} {ob.dueDate ? `(Due: ${new Date(ob.dueDate).toLocaleDateString()})` : ''}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </div>
                                                                </label>

                                                                {/* Option B: Convert to Vendor Advance */}
                                                                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                                                    <input
                                                                        type="radio"
                                                                        name={`res_${bill._id}`}
                                                                        checked={currentRes.action === 'CONVERT_TO_ADVANCE'}
                                                                        onChange={() => handleActionChange(bill._id, 'CONVERT_TO_ADVANCE')}
                                                                        className="mt-1 accent-[#C8E600]"
                                                                    />
                                                                    <span className="font-medium" style={{ color: 'var(--text-dim)' }}>
                                                                        Convert to Vendor Advance <span className="text-[11px] opacity-75">(Unapplied credit balance)</span>
                                                                    </span>
                                                                </label>
                                                            </>
                                                        ) : (
                                                            /* No open bills available */
                                                            <div className="flex items-center gap-2 text-[11px] text-brand-lime font-medium p-2.5 rounded-xl bg-white/[0.02] border border-white/5" style={{ color: 'var(--text-dim)' }}>
                                                                <CreditCard size={14} className="text-[#C8E600] shrink-0" />
                                                                <span>
                                                                    No other open bills for <strong>{supplierName}</strong> — payment will automatically convert to <strong>Vendor Advance</strong>.
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Unpaid bills preview list */}
                            {totalUnpaid > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Unpaid Bills to Delete ({totalUnpaid}):
                                    </span>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                                        {previewData?.unpaidBills.map(b => (
                                            <span
                                                key={b._id}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border"
                                                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            >
                                                {b.billNumber} (${(b.totalAmount || 0).toFixed(2)})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={submitting || loadingPreview}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {submitting ? (
                            <>
                                <RefreshCw size={14} className="animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 size={14} />
                                Confirm & Delete {billIds.length} Bill{billIds.length > 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkDeleteBillsModal;
