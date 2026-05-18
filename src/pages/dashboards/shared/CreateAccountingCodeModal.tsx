import { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { createAccountingCode, type CreateAccountingCodePayload, type AccountingCode } from '../../../services/accountingService';

interface CreateAccountingCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newCode: AccountingCode) => void;
}

const CreateAccountingCodeModal = ({ isOpen, onClose, onSuccess }: CreateAccountingCodeModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateAccountingCodePayload>({
        code: '',
        name: '',
        category: 'EXPENSE'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await createAccountingCode(formData);
            onSuccess(result);
            onClose();
            // Reset form
            setFormData({ code: '', name: '', category: 'EXPENSE' });
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create accounting code');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div 
                className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                    <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Add Accounting Code</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                        <X size={20} style={{ color: 'var(--text-main)' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs font-bold">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Category</label>
                        <select
                            required
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-4 py-2.5 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600]"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="EXPENSE">Expense</option>
                            <option value="ASSET">Asset</option>
                            <option value="LIABILITY">Liability</option>
                            <option value="INCOME">Income</option>
                            <option value="EQUITY">Equity</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Code (e.g. 5010)</label>
                        <input
                            required
                            type="text"
                            placeholder="Account Code"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600]"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Account Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. Vehicle Repairs"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600]"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl font-bold border text-xs transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl font-bold shadow-xl text-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#111' }}
                        >
                            {loading ? 'Saving...' : <><Save size={14} className="inline mr-2" /> Save Account</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateAccountingCodeModal;
