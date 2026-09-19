import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Calendar, FileText, Tag, AlertCircle } from 'lucide-react';
import { updateBill, type Bill } from '../../../../services/billService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import { getAllTaxes, type Tax } from '../../../../services/taxService';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';

interface LineItem {
    itemName: string;
    description: string;
    quantity: string;
    unitPrice: string;
    accountId: string;
}

interface Props {
    isOpen: boolean;
    bill: Bill | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditBillModal = ({ isOpen, bill, onClose, onSuccess }: Props) => {
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);

    const [billNumber, setBillNumber] = useState<string>('');
    const [billDate, setBillDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedTaxId, setSelectedTaxId] = useState<string>('');
    const [isInclusiveTax, setIsInclusiveTax] = useState<boolean>(false);

    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Quick Add Modal States
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [activeLineItemIndex, setActiveLineItemIndex] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [codesRes, taxRes] = await Promise.all([
                getAllAccountingCodes(),
                getAllTaxes()
            ]);
            setAccountingCodes(codesRes || []);
            setTaxes(Array.isArray(taxRes) ? taxRes : []);
        } catch (err) {
            console.error('Failed to load accounts/taxes', err);
        }
    }, []);

    useEffect(() => {
        if (isOpen && bill) {
            fetchData();
            setBillNumber(bill.billNumber || '');
            setBillDate(bill.billDate ? new Date(bill.billDate).toISOString().split('T')[0] : '');
            setDueDate(bill.dueDate ? new Date(bill.dueDate).toISOString().split('T')[0] : '');
            setNotes(bill.notes || '');
            setSelectedTaxId(bill.taxId ? (typeof bill.taxId === 'object' ? bill.taxId._id : bill.taxId) : '');
            setIsInclusiveTax(!!bill.isInclusiveTax);

            const items: LineItem[] = (bill.items || []).map((it) => ({
                itemName: it.itemName || '',
                description: it.description || '',
                quantity: String(it.quantity || 1),
                unitPrice: String(it.unitPrice || 0),
                accountId: typeof it.accountId === 'object' ? (it.accountId as any)._id : it.accountId
            }));
            setLineItems(items.length > 0 ? items : [{ itemName: '', description: '', quantity: '1', unitPrice: '', accountId: '' }]);
        }
    }, [isOpen, bill, fetchData]);

    if (!isOpen || !bill) return null;

    const handleItemChange = (index: number, field: keyof LineItem, value: string) => {
        const next = [...lineItems];
        next[index] = { ...next[index], [field]: value };
        setLineItems(next);
    };

    const addItem = () => {
        setLineItems([...lineItems, { itemName: '', description: '', quantity: '1', unitPrice: '', accountId: '' }]);
    };

    const removeItem = (index: number) => {
        if (lineItems.length <= 1) return;
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    // Calculate Subtotal & Tax
    const subtotal = lineItems.reduce((acc, item) => {
        const q = parseFloat(item.quantity) || 0;
        const p = parseFloat(item.unitPrice) || 0;
        return acc + q * p;
    }, 0);

    const selectedTax = taxes.find((t) => t._id === selectedTaxId);
    const taxRate = selectedTax ? selectedTax.rate : bill.taxPercentage || 0;

    let taxAmount = 0;
    let grandTotal = subtotal;

    if (taxRate > 0) {
        if (isInclusiveTax) {
            grandTotal = subtotal;
            taxAmount = Math.round(grandTotal * (taxRate / (100 + taxRate)) * 100) / 100;
        } else {
            taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
            grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;
        }
    }

    const amountPaid = Number(bill.amountPaid) || 0;
    const isAmountBelowPaid = grandTotal < amountPaid;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!billNumber.trim()) {
            toast.error('Bill Number is required');
            return;
        }
        for (let i = 0; i < lineItems.length; i++) {
            const it = lineItems[i];
            if (!it.itemName.trim()) {
                toast.error(`Item #${i + 1} name is required`);
                return;
            }
            if (!it.accountId) {
                toast.error(`Please select an account for item: ${it.itemName || '#' + (i + 1)}`);
                return;
            }
            if (parseFloat(it.quantity) <= 0 || parseFloat(it.unitPrice) < 0) {
                toast.error(`Invalid quantity or price on item: ${it.itemName}`);
                return;
            }
        }

        if (isAmountBelowPaid) {
            toast.error(`Total amount cannot be less than already paid amount of $${amountPaid.toLocaleString()}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                billNumber: billNumber.trim(),
                billDate,
                dueDate,
                notes,
                isInclusiveTax,
                taxId: selectedTaxId || undefined,
                items: lineItems.map((it) => ({
                    itemName: it.itemName.trim(),
                    description: it.description?.trim() || '',
                    quantity: parseFloat(it.quantity) || 1,
                    unitPrice: parseFloat(it.unitPrice) || 0,
                    accountId: it.accountId
                }))
            };

            await updateBill(bill._id, payload);
            toast.success('Bill updated successfully');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to update bill');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div
                className="w-full max-w-4xl rounded-3xl border p-6 space-y-6 shadow-2xl relative my-8"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div>
                        <h2 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>
                            Edit Bill
                        </h2>
                        <p className="text-xs text-dim">
                            Update bill details, amounts, and account allocations.
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-all text-dim hover:text-white cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-dim mb-1">Bill Number / ID *</label>
                            <input
                                type="text"
                                value={billNumber}
                                onChange={(e) => setBillNumber(e.target.value)}
                                className="w-full p-3 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dim mb-1">Bill Date</label>
                            <input
                                type="date"
                                value={billDate}
                                onChange={(e) => setBillDate(e.target.value)}
                                className="w-full p-3 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-dim mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full p-3 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                            />
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-dim">Line Items</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-bold text-[#C8E600] hover:underline cursor-pointer"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-dim">
                                        <th className="py-2 px-2">Item Name *</th>
                                        <th className="py-2 px-2">Expense / Asset Account *</th>
                                        <th className="py-2 px-2 w-20 text-right">Qty</th>
                                        <th className="py-2 px-2 w-28 text-right">Unit Price ($)</th>
                                        <th className="py-2 px-2 w-28 text-right">Total ($)</th>
                                        <th className="py-2 px-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((item, idx) => {
                                        const total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                                        return (
                                            <tr key={idx} className="border-b border-white/5">
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="text"
                                                        value={item.itemName}
                                                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                                        placeholder="Item name"
                                                        className="w-full p-2 rounded-lg border bg-black/40 text-white border-white/10 text-xs focus:border-[#C8E600] outline-none"
                                                        required
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <SearchableSelect
                                                        options={accountingCodes.map((c) => ({
                                                            value: c._id,
                                                            label: `${c.code} - ${c.name}`,
                                                            subLabel: c.category || c.accountType
                                                        }))}
                                                        value={item.accountId}
                                                        onChange={(val) => handleItemChange(idx, 'accountId', val)}
                                                        placeholder="Select account"
                                                        onAddNew={() => {
                                                            setActiveLineItemIndex(idx);
                                                            setIsAddAccountOpen(true);
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="any"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                        className="w-full p-2 rounded-lg border bg-black/40 text-white border-white/10 text-xs text-right focus:border-[#C8E600] outline-none"
                                                    />
                                                </td>
                                                <td className="py-2 px-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full p-2 rounded-lg border bg-black/40 text-white border-white/10 text-xs text-right focus:border-[#C8E600] outline-none"
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-right font-bold text-white">
                                                    ${total.toFixed(2)}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    {lineItems.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tax & Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-dim mb-1">Applicable Tax</label>
                                <select
                                    value={selectedTaxId}
                                    onChange={(e) => setSelectedTaxId(e.target.value)}
                                    className="w-full p-3 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                                >
                                    <option value="">No Tax (0%)</option>
                                    {taxes.map((t) => (
                                        <option key={t._id} value={t._id}>
                                            {t.name} ({t.rate}%)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedTaxId && (
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                                    <input
                                        type="checkbox"
                                        checked={isInclusiveTax}
                                        onChange={(e) => setIsInclusiveTax(e.target.checked)}
                                        className="accent-[#C8E600]"
                                    />
                                    Tax is included in line item prices
                                </label>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-dim mb-1">Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Add any internal notes..."
                                    className="w-full p-3 rounded-xl border text-xs bg-black/40 text-white border-white/20 focus:border-[#C8E600] outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                            <div className="flex justify-between text-xs text-dim">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {taxRate > 0 && (
                                <div className="flex justify-between text-xs text-dim">
                                    <span>Tax ({taxRate}%{isInclusiveTax ? ' Inclusive' : ''})</span>
                                    <span>${taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-white/10">
                                <span>Grand Total</span>
                                <span className="text-[#C8E600]">${grandTotal.toFixed(2)}</span>
                            </div>

                            {amountPaid > 0 && (
                                <div className="space-y-1 pt-2 border-t border-white/10 text-xs">
                                    <div className="flex justify-between text-dim">
                                        <span>Amount Already Paid</span>
                                        <span className="text-emerald-400 font-bold">${amountPaid.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-dim">
                                        <span>New Balance Due</span>
                                        <span className="font-bold text-white">${Math.max(0, grandTotal - amountPaid).toFixed(2)}</span>
                                    </div>
                                    {isAmountBelowPaid && (
                                        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2 mt-2">
                                            <AlertCircle size={16} />
                                            <span>Total cannot be less than already paid ($${amountPaid})</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl border font-bold text-xs hover:bg-white/5 transition-all text-dim cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || isAmountBelowPaid}
                            className="px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: '#C8E600', color: '#111' }}
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Quick Add Account Modal */}
            <QuickAddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                onSuccess={(newAccount) => {
                    setAccountingCodes((prev) => [...prev, newAccount]);
                    if (activeLineItemIndex !== null) {
                        handleItemChange(activeLineItemIndex, 'accountId', newAccount._id);
                    }
                    setIsAddAccountOpen(false);
                }}
            />
        </div>
    );
};

export default EditBillModal;
