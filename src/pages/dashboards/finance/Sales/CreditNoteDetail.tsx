import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    DollarSign, AlertCircle, X, Printer, ArrowLeft, 
    Edit3, FileSpreadsheet, FileCheck, Undo2, Filter, 
    RefreshCw, CheckCircle2, Sun, Moon, User, Link
} from 'lucide-react';
import { getCreditNoteById, voidCreditNote, updateCreditNote, applyCreditNote } from '../../../../services/creditNoteService';
import { getInvoicesByDriver } from '../../../../services/invoiceService';
import { getAllDrivers } from '../../../../services/driverService';
import { useTheme } from '../../../../context/ThemeContext';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../../services/api';

const CreditNoteDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [note, setNote] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit Parameters Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editAmount, setEditAmount] = useState<number>(0);
    const [editDate, setEditDate] = useState<string>('');
    const [editReason, setEditReason] = useState<string>('');
    const [editNotes, setEditNotes] = useState<string>('');
    const [submittingEdit, setSubmittingEdit] = useState(false);
    // Edit – driver & invoice pickers
    const [editDriverId, setEditDriverId] = useState<string>('');
    const [editDriverList, setEditDriverList] = useState<any[]>([]);
    const [loadingDriverList, setLoadingDriverList] = useState(false);
    const [editInvoiceId, setEditInvoiceId] = useState<string>('');
    const [editInvoiceList, setEditInvoiceList] = useState<any[]>([]);
    const [loadingEditInvoices, setLoadingEditInvoices] = useState(false);

    // Apply to Invoice Modal State
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyInvoiceId, setApplyInvoiceId] = useState<string>('');
    const [applyInvoices, setApplyInvoices] = useState<any[]>([]);
    const [loadingApplyInvoices, setLoadingApplyInvoices] = useState(false);
    const [submittingApply, setSubmittingApply] = useState(false);

    const { theme, toggleTheme } = useTheme();

    const fetchNote = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getCreditNoteById(id);
            if (res.success) {
                setNote(res.data);
                setError(null);
            } else {
                setError("Failed retrieving target credit note.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed accessing credit note ledger.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchNote();
    }, [fetchNote]);

    // --- Edit Handlers ---
    const triggerEditModal = async () => {
        if (!note) return;
        setEditAmount(note.amount || 0);
        setEditDate(note.creditNoteDate ? new Date(note.creditNoteDate).toISOString().split('T')[0] : '');
        setEditReason(note.reason || '');
        setEditNotes(note.notes || '');
        // Pre-populate linked driver & invoice
        const currentDriverId = note.driverId?._id || note.driverId || '';
        setEditDriverId(currentDriverId);
        setEditInvoiceId(note.invoiceId?._id || note.invoiceId || '');
        setIsEditModalOpen(true);
        // Fetch drivers list
        setLoadingDriverList(true);
        try {
            const res = await getAllDrivers({ limit: 200, status: 'ACTIVE' });
            setEditDriverList(res.data || []);
        } catch {
            toast.error("Could not load driver list.");
        } finally {
            setLoadingDriverList(false);
        }
        // Fetch invoices for current driver
        if (currentDriverId) {
            setLoadingEditInvoices(true);
            try {
                const invData = await getInvoicesByDriver(currentDriverId);
                setEditInvoiceList(invData || []);
            } catch {
                setEditInvoiceList([]);
            } finally {
                setLoadingEditInvoices(false);
            }
        }
    };

    // When driver changes in edit modal, reload that driver's invoices
    const handleEditDriverChange = async (newDriverId: string) => {
        setEditDriverId(newDriverId);
        setEditInvoiceId('');
        setEditInvoiceList([]);
        if (!newDriverId) return;
        setLoadingEditInvoices(true);
        try {
            const invData = await getInvoicesByDriver(newDriverId);
            setEditInvoiceList(invData || []);
        } catch {
            setEditInvoiceList([]);
        } finally {
            setLoadingEditInvoices(false);
        }
    };

    const handleEditCreditNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !note) return;
        setSubmittingEdit(true);
        try {
            const payload: any = {
                amount: Number(editAmount),
                creditNoteDate: editDate,
                reason: editReason,
                notes: editNotes,
            };
            if (editDriverId) payload.driverId = editDriverId;
            if (editInvoiceId) payload.invoiceId = editInvoiceId;
            const res = await updateCreditNote(id, payload);
            if (res.success) {
                toast.success("Credit Note parameters adjusted!");
                setIsEditModalOpen(false);
                await fetchNote();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed updating note.");
        } finally {
            setSubmittingEdit(false);
        }
    };

    // --- Apply Handlers ---
    const triggerApplyModal = async () => {
        if (!note) return;
        setIsApplyModalOpen(true);
        setLoadingApplyInvoices(true);
        try {
            const driverIdStr = note.driverId?._id || note.driverId;
            if (driverIdStr) {
                const data = await getInvoicesByDriver(driverIdStr);
                const openInvoices = (data || []).filter((inv: any) => inv.balance > 0 && inv.status !== 'PAID');
                setApplyInvoices(openInvoices);
                
                if (note.invoiceId?._id) {
                    setApplyInvoiceId(note.invoiceId._id);
                } else if (openInvoices.length > 0) {
                    setApplyInvoiceId(openInvoices[0]._id);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed querying target invoice records.");
        } finally {
            setLoadingApplyInvoices(false);
        }
    };

    const handlePrintPdf = async () => {
        if (!note) return;
        const toastId = toast.loading("Preparing print layout...");
        try {
            const res = await api.get(`/api/credit-notes/${note._id}/pdf`, { responseType: 'blob' });
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
            toast.error("Failed generating credit note PDF document.", { id: toastId });
        }
    };

    const handleConfirmApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !applyInvoiceId) {
            toast.error("Please select a target invoice.");
            return;
        }
        setSubmittingApply(true);
        try {
            const res = await applyCreditNote(id, applyInvoiceId);
            if (res.success) {
                toast.success("Credit Note posted to Invoice balance!");
                setIsApplyModalOpen(false);
                await fetchNote();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed final posting.");
        } finally {
            setSubmittingApply(false);
        }
    };

    // --- Void Handler ---
    const handleVoidCreditNote = async () => {
        if (!id) return;
        if (!window.confirm("Void this ledger credit? Action processes reversals instantly.")) return;
        try {
            const res = await voidCreditNote(id);
            if (res.success) {
                toast.success("Credit note fully voided.");
                await fetchNote();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed voiding credit.");
        }
    };



    const convertToWords = (num: number) => `${num.toLocaleString('en-US')} USD`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="container-responsive py-10 text-center space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 max-w-md mx-auto shadow">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-lg font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-main)' }}>Load Error</h3>
                    <p className="text-sm text-dim mb-6">{error || "Credit Note details unavailable."}</p>
                    <button onClick={() => navigate('..')} className="px-6 py-2.5 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10">
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
                    { label: 'Sales', path: '../credit-notes' },
                    { label: 'Credit Notes', path: '../credit-notes' },
                    { label: note.creditNoteNumber || 'View Note', active: true }
                ]} 
            />

            <div className="flex flex-col overflow-hidden border rounded-[2.5rem] shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Toolbar Header */}
                <div className="p-5 border-b flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0 rounded-t-[2.5rem]" style={{ background: 'rgba(0,0,0,0.15)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-4 self-start md:self-center">
                        <button 
                            onClick={() => navigate('../credit-notes')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-brand-lime border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                        >
                            <ArrowLeft size={13} strokeWidth={3} /> Registry
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black uppercase tracking-wide leading-none" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'LEGACY'}</h1>
                                <StatusBadge status={note.status} />
                            </div>
                            <p className="text-[10px] font-semibold mt-1 uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Value Dated: {new Date(note.creditNoteDate || note.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                        {['OPEN', 'DRAFT'].includes(note.status) && (
                            <>
                                <button 
                                    onClick={triggerApplyModal}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    <FileCheck size={12} strokeWidth={2.5} /> Apply to Invoice
                                </button>

                                {/* <button 
                                    onClick={handleRefundCreditNote}
                                    disabled={submittingRefund}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 border border-amber-600/10 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DollarSign size={12} strokeWidth={2.5} /> Refund Credit
                                </button> */}
                                
                                <button 
                                    onClick={triggerEditModal}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer"
                                >
                                    <Edit3 size={12} strokeWidth={2.5} /> Edit Credit Note
                                </button>

                                <button 
                                    onClick={handleVoidCreditNote}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                                >
                                    <Undo2 size={12} strokeWidth={3} /> Void Credit
                                </button>
                            </>
                        )}

                        <div className="h-6 w-px bg-white/10 mx-1 hidden md:block" />
                        <button
                            onClick={toggleTheme}
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="flex items-center justify-center p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl active:scale-95 transition-all cursor-pointer"
                            style={{ color: 'var(--text-dim)' }}
                        >
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={handlePrintPdf} className="flex items-center gap-1 px-3.5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-xl active:scale-95 cursor-pointer"><Printer size={12} /> Print</button>
                    </div>
                </div>

                {/* Canvas Content Area */}
                <div className="flex-1 p-6 md:p-10 space-y-10 overflow-y-auto custom-scrollbar" style={{ background: 'rgba(0,0,0,0.05)' }}>
                    {note.invoiceId && note.status === 'CLOSED' && (
                        <div className="w-full max-w-4xl mx-auto p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex justify-between items-center shadow-inner animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <FileCheck className="text-blue-400" size={18} />
                                <div>
                                    <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>Applied directly to invoice</p>
                                    <p className="text-[10px] text-dim mt-0.5">Dynamic offset finalized against {note.invoiceId.invoiceNumber}</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded px-2.5 py-0.5 uppercase tracking-widest">Applied</span>
                        </div>
                    )}

                    {note.invoiceId && ['OPEN', 'DRAFT'].includes(note.status) && (
                        <div className="w-full max-w-4xl mx-auto p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex justify-between items-center shadow-inner animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-amber-400" size={18} />
                                <div>
                                    <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>Linked intended target</p>
                                    <p className="text-[10px] text-dim mt-0.5">Ready to be applied to {note.invoiceId.invoiceNumber}. Click "Apply to Invoice" above to post.</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-2.5 py-0.5 uppercase tracking-widest">Draft Link</span>
                        </div>
                    )}

                    {/* PRINT SHEET CANVAS */}
                    <div className="w-full max-w-4xl mx-auto rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col aspect-[1/1.41] relative animate-in zoom-in-95 select-text" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <div className={`absolute top-8 -right-12 rotate-45 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-14 flex items-center justify-center shadow select-none ${note.status === 'VOID' ? 'bg-rose-500':'bg-emerald-500'}`}>
                            {note.status}
                        </div>
                        <div className="p-8 md:p-14 flex-1 flex flex-col space-y-12">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b pb-10" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-brand-lime px-4 py-1.5 rounded-xl inline-block select-none" style={{ background: 'var(--bg-input)' }}>OLA CARS</h3>
                                    <p className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-dim)' }}>Logistics Finance Division</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Credit Note</h2>
                                    <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-left text-[11px] mt-4 border p-4 rounded-2xl" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Note Identifier</span><span className="font-black" style={{ color: 'var(--text-main)' }}>: {note.creditNoteNumber || 'LEGACY'}</span>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Recorded Date</span><span className="font-black" style={{ color: 'var(--text-main)' }}>: {new Date(note.creditNoteDate || note.createdAt).toLocaleDateString()}</span>
                                        <span className="font-bold" style={{ color: 'var(--text-dim)' }}>Primary Reason</span><span className="font-black truncate max-w-[120px]" style={{ color: 'var(--text-main)' }}>: {note.reason || 'Legacy'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between gap-6 text-xs">
                                <div>
                                    <p className="font-black text-[9px] uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-dim)' }}>BILL TO / ACCOUNT NAME</p>
                                    <p className="font-black text-base tracking-tight" style={{ color: 'var(--text-main)' }}>{note.driverId?.personalInfo?.fullName || (note as any).name || 'Unresolved Account'}</p>
                                    <p className="font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>{note.driverId?.personalInfo?.email || 'N/A'}</p>
                                    <p className="text-[10px] font-mono uppercase tracking-wider mt-1.5 inline-block px-2 py-0.5 rounded border" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>Operator Key: {note.driverId?.driverId || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex-1">
                                <table className="w-full border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="border-y text-[10px] font-black uppercase tracking-widest" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                            <th className="py-4 px-3 w-[10%]">#</th>
                                            <th className="py-4 px-3 w-[60%]">Description of Credit Value Reversal</th>
                                            <th className="py-4 px-3 text-center w-[10%]">Qty</th>
                                            <th className="py-4 px-3 text-right w-[20%]">Total Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y font-medium" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <tr style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="py-6 px-3 font-black text-sm">1</td>
                                            <td className="py-6 px-3">
                                                <span className="font-black text-sm block mb-1">{note.reason || 'Legacy Accounting Correction'}</span>
                                                {note.notes && <p className="text-[11px] italic leading-relaxed mt-1" style={{ color: 'var(--text-dim)' }}>Memo Context: "{note.notes}"</p>}
                                            </td>
                                            <td className="py-6 px-3 text-center font-bold">1.00</td>
                                            <td className="py-6 px-3 text-right font-black text-sm" style={{ color: 'var(--text-main)' }}>${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="border-t pt-8 flex flex-col md:flex-row justify-between gap-8" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="space-y-2 max-w-[300px]">
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Valuation In Words</p>
                                    <p className="text-[11px] font-black italic border-l-2 pl-4 leading-relaxed" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>{convertToWords(note.amount)} Only</p>
                                </div>
                                <div className="w-full md:w-[320px] space-y-2 text-xs">
                                    <div className="flex justify-between font-bold" style={{ color: 'var(--text-dim)' }}><span>Gross Reconcile Amount</span><span style={{ color: 'var(--text-main)' }}>${note.amount?.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-t pt-2 font-black text-lg" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}><span>TOTAL REGISTERED</span><span>${note.amount?.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-rose-500 font-bold pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}><span>Credits Allocated</span><span>(-) ${note.status === 'CLOSED' || note.status === 'APPLIED' ? note.amount?.toLocaleString() : "0.00"}</span></div>
                                    <div className="flex justify-between items-center p-3 border rounded-2xl text-sm font-black mt-3 shadow-inner" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <span>UNALLOCATED RESIDUE</span>
                                        <span className="font-mono">${note.status === 'OPEN' ? note.amount?.toLocaleString() : "0.00"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 flex justify-end border-t border-dashed mt-auto" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="text-center w-[200px] space-y-1.5 select-none">
                                    <div className="h-10 border-b relative" style={{ borderColor: 'var(--border-main)' }}>
                                        <span className="absolute bottom-0.5 right-1/2 translate-x-1/2 text-xl font-serif italic select-none" style={{ color: 'var(--text-dim)', opacity: 0.4 }}>OlaFinance</span>
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reconciliations Officer</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AUDIT LEDGER ACTIVITY BLOCK */}
                    <div className="w-full max-w-4xl mx-auto rounded-[2rem] border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-black/10 flex items-center gap-2 shadow-inner" style={{ borderColor: 'var(--border-main)' }}>
                            <FileSpreadsheet className="text-brand-lime" size={18} />
                            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Reconciliation Ledger Activity</h2>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full border-collapse text-left text-xs">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase border-b pb-3" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                        <th className="pb-3 pr-4">Recorded Entry Date</th>
                                        <th className="pb-3 px-4">Classification</th>
                                        <th className="pb-3 px-4">Accounting Map</th>
                                        <th className="pb-3 pl-4 text-right">Total Debited Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                    <tr className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 pr-4 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>{new Date(note.createdAt).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 font-black uppercase tracking-wider text-indigo-400">Credit Issuance</td>
                                        <td className="py-4 px-4 italic font-medium text-dim">Initial creation of ledger note draft.</td>
                                        <td className="py-4 pl-4 text-right font-black" style={{ color: 'var(--text-main)' }}>${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    {note.status === 'CLOSED' && (
                                        <tr className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 pr-4 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</td>
                                            <td className="py-4 px-4 font-black uppercase tracking-wider text-emerald-400">Applied Adjustment</td>
                                            <td className="py-4 px-4 italic font-medium text-dim">Direct offset deduction executed on Invoice {note.invoiceId?.invoiceNumber || 'Target'}.</td>
                                            <td className="py-4 pl-4 text-right font-black text-rose-400">-${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                    {note.status === 'VOID' && (
                                        <tr className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-4 pr-4 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</td>
                                            <td className="py-4 px-4 font-black uppercase tracking-wider text-rose-500">Void Cancellation</td>
                                            <td className="py-4 px-4 italic font-medium text-dim">Ledger reversal posted - note rendered inactive.</td>
                                            <td className="py-4 pl-4 text-right font-black text-rose-500">-${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>

            {/* ================= EDIT MODAL ================= */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-lg border shadow-2xl overflow-hidden rounded-3xl max-h-[92vh] flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                        {/* ── Header ── */}
                        <div className="p-6 border-b bg-black/20 flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <Edit3 size={18} className="text-brand-lime"/> Edit Credit Note
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{note.creditNoteNumber}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>

                        {/* ── Form: scrollable body + sticky footer ── */}
                        <form onSubmit={handleEditCreditNote} className="flex flex-col flex-1 min-h-0">

                            {/* Scrollable Fields */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                                {/* ── Driver Picker ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <User size={11}/> Linked Driver
                                    </label>
                                    <select
                                        value={editDriverId}
                                        onChange={e => handleEditDriverChange(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer appearance-none focus:border-brand-lime transition-colors"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        disabled={loadingDriverList}
                                    >
                                        <option value="" style={{ background: 'var(--bg-card)' }}>
                                            {loadingDriverList ? 'Loading drivers...' : '— No Driver —'}
                                        </option>
                                        {editDriverList.map((drv: any) => (
                                            <option key={drv._id} value={drv._id} style={{ background: 'var(--bg-card)' }}>
                                                {drv.personalInfo?.fullName || drv.driverId || drv._id}
                                                {drv.driverId ? ` (${drv.driverId})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* ── Invoice Linker ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <Link size={11}/> Link to Invoice <span className="opacity-50 normal-case font-semibold">(optional)</span>
                                    </label>
                                    <select
                                        value={editInvoiceId}
                                        onChange={e => setEditInvoiceId(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer appearance-none focus:border-brand-lime transition-colors"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        disabled={loadingEditInvoices || !editDriverId}
                                    >
                                        <option value="" style={{ background: 'var(--bg-card)' }}>
                                            {!editDriverId ? 'Select a driver first' : loadingEditInvoices ? 'Loading invoices...' : '— No Invoice Link —'}
                                        </option>
                                        {editInvoiceList.map((inv: any) => (
                                            <option key={inv._id} value={inv._id} style={{ background: 'var(--bg-card)' }}>
                                                {inv.invoiceNumber} · {inv.weekLabel || 'No Label'} · Bal: ${inv.balance?.toLocaleString() ?? 0}
                                            </option>
                                        ))}
                                    </select>
                                    {editDriverId && editInvoiceList.length === 0 && !loadingEditInvoices && (
                                        <p className="text-[10px] text-amber-400">No unpaid invoices found for this driver.</p>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t" style={{ borderColor: 'var(--border-main)' }} />

                                {/* ── Amount ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Credit Value ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
                                        <input
                                            type="number" step="0.01" required
                                            value={editAmount}
                                            onChange={e => setEditAmount(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-black focus:border-brand-lime outline-none"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                {/* ── Date ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Credit Date *</label>
                                    <input
                                        type="date" required
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs outline-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                                    />
                                </div>

                                {/* ── Reason ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Category Reason *</label>
                                    <select
                                        required
                                        value={editReason}
                                        onChange={e => setEditReason(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs outline-none cursor-pointer appearance-none focus:border-brand-lime"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="Overcharge Reversal" style={{ background: 'var(--bg-card)' }}>Overcharge Reversal</option>
                                        <option value="Vehicle Downtime Adjustment" style={{ background: 'var(--bg-card)' }}>Vehicle Downtime Adjustment</option>
                                        <option value="Goodwill / Rental Discount" style={{ background: 'var(--bg-card)' }}>Goodwill / Rental Discount</option>
                                        <option value="Damages Dispute Refund" style={{ background: 'var(--bg-card)' }}>Damages Dispute Refund</option>
                                        <option value="Administrative Correction" style={{ background: 'var(--bg-card)' }}>Administrative Correction</option>
                                    </select>
                                </div>

                                {/* ── Notes ── */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Audit Memo</label>
                                    <textarea
                                        rows={2}
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        className="w-full p-3.5 border rounded-xl text-xs outline-none resize-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* ── Sticky Footer — always visible ── */}
                            <div
                                className="flex gap-3 p-5 border-t flex-shrink-0"
                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 border font-black text-[10px] uppercase rounded-xl transition-colors cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)', background: 'transparent' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submittingEdit}
                                    className="flex-1 py-3 font-black text-[10px] uppercase rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    style={{ background: '#C8E600', color: '#000000' }}
                                >
                                    {submittingEdit && <RefreshCw size={12} className="animate-spin"/>}
                                    Save Revisions
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= APPLY MODAL ================= */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl bg-[#0C0D0E] text-left animate-in zoom-in-95 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-6 border-b bg-black/20 flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <FileCheck size={18} className="text-brand-lime"/> Apply to Invoice
                                </h2>
                                <p className="text-[10px] text-brand-lime font-black uppercase tracking-widest mt-0.5">
                                    Credit Value: ${note.amount.toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer"><X size={16}/></button>
                        </div>

                        <form onSubmit={handleConfirmApply} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Specify Ledger Statement</label>
                                {loadingApplyInvoices ? (
                                    <div className="flex items-center justify-center py-6"><RefreshCw className="animate-spin text-brand-lime" size={18}/></div>
                                ) : applyInvoices.length === 0 ? (
                                    <div className="text-center py-5 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                                        <AlertCircle className="text-rose-500 mx-auto mb-2" size={18}/>
                                        <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>No Eligible Invoices</p>
                                        <p className="text-[9px] text-dim mt-0.5">Operator balance registry records no active unpaid items.</p>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select 
                                            required 
                                            value={applyInvoiceId} 
                                            onChange={e => setApplyInvoiceId(e.target.value)} 
                                            className="w-full pl-4 pr-8 py-3 border rounded-xl text-xs font-black outline-none cursor-pointer appearance-none focus:border-brand-lime" 
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="" style={{background: 'var(--bg-card)'}}>-- Select Target Invoice --</option>
                                            {applyInvoices.map((inv: any) => (
                                                <option key={inv._id} value={inv._id} style={{background: 'var(--bg-card)'}}>
                                                    {inv.invoiceNumber} ({inv.weekLabel || 'No Label'}) - Bal: ${inv.balance.toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#737373]">
                                            <Filter size={12} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {applyInvoiceId && applyInvoices.length > 0 && (
                                <div className="p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 shadow-inner space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-dim">
                                        <span>Will Apply:</span>
                                        <span style={{ color: 'var(--text-main)' }}>${Math.min(note.amount, (applyInvoices.find(i => i._id === applyInvoiceId)?.balance || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-[#A3A3A3]">
                                        <span>Post Balance:</span>
                                        <span className="text-brand-lime">${Math.max(0, (applyInvoices.find(i => i._id === applyInvoiceId)?.balance || 0) - note.amount).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsApplyModalOpen(false)} className="flex-1 py-3 border font-black text-[10px] uppercase rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>Cancel</button>
                                <button 
                                    type="submit" 
                                    disabled={submittingApply || applyInvoices.length === 0 || !applyInvoiceId} 
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-black text-[10px] uppercase rounded-xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 hover:scale-[1.02] transition-all cursor-pointer"
                                >
                                    {submittingApply ? <RefreshCw size={12} className="animate-spin"/> : <CheckCircle2 size={12} strokeWidth={2.5}/>}
                                    {submittingApply ? 'Finalizing...' : 'Post Application'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'CLOSED':
        case 'APPLIED':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none">Closed</span>;
        case 'VOID':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none">Void</span>;
        default:
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-amber-500/10 text-amber-400 border-amber-500/20 select-none">Open</span>;
    }
};

export default CreditNoteDetail;
