import { useState, useEffect, useCallback } from 'react';
import { X, Landmark, Calendar, FileText, User, ShoppingBag, FolderOpen, Tag, CreditCard } from 'lucide-react';
import { createExpense } from '../../../../services/expenseService';
import { getAllSuppliers, type Supplier } from '../../../../services/supplierService';
import { driverService, type Driver } from '../../../../services/driverService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddSupplierModal } from '../../../../components/common/QuickAddSupplierModal';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';
import { QuickAddDriverModal } from '../../../../components/common/QuickAddDriverModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateExpenseModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);

    const [expenseAccount, setExpenseAccount] = useState<string>('');
    const [paidThroughAccount, setPaidThroughAccount] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [expenseNumber, setExpenseNumber] = useState<string>('');

    const [submitting, setSubmitting] = useState(false);

    // Quick Add Modal States
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    const [accountTarget, setAccountTarget] = useState<'EXPENSE' | 'PAID_THROUGH'>('EXPENSE');

    const fetchData = useCallback(async () => {
        try {
            const [supplierRes, driverRes, branchRes, codesRes] = await Promise.all([
                getAllSuppliers({ limit: 200 }),
                driverService.getAllDrivers({ limit: 200 }),
                getAllBranches({ limit: 200 }),
                getAllAccountingCodes()
            ]);
            
            setSuppliers(supplierRes.data || []);
            setDrivers(driverRes.data || []);
            setBranches(branchRes.data || []);
            setAccountingCodes(codesRes || []);
        } catch (err) {
            console.error('Failed to load dependency data for Expense creation', err);
            toast.error('Failed to load dropdown directories.');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset state
            setExpenseAccount('');
            setPaidThroughAccount('');
            setAmount('');
            setExpenseDate(new Date().toISOString().split('T')[0]);
            setSelectedBranch('');
            setSelectedSupplier('');
            setSelectedCustomer('');
            setNotes('');
            setExpenseNumber('');
        }
    }, [isOpen, fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseAccount) { toast.error('Please select an Expense account (Debit)'); return; }
        if (!paidThroughAccount) { toast.error('Please select a Paid Through account (Credit)'); return; }
        if (!amount || parseFloat(amount) <= 0) { toast.error('Please enter a valid expense amount'); return; }
        if (!selectedBranch) { toast.error('Please select a branch'); return; }

        setSubmitting(true);
        try {
            await createExpense({
                expenseNumber: expenseNumber.trim() || undefined,
                expenseAccount,
                paidThroughAccount,
                amount: parseFloat(amount),
                expenseDate,
                branch: selectedBranch,
                supplier: selectedSupplier || undefined,
                customer: selectedCustomer || undefined,
                notes: notes.trim()
            });

            toast.success('Expense recorded and journal entry successfully generated!');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to record expense');
        } finally {
            setSubmitting(false);
        }
    };

    // Helper to get matching account names for preview
    const getAccountLabel = (id: string) => {
        const found = accountingCodes.find(c => c._id === id);
        return found ? `${found.code} - ${found.name}` : 'Not selected';
    };

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const previewAmount = parseFloat(amount) || 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[92vh] flex flex-col border rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center">
                            <CreditCard size={17} className="text-brand-lime" />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Record Expense</h2>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#C8E600]">Zoho Direct Expense Entry</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Expense Account (Debit) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={11} className="text-brand-lime" /> Expense Account (DEBIT) <span className="text-rose-400">*</span>
                                </label>
                                <SearchableSelect
                                    options={accountingCodes.map(code => ({
                                        value: code._id,
                                        label: `${code.code} - ${code.name} (${code.category})`
                                    }))}
                                    value={expenseAccount}
                                    onChange={setExpenseAccount}
                                    placeholder="Select Expense Account"
                                    onAddNew={() => {
                                        setAccountTarget('EXPENSE');
                                        setIsAddAccountOpen(true);
                                    }}
                                    addNewText="Add New Account"
                                    required
                                />
                            </div>

                            {/* Paid Through (Credit) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Landmark size={11} className="text-[#C8E600]" /> Paid Through (CREDIT) <span className="text-rose-400">*</span>
                                </label>
                                <SearchableSelect
                                    options={accountingCodes.map(code => ({
                                        value: code._id,
                                        label: `${code.code} - ${code.name} (${code.category})`
                                    }))}
                                    value={paidThroughAccount}
                                    onChange={setPaidThroughAccount}
                                    placeholder="Select Cash/Bank Account"
                                    onAddNew={() => {
                                        setAccountTarget('PAID_THROUGH');
                                        setIsAddAccountOpen(true);
                                    }}
                                    addNewText="Add New Account"
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={11} /> Amount ($) <span className="text-rose-400">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black" style={{ color: 'var(--text-dim)' }}>$</span>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        required 
                                        placeholder="0.00"
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border rounded-2xl text-sm font-black outline-none focus:border-brand-lime"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                    />
                                </div>
                            </div>

                            {/* Expense Date */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <Calendar size={11} /> Expense Date <span className="text-rose-400">*</span>
                                </label>
                                <input 
                                    type="date"
                                    required 
                                    value={expenseDate} 
                                    onChange={e => setExpenseDate(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-xs font-bold outline-none focus:border-brand-lime cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                />
                            </div>

                            {/* Vendor / Supplier (Optional) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <ShoppingBag size={11} /> Vendor / Supplier (Optional)
                                </label>
                                <SearchableSelect
                                    options={suppliers.map(s => ({ value: s._id, label: s.name }))}
                                    value={selectedSupplier}
                                    onChange={setSelectedSupplier}
                                    placeholder="Select Vendor"
                                    onAddNew={() => setIsAddSupplierOpen(true)}
                                    addNewText="Add New Vendor"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Customer / Driver (Optional) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <User size={11} /> Customer / Driver (Optional)
                                </label>
                                <SearchableSelect
                                    options={drivers.map(d => ({
                                        value: d._id,
                                        label: `${d.personalInfo?.fullName} (${d.driverId || 'Driver'})`
                                    }))}
                                    value={selectedCustomer}
                                    onChange={setSelectedCustomer}
                                    placeholder="Select Customer / Driver"
                                    onAddNew={() => setIsAddDriverOpen(true)}
                                    addNewText="Add New Customer"
                                    disabled={submitting}
                                />
                            </div>

                            {/* Branch */}
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
                                    disabled={submitting}
                                />
                            </div>

                            {/* Expense Number */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                    <FileText size={11} /> Reference / Expense # (Optional)
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. EXP-10025 (empty for auto-gen)"
                                    value={expenseNumber} 
                                    onChange={e => setExpenseNumber(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-2xl text-xs font-bold outline-none focus:border-brand-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Notes / Description</label>
                            <textarea
                                rows={3}
                                placeholder="Details about this expense (e.g. Minor vehicle service, office supplies purchases...)"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full px-4 py-3 border rounded-2xl text-xs font-medium outline-none resize-none focus:border-brand-lime transition-colors"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Double Entry Visual Preview */}
                        <div className="border rounded-2xl overflow-hidden shadow-inner flex flex-col" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>General Ledger Double-Entry Booking preview</p>
                                <Tag size={12} className="text-brand-lime" />
                            </div>
                            <div className="p-5 space-y-3.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="font-bold uppercase text-[9px] text-[#C8E600]">DEBIT (Charge)</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{getAccountLabel(expenseAccount)}</span>
                                    </div>
                                    <span className="font-black text-sm" style={{ color: 'var(--text-main)' }}>${fmt(previewAmount)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t pt-3" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex flex-col">
                                        <span className="font-bold uppercase text-[9px] text-rose-400">CREDIT (Asset Redux)</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{getAccountLabel(paidThroughAccount)}</span>
                                    </div>
                                    <span className="font-black text-rose-400 text-sm">${fmt(previewAmount)}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>

                {/* Footer */}
                <div className="px-8 py-5 border-t flex items-center justify-between gap-4 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Expense Total</span>
                        <span className="text-xl font-black text-brand-lime">${fmt(previewAmount)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95 cursor-pointer"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={submitting || previewAmount <= 0 || !expenseAccount || !paidThroughAccount || !selectedBranch}
                            className="flex items-center justify-center gap-2 px-8 py-2.5 bg-[#C8E600] text-black font-black text-[11px] uppercase tracking-wide rounded-xl shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer animate-pulse-slow"
                        >
                            <CreditCard size={14} strokeWidth={2.5} />
                            {submitting ? 'Recording...' : 'Record Expense'}
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
                onClose={() => setIsAddAccountOpen(false)}
                defaultCategory={accountTarget === 'EXPENSE' ? 'EXPENSE' : 'ASSET'}
                onSuccess={async (newAcc) => {
                    try {
                        const codesRes = await getAllAccountingCodes();
                        setAccountingCodes(codesRes || []);
                        if (accountTarget === 'EXPENSE') {
                            setExpenseAccount(newAcc._id);
                        } else {
                            setPaidThroughAccount(newAcc._id);
                        }
                    } catch (err) {
                        console.error('Failed to reload accounts', err);
                    }
                }}
            />

            <QuickAddDriverModal
                isOpen={isAddDriverOpen}
                onClose={() => setIsAddDriverOpen(false)}
                defaultBranchId={selectedBranch}
                onSuccess={async (newDriver) => {
                    try {
                        const driverRes = await driverService.getAllDrivers({ limit: 200 });
                        setDrivers(driverRes.data || []);
                        setSelectedCustomer(newDriver._id);
                    } catch (err) {
                        console.error('Failed to reload drivers', err);
                    }
                }}
            />
        </div>
    );
};

export default CreateExpenseModal;
