import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateTransactionDescription } from '../../../../services/bankAccountService';

interface TransactionDescriptionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction: any;
}

const CUTOFF_DATE_STR = '2026-06-15';

export const TransactionDescriptionEditModal: React.FC<TransactionDescriptionEditModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    transaction
}) => {
    const [descriptionVal, setDescriptionVal] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && transaction) {
            setDescriptionVal(transaction.description || '');
        }
    }, [isOpen, transaction]);

    if (!isOpen || !transaction) return null;

    // Check cutoff
    const rawDate = transaction.entryDate || transaction.date || transaction.createdAt;
    let isCutoff = false;
    if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            isCutoff = `${y}-${m}-${day}` <= CUTOFF_DATE_STR;
        }
    }

    const originalDesc = transaction.description || 'N/A';
    const hasChanged = descriptionVal.trim() !== (transaction.description || '').trim();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = descriptionVal.trim();

        if (!trimmed) {
            toast.error('Please enter a valid description');
            return;
        }

        if (isCutoff) {
            toast.error(`Transactions on or before ${CUTOFF_DATE_STR} cannot be modified`);
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Updating transaction description across connected records...');

        try {
            await updateTransactionDescription(transaction._id, { description: trimmed });
            toast.success('Transaction description updated successfully!', { id: toastId });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update transaction description:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update transaction description', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl animate-scale-up"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#C8E600]/15 flex items-center justify-center border border-[#C8E600]/30">
                            <FileText className="text-[#C8E600]" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                                Edit Description
                            </h3>
                            <p className="text-xs opacity-60">Update narration across connected journals & ledger legs</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors opacity-70 hover:opacity-100 cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Form */}
                <form onSubmit={handleSave} className="space-y-5">
                    {/* Current Description Preview */}
                    <div className="p-3.5 rounded-xl border bg-white/5 space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                            Current Description
                        </div>
                        <div className="text-sm font-medium text-white/90 break-words line-clamp-3">
                            {originalDesc}
                        </div>
                    </div>

                    {/* Description Textarea Input */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                                New Description
                            </label>
                            <span className="text-[11px] font-mono opacity-50">
                                {descriptionVal.length} chars
                            </span>
                        </div>
                        <textarea
                            rows={4}
                            value={descriptionVal}
                            onChange={(e) => setDescriptionVal(e.target.value)}
                            placeholder="Enter detailed transaction description / narration..."
                            required
                            disabled={saving || isCutoff}
                            className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-[#C8E600]/50 resize-y min-h-[100px]"
                            style={{ 
                                background: 'var(--bg-topbar, rgba(255,255,255,0.05))', 
                                borderColor: 'var(--border-main)', 
                                color: 'var(--text-main)' 
                            }}
                        />
                    </div>

                    {/* Information Notice */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs leading-relaxed">
                        <Info size={16} className="mt-0.5 shrink-0 text-blue-400" />
                        <div>
                            <strong>Multi-Leg Sync:</strong> Updating this description synchronizes all connected double-entry ledger legs, manual journals, and bank records. Monetary balances and dates remain untouched.
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-white/5 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !descriptionVal.trim() || !hasChanged || isCutoff}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                                saving || !descriptionVal.trim() || !hasChanged || isCutoff
                                    ? 'bg-[#C8E600]/40 text-black/50 cursor-not-allowed'
                                    : 'bg-[#C8E600] hover:bg-[#b8d400] text-black shadow-lg shadow-[#C8E600]/20 hover:scale-[1.02] cursor-pointer'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>Save Description</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionDescriptionEditModal;
