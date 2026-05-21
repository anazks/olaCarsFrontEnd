import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    DollarSign, AlertCircle, X, Printer, ArrowLeft, 
    Edit3, FileSpreadsheet, FileCheck, Undo2, Filter, 
    RefreshCw, CheckCircle2, Sun, Moon, User, Link,
    Calendar, FileText, History, Clock, CheckCircle
} from 'lucide-react';
import { getCreditNoteById, voidCreditNote, updateCreditNote, applyCreditNote } from '../../../../services/creditNoteService';
import { getInvoicesByDriver } from '../../../../services/invoiceService';
import { getAllDrivers } from '../../../../services/driverService';
import { useTheme } from '../../../../context/ThemeContext';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';

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
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading credit note details...</p>
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-3xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Credit Note Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The credit note you're looking for doesn't exist."}</p>
                <button onClick={() => navigate('..')} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    Back to List
                </button>
            </div>
        );
    }

    const statusColors: any = {
        OPEN: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        APPLIED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        CLOSED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        VOID: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <AlertCircle size={16} /> }
    };

    const s = statusColors[note.status] || statusColors.OPEN;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <Breadcrumbs items={[
                { label: 'Dashboard', path: '/admin/financial-admin' }, 
                { label: 'Credit Notes', path: '/admin/financial-admin/credit-notes' },
                { label: note.creditNoteNumber || 'View Note', active: true }
            ]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'LEGACY'}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                {s.icon} {note.status.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {['OPEN', 'DRAFT'].includes(note.status) && (
                        <>
                            <button 
                                onClick={triggerEditModal}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border hover:bg-white/5 transition-all"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <Edit3 size={16} /> Edit Credit Note
                            </button>

                            <button 
                                onClick={handleVoidCreditNote}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            >
                                <Undo2 size={16} /> Void Credit
                            </button>

                            <button
                                onClick={triggerApplyModal}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 text-[#111]"
                                style={{ background: '#C8E600' }}
                            >
                                <FileCheck size={16} /> Apply to Invoice
                            </button>
                        </>
                    )}
                    <div className="h-6 w-px bg-white/10 mx-1" />
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="flex items-center justify-center p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl active:scale-95 transition-all cursor-pointer"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border hover:bg-white/5 transition-all"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Linked Invoice Alert Banner */}
                    {note.invoiceId && note.status === 'CLOSED' && (
                        <div className="p-4 rounded-2xl flex justify-between items-center shadow-inner border animate-in fade-in duration-300"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                            <div className="flex items-center gap-3">
                                <FileCheck className="text-blue-400" size={18} />
                                <div>
                                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-main)' }}>Applied directly to invoice</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Dynamic offset finalized against {note.invoiceId.invoiceNumber}</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded px-2.5 py-0.5 uppercase tracking-widest">Applied</span>
                        </div>
                    )}

                    {note.invoiceId && ['OPEN', 'DRAFT'].includes(note.status) && (
                        <div className="p-4 rounded-2xl flex justify-between items-center shadow-inner border animate-in fade-in duration-300"
                            style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-amber-400" size={18} />
                                <div>
                                    <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-main)' }}>Linked intended target</p>
                                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Ready to be applied to {note.invoiceId.invoiceNumber}. Click "Apply to Invoice" above to post.</p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-2.5 py-0.5 uppercase tracking-widest">Draft Link</span>
                        </div>
                    )}

                    {/* Summary Card */}
                    <div className="rounded-3xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Driver</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {note.driverId?.personalInfo?.fullName || note.driverId?.fullName || note.name || 'Unresolved Account'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Linked Invoice</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {note.invoiceId && typeof note.invoiceId === 'object' ? note.invoiceId.invoiceNumber : 'Standalone Credit'}
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
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Credit Date</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {note.creditNoteDate ? new Date(note.creditNoteDate).toLocaleDateString() : 'Not Specified'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Reason</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {note.reason || 'Legacy Accounting Correction'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileText size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Credit Note Items</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Description / Reason</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Qty</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{note.reason || 'Credit Value Reversal'}</div>
                                        {note.notes && (
                                            <div className="text-[10px] mt-1 text-[#C8E600] font-black uppercase tracking-widest">
                                                Memo: {note.notes}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>1.00</td>
                                    <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                        ${note.amount.toFixed(2)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Reconciliation Ledger Activity */}
                    <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileSpreadsheet size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Reconciliation Ledger Activity</h3>
                        </div>
                        <div className="p-6 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-[10px] font-bold uppercase border-b pb-3" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                        <th className="pb-3 pr-4">Recorded Entry Date</th>
                                        <th className="pb-3 px-4">Classification</th>
                                        <th className="pb-3 px-4">Accounting Map</th>
                                        <th className="pb-3 pl-4 text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <tr className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 pr-4 font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(note.createdAt).toLocaleDateString()}</td>
                                        <td className="py-4 px-4 font-bold uppercase tracking-wider text-indigo-400">Credit Issuance</td>
                                        <td className="py-4 px-4 font-medium" style={{ color: 'var(--text-dim)' }}>Initial creation of ledger note.</td>
                                        <td className="py-4 pl-4 text-right font-bold" style={{ color: 'var(--text-main)' }}>${note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    {note.status === 'CLOSED' && (
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 pr-4 font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</td>
                                            <td className="py-4 px-4 font-bold uppercase tracking-wider text-emerald-400">Applied Adjustment</td>
                                            <td className="py-4 px-4 font-medium" style={{ color: 'var(--text-dim)' }}>Direct offset deduction executed on Invoice {note.invoiceId?.invoiceNumber || 'Target'}.</td>
                                            <td className="py-4 pl-4 text-right font-bold text-red-500">-${note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                    {note.status === 'VOID' && (
                                        <tr className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 pr-4 font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</td>
                                            <td className="py-4 px-4 font-bold uppercase tracking-wider text-rose-500">Void Cancellation</td>
                                            <td className="py-4 px-4 font-medium" style={{ color: 'var(--text-dim)' }}>Ledger reversal posted - note rendered inactive.</td>
                                            <td className="py-4 pl-4 text-right font-bold text-rose-500">-${note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="rounded-3xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Credit Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span style={{ color: 'var(--text-dim)' }}>Total Credit Issued</span>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>${note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span style={{ color: 'var(--text-dim)' }}>Credits Allocated</span>
                                <span className="font-bold text-red-500">
                                    -${(note.status === 'CLOSED' || note.status === 'APPLIED') ? note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                </span>
                            </div>
                            <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>Remaining Credit</span>
                                <span className="text-2xl font-black text-[#C8E600]">
                                    ${note.status === 'OPEN' ? note.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-3xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                            <History size={14} /> Audit Info
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Created At</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{new Date(note.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Last Updated</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{new Date(note.updatedAt || note.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Valuation In Words</p>
                                <p className="text-[11px] font-black italic border-l-2 pl-3 leading-relaxed" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                    {convertToWords(note.amount)} Only
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= EDIT MODAL ================= */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-lg border shadow-2xl overflow-hidden rounded-3xl max-h-[92vh] flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

                        {/* Header */}
                        <div className="p-6 border-b bg-black/20 flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <Edit3 size={18} className="text-[#C8E600]"/> Edit Credit Note
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{note.creditNoteNumber}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleEditCreditNote} className="flex flex-col flex-1 min-h-0">
                            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                                {/* Driver Picker */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <User size={11}/> Linked Driver
                                    </label>
                                    <select
                                        value={editDriverId}
                                        onChange={e => handleEditDriverChange(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer appearance-none focus:border-[#C8E600] transition-colors"
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

                                {/* Invoice Linker */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
                                        <Link size={11}/> Link to Invoice <span className="opacity-50 normal-case font-semibold">(optional)</span>
                                    </label>
                                    <select
                                        value={editInvoiceId}
                                        onChange={e => setEditInvoiceId(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer appearance-none focus:border-[#C8E600] transition-colors"
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

                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Credit Value ($)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15}/>
                                        <input
                                            type="number" step="0.01" required
                                            value={editAmount}
                                            onChange={e => setEditAmount(Number(e.target.value))}
                                            className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-black focus:border-[#C8E600] outline-none"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                {/* Date */}
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

                                {/* Reason */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Category Reason *</label>
                                    <select
                                        required
                                        value={editReason}
                                        onChange={e => setEditReason(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-xl text-xs outline-none cursor-pointer appearance-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="Overcharge Reversal" style={{ background: 'var(--bg-card)' }}>Overcharge Reversal</option>
                                        <option value="Vehicle Downtime Adjustment" style={{ background: 'var(--bg-card)' }}>Vehicle Downtime Adjustment</option>
                                        <option value="Goodwill / Rental Discount" style={{ background: 'var(--bg-card)' }}>Goodwill / Rental Discount</option>
                                        <option value="Damages Dispute Refund" style={{ background: 'var(--bg-card)' }}>Damages Dispute Refund</option>
                                        <option value="Administrative Correction" style={{ background: 'var(--bg-card)' }}>Administrative Correction</option>
                                    </select>
                                </div>

                                {/* Notes */}
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

                            <div className="flex gap-3 p-5 border-t flex-shrink-0" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-3 border font-black text-[10px] uppercase rounded-xl transition-colors cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)', background: 'transparent' }}
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
                                    <FileCheck size={18} className="text-[#C8E600]"/> Apply to Invoice
                                </h2>
                                <p className="text-[10px] text-[#C8E600] font-black uppercase tracking-widest mt-0.5">
                                    Credit Value: ${note.amount.toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 cursor-pointer" style={{ color: 'var(--text-dim)' }}><X size={16}/></button>
                        </div>

                        <form onSubmit={handleConfirmApply} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Specify Ledger Statement</label>
                                {loadingApplyInvoices ? (
                                    <div className="flex items-center justify-center py-6"><RefreshCw className="animate-spin text-[#C8E600]" size={18}/></div>
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
                                            className="w-full pl-4 pr-8 py-3 border rounded-xl text-xs font-black outline-none cursor-pointer appearance-none focus:border-[#C8E600]" 
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
                                <div className="p-4 rounded-2xl bg-[#C8E600]/10 border border-[#C8E600]/20 shadow-inner space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-dim">
                                        <span>Will Apply:</span>
                                        <span style={{ color: 'var(--text-main)' }}>${Math.min(note.amount, (applyInvoices.find(i => i._id === applyInvoiceId)?.balance || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-[#A3A3A3]">
                                        <span>Post Balance:</span>
                                        <span className="text-[#C8E600]">${Math.max(0, (applyInvoices.find(i => i._id === applyInvoiceId)?.balance || 0) - note.amount).toLocaleString()}</span>
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
                                    {submittingApply ? <RefreshCw size={12} className="animate-spin"/> : <CheckCircle2 className="font-bold" size={12} strokeWidth={2.5}/>}
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

export default CreditNoteDetail;
