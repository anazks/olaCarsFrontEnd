import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, AlertCircle, Calculator } from 'lucide-react';
import { updateInvoice, type Invoice } from '../../../services/invoiceService';
import { getAllTaxes, type Tax } from '../../../services/taxService';
import toast from 'react-hot-toast';

interface LineItemState {
    itemName: string;
    description: string;
    qty: string;
    unitPrice: string;
    taxRate: string;
}

interface Props {
    isOpen: boolean;
    invoice: Invoice | null;
    onClose: () => void;
    onSuccess: () => void;
}

export const EditInvoiceModal: React.FC<Props> = ({ isOpen, invoice, onClose, onSuccess }) => {
    const [taxes, setTaxes] = useState<Tax[]>([]);

    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [weekLabel, setWeekLabel] = useState('');
    const [notes, setNotes] = useState('');

    // Rental / Standard Amount State
    const [baseAmount, setBaseAmount] = useState<string>('0');
    const [selectedTaxId, setSelectedTaxId] = useState<string>('');
    const [customTaxRate, setCustomTaxRate] = useState<string>('0');
    const [isTaxInclusive, setIsTaxInclusive] = useState<boolean>(false);

    // Line items for MANUAL invoices
    const [lineItems, setLineItems] = useState<LineItemState[]>([]);

    const [submitting, setSubmitting] = useState(false);

    const isManual = invoice?.invoiceType === 'MANUAL' || (invoice?.lineItems && invoice.lineItems.length > 0);

    const fetchTaxes = useCallback(async () => {
        try {
            const taxRes: any = await getAllTaxes();
            const list = Array.isArray(taxRes) ? taxRes : (taxRes?.data || []);
            setTaxes(list);
        } catch (err) {
            console.error('Failed to load taxes', err);
        }
    }, []);

    useEffect(() => {
        if (isOpen && invoice) {
            fetchTaxes();
            setInvoiceNumber(invoice.invoiceNumber || '');
            setInvoiceDate(invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : (invoice.generatedAt ? new Date(invoice.generatedAt).toISOString().split('T')[0] : ''));
            setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
            setWeekLabel(invoice.weekLabel || '');
            setNotes((invoice as any).notes || '');
            setBaseAmount(String(invoice.baseAmount ?? 0));
            setCustomTaxRate(String(invoice.taxRate ?? 0));
            setIsTaxInclusive(!!(invoice as any).isTaxInclusive);

            const taxIdVal = (invoice as any).tax ? (typeof (invoice as any).tax === 'object' ? (invoice as any).tax._id : (invoice as any).tax) : '';
            setSelectedTaxId(taxIdVal);

            if (invoice.lineItems && invoice.lineItems.length > 0) {
                setLineItems(
                    invoice.lineItems.map((item: any) => ({
                        itemName: item.name || item.itemName || item.description || '',
                        description: item.description || '',
                        qty: String(item.qty || item.quantity || 1),
                        unitPrice: String(item.unitPrice || 0),
                        taxRate: String(item.taxRate || 0)
                    }))
                );
            } else {
                setLineItems([
                    { itemName: '', description: '', qty: '1', unitPrice: '0', taxRate: '0' }
                ]);
            }
        }
    }, [isOpen, invoice, fetchTaxes]);

    if (!isOpen || !invoice) return null;

    // Calculations
    const amountPaid = Number(invoice.amountPaid) || 0;
    const carryOver = Number(invoice.carryOverAmount) || 0;

    let computedSubtotal = 0;
    let computedTaxAmount = 0;
    let computedTotalDue = 0;

    const activeTaxRate = selectedTaxId
        ? (taxes.find((t) => t._id === selectedTaxId)?.rate ?? Number(customTaxRate) ?? 0)
        : Number(customTaxRate) || 0;

    if (isManual) {
        computedSubtotal = lineItems.reduce((acc, item) => {
            const q = parseFloat(item.qty) || 0;
            const p = parseFloat(item.unitPrice) || 0;
            return acc + q * p;
        }, 0);

        if (activeTaxRate > 0) {
            if (isTaxInclusive) {
                computedTaxAmount = Math.round((computedSubtotal * (activeTaxRate / (100 + activeTaxRate))) * 100) / 100;
                computedTotalDue = computedSubtotal;
            } else {
                computedTaxAmount = Math.round((computedSubtotal * (activeTaxRate / 100)) * 100) / 100;
                computedTotalDue = Math.round((computedSubtotal + computedTaxAmount) * 100) / 100;
            }
        } else {
            computedTotalDue = computedSubtotal;
        }
    } else {
        const numBase = parseFloat(baseAmount) || 0;
        computedSubtotal = numBase;
        if (activeTaxRate > 0) {
            if (isTaxInclusive) {
                computedTotalDue = numBase;
                computedTaxAmount = Math.round((numBase * (activeTaxRate / (100 + activeTaxRate))) * 100) / 100;
            } else {
                computedTaxAmount = Math.round((numBase * (activeTaxRate / 100)) * 100) / 100;
                computedTotalDue = Math.round((numBase + computedTaxAmount) * 100) / 100;
            }
        } else {
            computedTotalDue = numBase;
        }
        computedTotalDue = Math.round((computedTotalDue + carryOver) * 100) / 100;
    }

    const computedBalance = Math.max(0, Math.round((computedTotalDue - amountPaid) * 100) / 100);
    const isUnderpaid = computedTotalDue < amountPaid - 0.009;

    const handleLineItemChange = (index: number, field: keyof LineItemState, val: string) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: val };
        setLineItems(updated);
    };

    const addLineItem = () => {
        setLineItems([...lineItems, { itemName: '', description: '', qty: '1', unitPrice: '0', taxRate: String(activeTaxRate) }]);
    };

    const removeLineItem = (index: number) => {
        if (lineItems.length === 1) {
            setLineItems([{ itemName: '', description: '', qty: '1', unitPrice: '0', taxRate: '0' }]);
            return;
        }
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUnderpaid) {
            toast.error(`Total amount due ($${computedTotalDue.toFixed(2)}) cannot be less than already settled payments ($${amountPaid.toFixed(2)}).`);
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                invoiceNumber: invoiceNumber.trim(),
                invoiceDate: invoiceDate || undefined,
                dueDate: dueDate || undefined,
                notes: notes.trim(),
                taxRate: activeTaxRate,
                isTaxInclusive
            };

            if (selectedTaxId) payload.tax = selectedTaxId;

            if (isManual) {
                payload.lineItems = lineItems.map((it) => {
                    const itemNameResolved = it.itemName.trim() || it.description.trim() || 'Item';
                    return {
                        name: itemNameResolved,
                        itemName: itemNameResolved,
                        description: it.description.trim(),
                        qty: parseFloat(it.qty) || 1,
                        unitPrice: parseFloat(it.unitPrice) || 0,
                        taxRate: activeTaxRate
                    };
                });
            } else {
                payload.baseAmount = parseFloat(baseAmount) || 0;
                payload.weekLabel = weekLabel.trim();
            }

            await updateInvoice(invoice._id, payload);
            toast.success(`Invoice ${invoiceNumber} updated successfully`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to update invoice');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div
                className="w-full max-w-2xl rounded-3xl border p-6 space-y-6 shadow-2xl relative my-8"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div>
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            Edit Invoice
                        </h2>
                        <p className="text-xs text-dim">
                            {invoice.invoiceNumber} • {invoice.invoiceType || 'RENTAL'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 transition-all text-dim hover:text-white cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                required
                                className="w-full p-2.5 rounded-xl border text-xs bg-white/5 border-white/10 text-white font-mono font-bold focus:border-[#C8E600] outline-none"
                            />
                        </div>

                        {!isManual && (
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                    Cycle / Week Label
                                </label>
                                <input
                                    type="text"
                                    value={weekLabel}
                                    onChange={(e) => setWeekLabel(e.target.value)}
                                    placeholder="e.g. Cycle 24"
                                    className="w-full p-2.5 rounded-xl border text-xs bg-white/5 border-white/10 text-white focus:border-[#C8E600] outline-none"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full p-2.5 rounded-xl border text-xs bg-white/5 border-white/10 text-white focus:border-[#C8E600] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                Due Date
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full p-2.5 rounded-xl border text-xs bg-white/5 border-white/10 text-white focus:border-[#C8E600] outline-none"
                            />
                        </div>
                    </div>

                    {/* Tax configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                Tax Configuration
                            </label>
                            <select
                                value={selectedTaxId}
                                onChange={(e) => {
                                    setSelectedTaxId(e.target.value);
                                    const found = taxes.find((t) => t._id === e.target.value);
                                    if (found) setCustomTaxRate(String(found.rate));
                                }}
                                className="w-full p-2.5 rounded-xl border text-xs bg-black/40 border-white/10 text-white focus:border-[#C8E600] outline-none"
                            >
                                <option value="">No Tax / Custom (0%)</option>
                                {taxes.map((tax) => (
                                    <option key={tax._id} value={tax._id}>
                                        {tax.name} ({tax.rate}%)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isTaxInclusive}
                                    onChange={(e) => setIsTaxInclusive(e.target.checked)}
                                    className="accent-[#C8E600] w-4 h-4 rounded"
                                />
                                <span className="text-xs font-bold text-white">Tax Inclusive Pricing</span>
                            </label>
                        </div>
                    </div>

                    {/* Line Items for Manual Invoice */}
                    {isManual ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-dim">Line Items</span>
                                <button
                                    type="button"
                                    onClick={addLineItem}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#C8E600] text-[#C8E600] font-bold text-xs cursor-pointer"
                                >
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-2">
                                {lineItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 items-center">
                                        <input
                                            type="text"
                                            placeholder="Item name / description"
                                            value={item.itemName}
                                            onChange={(e) => handleLineItemChange(idx, 'itemName', e.target.value)}
                                            required
                                            className="flex-1 w-full p-2 rounded-xl border text-xs bg-white/5 border-white/10 text-white outline-none focus:border-[#C8E600]"
                                        />
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                min="1"
                                                value={item.qty}
                                                onChange={(e) => handleLineItemChange(idx, 'qty', e.target.value)}
                                                className="w-16 p-2 rounded-xl border text-xs bg-white/5 border-white/10 text-white text-center outline-none focus:border-[#C8E600]"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                step="0.01"
                                                min="0"
                                                value={item.unitPrice}
                                                onChange={(e) => handleLineItemChange(idx, 'unitPrice', e.target.value)}
                                                className="w-24 p-2 rounded-xl border text-xs bg-white/5 border-white/10 text-white text-right outline-none focus:border-[#C8E600]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeLineItem(idx)}
                                                className="p-2 text-dim hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Rental Base Amount Input */
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                                Base Rental Amount ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={baseAmount}
                                onChange={(e) => setBaseAmount(e.target.value)}
                                required
                                className="w-full p-3 rounded-xl border text-base bg-white/5 border-white/10 text-white font-mono font-bold focus:border-[#C8E600] outline-none"
                            />
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider block mb-1 text-dim">
                            Notes / Remarks
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes or memos..."
                            className="w-full p-2.5 rounded-xl border text-xs bg-white/5 border-white/10 text-white focus:border-[#C8E600] outline-none"
                        />
                    </div>

                    {/* Summary Calculation Card */}
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-dim mb-2">
                            <Calculator size={14} /> Live Statement Calculations
                        </div>

                        <div className="flex justify-between text-xs text-dim">
                            <span>Subtotal:</span>
                            <span className="font-mono text-white">${computedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {activeTaxRate > 0 && (
                            <div className="flex justify-between text-xs text-dim">
                                <span>Tax ({activeTaxRate}%{isTaxInclusive ? ' incl.' : ''}):</span>
                                <span className="font-mono text-white">${computedTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        {carryOver > 0 && (
                            <div className="flex justify-between text-xs text-amber-400">
                                <span>Overdue Carry-over:</span>
                                <span className="font-mono">${carryOver.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm font-black border-t border-white/10 pt-2" style={{ color: 'var(--text-main)' }}>
                            <span>New Total Due:</span>
                            <span className="font-mono text-[#C8E600]">${computedTotalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-xs text-emerald-400">
                            <span>Settled Payments:</span>
                            <span className="font-mono">-${amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex justify-between text-sm font-black border-t border-white/10 pt-2">
                            <span style={{ color: 'var(--text-main)' }}>Remaining Balance:</span>
                            <span className={`font-mono ${computedBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                ${computedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {isUnderpaid && (
                            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 text-xs">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>
                                    Total due cannot be less than already recorded payments ($${amountPaid.toFixed(2)}).
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
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
                            disabled={submitting || isUnderpaid}
                            className="px-6 py-2.5 rounded-xl bg-[#C8E600] text-black font-black text-xs hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-lg cursor-pointer"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditInvoiceModal;
