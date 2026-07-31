import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    AlertCircle, X, ArrowLeft, 
    Edit3, FileCheck, Undo2, 
    RefreshCw, CheckCircle2, User, Link, Download,
    FileText, ExternalLink, Eye, Image as ImageIcon
} from 'lucide-react';
import { 
    getDebitNoteById, 
    voidDebitNote, 
    updateDebitNote, 
    applyDebitNote 
} from '../../../../services/debitNoteService';
import { getInvoicesByCustomer } from '../../../../services/invoiceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserRole } from '../../../../utils/auth';

const DebitNoteDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const getRoutePrefix = () => {
        const role = getUserRole();
        switch (role) {
            case 'admin': return '/admin/admin';
            case 'financeadmin':
            case 'financialadmin': return '/admin/financial-admin';
            case 'operationadmin':
            case 'operationaladmin': return '/admin/operational-admin';
            case 'countrymanager': return '/admin/country-manager';
            case 'branchmanager': return '/admin/branch-manager';
            case 'financestaff': return '/admin/branch-fin-staff';
            case 'operationstaff': return '/admin/branch-op-staff';
            default: return '/admin/financial-admin';
        }
    };

    const [note, setNote] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPreviewImageModalOpen, setIsPreviewImageModalOpen] = useState(false);

    // Apply Modal
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [applyInvoiceId, setApplyInvoiceId] = useState<string>('');
    const [applyInvoices, setApplyInvoices] = useState<any[]>([]);
    const [loadingApplyInvoices, setLoadingApplyInvoices] = useState(false);
    const [submittingApply, setSubmittingApply] = useState(false);

    // Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editReason, setEditReason] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [submittingEdit, setSubmittingEdit] = useState(false);

    const fetchNote = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getDebitNoteById(id);
            if (res.success) {
                setNote(res.data);
                setError(null);
            } else {
                setError("Failed retrieving target Debit Note.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed accessing Debit Note ledger.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchNote();
    }, [fetchNote]);

    // Open Apply Modal
    const openApplyModal = async () => {
        if (!note?.customerId) {
            toast.error("Debit Note has no associated customer.");
            return;
        }
        setIsApplyModalOpen(true);
        setLoadingApplyInvoices(true);
        try {
            const custId = note.customerId._id || note.customerId;
            const res = await getInvoicesByCustomer(custId);
            setApplyInvoices(Array.isArray(res) ? res : ((res as any)?.data || []));
        } catch (err) {
            console.error("Failed fetching customer invoices:", err);
            toast.error("Failed to load customer invoices.");
        } finally {
            setLoadingApplyInvoices(false);
        }
    };

    const handleApplyDebitNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !applyInvoiceId) {
            toast.error("Please select a target invoice.");
            return;
        }
        setSubmittingApply(true);
        const toastId = toast.loading("Applying Debit Note to invoice...");
        try {
            const res = await applyDebitNote(id, applyInvoiceId);
            if (res.success) {
                toast.success("Debit Note successfully applied to invoice balance!", { id: toastId });
                setIsApplyModalOpen(false);
                fetchNote();
            }
        } catch (err: any) {
            console.error("Failed to apply Debit Note:", err);
            toast.error(err.response?.data?.message || "Failed applying Debit Note.", { id: toastId });
        } finally {
            setSubmittingApply(false);
        }
    };

    const handleVoidDebitNote = async () => {
        if (!id) return;
        if (!window.confirm("Are you sure you want to VOID this Debit Note? This action cannot be undone.")) return;
        const toastId = toast.loading("Voiding Debit Note...");
        try {
            const res = await voidDebitNote(id);
            if (res.success) {
                toast.success("Debit Note voided successfully.", { id: toastId });
                fetchNote();
            }
        } catch (err: any) {
            console.error("Failed to void Debit Note:", err);
            toast.error(err.response?.data?.message || "Failed to void Debit Note.", { id: toastId });
        }
    };

    const triggerEditModal = () => {
        if (!note) return;
        setEditReason(note.reason || '');
        setEditNotes(note.notes || '');
        setIsEditModalOpen(true);
    };

    const handleUpdateDebitNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSubmittingEdit(true);
        const toastId = toast.loading("Updating Debit Note...");
        try {
            const res = await updateDebitNote(id, { reason: editReason, notes: editNotes });
            if (res.success) {
                toast.success("Debit Note updated successfully!", { id: toastId });
                setIsEditModalOpen(false);
                fetchNote();
            }
        } catch (err: any) {
            console.error("Failed to update Debit Note:", err);
            toast.error(err.response?.data?.message || "Failed updating Debit Note.", { id: toastId });
        } finally {
            setSubmittingEdit(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!note) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`DEBIT NOTE: ${note.debitNoteNumber}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Date: ${note.debitNoteDate ? new Date(note.debitNoteDate).toLocaleDateString() : 'N/A'}`, 14, 28);
        doc.text(`Status: ${note.status}`, 14, 34);

        doc.setFontSize(12);
        doc.text("Customer Information:", 14, 46);
        doc.setFontSize(10);
        doc.text(`Name: ${note.customerId?.name || 'N/A'}`, 14, 52);
        doc.text(`Email: ${note.customerId?.email || 'N/A'}`, 14, 58);
        doc.text(`Phone: ${note.customerId?.phone || 'N/A'}`, 14, 64);

        autoTable(doc, {
            startY: 74,
            head: [['Item Description', 'Reason', 'Amount ($)']],
            body: [
                ['Debit Note Adjustment', note.reason || 'N/A', `$${(note.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`]
            ],
            headStyles: { fillColor: [212, 241, 46], textColor: [0, 0, 0] }
        });

        if (note.notes) {
            const finalY = (doc as any).lastAutoTable.finalY || 100;
            doc.text(`Notes: ${note.notes}`, 14, finalY + 10);
        }

        doc.save(`${note.debitNoteNumber}.pdf`);
        toast.success("Debit Note PDF downloaded!");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCw size={24} className="animate-spin text-brand-lime" />
                <p className="text-xs font-bold text-dim uppercase tracking-widest">Loading Debit Note Details...</p>
            </div>
        );
    }

    if (error || !note) {
        return (
            <div className="p-8 rounded-3xl border border-rose-500/20 bg-rose-500/5 text-center space-y-4 max-w-lg mx-auto my-12">
                <AlertCircle size={32} className="text-rose-400 mx-auto" />
                <h2 className="text-sm font-black uppercase tracking-wider text-rose-400">{error || "Debit Note Not Found"}</h2>
                <button onClick={() => navigate(`${getRoutePrefix()}/sales/debit-notes`)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    Return to Debit Notes Ledger
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Breadcrumbs & Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Breadcrumbs items={[
                        { label: 'Sales', path: `${getRoutePrefix()}/invoices` },
                        { label: 'Debit Notes', path: `${getRoutePrefix()}/sales/debit-notes` },
                        { label: note.debitNoteNumber, active: true }
                    ]} />
                    <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => navigate(`${getRoutePrefix()}/sales/debit-notes`)} className="p-1.5 rounded-xl border hover:bg-white/10 text-dim">
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{note.debitNoteNumber}</h1>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            note.status === 'CLOSED' || note.status === 'APPLIED' || note.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            note.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            note.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            note.status === 'CANCELLED' || note.status === 'VOID' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                            note.status === 'DRAFT' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                            {note.status}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold hover:bg-white/10 transition-all cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <Download size={14} className="text-brand-lime" /> Download PDF
                    </button>
                    {['OPEN', 'PENDING', 'DRAFT', 'OVERDUE'].includes(note.status) && (
                        <>
                            <button onClick={triggerEditModal} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold hover:bg-white/10 transition-all cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <Edit3 size={14} /> Edit
                            </button>
                            <button onClick={openApplyModal} className="flex items-center gap-2 px-5 py-2 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer" style={{ background: 'var(--brand-lime)' }}>
                                <FileCheck size={14} /> Apply to Invoice
                            </button>
                        </>
                    )}
                    {note.status !== 'VOID' && note.status !== 'CANCELLED' && (
                        <button onClick={handleVoidDebitNote} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer">
                            <Undo2 size={14} /> Void Debit Note
                        </button>
                    )}
                </div>
            </div>

            {/* Core Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Details Card */}
                <div className="md:col-span-2 p-6 rounded-3xl border shadow-sm space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Debit Note Parameters</h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <div>
                            <span className="text-[10px] font-black uppercase text-dim block">Total Amount</span>
                            <span className="text-lg font-black text-amber-400">${(note.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-dim block">Amount Paid / Applied</span>
                            <span className="text-lg font-black text-emerald-400">${(note.amountPaid !== undefined ? note.amountPaid : (note.status === 'PAID' ? note.amount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-dim block">Remaining Balance</span>
                            <span className="text-lg font-black text-rose-400">${(note.balance !== undefined ? note.balance : (note.status === 'PAID' ? 0 : note.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase text-dim block">Issue Date</span>
                            <span className="text-sm font-bold block mt-1" style={{ color: 'var(--text-main)' }}>{note.debitNoteDate ? new Date(note.debitNoteDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>

                    {note.notes && (
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-dim block">Notes / Description</span>
                            <p className="text-xs font-semibold p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                {note.notes}
                            </p>
                        </div>
                    )}

                    {/* Linked Invoice Info */}
                    <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <h4 className="text-xs font-black uppercase tracking-wider text-dim">Linked Invoice Status</h4>
                        {note.invoiceId ? (
                            <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3">
                                    <Link size={18} className="text-blue-400" />
                                    <div>
                                        <p className="text-xs font-black text-blue-400 cursor-pointer hover:underline" onClick={() => navigate(`${getRoutePrefix()}/invoices/${note.invoiceId._id}`)}>
                                            {note.invoiceId.invoiceNumber}
                                        </p>
                                        <p className="text-[10px] text-dim font-bold">Total Due: ${note.invoiceId.totalAmountDue} | Balance: ${note.invoiceId.balance}</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {note.invoiceId.status}
                                </span>
                            </div>
                        ) : (
                            <p className="text-xs text-dim italic">This Debit Note is currently standalone and not applied to any specific invoice.</p>
                        )}
                    </div>
                </div>

                {/* Customer Details Side Card */}
                <div className="p-6 rounded-3xl border shadow-sm space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Customer Account</h3>

                    {note.customerId ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,241,46,0.1)', border: '1px solid rgba(212,241,46,0.2)' }}>
                                    <User size={20} className="text-brand-lime" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{note.customerId.name}</h4>
                                    <p className="text-[10px] font-bold text-dim">{note.customerId.customerId || 'ID: —'}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-xs font-semibold pt-3 border-t" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                <p><span className="text-[10px] font-black uppercase text-dim">Email:</span> {note.customerId.email || 'N/A'}</p>
                                <p><span className="text-[10px] font-black uppercase text-dim">Phone:</span> {note.customerId.phone || 'N/A'}</p>
                                <p><span className="text-[10px] font-black uppercase text-dim">Branch:</span> {note.customerId.branch || 'N/A'}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-dim italic">No customer linked.</p>
                    )}
                </div>
            </div>

            {/* Uploaded Supporting Document & Image Display */}
            {note.supportingDocument && (() => {
                const docPath = typeof note.supportingDocument === 'string'
                    ? note.supportingDocument
                    : note.supportingDocument?.url;
                const docName = typeof note.supportingDocument === 'object' && note.supportingDocument?.name
                    ? note.supportingDocument.name
                    : 'Supporting Document';
                const uploadedAt = typeof note.supportingDocument === 'object' && note.supportingDocument?.uploadedAt
                    ? new Date(note.supportingDocument.uploadedAt).toLocaleDateString()
                    : null;

                const fullDocUrl = docPath
                    ? (docPath.startsWith('http') ? docPath : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${docPath.startsWith('/') ? '' : '/'}${docPath}`)
                    : '';

                const isImg = fullDocUrl && (
                    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(fullDocUrl) ||
                    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(docName) ||
                    fullDocUrl.toLowerCase().includes('/debit-notes/') ||
                    fullDocUrl.toLowerCase().includes('/uploads/')
                );

                return (
                    <div className="p-6 rounded-3xl border shadow-sm space-y-4 animate-in fade-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ImageIcon size={18} className="text-brand-lime" />
                                <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                    Uploaded Supporting Document / Image
                                </h3>
                            </div>
                            {fullDocUrl && (
                                <a
                                    href={fullDocUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold hover:bg-white/10 transition-all text-brand-lime cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ExternalLink size={12} />
                                    <span>Open Full File</span>
                                </a>
                            )}
                        </div>

                        {isImg ? (
                            <div className="space-y-3">
                                <div 
                                    onClick={() => setIsPreviewImageModalOpen(true)}
                                    className="relative group rounded-2xl overflow-hidden border cursor-pointer max-h-96 flex items-center justify-center bg-black/40"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <img
                                        src={fullDocUrl}
                                        alt={docName}
                                        className="w-full h-auto max-h-96 object-contain rounded-2xl transition-transform duration-300 group-hover:scale-105"
                                        onError={(e: any) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/600x400?text=Attachment+Preview';
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <span className="px-4 py-2 bg-brand-lime text-black font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5">
                                            <Eye size={14} /> Click to Enlarge Image
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs font-semibold text-dim px-1">
                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>📷 {docName}</span>
                                    {uploadedAt && <span>Uploaded: {uploadedAt}</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl border flex items-center justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3">
                                    <FileText size={24} className="text-brand-lime" />
                                    <div>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{docName}</p>
                                        {uploadedAt && <p className="text-[10px] text-dim font-medium">Uploaded: {uploadedAt}</p>}
                                    </div>
                                </div>
                                {fullDocUrl && (
                                    <a
                                        href={fullDocUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-brand-lime text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                                    >
                                        View Document
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Image Full Screen Modal */}
            {isPreviewImageModalOpen && note?.supportingDocument && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in cursor-pointer"
                    onClick={() => setIsPreviewImageModalOpen(false)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsPreviewImageModalOpen(false)}
                            className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white cursor-pointer transition-all"
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={typeof note.supportingDocument === 'string'
                                ? (note.supportingDocument.startsWith('http') ? note.supportingDocument : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${note.supportingDocument.startsWith('/') ? '' : '/'}${note.supportingDocument}`)
                                : (note.supportingDocument.url.startsWith('http') ? note.supportingDocument.url : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${note.supportingDocument.url.startsWith('/') ? '' : '/'}${note.supportingDocument.url}`)
                            }
                            alt="Full Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-2xl border shadow-2xl"
                            style={{ borderColor: 'var(--border-main)' }}
                        />
                    </div>
                </div>
            )}

            {/* Apply Modal */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                    <div className="relative w-full max-w-lg flex flex-col rounded-[2rem] shadow-2xl border animate-in fade-in duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Apply Debit Note</h2>
                                <p className="text-[10px] font-semibold mt-0.5 text-dim">Increase invoice total balance by ${note.amount}</p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className="p-2 rounded-xl border hover:bg-white/10 text-dim" style={{ borderColor: 'var(--border-main)' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleApplyDebitNote} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Select Target Invoice *</label>
                                {loadingApplyInvoices ? (
                                    <p className="text-xs text-brand-lime font-bold">Loading customer invoices...</p>
                                ) : (
                                    <select
                                        required
                                        value={applyInvoiceId}
                                        onChange={(e) => setApplyInvoiceId(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">-- Choose Invoice --</option>
                                        {applyInvoices.map(inv => (
                                            <option key={inv._id} value={inv._id}>
                                                {inv.invoiceNumber} — Current Balance: ${inv.balance} (Due: ${inv.totalAmountDue})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20 text-xs font-semibold text-amber-300">
                                Note: Applying this Debit Note will add <strong>${note.amount}</strong> to the invoice's total amount due and remaining balance.
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-5 py-2.5 border rounded-xl text-xs font-bold cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingApply || !applyInvoiceId}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    {submittingApply ? <RefreshCw size={14} className="animate-spin" /> : <FileCheck size={14} />}
                                    <span>{submittingApply ? 'Applying...' : 'Apply Debit Note'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                    <div className="relative w-full max-w-lg flex flex-col rounded-[2rem] shadow-2xl border animate-in fade-in duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Edit Debit Note</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-xl border hover:bg-white/10 text-dim" style={{ borderColor: 'var(--border-main)' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateDebitNote} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Reason</label>
                                <input
                                    type="text"
                                    required
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Notes / Remark</label>
                                <textarea
                                    rows={3}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none resize-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 border rounded-xl text-xs font-bold cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingEdit}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    {submittingEdit ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    <span>{submittingEdit ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebitNoteDetail;
