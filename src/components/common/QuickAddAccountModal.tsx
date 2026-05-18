import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../Modal';
import { createAccountingCode, type AccountingCode, type AccountingCategory } from '../../services/accountingService';
import toast from 'react-hot-toast';

interface QuickAddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newAccount: AccountingCode) => void;
    defaultCategory?: AccountingCategory;
}

export const QuickAddAccountModal = ({
    isOpen,
    onClose,
    onSuccess,
    defaultCategory = 'EXPENSE'
}: QuickAddAccountModalProps) => {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: defaultCategory
    });

    // Synchronize and reset form state when the modal opens or category changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                code: '',
                name: '',
                category: defaultCategory
            });
        }
    }, [isOpen, defaultCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim()) {
            toast.error('Account code is required');
            return;
        }
        if (!formData.name.trim()) {
            toast.error('Account name is required');
            return;
        }

        setSubmitting(true);
        try {
            const result = await createAccountingCode({
                code: formData.code.trim(),
                name: formData.name.trim(),
                category: formData.category as AccountingCategory
            });
            toast.success(`Account ${formData.code} - "${formData.name}" created successfully!`);
            
            const finalAccount = (result as any).data || result;
            onSuccess(finalAccount);
            
            // Reset form
            setFormData({
                code: '',
                name: '',
                category: defaultCategory
            });
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create accounting code');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Accounting Code">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-3 gap-4">
                    {/* Account Code */}
                    <div className="col-span-1 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Code *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 6150"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Account Name */}
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Account Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Office Supplies"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                {/* Account Category */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                        Category *
                    </label>
                    <select
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value as AccountingCategory })}
                        className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime cursor-pointer appearance-none"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="EXPENSE" style={{ background: 'var(--bg-card)' }}>EXPENSE (Debit)</option>
                        <option value="ASSET" style={{ background: 'var(--bg-card)' }}>ASSET (Debit)</option>
                        <option value="LIABILITY" style={{ background: 'var(--bg-card)' }}>LIABILITY (Credit)</option>
                        <option value="INCOME" style={{ background: 'var(--bg-card)' }}>INCOME (Credit)</option>
                        <option value="EQUITY" style={{ background: 'var(--bg-card)' }}>EQUITY (Credit)</option>
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-5 py-2.5 rounded-xl font-black text-black bg-brand-lime flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <Plus size={14} strokeWidth={3} />
                        {submitting ? 'Creating...' : 'Create Account'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddAccountModal;
