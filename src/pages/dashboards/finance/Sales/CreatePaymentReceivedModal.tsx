import React, { useState, useEffect, useCallback } from 'react';
import { X, Landmark, Calendar, FileText, User, FolderOpen, Coins, HelpCircle } from 'lucide-react';
import { getAllDrivers, type Driver } from '../../../../services/driverService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../../services/accountingService';
import { getPendingInvoicesByDriver, type Invoice } from '../../../../services/invoiceService';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../../../../components/common/SearchableSelect';
import { QuickAddAccountModal } from '../../../../components/common/QuickAddAccountModal';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface SelectedInvoiceItem {
    invoiceId: string;
    invoiceNumber: string;
    totalAmountDue: number;
    balance: number;
    amountApplied: number;
}

const CreatePaymentReceivedModal = ({ isOpen, onClose, onSuccess }: Props) => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);

    // Form Inputs
    const [driverSearch, setDriverSearch] = useState('');
    const [showDriverList, setShowDriverList] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

    const [amount, setAmount] = useState<string>('');
    const [depositedTo, setDepositedTo] = useState<string>('');
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [referenceNumber, setReferenceNumber] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Settlement Invoices
    const [outstandingInvoices, setOutstandingInvoices] = useState<SelectedInvoiceItem[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Quick Add Modal States
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [driverRes, branchRes, codesRes] = await Promise.all([
                getAllDrivers({ status: 'ACTIVE', limit: 300 }),
                getAllBranches({ limit: 100 }),
                getAllAccountingCodes()
            ]);

            setDrivers(driverRes.data || (driverRes as any).drivers || []);
            setBranches(branchRes.data || []);
            setAccountingCodes(codesRes || []);
        } catch (err) {
            console.error('Failed to load transaction master data', err);
            toast.error('Failed to load directory dropdowns.');
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchData();
            // Reset fields
            setSelectedDriver(null);
            setDriverSearch('');
            setAmount('');
            setDepositedTo('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('Bank Transfer');
            setSelectedBranch('');
            setReferenceNumber('');
            setNotes('');
            setOutstandingInvoices([]);
        }
    }, [isOpen, fetchData]);

    // Fetch outstanding invoices when driver changes
    useEffect(() => {
        const fetchDriverInvoices = async () => {
            if (!selectedDriver) {
                setOutstandingInvoices([]);
                return;
            }
            setLoadingInvoices(true);
            try {
                const res = await getPendingInvoicesByDriver(selectedDriver._id);
                if (res) {
                    const formatted = res.map((inv: Invoice) => ({
                        invoiceId: inv._id,
                        invoiceNumber: inv.invoiceNumber,
                        totalAmountDue: inv.totalAmountDue,
                        balance: inv.balance,
                        amountApplied: 0
                    }));
                    setOutstandingInvoices(formatted);
                }
            } catch (err) {
                console.error('Error loading outstanding invoices:', err);
                toast.error('Failed to retrieve outstanding invoices.');
            } finally {
                setLoadingInvoices(false);
            }
        };

        fetchDriverInvoices();
    }, [selectedDriver]);

    // Handlers
    const handleInvoiceAmountChange = (index: number, val: string) => {
        const parsed = parseFloat(val) || 0;
        const updated = [...outstandingInvoices];
        
        // Clamp between 0 and invoice open balance
        const max = updated[index].balance;
        updated[index].amountApplied = Math.max(0, Math.min(parsed, max));
        setOutstandingInvoices(updated);
    };

    // Auto Apply Funds (Oldest to Newest)
    const autoApplyFunds = () => {
        const totalFunds = parseFloat(amount) || 0;
        if (totalFunds <= 0) {
            toast.error('Enter a valid Payment Amount first to auto-apply.');
            return;
        }

        let remainingFunds = totalFunds;
        const updated = outstandingInvoices.map(inv => {
            if (remainingFunds <= 0) {
                return { ...inv, amountApplied: 0 };
            }
            const apply = Math.min(inv.balance, remainingFunds);
            remainingFunds -= apply;
            return { ...inv, amountApplied: parseFloat(apply.toFixed(2)) };
        });

        setOutstandingInvoices(updated);
        toast.success('Chronological Zoho allocation complete!');
    };

    // Calculations
    const totalApplied = outstandingInvoices.reduce((sum, inv) => sum + inv.amountApplied, 0);
    const advanceAmount = Math.max(0, (parseFloat(amount) || 0) - totalApplied);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriver) { toast.error('Please select a Customer / Driver'); return; }
        if (!amount || parseFloat(amount) <= 0) { toast.error('Please enter a valid Amount'); return; }
        if (!depositedTo) { toast.error('Please select a Deposit Bank/Cash Account'); return; }
        if (!selectedBranch) { toast.error('Please select a branch'); return; }

        setSubmitting(true);
        try {
            const payload = {
                driverId: selectedDriver._id,
                amountReceived: parseFloat(amount),
                paymentDate,
                paymentMethod,
                depositedTo,
                referenceNumber: referenceNumber.trim() || undefined,
                notes: notes.trim(),
                branch: selectedBranch,
                invoices: outstandingInvoices
                    .filter(inv => inv.amountApplied > 0)
                    .map(inv => ({
                        invoiceId: inv.invoiceId,
                        invoiceNumber: inv.invoiceNumber,
                        amountApplied: inv.amountApplied
                    }))
            };

            await api.post('/api/payments-received', payload);
            toast.success('Payment recorded! Accounting Ledger double-entry posted.');
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.message || 'Failed to record customer payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Filter to only show bank/cash accounts (ASSETS)
    const assetAccounts = accountingCodes.filter(acc => acc.category === 'ASSET');

    // Search filter for drivers
    const filteredDrivers = drivers.filter(d =>
        d.personalInfo?.fullName?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.driverId?.toLowerCase().includes(driverSearch.toLowerCase())
    );

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
                        <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Record Payment Received</h2>
                        <p className="text-[10px] font-semibold text-dim">Settle outstanding driver invoices or record payment receipts</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Grid Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Customer / Driver */}
                        <div className="space-y-2 relative">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <User size={12} className="text-brand-lime" /> Customer / Driver *
                            </label>
                            <input
                                type="text"
                                placeholder="Search driver by name or ID..."
                                value={selectedDriver ? `${selectedDriver.personalInfo?.fullName} (${selectedDriver.driverId})` : driverSearch}
                                onChange={e => { setDriverSearch(e.target.value); setSelectedDriver(null); setShowDriverList(true); }}
                                onFocus={() => setShowDriverList(true)}
                                className="w-full px-4 py-3 border rounded-2xl text-xs font-semibold outline-none transition-all"
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
                            {selectedDriver && (
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg border" style={{ background: 'var(--bg-input)', color: 'var(--brand-lime)', borderColor: 'var(--border-main)' }}>
                                        ✓ {selectedDriver.personalInfo?.fullName} · {selectedDriver.driverId}
                                    </span>
                                    <button type="button" onClick={() => { setSelectedDriver(null); setDriverSearch(''); }} className="text-[9px] font-black text-rose-400 hover:text-rose-300">✕ Change</button>
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Coins size={12} className="text-brand-lime" /> Amount Received ($) *
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

                        {/* Deposited To Account */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                <Landmark size={12} className="text-brand-lime" /> Deposited To Account *
                            </label>
                            <SearchableSelect
                                options={assetAccounts.map(acc => ({
                                    value: acc._id,
                                    label: `${acc.code} - ${acc.name}`
                                }))}
                                value={depositedTo}
                                onChange={setDepositedTo}
                                placeholder="Select Asset Account"
                                onAddNew={() => setIsAddAccountOpen(true)}
                                addNewText="Add New Account"
                                required
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
                                <option value="Mobile Money">Mobile Money</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Operating Branch */}
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
                            />
                        </div>
                    </div>

                    {/* Reference and Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim">Reference # (Optional)</label>
                            <input
                                type="text"
                                placeholder="E.g., REF-99081"
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
                                placeholder="Customer payment documentation notes..."
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
                                <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Settle Driver Invoices</h4>
                                <p className="text-[10px] font-medium text-dim mt-0.5">Apply payment to unpaid manual or auto-generated invoices</p>
                            </div>
                            {selectedDriver && outstandingInvoices.length > 0 && (
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
                            {!selectedDriver ? (
                                <div className="py-8 text-center text-xs text-dim italic">
                                    Please search and select a Driver to retrieve outstanding invoices.
                                </div>
                            ) : loadingInvoices ? (
                                <div className="py-8 text-center text-xs text-brand-lime font-black uppercase tracking-widest">
                                    Retrieving outstanding invoices...
                                </div>
                            ) : outstandingInvoices.length === 0 ? (
                                <div className="py-8 text-center text-xs text-dim italic">
                                    No outstanding invoices detected for this customer. Funds will be booked as an advance customer credit balance.
                                </div>
                            ) : (
                                <table className="w-full border-collapse text-left text-xs font-semibold">
                                    <thead className="text-[9px] font-bold text-dim uppercase" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                        <tr>
                                            <th className="py-2.5 px-4">Invoice Number</th>
                                            <th className="py-2.5 px-4 text-right">Original Amount Due</th>
                                            <th className="py-2.5 px-4 text-right">Open Balance</th>
                                            <th className="py-2.5 px-4 text-right w-[200px]">Amount to Settle</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ color: 'var(--text-main)' }}>
                                        {outstandingInvoices.map((inv, index) => (
                                            <tr key={inv.invoiceId} className="border-b last:border-0" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="py-3 px-4 font-black">{inv.invoiceNumber}</td>
                                                <td className="py-3 px-4 text-right opacity-80">${inv.totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3 px-4 text-right text-rose-400 font-bold">${inv.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        max={inv.balance}
                                                        value={inv.amountApplied || ''}
                                                        onChange={(e) => handleInvoiceAmountChange(index, e.target.value)}
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
                                        <HelpCircle size={12} /> Prepayment Advance Calculations
                                    </h5>
                                    <p className="text-[9px] font-medium text-dim mt-0.5">Surplus amounts book as customer credit balance for rollover</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center border-t border-white/5 pt-3" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Total Payment</span>
                                    <span className="text-sm font-black text-white mt-1 block" style={{ color: 'var(--text-main)' }}>${fmt(parseFloat(amount) || 0)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Applied to Invoices</span>
                                    <span className="text-sm font-black text-emerald-500 mt-1 block">${fmt(totalApplied)}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-dim block">Customer Prepayment</span>
                                    <span className="text-sm font-black text-rose-400 mt-1 block">${fmt(advanceAmount)}</span>
                                </div>
                            </div>
                            {advanceAmount > 0 && (
                                <p className="text-[9px] font-semibold text-rose-300 italic opacity-80 text-center leading-relaxed">
                                    * The leftover ${fmt(advanceAmount)} will book as a customer prepayment rollover to auto-deduct from future bills.
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
            <QuickAddAccountModal
                isOpen={isAddAccountOpen}
                onClose={() => setIsAddAccountOpen(false)}
                defaultCategory="ASSET"
                onSuccess={async (newAcc) => {
                    try {
                        const codesRes = await getAllAccountingCodes();
                        setAccountingCodes(codesRes || []);
                        setDepositedTo(newAcc._id);
                    } catch (err) {
                        console.error('Failed to reload accounts', err);
                    }
                }}
            />
        </div>
    );
};

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default CreatePaymentReceivedModal;
