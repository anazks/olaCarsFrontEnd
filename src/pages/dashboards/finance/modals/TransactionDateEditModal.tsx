import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateTransactionDate } from '../../../../services/bankAccountService';

interface TransactionDateEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction: any;
}

const CUTOFF_DATE_STR = '2026-06-15';

export const TransactionDateEditModal: React.FC<TransactionDateEditModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    transaction
}) => {
    const [dateVal, setDateVal] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Helper to get YYYY-MM-DD from date
    const getYyyyMmDd = (dInput: any): string => {
        if (!dInput) return '';
        const d = new Date(dInput);
        if (isNaN(d.getTime())) return '';
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    useEffect(() => {
        if (isOpen && transaction) {
            const raw = transaction.entryDate || transaction.date || transaction.createdAt;
            setDateVal(getYyyyMmDd(raw));
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    const originalDateObj = new Date(transaction.entryDate || transaction.date || transaction.createdAt);
    const hasValidOrigDate = !isNaN(originalDateObj.getTime());
    const originalFormattedTime = hasValidOrigDate 
        ? originalDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'N/A';
    const originalFormattedFull = hasValidOrigDate
        ? `${originalDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} at ${originalFormattedTime}`
        : 'N/A';

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dateVal) {
            toast.error('Please select a valid date');
            return;
        }

        if (dateVal <= CUTOFF_DATE_STR) {
            toast.error(`Transactions on or before ${CUTOFF_DATE_STR} cannot be modified`);
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Updating transaction date and recalculating running balances...');

        try {
            await updateTransactionDate(transaction._id, { date: dateVal });
            toast.success('Transaction date updated and running balances recalculated successfully!', { id: toastId });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update transaction date:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update transaction date', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                className="w-full max-w-md rounded-2xl border p-6 space-y-6 shadow-2xl animate-scale-up"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#C8E600]/15 flex items-center justify-center border border-[#C8E600]/30">
                            <Calendar className="text-[#C8E600]" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                Edit Transaction Date
                            </h3>
                            <p className="text-xs opacity-60">Update date and recalculate running balances</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors opacity-70 hover:opacity-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Form */}
                <form onSubmit={handleSave} className="space-y-5">
                    {/* Current Timestamp Display */}
                    <div className="p-3.5 rounded-xl border bg-white/5 space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                            <Clock size={12} className="text-[#C8E600]" /> Current Date & Time
                        </div>
                        <div className="text-sm font-semibold text-white">
                            {originalFormattedFull}
                        </div>
                        <div className="text-[11px] text-white/50">
                            Time component ({originalFormattedTime}) will remain unchanged.
                        </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center justify-between">
                            <span>New Transaction Date</span>
                            <span className="text-[10px] text-amber-400 font-normal">Min: 2026-06-16</span>
                        </label>
                        <input
                            type="date"
                            min="2026-06-16"
                            value={dateVal}
                            onChange={(e) => setDateVal(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border font-mono text-sm outline-none transition-all focus:ring-2 focus:ring-[#C8E600]/50"
                            style={{ 
                                background: 'var(--bg-topbar, rgba(255,255,255,0.05))', 
                                borderColor: 'var(--border-main)', 
                                color: 'var(--text-main)' 
                            }}
                        />
                    </div>

                    {/* Recalculation Notice */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                        <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
                        <div>
                            <strong>Running Balance Recalculation:</strong> Changing the date will automatically re-order transactions chronologically and recalculate running balances for all affected bank accounts.
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !dateVal}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                                saving || !dateVal
                                    ? 'bg-[#C8E600]/40 text-black/50 cursor-not-allowed'
                                    : 'bg-[#C8E600] hover:bg-[#b8d400] text-black shadow-lg shadow-[#C8E600]/20 hover:scale-[1.02] cursor-pointer'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Recalculating...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>Save Date</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionDateEditModal;
