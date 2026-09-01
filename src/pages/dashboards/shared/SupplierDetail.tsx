import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    Users, Mail, Phone, MapPin, CreditCard, DollarSign, FileText, 
    RefreshCw, FileSpreadsheet,
    Download, CheckCircle2, AlertCircle, 
    ArrowLeft, Edit2, Zap, Briefcase, Tag, ShoppingBag, Coins, X,
    Scale, Eye
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { getSupplierById, updateSupplier, type Supplier, type UpdateSupplierPayload } from '../../../services/supplierService';
import { getAllBills, type Bill } from '../../../services/billService';
import { getAllPurchaseOrders, type PurchaseOrder } from '../../../services/purchaseOrderService';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { validatePhoneDetails } from '../../../utils/phoneValidation';

interface RelatedPayment {
    _id: string;
    paymentCode: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    bills: Array<{
        billId: string;
        billNumber: string;
        amountApplied: number;
    }>;
}

const CATEGORIES = [
    "Vehicles",
    "Insurance",
    "Spare Parts",
    "Services",
    "Office Supplies",
    "IT Equipment",
    "Marketing",
    "Other"
];

const SupplierDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [bills, setBills] = useState<Bill[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [payments, setPayments] = useState<RelatedPayment[]>([]);
    const [debitNotes, setDebitNotes] = useState<any[]>([]);
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [backendLedgerEntries, setBackendLedgerEntries] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'pos' | 'bills' | 'payments' | 'debit_notes' | 'credit_notes' | 'ledger'>('overview');

    // Edit Supplier Form State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        category: CATEGORIES[0],
        customCategory: '',
        isActive: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const openEditModal = () => {
        if (!supplier) return;
        const isPredefined = CATEGORIES.includes(supplier.category);
        setFormData({
            name: supplier.name,
            contactPerson: supplier.contactPerson || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            category: isPredefined ? supplier.category : 'Other',
            customCategory: isPredefined ? '' : supplier.category,
            isActive: supplier.isActive
        });
        setFormError(null);
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !supplier) return;
        setFormLoading(true);
        setFormError(null);

        // Validate email format if provided
        if (formData.email.trim()) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(formData.email.trim())) {
                setFormError('Please enter a valid email address.');
                setFormLoading(false);
                return;
            }
        }

        // Validate phone number using the centralized helper
        const phoneValidation = validatePhoneDetails(formData.phone);
        if (!phoneValidation.isValid) {
            setFormError(phoneValidation.defaultMessage || 'Please enter a valid phone number.');
            setFormLoading(false);
            return;
        }

        const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;

        if (!finalCategory.trim()) {
            setFormError('Please specify a category.');
            setFormLoading(false);
            return;
        }

        try {
            const payload: UpdateSupplierPayload = {
                id,
                name: formData.name,
                contactPerson: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                category: finalCategory,
                isActive: formData.isActive
            };
            await updateSupplier(payload);
            toast.success('Supplier profile updated successfully.');
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || 'Failed to update supplier profile.');
        } finally {
            setFormLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setRefreshing(true);
        try {
            const supRes = await getSupplierById(id);
            setSupplier(supRes);

            const [billsRes, poRes, paymentsRes, dnRes, cnRes, ledgerResSearch, ledgerResAll] = await Promise.all([
                getAllBills({ supplier: id, limit: 1000, ignoreDefaultDates: 'true' }).catch(() => ({ data: [] })),
                getAllPurchaseOrders({ supplier: id, limit: 1000 }).catch(() => ({ data: [] })),
                api.get('/api/payments-made', { params: { supplier: id, limit: 1000 } }).catch(() => ({ data: [] })),
                api.get('/api/debit-notes', { params: { supplierId: id, limit: 1000 }, headers: { 'X-Skip-Toast': 'true' } }).catch(() => ({ data: [] })),
                api.get('/api/credit-notes', { params: { supplierId: id, limit: 1000 }, headers: { 'X-Skip-Toast': 'true' } }).catch(() => ({ data: [] })),
                api.get('/api/ledger', { params: { search: supRes?.name, limit: 1000 }, headers: { 'X-Skip-Toast': 'true' } }).catch(() => ({ data: [] })),
                api.get('/api/ledger', { params: { limit: 1000 }, headers: { 'X-Skip-Toast': 'true' } }).catch(() => ({ data: [] }))
            ]);

            // Filter Debit Notes for this supplier
            const dnList = dnRes.data?.data || dnRes.data || [];
            const filteredDNs = dnList.filter((dn: any) => {
                if (!dn) return false;
                const sId = typeof dn.supplierId === 'object' ? dn.supplierId?._id : dn.supplierId;
                return String(sId) === String(id) || dn.supplierName === supRes?.name;
            });
            setDebitNotes(filteredDNs);

            // Filter Credit Notes for this supplier
            const cnList = cnRes.data?.data || cnRes.data || [];
            const filteredCNs = cnList.filter((cn: any) => {
                if (!cn) return false;
                const sId = typeof cn.supplierId === 'object' ? cn.supplierId?._id : cn.supplierId;
                return String(sId) === String(id) || cn.supplierName === supRes?.name;
            });
            setCreditNotes(filteredCNs);

            // Filter Bills
            if (billsRes && Array.isArray(billsRes.data)) {
                const filteredBills = billsRes.data.filter((b: Bill) => {
                    if (!b) return false;
                    const supId = typeof b.supplier === 'object' ? b.supplier?._id : b.supplier;
                    return String(supId) === String(id);
                });
                setBills(filteredBills);
            }

            // Filter Purchase Orders
            if (poRes && Array.isArray(poRes.data)) {
                const filteredPOs = poRes.data.filter((po: PurchaseOrder) => {
                    if (!po) return false;
                    const supId = typeof po.supplier === 'object' ? po.supplier?._id : po.supplier;
                    return String(supId) === String(id);
                });
                setPurchaseOrders(filteredPOs);
            }

            // Filter Payments
            const payData = paymentsRes.data?.data || paymentsRes.data || [];
            if (Array.isArray(payData)) {
                const filteredPayments = payData.filter((p: any) => {
                    if (!p) return false;
                    const supId = typeof p.supplier === 'object' ? p.supplier?._id : p.supplier;
                    return String(supId) === String(id);
                });
                setPayments(filteredPayments);
            }

            // Filter & Deduplicate Bank Account Ledger Entries (and connected Double-Entry pairs) for this supplier
            const list1 = ledgerResSearch.data?.data || ledgerResSearch.data || [];
            const list2 = ledgerResAll.data?.data || ledgerResAll.data || [];
            const combinedLedger = [...list1, ...list2];

            const supNameLower = (supRes?.name || '').toLowerCase();
            const supVendorNumLower = (supRes?.vendorNumber || '').toLowerCase();

            // 1. Identify all bank transactions directly linked to this vendor
            const vendorBankTransactionIds = new Set<string>();
            const vendorBankVouchers = new Set<string>();
            const directBankEntryIds = new Set<string>();

            combinedLedger.forEach((l: any) => {
                if (!l || !l._id) return;
                const desc = (l.description || '').toLowerCase();
                const contactName = (typeof l.contact === 'string' ? l.contact : (l.contact?.name || (l.contact ? String(l.contact) : ''))).toLowerCase();
                const txId = (l.transactionId || '').toLowerCase();
                const accCat = (l.accountingCode?.category || '').toUpperCase();
                const accCodeStr = (l.accountingCode?.code || '').toLowerCase();
                const accNameStr = (l.accountingCode?.name || '').toLowerCase();

                const isVendorMatch = (
                    (supNameLower && (desc.includes(supNameLower) || contactName.includes(supNameLower) || txId.includes(supNameLower))) ||
                    (supVendorNumLower && (desc.includes(supVendorNumLower) || txId.includes(supVendorNumLower))) ||
                    (l.contact && (String(l.contact) === String(id) || String(l.contact?._id) === String(id))) ||
                    (l.supplier && (String(l.supplier) === String(id) || String(l.supplier?._id) === String(id)))
                );

                const isBankTx = (
                    l.transaction ||
                    l.bankTxType ||
                    accCat === 'ASSET' ||
                    accCodeStr.startsWith('1.1') ||
                    accNameStr.includes('bank') ||
                    accNameStr.includes('cash') ||
                    desc.includes('payment') ||
                    desc.includes('pmt') ||
                    desc.includes('bank') ||
                    desc.includes('transfer')
                );

                if (isVendorMatch && isBankTx) {
                    directBankEntryIds.add(l._id);
                    if (l.transactionId) vendorBankTransactionIds.add(l.transactionId);
                    if (l.transaction?._id) vendorBankTransactionIds.add(String(l.transaction._id));
                    if (l.voucher?._id) vendorBankVouchers.add(String(l.voucher._id));
                }
            });

            // 2. Include ALL connected double-entry legs sharing those transaction IDs
            const map = new Map();
            combinedLedger.forEach((l: any) => {
                if (!l || !l._id) return;
                const tId = l.transactionId;
                const txObjId = l.transaction?._id ? String(l.transaction._id) : null;
                const vId = l.voucher?._id ? String(l.voucher._id) : null;

                const isConnectedDoubleEntry = (
                    directBankEntryIds.has(l._id) ||
                    (tId && vendorBankTransactionIds.has(tId)) ||
                    (txObjId && vendorBankTransactionIds.has(txObjId)) ||
                    (vId && vendorBankVouchers.has(vId))
                );

                if (isConnectedDoubleEntry) {
                    map.set(l._id, l);
                }
            });

            setBackendLedgerEntries(Array.from(map.values()));

        } catch (err: any) {
            console.error('Error fetching supplier details:', err);
            toast.error('Failed to load supplier details and transaction histories.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePrintSupplier = async () => {
        if (!id) return;
        const toastId = toast.loading("Preparing print layout...");
        try {
            const res = await api.get(`/api/supplier/${id}/pdf`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.src = url;
            
            document.body.appendChild(iframe);
            
            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };
            
            toast.success("Print dialog opened successfully", { id: toastId });
        } catch (err: any) {
            console.error("Failed to print PDF:", err);
            toast.error("Failed generating supplier PDF document.", { id: toastId });
        }
    };

    const handleDownloadSupplierPdf = async () => {
        if (!id || !supplier) return;
        const toastId = toast.loading("Downloading Supplier Bank Ledger PDF...");
        try {
            const res = await api.get(`/api/supplier/${id}/pdf`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = (supplier.name || 'supplier').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute('download', `${safeName}_bank_ledger_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Bank Ledger PDF downloaded successfully!", { id: toastId });
        } catch (err: any) {
            console.error("Failed to download Bank Ledger PDF:", err);
            toast.error("Failed to download Bank Ledger PDF.", { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-dim animate-pulse">Loading Supplier Profile...</p>
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="container-responsive py-20 text-center space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-12 max-w-md mx-auto shadow-2xl">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Profile Not Found</h3>
                    <p className="text-xs font-medium text-dim mt-2 mb-8">The vendor record you are looking for does not exist or has been archived.</p>
                    <button onClick={() => navigate(-1)} className="w-full py-3 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all text-white">
                        Return to Directory
                    </button>
                </div>
            </div>
        );
    }

    // Financial Analytics Aggregation
    const totalBilledAmount = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAppliedToBills = payments.reduce((sum, p) => {
        const applied = p.bills?.reduce((bSum, b) => bSum + (b.amountApplied || 0), 0) || 0;
        return sum + applied;
    }, 0);

    const totalDebitNotesAmount = debitNotes.reduce((sum, dn) => sum + (dn.amount || 0), 0);
    const totalCreditNotesAmount = creditNotes.reduce((sum, cn) => sum + (cn.amount || 0), 0);

    const outstandingLiability = bills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    const supplierAdvanceBalance = Math.max(0, totalPaidAmount - totalAppliedToBills);

    // Dynamic parent route segment mapping for breadcrumbs
    const currentPath = location.pathname;
    const parentPath = currentPath.includes('/manage-suppliers')
        ? currentPath.substring(0, currentPath.indexOf('/manage-suppliers') + '/manage-suppliers'.length)
        : '/admin/manage-suppliers';

    return (
        <div className="container-responsive space-y-6 pb-20 animate-in fade-in duration-500 select-text">
            {/* Breadcrumbs */}
            <Breadcrumbs 
                items={[
                    { label: 'Purchases', path: parentPath }, 
                    { label: 'Suppliers', path: parentPath }, 
                    { label: supplier.name, active: true }
                ]} 
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(parentPath)} 
                        className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" 
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {supplier.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{supplier.category.toUpperCase()}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                Registered {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => fetchData()}
                        className="p-2 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95 shadow-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    </button>

                    <button 
                        onClick={openEditModal}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Edit2 size={14} className="opacity-70" /> Edit Profile
                    </button>

                    <button 
                        onClick={handlePrintSupplier}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <Download size={14} /> Export Statement
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickStatCard 
                    label="Account Status" 
                    value={supplier.isActive ? 'ACTIVE' : 'INACTIVE'} 
                    icon={<Zap size={16} />} 
                    color={supplier.isActive ? 'emerald' : 'rose'} 
                />
                <QuickStatCard 
                    label="Accounts Payable" 
                    value={`$${outstandingLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    icon={<DollarSign size={16} />} 
                    color={outstandingLiability > 0 ? 'rose' : 'emerald'}
                />
                <QuickStatCard 
                    label="Total Disbursed" 
                    value={`$${totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    icon={<FileText size={16} />} 
                />
                <QuickStatCard 
                    label="Operating Category" 
                    value={supplier.category} 
                    icon={<Briefcase size={16} />} 
                />
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1.5 rounded-2xl border bg-black/20 overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <Users size={14} /> },
                    { id: 'reconciliation', label: 'Balance Reconciliation', icon: <Scale size={14} /> },
                    { id: 'pos', label: 'Procurements (POs)', icon: <ShoppingBag size={14} /> },
                    { id: 'bills', label: 'Supplier Bills', icon: <FileText size={14} /> },
                    { id: 'payments', label: 'Payments & Prepayments', icon: <Coins size={14} /> },
                    { id: 'debit_notes', label: 'Debit Notes', icon: <FileText size={14} /> },
                    { id: 'credit_notes', label: 'Credit Notes', icon: <FileSpreadsheet size={14} /> },
                    { id: 'ledger', label: 'General Ledger View', icon: <FileSpreadsheet size={14} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                            activeTab === tab.id 
                                ? 'bg-brand-lime text-black shadow-lg scale-[1.02] z-10' 
                                : 'text-dim hover:text-white hover:bg-white/5'
                        }`}
                        style={activeTab === tab.id ? { background: 'var(--brand-lime)' } : { color: 'var(--text-dim)' }}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'bills' && bills.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[8px]">
                                {bills.length}
                            </span>
                        )}
                        {tab.id === 'debit_notes' && debitNotes.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20 text-[8px]">
                                {debitNotes.length}
                            </span>
                        )}
                        {tab.id === 'credit_notes' && creditNotes.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[8px]">
                                {creditNotes.length}
                            </span>
                        )}
                        {tab.id === 'pos' && purchaseOrders.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 text-[8px]">
                                {purchaseOrders.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content Section */}
            <div className="min-h-[400px]">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Overview Tab Grid Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                            
                            {/* Business Profile Details */}
                            <SectionCard title="Business Profile" icon={<Briefcase size={18} />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <InfoRow label="Vendor Number" value={supplier.vendorNumber} />
                                    <InfoRow label="Company Name" value={supplier.companyName} />
                                    <InfoRow label="Display Name" value={supplier.displayName} />
                                    <InfoRow label="Contact Person" value={supplier.contactPerson} icon={<Users size={14} />} />
                                    <InfoRow label="First Name" value={supplier.firstName} />
                                    <InfoRow label="Last Name" value={supplier.lastName} />
                                    <InfoRow label="Salutation" value={supplier.salutation} />
                                    <InfoRow label="Email Address" value={supplier.email} icon={<Mail size={14} />} />
                                    <InfoRow label="Phone Number" value={supplier.phone} icon={<Phone size={14} />} />
                                    <InfoRow label="Mobile Phone" value={supplier.mobilePhone} icon={<Phone size={14} />} />
                                    <InfoRow label="Website" value={supplier.website} />
                                    <InfoRow label="Source" value={supplier.source} />
                                    <InfoRow label="Company ID" value={supplier.companyId} />
                                    <InfoRow label="Primary Contact ID" value={supplier.primaryContactId} />
                                </div>
                            </SectionCard>

                            {/* Tax & Financial Preferences */}
                            <SectionCard title="Tax & Payments" icon={<CreditCard size={18} />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <InfoRow 
                                        label="Accounts Payable" 
                                        value={
                                            supplier.accountsPayable 
                                                ? (typeof supplier.accountsPayable === 'object' 
                                                    ? `${supplier.accountsPayable.code || ''} - ${supplier.accountsPayable.name || ''}` 
                                                    : supplier.accountsPayable) 
                                                : '—'
                                        } 
                                    />
                                    <InfoRow label="Payment Terms" value={supplier.paymentTerms} />
                                    <InfoRow label="Payment Terms Label" value={supplier.paymentTermsLabel} />
                                    <InfoRow label="Taxable" value={supplier.taxable !== undefined ? (supplier.taxable ? 'Yes' : 'No') : '—'} />
                                    <InfoRow label="Tax Name" value={supplier.taxName} />
                                    <InfoRow label="Tax Percentage" value={supplier.taxPercentage !== undefined ? `${supplier.taxPercentage}%` : '—'} />
                                    <InfoRow label="Tax Type" value={supplier.taxType} />
                                    <InfoRow label="Opening Balance" value={supplier.openingBalance !== undefined ? `$${fmt(supplier.openingBalance)}` : '—'} />
                                    <InfoRow label="Currency" value={supplier.currencyCode} />
                                    <InfoRow label="Category" value={supplier.category} />
                                </div>
                            </SectionCard>

                            {/* Balance Reconciliation Summary */}
                            <SectionCard title="Balance Reconciliation" icon={<Scale size={18} />}>
                                <div className="space-y-4 pt-2">
                                    <InfoRow label="Total Billed" value={`$${totalBilledAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Total Disbursed" value={`$${totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Settled Amount" value={`$${totalAppliedToBills.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Debit Notes Issued" value={`$${totalDebitNotesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Credit Notes Applied" value={`$${totalCreditNotesAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Outstanding Liability" value={`$${outstandingLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <div className="pt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-dim" style={{ color: 'var(--text-dim)' }}>Advance Credit Balance</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${supplierAdvanceBalance > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-dim border-white/10'}`}>
                                            ${supplierAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('reconciliation')}
                                        className="w-full mt-2 py-2 px-3 rounded-xl bg-brand-lime/10 text-brand-lime hover:bg-brand-lime/20 border border-brand-lime/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Scale size={14} /> View Full Balance Reconciliation
                                    </button>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Overview Tab Grid Row 2 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* Billing Address details */}
                            <SectionCard title="Billing Address" icon={<MapPin size={18} />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <InfoRow label="Attention" value={supplier.billingAttention} />
                                    <InfoRow label="Street Address" value={supplier.billingAddress} />
                                    <InfoRow label="Street Address 2" value={supplier.billingStreet2} />
                                    <InfoRow label="City" value={supplier.billingCity} />
                                    <InfoRow label="State" value={supplier.billingState} />
                                    <InfoRow label="Country" value={supplier.billingCountry} />
                                    <InfoRow label="Postal Code" value={supplier.billingCode} />
                                    <InfoRow label="Phone" value={supplier.billingPhone} />
                                    <InfoRow label="Fax" value={supplier.billingFax} />
                                </div>
                            </SectionCard>

                            {/* Shipping Address details */}
                            <SectionCard title="Shipping Address" icon={<MapPin size={18} />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <InfoRow label="Attention" value={supplier.shippingAttention} />
                                    <InfoRow label="Street Address" value={supplier.shippingAddress} />
                                    <InfoRow label="Street Address 2" value={supplier.shippingStreet2} />
                                    <InfoRow label="City" value={supplier.shippingCity} />
                                    <InfoRow label="State" value={supplier.shippingState} />
                                    <InfoRow label="Country" value={supplier.shippingCountry} />
                                    <InfoRow label="Postal Code" value={supplier.shippingCode} />
                                    <InfoRow label="Phone" value={supplier.shippingPhone} />
                                    <InfoRow label="Fax" value={supplier.shippingFax} />
                                </div>
                            </SectionCard>

                            {/* Custom Fields */}
                            <SectionCard title="Custom Fields" icon={<Tag size={18} />}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <InfoRow label="CF.FLEET NO" value={supplier.cfFleetNo} />
                                    <InfoRow label="CF.ACTIVE DATE" value={supplier.cfActiveDate ? new Date(supplier.cfActiveDate).toLocaleDateString() : '—'} />
                                    <InfoRow label="CF.RUC" value={supplier.cfRuc} />
                                    <InfoRow label="CF.DV" value={supplier.cfDv} />
                                    <InfoRow label="Location ID" value={supplier.locationId} />
                                    <InfoRow label="Location Name" value={supplier.locationName} />
                                    <InfoRow label="Contact Address ID" value={supplier.contactAddressId} />
                                </div>
                            </SectionCard>
                        </div>

                        {/* Supplier Notes */}
                        {supplier.notes && (
                            <div className="p-6 rounded-[1.8rem] border shadow-xl animate-in slide-in-from-bottom-2 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-2 pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                        <FileText size={18} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Internal Notes</h3>
                                </div>
                                <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
                                    {supplier.notes}
                                </p>
                            </div>
                        )}

                        {/* Prepayment Alert */}
                        {supplierAdvanceBalance > 0 ? (
                            <div className="p-5 rounded-[2rem] border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ background: 'rgba(200, 230, 0, 0.04)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                                <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center shrink-0 border border-brand-lime/20">
                                    <CheckCircle2 className="text-brand-lime" size={18} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-lime">Extra Prepayment Advance Detected</h4>
                                    <p className="text-[10px] font-semibold text-white/90 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                        Tally Complete: The total payment disbursed (${fmt(totalPaidAmount)}) exceeds the total amounts applied to bills (${fmt(totalAppliedToBills)}).
                                    </p>
                                    <p className="text-[11px] font-black text-[#C8E600] mt-1.5">
                                        Current Vendor Prepayment Credit Balance: ${fmt(supplierAdvanceBalance)}
                                    </p>
                                    <span className="text-[9px] font-bold text-dim block italic mt-1">
                                        * This advance balance is stored securely as a debit balance in Accounts Payable (2.1.01) and is available to settle future bills generated from this supplier.
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* 2. BALANCE RECONCILIATION TAB */}
                {activeTab === 'reconciliation' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Reconciliation Header Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 rounded-2xl border bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-dim block mb-1" style={{ color: 'var(--text-dim)' }}>Gross Invoiced Bills</span>
                                <p className="text-xl font-black text-white">${fmt(totalBilledAmount)}</p>
                                <span className="text-[9px] text-dim block mt-1" style={{ color: 'var(--text-dim)' }}>From {bills.length} vendor bills</span>
                            </div>
                            <div className="p-5 rounded-2xl border bg-emerald-500/5" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block mb-1">Total Settled Payments</span>
                                <p className="text-xl font-black text-emerald-400">${fmt(totalAppliedToBills)}</p>
                                <span className="text-[9px] text-emerald-500/70 block mt-1">Applied to cleared bills</span>
                            </div>
                            <div className="p-5 rounded-2xl border bg-amber-500/5" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Debit & Credit Adjustments</span>
                                <p className="text-xl font-black text-amber-400">${fmt(totalDebitNotesAmount + totalCreditNotesAmount)}</p>
                                <span className="text-[9px] text-amber-500/70 block mt-1">{debitNotes.length} Debit / {creditNotes.length} Credit Notes</span>
                            </div>
                            <div className="p-5 rounded-2xl border bg-rose-500/5" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block mb-1">Net Outstanding Liability</span>
                                <p className="text-xl font-black text-rose-400">${fmt(outstandingLiability)}</p>
                                <span className="text-[9px] text-rose-500/70 block mt-1">Accounts Payable Balance</span>
                            </div>
                        </div>

                        {/* Statement Line-by-Line Reconciliation Table */}
                        <div className="rounded-[2rem] border overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <Scale size={18} className="text-brand-lime" />
                                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Vendor Statement Reconciliation Audit</h3>
                                </div>
                                <span className="text-[10px] font-bold text-dim" style={{ color: 'var(--text-dim)' }}>
                                    Chronological Statement Log
                                </span>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Document / Reference</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Document Type</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Billed Liability (+)</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payments & Credits (-)</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Running Net Balance</th>
                                            <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {(() => {
                                            const reconEntries: Array<{
                                                id: string;
                                                date: Date;
                                                refNumber: string;
                                                type: 'BILL' | 'PAYMENT' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
                                                billedAmount: number;
                                                paidAmount: number;
                                                linkPath: string;
                                            }> = [];

                                            bills.forEach(b => {
                                                reconEntries.push({
                                                    id: b._id,
                                                    date: new Date(b.billDate),
                                                    refNumber: b.billNumber,
                                                    type: 'BILL',
                                                    billedAmount: b.totalAmount,
                                                    paidAmount: 0,
                                                    linkPath: `/admin/financial-admin/bills/${b._id}`
                                                });
                                            });

                                            payments.forEach(p => {
                                                reconEntries.push({
                                                    id: p._id,
                                                    date: new Date(p.paymentDate),
                                                    refNumber: p.paymentCode,
                                                    type: 'PAYMENT',
                                                    billedAmount: 0,
                                                    paidAmount: p.amount,
                                                    linkPath: '#'
                                                });
                                            });

                                            debitNotes.forEach(dn => {
                                                reconEntries.push({
                                                    id: dn._id,
                                                    date: new Date(dn.debitNoteDate || dn.createdAt),
                                                    refNumber: dn.debitNoteNumber,
                                                    type: 'DEBIT_NOTE',
                                                    billedAmount: 0,
                                                    paidAmount: dn.amount || 0,
                                                    linkPath: `/admin/admin/sales/debit-notes/${dn._id}`
                                                });
                                            });

                                            creditNotes.forEach(cn => {
                                                reconEntries.push({
                                                    id: cn._id,
                                                    date: new Date(cn.creditNoteDate || cn.createdAt),
                                                    refNumber: cn.creditNoteNumber,
                                                    type: 'CREDIT_NOTE',
                                                    billedAmount: 0,
                                                    paidAmount: cn.amount || 0,
                                                    linkPath: '#'
                                                });
                                            });

                                            reconEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

                                            let runningBalance = 0;

                                            if (reconEntries.length === 0) {
                                                return <tr><td colSpan={7} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No transaction entries available for reconciliation.</td></tr>;
                                            }

                                            return reconEntries.map((item, idx) => {
                                                runningBalance = runningBalance + item.billedAmount - item.paidAmount;
                                                return (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                        <td className="px-6 py-4 text-xs font-medium text-dim" style={{ color: 'var(--text-dim)' }}>
                                                            {item.date.toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 font-black text-xs text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                            {item.refNumber}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                                item.type === 'BILL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                item.type === 'PAYMENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                item.type === 'DEBIT_NOTE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                            }`}>
                                                                {item.type.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-bold text-rose-400">
                                                            {item.billedAmount > 0 ? `$${fmt(item.billedAmount)}` : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-bold text-emerald-400">
                                                            {item.paidAmount > 0 ? `$${fmt(item.paidAmount)}` : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-black text-white">
                                                            ${fmt(runningBalance)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            {item.linkPath !== '#' ? (
                                                                <button
                                                                    onClick={() => navigate(item.linkPath)}
                                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-brand-lime transition-all cursor-pointer border-none bg-transparent"
                                                                    title="View Detail"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            ) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PROCUREMENTS TAB */}
                {activeTab === 'pos' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>PO Number</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>PO Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Purpose</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Amount</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {purchaseOrders.length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No purchase orders detected for this vendor.</td></tr>
                                    ) : (
                                        purchaseOrders.map((po) => (
                                            <tr 
                                                key={po._id} 
                                                className="hover:bg-white/[0.02] transition-all cursor-pointer" 
                                                style={{ borderBottom: '1px solid var(--border-main)' }}
                                                onClick={() => navigate(`/purchase-orders/${po._id}`)}
                                            >
                                                <td className="px-6 py-4 font-black text-xs text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{po.purchaseOrderNumber}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(po.purchaseOrderDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold uppercase">{po.purpose}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                        po.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                        po.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                                                        'bg-white/5 text-dim border-white/10'
                                                    }`}>
                                                        {po.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. SUPPLIER BILLS TAB */}
                {activeTab === 'bills' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Bill Number</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Bill Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Due Date</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Bill Total</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance Due</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {bills.length === 0 ? (
                                        <tr><td colSpan={6} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No bills generated for this vendor.</td></tr>
                                    ) : (
                                        bills.map((b) => (
                                            <tr 
                                                key={b._id} 
                                                className="hover:bg-white/[0.02] transition-all cursor-pointer" 
                                                style={{ borderBottom: '1px solid var(--border-main)' }}
                                                onClick={() => navigate(`/admin/financial-admin/bills/${b._id}`)}
                                            >
                                                <td className="px-6 py-4 font-black text-xs text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{b.billNumber}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(b.billDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(b.dueDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-rose-400" style={{ color: 'var(--status-failed)' }}>${b.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                        b.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                        b.status === 'PARTIALLY_PAID' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                    }`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 5. PAYMENTS TAB */}
                {activeTab === 'payments' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>PMT Code</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Method</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reference</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount Paid</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {payments.length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No payment records logged for this vendor.</td></tr>
                                    ) : (
                                        payments.map((pmt) => (
                                            <tr key={pmt._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                <td className="px-6 py-4 font-black text-xs text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{pmt.paymentCode}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-white uppercase">{pmt.paymentMethod}</td>
                                                <td className="px-6 py-4 text-xs font-medium text-dim">{pmt.referenceNumber || '—'}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-emerald-400" style={{ color: 'var(--status-active)' }}>${pmt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 6. DEBIT NOTES TAB */}
                {activeTab === 'debit_notes' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Debit Note #</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reason</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount ($)</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Paid ($)</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance ($)</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {debitNotes.length === 0 ? (
                                        <tr><td colSpan={7} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No debit notes issued for this supplier.</td></tr>
                                    ) : (
                                        debitNotes.map((dn) => (
                                            <tr key={dn._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                <td className="px-6 py-4 font-black text-xs text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`/admin/admin/sales/debit-notes/${dn._id}`)} style={{ color: 'var(--brand-lime)' }}>{dn.debitNoteNumber}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{dn.debitNoteDate ? new Date(dn.debitNoteDate).toLocaleDateString() : 'N/A'}</td>
                                                <td className="px-6 py-4 text-xs font-bold italic truncate max-w-[200px]" style={{ color: 'var(--text-dim)' }}>{dn.reason}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-amber-400">${(dn.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-xs font-bold text-emerald-400">${(dn.amountPaid !== undefined ? dn.amountPaid : (dn.status === 'PAID' ? dn.amount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-rose-400">${(dn.balance !== undefined ? dn.balance : (dn.status === 'PAID' ? 0 : dn.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        dn.status === 'PAID' || dn.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        dn.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                        dn.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                        dn.status === 'CANCELLED' || dn.status === 'VOID' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                        dn.status === 'DRAFT' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
                                                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                    }`}>
                                                        {dn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 7. CREDIT NOTES TAB */}
                {activeTab === 'credit_notes' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Note #</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reason</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {creditNotes.length === 0 ? (
                                        <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No credit notes issued for this supplier.</td></tr>
                                    ) : (
                                        creditNotes.map((cn) => (
                                            <tr key={cn._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                <td className="px-6 py-4 font-black text-xs" style={{ color: 'var(--text-main)' }}>{cn.creditNoteNumber}</td>
                                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(cn.creditNoteDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold italic truncate max-w-[200px]" style={{ color: 'var(--text-dim)' }}>{cn.reason}</td>
                                                <td className="px-6 py-4 text-right text-xs font-black text-indigo-400">− ${cn.amount.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                        cn.status === 'APPLIED' || cn.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                                        cn.status === 'OPEN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                                        'bg-white/5 text-dim border-white/10'
                                                    }`}>
                                                        {cn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 8. GENERAL LEDGER VIEW TAB */}
                {activeTab === 'ledger' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        {/* Ledger Journal Table */}
                        <div className="rounded-[2rem] border overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet size={18} className="text-brand-lime" />
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Vendor General Ledger Statement</h3>
                                        <span className="text-[10px] font-bold text-dim block mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                            Chronological History of Supplier Bills, Vendor Payments & Adjustments
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownloadSupplierPdf}
                                    className="px-3.5 py-2 rounded-xl bg-brand-lime/10 text-brand-lime hover:bg-brand-lime/20 border border-brand-lime/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                                >
                                    <Download size={14} /> Download Ledger PDF
                                </button>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Transaction</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reference & Details</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Billed ($)</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Paid ($)</th>
                                            <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {(() => {
                                            interface SupplierStatementRow {
                                                id: string;
                                                date: Date;
                                                type: 'bill' | 'payment' | 'debit_note' | 'credit_note' | 'ledger';
                                                transactionLabel: string;
                                                ref: string;
                                                details: string;
                                                billed: number;
                                                paid: number;
                                                balance?: number;
                                            }

                                            const rows: SupplierStatementRow[] = [];

                                            // 1. Supplier Bills (Billed Liability)
                                            bills.forEach(b => {
                                                rows.push({
                                                    id: `bill-${b._id}`,
                                                    date: new Date(b.billDate),
                                                    type: 'bill',
                                                    transactionLabel: 'Supplier Bill',
                                                    ref: b.billNumber,
                                                    details: `Invoiced (${b.items?.length || 0} line items)`,
                                                    billed: b.totalAmount || 0,
                                                    paid: 0
                                                });
                                            });

                                            // 2. Vendor Payments (Paid Disbursed)
                                            payments.forEach(p => {
                                                const pmtRef = p.paymentCode || p.referenceNumber || `PMT-${p._id}`;
                                                rows.push({
                                                    id: `pmt-${p._id}`,
                                                    date: new Date(p.paymentDate),
                                                    type: 'payment',
                                                    transactionLabel: 'Vendor Payment',
                                                    ref: pmtRef,
                                                    details: `Disbursed via ${p.paymentMethod || 'Bank Transfer'}${p.referenceNumber ? ` (Ref: ${p.referenceNumber})` : ''}`,
                                                    billed: 0,
                                                    paid: p.amount || 0
                                                });
                                            });

                                            // 3. Debit Notes (Reduces Liability)
                                            debitNotes.forEach(dn => {
                                                rows.push({
                                                    id: `dn-${dn._id}`,
                                                    date: new Date(dn.debitNoteDate || dn.createdAt),
                                                    type: 'debit_note',
                                                    transactionLabel: 'Debit Note',
                                                    ref: dn.debitNoteNumber,
                                                    details: `Adjustment: ${dn.reason || 'Vendor Debit'}`,
                                                    billed: 0,
                                                    paid: dn.amount || 0
                                                });
                                            });

                                            // 4. Credit Notes (Increases Liability)
                                            creditNotes.forEach(cn => {
                                                rows.push({
                                                    id: `cn-${cn._id}`,
                                                    date: new Date(cn.creditNoteDate || cn.createdAt),
                                                    type: 'credit_note',
                                                    transactionLabel: 'Credit Note',
                                                    ref: cn.creditNoteNumber,
                                                    details: `Adjustment: ${cn.reason || 'Vendor Credit'}`,
                                                    billed: cn.amount || 0,
                                                    paid: 0
                                                });
                                            });

                                            // 5. Additional Standalone Manual Journal Entries (excluding entries already represented by Bills, Payments, or Vouchers)
                                            backendLedgerEntries.forEach(bl => {
                                                const blDesc = (bl.description || '').toLowerCase();
                                                const blRef = bl.transactionId || bl.voucher?.voucherNumber || 'GL-ENTRY';

                                                // Skip if this ledger entry originates from or is linked to a bill, payment, or voucher
                                                const isFromBillOrPayment = (
                                                    Boolean(bl.voucher) ||
                                                    Boolean(bl.paymentMade) ||
                                                    Boolean(bl.bill) ||
                                                    (Array.isArray(bl.bills) && bl.bills.length > 0) ||
                                                    blDesc.includes('set-off') ||
                                                    blDesc.includes('bill payment') ||
                                                    blDesc.includes('vendor payment') ||
                                                    blDesc.includes('disbursed via') ||
                                                    rows.some(r => 
                                                        (r.ref && blRef && r.ref === blRef) ||
                                                        (r.type === 'payment' && Math.abs(r.paid - bl.amount) < 0.01 && Math.abs(new Date(r.date).getTime() - new Date(bl.entryDate || bl.createdAt).getTime()) < 86400000 * 2) ||
                                                        (r.type === 'bill' && Math.abs(r.billed - bl.amount) < 0.01 && Math.abs(new Date(r.date).getTime() - new Date(bl.entryDate || bl.createdAt).getTime()) < 86400000 * 2)
                                                    )
                                                );

                                                if (!isFromBillOrPayment) {
                                                    rows.push({
                                                        id: bl._id,
                                                        date: new Date(bl.entryDate || bl.createdAt),
                                                        type: 'ledger',
                                                        transactionLabel: bl.type === 'CREDIT' ? 'Ledger Adjustment (Credit)' : 'Ledger Adjustment (Debit)',
                                                        ref: blRef,
                                                        details: bl.description || 'System Journal Entry',
                                                        billed: bl.type === 'CREDIT' ? (bl.amount || 0) : 0,
                                                        paid: bl.type === 'DEBIT' ? (bl.amount || 0) : 0
                                                    });
                                                }
                                            });

                                            if (rows.length === 0) {
                                                return <tr><td colSpan={6} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No ledger transactions found for this vendor.</td></tr>;
                                            }

                                            // Step A: Sort ascending (oldest first) to calculate cumulative running AP balance
                                            rows.sort((a, b) => a.date.getTime() - b.date.getTime());
                                            let runningBal = 0;
                                            rows.forEach(r => {
                                                runningBal = runningBal + r.billed - r.paid;
                                                r.balance = runningBal;
                                            });

                                            // Step B: Sort descending (newest first - LATEST AT TOP) for display
                                            rows.sort((a, b) => b.date.getTime() - a.date.getTime());

                                            return rows.map((r, idx) => {
                                                return (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                        <td className="px-6 py-4 text-xs font-medium text-dim" style={{ color: 'var(--text-dim)' }}>
                                                            {r.date.toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                                                r.type === 'bill' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                                r.type === 'payment' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                r.type === 'debit_note' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                                r.type === 'credit_note' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                'bg-white/5 text-dim border-white/10'
                                                            }`}>
                                                                {r.transactionLabel}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-black text-xs text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{r.ref}</div>
                                                            <div className="text-[10px] font-medium text-dim truncate max-w-[280px]" style={{ color: 'var(--text-dim)' }}>{r.details}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-bold text-indigo-400">
                                                            {r.billed > 0 ? `$${fmt(r.billed)}` : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-bold text-emerald-400">
                                                            {r.paid > 0 ? `$${fmt(r.paid)}` : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-black text-orange-400">
                                                            ${fmt(r.balance || 0)}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Supplier Modal */}
            {isEditModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(8px)"
                    }}
                    onClick={() => setIsEditModalOpen(false)}
                >
                    <div
                        className="rounded-2xl p-6 max-w-4xl w-full mx-2 relative border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300 select-text"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-main)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--text-main)" }}>
                                Edit Supplier Profile
                            </h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Supplier Name */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Supplier Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Enter supplier name"
                                    />
                                </div>

                                {/* Contact Person */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="Enter contact person name"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="Enter email address"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Phone Number
                                    </label>
                                    <PhoneInput
                                        country={"in"}
                                        value={formData.phone}
                                        onChange={(phone) => setFormData({ ...formData, phone })}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "42px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "12px",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            borderRadius: "12px 0 0 12px"
                                        }}
                                        dropdownStyle={{
                                            background: "var(--bg-card)",
                                            color: "var(--text-main)",
                                            border: "1px solid var(--border-main)",
                                            borderRadius: "12px",
                                            marginTop: "4px",
                                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                                        }}
                                    />
                                </div>

                                {/* Category Dropdown */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Custom Category */}
                                {formData.category === 'Other' && (
                                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            Custom Category
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.customCategory}
                                            onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                            placeholder="Specify custom category"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                    Address
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all resize-none"
                                    style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Enter physical address"
                                />
                            </div>

                            {/* Status and Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-main)" }}>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>Status</div>
                                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>Active suppliers can receive Purchase Orders and generate Bills</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                                </label>
                            </div>

                            {/* ERROR */}
                            {formError && (
                                <div className="p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                                    <AlertCircle size={18} />
                                    {formError}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                                    style={{ border: "1px solid var(--border-main)", color: "var(--text-dim)" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-[2] py-3 rounded-xl font-bold flex justify-center items-center shadow-lg hover:-translate-y-0.5 transition-all"
                                    style={{ background: "#C8E600", color: "#0A0A0A" }}
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   UI HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

const SectionCard = ({ title, icon, children }: any) => (
    <div className="p-6 rounded-[1.8rem] border shadow-xl flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center gap-2 pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
            <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{icon}</div>
            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>{title}</h3>
        </div>
        {children}
    </div>
);

const InfoRow = ({ label, value, icon }: any) => (
    <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
            {icon} {label}
        </p>
        <p className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{value || '—'}</p>
    </div>
);

const QuickStatCard = ({ label, value, icon, color }: any) => (
    <div className="p-4 rounded-2xl border shadow-sm flex items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className={`p-2.5 rounded-xl ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-dim'}`}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</span>
            <span className={`text-xs font-black uppercase ${color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : ''}`} style={!color ? { color: 'var(--text-main)' } : {}}>
                {value}
            </span>
        </div>
    </div>
);

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default SupplierDetail;
