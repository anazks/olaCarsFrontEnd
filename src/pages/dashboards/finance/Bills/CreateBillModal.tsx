import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Landmark, Calendar, FileText, ShoppingBag, FolderOpen, Tag } from 'lucide-react';
import { createBill } from '../../../../services/billService';
import { getAllSuppliers, type Supplier } from '../../../../services/supplierService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import { getAllTaxes, type Tax } from '../../../../services/taxService';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddSupplierModal } from '../../../../components/common/QuickAddSupplierModal';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';

interface LineItem {
    itemName: string;
    description: string;
    quantity: string;
    unitPrice: string;
    accountId: string;
}

const defaultItem = (): LineItem => ({ itemName: '', description: '', quantity: '1', unitPrice: '', accountId: '' });

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateBillModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);

    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [billNumber, setBillNumber] = useState<string>('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    const [purchaseType, setPurchaseType] = useState<'CREDIT' | 'CASH' | 'BANK'>('CREDIT');
    const [selectedCreditAccount, setSelectedCreditAccount] = useState<string>('');
    const [selectedTaxId, setSelectedTaxId] = useState<string>('');
    const [isInclusiveTax, setIsInclusiveTax] = useState<boolean>(false);

    const [lineItems, setLineItems] = useState<LineItem[]>([
        { itemName: '', description: '', quantity: '1', unitPrice: '', accountId: '' }
    ]);

    const [submitting, setSubmitting] = useState(false);
    
    // Quick Add Modal States
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [activeLineItemIndex, setActiveLineItemIndex] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [supplierRes, branchRes, codesRes, taxRes] = await Promise.all([
                getAllSuppliers({ limit: 200 }),
                getAllBranches({ limit: 200 }),
                getAllAccountingCodes(),
                getAllTaxes()
            ]);
            
            const codes = codesRes || [];
            setSuppliers(supplierRes.data || []);
            setBranches(branchRes.data || []);
            setAccountingCodes(codes);
            setTaxes(Array.isArray(taxRes) ? taxRes : []);

            // Default credit account to Accounts Payable (2.1.01)
            const apCode = codes.find((c: any) => 
                c.code === '2.1.01' || 
                (c.accountType && c.accountType.toLowerCase() === 'accounts payable') || 
                (c.category && c.category.toLowerCase() === 'accounts payable')
            );
            if (apCode) {
                setSelectedCreditAccount(apCode._id);
            }
        } catch (err) {
            console.error('Failed to load Create Bill dependencies', err);
            toast.error('Failed to load suppliers, branches, or accounts list.');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset state
            setSelectedSupplier('');
            setSelectedBranch('');
            setBillNumber('');
            setBillDate(new Date().toISOString().split('T')[0]);
            setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default 30 days due
            setNotes('');
            setPurchaseType('CREDIT');
            setSelectedTaxId('');
            setIsInclusiveTax(false);
            setLineItems([defaultItem()]);
        }
    }, [isOpen, fetchData]);

    const isCashAccount = (c: any) => {
        const type = (c.accountType || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        return type === 'cash' || cat === 'cash';
    };

    const isBankAccount = (c: any) => {
        const type = (c.accountType || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        return type === 'bank' || cat === 'bank';
    };

    const isPayableAccount = (c: any) => {
        const type = (c.accountType || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        return type === 'accounts payable' || cat === 'accounts payable' || c.code === '2.1.01';
    };

    // Update credit account when purchase type changes
    const handlePurchaseTypeChange = (type: 'CREDIT' | 'CASH' | 'BANK') => {
        setPurchaseType(type);
        if (type === 'CASH') {
            const cashAcc = accountingCodes.find(isCashAccount);
            setSelectedCreditAccount(cashAcc ? cashAcc._id : '');
        } else if (type === 'BANK') {
            const bankAcc = accountingCodes.find(isBankAccount);
            setSelectedCreditAccount(bankAcc ? bankAcc._id : '');
        } else {
            const apAcc = accountingCodes.find(isPayableAccount);
            setSelectedCreditAccount(apAcc ? apAcc._id : '');
        }
    };

    // Filter credit accounts based on selected purchase type
    const availableCreditAccounts = accountingCodes.filter((c: any) => {
        if (purchaseType === 'CASH') return isCashAccount(c);
        if (purchaseType === 'BANK') return isBankAccount(c);
        return isPayableAccount(c);
    });

    // ── Calculations ──────────────────────────────────────────────────────────
    const itemsSubtotal = lineItems.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);

    const selectedTaxDoc = taxes.find(t => t._id === selectedTaxId);
    const taxRate = selectedTaxDoc ? selectedTaxDoc.rate : 0;

    let taxAmount = 0;
    let grandTotal = itemsSubtotal;

    if (taxRate > 0) {
        if (isInclusiveTax) {
            taxAmount = Math.round((itemsSubtotal * (taxRate / (100 + taxRate))) * 100) / 100;
            grandTotal = itemsSubtotal;
        } else {
            taxAmount = Math.round((itemsSubtotal * (taxRate / 100)) * 100) / 100;
            grandTotal = Math.round((itemsSubtotal + taxAmount) * 100) / 100;
        }
    }

    const netExpenseSubtotal = isInclusiveTax ? Math.max(0, itemsSubtotal - taxAmount) : itemsSubtotal;

    // ── Line Item Helpers ─────────────────────────────────────────────────────
    const updateItem = (idx: number, field: keyof LineItem, val: string) => {
        setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
    };
    const addItem = () => setLineItems(prev => [...prev, defaultItem()]);
    const removeItem = (idx: number) => setLineItems(prev => prev.filter((_, i) => i !== idx));

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier) { toast.error('Please select a supplier'); return; }
        if (!selectedBranch) { toast.error('Please select a branch'); return; }
        if (!dueDate) { toast.error('Due date is required'); return; }
        const minAllowedDueDate = billDate > todayStr ? billDate : todayStr;
        if (dueDate < minAllowedDueDate) {
            if (billDate > todayStr) {
                toast.error('Due date cannot be before the bill date');
            } else {
                toast.error('Due date cannot be in the past');
            }
            return;
        }
        
        const validItems = lineItems.filter(i => i.itemName.trim() && parseFloat(i.unitPrice) > 0 && i.accountId);
        if (validItems.length === 0) {
            toast.error('Add at least one item with a valid name, price, and debit account');
            return;
        }

        setSubmitting(true);
        try {
            await createBill({
                billNumber: billNumber.trim() || undefined,
                supplier: selectedSupplier,
                branch: selectedBranch,
                billDate,
                dueDate,
                purchaseType,
                creditAccountId: selectedCreditAccount || undefined,
                notes,
                isInclusiveTax,
                taxId: selectedTaxId || undefined,
                taxPercentage: taxRate,
                items: validItems.map(i => ({
                    itemName: i.itemName,
                    description: i.description,
                    quantity: parseFloat(i.quantity) || 1,
                    unitPrice: parseFloat(i.unitPrice) || 0,
                    accountId: i.accountId
                }))
            });

            toast.success('Standalone bill created successfully!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create bill');
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl max-h-[92vh] flex flex-col border rounded-[2rem] shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
                            <ShoppingBag size={17} className="text-brand-lime" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--text-main)' }}>New Standalone Bill</h2>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C8E600]">Create Bill Without PO</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-6">

                        {/* Top Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Supplier Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Landmark size={11} /> Supplier <span className="text-rose-400">*</span>
                                </label>
                                <SearchableSelect
                                    options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                                    value={selectedSupplier}
                                    onChange={setSelectedSupplier}
                                    placeholder="Select Supplier"
                                    onAddNew={() => setIsAddSupplierOpen(true)}
                                    addNewText="Add New Supplier"
                                    required
                                />
                            </div>

                            {/* Branch Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <FolderOpen size={11} /> Branch <span className="text-rose-400">*</span>
                                </label>
                                <SearchableSelect
                                    options={branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))}
                                    value={selectedBranch}
                                    onChange={setSelectedBranch}
                                    placeholder="Select Branch"
                                    required
                                />
                            </div>

                            {/* Bill Number */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <FileText size={11} /> Bill Number (Optional)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. BILL-98242 (leave empty to auto-generate)"
                                    value={billNumber} 
                                    onChange={e => setBillNumber(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none focus:border-brand-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                />
                            </div>

                            {/* Date Picker Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} /> Bill Date</label>
                                    <input 
                                        type="date" 
                                        value={billDate} 
                                        onChange={e => {
                                            const newDate = e.target.value;
                                            setBillDate(newDate);
                                            const minAllowed = newDate > todayStr ? newDate : todayStr;
                                            if (dueDate && dueDate < minAllowed) {
                                                setDueDate(minAllowed);
                                            }
                                        }}
                                        className="w-full px-3 py-3 border rounded-2xl text-xs font-semibold outline-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Calendar size={11} /> Due Date <span className="text-rose-400">*</span></label>
                                    <input 
                                        type="date" 
                                        required 
                                        value={dueDate} 
                                        onChange={e => setDueDate(e.target.value)}
                                        min={billDate > todayStr ? billDate : todayStr}
                                        className="w-full px-3 py-3 border rounded-2xl text-xs font-semibold outline-none focus:border-brand-lime"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                    />
                                </div>
                            </div>

                            {/* Purchase Type Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={11} /> Purchase Type <span className="text-rose-400">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePurchaseTypeChange('CASH')}
                                        className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                                            purchaseType === 'CASH'
                                                ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-sm'
                                                : 'border-transparent text-dim hover:bg-input'
                                        }`}
                                        style={{ background: purchaseType === 'CASH' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-input)' }}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Cash Purchase
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePurchaseTypeChange('BANK')}
                                        className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                                            purchaseType === 'BANK'
                                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-sm'
                                                : 'border-transparent text-dim hover:bg-input'
                                        }`}
                                        style={{ background: purchaseType === 'BANK' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-input)' }}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        Bank Purchase
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePurchaseTypeChange('CREDIT')}
                                        className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                                            purchaseType === 'CREDIT'
                                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                                                : 'border-transparent text-dim hover:bg-input'
                                        }`}
                                        style={{ background: purchaseType === 'CREDIT' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-input)' }}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Credit Purchase
                                    </button>
                                </div>
                            </div>

                            {/* Credit Account Selector (Filtered by Purchase Type) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center justify-between" style={{ color: 'var(--text-dim)' }}>
                                    <span className="flex items-center gap-1.5">
                                        <Landmark size={11} /> 
                                        {purchaseType === 'CASH' ? 'Credit Account (Cash A/c)' : purchaseType === 'BANK' ? 'Credit Account (Bank A/c)' : 'Credit Account (Accounts Payable)'}
                                        <span className="text-rose-400">*</span>
                                    </span>
                                    <span className="text-[9px] lowercase opacity-70">
                                        {purchaseType === 'CASH' ? 'type: cash' : purchaseType === 'BANK' ? 'type: bank' : 'type: accounts payable'}
                                    </span>
                                </label>
                                <SearchableSelect
                                    options={availableCreditAccounts.map(a => ({ value: a._id, label: `${a.code} - ${a.name} (${a.accountType || a.category})` }))}
                                    value={selectedCreditAccount}
                                    onChange={setSelectedCreditAccount}
                                    placeholder={`Select ${purchaseType === 'CASH' ? 'Cash' : purchaseType === 'BANK' ? 'Bank' : 'Accounts Payable'} Account`}
                                    required
                                />
                            </div>
                        </div>

                        {/* Bill Items Section */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <FileText size={12} /> Bill Line Items & Debit Accounts
                            </h3>

                            <div className="border rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <div className="col-span-3">Item Name</div>
                                    <div className="col-span-3">Debit Account (Expense/Asset)</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-right">Unit Price</div>
                                    <div className="col-span-2 text-right">Action</div>
                                </div>

                                <div className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {lineItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.01] transition-colors">
                                            {/* Item Name */}
                                            <div className="col-span-3">
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Item name *"
                                                    value={item.itemName}
                                                    onChange={e => updateItem(idx, 'itemName', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime transition-all"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>

                                            {/* Debit Account Selector */}
                                            <div className="col-span-3">
                                                <SearchableSelect
                                                    options={accountingCodes.map(code => ({
                                                        value: code._id,
                                                        label: `${code.code} - ${code.name} (${code.category})`
                                                    }))}
                                                    value={item.accountId}
                                                    onChange={val => updateItem(idx, 'accountId', val)}
                                                    placeholder="Select Account"
                                                    onAddNew={() => {
                                                        setActiveLineItemIndex(idx);
                                                        setIsAddAccountOpen(true);
                                                    }}
                                                    addNewText="Add New Account"
                                                    required
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-center outline-none focus:border-brand-lime transition-all"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>

                                            {/* Unit Price */}
                                            <div className="col-span-2">
                                                <div className="relative group">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black" style={{ color: 'var(--text-dim)' }}>$</span>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="0"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={item.unitPrice}
                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                        className="w-full pl-5 pr-2 py-2 border rounded-xl text-xs font-bold text-right outline-none focus:border-brand-lime transition-all"
                                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Delete Action */}
                                            <div className="col-span-2 flex justify-end">
                                                {lineItems.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeItem(idx)}
                                                        className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add Row Button */}
                            <div className="flex justify-start">
                                <button 
                                    type="button" 
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:bg-brand-lime/5 rounded-xl transition-all active:scale-95 group cursor-pointer"
                                >
                                    <div className="w-5 h-5 rounded-full border border-brand-lime/30 flex items-center justify-center group-hover:border-brand-lime transition-colors">
                                        <Plus size={10} strokeWidth={3} />
                                    </div>
                                    Add New Item
                                </button>
                            </div>
                        </div>

                        {/* Tax Profiling & Settings */}
                        <div className="p-5 border rounded-2xl space-y-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={12} className="text-[#C8E600]" />
                                    Tax Profile & Inclusivity
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                    <input
                                        type="checkbox"
                                        checked={isInclusiveTax}
                                        onChange={e => setIsInclusiveTax(e.target.checked)}
                                        className="rounded accent-[#C8E600] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Tax Inclusive</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-dim)' }}>Tax Profile</label>
                                    <select
                                        value={selectedTaxId}
                                        onChange={e => setSelectedTaxId(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime transition-colors"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">No Tax / Zero-Rated (0%)</option>
                                        {taxes.map(t => (
                                            <option key={t._id} value={t._id}>
                                                {t.name} ({t.rate}%)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                    {taxRate > 0 ? (
                                        <div className="p-2.5 rounded-xl border bg-white/5 flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                            <span>Calculated Tax ({taxRate}% {isInclusiveTax ? 'Inclusive' : 'Exclusive'}):</span>
                                            <span className="font-bold text-[#C8E600]">+${fmt(taxAmount)}</span>
                                        </div>
                                    ) : (
                                        <div className="p-2.5 rounded-xl border bg-white/5 text-[11px] italic" style={{ borderColor: 'var(--border-main)' }}>
                                            No tax applied to this bill.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Summary & Notes Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Internal Notes / Memo</label>
                                <textarea
                                    rows={4}
                                    placeholder="Add payment terms, utilities context, or internal memo details..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-xs font-medium outline-none resize-none focus:border-brand-lime transition-colors"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Summary Totals */}
                            <div className="border rounded-2xl overflow-hidden shadow-inner flex flex-col justify-between" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Double-Entry Bookkeeping Summary</p>
                                    <Tag size={12} className="text-brand-lime" />
                                </div>
                                <div className="px-5 py-5 space-y-3 text-xs flex-1">
                                    <div className="flex justify-between font-semibold" style={{ color: 'var(--text-dim)' }}>
                                        <span>Debit (Line Items Expense Accounts)</span>
                                        <span style={{ color: 'var(--text-main)' }}>${fmt(netExpenseSubtotal)}</span>
                                    </div>
                                    {taxRate > 0 && (
                                        <div className="flex justify-between font-semibold" style={{ color: 'var(--text-dim)' }}>
                                            <span>Debit (Input Tax / Tax Receivable - Asset)</span>
                                            <span className="text-[#C8E600] font-bold">+${fmt(taxAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-semibold" style={{ color: 'var(--text-dim)' }}>
                                        <span>Credit ({purchaseType === 'CASH' ? 'Cash' : purchaseType === 'BANK' ? 'Bank' : 'Accounts Payable - 2.1.01'})</span>
                                        <span className="text-brand-lime font-bold">${fmt(grandTotal)}</span>
                                    </div>
                                    <div className="pt-4 border-t mt-2" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Grand Total</span>
                                            <span className="text-xl font-black font-mono tracking-tighter" style={{ color: 'var(--brand-lime)' }}>${fmt(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-5 py-2.5 bg-white/5 border-t text-[9px] font-bold italic" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    * Standalone bills will be generated in OPEN status and registered in general ledger.
                                </div>
                            </div>
                        </div>

                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-5 border-t flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Grand Liability Amount</span>
                        <span className="text-xl font-black" style={{ color: 'var(--brand-lime)' }}>${fmt(grandTotal)}</span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-6 py-2.5 border rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95 cursor-pointer"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={submitting || grandTotal <= 0 || !selectedSupplier || !selectedBranch || !dueDate}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-[#C8E600] text-black font-black text-[11px] uppercase tracking-wide rounded-xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer animate-pulse-slow"
                        >
                            <FileText size={14} strokeWidth={2.5} />
                            {submitting ? 'Creating...' : 'Create Bill'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Add Modals */}
            <QuickAddSupplierModal
                isOpen={isAddSupplierOpen}
                onClose={() => setIsAddSupplierOpen(false)}
                onSuccess={async (newSup) => {
                    try {
                        const supplierRes = await getAllSuppliers({ limit: 200 });
                        setSuppliers(supplierRes.data || []);
                        setSelectedSupplier(newSup._id);
                    } catch (err) {
                        console.error('Failed to reload suppliers', err);
                    }
                }}
            />

            <QuickAddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => {
                    setIsAddAccountOpen(false);
                    setActiveLineItemIndex(null);
                }}
                defaultCategory="EXPENSE"
                onSuccess={async (newAcc) => {
                    try {
                        const codesRes = await getAllAccountingCodes();
                        setAccountingCodes(codesRes || []);
                        if (activeLineItemIndex !== null) {
                            updateItem(activeLineItemIndex, 'accountId', newAcc._id);
                        }
                    } catch (err) {
                        console.error('Failed to reload accounts', err);
                    }
                }}
            />
        </div>
    );
};

export default CreateBillModal;
