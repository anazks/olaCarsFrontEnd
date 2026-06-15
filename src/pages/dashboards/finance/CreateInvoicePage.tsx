import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Calendar, FileText, Tag } from 'lucide-react';
import { createInvoice, getInvoicesByCustomer } from '../../../services/invoiceService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllTaxes } from '../../../services/taxService';
import type { Tax } from '../../../services/taxService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import QuickAddCustomerModal from '../../../components/common/QuickAddCustomerModal';
import QuickAddInventoryPartModal from '../../../components/common/QuickAddInventoryPartModal';

interface LineItem {
    name: string;
    description: string;
    qty: string;
    unitPrice: string;
    inventoryPart?: string;
    isCustom?: boolean;
    tax?: string;
}

const defaultItem = (): LineItem => ({ name: '', description: '', qty: '1', unitPrice: '', isCustom: true, tax: '' });

const CreateInvoicePage = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number>(0);
    const [selectedCustomerPrepayment, setSelectedCustomerPrepayment] = useState<number>(0);
    const [loadingCustomerBalances, setLoadingCustomerBalances] = useState(false);
    const [inventoryParts, setInventoryParts] = useState<any[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [partModalRowIndex, setPartModalRowIndex] = useState<number | null>(null);

    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [weekLabel, setWeekLabel] = useState('');
    const [notes, setNotes] = useState('');
    const [isTaxInclusive] = useState(true);

    const [lineItems, setLineItems] = useState<LineItem[]>([
        defaultItem()
    ]);

    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
    const [discountValue, setDiscountValue] = useState('');
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const fetchInventory = useCallback(async () => {
        try {
            const res = await api.get('/api/inventory', { params: { limit: 1000 } });
            setInventoryParts(res.data?.data || res.data?.parts || []);
        } catch (err) {
            console.error('Failed to fetch inventory parts:', err);
        }
    }, []);

    // Fetch Inventory parts for dropdown
    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Fetch Branches for inline creation
    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const data = await getAllBranches();
                setBranches(Array.isArray(data) ? data : (data as any).data || []);
            } catch (err) {
                console.error('Failed to fetch branches:', err);
            }
        };
        fetchBranchesData();
    }, []);

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
    const discountFactor = subtotal > 0 ? (afterDiscount / subtotal) : 0;

    let totalTaxAmount = 0;
    lineItems.forEach(item => {
        const qty = parseFloat(item.qty) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const itemTotal = qty * price;
        const itemDiscountedTotal = itemTotal * discountFactor;

        let itemTaxRate = 0;
        if (item.tax) {
            const tx = taxes.find(t => t._id === item.tax);
            if (tx) {
                itemTaxRate = tx.rate;
            }
        }

        let itemTaxAmount = 0;
        if (itemTaxRate > 0) {
            if (isTaxInclusive) {
                const itemBaseAmount = itemDiscountedTotal / (1 + itemTaxRate / 100);
                itemTaxAmount = itemDiscountedTotal - itemBaseAmount;
            } else {
                itemTaxAmount = itemDiscountedTotal * itemTaxRate / 100;
            }
        }
        totalTaxAmount += itemTaxAmount;
    });

    const taxAmount = Math.round(totalTaxAmount * 100) / 100;
    const grandTotal = isTaxInclusive
        ? Math.round(afterDiscount * 100) / 100
        : Math.round((afterDiscount + taxAmount) * 100) / 100;

    // ── Line Item Helpers ─────────────────────────────────────────────────────
    const updateItem = (idx: number, fieldOrObj: keyof LineItem | Partial<LineItem>, val?: any) => {
        setLineItems(prev => prev.map((item, i) => {
            if (i === idx) {
                if (typeof fieldOrObj === 'object' && fieldOrObj !== null) {
                    return { ...item, ...fieldOrObj };
                }
                return { ...item, [fieldOrObj as keyof LineItem]: val };
            }
            return item;
        }));
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
                isTaxInclusive,
                lineItems: validItems.map(i => ({
                    name: i.name,
                    description: i.description,
                    qty: parseFloat(i.qty) || 1,
                    unitPrice: parseFloat(i.unitPrice) || 0,
                    inventoryPart: i.inventoryPart,
                    tax: i.tax || undefined
                })),
                discountType: discountType === 'NONE' ? 'PERCENTAGE' : discountType,
                discountValue: discountType !== 'NONE' ? parseFloat(discountValue) || 0 : 0,
                notes,
                status: isDraft ? 'DRAFT' : 'PENDING'
            });
            toast.success(isDraft ? 'Draft invoice saved!' : 'Manual invoice created!');
            navigate('../invoices');
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
        <div className="container-responsive space-y-6 pb-12 select-none" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Standard Header / Breadcrumbs - matching other registry pages */}
            <Breadcrumbs items={[{ label: 'Invoices', path: '../invoices' }, { label: 'New Invoice', active: true }]} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Create Invoice
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5" style={{ color: 'var(--text-dim)' }}>Generate a manual invoice statement with itemized tax rates</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('../invoices')}
                    className="px-4 py-2 border rounded-xl text-xs font-bold transition-all duration-300 hover:bg-white/5 active:scale-95 cursor-pointer"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    Back to Invoices
                </button>
            </div>

            {/* Form Container */}
            <form id="create-manual-invoice-page-form" onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">

                {/* 1. General Billing Metadata & Header Card */}
                <div className="p-6 md:p-8 border rounded-3xl space-y-6 relative overflow-hidden transition-all duration-300 hover:border-white/10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center pb-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <div>
                            <div className="text-base font-black tracking-widest text-brand-lime" style={{ fontFamily: "'Space Mono', monospace" }}>OLA CARS</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider text-dim mt-0.5" style={{ color: 'var(--text-dim)' }}>Arrendadora Ola Cars, S.A.</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black tracking-tight text-white uppercase" style={{ color: 'var(--text-main)' }}>Invoice Statement</div>
                            <div className="text-[8px] font-bold uppercase tracking-wider text-dim mt-0.5" style={{ color: 'var(--text-dim)' }}>New Manual Draft</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* Customer Search Selector */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                Bill To / Customer <span className="text-brand-lime">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search customer by name or ID..."
                                    value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerId})` : customerSearch}
                                    onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerList(true); }}
                                    onFocus={() => setShowCustomerList(true)}
                                    onBlur={() => setTimeout(() => setShowCustomerList(false), 250)}
                                    className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none transition-all duration-300 focus:border-brand-lime focus:ring-1 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                                {showCustomerList && (
                                    <div className="absolute z-50 w-full mt-2 border rounded-2xl shadow-2xl max-h-56 overflow-auto custom-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', backdropFilter: 'blur(10px)' }}>
                                        {filteredCustomers.slice(0, 15).map(c => (
                                            <button
                                                type="button"
                                                key={c._id}
                                                onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerList(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors border-b last:border-b-0"
                                                style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-[10px] font-black" style={{ color: 'var(--brand-lime)' }}>
                                                        {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{c.name}</p>
                                                    <p className="text-[9px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>{c.customerId}</p>
                                                </div>
                                            </button>
                                        ))}
                                        {/* Option to create a new customer inline */}
                                        <button
                                            type="button"
                                            onMouseDown={() => setIsCustomerModalOpen(true)}
                                            className="w-full text-left px-4 py-3 bg-brand-lime/5 hover:bg-brand-lime/10 text-brand-lime font-black text-[10px] uppercase tracking-wider flex items-center gap-2 sticky bottom-0 border-t"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <Plus size={11} strokeWidth={3} /> Add New Customer
                                        </button>
                                    </div>
                                )}
                            </div>
                            {selectedCustomer && (
                                <div className="flex flex-col gap-2 mt-2 p-3.5 rounded-2xl border bg-white/[0.01] animate-in fade-in duration-300" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg border" style={{ background: 'var(--bg-input)', color: 'var(--brand-lime)', borderColor: 'var(--border-main)' }}>
                                                ✓ {selectedCustomer.name} · {selectedCustomer.customerId}
                                            </span>
                                            <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-[9px] font-black text-rose-400 hover:text-rose-300 cursor-pointer">✕ Change</button>
                                        </div>
                                        {loadingCustomerBalances && <span className="text-[9px] font-bold uppercase tracking-widest text-dim animate-pulse">Fetching Balances...</span>}
                                    </div>

                                    {!loadingCustomerBalances && (
                                        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <div className="p-3 rounded-xl bg-white/[0.01] border flex flex-col justify-center" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-dim block">Receivable Balance</span>
                                                <span className={`text-xs font-black font-mono mt-0.5 ${selectedCustomerBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    ${selectedCustomerBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/[0.01] border flex flex-col justify-center" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-dim block">Prepayment Credit</span>
                                                <span className={`text-xs font-black font-mono mt-0.5 ${selectedCustomerPrepayment > 0 ? 'text-[#C8E600]' : 'text-dim'}`}>
                                                    ${selectedCustomerPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Dates Grid */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} className="text-brand-lime" /> Invoice Date</label>
                            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)}
                                className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} className="text-brand-lime" /> Due Date <span className="text-rose-400">*</span></label>
                            <input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                        </div>

                        {/* Subject */}
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Tag size={11} className="text-brand-lime" /> Subject / Billing Cycle</label>
                            <input type="text" placeholder="Let your customer know what this Invoice is for..."
                                value={weekLabel} onChange={e => setWeekLabel(e.target.value)}
                                className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime placeholder-white/20"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                        </div>
                    </div>
                </div>

                {/* 2. Responsive Line Items Table */}
                <div className="p-6 md:p-8 border rounded-3xl space-y-6 relative overflow-visible transition-all duration-300 hover:border-white/10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <h2 className="text-xs font-black uppercase tracking-widest pb-3 border-b flex items-center gap-2" style={{ color: 'var(--text-main)', borderColor: 'rgba(255,255,255,0.05)' }}>
                        <FileText size={13} className="text-brand-lime" /> Line Items & Services
                    </h2>

                    <div className="border rounded-2xl overflow-visible" style={{ borderColor: 'var(--border-main)' }}>
                        {/* Table Header (Desktop only) - Unit Price allocated col-span-3 */}
                        <div className="hidden md:grid grid-cols-12 gap-3 px-5 py-3 text-[9px] font-black uppercase tracking-widest border-b rounded-t-2xl" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                            <div className="col-span-3">Item Details</div>
                            <div className="col-span-2">Description</div>
                            <div className="col-span-2">VAT / Tax Rate</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-3 text-right">Unit Price ($)</div>
                            <div className="col-span-1 text-right">–</div>
                        </div>

                        {/* Table Rows (Desktop table-row / Mobile card stacked) */}
                        <div className="divide-y rounded-b-2xl" style={{ borderColor: 'var(--border-main)' }}>
                            {lineItems.map((item, idx) => (
                                <div key={idx} className={`flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-3 px-5 py-6 md:py-3.5 items-stretch md:items-center hover:bg-white/[0.005] transition-colors relative ${focusedItemIndex === idx ? 'z-[40]' : 'z-[10]'}`}>

                                    {/* Mobile Floating Delete Button */}
                                    <div className="absolute top-4 right-4 md:hidden">
                                        {lineItems.length > 1 && (
                                            <button type="button" onClick={() => removeItem(idx)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors">
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Item Selector Combobox Search Input */}
                                    <div className="col-span-3 space-y-1.5 relative">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-dim md:hidden" style={{ color: 'var(--text-dim)' }}>Item Details</label>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Type to search or enter custom item..."
                                                value={item.name}
                                                onChange={e => {
                                                    updateItem(idx, 'name', e.target.value);
                                                    updateItem(idx, 'inventoryPart', undefined);
                                                    updateItem(idx, 'isCustom', true);
                                                }}
                                                onFocus={() => setFocusedItemIndex(idx)}
                                                onClick={() => setFocusedItemIndex(idx)}
                                                onBlur={() => setTimeout(() => setFocusedItemIndex(null), 250)}
                                                className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                            {focusedItemIndex === idx && (
                                                <div className="absolute z-[100] left-0 right-0 mt-1 border rounded-xl shadow-2xl max-h-52 overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', backdropFilter: 'blur(10px)' }}>
                                                    {(() => {
                                                        const filtered = inventoryParts.filter(part => !item.name || part.partName?.toLowerCase().includes(item.name.toLowerCase()) || part.partNumber?.toLowerCase().includes(item.name.toLowerCase()));
                                                        if (filtered.length === 0) {
                                                            return <div className="px-4 py-3 text-[10px] text-dim font-bold text-center">No matching inventory items</div>;
                                                        }
                                                        return filtered.map(part => (
                                                            <button
                                                                type="button"
                                                                key={part._id}
                                                                onMouseDown={() => {
                                                                    updateItem(idx, {
                                                                        name: part.partName,
                                                                        description: `Part: ${part.partNumber} - Category: ${part.category}`,
                                                                        unitPrice: String(part.unitCost || 0),
                                                                        inventoryPart: part._id,
                                                                        isCustom: false,
                                                                        tax: part.taxId?._id || part.taxId || ''
                                                                    });
                                                                }}
                                                                className="w-full text-left px-3 py-2 hover:bg-white/5 flex flex-col gap-0.5 border-b last:border-b-0"
                                                                style={{ borderColor: 'rgba(255,255,255,0.03)' }}
                                                            >
                                                                <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{part.partName}</div>
                                                                <div className="text-[9px] font-mono text-dim" style={{ color: 'var(--text-dim)' }}>{part.partNumber} · Stock: {part.quantityOnHand} · ${part.unitCost}</div>
                                                            </button>
                                                        ));
                                                    })()}
                                                    {/* Inline part creation */}
                                                    <button
                                                        type="button"
                                                        onMouseDown={() => {
                                                            setPartModalRowIndex(idx);
                                                            setIsItemModalOpen(true);
                                                        }}
                                                        className="w-full text-left px-3 py-2.5 bg-brand-lime/5 hover:bg-brand-lime/10 text-brand-lime font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 sticky bottom-0 border-t"
                                                        style={{ borderColor: 'var(--border-main)' }}
                                                    >
                                                        <Plus size={11} strokeWidth={3} /> Add New Item
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {!item.isCustom && (
                                            <div className="text-[9px] font-bold text-[#C8E600] px-2 py-0.5 bg-[#C8E600]/5 border border-[#C8E600]/10 rounded-lg w-fit mt-1">
                                                ✓ Inventory Item
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-dim md:hidden" style={{ color: 'var(--text-dim)' }}>Description</label>
                                        <input
                                            type="text"
                                            placeholder="Optional description"
                                            value={item.description}
                                            onChange={e => updateItem(idx, 'description', e.target.value)}
                                            className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    {/* Per-item Tax selector */}
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-dim md:hidden" style={{ color: 'var(--text-dim)' }}>VAT / Tax Rate</label>
                                        <select
                                            value={item.tax || ''}
                                            onChange={e => updateItem(idx, 'tax', e.target.value)}
                                            className="w-full px-4 py-3 border rounded-2xl text-xs font-bold outline-none cursor-pointer focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">No Tax (0%)</option>
                                            {taxes.map(t => (
                                                <option key={t._id} value={t._id}>{t.name} ({t.rate}%)</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-1 space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-dim md:hidden" style={{ color: 'var(--text-dim)' }}>Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="1"
                                            value={item.qty}
                                            onChange={e => updateItem(idx, 'qty', e.target.value)}
                                            className="w-full px-2 py-3 border rounded-2xl text-xs font-bold text-center outline-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    {/* Unit Price (col-span-3 for improved visibility) */}
                                    <div className="col-span-3 space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-dim md:hidden" style={{ color: 'var(--text-dim)' }}>Unit Price</label>
                                        <div className="relative group">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-dim" style={{ color: 'var(--text-dim)' }}>$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={item.unitPrice}
                                                onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                className="w-full pl-7 pr-4 py-3 border rounded-2xl text-xs font-bold text-right outline-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Desktop Delete Column */}
                                    <div className="col-span-1 flex justify-end hidden md:flex">
                                        {lineItems.length > 1 && (
                                            <button type="button" onClick={() => removeItem(idx)}
                                                className="p-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all cursor-pointer group"
                                                title="Delete Row">
                                                <Trash2 size={13} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-start">
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-brand-lime hover:bg-brand-lime/10 border border-brand-lime/20 rounded-xl transition-all active:scale-95 group cursor-pointer"
                        >
                            <Plus size={11} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                            Add Line Item
                        </button>
                    </div>
                </div>

                {/* 3. Settings & Totals */}
                <div className="p-6 md:p-8 border rounded-3xl relative overflow-visible transition-all duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Settings Form Column */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-widest pb-2.5 border-b" style={{ color: 'var(--text-main)', borderColor: 'rgba(255,255,255,0.05)' }}>Invoice Notes</h3>

                            {/* Internal Notes */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-dim block" style={{ color: 'var(--text-dim)' }}>
                                    Customer / Internal Notes
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="Add terms, bank details, or internal operational remarks..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none resize-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        {/* Summary Column */}
                        <div className="space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest pb-2.5 border-b" style={{ color: 'var(--text-main)', borderColor: 'rgba(255,255,255,0.05)' }}>Invoice Summary</h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-dim" style={{ color: 'var(--text-dim)' }}>Subtotal</span>
                                        <span className="font-bold font-mono" style={{ color: 'var(--text-main)' }}>${fmt(subtotal)}</span>
                                    </div>

                                    {/* Discount Input directly in summary */}
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-dim" style={{ color: 'var(--text-dim)' }}>Discount ($)</span>
                                        <div className="relative w-32 group">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-dim" style={{ color: 'var(--text-dim)' }}>$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={discountValue}
                                                onChange={e => {
                                                    setDiscountType(e.target.value ? 'FIXED' : 'NONE');
                                                    setDiscountValue(e.target.value);
                                                }}
                                                className="w-full pl-6 pr-3 py-2 border rounded-xl text-xs font-bold text-right outline-none focus:border-brand-lime transition-all duration-300 focus:ring-1 focus:ring-brand-lime/20 bg-white/[0.03] border-white/10"
                                                style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                            />
                                        </div>
                                    </div>

                                    {taxAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <span className="font-semibold text-dim" style={{ color: 'var(--text-dim)' }}>VAT / Total Tax (Inclusive)</span>
                                            <span className="font-bold font-mono text-dim" style={{ color: 'var(--text-dim)' }}>
                                                Included (${fmt(taxAmount)})
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Grand Total */}
                            <div className="pt-4 border-t flex items-end justify-between mt-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest block text-dim" style={{ color: 'var(--text-dim)' }}>Grand Total (USD)</span>
                                    <span className="text-2xl font-black font-mono tracking-tighter text-[#C8E600]">${fmt(grandTotal)}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* 4. Action Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('../invoices')}
                        disabled={submitting}
                        className="px-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest hover:bg-white/5 active:scale-95 disabled:opacity-20 transition-all duration-300 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={submitting}
                        className="px-6 py-3 border rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 active:scale-95 disabled:opacity-20 transition-all duration-300 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Save Draft
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 bg-brand-lime text-brand-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all duration-300 shadow-md shadow-brand-lime/10 cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        {submitting ? 'Creating...' : 'Create Invoice'}
                    </button>
                </div>

            </form>

            {/* ================= INLINE CREATE CUSTOMER MODAL ================= */}
            <QuickAddCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onSuccess={async (newCust) => {
                    try {
                        // Refresh customers list
                        const customerListRes = await getAllCustomers({ status: 'ACTIVE', limit: 200 });
                        const customersData = customerListRes.data || (customerListRes as any).customers || [];
                        setCustomers(customersData);

                        if (newCust) {
                            // Find the created customer from the refreshed list to ensure references match
                            const match = customersData.find((c: any) => c._id === newCust._id || c.name === newCust.name);
                            if (match) {
                                setSelectedCustomer(match);
                            } else {
                                setSelectedCustomer(newCust);
                            }
                        }
                        setCustomerSearch('');
                        setShowCustomerList(false);
                    } catch (err) {
                        console.error('Failed to refresh customers list after quick add:', err);
                    }
                }}
                branches={branches}
            />

            {/* ================= INLINE CREATE INVENTORY PART MODAL ================= */}
            <QuickAddInventoryPartModal
                isOpen={isItemModalOpen}
                onClose={() => setIsItemModalOpen(false)}
                onSuccess={async (newPart) => {
                    // Refresh and auto-fill in row
                    await fetchInventory();

                    if (partModalRowIndex !== null && newPart) {
                        updateItem(partModalRowIndex, {
                            name: newPart.partName,
                            description: `Part: ${newPart.partNumber} - Category: ${newPart.category}`,
                            unitPrice: String(newPart.unitCost || 0),
                            inventoryPart: newPart._id,
                            isCustom: false,
                            tax: (newPart.taxId as any)?._id || (newPart.taxId as string) || ''
                        });
                    }
                }}
                branches={branches}
                taxes={taxes}
            />

        </div>
    );
};

export default CreateInvoicePage;
