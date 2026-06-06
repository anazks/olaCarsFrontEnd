import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, DollarSign, Calendar, User, FileText, Tag, Percent } from 'lucide-react';
import { createInvoice, getInvoicesByCustomer } from '../../../services/invoiceService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllTaxes } from '../../../services/taxService';
import type { Tax } from '../../../services/taxService';
import api from '../../../services/api';
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
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number>(0);
    const [selectedCustomerPrepayment, setSelectedCustomerPrepayment] = useState<number>(0);
    const [loadingCustomerBalances, setLoadingCustomerBalances] = useState(false);

    useEffect(() => {
        const fetchCustomerBalances = async () => {
            if (!selectedCustomer) {
                setSelectedCustomerBalance(0);
                setSelectedCustomerPrepayment(0);
                return;
            }
            setLoadingCustomerBalances(true);
            try {
                const [invoicesData, paymentsData] = await Promise.all([
                    getInvoicesByCustomer(selectedCustomer._id),
                    api.get('/api/payments-received', { params: { customerId: selectedCustomer._id, limit: 100 } })
                ]);

                // Calculate Outstanding Account Receivable Balance
                const outstanding = invoicesData.reduce((sum: number, inv: any) => sum + (inv.balance || 0), 0);
                setSelectedCustomerBalance(outstanding);

                // Calculate Prepayment Credit (Extra Advance)
                const paymentsList = paymentsData?.data?.data || paymentsData?.data || [];
                const totalReceived = paymentsList.reduce((sum: number, p: any) => p.status === 'VOID' ? sum : sum + (p.amountReceived || 0), 0);
                const totalApplied = paymentsList.reduce((sum: number, p: any) => {
                    if (p.status === 'VOID') return sum;
                    const applied = p.invoices?.reduce((invSum: number, inv: any) => invSum + (inv.amountApplied || 0), 0) || 0;
                    return sum + applied;
                }, 0);
                const prepayment = Math.max(0, totalReceived - totalApplied);
                setSelectedCustomerPrepayment(prepayment);
            } catch (err) {
                console.error('Error fetching customer balances:', err);
            } finally {
                setLoadingCustomerBalances(false);
            }
        };

        fetchCustomerBalances();
    }, [selectedCustomer]);

    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [weekLabel, setWeekLabel] = useState('');
    const [notes, setNotes] = useState('');

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { name: 'Weekly Vehicle Rent Lease Payment', description: 'Base period rate assessment for billing cycle', qty: '1', unitPrice: '' }
    ]);

    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
    const [discountValue, setDiscountValue] = useState('');
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchCustomers = useCallback(async () => {
        try {
            const res = await getAllCustomers({ status: 'ACTIVE', limit: 200 });
            setCustomers(res.data || (res as any).customers || []);
        } catch { /* silent */ }
    }, []);

    const fetchTaxes = useCallback(async () => {
        try {
            const fetchedTaxes = await getAllTaxes();
            const activeTaxes = fetchedTaxes.filter(t => t.isActive);
            setTaxes(activeTaxes);
            if (activeTaxes.length > 0) {
                setSelectedTax(activeTaxes[0]);
            }
        } catch (err) {
            console.error('Error fetching taxes:', err);
        }
    }, []);

    useEffect(() => { 
        fetchCustomers(); 
        fetchTaxes();
    }, [fetchCustomers, fetchTaxes]);

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerId?.toLowerCase().includes(customerSearch.toLowerCase())
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
    const taxRate = selectedTax ? selectedTax.rate : 0;
    const taxAmount = Math.round(afterDiscount * taxRate / 100 * 100) / 100;
    const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100;

    // ── Line Item Helpers ─────────────────────────────────────────────────────
    const updateItem = (idx: number, field: keyof LineItem, val: string) => {
        setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };
    const addItem = () => setLineItems(prev => [...prev, defaultItem()]);
    const removeItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

    // ── Submit ────────────────────────────────────────────────────────────────
    const saveInvoice = async (isDraft: boolean) => {
        if (!selectedCustomer) { toast.error('Please select a customer'); return; }
        if (!dueDate) { toast.error('Due date is required'); return; }
        const validItems = lineItems.filter(i => i.name.trim() && parseFloat(i.unitPrice) > 0);
        if (validItems.length === 0) { toast.error('Add at least one valid line item with a price'); return; }

        setSubmitting(true);
        try {
            await createInvoice({
                customer: selectedCustomer._id,
                driver: selectedCustomer.driver?._id || undefined,
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
                tax: selectedTax ? selectedTax._id : undefined,
                taxRate,
                notes,
                status: isDraft ? 'DRAFT' : 'PENDING'
            });
            toast.success(isDraft ? 'Draft invoice saved!' : 'Manual invoice created!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveInvoice(false);
    };

    const handleSaveDraft = async () => {
        await saveInvoice(true);
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
                            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Manual Customer Invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <form id="create-manual-invoice-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-8">

                        {/* Top Meta Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Customer Selector */}
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <User size={11} /> Bill To / Customer
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search customer by name or ID..."
                                        value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerId})` : customerSearch}
                                        onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerList(true); }}
                                        onFocus={() => setShowCustomerList(true)}
                                        className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                    {showCustomerList && filteredCustomers.length > 0 && !selectedCustomer && (
                                        <div className="absolute z-50 w-full mt-1 border rounded-2xl shadow-2xl max-h-52 overflow-auto custom-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {filteredCustomers.slice(0, 15).map(c => (
                                                <button
                                                    type="button"
                                                    key={c._id}
                                                    onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerList(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-black" style={{ color: 'var(--brand-lime)' }}>
                                                            {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{c.name}</p>
                                                        <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>{c.customerId}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedCustomer && (
                                    <div className="flex flex-col gap-2 mt-1.5 p-4 rounded-2xl border" style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border animate-pulse" style={{ background: 'var(--bg-input)', color: 'var(--brand-lime)', borderColor: 'var(--border-main)' }}>
                                                    ✓ {selectedCustomer.name} · {selectedCustomer.customerId}
                                                </span>
                                                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-[10px] font-black text-rose-400 hover:text-rose-300">✕ Change</button>
                                            </div>
                                            {loadingCustomerBalances && <span className="text-[9px] font-bold uppercase tracking-widest text-dim animate-pulse">Fetching Account Balances...</span>}
                                        </div>
                                        
                                        {!loadingCustomerBalances && (
                                            <div className="grid grid-cols-2 gap-4 pt-2 border-t animate-in fade-in duration-300" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                <div className="p-3 rounded-xl bg-white/[0.01] border flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-dim block">Accounts Receivable (Due)</span>
                                                    <span className={`text-xs font-black font-mono ${selectedCustomerBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                        ${selectedCustomerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.01] border flex flex-col" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-dim block">Prepayment Credit (Extra)</span>
                                                    <span className={`text-xs font-black font-mono ${selectedCustomerPrepayment > 0 ? 'text-[#C8E600]' : 'text-dim'}`}>
                                                        ${selectedCustomerPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
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
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                    <FileText size={12} /> Line Items & Services
                                </h3>
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
                                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.01] transition-colors">
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    placeholder="Item name *"
                                                    value={item.name}
                                                    onChange={e => updateItem(idx, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime transition-all"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    placeholder="Optional description"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:border-brand-lime transition-all"
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
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-center outline-none focus:border-brand-lime transition-all"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="relative group">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black transition-colors group-focus-within:text-brand-lime" style={{ color: 'var(--text-dim)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={item.unitPrice}
                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                        className="w-full pl-6 pr-2 py-2 border rounded-xl text-xs font-bold text-right outline-none focus:border-brand-lime transition-all"
                                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-1 flex justify-end">
                                                {lineItems.length > 1 && (
                                                    <button type="button" onClick={() => removeItem(idx)}
                                                        className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all cursor-pointer group"
                                                        title="Delete Row">
                                                        <Trash2 size={14} className="group-hover:scale-110" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Add Row Button below table */}
                            <div className="flex justify-start">
                                <button 
                                    type="button" 
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:bg-brand-lime/5 rounded-xl transition-all active:scale-95 group cursor-pointer"
                                >
                                    <div className="w-5 h-5 rounded-full border border-brand-lime/30 flex items-center justify-center group-hover:border-brand-lime transition-colors">
                                        <Plus size={10} strokeWidth={3} />
                                    </div>
                                    Add New Row
                                </button>
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

                                {/* Tax Rate */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <Percent size={11} /> VAT / Tax Rate
                                    </label>
                                    <select
                                        value={selectedTax ? selectedTax._id : ''}
                                        onChange={e => {
                                            const tax = taxes.find(t => t._id === e.target.value);
                                            setSelectedTax(tax || null);
                                        }}
                                        className="w-full px-4 py-3 border rounded-2xl text-xs font-bold outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">No Tax (0%)</option>
                                        {taxes.map(t => (
                                            <option key={t._id} value={t._id}>{t.name} ({t.rate}%)</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <FileText size={11} /> Internal Notes
                                    </label>
                                    <textarea
                                        rows={3}
                                        placeholder="Add terms, bank details, or internal operational remarks..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none resize-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* Right: Calculations Summary Box */}
                            <div className="p-8 border rounded-3xl flex flex-col justify-between" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest border-b pb-3 mb-2" style={{ color: 'var(--text-dim)', borderColor: 'rgba(255,255,255,0.05)' }}>Invoice Summary</h4>
                                    
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>Subtotal</span>
                                        <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>${fmt(subtotal)}</span>
                                    </div>
                                    
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-rose-400">Discount ({discountType === 'PERCENTAGE' ? `${discountValue}%` : '$'})</span>
                                            <span className="font-bold font-mono text-rose-400">-${fmt(discountAmount)}</span>
                                        </div>
                                    )}

                                    {selectedTax && (
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold" style={{ color: 'var(--text-dim)' }}>Tax ({selectedTax.name} - {selectedTax.rate}%)</span>
                                            <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>+${fmt(taxAmount)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-5 border-t flex items-end justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--text-dim)' }}>Grand Total (USD)</span>
                                        <span className="text-3xl font-black font-mono tracking-tighter" style={{ color: 'var(--brand-lime)' }}>${fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-8 py-5 border-t flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        {grandTotal > 0 && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                Invoice Total: ${fmt(grandTotal)}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest hover:bg-white/5 active:scale-95 disabled:opacity-20 transition-all cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest hover:bg-white/5 active:scale-95 disabled:opacity-20 transition-all cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Save Draft
                        </button>
                        <button
                            type="submit"
                            form="create-manual-invoice-form"
                            disabled={submitting}
                            className="px-6 py-2.5 bg-brand-lime text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all shadow-xl cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {submitting ? 'Generating...' : 'Create Invoice'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CreateInvoiceModal;
