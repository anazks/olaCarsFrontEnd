import React, { useState, useEffect } from 'react';
import { X, DollarSign, User, Truck, Building2, Save, Loader2, Search, Zap, FileText, Receipt, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    updateCustomerTransactionAmount,
    updateCustomerContact,
    updateVendorTransactionAmount,
    updateVendorContact,
    updateInterBankTransactionAmount
} from '../../../../services/bankAccountService';
import { getAllDrivers } from '../../../../services/driverService';
import { getAllCustomers, type Customer } from '../../../../services/customerService';
import { getInvoicesByCustomer, getInvoicesByDriver } from '../../../../services/invoiceService';
import { getAllSuppliers, type Supplier } from '../../../../services/supplierService';
import { getAllBills, type Bill } from '../../../../services/billService';

export type TxClassification = 'DRIVER' | 'VENDOR' | 'INTER_BANK' | 'NON_DRIVER_CUSTOMER';
export type EditMode = 'AMOUNT' | 'PARTY';

interface TransactionEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transaction: any;
    classification: TxClassification;
    initialMode?: EditMode;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    transaction,
    classification,
    initialMode = 'AMOUNT'
}) => {
    const [mode, setMode] = useState<EditMode>(initialMode);
    const [amount, setAmount] = useState<string>('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [initialCustomerId, setInitialCustomerId] = useState<string>('');
    const [initialSupplierId, setInitialSupplierId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    
    const [driversList, setDriversList] = useState<any[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loadingData, setLoadingData] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    // Set-off preview simulation state
    const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
    const [setOffPreview, setSetOffPreview] = useState<{
        type: 'CUSTOMER' | 'VENDOR';
        amount: number;
        totalSetOff: number;
        excessAmount: number;
        setOffDetails: any[];
    } | null>(null);

    useEffect(() => {
        if (isOpen && transaction) {
            setMode(initialMode);
            setAmount(String(transaction.amount || ''));
            setSearchTerm('');
            setSetOffPreview(null);
            setShowConfirmModal(false);

            // Pre-select current contact / supplier if present
            let initCustId = '';
            if (transaction.contact && typeof transaction.contact === 'object') {
                initCustId = transaction.contact._id || transaction.contact.id || '';
            } else if (typeof transaction.contact === 'string') {
                initCustId = transaction.contact;
            }
            setSelectedCustomerId(initCustId);
            setInitialCustomerId(initCustId);

            let initSupId = '';
            if (transaction.supplier && typeof transaction.supplier === 'object') {
                initSupId = transaction.supplier._id || transaction.supplier.id || '';
            } else if (typeof transaction.supplier === 'string') {
                initSupId = transaction.supplier;
            }
            setSelectedSupplierId(initSupId);
            setInitialSupplierId(initSupId);

            // Fetch reference lists if editing party
            fetchEntities();
        }
    }, [isOpen, transaction, initialMode]);

    // Live Set-off Simulation Preview Effect (Only for newly selected party)
    useEffect(() => {
        if (!isOpen || !transaction) return;

        const txAmount = Number(amount || transaction.amount || 0);

        if (
            (classification === 'DRIVER' || classification === 'NON_DRIVER_CUSTOMER') && 
            selectedCustomerId && 
            String(selectedCustomerId) !== String(initialCustomerId)
        ) {
            fetchCustomerSetOffPreview(selectedCustomerId, txAmount);
        } else if (
            classification === 'VENDOR' && 
            selectedSupplierId && 
            String(selectedSupplierId) !== String(initialSupplierId)
        ) {
            fetchVendorSetOffPreview(selectedSupplierId, txAmount);
        } else {
            setSetOffPreview(null);
        }
    }, [selectedCustomerId, selectedSupplierId, initialCustomerId, initialSupplierId, amount, classification, isOpen, transaction, customers, driversList]);

    const fetchCustomerSetOffPreview = async (partyId: string, txAmount: number) => {
        if (!partyId) {
            setSetOffPreview(null);
            return;
        }
        setLoadingPreview(true);
        try {
            // 1. Resolve partyId to customer ID and driver ID
            let resolvedCustId = partyId;
            let resolvedDriverId: string | undefined = undefined;

            const matchedCustomer = customers.find(c => 
                String(c._id) === String(partyId) || 
                (typeof c.driver === 'object' ? String(c.driver?._id) === String(partyId) : String(c.driver) === String(partyId))
            );

            if (matchedCustomer) {
                resolvedCustId = matchedCustomer._id;
                resolvedDriverId = typeof matchedCustomer.driver === 'object' ? matchedCustomer.driver?._id : matchedCustomer.driver;
            }

            const matchedDriver = driversList.find(d => 
                String(d._id) === String(partyId) || 
                String(d.driverDocId) === String(partyId) || 
                String(d.customerDocId) === String(partyId)
            );
            if (matchedDriver) {
                if (matchedDriver.customerDocId) resolvedCustId = matchedDriver.customerDocId;
                if (matchedDriver.driverDocId) resolvedDriverId = matchedDriver.driverDocId;
            }

            // 2. Fetch open invoices: Try customer query first, fallback to driver query
            let invoices: any[] = [];
            if (resolvedCustId) {
                invoices = await getInvoicesByCustomer(resolvedCustId).catch(() => []);
            }
            if ((!invoices || invoices.length === 0) && resolvedDriverId) {
                invoices = await getInvoicesByDriver(resolvedDriverId).catch(() => []);
            }

            const openInvs = (invoices || []).filter(inv => {
                const st = String(inv.status || '').toUpperCase();
                return st === 'PENDING' || st === 'PARTIAL' || st === 'OVERDUE';
            });

            const isOverdue = (inv: any) => {
                const st = String(inv.status || '').toUpperCase();
                if (st === 'OVERDUE') return true;
                if (inv.dueDate) return new Date(inv.dueDate).getTime() < Date.now();
                return false;
            };

            const overdueInvoices = openInvs
                .filter(inv => isOverdue(inv))
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const partialInvoices = openInvs
                .filter(inv => !isOverdue(inv) && String(inv.status).toUpperCase() === 'PARTIAL')
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const pendingInvoices = openInvs
                .filter(inv => !isOverdue(inv) && String(inv.status).toUpperCase() !== 'PARTIAL')
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const sortedInvoices = [...overdueInvoices, ...partialInvoices, ...pendingInvoices];

            let remaining = txAmount;
            let totalSetOff = 0;
            const setOffDetails: any[] = [];

            for (const inv of sortedInvoices) {
                if (remaining <= 0.01) break;
                const invBalance = inv.balance !== undefined ? Number(inv.balance) : ((inv.totalAmountDue || inv.baseAmount || 0) - (inv.amountPaid || 0));
                if (invBalance <= 0.01) continue;

                const amountToApply = Math.min(remaining, invBalance);
                const newBal = Math.max(0, invBalance - amountToApply);
                const newStatus = newBal <= 0.01 ? 'PAID' : 'PARTIAL';

                setOffDetails.push({
                    invoiceNumber: inv.invoiceNumber,
                    amountApplied: amountToApply,
                    newBalance: newBal,
                    newStatus
                });

                totalSetOff += amountToApply;
                remaining -= amountToApply;
            }

            const excessAmount = Math.max(0, txAmount - totalSetOff);

            setSetOffPreview({
                type: 'CUSTOMER',
                amount: txAmount,
                totalSetOff,
                excessAmount,
                setOffDetails
            });
        } catch (err) {
            console.error('Error simulating customer set-off preview:', err);
            setSetOffPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const fetchVendorSetOffPreview = async (supId: string, txAmount: number) => {
        setLoadingPreview(true);
        try {
            const billsRes = await getAllBills({ supplier: supId, limit: 100 }).catch(() => ({ data: [] }));
            const billsList = billsRes.data || (billsRes as any).bills || [];
            const openBills = billsList.filter((b: Bill) => b.status === 'OPEN' || b.status === 'PARTIALLY_PAID' || b.status === 'DRAFT');

            const isOverdue = (b: Bill) => {
                if (b.dueDate) return new Date(b.dueDate).getTime() < Date.now();
                return false;
            };

            const overdueBills = openBills
                .filter((b: Bill) => isOverdue(b))
                .sort((a: Bill, b: Bill) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const partialBills = openBills
                .filter((b: Bill) => !isOverdue(b) && String(b.status).toUpperCase() === 'PARTIALLY_PAID')
                .sort((a: Bill, b: Bill) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const sortedBills = [...overdueBills, ...partialBills];

            let remaining = txAmount;
            let totalSetOff = 0;
            const setOffDetails: any[] = [];

            for (const bill of sortedBills) {
                if (remaining <= 0.01) break;
                const billBalance = bill.balanceDue !== undefined ? bill.balanceDue : (bill.totalAmount - (bill.amountPaid || 0));
                if (billBalance <= 0) continue;

                const amountToApply = Math.min(remaining, billBalance);
                const newBal = Math.max(0, billBalance - amountToApply);
                const newStatus = newBal <= 0 ? 'PAID' : 'PARTIALLY_PAID';

                setOffDetails.push({
                    billNumber: bill.billNumber,
                    amountApplied: amountToApply,
                    newBalance: newBal,
                    newStatus
                });

                totalSetOff += amountToApply;
                remaining -= amountToApply;
            }

            const excessAmount = Math.max(0, txAmount - totalSetOff);

            setSetOffPreview({
                type: 'VENDOR',
                amount: txAmount,
                totalSetOff,
                excessAmount,
                setOffDetails
            });
        } catch (err) {
            console.error('Error simulating vendor set-off preview:', err);
            setSetOffPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const extractArray = (res: any): any[] => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.customers)) return res.customers;
        if (Array.isArray(res.suppliers)) return res.suppliers;
        if (res.data && Array.isArray(res.data.data)) return res.data.data;
        return [];
    };

    const fetchEntities = async () => {
        setLoadingData(true);
        try {
            const [driverRes, custList, supList] = await Promise.all([
                getAllDrivers({ limit: 5000 }).catch(() => []),
                getAllCustomers({ limit: 5000 }).catch(() => []),
                getAllSuppliers({ limit: 5000 }).catch(() => [])
            ]);

            const rawDrivers = extractArray(driverRes);
            const rawCustomers = extractArray(custList);
            const rawSuppliers = extractArray(supList);

            // Fetch drivers and map them to their corresponding customer records
            const driverOptions: any[] = [];
            const addedIds = new Set<string>();

            rawDrivers.forEach((d: any) => {
                // Find corresponding customer doc in rawCustomers
                const matchedCust = rawCustomers.find((c: any) => {
                    const cDriverId = typeof c.driver === 'object' ? (c.driver?._id || c.driver?.id) : c.driver;
                    return cDriverId && String(cDriverId) === String(d._id);
                });

                const customerId = matchedCust ? matchedCust._id : (typeof d.customer === 'object' ? d.customer?._id : (d.customer || undefined));
                // Primary identifier used for selection should prefer customer ID so invoice lookups & bank transactions link directly to Customer
                const primaryId = customerId || d._id;
                const idStr = String(primaryId);

                if (primaryId && !addedIds.has(idStr)) {
                    addedIds.add(idStr);
                    const dName = d.personalInfo?.fullName || d.name || d.fullName || (matchedCust ? matchedCust.name : 'Unnamed Driver');
                    const dCode = d.driverId || d.code || (matchedCust ? matchedCust.customerId : '') || '';
                    driverOptions.push({
                        _id: primaryId,
                        driverDocId: d._id,
                        customerDocId: customerId,
                        name: dName,
                        code: dCode
                    });
                }
            });

            // Also include any customer marked as driver not yet in driverOptions
            rawCustomers.forEach((c: any) => {
                if ((c.isDriver || c.driver) && !addedIds.has(String(c._id))) {
                    addedIds.add(String(c._id));
                    const dRef = typeof c.driver === 'object' ? c.driver : null;
                    const dCode = (dRef && (dRef.driverId || dRef.code)) || c.customerId || '';
                    const dName = (dRef && (dRef.personalInfo?.fullName || dRef.name)) || c.name || 'Unnamed Driver';
                    driverOptions.push({
                        _id: c._id,
                        driverDocId: typeof c.driver === 'object' ? c.driver?._id : c.driver,
                        customerDocId: c._id,
                        name: dName,
                        code: dCode
                    });
                }
            });

            setDriversList(driverOptions);
            setCustomers(rawCustomers);
            setSuppliers(rawSuppliers);
        } catch (err) {
            console.error('Error fetching entities for transaction edit modal:', err);
        } finally {
            setLoadingData(false);
        }
    };

    if (!isOpen || !transaction) return null;

    const safeCustomers = Array.isArray(customers) ? customers : [];
    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

    // Filter drivers by search query
    const filteredDrivers = driversList.filter(d => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const nameStr = (d.name || '').toLowerCase();
        const codeStr = String(d.code || '').toLowerCase();
        return nameStr.includes(term) || codeStr.includes(term);
    });

    const filteredSuppliers = safeSuppliers.filter(s => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const nameStr = (s.name || s.companyName || '').toLowerCase();
        const codeStr = String((s as any).vendorNumber || (s as any).supplierCode || '').toLowerCase();
        return nameStr.includes(term) || codeStr.includes(term);
    });

    const filteredCustomers = safeCustomers.filter(c => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const nameStr = (c.name || (c as any).companyName || '').toLowerCase();
        const idStr = String((c as any).customerId || (c as any).customerNumber || '').toLowerCase();
        return nameStr.includes(term) || idStr.includes(term);
    });

    const getCurrentPartyName = (): string => {
        if (classification === 'VENDOR') {
            return transaction.supplierName || (transaction.supplier && typeof transaction.supplier === 'object' ? (transaction.supplier.name || transaction.supplier.companyName) : undefined) || 'Current Vendor';
        }
        return transaction.customerName || transaction.contactName || (transaction.contact && typeof transaction.contact === 'object' ? (transaction.contact.name || transaction.contact.personalInfo?.fullName) : undefined) || 'Current Driver/Customer';
    };

    const getNewPartyName = (): string => {
        if (classification === 'VENDOR') {
            const found = suppliers.find(s => String(s._id) === String(selectedSupplierId));
            return found ? `${found.name || found.companyName} ${((found as any).vendorNumber || (found as any).supplierCode) ? `(${ (found as any).vendorNumber || (found as any).supplierCode })` : ''}` : 'Selected Vendor';
        }
        if (classification === 'DRIVER') {
            const found = driversList.find(d => String(d._id) === String(selectedCustomerId) || String(d.customerDocId) === String(selectedCustomerId) || String(d.driverDocId) === String(selectedCustomerId));
            return found ? `${found.name} ${found.code ? `(${found.code})` : ''}` : 'Selected Driver';
        }
        const foundCust = customers.find(c => String(c._id) === String(selectedCustomerId));
        return foundCust ? `${foundCust.name} ${((foundCust as any).customerId) ? `(${ (foundCust as any).customerId })` : ''}` : 'Selected Customer';
    };

    const handleInitiateSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        const numAmount = Number(amount);
        if (mode === 'AMOUNT') {
            if (isNaN(numAmount) || numAmount <= 0) {
                toast.error('Please enter a valid transaction amount greater than 0');
                return;
            }
            if (Math.abs(numAmount - Number(transaction.amount || 0)) < 0.001) {
                toast('Transaction amount is unchanged', { icon: 'ℹ️' });
                return;
            }
        } else if (mode === 'PARTY') {
            if (classification === 'VENDOR') {
                if (!selectedSupplierId) {
                    toast.error('Please select a vendor/supplier to re-assign');
                    return;
                }
                if (String(selectedSupplierId) === String(initialSupplierId)) {
                    toast('This vendor is already assigned to the transaction', { icon: 'ℹ️' });
                    return;
                }
            } else if (classification === 'DRIVER' || classification === 'NON_DRIVER_CUSTOMER') {
                if (!selectedCustomerId) {
                    toast.error('Please select a contact to re-assign');
                    return;
                }
                if (String(selectedCustomerId) === String(initialCustomerId)) {
                    toast('This contact is already assigned to the transaction', { icon: 'ℹ️' });
                    return;
                }
            }
        }

        // Open acknowledgement modal for confirmation
        setShowConfirmModal(true);
    };

    const handleConfirmSave = async () => {
        const numAmount = Number(amount);
        setSaving(true);
        const toastId = toast.loading('Saving transaction edits and updating balances...');

        try {
            if (classification === 'INTER_BANK') {
                await updateInterBankTransactionAmount(transaction._id, { amount: numAmount });
            } else if (classification === 'VENDOR') {
                if (mode === 'PARTY') {
                    await updateVendorContact(transaction._id, { newSupplierId: selectedSupplierId });
                } else {
                    await updateVendorTransactionAmount(transaction._id, { amount: numAmount });
                }
            } else if (classification === 'DRIVER' || classification === 'NON_DRIVER_CUSTOMER') {
                if (mode === 'PARTY') {
                    await updateCustomerContact(transaction._id, { newCustomerId: selectedCustomerId });
                } else {
                    await updateCustomerTransactionAmount(transaction._id, { amount: numAmount });
                }
            }

            toast.success('Transaction updated successfully!', { id: toastId });
            setShowConfirmModal(false);
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to update transaction:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update transaction', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                className="w-full max-w-lg rounded-2xl border p-6 space-y-6 shadow-2xl animate-scale-up"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div>
                        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                            {classification === 'DRIVER' && <User className="text-[#C8E600]" size={20} />}
                            {classification === 'VENDOR' && <Truck className="text-amber-400" size={20} />}
                            {classification === 'INTER_BANK' && <Building2 className="text-blue-400" size={20} />}
                            {classification === 'NON_DRIVER_CUSTOMER' && <User className="text-emerald-400" size={20} />}

                            {mode === 'AMOUNT' ? 'Edit Transaction Amount' : (
                                classification === 'DRIVER' ? 'Change Assigned Driver' : (
                                    classification === 'VENDOR' ? 'Change Assigned Vendor' : 'Change Assigned Customer'
                                )
                            )}
                        </h3>
                        <p className="text-xs opacity-60 mt-0.5 font-mono">
                            Ref: {transaction.transactionId || transaction._id} | Current: ${transaction.amount?.toFixed(2)}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Sub-Header Tabs if classification allows party edit */}
                {classification !== 'INTER_BANK' && (
                    <div className="flex border rounded-xl p-1 gap-1" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={() => setMode('AMOUNT')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                mode === 'AMOUNT' 
                                    ? 'bg-[#C8E600] text-black shadow-md' 
                                    : 'text-dim hover:text-main bg-transparent'
                            }`}
                        >
                            <DollarSign size={13} className="inline mr-1" /> Edit Amount
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('PARTY')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                mode === 'PARTY' 
                                    ? 'bg-[#C8E600] text-black shadow-md' 
                                    : 'text-dim hover:text-main bg-transparent'
                            }`}
                        >
                            <User size={13} className="inline mr-1" /> 
                            {classification === 'DRIVER' ? 'Change Driver' : (
                                classification === 'VENDOR' ? 'Change Vendor' : 'Change Customer'
                            )}
                        </button>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleInitiateSave} className="space-y-5">
                    {/* Amount Field (Only in AMOUNT mode) */}
                    {mode === 'AMOUNT' && (
                        <div className="space-y-1.5 animate-fade-in">
                            <label className="block text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                                Transaction Amount ($)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold opacity-40">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full pl-8 pr-4 py-3 rounded-xl border outline-none font-mono text-base font-bold transition-all focus:ring-2 focus:ring-[#C8E600]"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Party Field (Driver / Vendor / Customer) */}
                    {mode === 'PARTY' && classification !== 'INTER_BANK' && (
                        <div className="space-y-3 animate-fade-in">
                            <label className="block text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                                {classification === 'DRIVER' && 'Target Driver *'}
                                {classification === 'VENDOR' && 'Target Vendor / Supplier *'}
                                {classification === 'NON_DRIVER_CUSTOMER' && 'Target Customer *'}
                            </label>

                            {/* Search Filter Box */}
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={
                                        classification === 'DRIVER' ? 'Search driver by name or ID...' : (
                                            classification === 'VENDOR' ? 'Search vendor by name or code...' : 'Search customer by name or ID...'
                                        )
                                    }
                                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none text-xs font-medium transition-all focus:ring-1 focus:ring-[#C8E600]"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {loadingData ? (
                                <div className="flex items-center gap-2 py-3">
                                    <Loader2 size={16} className="animate-spin text-[#C8E600]" />
                                    <span className="text-xs text-dim">Loading options...</span>
                                </div>
                            ) : (
                                <>
                                    {classification === 'DRIVER' && (
                                        <select
                                            value={selectedCustomerId}
                                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        >
                                            <option value="">— Select Target Driver ({filteredDrivers.length} available) —</option>
                                            {filteredDrivers.map(d => (
                                                <option key={d._id} value={d._id}>
                                                    {d.name} {d.code ? `(${d.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {classification === 'VENDOR' && (
                                        <select
                                            value={selectedSupplierId}
                                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        >
                                            <option value="">— Select Target Vendor ({filteredSuppliers.length} available) —</option>
                                            {filteredSuppliers.map(s => (
                                                <option key={s._id} value={s._id}>
                                                    {s.name || s.companyName} {((s as any).vendorNumber || (s as any).supplierCode) ? `(${ (s as any).vendorNumber || (s as any).supplierCode })` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {classification === 'NON_DRIVER_CUSTOMER' && (
                                        <select
                                            value={selectedCustomerId}
                                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        >
                                            <option value="">— Select Target Customer ({filteredCustomers.length} available) —</option>
                                            {filteredCustomers.map(c => (
                                                <option key={c._id} value={c._id}>
                                                    {c.name} {((c as any).customerId) ? `(${ (c as any).customerId })` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </>
                            )}

                            {/* Auto Set-off Live Simulation Preview Card */}
                            {loadingPreview ? (
                                <div className="p-3.5 rounded-xl border bg-white/5 flex items-center gap-2 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                    <Loader2 size={15} className="animate-spin text-[#C8E600]" />
                                    <span className="text-dim" style={{ color: 'var(--text-dim)' }}>Simulating auto set-off & fetching open documents...</span>
                                </div>
                            ) : setOffPreview ? (
                                <div className="p-4 rounded-xl border bg-white/5 space-y-2.5 animate-fade-in" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-main)' }}>
                                        <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#C8E600]">
                                            <Zap size={14} className="fill-[#C8E600]" /> Auto Set-off Details Preview
                                        </span>
                                        <span className="text-[10px] font-mono opacity-60">
                                            Tx Amount: ${(setOffPreview.amount || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Invoices set-off list */}
                                    {setOffPreview.type === 'CUSTOMER' && (
                                        <div className="space-y-1.5 text-xs">
                                            {setOffPreview.setOffDetails.length > 0 ? (
                                                setOffPreview.setOffDetails.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg text-emerald-400 font-bold">
                                                        <span className="flex items-center gap-1.5">
                                                            <FileText size={13} /> {item.invoiceNumber}
                                                        </span>
                                                        <span>⚡ ${item.amountApplied.toFixed(2)} ({item.newStatus})</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-dim text-[11px] italic" style={{ color: 'var(--text-dim)' }}>No unpaid invoices found. Full payment will be held as Prepayment / Advance.</p>
                                            )}

                                            {setOffPreview.excessAmount > 0 && (
                                                <div className="flex items-center justify-between bg-[#C8E600]/10 border border-[#C8E600]/20 px-3 py-1.5 rounded-lg text-[#C8E600] font-bold text-[11px]">
                                                    <span>⚡ Prepayment Credit (Advance):</span>
                                                    <span>${setOffPreview.excessAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Bills set-off list */}
                                    {setOffPreview.type === 'VENDOR' && (
                                        <div className="space-y-1.5 text-xs">
                                            {setOffPreview.setOffDetails.length > 0 ? (
                                                setOffPreview.setOffDetails.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg text-amber-400 font-bold">
                                                        <span className="flex items-center gap-1.5">
                                                            <Receipt size={13} /> {item.billNumber}
                                                        </span>
                                                        <span>⚡ ${item.amountApplied.toFixed(2)} ({item.newStatus})</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-dim text-[11px] italic" style={{ color: 'var(--text-dim)' }}>No open bills found. Full payment will be held as Vendor Advance.</p>
                                            )}

                                            {setOffPreview.excessAmount > 0 && (
                                                <div className="flex items-center justify-between bg-[#C8E600]/10 border border-[#C8E600]/20 px-3 py-1.5 rounded-lg text-[#C8E600] font-bold text-[11px]">
                                                    <span>⚡ Vendor Advance Credit:</span>
                                                    <span>${setOffPreview.excessAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Notice Callout */}
                    <div className="p-3.5 rounded-xl border text-xs bg-white/5 space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--brand-lime)' }}>
                            ℹ️ Accounting Impact Notice
                        </div>
                        <p className="opacity-75 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                            {classification === 'DRIVER' && 'Editing will revoke old invoice set-offs and re-apply automated set-offs to open invoices.'}
                            {classification === 'VENDOR' && 'Editing will revoke old bill set-offs and re-apply automated set-offs to open vendor bills.'}
                            {classification === 'INTER_BANK' && 'Editing amount will automatically adjust double-entry balances in both bank accounts.'}
                            {classification === 'NON_DRIVER_CUSTOMER' && 'Editing will re-assign customer payment history without touching invoice set-offs.'}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5 disabled:opacity-50"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#C8E600] text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Acknowledgement / Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div 
                        className="w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl animate-scale-up"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-black tracking-tight">
                                        {mode === 'AMOUNT' ? 'Confirm Amount Update' : (
                                            classification === 'DRIVER' ? 'Confirm Driver Reassignment' : (
                                                classification === 'VENDOR' ? 'Confirm Vendor Reassignment' : 'Confirm Customer Reassignment'
                                            )
                                        )}
                                    </h4>
                                    <p className="text-[11px] opacity-60">
                                        Please review the financial impact before proceeding.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={saving}
                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Impact Details Card */}
                        <div className="space-y-3">
                            {mode === 'AMOUNT' ? (
                                <div className="p-3.5 rounded-xl border bg-white/5 space-y-2 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-dim opacity-75">Previous Amount:</span>
                                        <span className="font-mono font-bold line-through opacity-60">${Number(transaction.amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-[#C8E600]">New Amount:</span>
                                        <span className="font-mono font-black text-[#C8E600] text-sm">${Number(amount).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                                        <span className="text-dim">Net Balance Adjustment:</span>
                                        <span className={`font-mono font-bold ${Number(amount) >= Number(transaction.amount || 0) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {Number(amount) >= Number(transaction.amount || 0) ? '+' : ''}${(Number(amount) - Number(transaction.amount || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3.5 rounded-xl border bg-white/5 space-y-2.5 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-dim opacity-60">Currently Assigned</div>
                                        <div className="font-bold truncate opacity-70">
                                            {getCurrentPartyName()}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#C8E600]">
                                        <ArrowRight size={13} /> Reassigning To:
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-black/30 border border-white/10">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#C8E600]">Target Party</div>
                                        <div className="font-black text-sm text-white truncate">
                                            {getNewPartyName()}
                                        </div>
                                    </div>

                                    {/* Set-off effect in confirmation */}
                                    {setOffPreview && (
                                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#C8E600] flex items-center gap-1">
                                                <Zap size={11} className="fill-[#C8E600]" /> Automated Set-off Allocation:
                                            </div>
                                            {setOffPreview.setOffDetails.length > 0 ? (
                                                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                                                    {setOffPreview.setOffDetails.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-emerald-500/10 text-emerald-400 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-bold">
                                                            <span className="flex items-center gap-1">
                                                                <FileText size={11} /> {item.invoiceNumber || item.billNumber}
                                                            </span>
                                                            <span>${item.amountApplied.toFixed(2)} ({item.newStatus})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                                                    No open documents found. ${(setOffPreview.amount || 0).toFixed(2)} will be held as Advance.
                                                </div>
                                            )}
                                            {setOffPreview.excessAmount > 0 && setOffPreview.setOffDetails.length > 0 && (
                                                <div className="text-[11px] text-[#C8E600] bg-[#C8E600]/10 px-2.5 py-1.5 rounded-lg border border-[#C8E600]/20 flex justify-between font-bold">
                                                    <span>Prepayment / Advance Credit:</span>
                                                    <span>${setOffPreview.excessAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Warning callout */}
                            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs flex items-start gap-2.5">
                                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                                <p className="leading-snug">
                                    {mode === 'AMOUNT' 
                                        ? 'Double-entry ledger balances and bank running balances will be automatically adjusted.'
                                        : 'Any previous invoice/bill set-offs on the old party will be reversed and re-allocated to open invoices of the new party.'}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/5 disabled:opacity-50"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                Back to Edit
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#C8E600] text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
                            >
                                {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {saving ? 'Processing...' : 'Confirm & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionEditModal;
