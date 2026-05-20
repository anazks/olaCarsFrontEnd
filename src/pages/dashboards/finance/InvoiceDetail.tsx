import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    DollarSign, Calendar, CheckCircle2, Clock, AlertCircle, X, 
    Printer, ArrowLeft, Edit3, FileSpreadsheet, Trash2,
    User, Landmark, History, Package, Receipt, FileText
} from 'lucide-react';
import { getInvoiceById, payInvoice, updateInvoice, deleteInvoice, getInvoicesByDriver } from '../../../services/invoiceService';
import { createCreditNote, getAllCreditNotes, applyCreditNote } from '../../../services/creditNoteService';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { Invoice } from '../../../services/invoiceService';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const InvoiceDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editBaseAmount, setEditBaseAmount] = useState<number>(0);
    const [editDueDate, setEditDueDate] = useState<string>('');
    const [editWeekLabel, setEditWeekLabel] = useState<string>('');
    const [submittingEdit, setSubmittingEdit] = useState(false);

    // Record Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [paymentNote, setPaymentNote] = useState<string>('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [driverPrepayment, setDriverPrepayment] = useState<number>(0);
    const [usePrepayment, setUsePrepayment] = useState<boolean>(false);

    // Issue Credit Note Modal State
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [cnAmount, setCnAmount] = useState<number>(0);
    const [cnReason, setCnReason] = useState('Vehicle Downtime Adjustment');
    const [cnNotes, setCnNotes] = useState('');
    const [submittingCN, setSubmittingCN] = useState(false);

    // Linked Credit Notes
    const [linkedCreditNotes, setLinkedCreditNotes] = useState<any[]>([]);

    const fetchInvoice = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getInvoiceById(id);
            setInvoice(res);
            setError(null);

            // Fetch Ledger entries for this invoice
            try {
                const ledgerRes = await getLedgerEntries({ search: res.invoiceNumber });
                setLedgerEntries(ledgerRes.data || []);
            } catch (e) {
                console.error("Error loading ledger entries:", e);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed loading invoice details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchLinkedCreditNotes = useCallback(async () => {
        if (!id) return;
        try {
            const res = await getAllCreditNotes({ invoiceId: id });
            if (res.success) {
                setLinkedCreditNotes(res.data || []);
            }
        } catch (e) {
            console.error("Error loading linked credit notes:", e);
        }
    }, [id]);

    useEffect(() => {
        fetchInvoice();
        fetchLinkedCreditNotes();
    }, [fetchInvoice, fetchLinkedCreditNotes]);

    useEffect(() => {
        const fetchDriverPrepayment = async () => {
            if (!paymentModalOpen || !invoice) return;
            const driverId = typeof invoice.driver === 'object' ? invoice.driver._id : invoice.driver;
            if (!driverId) return;
            
            try {
                const [, paymentsData] = await Promise.all([
                    getInvoicesByDriver(driverId),
                    api.get('/api/payments-received', { params: { driverId, limit: 100 } })
                ]);
 
                // Calculate Prepayment Credit
                const paymentsList = paymentsData?.data?.data || paymentsData?.data || [];
                const totalReceived = paymentsList.reduce((sum: number, p: any) => p.status === 'VOID' ? sum : sum + (p.amountReceived || 0), 0);
                const totalApplied = paymentsList.reduce((sum: number, p: any) => {
                    if (p.status === 'VOID') return sum;
                    const applied = p.invoices?.reduce((invSum: number, inv: any) => invSum + (inv.amountApplied || 0), 0) || 0;
                    return sum + applied;
                }, 0);
                const prepayment = Math.max(0, totalReceived - totalApplied);
                setDriverPrepayment(prepayment);
            } catch (err) {
                console.error("Error fetching driver prepayment balance:", err);
            }
        };

        fetchDriverPrepayment();
    }, [paymentModalOpen, invoice]);

    const triggerEditModal = () => {
        if (!invoice) return;
        setEditBaseAmount(invoice.baseAmount || 0);
        setEditDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
        setEditWeekLabel(invoice.weekLabel || '');
        setIsEditModalOpen(true);
    };

    const handleEditInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !invoice) return;
        setSubmittingEdit(true);
        try {
            await updateInvoice(id, {
                baseAmount: editBaseAmount,
                dueDate: editDueDate,
                weekLabel: editWeekLabel
            });
            toast.success("Invoice params adjusted!");
            setIsEditModalOpen(false);
            await fetchInvoice();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed editing invoice.");
        } finally {
            setSubmittingEdit(false);
        }
    };

    const triggerPaymentModal = () => {
        if (!invoice) return;
        setPaymentAmount(invoice.balance);
        setPaymentNote('');
        setPaymentMethod('CASH');
        setUsePrepayment(false);
        setDriverPrepayment(0);
        setPaymentModalOpen(true);
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !invoice) return;
        if (paymentAmount <= 0) {
            toast.error('Provide valid settlement amount.');
            return;
        }
        setProcessingPayment(true);
        try {
            await payInvoice(id, {
                amount: paymentAmount,
                paymentMethod,
                note: paymentNote
            });
            toast.success('Payment processed!');
            setPaymentModalOpen(false);
            await fetchInvoice();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failure recording payment.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const triggerCreditNoteModal = () => {
        if (!invoice) return;
        setCnAmount(invoice.balance);
        setCnNotes('');
        setCnReason('Vehicle Downtime Assessment');
        setIsCreditNoteModalOpen(true);
    };

    const handleCreateCN = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;
        if (cnAmount <= 0 || cnAmount > invoice.balance) {
            toast.error(`Credit Note cannot exceed the active balance of $${invoice.balance}`);
            return;
        }
        setSubmittingCN(true);
        try {
            const driverId = typeof invoice.driver === 'object' ? invoice.driver._id : invoice.driver;
            await createCreditNote({
                driverId,
                invoiceId: invoice._id,
                amount: Number(cnAmount),
                reason: cnReason,
                notes: cnNotes,
                creditNoteDate: new Date().toISOString().split('T')[0]
            });
            toast.success("Credit Note issued in OPEN status!");
            setIsCreditNoteModalOpen(false);
            setCnAmount(0);
            setCnNotes('');
            await fetchInvoice();
            await fetchLinkedCreditNotes();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create credit note.");
        } finally {
            setSubmittingCN(false);
        }
    };

    const handleApplyCreditNoteToInvoice = async (cnId: string) => {
        if (!invoice) return;
        if (!window.confirm("Apply this Credit Note balance towards this Invoice outstanding?")) return;
        try {
            const res = await applyCreditNote(cnId, invoice._id);
            if (res.success) {
                toast.success("Credit Note successfully posted!");
                await fetchInvoice();
                await fetchLinkedCreditNotes();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed posting application.");
        }
    };

    const handleDeleteInvoice = async () => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
        try {
            await deleteInvoice(id!);
            toast.success('Invoice deleted successfully');
            navigate('../invoices');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete invoice');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Breadcrumbs items={[{ label: 'Sales', path: '../invoices' }, { label: 'Invoices', path: '../invoices' }, { label: 'Invoice Detail', active: true }]} />
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading invoice details...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-2xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Invoice Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The invoice you're looking for doesn't exist or you don't have access."}</p>
                <button onClick={() => navigate('../invoices')} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 select-text">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '../invoices' },
                    { label: 'Invoices', path: '../invoices' },
                    { label: invoice.invoiceNumber, active: true }
                ]} 
            />

            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('../invoices')} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {invoice.invoiceNumber}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={invoice.status} />
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-dim" style={{ color: 'var(--text-dim)' }}>
                                {invoice.weekLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {invoice.status !== 'PAID' && (
                        <button 
                            onClick={triggerEditModal}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs rounded-xl transition-all"
                            style={{ color: 'var(--text-main)' }}
                        >
                            <Edit3 size={14} /> Edit Invoice
                        </button>
                    )}

                    {invoice.balance > 0 && (
                        <button 
                            onClick={triggerCreditNoteModal}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-400 font-bold text-xs rounded-xl transition-all"
                        >
                            <FileSpreadsheet size={14} /> Issue Credit Note
                        </button>
                    )}

                    {invoice.status !== 'PAID' && (
                        <button 
                            onClick={triggerPaymentModal}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#C8E600] text-black font-black text-xs hover:scale-[1.02] active:scale-95 transition-all rounded-xl shadow-lg"
                        >
                            <DollarSign size={14} strokeWidth={3}/> Record Payment
                        </button>
                    )}

                    <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/5 border border-white/10 font-bold text-xs rounded-xl hover:bg-white/10 transition-all" style={{ color: 'var(--text-main)' }}>
                        <Printer size={14}/> Print
                    </button>

                    <button 
                        onClick={handleDeleteInvoice}
                        className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-xs rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                    >
                        <Trash2 size={14}/> Delete
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Summary Card & Items & Ledgers */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Summary Card */}
                    <div className="rounded-2xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Operator / Driver</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {(invoice.driver as any)?.personalInfo?.fullName || 'N/A'}
                                    </p>
                                    <span className="text-[10px] text-dim block" style={{ color: 'var(--text-dim)' }}>ID: {(invoice.driver as any)?.driverId || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Vehicle Context</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {invoice.vehicle ? `${(invoice.vehicle as any).make || ''} ${(invoice.vehicle as any).model || ''} (${(invoice.vehicle as any).plateNumber || ''})` : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Lease Due Date</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Invoice Type</p>
                                    <p className="font-bold text-sm uppercase" style={{ color: 'var(--text-main)' }}>
                                        {invoice.invoiceType}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Double-Entry Ledger Impact (Debit & Credit Accounts) */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                                <Landmark size={16} className="text-[#C8E600]" />
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Double-Entry Ledger Impact</h3>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10" style={{ color: 'var(--text-dim)' }}>
                                {ledgerEntries.length} entries posted
                            </span>
                        </div>
                        {ledgerEntries.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date</th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account</th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs">
                                    {ledgerEntries.map((entry, idx) => {
                                        const entryDateStr = entry.entryDate || entry.date;
                                        const dateObj = new Date(entryDateStr);
                                        const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : entryDateStr;

                                        return (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{formattedDate}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {entry.accountingCode?.code} - {entry.accountingCode?.name}
                                                    </div>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-dim" style={{ color: 'var(--text-dim)' }}>
                                                        {entry.accountingCode?.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {entry.type === 'DEBIT' ? (
                                                        <span className="font-bold text-red-400">${entry.amount.toFixed(2)}</span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {entry.type === 'CREDIT' ? (
                                                        <span className="font-bold text-green-400">${entry.amount.toFixed(2)}</span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-6 text-center text-xs opacity-60" style={{ color: 'var(--text-dim)' }}>
                                No ledger entries found for this invoice.
                            </div>
                        )}
                    </div>

                    {/* Order Items Table */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileText size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Statement Specifications</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Item</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Price</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Qty</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {invoice.invoiceType === 'MANUAL' && invoice.lineItems && invoice.lineItems.length > 0 ? (
                                    invoice.lineItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{item.name}</div>
                                                {item.description && (
                                                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.description}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>${item.unitPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{item.qty}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                                ${(item.unitPrice * item.qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Weekly Vehicle Rent Lease Rate</div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Base lease rate evaluation for cycle period.</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>${invoice.baseAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>1</td>
                                        <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                            ${invoice.baseAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}
                                
                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-4 text-right font-bold text-xs" style={{ color: 'var(--text-dim)' }}>Subtotal</td>
                                    <td className="px-6 py-4 text-right font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        ${(invoice.subtotal || invoice.totalAmountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                {(invoice.discountAmount || 0) > 0 && (
                                    <tr className="bg-white/5">
                                        <td colSpan={3} className="px-6 py-3 text-right font-bold text-xs text-rose-400">Discount {invoice.discountType === 'PERCENTAGE' ? `(${invoice.discountValue}%)` : ''}</td>
                                        <td className="px-6 py-3 text-right font-bold text-sm text-rose-400">
                                            − ${invoice.discountAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}

                                {(invoice.taxAmount || 0) > 0 && (
                                    <tr className="bg-white/5">
                                        <td colSpan={3} className="px-6 py-3 text-right font-bold text-xs text-blue-400">Tax ({invoice.taxRate}%)</td>
                                        <td className="px-6 py-3 text-right font-bold text-sm text-blue-400">
                                            + ${invoice.taxAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )}

                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-4 text-right font-black text-xs" style={{ color: 'var(--text-dim)' }}>Total Amount Due</td>
                                    <td className="px-6 py-4 text-right text-xl font-black text-[#C8E600]">
                                        ${invoice.totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-3 text-right font-bold text-xs text-emerald-400">Payments Received</td>
                                    <td className="px-6 py-3 text-right font-bold text-sm text-emerald-400">
                                        − ${(invoice.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>

                                <tr className="bg-white/10">
                                    <td colSpan={3} className="px-6 py-4 text-right font-black text-sm" style={{ color: 'var(--text-main)' }}>Remaining Balance</td>
                                    <td className="px-6 py-4 text-right text-lg font-black text-[#C8E600] font-mono">
                                        ${invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Alerts & History */}
                <div className="space-y-6">
                    
                    {/* Payment Status Info Alert */}
                    <div className="p-5 rounded-2xl border flex flex-col gap-3"
                        style={{
                            background: invoice.status === 'PAID' ? 'rgba(34,197,94,0.05)' : 'rgba(245,158,11,0.05)',
                            borderColor: invoice.status === 'PAID' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'
                        }}>
                        <div className="flex items-center gap-2 font-bold text-xs uppercase" style={{ color: invoice.status === 'PAID' ? '#22c55e' : '#f59e0b' }}>
                            <AlertCircle size={14} />
                            Payment Status Context
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                            {invoice.status === 'PAID' 
                                ? `This invoice is fully settled and closed. No further actions are required.`
                                : `This invoice is outstanding with a remaining balance of $${invoice.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`
                            }
                        </p>
                    </div>

                    {/* Settlement & Direct Payments History */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <History size={14} className="text-[#C8E600]" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Recorded Payments</h3>
                        </div>
                        {invoice.payments && invoice.payments.length > 0 ? (
                            <div className="p-5 space-y-4">
                                {invoice.payments.map((pay, i) => (
                                    <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                        {i !== invoice.payments.length - 1 && (
                                            <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                        )}
                                        <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(pay.paidAt).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm mt-0.5 font-bold text-emerald-400">
                                            ${pay.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                        <span className="text-[10px] uppercase font-bold tracking-wider text-dim block" style={{ color: 'var(--text-dim)' }}>
                                            Method: {pay.paymentMethod}
                                        </span>
                                        {pay.note && <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-dim)' }}>"{pay.note}"</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-5 text-center text-xs opacity-60" style={{ color: 'var(--text-dim)' }}>
                                No payments recorded yet.
                            </div>
                        )}
                    </div>

                    {/* Linked Credit Notes */}
                    {linkedCreditNotes.length > 0 && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet size={14} className="text-[#C8E600]" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Linked Credit Notes</h3>
                                </div>
                            </div>
                            <div className="p-5 space-y-4">
                                {linkedCreditNotes.map((note) => (
                                    <div key={note._id} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'DRAFT'}</span>
                                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border ${
                                                note.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                                note.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            }`}>
                                                {note.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span style={{ color: 'var(--text-dim)' }}>Adjustment:</span>
                                            <span className="font-bold text-[#C8E600]">${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <p className="text-[10px] italic leading-tight" style={{ color: 'var(--text-dim)' }}>"{note.reason}"</p>
                                        
                                        {note.status === 'OPEN' && (
                                            <button 
                                                onClick={() => handleApplyCreditNoteToInvoice(note._id)}
                                                className="w-full mt-2 py-1.5 bg-[#C8E600] text-black font-black text-[9px] uppercase rounded-lg hover:scale-102 active:scale-95 transition-all cursor-pointer"
                                            >
                                                Post Offset Adjustment
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= INVOICE EDIT MODAL ================= */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-black/20 flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                            <div><h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}><Edit3 size={18} className="text-brand-lime"/> Edit Parameters</h2><p className="text-xs text-dim">{invoice.invoiceNumber}</p></div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>
                        <form onSubmit={handleEditInvoice} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Period Rent amount ($)</label>
                                <div className="relative"><DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input type="number" step="0.01" required value={editBaseAmount} onChange={e => setEditBaseAmount(Number(e.target.value))} className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-black outline-none focus:border-brand-lime" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Cycle Label</label>
                                <input type="text" required value={editWeekLabel} onChange={e => setEditWeekLabel(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none focus:border-brand-lime" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Lease Due Date</label>
                                <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15}/><input type="date" required value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-bold outline-none focus:border-brand-lime" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>
                            </div>
                            <button type="submit" disabled={submittingEdit} className="w-full py-3.5 bg-brand-lime text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all cursor-pointer" style={{ background: '#C8E600' }}>
                                {submittingEdit ? "Re-calculating..." : "Overwrite Record"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= CREATE CREDIT NOTE MODAL ================= */}
            {isCreditNoteModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-[#6366F1]/5 flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}><FileSpreadsheet size={18} className="text-indigo-400"/> Issue Credit Note</h2>
                                <p className="text-xs text-dim">Create unposted credit adjustment against outstanding balance</p>
                            </div>
                            <button onClick={() => setIsCreditNoteModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>
                        <form onSubmit={handleCreateCN} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Adjustment Amount ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" size={15}/>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        max={invoice.balance}
                                        required 
                                        value={cnAmount} 
                                        onChange={e => setCnAmount(Number(e.target.value))} 
                                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-black outline-none" 
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-amber-400 mt-1">Limit: Remaining active balance (${invoice.balance?.toLocaleString()})</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Adjustment Reason</label>
                                <select 
                                    value={cnReason} 
                                    onChange={e => setCnReason(e.target.value)} 
                                    className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none appearance-none cursor-pointer" 
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="Vehicle Downtime Adjustment">Vehicle Downtime Adjustment</option>
                                    <option value="Billing Error / Correction">Billing Error / Correction</option>
                                    <option value="Goodwill Refund">Goodwill Refund</option>
                                    <option value="Other Operations Subsidy">Other Operations Subsidy</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Memo Notes (Internal)</label>
                                <textarea 
                                    value={cnNotes} 
                                    onChange={e => setCnNotes(e.target.value)} 
                                    rows={3} 
                                    placeholder="Brief operational context..." 
                                    className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none" 
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <button type="submit" disabled={submittingCN} className="w-full py-3.5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all cursor-pointer">
                                {submittingCN ? "Issuing..." : "Issue Credit Note (Draft)"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= RECORD PAYMENT MODAL ================= */}
            {paymentModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-black/20 flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                            <div><h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}><DollarSign size={20} className="text-brand-lime" style={{ color: '#C8E600' }}/> Settle Payment</h2><p className="text-xs text-dim">{invoice.invoiceNumber}</p></div>
                            <button onClick={() => setPaymentModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                            {driverPrepayment > 0 && (
                                <div className="p-4 rounded-2xl border flex flex-col gap-2.5 animate-in fade-in duration-300 mb-2" style={{ background: 'rgba(200, 230, 0, 0.03)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="shrink-0" size={16} style={{ color: 'var(--sidebar-active)' }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--sidebar-active)' }}>Driver Prepayment Credit Available</span>
                                    </div>
                                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>
                                        This operator has an unused prepayment credit balance of <strong className="font-mono" style={{ color: 'var(--sidebar-active)' }}>${driverPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> securely stored in their ledger account.
                                    </p>
                                    
                                    <label className="flex items-center gap-2 mt-1 p-2.5 rounded-xl border cursor-pointer transition-all select-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={usePrepayment} 
                                            onChange={(e) => {
                                                setUsePrepayment(e.target.checked);
                                                if (e.target.checked) {
                                                    setPaymentMethod('PREPAYMENT_CREDIT');
                                                    setPaymentAmount(Math.min(invoice.balance, driverPrepayment));
                                                } else {
                                                    setPaymentMethod('CASH');
                                                    setPaymentAmount(invoice.balance);
                                                }
                                            }}
                                            className="rounded cursor-pointer"
                                            style={{ accentColor: 'var(--brand-lime)' }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Apply Prepayment Credit towards this Invoice</span>
                                    </label>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Rendered Settlement ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#737373]" size={15}/>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        required 
                                        max={usePrepayment ? Math.min(invoice.balance, driverPrepayment) : invoice.balance} 
                                        value={paymentAmount} 
                                        onChange={e => setPaymentAmount(Number(e.target.value))} 
                                        className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-bold outline-none" 
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <p className="text-[9px] font-bold mt-1" style={{ color: 'var(--warn-orange)' }}>
                                    {usePrepayment 
                                        ? `Available Prepayment Cap: $${Math.min(invoice.balance, driverPrepayment).toLocaleString()}` 
                                        : `Available Balance Cap: $${invoice.balance?.toLocaleString()}`
                                    }
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Gateway / Method</label>
                                {usePrepayment ? (
                                    <div className="w-full px-4 py-2.5 border rounded-xl font-black flex items-center justify-between select-none" style={{ background: 'var(--sidebar-hover)', borderColor: 'var(--border-main)', color: 'var(--sidebar-active)' }}>
                                        <span>PREPAYMENT CREDIT ALLOCATION</span>
                                        <CheckCircle2 size={14} style={{ color: 'var(--sidebar-active)' }} />
                                    </div>
                                ) : (
                                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold outline-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="CASH">PHYSICAL CASH / HAND</option>
                                        <option value="BANK_TRANSFER">WIRE / BANK DEPOSIT</option>
                                        <option value="CREDIT_NOTE">EXTERNAL OVERRIDE</option>
                                        <option value="CARD">POS TERMINAL SWIPE</option>
                                    </select>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Ledger Narrative Note</label>
                                <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="Optional transaction memo..." className="w-full px-4 py-2.5 border rounded-xl font-medium outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/>
                            </div>
                            <button type="submit" disabled={processingPayment} className="w-full py-3.5 bg-brand-lime text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer" style={{ background: '#C8E600' }}>
                                {processingPayment ? "Registering..." : "Submit Transaction"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PAID': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none"><CheckCircle2 size={10} strokeWidth={3}/> Paid</span>;
        case 'PARTIAL': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/20 select-none"><Clock size={10} strokeWidth={3}/> Partial</span>;
        case 'OVERDUE': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none"><AlertCircle size={10} strokeWidth={3}/> Overdue</span>;
        default: return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-white/5 text-[#A3A3A3] border-white/10 select-none">Pending</span>;
    }
};

export default InvoiceDetail;
