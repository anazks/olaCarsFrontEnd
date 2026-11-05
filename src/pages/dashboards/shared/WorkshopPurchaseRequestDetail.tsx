import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkshopProcurementRequestById, financeApproveProcurementRequest, workshopManagerApproveProcurementRequest, type ProcurementRequest } from '../../../services/workshopProcurementService';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, FileText,
    User, Calendar, Landmark, AlertCircle, Package, Receipt, Check, X, Loader2, ExternalLink, Share2,
    Image as ImageIcon, ZoomIn, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUserRole, getDecodedToken } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const StatusBadge = ({ status }: { status: ProcurementRequest['status'] }) => {
    const styles: Record<ProcurementRequest['status'], { bg: string; text: string; border: string; icon: any }> = {
        PENDING: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={14} />
        },
        PENDING_WORKSHOP_MANAGER_APPROVAL: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={14} />
        },
        PENDING_FINANCE_APPROVAL: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={14} />
        },
        APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
            icon: <CheckCircle size={14} />
        },
        PARTIALLY_CONVERTED: {
            bg: 'rgba(249, 115, 22, 0.1)',
            text: '#f97316',
            border: 'rgba(249, 115, 22, 0.3)',
            icon: <Package size={14} />
        },
        COST_APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
            icon: <CheckCircle size={14} />
        },
        IN_TRANSIT: {
            bg: 'rgba(99, 102, 241, 0.1)',
            text: '#6366f1',
            border: 'rgba(99, 102, 241, 0.3)',
            icon: <Package size={14} />
        },
        RECEIVED: {
            bg: 'rgba(16, 185, 129, 0.1)',
            text: '#10b981',
            border: 'rgba(16, 185, 129, 0.3)',
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
        WAITING_QUOTATION: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
            icon: <Clock size={14} />
        }
    };
    const style = styles[status] || styles.APPROVED;
    const labelMap: Partial<Record<ProcurementRequest['status'], string>> = {
        CONVERTED_TO_PO: 'CONVERTED TO PO',
        PARTIALLY_CONVERTED: 'PARTIALLY ALLOCATED',
        PENDING_WORKSHOP_MANAGER_APPROVAL: 'PENDING WORKSHOP',
        PENDING_FINANCE_APPROVAL: 'PENDING FINANCE',
        WAITING_QUOTATION: 'WAITING QUOTATION'
    };
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider w-fit"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {style.icon}
            {labelMap[status] || status}
        </div>
    );
};

const resolveImageUrl = (url?: string | null): string => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed || trimmed.toLowerCase().includes('undefined') || trimmed.toLowerCase().includes('null')) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseUrl}${cleanPath}`;
};

const WorkshopPurchaseRequestDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [request, setRequest] = useState<ProcurementRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const role = getUserRole();
    const userRole = role || '';

    const [userId, setUserId] = useState<string>('');
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [actionNote, setActionNote] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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

    const openActionModal = (type: 'APPROVE' | 'REJECT') => {
        setActionType(type);
        setActionNote('');
        setIsActionModalOpen(true);
    };

    const submitAction = async () => {
        if (!request) return;
        setActionLoading(actionType);
        try {
            const apiStatus = actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED';
            const isWorkshop = request.status === 'PENDING' || request.status === 'PENDING_WORKSHOP_MANAGER_APPROVAL';
            if (isWorkshop) {
                await workshopManagerApproveProcurementRequest(request._id, {
                    status: apiStatus,
                    note: actionNote,
                    rejectionReason: actionType === 'REJECT' ? actionNote : undefined
                });
                toast.success(actionType === 'APPROVE' ? 'Requisition Approved by Workshop Manager' : 'Requisition Rejected');
            } else {
                await financeApproveProcurementRequest(request._id, {
                    status: apiStatus,
                    note: actionNote
                });
                toast.success(actionType === 'APPROVE' ? 'Request Approved' : 'Request Rejected');
            }
            setIsActionModalOpen(false);
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
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer" style={{ color: 'var(--text-main)' }}>
                    Back to List
                </button>
            </div>
        );
    }

    const isWorkshopApproval = request.status === 'PENDING' || request.status === 'PENDING_WORKSHOP_MANAGER_APPROVAL';
    const isFinanceApproval = request.status === 'PENDING_FINANCE_APPROVAL';

    const canWorkshopApprove = isWorkshopApproval &&
        (userRole === 'admin' || userRole === 'workshopmanager' || userRole === 'operationadmin');

    const canFinanceApprove = isFinanceApproval &&
        request.requestedBy?._id !== userId &&
        (userRole === 'admin' || userRole === 'financeadmin');

    const isPricingAuditAvailable = request.merchandiserPrice !== undefined && request.merchandiserPrice !== null;



    const handleCopyLink = () => {
        if (!request) return;
        const shareableUrl = `${window.location.origin}/workshop-purchase-requests/${request._id}`;
        navigator.clipboard.writeText(shareableUrl);
        toast.success('Shareable PR link copied to clipboard!');
    };

    return (
        <div className="space-y-6 pb-20">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchase Requests', path: '..' }, { label: request.requestNumber, active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600] cursor-pointer border-none bg-transparent">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            Request {request.requestNumber}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <StatusBadge status={request.status} />
                            {request.linkedPO && (
                                <button
                                    onClick={() => navigate(`/purchase-orders/${request.linkedPO._id || request.linkedPO.id}`)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C8E600]/10 text-[#C8E600] border border-[#C8E600]/30 hover:bg-[#C8E600]/20 transition-all cursor-pointer"
                                >
                                    <ExternalLink size={12} /> View {request.linkedPO.purchaseOrderNumber}
                                </button>
                            )}
                            <button
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                title="Copy canonical share link"
                            >
                                <Share2 size={12} className="text-[#C8E600]" /> Copy Link
                            </button>
                        </div>
                    </div>
                </div>

                {canWorkshopApprove && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openActionModal('REJECT')}
                            disabled={!!actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500 cursor-pointer bg-transparent"
                        >
                            <XCircle size={18} /> Reject Requisition
                        </button>
                        <button
                            onClick={() => openActionModal('APPROVE')}
                            disabled={!!actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none bg-[#C8E600] text-black"
                        >
                            <CheckCircle size={18} /> Approve Requisition (Workshop Mgr)
                        </button>
                    </div>
                )}

                {canFinanceApprove && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openActionModal('REJECT')}
                            disabled={!!actionLoading || !isPricingAuditAvailable}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-500 cursor-pointer bg-transparent"
                            title={!isPricingAuditAvailable ? "Pricing audit not available from merchandiser" : ""}
                        >
                            <XCircle size={18} /> Reject Proposed
                        </button>
                        <button
                            onClick={() => openActionModal('APPROVE')}
                            disabled={!!actionLoading || !isPricingAuditAvailable}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none"
                            style={{
                                background: isPricingAuditAvailable ? '#C8E600' : 'rgba(255,255,255,0.05)',
                                color: isPricingAuditAvailable ? '#111' : 'rgba(255,255,255,0.2)',
                                border: isPricingAuditAvailable ? 'none' : '1px solid rgba(255,255,255,0.1)'
                            }}
                            title={!isPricingAuditAvailable ? "Pricing audit not available from merchandiser" : ""}
                        >
                            <CheckCircle size={18} /> Approve Proposed
                        </button>
                    </div>
                )}
            </div>

            {/* Rejection / Approval Banners */}
            {(request.status === 'REJECTED' || request.status === 'WAITING_QUOTATION') && (request.rejectionReason || request.rejectionNote) && (
                <div className="flex items-start gap-3 p-4 rounded-xl text-sm animate-in fade-in"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <div>
                        <p className="font-bold">Rejection Note</p>
                        <p className="text-xs mt-1 opacity-90">{request.rejectionReason || request.rejectionNote}</p>
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

                            {/* Display Supplier Details if available */}
                            {request.supplierDetails && (
                                <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="text-[10px] uppercase font-bold text-[#C8E600] block mb-2">Audited Supplier Details</span>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="block text-[9px] uppercase font-bold text-dim mb-0.5" style={{ color: 'var(--text-dim)' }}>Supplier Name</span>
                                            <span className="font-semibold text-main" style={{ color: 'var(--text-main)' }}>{request.supplierDetails.name || '—'}</span>
                                        </div>
                                        {request.supplierDetails.email && (
                                            <div>
                                                <span className="block text-[9px] uppercase font-bold text-dim mb-0.5" style={{ color: 'var(--text-dim)' }}>Supplier Email</span>
                                                <span className="font-semibold text-main" style={{ color: 'var(--text-main)' }}>{request.supplierDetails.email}</span>
                                            </div>
                                        )}
                                        {request.supplierDetails.phone && (
                                            <div>
                                                <span className="block text-[9px] uppercase font-bold text-dim mb-0.5" style={{ color: 'var(--text-dim)' }}>Supplier Phone</span>
                                                <span className="font-semibold text-main" style={{ color: 'var(--text-main)' }}>{request.supplierDetails.phone}</span>
                                            </div>
                                        )}
                                        {request.supplierDetails.address && (
                                            <div className="col-span-2">
                                                <span className="block text-[9px] uppercase font-bold text-dim mb-0.5" style={{ color: 'var(--text-dim)' }}>Supplier Address</span>
                                                <span className="font-semibold text-main" style={{ color: 'var(--text-main)' }}>{request.supplierDetails.address}</span>
                                            </div>
                                        )}
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
                                        {formatDateTime(request.createdAt)}
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
                            {request.transportationMode && (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                                        <Truck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Transport Mode</p>
                                        <p className="font-bold text-sm text-sky-400">
                                            {request.transportationMode === 'SEA' ? '🚢 Sea Cargo' : request.transportationMode === 'AIR' ? '✈️ Air Freight' : '🚚 Land Transport'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attached Photographs (Photo Proofs) */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2">
                            <ImageIcon size={18} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                Photo Proofs (Technician Upload)
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Full Size Photo */}
                            <div className="p-4 rounded-xl border bg-black/20 text-center relative group" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <span className="text-[10px] uppercase font-bold block mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Full Size Photo
                                </span>
                                {resolveImageUrl(request.fullSizePhoto) && !imgErrors['full'] ? (
                                    <div
                                        className="relative h-48 w-full rounded-lg overflow-hidden cursor-pointer bg-black/40 border border-white/5 hover:border-[#C8E600]/40 transition-all"
                                        onClick={() => setSelectedPhoto(resolveImageUrl(request.fullSizePhoto))}
                                    >
                                        <img
                                            src={resolveImageUrl(request.fullSizePhoto)}
                                            alt="Full Size Photo Proof"
                                            onError={() => setImgErrors(prev => ({ ...prev, full: true }))}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white backdrop-blur-[2px]">
                                            <ZoomIn size={16} className="text-[#C8E600]" /> Click to enlarge
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 flex flex-col items-center justify-center text-xs bg-black/10 rounded-lg border border-dashed border-white/10 gap-2" style={{ color: 'var(--text-dim)' }}>
                                        <ImageIcon size={24} className="opacity-30" />
                                        <span>{imgErrors['full'] ? 'Failed to load full size photo' : 'No full size photo uploaded'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Close-Up Photo */}
                            <div className="p-4 rounded-xl border bg-black/20 text-center relative group" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <span className="text-[10px] uppercase font-bold block mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Close-Up Photo (Part #)
                                </span>
                                {resolveImageUrl(request.closeUpPhoto) && !imgErrors['close'] ? (
                                    <div
                                        className="relative h-48 w-full rounded-lg overflow-hidden cursor-pointer bg-black/40 border border-white/5 hover:border-[#C8E600]/40 transition-all"
                                        onClick={() => setSelectedPhoto(resolveImageUrl(request.closeUpPhoto))}
                                    >
                                        <img
                                            src={resolveImageUrl(request.closeUpPhoto)}
                                            alt="Close Up Photo Proof"
                                            onError={() => setImgErrors(prev => ({ ...prev, close: true }))}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-bold text-white backdrop-blur-[2px]">
                                            <ZoomIn size={16} className="text-[#C8E600]" /> Click to enlarge
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-48 flex flex-col items-center justify-center text-xs bg-black/10 rounded-lg border border-dashed border-white/10 gap-2" style={{ color: 'var(--text-dim)' }}>
                                        <ImageIcon size={24} className="opacity-30" />
                                        <span>{imgErrors['close'] ? 'Failed to load close-up photo' : 'No close-up photo uploaded'}</span>
                                    </div>
                                )}
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

                    {/* PO Fulfillment & Allocation Card */}
                    {(request.status === 'APPROVED' || request.status === 'PARTIALLY_CONVERTED' || request.status === 'CONVERTED_TO_PO' || (request.fulfilledQuantity && request.fulfilledQuantity > 0)) && (
                        <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-2">
                                    <Receipt size={18} className="text-[#C8E600]" />
                                    <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                        PO Fulfillment & Allocation Status
                                    </h3>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 rounded-full border"
                                    style={{
                                        background: (request.remainingQuantity ?? (request.quantity - (request.fulfilledQuantity || 0))) === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(249,115,22,0.1)',
                                        borderColor: (request.remainingQuantity ?? (request.quantity - (request.fulfilledQuantity || 0))) === 0 ? 'rgba(34,197,94,0.3)' : 'rgba(249,115,22,0.3)',
                                        color: (request.remainingQuantity ?? (request.quantity - (request.fulfilledQuantity || 0))) === 0 ? '#22c55e' : '#f97316'
                                    }}>
                                    {(request.remainingQuantity ?? (request.quantity - (request.fulfilledQuantity || 0))) === 0 ? 'Fully Converted to PO' : 'Partially Converted'}
                                </span>
                            </div>

                            {/* Units Counter Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl border bg-black/20" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Approved Units</span>
                                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                        {request.quantity}
                                    </p>
                                    <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Total approved by Workshop Mgr</span>
                                </div>
                                <div className="p-4 rounded-xl border bg-blue-500/5" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
                                    <span className="text-[10px] uppercase font-bold text-blue-400">Allocated to POs</span>
                                    <p className="text-2xl font-black mt-1 text-blue-400">
                                        {request.fulfilledQuantity || (request.status === 'CONVERTED_TO_PO' ? request.quantity : 0)}
                                    </p>
                                    <span className="text-[10px] text-blue-300/70">Across connected Purchase Orders</span>
                                </div>
                                <div className="p-4 rounded-xl border bg-emerald-500/5" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                                    <span className="text-[10px] uppercase font-bold text-emerald-400">Remaining Units</span>
                                    <p className="text-2xl font-black mt-1 text-emerald-400">
                                        {request.remainingQuantity !== undefined 
                                            ? request.remainingQuantity 
                                            : (request.status === 'CONVERTED_TO_PO' ? 0 : Math.max(0, request.quantity - (request.fulfilledQuantity || 0)))}
                                    </p>
                                    <span className="text-[10px] text-emerald-300/70">Available for future PO allocation</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span style={{ color: 'var(--text-dim)' }}>Fulfillment Progress</span>
                                    <span style={{ color: '#C8E600' }}>
                                        {Math.min(100, Math.round(((request.fulfilledQuantity || (request.status === 'CONVERTED_TO_PO' ? request.quantity : 0)) / (request.quantity || 1)) * 100))}%
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                                    <div 
                                        className="h-full bg-[#C8E600] transition-all duration-500 rounded-full"
                                        style={{ 
                                            width: `${Math.min(100, Math.round(((request.fulfilledQuantity || (request.status === 'CONVERTED_TO_PO' ? request.quantity : 0)) / (request.quantity || 1)) * 100))}%` 
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Connected POs List */}
                            {((request.linkedPOs && request.linkedPOs.length > 0) || request.linkedPO) && (
                                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[10px] uppercase font-bold block mb-3" style={{ color: 'var(--text-dim)' }}>
                                        Connected Purchase Orders
                                    </span>
                                    <div className="space-y-2">
                                        {request.linkedPOs && request.linkedPOs.length > 0 ? (
                                            request.linkedPOs.map((link, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl border bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                                            <Receipt size={14} />
                                                        </div>
                                                        <div>
                                                            <button 
                                                                onClick={() => navigate(`/purchase-orders/${link.poId}`)}
                                                                className="text-xs font-bold text-[#C8E600] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                                                            >
                                                                {link.poNumber} <ExternalLink size={10} />
                                                            </button>
                                                            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                                                                {link.allocatedAt ? formatDate(link.allocatedAt) : 'Recently allocated'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs font-black text-white">{link.allocatedQuantity} units</span>
                                                        {link.poStatus && (
                                                            <span className="block text-[9px] uppercase font-bold text-dim" style={{ color: 'var(--text-dim)' }}>
                                                                {link.poStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : request.linkedPO ? (
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                                        <Receipt size={14} />
                                                    </div>
                                                    <div>
                                                        <button 
                                                            onClick={() => navigate(`/purchase-orders/${request.linkedPO._id || request.linkedPO.id}`)}
                                                            className="text-xs font-bold text-[#C8E600] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                                                        >
                                                            {request.linkedPO.purchaseOrderNumber} <ExternalLink size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-white">{request.quantity} units</span>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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
                                    Processed on {formatDate(request.updatedAt)}
                                </p>
                            </div>
                        </div>
                    )}

                    {(request.supplier || request.supplierDetails) && (
                        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                                <Landmark size={14} /> Assigned Supplier
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                    {request.supplier?.name || request.supplierDetails?.name || '—'}
                                </p>
                                {request.supplierDetails && (
                                    <div className="mt-2 text-xs space-y-1 opacity-60" style={{ color: 'var(--text-dim)' }}>
                                        {request.supplierDetails.email && <p>Email: {request.supplierDetails.email}</p>}
                                        {request.supplierDetails.phone && <p>Phone: {request.supplierDetails.phone}</p>}
                                        {request.supplierDetails.address && <p>Address: {request.supplierDetails.address}</p>}
                                    </div>
                                )}
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
                    {request.status === 'PENDING_FINANCE_APPROVAL' && (userRole === 'financeadmin' || userRole === 'admin') && (
                        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#C8E600]">
                                <AlertCircle size={14} /> Pending Finance Approval
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Review the requested parts and cost. Once approved, the workshop can proceed with the procurement.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => openActionModal('REJECT')}
                                    disabled={actionLoading !== null || !isPricingAuditAvailable}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-500"
                                    title={!isPricingAuditAvailable ? "Pricing audit not available from merchandiser" : ""}
                                >
                                    {actionLoading === 'REJECT' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                                    Reject
                                </button>
                                <button
                                    onClick={() => openActionModal('APPROVE')}
                                    disabled={actionLoading !== null || !isPricingAuditAvailable}
                                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white disabled:opacity-30 disabled:hover:bg-green-500/10 disabled:hover:text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                    title={!isPricingAuditAvailable ? "Pricing audit not available from merchandiser" : ""}
                                >
                                    {actionLoading === 'APPROVE' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Approve Request
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PR Edit History */}
                    {request.editHistory && request.editHistory.length > 0 && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <Clock size={14} className="text-[#C8E600]" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Request History</h3>
                            </div>
                            <div className="p-5 space-y-6">
                                {request.editHistory.map((entry, idx) => (
                                    <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                        {idx !== (request.editHistory?.length || 0) - 1 && (
                                            <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                        )}
                                        <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {formatDateTime(entry.editedAt)}
                                        </p>
                                        <p className="text-sm mt-1 mb-1 font-bold" style={{ color: 'var(--text-main)' }}>
                                            {typeof entry.editedBy === 'object' 
                                                ? (entry.editedBy?.fullName || entry.editedBy?.name) 
                                                : entry.editedBy} ({entry.editorRole})
                                        </p>
                                        <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>"{entry.changesSummary}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Linked Purchase Order History */}
                    {request.linkedPO && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <Receipt size={14} className="text-[#C8E600]" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>PO History ({request.linkedPO.purchaseOrderNumber})</h3>
                                </div>
                            </div>
                            <div className="p-5 space-y-6">
                                {request.linkedPO.editHistory && request.linkedPO.editHistory.length > 0 ? (
                                    request.linkedPO.editHistory.map((entry: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                            {idx !== (request.linkedPO.editHistory?.length || 0) - 1 && (
                                                <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                            )}
                                            <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                                {formatDateTime(entry.editedAt || entry.updatedAt)}
                                            </p>
                                            <p className="text-sm mt-1 mb-1 font-bold" style={{ color: 'var(--text-main)' }}>
                                                {typeof entry.editedBy === 'object' 
                                                    ? (entry.editedBy?.fullName || entry.editedBy?.name) 
                                                    : entry.editedBy} ({entry.editorRole})
                                            </p>
                                            <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>"{entry.changesSummary || entry.changeSummary}"</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>No PO history recorded yet.</p>
                                )}
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
                                disabled={actionLoading !== null}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitAction}
                                disabled={actionLoading !== null || (actionType === 'REJECT' && !actionNote.trim())}
                                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center cursor-pointer border-none"
                                style={{
                                    background: actionType === 'REJECT' ? '#ef4444' : '#C8E600',
                                    color: actionType === 'REJECT' ? 'white' : '#0A0A0A',
                                    opacity: (actionLoading !== null || (actionType === 'REJECT' && !actionNote.trim())) ? 0.5 : 1
                                }}
                            >
                                {actionLoading !== null ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    actionType === 'REJECT' ? 'Reject' : 'Approve'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Lightbox Modal */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedPhoto}
                            alt="Enlarged Photo Proof"
                            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
                        />
                        <div className="mt-3 flex items-center gap-3">
                            <a
                                href={selectedPhoto}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-all decoration-none"
                            >
                                <ExternalLink size={14} /> Open in New Tab
                            </a>
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <X size={14} /> Close
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute -top-3 -right-3 p-2 bg-neutral-900 border border-white/20 rounded-full text-white hover:bg-neutral-800 transition-colors shadow-lg cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkshopPurchaseRequestDetail;
