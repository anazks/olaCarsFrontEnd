import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    Users, Mail, Phone, MapPin, CreditCard, DollarSign, FileText, 
    RefreshCw, FileSpreadsheet,
    Download, CheckCircle2, AlertCircle, 
    ArrowLeft, Edit2, Zap, Briefcase, Tag, ShoppingBag, Coins, X
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

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'bills' | 'payments' | 'ledger'>('overview');

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

        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.email.trim())) {
            setFormError('Please enter a valid email address.');
            setFormLoading(false);
            return;
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
            const [supRes, billsRes, poRes, paymentsRes] = await Promise.all([
                getSupplierById(id),
                getAllBills({ limit: 1000 }),
                getAllPurchaseOrders({ limit: 1000 }),
                api.get('/api/payments-made', { params: { limit: 1000 } })
            ]);

            setSupplier(supRes);

            // Filter Bills
            if (billsRes && billsRes.data) {
                const filteredBills = billsRes.data.filter((b: Bill) => {
                    const supId = typeof b.supplier === 'object' ? b.supplier._id : b.supplier;
                    return supId === id;
                });
                setBills(filteredBills);
            }

            // Filter Purchase Orders
            if (poRes && poRes.data) {
                const filteredPOs = poRes.data.filter((po: PurchaseOrder) => {
                    const supId = typeof po.supplier === 'object' ? po.supplier._id : po.supplier;
                    return supId === id;
                });
                setPurchaseOrders(filteredPOs);
            }

            // Filter Payments
            const payData = paymentsRes.data?.data || paymentsRes.data || [];
            const filteredPayments = payData.filter((p: any) => {
                const supId = typeof p.supplier === 'object' ? p.supplier._id : p.supplier;
                return supId === id;
            });
            setPayments(filteredPayments);

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

    const outstandingLiability = bills.reduce((sum, b) => sum + (b.balanceDue || 0), 0);
    const supplierAdvanceBalance = Math.max(0, totalPaidAmount - totalAppliedToBills);

    // Dynamic parent route segment mapping for breadcrumbs
    const currentPath = location.pathname;
    const parentPath = currentPath.includes('/admin/financial-admin/') 
        ? '/admin/financial-admin/manage-suppliers' 
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

            {/* Header Section (Aligned with CustomerDetail style) */}
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

            {/* Quick Stats Grid (4 cards aligned with CustomerDetail style) */}
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

            {/* Tab Navigation (Aligned with CustomerDetail style) */}
            <div className="flex items-center gap-1 p-1.5 rounded-2xl border bg-black/20 overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <Users size={14} /> },
                    { id: 'pos', label: 'Procurements (POs)', icon: <ShoppingBag size={14} /> },
                    { id: 'bills', label: 'Supplier Bills', icon: <FileText size={14} /> },
                    { id: 'payments', label: 'Payments & Prepayments', icon: <Coins size={14} /> },
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
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Overview Tab Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                            
                            {/* Contact Details */}
                            <SectionCard title="Contact Information" icon={<Phone size={18} />}>
                                <div className="space-y-4 pt-2">
                                    <InfoRow label="Email Address" value={supplier.email} icon={<Mail size={14} />} />
                                    <InfoRow label="Phone Number" value={supplier.phone} icon={<Phone size={14} />} />
                                    <InfoRow label="Contact Person" value={supplier.contactPerson} icon={<Users size={14} />} />
                                </div>
                            </SectionCard>

                            {/* Operating Location */}
                            <SectionCard title="Operating Address" icon={<MapPin size={18} />}>
                                <div className="space-y-4 pt-2">
                                    <InfoRow label="Address Details" value={supplier.address} icon={<MapPin size={14} />} />
                                    <InfoRow label="Business Category" value={supplier.category} icon={<Tag size={14} />} />
                                </div>
                            </SectionCard>

                            {/* Double-Entry Ledger Summary Card */}
                            <SectionCard title="Balance Reconciliation" icon={<CreditCard size={18} />}>
                                <div className="space-y-4 pt-2">
                                    <InfoRow label="Total Billed" value={`$${totalBilledAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <InfoRow label="Total Settled" value={`$${totalAppliedToBills.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                                    <div className="pt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Advance Balance</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${supplierAdvanceBalance > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-dim border-white/10'}`}>
                                            ${supplierAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Extra Payment Tally Alert */}
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
                                        * This advance balance is stored securely as a debit balance in Accounts Payable (2100) and is available to settle future bills generated from this supplier.
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}

                {/* Procurements Tab */}
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
                                                onClick={() => navigate(`/admin/financial-admin/purchase-orders/${po._id}`)}
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

                {/* Bills Tab */}
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

                {/* Payments Tab */}
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

                {/* Ledger View Tab */}
                {activeTab === 'ledger' && (
                    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Transaction / Voucher</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Debit (Disbursed)</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Credit (Liability Billed)</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Running Liability Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {(() => {
                                        const entries: Array<{
                                            label: string;
                                            date: Date;
                                            debit: number;
                                            credit: number;
                                        }> = [];

                                        bills.forEach(b => {
                                            entries.push({
                                                label: `Bill ${b.billNumber}`,
                                                date: new Date(b.billDate),
                                                debit: 0,
                                                credit: b.totalAmount
                                            });
                                        });

                                        payments.forEach(p => {
                                            entries.push({
                                                label: `Payment Made ${p.paymentCode}`,
                                                date: new Date(p.paymentDate),
                                                debit: p.amount,
                                                credit: 0
                                            });
                                        });

                                        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

                                        let runningBalance = 0;

                                        if (entries.length === 0) {
                                            return <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No double-entry ledger bookings for this vendor.</td></tr>;
                                        }

                                        return entries.map((ent, idx) => {
                                            runningBalance = runningBalance + ent.credit - ent.debit;
                                            return (
                                                <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                    <td className="px-6 py-4 font-black text-xs" style={{ color: 'var(--text-main)' }}>{ent.label}</td>
                                                    <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{ent.date.toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-right text-xs font-bold text-emerald-400">
                                                        {ent.debit > 0 ? `$${ent.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-xs font-bold text-rose-400">
                                                        {ent.credit > 0 ? `$${ent.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-xs font-black text-orange-400">
                                                        ${runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
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
                                        required
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

                                {/* Custom Category (Conditional) */}
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
