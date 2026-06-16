import { useState, useEffect, useCallback } from 'react';
import { X, Landmark, Calendar, ShoppingBag, FolderOpen, Coins, HelpCircle } from 'lucide-react';
import { getAllSuppliers, type Supplier } from '../../../../services/supplierService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import { getAllBills, type Bill } from '../../../../services/billService';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddSupplierModal } from '../../../../components/common/QuickAddSupplierModal';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface SelectedBillItem {
    billId: string;
    billNumber: string;
    totalAmount: number;
    balanceDue: number;
    amountApplied: number;
}

const CreatePaymentMadeModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    
    // Form Inputs
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [paidThroughAccount, setPaidThroughAccount] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [referenceNumber, setReferenceNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Settlement Bills
    const [outstandingBills, setOutstandingBills] = useState<SelectedBillItem[]>([]);
    const [loadingBills, setLoadingBills] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [loadingMasters, setLoadingMasters] = useState(false);

    // Quick Add Modal States
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoadingMasters(true);
        try {
            const [supplierRes, branchRes, codesRes] = await Promise.all([
                getAllSuppliers({ limit: 300 }),
                getAllBranches({ limit: 100 }),
                getAllAccountingCodes()
            ]);
            
            setSuppliers(supplierRes.data || []);
            setBranches(branchRes.data || []);
            setAccountingCodes(codesRes || []);
        } catch (err) {
            console.error('Failed to load transaction master data', err);
            toast.error('Failed to load drop directories.');
        } finally {
            setLoadingMasters(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset
            setSelectedSupplier('');
            setAmount('');
            setPaidThroughAccount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('Bank Transfer');
            setSelectedBranch('');
            setReferenceNumber('');
            setNotes('');
            setOutstandingBills([]);
        }
    }, [isOpen, fetchData]);

    // Fetch vendor bills when supplier changes
    useEffect(() => {
        const fetchSupplierBills = async () => {
            if (!selectedSupplier) {
                setOutstandingBills([]);
                return;
            }
            setLoadingBills(true);
            try {
                const res = await getAllBills({ limit: 500 });
                if (res && res.data) {
                    const filtered = res.data
                        .filter((b: Bill) => {
                            const supId = typeof b.supplier === 'object' ? b.supplier._id : b.supplier;
                            return supId === selectedSupplier && (b.status === 'OPEN' || b.status === 'PARTIALLY_PAID');
                        })
                        .map((b: Bill) => ({
                            billId: b._id,
                            billNumber: b.billNumber,
                            totalAmount: b.totalAmount,
                            balanceDue: b.balanceDue,
                            amountApplied: 0
                        }));
                    setOutstandingBills(filtered);
                }
            } catch (err) {
                console.error('Error loading outstanding bills:', err);
                toast.error('Failed to retrieve outstanding bills.');
            } finally {
                setLoadingBills(false);
            }
        };

        fetchSupplierBills();
    }, [selectedSupplier]);

    // Handlers
    const handleBillAmountChange = (index: number, val: string) => {
        const parsed = parseFloat(val) || 0;
        const updated = [...outstandingBills];
        
        // Clamp between 0 and bill balanceDue
        const max = updated[index].balanceDue;
        updated[index].amountApplied = Math.max(0, Math.min(parsed, max));
        setOutstandingBills(updated);
    };

    // Zoho Chronological Auto Apply Funds logic
    const autoApplyFunds = () => {
        const totalFunds = parseFloat(amount) || 0;
        if (totalFunds <= 0) {
            toast.error('Enter a valid Payment Amount first to auto-apply.');
            return;
        }

        let remainingFunds = totalFunds;
        const updated = outstandingBills.map(bill => {
            if (remainingFunds <= 0) {
                return { ...bill, amountApplied: 0 };
            }
            const apply = Math.min(bill.balanceDue, remainingFunds);
            remainingFunds -= apply;
            return { ...bill, amountApplied: parseFloat(apply.toFixed(2)) };
        });

        setOutstandingBills(updated);
        toast.success('Chronological Zoho allocation complete!');
    };

    // Calculate applied & leftover advances
    const totalApplied = outstandingBills.reduce((sum, b) => sum + b.amountApplied, 0);
    const advanceAmount = Math.max(0, (parseFloat(amount) || 0) - totalApplied);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier) { toast.error('Please select a Supplier/Vendor'); return; }
        if (!amount || parseFloat(amount) <= 0) { toast.error('Please enter a valid Amount'); return; }
        if (!paidThroughAccount) { toast.error('Please select a Paid Through bank/cash account'); return; }
        if (!selectedBranch) { toast.error('Please select a branch'); return; }

        setSubmitting(true);
        try {
            const payload = {
                supplier: selectedSupplier,
                amount: parseFloat(amount),
                paymentDate,
                paymentMethod,
                paidThroughAccount,
                referenceNumber: referenceNumber.trim() || undefined,
                notes: notes.trim(),
                branch: selectedBranch,
                bills: outstandingBills
                    .filter(b => b.amountApplied > 0)
                    .map(b => ({
                        billId: b.billId,
                        billNumber: b.billNumber,
                        amountApplied: b.amountApplied
                    }))
            };

            await api.post('/api/payments-made', payload);
            toast.success('Payment recorded! Accounting Ledger double-entry posted.');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.message || 'Failed to record supplier payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Filter to only show bank/cash accounts (ASSETS)
    const assetAccounts = accountingCodes.filter(acc => acc.category === 'ASSET');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-md transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div 
                className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border shadow-2xl flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-200 select-text"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute right-6 top-6 p-2 rounded-xl border hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <X size={15} />
                </button>

                {/* Title */}
                <div className="mb-6 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 border border-brand-lime/25 flex items-center justify-center">
                        <Coins className="text-brand-lime" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Record Payment Made</h2>
                        <p className="text-[10px] font-semibold text-dim">Settle outstanding bills or log advance payments to suppliers</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Grid Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Supplier */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <ShoppingBag size={12} className="text-brand-lime" /> Supplier / Vendor *
                            </label>
                            <SearchableSelect
                                options={suppliers.map(s => ({ value: s._id, label: `${s.name} (${s.contactPerson})` }))}
                                value={selectedSupplier}
                                onChange={setSelectedSupplier}
                                placeholder="Select Supplier"
                                onAddNew={() => setIsAddSupplierOpen(true)}
                                addNewText="Add New Supplier"
                                isLoading={loadingMasters}
                            />
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Coins size={12} className="text-brand-lime" /> Amount Paid ($) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-lime/10"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Paid Through Account */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Landmark size={12} className="text-brand-lime" /> Paid Through Account *
                            </label>
                            <SearchableSelect
                                options={assetAccounts.map(acc => ({
                                    value: acc._id,
                                    label: `${acc.code} - ${acc.name}`
                                }))}
                                value={paidThroughAccount}
                                onChange={setPaidThroughAccount}
                                placeholder="Select Asset Account"
                                onAddNew={() => setIsAddAccountOpen(true)}
                                addNewText="Add New Account"
                                required
                                isLoading={loadingMasters}
                            />
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Calendar size={12} className="text-brand-lime" /> Payment Date *
                            </label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none cursor-pointer"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Coins size={12} className="text-brand-lime" /> Payment Method *
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none cursor-pointer"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Card">Card</option>
                                <option value="Cheque">Cheque</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Branch */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <FolderOpen size={12} className="text-brand-lime" /> Operating Branch *
                            </label>
                            <SearchableSelect
                                options={branches.map(b => ({ value: b._id, label: `${b.name} (${b.code})` }))}
                                value={selectedBranch}
                                onChange={setSelectedBranch}
                                placeholder="Select Branch"
                                required
                                isLoading={loadingMasters}
                            />
                        </div>
                    </div>

                    {/* Optional Reference and Notes row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim">Reference # (Optional)</label>
                            <input
                                type="text"
                                placeholder="E.g., CHQ-00918"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-lime/10"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim">Notes / Memo (Optional)</label>
                            <input
                                type="text"
                                placeholder="Internal record keeping details..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-lime/10"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    {/* Settlement Area */}
                    <div className="border rounded-[2rem] overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <div className="px-5 py-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Settle Supplier Invoices / Bills</h4>
                                <p className="text-[10px] font-medium text-dim mt-0.5">Apply payment to unpaid purchase orders or bills</p>
                            </div>
                            {selectedSupplier && outstandingBills.length > 0 && (
                                <button
                                    type="button"
                                    onClick={autoApplyFunds}
                                    className="px-4 py-1.5 bg-brand-lime text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                >
                                    Auto-Apply Funds Chronologically
                                </button>
                            )}
                        </div>

                        <div className="p-4 overflow-x-auto">
                            {!selectedSupplier ? (
                                <div className="py-8 text-center text-xs text-dim italic">
                                    Please select a Supplier / Vendor to pull outstanding invoices.
                                </div>
                            ) : loadingBills ? (
                                <div className="py-8 text-center text-xs text-brand-lime font-black uppercase tracking-widest">
                                    Retrieving outstanding bills...
                                </div>
                            ) : outstandingBills.length === 0 ? (
                                <div className="py-8 text-center text-xs text-dim italic">
                                    No outstanding bills / invoices detected for this vendor. Amount paid will book completely as a Prepayment Advance.
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-left text-xs font-semibold">
                                    <thead className="text-[9px] font-bold text-dim uppercase" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                        <tr>
                                            <th className="py-2.5 px-4">Bill Number</th>
                                            <th className="py-2.5 px-4 text-right">Original Amount</th>
                                            <th className="py-2.5 px-4 text-right">Balance Due</th>
                                            <th className="py-2.5 px-4 text-right w-[200px]">Amount to Settle</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: 'var(--text-main)' }}>
                                        {outstandingBills.map((bill, index) => (
                                            <tr key={bill.billId} className="border-b last:border-0" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="py-3 px-4 font-black">{bill.billNumber}</td>
                                                <td className="py-3 px-4 text-right opacity-80">${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3 px-4 text-right text-rose-400 font-bold">${bill.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        max={bill.balanceDue}
                                                        value={bill.amountApplied || ''}
                                                        onChange={(e) => handleBillAmountChange(index, e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-32 px-3 py-1.5 rounded-lg border text-right font-mono font-bold text-xs outline-none focus:border-brand-lime"
                                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Prepayment Advance Summary Card */}
                    {parseFloat(amount) > 0 && (
                        <div className="p-5 rounded-[2rem] border space-y-3.5" style={{ background: 'rgba(200, 230, 0, 0.02)', borderColor: 'rgba(200, 230, 0, 0.1)' }}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <div>
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[#C8E600] flex items-center gap-1.5">
                                        <HelpCircle size={12} /> Zoho Books Advance Calculation preview
                                    </h5>
                                    <p className="text-[9px] font-medium text-dim mt-0.5">Prepayments represent debit assets under Accounts Payable</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center border-t border-white/5 pt-3" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Total Payment</span>
                                    <span className="text-sm font-black text-white mt-1 block" style={{ color: 'var(--text-main)' }}>${fmt(parseFloat(amount) || 0)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Applied to Bills</span>
                                    <span className="text-sm font-black text-emerald-500 mt-1 block">${fmt(totalApplied)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Supplier Prepayment</span>
                                    <span className="text-sm font-black text-rose-400 mt-1 block">${fmt(advanceAmount)}</span>
                                </div>
                            </div>
                            {advanceAmount > 0 && (
                                <p className="text-[9px] font-semibold text-rose-300 italic opacity-80 text-center leading-relaxed">
                                    * The leftover ${fmt(advanceAmount)} will book as a Supplier Prepayment advance credit balance in Accounts Payable (2.1.01) to settle future bills.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 border-t pt-6" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wide transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-xl text-black bg-brand-lime text-xs font-black uppercase tracking-wide hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {submitting ? 'Recording Payment...' : 'Record Payment'}
                        </button>
                    </div>

                </form>
            </div>

            {/* Quick Add Modals */}
            <QuickAddSupplierModal
                isOpen={isAddSupplierOpen}
                onClose={() => setIsAddSupplierOpen(false)}
                onSuccess={async (newSup) => {
                    try {
                        const supplierRes = await getAllSuppliers({ limit: 300 });
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
                defaultCategory="ASSET"
                onSuccess={async (newAcc) => {
                    try {
                        const codesRes = await getAllAccountingCodes();
                        setAccountingCodes(codesRes || []);
                        setPaidThroughAccount(newAcc._id);
                    } catch (err) {
                        console.error('Failed to reload accounts', err);
                    }
                }}
            />
        </div>
    );
};

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default CreatePaymentMadeModal;
