import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    DollarSign, Calendar, CheckCircle2, Clock, AlertCircle, X, 
    Printer, ArrowLeft, Edit3, FileSpreadsheet, Eye, Trash2
} from 'lucide-react';
import { getInvoiceById, payInvoice, updateInvoice, deleteInvoice, getInvoicesByDriver } from '../../../services/invoiceService';
import { createCreditNote, getAllCreditNotes, applyCreditNote } from '../../../services/creditNoteService';
import type { Invoice } from '../../../services/invoiceService';
// import { useTheme } from '../../../context/ThemeContext';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { getUserRole } from '../../../utils/auth';

const InvoiceDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userRole = getUserRole();
    
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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
 
                // Calculate Prepayment Credit (Extra Advance)
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

    // --- Edit Handlers ---
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

    // --- Pay Handlers ---
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

    // --- Credit Note Handlers ---
    const triggerCreditNoteModal = () => {
        if (!invoice) return;
        setCnAmount(invoice.balance);
        setCnNotes('');
        setCnReason('Vehicle Downtime Adjustment');
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

    const convertToWords = (num: number) => `${num.toLocaleString('en-US')} USD`;

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
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="container-responsive py-10 text-center space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-md mx-auto shadow">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-main)' }}>Load Failure</h3>
                    <p className="text-sm text-dim mb-6">{error || "Invoice could not be located."}</p>
                    <button onClick={() => navigate('..')} className="px-6 py-2.5 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10" style={{ color: 'var(--text-main)' }}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6 animate-in fade-in duration-500">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '../invoices' },
                    { label: 'Invoices', path: '../invoices' },
                    { label: invoice.invoiceNumber, active: true }
                ]} 
            />

            <div className="flex flex-col overflow-hidden border rounded-[2.5rem] shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Single-Doc Toolbar */}
                <div className="p-5 border-b flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 rounded-t-[2.5rem]" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-4 self-start md:self-center">
                        <button 
                            onClick={() => navigate('../invoices')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-brand-lime border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                        >
                            <ArrowLeft size={13} strokeWidth={3} /> Registry
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black uppercase tracking-wide leading-none" style={{ color: 'var(--text-main)' }}>{invoice.invoiceNumber}</h1>
                                <StatusBadge status={invoice.status}/>
                            </div>
                            <p className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{invoice.weekLabel}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                        {invoice.status !== 'PAID' && (
                            <button 
                                onClick={triggerEditModal}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <Edit3 size={12} strokeWidth={2.5} /> Edit Invoice
                            </button>
                        )}

                        {invoice.balance > 0 && userRole !== 'admin' && (
                            <button 
                                onClick={triggerCreditNoteModal}
                                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-400 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-colors cursor-pointer"
                            >
                                <FileSpreadsheet size={12} /> Issue Credit Note
                            </button>
                        )}

                        {invoice.status !== 'PAID' && userRole !== 'admin' && (
                            <button 
                                onClick={triggerPaymentModal}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-green-500 text-white font-black text-[10px] uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all rounded-xl shadow-2xl cursor-pointer"
                            >
                                <DollarSign size={12} strokeWidth={3}/> Record Payment
                            </button>
                        )}

                        <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />
                        
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/5 border border-white/10 font-black text-[10px] uppercase rounded-xl active:scale-95 hover:bg-white/10 cursor-pointer" style={{ color: 'var(--text-main)' }}>
                            <Printer size={12}/> Print
                        </button>

                        <button 
                            onClick={handleDeleteInvoice}
                            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 font-black text-[10px] uppercase rounded-xl active:scale-95 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                        >
                            <Trash2 size={12}/> Delete
                        </button>
                    </div>
                </div>

                {/* Canvas Scroll */}
                <div className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    
                    {/* PRINTABLE INVOICE SHEET */}
                    <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col aspect-[1/1.41] relative animate-in zoom-in-95 duration-300 select-text" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <div className={`absolute top-8 -right-12 rotate-45 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-14 flex items-center justify-center shadow select-none ${invoice.status === 'PAID' ? 'bg-emerald-500':'bg-orange-400'}`}>
                            {invoice.status}
                        </div>

                        <div className="p-8 md:p-14 flex-1 flex flex-col space-y-12">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-brand-lime px-4 py-1.5 rounded-xl inline-block select-none" style={{ background: 'var(--bg-input)' }}>OLA CARS</h3>
                                    <p className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-dim)' }}>Corporate Logistics Division</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Invoice</h2>
                                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-left text-[11px] mt-4 border p-4 rounded-2xl" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Reference #</span><span className="font-black" style={{ color: 'var(--text-main)' }}>: {invoice.invoiceNumber}</span>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Billing Cycle</span><span className="font-black" style={{ color: 'var(--text-main)' }}>: {invoice.weekLabel}</span>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Lease Due Date</span><span className="font-black" style={{ color: 'var(--text-main)' }}>: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-6 text-xs">
                                <div>
                                    <p className="font-black text-[9px] uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-dim)' }}>BILL TO / OPERATOR ACCOUNT</p>
                                    <p className="font-black text-base tracking-tight" style={{ color: 'var(--text-main)' }}>{(invoice.driver as any)?.personalInfo?.fullName || 'Unassigned Profile'}</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>{(invoice.driver as any)?.personalInfo?.email || 'Contact Pending'}</p>
                                    <p className="text-[10px] font-mono uppercase tracking-wider mt-1.5 inline-block px-2 py-0.5 rounded border" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>Driver Key: {(invoice.driver as any)?.driverId || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex-1">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="border-y text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                            <th className="py-4 px-3 w-[10%]">#</th>
                                            <th className="py-4 px-3 w-[60%]">Item & Statement Specifications</th>
                                            <th className="py-4 px-3 text-center w-[10%]">Qty</th>
                                            <th className="py-4 px-3 text-right w-[20%]">Total Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        {invoice.invoiceType === 'MANUAL' && invoice.lineItems && invoice.lineItems.length > 0 ? (
                                            invoice.lineItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderColor: 'var(--border-main)' }}>
                                                    <td className="py-6 px-3 font-black text-sm">{idx + 1}</td>
                                                    <td className="py-6 px-3">
                                                        <span className="font-black text-sm block mb-1">{item.name}</span>
                                                        {item.description && (
                                                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>{item.description}</p>
                                                        )}
                                                    </td>
                                                    <td className="py-6 px-3 text-center font-bold">{item.qty?.toFixed(2)}</td>
                                                    <td className="py-6 px-3 text-right font-black text-sm" style={{ color: 'var(--text-main)' }}>${(item.unitPrice * item.qty)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="py-6 px-3 font-black text-sm">1</td>
                                                <td className="py-6 px-3">
                                                    <span className="font-black text-sm block mb-1">Weekly Vehicle Rent Lease Payment</span>
                                                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>Base period rate assessment recorded for cycle: "{invoice.weekLabel}"</p>
                                                </td>
                                                <td className="py-6 px-3 text-center font-bold">1.00</td>
                                                <td className="py-6 px-3 text-right font-black text-sm" style={{ color: 'var(--text-main)' }}>${invoice.totalAmountDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t pt-8 flex flex-col md:flex-row justify-between gap-8" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="space-y-2 max-w-[300px]">
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Valuation In Words</p>
                                    <p className="text-[11px] font-black italic border-l-2 pl-4 leading-relaxed" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>{convertToWords(invoice.totalAmountDue)} Only</p>
                                </div>
                                <div className="w-full md:w-[320px] space-y-2 text-xs">
                                    <div className="flex justify-between font-semibold" style={{ color: 'var(--text-dim)' }}>
                                        <span>Subtotal</span>
                                        <span style={{ color: 'var(--text-main)' }}>${(invoice.subtotal || invoice.totalAmountDue)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    {(invoice.discountAmount || 0) > 0 && (
                                        <div className="flex justify-between font-semibold text-rose-400">
                                            <span>Discount {invoice.discountType === 'PERCENTAGE' ? `(${invoice.discountValue}%)` : ''}</span>
                                            <span>− ${invoice.discountAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    {(invoice.taxAmount || 0) > 0 && (
                                        <div className="flex justify-between font-semibold text-blue-400">
                                            <span>Tax ({invoice.taxRate}%)</span>
                                            <span>+ ${invoice.taxAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-2 font-black text-lg" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <span>GRAND TOTAL</span>
                                        <span>${invoice.totalAmountDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-500 font-bold pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <span>Payments Received</span>
                                        <span>− ${(invoice.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-3 border rounded-2xl text-sm font-black mt-3 shadow-inner" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <span>REMAINING BALANCE</span>
                                        <span className="font-mono">${invoice.balance?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 flex justify-end border-t border-dashed mt-auto" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="text-center w-[200px] space-y-1.5 select-none">
                                    <div className="h-10 border-b relative" style={{ borderColor: 'var(--border-main)' }}>
                                        <span className="absolute bottom-0.5 right-1/2 translate-x-1/2 text-xl font-serif italic select-none" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>OlaFinance</span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Authorized Finance Lead</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LEDGER & PAYMENT HISTORY BLOCK */}
                    <div className="w-full max-w-4xl mx-auto rounded-[2rem] border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-black/10 flex items-center gap-2 shadow-inner" style={{ borderColor: 'var(--border-main)' }}>
                            <FileSpreadsheet className="text-brand-lime" size={18} />
                            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Recorded Ledger & Settlement History</h2>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            {invoice.payments && invoice.payments.length > 0 ? (
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase border-b pb-3" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                            <th className="pb-3 pr-4">Settlement Date</th>
                                            <th className="pb-3 px-4">Collection Method</th>
                                            <th className="pb-3 px-4">Reference Context</th>
                                            <th className="pb-3 pl-4 text-right">Amount Received</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                        {invoice.payments.map((pay, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 pr-4 font-bold" style={{ color: 'var(--text-main)' }}>{new Date(pay.paidAt).toLocaleDateString()}</td>
                                                <td className="py-4 px-4 font-black uppercase tracking-wider text-brand-lime">{pay.paymentMethod}</td>
                                                <td className="py-4 px-4 italic font-medium max-w-xs truncate" style={{ color: 'var(--text-dim)' }}>"{pay.note || 'N/A'}"</td>
                                                <td className="py-4 pl-4 text-right font-black text-emerald-400">${pay.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="py-8 text-center opacity-60 flex flex-col items-center gap-2 select-none">
                                    <AlertCircle style={{ color: 'var(--text-dim)' }} size={24}/>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No direct settlements registered against this invoice statement yet.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PENDING LINKED CREDIT NOTES BLOCK */}
                    {linkedCreditNotes.length > 0 && (
                        <div className="w-full max-w-4xl mx-auto rounded-[2rem] border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="p-6 border-b bg-[#F59E0B]/5 flex items-center justify-between shadow-inner" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-2">
                                    <Clock className="text-amber-400" size={18} />
                                    <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Linked Credit Notes Registry</h2>
                                </div>
                                <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full select-none">
                                    {linkedCreditNotes.filter(n => n.status === 'OPEN').length} Awaiting Post
                                </span>
                            </div>
                            <div className="p-6 overflow-x-auto">
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase border-b pb-3" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                            <th className="pb-3 pr-4">Note Number</th>
                                            <th className="pb-3 px-4">Status</th>
                                            <th className="pb-3 px-4">Adjust Value</th>
                                            <th className="pb-3 px-4">Issued Reason</th>
                                            <th className="pb-3 pl-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                        {linkedCreditNotes.map((note) => (
                                            <tr key={note._id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 pr-4 font-black font-mono tracking-wider" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'DRAFT'}</td>
                                                <td className="py-4 px-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase border select-none ${
                                                        note.status === 'OPEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                                        note.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    }`}>
                                                        {note.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 font-black" style={{ color: 'var(--text-main)' }}>${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="py-4 px-4 italic font-medium truncate max-w-[180px]" style={{ color: 'var(--text-dim)' }}>{note.reason}</td>
                                                <td className="py-4 pl-4 text-right">
                                                    <div className="flex justify-end items-center gap-2">
                                                        {note.status === 'OPEN' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleApplyCreditNoteToInvoice(note._id)}
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-lime text-black font-black text-[10px] uppercase rounded-lg shadow hover:scale-[1.03] active:scale-95 transition-all cursor-pointer"
                                                                >
                                                                    <CheckCircle2 size={11}/> Post Offset
                                                                </button>
                                                                 <button 
                                                                    onClick={() => navigate(`../../credit-notes/${note._id}`)}
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 font-black text-[10px] uppercase rounded-lg active:scale-95 transition-all cursor-pointer"
                                                                    style={{ color: 'var(--text-main)' }}
                                                                >
                                                                    <Edit3 size={10} /> Edit Note
                                                                </button>
                                                            </>
                                                        )}
                                                        {note.status !== 'OPEN' && (
                                                            <button 
                                                                onClick={() => navigate(`../../credit-notes/${note._id}`)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-[#A3A3A3] font-black text-[10px] uppercase rounded-lg transition-all cursor-pointer"
                                                            >
                                                                    <Eye size={10} /> Trace Audit
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                            <button type="submit" disabled={submittingEdit} className="w-full py-3.5 bg-brand-lime text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all cursor-pointer">
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
                            <div><h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}><DollarSign size={20} className="text-brand-lime"/> Settle Payment</h2><p className="text-xs text-dim">{invoice.invoiceNumber}</p></div>
                            <button onClick={() => setPaymentModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>
                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                            {driverPrepayment > 0 && (
                                <div className="p-4 rounded-2xl border flex flex-col gap-2.5 animate-in fade-in duration-300 mb-2" style={{ background: 'rgba(200, 230, 0, 0.03)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="text-brand-lime shrink-0" size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Driver Prepayment Credit Available</span>
                                    </div>
                                    <p className="text-[11px] font-semibold text-white/90">
                                        This operator has an unused prepayment credit balance of <strong className="text-brand-lime font-mono">${driverPrepayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> securely stored in their ledger account.
                                    </p>
                                    
                                    <label className="flex items-center gap-2 mt-1 p-2.5 rounded-xl bg-black/25 hover:bg-black/40 border border-brand-lime/10 cursor-pointer transition-all select-none">
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
                                            className="rounded text-brand-lime focus:ring-brand-lime accent-brand-lime cursor-pointer"
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-lime">Apply Prepayment Credit towards this Invoice</span>
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
                                <p className="text-[9px] font-bold text-amber-400 mt-1">
                                    {usePrepayment 
                                        ? `Available Prepayment Cap: $${Math.min(invoice.balance, driverPrepayment).toLocaleString()}` 
                                        : `Available Balance Cap: $${invoice.balance?.toLocaleString()}`
                                    }
                                </p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Gateway / Method</label>
                                {usePrepayment ? (
                                    <div className="w-full px-4 py-2.5 border rounded-xl font-black text-brand-lime bg-brand-lime/5 border-brand-lime/20 flex items-center justify-between select-none">
                                        <span>PREPAYMENT CREDIT ALLOCATION</span>
                                        <CheckCircle2 size={14} className="text-brand-lime" />
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
                            <button type="submit" disabled={processingPayment} className="w-full py-3.5 bg-brand-lime text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer">
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
