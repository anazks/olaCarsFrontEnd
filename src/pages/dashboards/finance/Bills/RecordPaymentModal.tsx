import { useState, useEffect } from 'react';
import { X, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import * as billService from '../../../../services/billService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import type { Bill } from '../../../../services/billService';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    bill: Bill;
}

const RecordPaymentModal = ({ isOpen, onClose, onSuccess, bill }: RecordPaymentModalProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);

    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const [paymentData, setPaymentData] = useState({
        totalAmount: bill.balanceDue,
        paymentMethod: 'BANK_TRANSFER',
        accountingCode: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (isOpen) {
            fetchCodes();
            setPaymentData(prev => ({ ...prev, totalAmount: bill.balanceDue }));
        }
    }, [isOpen, bill.balanceDue]);

    const fetchCodes = async () => {
        try {
            const codes = await getAllAccountingCodes();
            // Filter for Bank/Cash accounts if possible, or show all
            setAccountingCodes(codes.filter(c => c.category === 'ASSET' || c.category === 'EQUITY'));
        } catch (err) {
            console.error('Failed to fetch accounting codes', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData.accountingCode) {
            setError('Please select a payment account');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await billService.recordBillPayment(bill._id, {
                ...paymentData,
                status: 'COMPLETED' // For now, assume instant completion for record payment
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Payment failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div 
                className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="px-8 py-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Record Payment</h2>
                            <p className="text-[10px] uppercase font-bold opacity-50" style={{ color: 'var(--text-main)' }}>Bill: {bill.billNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all opacity-50 hover:opacity-100">
                        <X size={20} style={{ color: 'var(--text-main)' }} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm font-bold">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Payment Date</label>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" style={{ color: 'var(--text-main)' }} />
                                <input
                                    type="date"
                                    required
                                    value={paymentData.paymentDate}
                                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600]"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Amount Paid</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                max={bill.balanceDue}
                                value={paymentData.totalAmount}
                                onChange={(e) => setPaymentData({ ...paymentData, totalAmount: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-[#C8E600]"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Payment Method</label>
                        <select
                            required
                            value={paymentData.paymentMethod}
                            onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600]"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CASH">Cash</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="CHEQUE">Cheque</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Deposit To (Account)</label>
                        <SearchableSelect
                            options={accountingCodes.map(code => ({
                                value: code._id,
                                label: `${code.code} - ${code.name}`
                            }))}
                            value={paymentData.accountingCode}
                            onChange={(val) => setPaymentData({ ...paymentData, accountingCode: val })}
                            placeholder="Select Account"
                            onAddNew={() => setIsAddAccountOpen(true)}
                            addNewText="Add New Account"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Notes</label>
                        <textarea
                            value={paymentData.notes}
                            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                            placeholder="Optional payment notes..."
                            className="w-full px-4 py-3 rounded-xl outline-none text-xs transition-all focus:ring-2 focus:ring-[#C8E600] min-h-[80px] resize-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-2xl font-bold border transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 rounded-2xl font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#111' }}
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" /> : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>

            <QuickAddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                defaultCategory="ASSET"
                onSuccess={async (newAcc) => {
                    try {
                        const codes = await getAllAccountingCodes();
                        setAccountingCodes(codes.filter(c => c.category === 'ASSET' || c.category === 'EQUITY'));
                        setPaymentData(prev => ({ ...prev, accountingCode: newAcc._id }));
                    } catch (err) {
                        console.error('Failed to reload accounts', err);
                    }
                }}
            />
        </div>
    );
};

export default RecordPaymentModal;
