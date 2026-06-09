import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, CreditCard, DollarSign, FileText, 
    RefreshCw, Calendar, FileSpreadsheet,
    Download, CheckCircle2, AlertCircle,
    ArrowLeft, Zap, Briefcase
} from 'lucide-react';
import { getCustomerById, updateCustomer, type Customer } from '../../../../services/customerService';
import { driverService } from '../../../../services/driverService';
import { getInvoicesByCustomer, type Invoice } from '../../../../services/invoiceService';
import { getAllCreditNotes, type CreditNote } from '../../../../services/creditNoteService';
import api from '../../../../services/api';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'emi' | 'invoices' | 'payments' | 'credit_notes'>('overview');

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch customer first — this is the critical call
            const customerData = await getCustomerById(id);
            const resolvedCustomer = customerData.data || customerData;
            setCustomer(resolvedCustomer);

            // Use the actual customer _id for related data queries
            const customerId = resolvedCustomer._id || id;

            // Fetch related data in parallel, but don't let one failure block the rest
            const [invoicesResult, creditNotesResult, paymentsResult] = await Promise.allSettled([
                getInvoicesByCustomer(customerId),
                getAllCreditNotes({ customerId }),
                api.get('/api/payments-received', { params: { customerId, limit: 100 } })
            ]);

            setInvoices(invoicesResult.status === 'fulfilled' ? invoicesResult.value : []);
            setCreditNotes(creditNotesResult.status === 'fulfilled' ? (creditNotesResult.value?.data || []) : []);
            setPayments(paymentsResult.status === 'fulfilled' ? (paymentsResult.value?.data?.data || paymentsResult.value?.data || []) : []);
        } catch (error) {
            console.error('Error fetching customer detail data:', error);
            toast.error('Failed to load customer details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleStatus = async () => {
        if (!customer) return;
        const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const toastId = toast.loading(`Updating status to ${newStatus}...`);
        try {
            await updateCustomer(customer._id, { status: newStatus });
            toast.success(`Customer status updated to ${newStatus}`, { id: toastId });
            fetchData();
        } catch (err: any) {
            console.error('Failed to update customer status:', err);
            toast.error(err.message || 'Failed to update status', { id: toastId });
        }
    };

    const handleToggleDriverStatus = async () => {
        if (!customer || !customer.driver) return;
        const driverId = customer.driver._id;
        const newStatus = customer.driver.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const toastId = toast.loading(`Updating driver status to ${newStatus}...`);
        try {
            await driverService.updateDriver(driverId, { status: newStatus });
            toast.success(`Driver status updated to ${newStatus}`, { id: toastId });
            fetchData();
        } catch (err: any) {
            console.error('Failed to update driver status:', err);
            toast.error(err.message || 'Failed to update driver status', { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-dim animate-pulse">Loading Customer Profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="container-responsive py-20 text-center space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-12 max-w-md mx-auto shadow-2xl">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Profile Not Found</h3>
                    <p className="text-xs font-medium text-dim mt-2 mb-8">The customer record you are looking for does not exist or has been archived.</p>
                    <button onClick={() => navigate('..')} className="w-full py-3 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all text-white">
                        Return to Registry
                    </button>
                </div>
            </div>
        );
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmountDue || 0), 0);
    const totalPaymentsReceived = payments.reduce((sum, p) => p.status === 'VOID' ? sum : sum + (p.amountReceived || 0), 0);
    const totalApplied = payments.reduce((sum, p) => {
        if (p.status === 'VOID') return sum;
        const applied = p.invoices?.reduce((invSum: number, inv: any) => invSum + (inv.amountApplied || 0), 0) || 0;
        return sum + applied;
    }, 0);
    const prepaymentBalance = Math.max(0, totalPaymentsReceived - totalApplied);
    const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const handleExportStatement = () => {
        const toastId = toast.loading("Generating Statement CSV...");

        try {
            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Build Header metadata
            const metadataRows = [
                ['CUSTOMER STATEMENT OF ACCOUNT', ''],
                ['Customer Name', customer.name],
                ['Customer ID', customer.customerId || 'TEMP-ID'],
                ['Email', customer.email || 'N/A'],
                ['Phone', customer.phone || 'N/A'],
                ['Registered Date', new Date(customer.createdAt).toLocaleDateString()],
                ['Account Status', customer.status || 'N/A'],
                ['Outstanding Balance', `$${outstandingBalance.toFixed(2)}`],
                ['Prepayment Credit Balance', `$${prepaymentBalance.toFixed(2)}`],
                ['', ''], // Empty row spacer
            ];

            // Build Transactions Header
            const headers = [
                'Date',
                'Transaction Type',
                'Reference Number',
                'Details / Description',
                'Debit (Charges) ($)',
                'Credit (Payments/Notes) ($)',
                'Running Balance ($)',
                'Status'
            ];

            // Consolidate all transactions: Invoices, Payments, Credit Notes
            interface TransactionItem {
                date: Date;
                type: 'Invoice' | 'Payment' | 'Credit Note';
                refNumber: string;
                description: string;
                debit: number;
                credit: number;
                status: string;
            }

            const txList: TransactionItem[] = [];

            // Add Invoices
            invoices.forEach(inv => {
                txList.push({
                    date: new Date(inv.dueDate || inv.generatedAt || new Date()),
                    type: 'Invoice',
                    refNumber: inv.invoiceNumber || '—',
                    description: inv.weekLabel ? `Rental Charge: ${inv.weekLabel}` : 'Rental Charge',
                    debit: inv.totalAmountDue || 0,
                    credit: 0,
                    status: inv.status || '—'
                });
            });

            // Add Payments
            payments.forEach(pmt => {
                if (pmt.status === 'VOID') return; // Ignore voided payments in financial statements
                txList.push({
                    date: new Date(pmt.paymentDate || new Date()),
                    type: 'Payment',
                    refNumber: pmt.paymentNumber || '—',
                    description: `Payment Received via ${pmt.paymentMethod || 'Other'}`,
                    debit: 0,
                    credit: pmt.amountReceived || 0,
                    status: pmt.status || '—'
                });
            });

            // Add Credit Notes
            creditNotes.forEach(cn => {
                txList.push({
                    date: new Date(cn.creditNoteDate || new Date()),
                    type: 'Credit Note',
                    refNumber: cn.creditNoteNumber || '—',
                    description: cn.reason ? `Credit Note: ${cn.reason}` : 'Credit Note Issued',
                    debit: 0,
                    credit: cn.amount || 0,
                    status: cn.status || '—'
                });
            });

            // Sort transactions chronologically
            txList.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Compute running balance
            let runningBalance = 0;
            const transactionRows = txList.map(tx => {
                runningBalance += tx.debit - tx.credit;
                return [
                    tx.date.toLocaleDateString(),
                    tx.type,
                    tx.refNumber,
                    tx.description,
                    tx.debit > 0 ? tx.debit.toFixed(2) : '0.00',
                    tx.credit > 0 ? tx.credit.toFixed(2) : '0.00',
                    runningBalance.toFixed(2),
                    tx.status
                ];
            });

            // Combine everything into CSV format
            const csvRows = [
                ...metadataRows.map(row => row.map(escapeCSV).join(',')),
                headers.map(escapeCSV).join(','),
                ...transactionRows.map(row => row.map(escapeCSV).join(','))
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const safeName = customer.name.toLowerCase().replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${safeName}_statement_${dateStr}.csv`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Statement CSV downloaded successfully!", { id: toastId });
        } catch (error) {
            console.error("Failed to generate statement CSV:", error);
            toast.error("Failed to export statement", { id: toastId });
        }
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        const toastId = toast.loading("Generating statement PDF from backend...");
        try {
            // Note: Update backend route to use customer-based statement if available, or call standard statement with fallback
            const res = await api.get(`/api/customers/${id}/statement/pdf`, { responseType: 'blob' }).catch(async () => {
                // Fallback to driver statement if customer endpoint isn't fully routed yet
                if (customer.driver?._id) {
                    return await api.get(`/api/driver/${customer.driver._id}/statement/pdf`, { responseType: 'blob' });
                }
                throw new Error("Statement PDF not available for non-driver customers yet.");
            });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Download PDF file
            const link = document.createElement('a');
            link.href = url;
            const safeName = customer.name.toLowerCase().replace(/\s+/g, '_') || 'customer';
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `${safeName}_statement_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("PDF statement downloaded successfully!", { id: toastId });
        } catch (err: any) {
            console.error("Failed to generate PDF:", err);
            toast.error(err.message || "Failed generating statement PDF document.", { id: toastId });
        }
    };

    return (
        <div className="container-responsive space-y-6 pb-20 animate-in fade-in duration-500">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '/admin/financial-admin/customers' },
                    { label: 'Customers', path: '/admin/financial-admin/customers' },
                    { label: customer.name, active: true }
                ]} 
            />

            {/* Header Section (Aligned with VehicleDetail style) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" 
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {customer.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{customer.customerId || 'TEMP-ID'}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                Registered {new Date(customer.createdAt).toLocaleDateString()}
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
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>

                    <button 
                        onClick={handleToggleStatus}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm active:scale-95 border cursor-pointer ${
                            customer.status === 'ACTIVE' 
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                        }`}
                    >
                        <Zap size={14} /> {customer.status === 'ACTIVE' ? 'Deactivate Customer' : 'Activate Customer'}
                    </button>

                    {customer.driver && (
                        <button 
                            onClick={handleToggleDriverStatus}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm active:scale-95 border cursor-pointer ${
                                customer.driver.status === 'ACTIVE' 
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                            }`}
                        >
                            <User size={14} /> {customer.driver.status === 'ACTIVE' ? 'Deactivate Driver' : 'Activate Driver'}
                        </button>
                    )}

                    <button 
                        onClick={handleExportStatement}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Download size={14} className="opacity-70" /> Export CSV
                    </button>

                    <button 
                        onClick={handleDownloadPdf}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <FileText size={14} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <QuickStatCard 
                    label="Customer Status" 
                    value={customer.status} 
                    icon={<Zap size={16} />} 
                    color={customer.status === 'ACTIVE' ? 'emerald' : 'rose'} 
                />
                <QuickStatCard 
                    label="Current Balance" 
                    value={`$${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    icon={<DollarSign size={16} />} 
                    color={outstandingBalance > 0 ? 'rose' : 'emerald'}
                />
                <QuickStatCard 
                    label="Prepayment Credit (Extra)" 
                    value={`$${prepaymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    icon={<CheckCircle2 size={16} />} 
                    color={prepaymentBalance > 0 ? 'emerald' : undefined}
                />
                <QuickStatCard 
                    label="Total Received" 
                    value={`$${totalPaymentsReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                    icon={<DollarSign size={16} />} 
                />
                <QuickStatCard 
                    label="Branch" 
                    value={customer.branch?.name || 'N/A'} 
                    icon={<Briefcase size={16} />} 
                />
            </div>

            {/* Tab Navigation (Aligned with VehicleDetail style) */}
            <div className="flex items-center gap-1 p-1.5 rounded-2xl border bg-black/20 overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
                    { id: 'emi', label: 'EMI / Rent Plan', icon: <Calendar size={14} /> },
                    { id: 'invoices', label: 'Payables (Invoices)', icon: <FileText size={14} /> },
                    { id: 'payments', label: 'Payments Received', icon: <DollarSign size={14} /> },
                    { id: 'credit_notes', label: 'Credit Notes', icon: <FileSpreadsheet size={14} /> },
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
                    </button>
                ))}
            </div>

            {/* Tab Content Section */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <OverviewTab 
                        customer={customer} 
                        prepaymentBalance={prepaymentBalance}
                        totalPaymentsReceived={totalPaymentsReceived}
                        totalApplied={totalApplied}
                        totalInvoiced={totalInvoiced}
                    />
                )}
                {activeTab === 'emi' && <EMITab customer={customer} invoices={invoices} />}
                {activeTab === 'invoices' && <InvoicesTab invoices={invoices} />}
                {activeTab === 'payments' && <PaymentsTab payments={payments} />}
                {activeTab === 'credit_notes' && <CreditNotesTab creditNotes={creditNotes} />}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS (TABS)
   ───────────────────────────────────────────────────────────────────────────── */

const OverviewTab = ({ 
    customer, 
    prepaymentBalance, 
    totalPaymentsReceived, 
    totalApplied,
    totalInvoiced
}: { 
    customer: Customer;
    prepaymentBalance: number;
    totalPaymentsReceived: number;
    totalApplied: number;
    totalInvoiced: number;
}) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
            {/* Personal Details */}
            <SectionCard title="Contact Information" icon={<Phone size={18} />}>
                <div className="space-y-4 pt-2">
                    <InfoRow label="Email Address" value={customer.email} icon={<Mail size={14} />} />
                    <InfoRow label="Phone Number" value={customer.phone} icon={<Phone size={14} />} />
                    <InfoRow label="WhatsApp" value={customer.whatsappNumber || 'N/A'} icon={<Phone size={14} />} />
                    <InfoRow label="Address" value={customer.address ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''}, ${customer.country || ''}` : 'N/A'} icon={<MapPin size={14} />} />
                </div>
            </SectionCard>

            {/* Double-Entry Ledger Summary Card */}
            <SectionCard title="Balance Reconciliation" icon={<CreditCard size={18} />}>
                <div className="space-y-4 pt-2">
                    <InfoRow label="Total Invoiced" value={`$${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    <InfoRow label="Total Payments Applied" value={`$${totalApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                    <div className="pt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Prepayment Credit (Extra)</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${prepaymentBalance > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-dim border-white/10'}`}>
                            ${prepaymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </SectionCard>

            {/* Emergency & Bank details */}
            <SectionCard title="Driver Association" icon={<User size={18} />}>
                <div className="space-y-4 pt-2">
                    {customer.driver ? (
                        <>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Driver ID</p>
                                <p className="text-xs font-bold text-white">{(customer.driver as any).driverId || 'TEMP-ID'}</p>
                            </div>
                            <div className="space-y-1 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Emergency Contact</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{(customer.driver as any).emergencyContact?.name || 'N/A'}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{(customer.driver as any).emergencyContact?.phone || 'N/A'} ({(customer.driver as any).emergencyContact?.relationship || 'Other'})</p>
                            </div>
                            <div className="space-y-1 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Active Vehicle Assignment</p>
                                <p className="text-xs font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                    {(customer.driver as any).currentVehicle?.basicDetails?.make} {(customer.driver as any).currentVehicle?.basicDetails?.model || 'No vehicle assigned'}
                                </p>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs font-medium text-dim">This customer is not registered as a driver and has no vehicle assignments.</p>
                    )}
                </div>
            </SectionCard>
        </div>

        {/* Extra Payment Tally Alert */}
        {prepaymentBalance > 0 ? (
            <div className="p-5 rounded-[2rem] border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ background: 'rgba(200, 230, 0, 0.04)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center shrink-0 border border-brand-lime/20">
                    <CheckCircle2 className="text-brand-lime" size={18} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-lime">Extra Prepayment Advance Detected</h4>
                    <p className="text-[10px] font-semibold text-white/90 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        Tally Complete: The total payment received from this customer (${totalPaymentsReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}) exceeds the total amounts applied to their invoices (${totalApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}).
                    </p>
                    <p className="text-[11px] font-black text-[#C8E600] mt-1.5">
                        Current Customer Prepayment Credit Balance (Extra): ${prepaymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[9px] font-bold text-dim block italic mt-1">
                        * This advance balance is stored securely as a prepayment credit and is automatically applied to future invoices generated for this customer.
                    </span>
                </div>
            </div>
        ) : null}
    </div>
);

const EMITab = ({ customer, invoices }: { customer: Customer, invoices: Invoice[] }) => {
    const rentTracking = customer.driver?.rentTracking || [];
    const totalContract = rentTracking.reduce((s: number, i: any) => s + i.amount, 0);
    const totalPaid = invoices.reduce((s: number, i: Invoice) => s + (i.amountPaid || 0), 0);
    const balance = invoices.reduce((s: number, i: Invoice) => s + (i.balance || 0), 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Contract Value" value={`$${totalContract.toLocaleString()}`} icon={<FileText size={20} />} />
                <SummaryCard label="Amount Collected" value={`$${totalPaid.toLocaleString()}`} icon={<CheckCircle2 size={20} />} color="emerald" />
                <SummaryCard label="Active Balance" value={`$${balance.toLocaleString()}`} icon={<AlertCircle size={20} />} color="rose" />
            </div>

            <div className="rounded-[2rem] border overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Cycle</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Due Date</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Collected</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {rentTracking.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No repayment plan generated for this customer yet.</td></tr>
                            ) : (
                                rentTracking.map((item: any, idx: number) => {
                                    const invoice = invoices.find(inv => inv.weekNumber === item.weekNumber);
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-7 h-7 rounded bg-black/40 flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-main)' }}>{item.weekNumber}</div>
                                                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{item.weekLabel}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                                            <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${item.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>${(invoice?.amountPaid || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                    item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    item.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                                    'bg-white/5 text-dim border-white/10'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const InvoicesTab = ({ invoices }: { invoices: Invoice[] }) => (
    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Invoice #</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Period</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Due</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                    {invoices.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No invoices generated for this customer.</td></tr>
                    ) : (
                        invoices.map((inv) => (
                            <tr key={inv._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                <td className="px-6 py-4 font-black text-xs" style={{ color: 'var(--text-main)' }}>{inv.invoiceNumber}</td>
                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{inv.weekLabel}</td>
                                <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${inv.totalAmountDue.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold text-rose-400" style={{ color: 'var(--status-failed)' }}>${inv.balance.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                        inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                        inv.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                        'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                    }`}>
                                        {inv.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const PaymentsTab = ({ payments }: { payments: any[] }) => (
    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>PR #</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Method</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Received</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount Applied</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Prepayment Extra</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                    {payments.length === 0 ? (
                        <tr><td colSpan={7} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No payment records found for this customer.</td></tr>
                    ) : (
                        payments.map((pmt) => {
                            const applied = pmt.invoices?.reduce((s: number, i: any) => s + (i.amountApplied || 0), 0) || 0;
                            const extra = Math.max(0, pmt.amountReceived - applied);
                            return (
                                <tr key={pmt._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                    <td className="px-6 py-4 font-black text-xs" style={{ color: 'var(--text-main)' }}>{pmt.paymentNumber}</td>
                                    <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(pmt.paymentDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-xs font-bold text-brand-lime uppercase" style={{ color: 'var(--brand-lime)' }}>{pmt.paymentMethod}</td>
                                    <td className="px-6 py-4 text-right text-xs font-black text-emerald-400" style={{ color: 'var(--status-active)' }}>+ ${pmt.amountReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-right text-xs font-bold text-white">${applied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className={`px-6 py-4 text-right text-xs font-black ${extra > 0 ? 'text-[#C8E600]' : 'text-dim'}`}>
                                        {extra > 0 ? `$${extra.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                                            {pmt.status}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const CreditNotesTab = ({ creditNotes }: { creditNotes: CreditNote[] }) => (
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
                        <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No credit notes issued for this customer.</td></tr>
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
);

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

const SummaryCard = ({ label, value, icon, color = 'brand-lime' }: any) => (
    <div className="p-6 rounded-[2rem] border shadow-xl relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className={`p-2 rounded-xl w-fit mb-4 ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-lime/10 text-brand-lime'}`}>
            {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>{label}</p>
        <p className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{value}</p>
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

export default CustomerDetail;
