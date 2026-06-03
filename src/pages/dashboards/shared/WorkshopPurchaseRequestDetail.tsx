import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkshopProcurementRequestById, approveProcurementRequest, type ProcurementRequest } from '../../../services/workshopProcurementService';
import { 
    ArrowLeft, Clock, CheckCircle, XCircle, FileText, 
    User, Calendar, Landmark, AlertCircle, Package, Receipt, Check, X, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const StatusBadge = ({ status }: { status: ProcurementRequest['status'] }) => {
    const styles = {
        PENDING: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={14} />
        },
        PENDING_FINANCE_APPROVAL: {
            bg: 'rgba(234, 88, 12, 0.1)',
            text: '#ea580c',
            border: 'rgba(234, 88, 12, 0.3)',
            icon: <Clock size={14} />
        },
        APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
            icon: <CheckCircle size={14} />
        },
        REJECTED: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
            icon: <XCircle size={14} />
        },
        CONVERTED_TO_PO: {
            bg: 'rgba(59, 130, 246, 0.1)',
            text: '#3b82f6',
            border: 'rgba(59, 130, 246, 0.3)',
            icon: <Receipt size={14} />
        },
        PENDING_FINANCE_APPROVAL: {
            bg: 'rgba(236, 72, 153, 0.1)',
            text: '#ec4899',
            border: 'rgba(236, 72, 153, 0.3)',
            icon: <Clock size={14} />
        }
    };
    const style = styles[status] || styles.APPROVED;
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider w-fit"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {style.icon}
            {status === 'CONVERTED_TO_PO' ? 'CONVERTED' : status === 'PENDING_FINANCE_APPROVAL' ? 'PENDING FINANCE' : status}
        </div>
    );
};

const WorkshopPurchaseRequestDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ProcurementRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const role = getUserRole();

    const fetchRequestDetails = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getWorkshopProcurementRequestById(id);
            setRequest(data);

            const decoded = getDecodedToken();
            if (decoded) {
                setUserId(decoded.id || '');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch request details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchRequestDetails();
    }, [fetchRequestDetails]);

    const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
        if (!request) return;
        setActionLoading(status);
        try {
            await approveProcurementRequest(request._id, { status });
            toast.success(status === 'APPROVED' ? 'Request Approved' : 'Request Rejected');
            fetchRequestDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update request');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading purchase request details...</p>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-2xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Request Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The purchase request you're looking for doesn't exist or you don't have access."}</p>
                <button onClick={() => navigate('..')} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer" style={{ color: 'var(--text-main)' }}>
                    Back to List
                </button>
            </div>
        );
    }

    const isFinanceApproval = request.status === 'PENDING_FINANCE_APPROVAL';
    const canApprove = isFinanceApproval && 
                       request.requestedBy?._id !== userId && 
                       (userRole === 'admin' || userRole === 'financeadmin');



    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchase Requests', path: '..' }, { label: request.requestNumber, active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600] cursor-pointer border-none bg-transparent">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            Request {request.requestNumber}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={request.status} />
                        </div>
                    </div>
                </div>

                {canApprove && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openActionModal('REJECT')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer bg-transparent"
                        >
                            <XCircle size={18} /> Reject Proposed
                        </button>
                        <button
                            onClick={() => openActionModal('APPROVE')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none"
                            style={{ background: '#C8E600', color: '#111' }}
                        >
                            <CheckCircle size={18} /> Approve Proposed
                        </button>
                    </div>
                )}
            </div>

            {/* Rejection / Approval Banners */}
            {request.status === 'REJECTED' && request.rejectionNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl text-sm animate-in fade-in" 
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold">Rejection Note</p>
                        <p className="text-xs mt-1 opacity-90">{request.rejectionNote}</p>
                    </div>
                </div>
            )}

            {request.status === 'APPROVED' && request.approvalNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl text-sm animate-in fade-in bg-green-500/10 border border-green-500/30 text-green-400">
                    <CheckCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold">Approval Notes</p>
                        <p className="text-xs mt-1 opacity-90">{request.approvalNote}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details Card */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Merchandiser Price Audit Block */}
                    {request.merchandiserPrice !== undefined && request.merchandiserPrice !== null && (
                        <div className="rounded-2xl border p-6 space-y-4 bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#C8E600] flex items-center gap-2">
                                <Receipt size={16} /> Merchandiser Pricing Audit
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="p-4 rounded-xl border bg-black/20" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="text-[10px] uppercase font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Original Estimated Amount</span>
                                    <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-main)' }}>
                                        ${((request.part?.unitCost || 0) * request.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    <span className="text-[10px] text-dim" style={{ color: 'var(--text-dim)' }}>
                                        Based on original unit cost: ${(request.part?.unitCost || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="p-4 rounded-xl border bg-[#C8E600]/5" style={{ borderColor: 'rgba(200,230,0,0.2)' }}>
                                    <span className="text-[10px] uppercase font-black tracking-wider" style={{ color: '#C8E600' }}>Proposed Merchandiser Amount</span>
                                    <p className="text-xl font-black mt-1 text-[#C8E600]">
                                        ${(request.merchandiserTotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>
                                        Proposed unit cost: ${(request.merchandiserPrice || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Display Documents */}
                            {request.documents && request.documents.length > 0 && (
                                <div className="pt-2">
                                    <span className="text-[10px] uppercase font-bold text-dim block mb-2" style={{ color: 'var(--text-dim)' }}>Supporting Documents</span>
                                    <div className="flex flex-wrap gap-3">
                                        {request.documents.map((doc, idx) => {
                                            const fileName = doc.split('/').pop() || `document_${idx + 1}`;
                                            return (
                                                <a 
                                                    key={idx} 
                                                    href={doc} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:text-[#C8E600] transition-all decoration-none"
                                                    style={{ color: 'var(--text-main)' }}
                                                >
                                                    <FileText size={14} />
                                                    <span className="max-w-[150px] truncate">{fileName}</span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary Info Grid */}
                    <div className="rounded-2xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Source Branch</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {request.branch?.name || 'Main Branch'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Requested By</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {request.requestedBy?.fullName || 'Technician'} ({request.requestedByRole})
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Submission Date</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(request.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Part Number</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {request.part?.partNumber || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Part Details Table */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileText size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Requested Item Details</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Item Name</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Unit Price</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Quantity</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{request.part?.partName || 'Unknown Part'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>
                                        ${(request.merchandiserPrice !== undefined && request.merchandiserPrice !== null ? request.merchandiserPrice : request.part?.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{request.quantity}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                        ${(request.quantity * (request.merchandiserPrice !== undefined && request.merchandiserPrice !== null ? request.merchandiserPrice : request.part?.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-6 text-right font-bold" style={{ color: 'var(--text-dim)' }}>Total Cost Estimate</td>
                                    <td className="px-6 py-6 text-right text-2xl font-black text-[#C8E600]">
                                        ${(request.quantity * (request.merchandiserPrice !== undefined && request.merchandiserPrice !== null ? request.merchandiserPrice : request.part?.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Approval & Notes */}
                <div className="space-y-6">
                    {request.approvedBy && (
                        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                                <CheckCircle size={14} /> Processed By
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{request.approvedBy?.fullName}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Scoped as {request.approvedByRole}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                    Processed on {new Date(request.updatedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    )}

                    {request.supplier && (
                        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                                <Landmark size={14} /> Assigned Supplier
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{request.supplier?.name}</p>
                            </div>
                        </div>
                    )}

                    {request.notes && (
                        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: 'var(--text-dim)' }}>
                                <FileText size={14} /> Procurement Notes
                            </div>
                            <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-main)' }}>
                                "{request.notes}"
                            </p>
                        </div>
                    )}

                    {/* Action Buttons for Finance Admin */}
                    {request.status === 'PENDING_FINANCE_APPROVAL' && (role === 'financeadmin' || role === 'admin') && (
                        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#C8E600]">
                                <AlertCircle size={14} /> Pending Finance Approval
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Review the requested parts and cost. Once approved, the workshop can proceed with the procurement.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleAction('REJECTED')}
                                    disabled={!!actionLoading}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50"
                                >
                                    {actionLoading === 'REJECTED' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                                    Reject
                                </button>
                                <button 
                                    onClick={() => handleAction('APPROVED')}
                                    disabled={!!actionLoading}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white disabled:opacity-50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                >
                                    {actionLoading === 'APPROVED' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Approve Request
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Modal */}
            {isActionModalOpen && (
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsActionModalOpen(false)}
                >
                    <div 
                        className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${actionType === 'REJECT' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                    {actionType === 'REJECT' ? <XCircle size={24} /> : <CheckCircle size={24} />}
                                </div>
                                <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                                    {actionType === 'REJECT' ? 'Confirm Rejection' : 'Confirm Approval'}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setIsActionModalOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p style={{ color: 'var(--text-dim)' }}>
                                Are you sure you want to <strong>{actionType.toLowerCase()}</strong> the proposed price for request <strong>{request.requestNumber}</strong>?
                            </p>

                            <div className="space-y-2">
                                <label className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                    {actionType === 'REJECT' ? 'Reason for Rejection (Required)' : 'Notes (Optional)'}
                                </label>
                                <textarea
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    placeholder={actionType === 'REJECT' ? "Please explain why this pricing is being rejected..." : "Add any notes regarding this approval..."}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime resize-none"
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid var(--border-main)',
                                        color: 'var(--text-main)',
                                        height: '100px'
                                    }}
                                    required={actionType === 'REJECT'}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5 cursor-pointer bg-transparent"
                                style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitAction}
                                disabled={actionLoading || (actionType === 'REJECT' && !actionNote.trim())}
                                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center cursor-pointer border-none"
                                style={{
                                    background: actionType === 'REJECT' ? '#ef4444' : '#C8E600',
                                    color: actionType === 'REJECT' ? 'white' : '#0A0A0A',
                                    opacity: (actionLoading || (actionType === 'REJECT' && !actionNote.trim())) ? 0.5 : 1
                                }}
                            >
                                {actionLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    actionType === 'REJECT' ? 'Reject' : 'Approve'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkshopPurchaseRequestDetail;
