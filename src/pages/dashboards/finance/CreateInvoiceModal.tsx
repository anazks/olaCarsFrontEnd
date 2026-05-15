import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, DollarSign, Calendar, User, FileText, Tag, Percent } from 'lucide-react';
import { createInvoice } from '../../../services/invoiceService';
import { getAllDrivers } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import toast from 'react-hot-toast';

interface LineItem {
    name: string;
    description: string;
    qty: string;
    unitPrice: string;
}

const defaultItem = (): LineItem => ({ name: '', description: '', qty: '1', unitPrice: '' });

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

const CreateInvoiceModal = ({ onClose, onSuccess }: Props) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [driverSearch, setDriverSearch] = useState('');
    const [showDriverList, setShowDriverList] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [weekLabel, setWeekLabel] = useState('');
    const [notes, setNotes] = useState('');

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { name: 'Weekly Vehicle Rent Lease Payment', description: 'Base period rate assessment for billing cycle', qty: '1', unitPrice: '' }
    ]);

    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
    const [discountValue, setDiscountValue] = useState('');
    const [taxRate, setTaxRate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchDrivers = useCallback(async () => {
        try {
            const res = await getAllDrivers({ status: 'ACTIVE', limit: 200 });
            setDrivers(res.data || (res as any).drivers || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    const filteredDrivers = drivers.filter(d =>
        d.personalInfo?.fullName?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.driverId?.toLowerCase().includes(driverSearch.toLowerCase())
    );

    // ── Calculations ──────────────────────────────────────────────────────────
    const subtotal = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);

    const discountAmount = (() => {
        if (discountType === 'NONE' || !discountValue) return 0;
        const val = parseFloat(discountValue) || 0;
        if (discountType === 'PERCENTAGE') return Math.min(subtotal * val / 100, subtotal);
        return Math.min(val, subtotal);
    })();

    const afterDiscount = subtotal - discountAmount;
    const taxAmount = taxRate ? Math.round(afterDiscount * (parseFloat(taxRate) || 0) / 100 * 100) / 100 : 0;
    const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;

    // ── Line Item Helpers ─────────────────────────────────────────────────────
    const updateItem = (idx: number, field: keyof LineItem, val: string) => {
        setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };
    const addItem = () => setLineItems(prev => [...prev, defaultItem()]);
    const removeItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriver) { toast.error('Please select a driver'); return; }
        if (!dueDate) { toast.error('Due date is required'); return; }
        const validItems = lineItems.filter(i => i.name.trim() && parseFloat(i.unitPrice) > 0);
        if (validItems.length === 0) { toast.error('Add at least one valid line item with a price'); return; }

        setSubmitting(true);
        try {
            await createInvoice({
                driver: selectedDriver._id,
                invoiceDate,
                dueDate,
                weekLabel: weekLabel || undefined,
                lineItems: validItems.map(i => ({
                    name: i.name,
                    description: i.description,
                    qty: parseFloat(i.qty) || 1,
                    unitPrice: parseFloat(i.unitPrice) || 0,
                })),
                discountType: discountType === 'NONE' ? 'PERCENTAGE' : discountType,
                discountValue: discountType !== 'NONE' ? parseFloat(discountValue) || 0 : 0,
                taxRate: parseFloat(taxRate) || 0,
                notes,
            });
            toast.success('Manual invoice created!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[92vh] flex flex-col border rounded-[2rem] shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
                            <FileText size={17} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--text-main)' }}>New Invoice</h2>
                            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Manual Driver Invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-8">

                        {/* Top Meta Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Driver Selector */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <User size={11} /> Bill To / Driver
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search driver by name or ID..."
                                        value={selectedDriver ? `${selectedDriver.personalInfo?.fullName} (${selectedDriver.driverId})` : driverSearch}
                                        onChange={e => { setDriverSearch(e.target.value); setSelectedDriver(null); setShowDriverList(true); }}
                                        onFocus={() => setShowDriverList(true)}
                                        className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                    {showDriverList && filteredDrivers.length > 0 && !selectedDriver && (
                                        <div className="absolute z-50 w-full mt-1 border rounded-2xl shadow-2xl max-h-52 overflow-auto custom-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {filteredDrivers.slice(0, 15).map(d => (
                                                <button
                                                    type="button"
                                                    key={d._id}
                                                    onMouseDown={() => { setSelectedDriver(d); setDriverSearch(''); setShowDriverList(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-black" style={{ color: 'var(--brand-lime)' }}>
                                                            {d.personalInfo?.fullName?.slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{d.personalInfo?.fullName}</p>
                                                        <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>{d.driverId}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedDriver && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border" style={{ background: 'var(--bg-input)', color: 'var(--brand-lime)', borderColor: 'var(--border-main)' }}>
                                            ✓ {selectedDriver.personalInfo?.fullName} · {selectedDriver.driverId}
                                        </span>
                                        <button type="button" onClick={() => { setSelectedDriver(null); setDriverSearch(''); }} className="text-[10px] font-black text-rose-400 hover:text-rose-300">✕ Change</button>
                                    </div>
                                )}
                            </div>

                            {/* Invoice Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} /> Invoice Date</label>
                                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                            </div>

                            {/* Due Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} /> Due Date <span className="text-rose-400">*</span></label>
                                <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none focus:border-brand-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                            </div>

                            {/* Billing Cycle Label */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Tag size={11} /> Billing Cycle Label</label>
                                <input type="text" placeholder="e.g. Week 12 – 15 May 2026 (auto-filled if blank)"
                                    value={weekLabel} onChange={e => setWeekLabel(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none focus:border-brand-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Line Items</h3>
                                <button type="button" onClick={addItem}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:bg-brand-lime hover:text-black active:scale-95 cursor-pointer"
                                    style={{ borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}>
                                    <Plus size={12} /> Add Item
                                </button>
                            </div>

                            <div className="border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <div className="col-span-4">Item Name</div>
                                    <div className="col-span-3">Description</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Unit Price</div>
                                    <div className="col-span-1 text-right">–</div>
                                </div>

                                <div className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {lineItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    placeholder="Item name *"
                                                    value={item.name}
                                                    onChange={e => updateItem(idx, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime transition-colors"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder="Optional description"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:border-brand-lime transition-colors"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    placeholder="1"
                                                    value={item.qty}
                                                    onChange={e => updateItem(idx, 'qty', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-center outline-none focus:border-brand-lime transition-colors"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black" style={{ color: 'var(--text-dim)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={item.unitPrice}
                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                        className="w-full pl-6 pr-2 py-2 border rounded-xl text-xs font-bold text-right outline-none focus:border-brand-lime transition-colors"
                                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                {lineItems.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer">
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Discount + Tax + Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Discount + Tax */}
                            <div className="space-y-5">
                                {/* Discount */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <Tag size={11} /> Discount
                                    </label>
                                    <div className="flex gap-2">
                                        {(['NONE', 'PERCENTAGE', 'FIXED'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => { setDiscountType(t); setDiscountValue(''); }}
                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${discountType === t ? 'bg-brand-lime text-black border-transparent' : 'border-white/10 hover:bg-white/5'}`}
                                                style={discountType !== t ? { color: 'var(--text-dim)' } : {}}
                                            >
                                                {t === 'NONE' ? 'None' : t === 'PERCENTAGE' ? '% Off' : '$ Off'}
                                            </button>
                                        ))}
                                    </div>
                                    {discountType !== 'NONE' && (
                                        <div className="relative">
                                            {discountType === 'PERCENTAGE'
                                                ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-dim)' }} />
                                                : <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-dim)' }} />
                                            }
                                            <input
                                                type="number"
                                                min="0"
                                                max={discountType === 'PERCENTAGE' ? 100 : undefined}
                                                step="0.01"
                                                placeholder={discountType === 'PERCENTAGE' ? '0 – 100' : '0.00'}
                                                value={discountValue}
                                                onChange={e => setDiscountValue(e.target.value)}
                                                className="w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:border-brand-lime transition-colors"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Tax */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <Percent size={11} /> Tax Rate (%)
                                    </label>
                                    <div className="relative">
                                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-dim)' }} />
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            placeholder="0"
                                            value={taxRate}
                                            onChange={e => setTaxRate(e.target.value)}
                                            className="w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none focus:border-brand-lime transition-colors"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Internal Notes / Memo</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Optional internal memo or context..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-2xl text-xs font-medium outline-none resize-none focus:border-brand-lime transition-colors"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* Right: Totals Summary */}
                            <div className="flex flex-col justify-start">
                                <div className="border rounded-2xl overflow-hidden shadow-inner" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <div className="px-5 py-3.5 border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Invoice Summary</p>
                                    </div>
                                    <div className="px-5 py-4 space-y-3 text-xs">
                                        <div className="flex justify-between font-semibold" style={{ color: 'var(--text-dim)' }}>
                                            <span>Subtotal</span>
                                            <span style={{ color: 'var(--text-main)' }}>${fmt(subtotal)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between font-semibold text-rose-400">
                                                <span>Discount {discountType === 'PERCENTAGE' ? `(${discountValue}%)` : '(Fixed)'}</span>
                                                <span>− ${fmt(discountAmount)}</span>
                                            </div>
                                        )}
                                        {taxAmount > 0 && (
                                            <div className="flex justify-between font-semibold text-blue-400">
                                                <span>Tax ({taxRate}%)</span>
                                                <span>+ ${fmt(taxAmount)}</span>
                                            </div>
                                        )}
                                        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Grand Total</span>
                                                <span className="text-2xl font-black font-mono" style={{ color: 'var(--brand-lime)' }}>${fmt(grandTotal)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[9px] font-semibold italic pt-1" style={{ color: 'var(--text-dim)' }}>
                                            Status will be set to PENDING on creation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Sticky Footer */}
                <div className="px-8 py-5 border-t flex items-center justify-between gap-4 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-main)' }}>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                        Total Due: <span className="font-black text-sm" style={{ color: 'var(--brand-lime)' }}>${fmt(grandTotal)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form=""
                            onClick={handleSubmit}
                            disabled={submitting || grandTotal <= 0 || !selectedDriver || !dueDate}
                            className="flex items-center gap-2 px-7 py-2.5 bg-green-500 hover:bg-green-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            <FileText size={13} />
                            {submitting ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInvoiceModal;
