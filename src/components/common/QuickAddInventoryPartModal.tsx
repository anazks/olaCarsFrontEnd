import { useState, useEffect } from 'react';
import { 
    X, Sparkles, Wrench, RefreshCw, Calculator, ShoppingBag 
} from 'lucide-react';
import { createPart, type InventoryPart } from '../../services/inventoryService';
import { type Branch } from '../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../services/accountingService';
import { getAllSuppliers, type Supplier } from '../../services/supplierService';
import { type Tax } from '../../services/taxService';
import toast from 'react-hot-toast';

interface QuickAddInventoryPartModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newPart?: InventoryPart) => void;
    branches: Branch[];
    taxes: Tax[];
}

const CATEGORIES = [
    "Engine",
    "Transmission",
    "Brakes",
    "Suspension",
    "Electrical",
    "Body",
    "Tyres",
    "Fluids",
    "Filters",
    "Belts",
    "Cooling",
    "Exhaust",
    "Interior",
    "Other",
];

const UNITS = ["piece", "litre", "kg", "metre", "set", "pair", "box"];

export const QuickAddInventoryPartModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    branches, 
    taxes 
}: QuickAddInventoryPartModalProps) => {
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [partName, setPartName] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [category, setCategory] = useState('Engine');
    const [description, setDescription] = useState('');
    const [unit, setUnit] = useState('piece');
    const [unitCost, setUnitCost] = useState<number>(0);
    const [quantityOnHand, setQuantityOnHand] = useState<number>(0);
    const [reorderLevel, setReorderLevel] = useState<number>(5);
    const [branchId, setBranchId] = useState('');

    // Optional Fields
    const [supplierId, setSupplierId] = useState('');
    const [supplierPartNumber, setSupplierPartNumber] = useState('');
    const [leadTimeDays, setLeadTimeDays] = useState<number>(7);

    // Accounting Integration
    const [inventoryAccountId, setInventoryAccountId] = useState('');
    const [purchaseAccountId, setPurchaseAccountId] = useState('');
    const [incomeAccountId, setIncomeAccountId] = useState('');
    const [taxId, setTaxId] = useState('');

    // Loaded Lists
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [loadingResources, setLoadingResources] = useState(false);

    // Load suppliers and accounting codes when the modal is opened
    useEffect(() => {
        if (!isOpen) return;

        const loadResources = async () => {
            setLoadingResources(true);
            try {
                const [supplierRes, acctRes] = await Promise.all([
                    getAllSuppliers({ limit: 100 }),
                    getAllAccountingCodes({ limit: 1000 })
                ]);
                setSuppliers(supplierRes.data || []);
                
                const rawAccts = acctRes.data || acctRes;
                setAccountingCodes(Array.isArray(rawAccts) ? rawAccts : []);
            } catch (err) {
                console.error("Error loading supporting data in quick add modal:", err);
            } finally {
                setLoadingResources(false);
            }
        };

        loadResources();

        // Preset first branch if available
        if (branches.length > 0) {
            setBranchId(branches[0]._id);
        }
    }, [isOpen, branches]);

    const resetForm = () => {
        setPartName('');
        setPartNumber('');
        setCategory('Engine');
        setDescription('');
        setUnit('piece');
        setUnitCost(0);
        setQuantityOnHand(0);
        setReorderLevel(5);
        setBranchId(branches[0]?._id || '');
        setSupplierId('');
        setSupplierPartNumber('');
        setLeadTimeDays(7);
        setInventoryAccountId('');
        setPurchaseAccountId('');
        setIncomeAccountId('');
        setTaxId('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partName.trim()) { toast.error('Part name is required'); return; }
        if (!partNumber.trim()) { toast.error('Part number (SKU) is required'); return; }
        if (!category) { toast.error('Please select a category'); return; }
        if (!branchId) { toast.error('Please select a branch location'); return; }
        if (unitCost <= 0) { toast.error('Please specify a valid unit cost'); return; }

        setSubmitting(true);
        const toastId = toast.loading('Registering inventory item...');
        try {
            const payload: any = {
                partName: partName.trim(),
                partNumber: partNumber.trim().toUpperCase(),
                category,
                description: description.trim() || undefined,
                unit,
                unitCost: Number(unitCost),
                quantityOnHand: Number(quantityOnHand),
                reorderLevel: Number(reorderLevel),
                branchId,
                leadTimeDays: Number(leadTimeDays),
            };

            if (supplierId) payload.supplierId = supplierId;
            if (supplierPartNumber.trim()) payload.supplierPartNumber = supplierPartNumber.trim();
            if (inventoryAccountId) payload.inventoryAccountId = inventoryAccountId;
            if (purchaseAccountId) payload.purchaseAccountId = purchaseAccountId;
            if (incomeAccountId) payload.incomeAccountId = incomeAccountId;
            if (taxId) payload.taxId = taxId;

            const res = await createPart(payload);
            toast.success('Inventory part registered successfully!', { id: toastId });
            resetForm();
            
            // Extract the created part object from response
            const newPart = (res as any).data || res;
            onSuccess(newPart);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to register inventory part', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200 custom-scrollbar"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b bg-white/[0.01]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.12)', border: '1px solid rgba(200,230,0,0.25)' }}>
                            <Wrench size={16} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">Create Inventory Item</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Add a new vehicle part or service to the stock registry</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        type="button"
                        className="p-2 rounded-xl border transition-all hover:bg-white/10 active:scale-95 cursor-pointer text-dim"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 text-xs font-semibold">
                    
                    {/* ── Section: Part Configuration ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Sparkles size={12} /> Item Details
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Part Name */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Part Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Brake Pad Front"
                                    value={partName}
                                    onChange={e => setPartName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Part Number (SKU) */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Part Number (SKU) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. BP-4001"
                                    value={partNumber}
                                    onChange={e => setPartNumber(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Category <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat} style={{ background: 'var(--bg-card)' }}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit Format */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Unit Format <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={unit}
                                    onChange={e => setUnit(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {UNITS.map(u => (
                                        <option key={u} value={u} style={{ background: 'var(--bg-card)' }}>{u}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit Cost */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Standard Cost / Price ($) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="45.00"
                                    value={unitCost || ''}
                                    onChange={e => setUnitCost(Number(e.target.value))}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Reorder Level */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Reorder Level <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="5"
                                    value={reorderLevel}
                                    onChange={e => setReorderLevel(Number(e.target.value))}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Initial Qty on Hand */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Initial Stock on Hand
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="100"
                                    value={quantityOnHand || ''}
                                    onChange={e => setQuantityOnHand(Number(e.target.value))}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Branch / Location */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Workshop / Location <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={branchId}
                                    onChange={e => setBranchId(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="" disabled>Select workshop...</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)' }}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Specify details, brand, or location..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none resize-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Supplier Details ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <ShoppingBag size={12} /> Supplier Info (Optional)
                        </p>
                        {loadingResources ? (
                            <div className="text-[10px] font-bold text-dim animate-pulse py-2">Loading supplier registry...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Supplier */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Supplier Vendor</label>
                                    <select
                                        value={supplierId}
                                        onChange={e => setSupplierId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">— Choose Supplier —</option>
                                        {suppliers.map(s => (
                                            <option key={s._id} value={s._id} style={{ background: 'var(--bg-card)' }}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Supplier SKU */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Supplier SKU</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. SKU-839"
                                        value={supplierPartNumber}
                                        onChange={e => setSupplierPartNumber(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>

                                {/* Lead Time */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Lead Time (Days)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="7"
                                        value={leadTimeDays}
                                        onChange={e => setLeadTimeDays(Number(e.target.value))}
                                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Section: Accounting Configuration ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Calculator size={12} /> Accounting Integration (Optional)
                        </p>
                        {loadingResources ? (
                            <div className="text-[10px] font-bold text-dim animate-pulse py-2">Loading accounting ledger accounts...</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Inventory Asset Account */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Asset Account</label>
                                    <select
                                        value={inventoryAccountId}
                                        onChange={e => setInventoryAccountId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-[10px] font-semibold border outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">— Default: AST0001 —</option>
                                        {accountingCodes
                                            .filter(c => c.category === 'ASSET')
                                            .map(c => (
                                                <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.code} - {c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* COGS Account */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>COGS Account</label>
                                    <select
                                        value={purchaseAccountId}
                                        onChange={e => setPurchaseAccountId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-[10px] font-semibold border outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">— Default: CGS0001 —</option>
                                        {accountingCodes
                                            .filter(c => c.category === 'EXPENSE' || c.category === 'ASSET')
                                            .map(c => (
                                                <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.code} - {c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Sales Income Account */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Income Account</label>
                                    <select
                                        value={incomeAccountId}
                                        onChange={e => setIncomeAccountId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-[10px] font-semibold border outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">— Default: IN0008 —</option>
                                        {accountingCodes
                                            .filter(c => c.category === 'INCOME')
                                            .map(c => (
                                                <option key={c._id} value={c._id} style={{ background: 'var(--bg-card)' }}>{c.code} - {c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Tax */}
                                <div>
                                    <label className="text-[9px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-dim)' }}>Default Tax</label>
                                    <select
                                        value={taxId}
                                        onChange={e => setTaxId(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl text-[10px] font-semibold border outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">— Default: ITBMS —</option>
                                        {taxes.map(t => (
                                            <option key={t._id} value={t._id} style={{ background: 'var(--bg-card)' }}>{t.name} ({t.rate}%)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer text-dim"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !partName.trim() || !partNumber.trim() || !branchId || unitCost <= 0}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {submitting ? (
                                <><RefreshCw size={13} className="animate-spin" /> Registering...</>
                            ) : (
                                <><Sparkles size={13} /> Create Item</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickAddInventoryPartModal;
