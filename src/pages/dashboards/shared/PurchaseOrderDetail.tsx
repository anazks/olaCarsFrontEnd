import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPurchaseOrderById,
    approveRejectPurchaseOrder,
    requestPOUnitRevision,
    approveRejectPOUnitRevision,
    submitRevisedPOUnits,
    submitPOQuotation,
    requestPOQuotationRevision,
    approveRejectPOQuotation,
    reviewQuotationRevisionRequest,
} from '../../../services/purchaseOrderService';
import systemSettingsService from '../../../services/systemSettingsService';
import type { PurchaseOrder, POStatus } from '../../../services/purchaseOrderService';
import { getDecodedToken, ROLE_LEVELS, getUserRole } from '../../../utils/auth';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, FileText,
    User, Calendar, Landmark, UserCheck, History,
    AlertCircle, Package, Trash2, ExternalLink, Share2,
    Edit3, Check, UploadCloud,
    RotateCcw, Link2
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as billService from '../../../services/billService';

import ApproveRejectModal from './ApproveRejectModal';
import PurchaseBillModal from './PurchaseBillModal';
import HasPermission from '../../../components/HasPermission';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const PurchaseOrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const userRole = getUserRole();
    const [actionLoading, setActionLoading] = useState(false);
    const [poThreshold, setPoThreshold] = useState<number>(1000); // Default fallback

    const [userLevel, setUserLevel] = useState(0);
    const [userId, setUserId] = useState('');
    const [associatedBillId, setAssociatedBillId] = useState<string | null>(null);

    const getRolePath = () => {
        const role = getUserRole()?.toLowerCase();
        if (role === 'admin') return 'admin';
        if (role === 'operationadmin') return 'operational-admin';
        if (role === 'financialadmin' || role === 'financeadmin') return 'financial-admin';
        if (role === 'countrymanager') return 'country-manager';
        if (role === 'branchmanager') return 'branch-manager';
        if (role === 'operationstaff') return 'branch-op-staff';
        if (role === 'financestaff') return 'branch-fin-staff';
        return 'financial-admin'; // fallback
    };

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);

    // Unit Revision States (Phase 3)
    const [isUnitRevisionModalOpen, setIsUnitRevisionModalOpen] = useState(false);
    const [unitRevisionProposedItems, setUnitRevisionProposedItems] = useState<{ itemName: string; currentQuantity: number; proposedQuantity: number; reason?: string }[]>([]);
    const [unitRevisionReason, setUnitRevisionReason] = useState('');
    const [isEditRevisedUnitsOpen, setIsEditRevisedUnitsOpen] = useState(false);
    const [revisedItemQuantities, setRevisedItemQuantities] = useState<Record<number, number>>({});

    // Quotation States (Phase 4)
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [quotationForm, setQuotationForm] = useState({
        supplierId: '',
        supplierName: '',
        quotationNumber: '',
        unitPrice: 0,
        totalAmount: 0,
        validUntil: '',
        notes: '',
        documents: [] as string[]
    });
    const [isQuotationRevisionModalOpen, setIsQuotationRevisionModalOpen] = useState(false);
    const [quotationRevisionReason, setQuotationRevisionReason] = useState('');
    const [quotationTargetPrice, setQuotationTargetPrice] = useState<number | ''>('');

    // Merchandiser Revision Authorization Modal States
    const [isMerchandiserRevModalOpen, setIsMerchandiserRevModalOpen] = useState(false);
    const [merchandiserRevDecision, setMerchandiserRevDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [merchandiserRevNote, setMerchandiserRevNote] = useState('');

    const fetchPO = useCallback(async () => {
        if (!id || id === 'create') return;
        setLoading(true);
        try {
            const data = await getPurchaseOrderById(id);
            console.log('Fetched PO data:', data);
            setPo(data);

            const decoded = getDecodedToken();
            if (decoded) {
                setUserId(decoded.id || '');
                const role = (decoded.role || decoded.roles || '').toLowerCase();
                setUserLevel(ROLE_LEVELS[role] || 0);
            }

            // Fetch associated bill if it is marked as billed
            if (data && data.isBilled) {
                try {
                    const billRes = await billService.getAllBills({ purchaseOrder: data._id });
                    if (billRes.success && billRes.data && billRes.data.length > 0) {
                        setAssociatedBillId(billRes.data[0]._id);
                    }
                } catch (billErr) {
                    console.error('Failed to fetch associated bill:', billErr);
                }
            } else {
                setAssociatedBillId(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch PO details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchThreshold = useCallback(async () => {
        try {
            const threshold = await systemSettingsService.getPOThreshold();
            setPoThreshold(threshold);
        } catch (err) {
            console.error('Failed to fetch PO threshold:', err);
        }
    }, []);

    useEffect(() => {
        fetchPO();
        fetchThreshold();
    }, [fetchPO, fetchThreshold]);

    const openModal = (action: 'APPROVE' | 'REJECT') => {
        setModalAction(action);
        setIsModalOpen(true);
    };

    const handleAction = async (reason: string) => {
        if (!id) return;
        setActionLoading(true);
        try {
            await approveRejectPurchaseOrder(id, {
                status: modalAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                rejectionNote: reason,
                rejectionReason: reason
            });
            setIsModalOpen(false);
            await fetchPO(); // Refresh data
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    // Phase 3 & 4 Handlers
    const handleAcceptUnits = async () => {
        if (!id || !window.confirm('Accept PO units as verified and advance to quotation phase?')) return;
        setActionLoading(true);
        try {
            await approveRejectPurchaseOrder(id, { status: 'WAITING_QUOTATION', notes: 'Units verified by merchandiser' });
            toast.success('Units verified. PO moved to Waiting Quotation.');
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to accept units');
        } finally {
            setActionLoading(false);
        }
    };

    const openUnitRevisionModal = () => {
        if (!po) return;
        const initialProposed = po.items.map(it => ({
            itemName: it.itemName,
            currentQuantity: it.quantity,
            proposedQuantity: it.proposedQuantity ?? it.quantity,
            reason: ''
        }));
        setUnitRevisionProposedItems(initialProposed);
        setUnitRevisionReason('');
        setIsUnitRevisionModalOpen(true);
    };

    const handleSubmitUnitRevisionRequest = async () => {
        if (!id) return;
        if (!unitRevisionReason.trim()) {
            toast.error('Please enter a revision justification for Admin/Finance.');
            return;
        }
        setActionLoading(true);
        try {
            await requestPOUnitRevision(id, {
                proposedItems: unitRevisionProposedItems,
                reason: unitRevisionReason.trim()
            });
            toast.success('Unit revision request submitted for Admin/Finance approval.');
            setIsUnitRevisionModalOpen(false);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to request unit revision');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReviewUnitRevision = async (action: 'APPROVED' | 'REJECTED') => {
        if (!id) return;
        const promptNote = window.prompt(`Enter note for unit revision ${action.toLowerCase()} (optional):`);
        if (promptNote === null) return;
        setActionLoading(true);
        try {
            await approveRejectPOUnitRevision(id, {
                status: action,
                note: promptNote
            });
            toast.success(`Unit revision ${action === 'APPROVED' ? 'approved' : 'rejected'}.`);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to review unit revision');
        } finally {
            setActionLoading(false);
        }
    };

    const openEditRevisedUnits = () => {
        if (!po) return;
        const initialQtyMap: Record<number, number> = {};
        po.items.forEach((it, idx) => {
            initialQtyMap[idx] = it.proposedQuantity ?? it.quantity;
        });
        setRevisedItemQuantities(initialQtyMap);
        setIsEditRevisedUnitsOpen(true);
    };

    const handleApplyRevisedUnits = async () => {
        if (!id || !po) return;
        setActionLoading(true);
        try {
            const updatedItems = po.items.map((it, idx) => ({
                ...it,
                quantity: revisedItemQuantities[idx] ?? it.quantity
            }));
            await submitRevisedPOUnits(id, { items: updatedItems });
            toast.success('Revised units updated and submitted for PO approval.');
            setIsEditRevisedUnitsOpen(false);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to submit revised units');
        } finally {
            setActionLoading(false);
        }
    };

    const openMerchandiserRevisionModal = (decision: 'APPROVE' | 'REJECT') => {
        setMerchandiserRevDecision(decision);
        setMerchandiserRevNote('');
        setIsMerchandiserRevModalOpen(true);
    };

    const handleSubmitMerchandiserRevisionDecision = async () => {
        if (!id) return;
        setActionLoading(true);
        try {
            await reviewQuotationRevisionRequest(id, {
                decision: merchandiserRevDecision,
                note: merchandiserRevNote.trim()
            });
            toast.success(
                merchandiserRevDecision === 'APPROVE'
                    ? 'Revision authorized. Merchandiser may edit line items.'
                    : 'Revision request denied.'
            );
            setIsMerchandiserRevModalOpen(false);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to review revision request');
        } finally {
            setActionLoading(false);
        }
    };

    const openQuotationModal = () => {
        if (!po) return;
        const initialSupplierId = typeof po.supplier === 'object' ? po.supplier._id : po.supplier;
        const initialSupplierName = typeof po.supplier === 'object' ? po.supplier.name : (po.supplierDetails?.name || '');
        setQuotationForm({
            supplierId: initialSupplierId || '',
            supplierName: initialSupplierName || '',
            quotationNumber: po.quotation?.quotationNumber || `QT-${po.purchaseOrderNumber}`,
            unitPrice: po.quotation?.unitPrice || (po.items[0]?.unitPrice || 0),
            totalAmount: po.quotation?.totalAmount || po.totalAmount,
            validUntil: po.quotation?.validUntil ? po.quotation.validUntil.split('T')[0] : '',
            notes: po.quotation?.notes || '',
            documents: po.quotation?.documents || []
        });
        setIsQuotationModalOpen(true);
    };

    const handleSubmitQuotationForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setActionLoading(true);
        try {
            await submitPOQuotation(id, {
                ...quotationForm,
                unitPrice: Number(quotationForm.unitPrice) || 0,
                totalAmount: Number(quotationForm.totalAmount) || 0
            });
            toast.success('Quotation submitted for Admin/Finance review.');
            setIsQuotationModalOpen(false);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to submit quotation');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReviewQuotation = async (action: 'APPROVED' | 'REJECTED') => {
        if (!id) return;
        const note = window.prompt(`Enter note for quotation ${action.toLowerCase()} (optional):`);
        if (note === null) return;
        setActionLoading(true);
        try {
            await approveRejectPOQuotation(id, { status: action, note });
            toast.success(`Quotation ${action === 'APPROVED' ? 'approved' : 'rejected'}.`);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to review quotation');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestQuotationRevision = async () => {
        if (!id) return;
        if (!quotationRevisionReason.trim()) {
            toast.error('Please enter the quotation revision requirements.');
            return;
        }
        setActionLoading(true);
        try {
            await requestPOQuotationRevision(id, {
                reason: quotationRevisionReason.trim(),
                targetPrice: quotationTargetPrice ? Number(quotationTargetPrice) : undefined
            });
            toast.success('Quotation revision requested.');
            setIsQuotationRevisionModalOpen(false);
            await fetchPO();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to request quotation revision');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchase Order Detail', active: true }]} />

                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading order details...</p>
            </div>
        );
    }

    if (error || !po) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-2xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>PO Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The purchase order you're looking for doesn't exist or you don't have access."}</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    Back to List
                </button>
            </div>
        );
    }

    const creatorLevel = ROLE_LEVELS[po.creatorRole.toLowerCase()] || 0;
    const isFinanceApproval = po.status === 'PENDING_FINANCE_APPROVAL';
    const isInitialWaiting = po.status === 'WAITING';
    const canApprove = isFinanceApproval
        ? (userRole === 'admin' || (po.createdBy !== userId && userRole === 'financeadmin'))
        : (isInitialWaiting && (userRole === 'admin' || (
            po.createdBy !== userId &&
            userLevel > creatorLevel &&
            (po.totalAmount <= poThreshold || userLevel >= 5))));

    const handleCopyLink = () => {
        if (!po) return;
        const shareableUrl = `${window.location.origin}/purchase-orders/${po._id || (po as any).id}`;
        navigator.clipboard.writeText(shareableUrl);
        toast.success('Shareable PO link copied to clipboard!');
    };

    const statusColors: Record<POStatus, { bg: string; text: string; icon: React.ReactNode }> = {
        REQUESTED: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        PENDING_MERCHANDISER: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', icon: <Clock size={16} /> },
        UNIT_REVISION_REQUESTED: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', icon: <Clock size={16} /> },
        UNIT_REVISION_APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        UNIT_REVISION_REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: <XCircle size={16} /> },
        PENDING_ADMIN_APPROVAL: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899', icon: <Clock size={16} /> },
        WAITING_QUOTATION: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        QUOTATION_SUBMITTED: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', icon: <Clock size={16} /> },
        QUOTATION_REVISION_REQUESTED: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', icon: <Clock size={16} /> },
        QUOTATION_APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        MANAGER_APPROVED: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        WAITING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        REVISION_REQUESTED: { bg: 'rgba(168, 85, 247, 0.1)', text: '#a855f7', icon: <Clock size={16} /> },
        REVISION_APPROVED: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', icon: <CheckCircle size={16} /> },
        PO_ISSUED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <Package size={16} /> },
        APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        IN_TRANSIT: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', icon: <Package size={16} /> },
        REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: <XCircle size={16} /> },
        DISPOSED: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <Trash2 size={16} /> },
        PENDING_FINANCE_APPROVAL: { bg: 'rgba(236, 72, 153, 0.1)', text: '#ec4899', icon: <Clock size={16} /> },
        RECEIVED: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <Package size={16} /> }
    };

    const s = statusColors[po.status] || statusColors.WAITING;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {po.purchaseOrderNumber}
                        </h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                {s.icon} {po.status}
                            </div>
                            {po.linkedPR && (
                                <button
                                    onClick={() => navigate(`/workshop-purchase-requests/${po.linkedPR._id || po.linkedPR.id}`)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C8E600]/10 text-[#C8E600] border border-[#C8E600]/30 hover:bg-[#C8E600]/20 transition-all cursor-pointer"
                                >
                                    <ExternalLink size={12} /> View {po.linkedPR.requestNumber}
                                </button>
                            )}
                            <button
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                title="Copy canonical share link"
                            >
                                <Share2 size={12} className="text-[#C8E600]" /> Copy Link
                            </button>
                            {po.isBilled && (
                                <span className="text-[10px] px-3 py-1 rounded-full bg-[#C8E600]/10 text-[#C8E600] border border-[#C8E600]/20 font-black tracking-widest uppercase">BILLED</span>
                            )}
                            {po.isEdited && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">EDITED</span>
                            )}
                        </div>
                    </div>
                </div>

                {canApprove && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <HasPermission permission="PURCHASE_ORDER_APPROVE">
                            <button
                                onClick={() => openModal('REJECT')}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <XCircle size={18} /> {isFinanceApproval ? 'Reject Proposal' : 'Reject'}
                            </button>
                        </HasPermission>
                        <HasPermission permission="PURCHASE_ORDER_APPROVE">
                            <button
                                onClick={() => openModal('APPROVE')}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                style={{ background: '#C8E600', color: '#111' }}
                            >
                                <CheckCircle size={18} /> {isFinanceApproval ? 'Approve Proposal' : 'Approve Order'}
                            </button>
                        </HasPermission>
                    </div>
                )}

                {po.isBilled && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => {
                                const rolePath = getRolePath();
                                navigate(associatedBillId ? `/admin/${rolePath}/bills/${associatedBillId}` : `/admin/${rolePath}/bills`);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            style={{ color: '#C8E600' }}
                        >
                            <ExternalLink size={18} /> View Bill
                        </button>
                    </div>
                )}

                {/* Phase 3: Merchandiser Unit Verification Actions */}
                {po.status === 'PENDING_MERCHANDISER' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={openUnitRevisionModal}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-50"
                        >
                            <Edit3 size={15} /> Request Unit Revision
                        </button>
                        <button
                            onClick={handleAcceptUnits}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Check size={16} strokeWidth={3} /> Accept Units & Proceed
                        </button>
                    </div>
                )}

                {/* Merchandiser Quotation Revision Request (Admin / Finance Admin Review) */}
                {po.status === 'REVISION_REQUESTED' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openMerchandiserRevisionModal('REJECT')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <XCircle size={15} /> Deny Revision
                        </button>
                        <button
                            onClick={() => openMerchandiserRevisionModal('APPROVE')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            style={{ background: '#6366f1', color: '#fff' }}
                        >
                            <CheckCircle size={15} strokeWidth={2.5} /> Authorize Merchandiser Revision
                        </button>
                    </div>
                )}

                {/* Phase 3: Unit Revision Review (Admin / Finance Admin) */}
                {po.status === 'UNIT_REVISION_REQUESTED' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={() => handleReviewUnitRevision('REJECTED')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                            <XCircle size={15} /> Reject Revision
                        </button>
                        <button
                            onClick={() => handleReviewUnitRevision('APPROVED')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#22c55e', color: '#000' }}
                        >
                            <CheckCircle size={15} strokeWidth={2.5} /> Approve Unit Revision
                        </button>
                    </div>
                )}

                {/* Phase 3: Revision Approved - Merchandiser updates units */}
                {po.status === 'UNIT_REVISION_APPROVED' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={openEditRevisedUnits}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Edit3 size={15} /> Edit & Submit Revised Units
                        </button>
                    </div>
                )}

                {/* Phase 3: Pending Final PO Approval after revision */}
                {po.status === 'PENDING_ADMIN_APPROVAL' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openModal('REJECT')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                            <XCircle size={15} /> Reject
                        </button>
                        <button
                            onClick={() => openModal('APPROVE')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <CheckCircle size={15} strokeWidth={2.5} /> Approve PO
                        </button>
                    </div>
                )}

                {/* Phase 4: Waiting / Revision Requested Quotation */}
                {(po.status === 'WAITING_QUOTATION' || po.status === 'QUOTATION_REVISION_REQUESTED') && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={openQuotationModal}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <UploadCloud size={16} strokeWidth={2.5} /> {po.status === 'QUOTATION_REVISION_REQUESTED' ? 'Submit Revised Quotation' : 'Submit Quotation'}
                        </button>
                    </div>
                )}

                {/* Phase 4: Quotation Submitted - Admin / Finance Review */}
                {po.status === 'QUOTATION_SUBMITTED' && (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        <button
                            onClick={() => handleReviewQuotation('REJECTED')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                            <XCircle size={14} /> Reject
                        </button>
                        <button
                            onClick={() => setIsQuotationRevisionModalOpen(true)}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-all disabled:opacity-50"
                        >
                            <RotateCcw size={14} /> Request Revision
                        </button>
                        <button
                            onClick={() => handleReviewQuotation('APPROVED')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#22c55e', color: '#000' }}
                        >
                            <CheckCircle size={15} strokeWidth={2.5} /> Approve Quotation
                        </button>
                    </div>
                )}

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Items */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card */}
                    <div className="rounded-2xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Supplier</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {typeof po.supplier === 'object' ? po.supplier.name : (po.supplierDetails?.name || 'N/A')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Created By</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {po.creatorRole} (Level {creatorLevel})
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
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Payment Date</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {po.paymentDate ? formatDate(po.paymentDate) : 'Not Specified'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Branch</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {typeof po.branch === 'object' ? po.branch.name : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Purpose</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {po.purpose || '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Merchandiser Revision Request Card */}
                    {po.revisionReason && (
                        <div className="rounded-2xl border p-6 space-y-3 animate-fadeIn mb-6 border-purple-500/30 bg-purple-500/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-2">
                                    <RotateCcw size={16} />
                                    Merchandiser Revision Request
                                </h3>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                    po.status === 'REVISION_REQUESTED' ? 'bg-purple-500/20 text-purple-300' :
                                    po.status === 'REVISION_APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {po.status === 'REVISION_REQUESTED' ? 'Pending Approval' : po.status}
                                </span>
                            </div>
                            <div className="bg-black/30 p-4 rounded-xl border border-purple-500/20 text-sm">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Reason / Justification:</p>
                                <p className="text-purple-200 italic">"{po.revisionReason}"</p>
                                {po.revisionDecisionNote && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-0.5">Admin / Finance Decision Note:</p>
                                        <p className="text-gray-300 text-xs">{po.revisionDecisionNote}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Official PO Issuance Details */}
                    {po.status === 'PO_ISSUED' && (
                        <div className="rounded-2xl border p-6 space-y-4 animate-fadeIn mb-6 border-emerald-500/30 bg-emerald-500/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                    <Package size={16} />
                                    Official Purchase Order Issued
                                </h3>
                                {po.officialPONumber && (
                                    <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-lg">
                                        {po.officialPONumber}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Delivery Date</span>
                                    <span className="text-white font-medium">{po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Payment Terms</span>
                                    <span className="text-white font-medium">{po.paymentTerms || 'Standard'}</span>
                                </div>
                                <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                    <span className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Shipping Terms</span>
                                    <span className="text-white font-medium">{po.shippingTerms || 'Standard'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Merchandiser Audit Review */}
                    {po.merchandiserTotalAmount !== undefined && po.merchandiserTotalAmount !== null && (
                        <div className="rounded-2xl border p-6 space-y-5 animate-fadeIn mb-6" style={{ background: 'rgba(200, 230, 0, 0.02)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-[#C8E600] flex items-center gap-2">
                                <FileText size={16} />
                                Merchandiser Audit Review
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div>
                                    <span className="text-[10px] text-muted block uppercase font-bold mb-1" style={{ color: 'var(--text-dim)' }}>Original Amount</span>
                                    <span className="text-lg font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                        ${(po.status === 'APPROVED' && po.originalTotalAmount !== undefined && po.originalTotalAmount !== null ? po.originalTotalAmount : (po.totalAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] block uppercase font-bold mb-1" style={{ color: '#C8E600' }}>Proposed Merchandiser Amount</span>
                                    <span className="text-xl font-black text-[#C8E600]">
                                        ${(po.status === 'APPROVED' ? (po.totalAmount ?? 0) : (po.merchandiserTotalAmount ?? po.totalAmount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {po.documents && po.documents.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-[10px] block uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Supporting Documents</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {po.documents.map((doc, idx) => {
                                            const docLabels = ['Supplier Quotation', 'Commercial Invoice', 'Compliance Certificate'];
                                            const docUrl = doc.startsWith('http') ? doc : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/['"]/g, '').replace(/\/$/, '')}${doc}`;
                                            const getDocName = (path: string) => {
                                                const filePart = path.split('/').pop() || '';
                                                const underscoreIdx = filePart.indexOf('_');
                                                if (underscoreIdx !== -1 && underscoreIdx < 15) {
                                                    return filePart.substring(underscoreIdx + 1);
                                                }
                                                return filePart;
                                            };
                                            return (
                                                <a
                                                    key={idx}
                                                    href={docUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-white/5 hover:bg-[#C8E600]/10 border border-white/10 hover:border-[#C8E600] rounded-xl flex items-center gap-2.5 transition-all text-xs font-semibold text-main cursor-pointer"
                                                    style={{ color: 'var(--text-main)' }}
                                                    title={`Open ${docLabels[idx] || `Document ${idx + 1}`}`}
                                                >
                                                    <FileText size={16} className="text-[#C8E600]" />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="block text-[9px] text-muted text-dim" style={{ color: 'var(--text-dim)' }}>{docLabels[idx] || `Document ${idx + 1}`}</span>
                                                        <span className="block truncate text-xs font-mono">{getDocName(doc)}</span>
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Connected Purchase Requisitions (M:N Allocation Links) */}
                    {po.linkedPRs && po.linkedPRs.length > 0 && (
                        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                                    <Link2 size={16} />
                                    <span>Connected Requisitions ({po.linkedPRs.length})</span>
                                </div>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    M:N PR Allocation
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {po.linkedPRs.map((link, idx) => (
                                    <div key={idx} className="p-3.5 rounded-xl border flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                        style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-purple-400">#{link.prNumber}</span>
                                                <button
                                                    onClick={() => navigate(`/workshop-purchase-requests/${link.prId}`)}
                                                    className="p-1 rounded hover:bg-white/10 text-[#C8E600] transition-colors"
                                                    title="View requisition"
                                                >
                                                    <ExternalLink size={12} />
                                                </button>
                                            </div>
                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                                Allocated: <strong className="text-main">{link.allocatedQuantity} units</strong>
                                                {link.originalPRQuantity ? ` of ${link.originalPRQuantity} total` : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-black text-[#C8E600]">
                                                {link.allocatedQuantity} units
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unit Revision Request Status Card */}
                    {po.unitRevisionRequest && (
                        <div className="rounded-2xl border p-5 space-y-4" style={{
                            background: po.unitRevisionRequest.status === 'APPROVED' ? 'rgba(34,197,94,0.03)' : po.unitRevisionRequest.status === 'REJECTED' ? 'rgba(239,68,68,0.03)' : 'rgba(249,115,22,0.03)',
                            borderColor: po.unitRevisionRequest.status === 'APPROVED' ? 'rgba(34,197,94,0.2)' : po.unitRevisionRequest.status === 'REJECTED' ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)'
                        }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400">
                                    <Edit3 size={15} />
                                    <span>Unit Revision Request</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    po.unitRevisionRequest.status === 'APPROVED'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : po.unitRevisionRequest.status === 'REJECTED'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                }`}>
                                    {po.unitRevisionRequest.status}
                                </span>
                            </div>

                            <div className="text-xs space-y-1">
                                <p style={{ color: 'var(--text-dim)' }}>
                                    Justification: <strong className="italic text-main">"{po.unitRevisionRequest.reason}"</strong>
                                </p>
                                {po.unitRevisionRequest.reviewNote && (
                                    <p className="text-emerald-400">
                                        Review Note: <strong className="italic">"{po.unitRevisionRequest.reviewNote}"</strong>
                                    </p>
                                )}
                            </div>

                            {/* Comparison Table */}
                            {po.unitRevisionRequest.proposedItems && po.unitRevisionRequest.proposedItems.length > 0 && (
                                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-main)' }}>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b bg-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                                                <th className="py-2.5 px-3 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Item</th>
                                                <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Current Qty</th>
                                                <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider text-orange-400">Proposed Qty</th>
                                                <th className="py-2.5 px-3 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Difference</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                            {po.unitRevisionRequest.proposedItems.map((pItem, idx) => {
                                                const diff = pItem.proposedQuantity - pItem.currentQuantity;
                                                return (
                                                    <tr key={idx}>
                                                        <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--text-main)' }}>{pItem.itemName}</td>
                                                        <td className="py-2.5 px-3 text-center" style={{ color: 'var(--text-dim)' }}>{pItem.currentQuantity}</td>
                                                        <td className="py-2.5 px-3 text-center font-bold text-orange-400">{pItem.proposedQuantity}</td>
                                                        <td className="py-2.5 px-3 text-center font-bold">
                                                            <span className={diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-gray-400'}>
                                                                {diff > 0 ? `+${diff}` : diff}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quotation Pipeline Card */}
                    {po.quotation && (
                        <div className="rounded-2xl border p-5 space-y-4" style={{
                            background: po.quotation.status === 'APPROVED' ? 'rgba(34,197,94,0.03)' : po.quotation.status === 'REVISION_REQUESTED' ? 'rgba(249,115,22,0.03)' : 'rgba(99,102,241,0.03)',
                            borderColor: po.quotation.status === 'APPROVED' ? 'rgba(34,197,94,0.2)' : po.quotation.status === 'REVISION_REQUESTED' ? 'rgba(249,115,22,0.2)' : 'rgba(99,102,241,0.2)'
                        }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                                    <FileText size={16} />
                                    <span>Supplier Quotation</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    po.quotation.status === 'APPROVED'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : po.quotation.status === 'REVISION_REQUESTED'
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {po.quotation.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <span className="text-[10px] block uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Supplier</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{po.quotation.supplierName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] block uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Quote #</span>
                                    <span className="text-xs font-mono font-bold text-indigo-400">{po.quotation.quotationNumber || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] block uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Unit Price</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>${Number(po.quotation.unitPrice || 0).toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] block uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Total Amount</span>
                                    <span className="text-sm font-black text-[#C8E600]">${Number(po.quotation.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {po.quotation.revisionReason && (
                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs">
                                    <span className="font-bold text-orange-400 uppercase tracking-wider block text-[10px] mb-1">Revision Requirements:</span>
                                    <span className="italic text-orange-200">"{po.quotation.revisionReason}"</span>
                                </div>
                            )}

                            {po.quotation.notes && (
                                <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>
                                    Notes: "{po.quotation.notes}"
                                </p>
                            )}
                        </div>
                    )}

                    {/* Items Table */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileText size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Order Items</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Item</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Original Price</th>
                                    {po.merchandiserTotalAmount !== undefined && po.merchandiserTotalAmount !== null && (
                                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-[#C8E600]" style={{ color: '#C8E600' }}>Proposed Price</th>
                                    )}
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Qty</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {po.items.map((item, i) => {
                                    const hasProposed = po.merchandiserTotalAmount !== undefined && po.merchandiserTotalAmount !== null;
                                    const proposedPrice = item.merchandiserPrice !== undefined && item.merchandiserPrice !== null ? item.merchandiserPrice : item.unitPrice;
                                    const priceToShow = (po.status === 'APPROVED' || !hasProposed) ? item.unitPrice : proposedPrice;
                                    return (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{item.itemName}</div>
                                                <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.description}</div>
                                                {item.images && item.images.length > 0 && (
                                                    <div className="flex gap-2 mt-3">
                                                        {item.images.map((img, imgIdx) => {
                                                            const resolveImageUrl = (url: string | File) => {
                                                                if (url instanceof File) return URL.createObjectURL(url);
                                                                if (typeof url === 'string') {
                                                                    if (url.startsWith('http')) return url;
                                                                    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
                                                                    const s3Base = (import.meta.env.VITE_S3_BASE_URL || '').replace(/['"]/g, '').replace(/\/$/, '');
                                                                    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/['"]/g, '').replace(/\/$/, '');
                                                                    const base = s3Base || apiBase;
                                                                    return `${base}/${cleanPath}`;
                                                                }
                                                                return url;
                                                            };
                                                            const resolvedUrl = resolveImageUrl(img);
                                                            return (
                                                                <div key={imgIdx} className="relative group cursor-pointer">
                                                                    <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                                                                        <img
                                                                            src={resolvedUrl}
                                                                            alt={`Item image ${imgIdx + 1}`}
                                                                            className="w-12 h-12 object-cover rounded-lg border transition-all group-hover:scale-110"
                                                                            style={{ borderColor: 'var(--border-main)' }}
                                                                        />
                                                                    </a>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>${item.unitPrice.toFixed(2)}</td>
                                            {hasProposed && (
                                                <td className="px-6 py-4 text-sm font-bold text-[#C8E600]" style={{ color: '#C8E600' }}>
                                                    {item.merchandiserPrice !== undefined && item.merchandiserPrice !== null ? `$${item.merchandiserPrice.toFixed(2)}` : '—'}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{item.quantity}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                                ${(priceToShow * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-white/5">
                                    <td colSpan={po.merchandiserTotalAmount !== undefined && po.merchandiserTotalAmount !== null ? 4 : 3} className="px-6 py-6 text-right font-bold" style={{ color: 'var(--text-dim)' }}>Total Amount</td>
                                    <td className="px-6 py-6 text-right text-2xl font-black text-[#C8E600]">
                                        ${(po.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Alerts & History */}
                <div className="space-y-6">
                    {/* Approval Context Alert */}
                    {(po.status === 'WAITING' || po.status === 'PENDING_FINANCE_APPROVAL') && (
                        <div className="p-5 rounded-2xl border flex flex-col gap-3"
                            style={{
                                background: po.totalAmount > 1000 ? 'rgba(245,158,11,0.05)' : 'rgba(200,230,0,0.05)',
                                borderColor: po.totalAmount > 1000 ? 'rgba(245,158,11,0.2)' : 'rgba(200,230,0,0.2)'
                            }}>
                            <div className="flex items-center gap-2 font-bold text-xs uppercase" style={{ color: po.totalAmount > 1000 ? '#f59e0b' : '#C8E600' }}>
                                <AlertCircle size={14} />
                                {po.totalAmount > 1000 ? 'Admin Approval Required' : 'Approval Information'}
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                {isFinanceApproval
                                    ? 'Requires Admin or Financial Admin approval for the proposed merchandiser amount.'
                                    : po.totalAmount > poThreshold
                                        ? `This order exceeds the $${(poThreshold ?? 0).toLocaleString()} threshold and requires a Super Admin (Level 5) to approve.`
                                        : `Requires approval from a role higher than ${po.creatorRole} (Level ${creatorLevel}+).`}
                            </p>
                            {!canApprove && (po.status === 'WAITING' || po.status === 'PENDING_FINANCE_APPROVAL') && (
                                <div className="text-[10px] font-bold italic opacity-60" style={{ color: 'var(--text-dim)' }}>
                                    {po.createdBy === userId
                                        ? 'You cannot approve your own order.'
                                        : isFinanceApproval
                                            ? 'Only Admin and Financial Admin roles are allowed to approve or reject audited amounts.'
                                            : 'Your role level is insufficient to approve this.'}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rejection Note Alert */}
                    {po.status === 'REJECTED' && po.rejectionNote && (
                        <div className="rounded-2xl border p-5 space-y-3 bg-red-500/5 border-red-500/20 animate-fadeIn">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-500">
                                <AlertCircle size={14} /> Rejection Note
                            </div>
                            <p className="text-sm italic text-main font-mono" style={{ color: 'var(--text-main)' }}>
                                "{po.rejectionNote}"
                            </p>
                        </div>
                    )}

                    {/* Approver Info (If actioned) */}
                    {po.approvedBy && (
                        <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                                <UserCheck size={14} /> Processed By
                            </div>
                            <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{po.approverRole}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Actioned on {formatDate(po.updatedAt)}</p>
                            </div>
                        </div>
                    )}

                    {/* PO History & Audit Log */}
                    {po.editHistory.length > 0 && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <History size={16} className="text-[#C8E600]" />
                                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>PO History & Audit Log</h3>
                                </div>
                                <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--text-dim)' }}>
                                    {po.editHistory.length} event{po.editHistory.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="p-5 space-y-6">
                                {po.editHistory.map((entry, idx) => {
                                    const isObjectId = (val: any) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
                                    const objName = typeof entry.editedBy === 'object' && entry.editedBy !== null
                                        ? ((entry.editedBy as any).fullName || (entry.editedBy as any).name)
                                        : null;
                                    const stringName = typeof entry.editedBy === 'string' && !isObjectId(entry.editedBy)
                                        ? entry.editedBy
                                        : null;
                                    const resolvedName = objName || stringName || (entry as any).editorName || (entry.editorRole ? entry.editorRole.replace(/_/g, ' ') : 'System User');
                                    const formattedRole = (entry.editorRole || '').replace(/_/g, ' ');

                                    return (
                                        <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2.5 before:h-2.5 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                            {idx !== po.editHistory.length - 1 && (
                                                <div className="absolute left-[4px] top-4 w-[2px] h-[calc(100%+16px)] bg-white/10" />
                                            )}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-[10px] font-bold tracking-wider font-mono" style={{ color: 'var(--text-dim)' }}>
                                                    {formatDateTime(entry.updatedAt || entry.editedAt)}
                                                </p>
                                                {(entry as any).action && (
                                                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#C8E600]">
                                                        {(entry as any).action.replace(/_/g, ' ')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {resolvedName}
                                                </span>
                                                {formattedRole && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                                        {formattedRole}
                                                    </span>
                                                )}
                                            </div>
                                            {(entry.changesSummary || (entry as any).changeSummary) && (
                                                <p className="text-xs italic mt-1 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                                    &ldquo;{entry.changesSummary || (entry as any).changeSummary}&rdquo;
                                                </p>
                                            )}
                                            {(entry as any).notes && (entry as any).notes !== (entry.changesSummary || (entry as any).changeSummary) && (
                                                <p className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-1.5 italic font-mono">
                                                    &ldquo;{(entry as any).notes}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Linked Purchase Request History */}
                    {po.linkedPR && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-[#C8E600]" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>PR History ({po.linkedPR.requestNumber})</h3>
                                </div>
                            </div>
                            <div className="p-5 space-y-6">
                                {po.linkedPR.editHistory && po.linkedPR.editHistory.length > 0 ? (
                                    po.linkedPR.editHistory.map((entry: any, idx: number) => {
                                        const isObjectId = (val: any) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);
                                        const prObjName = typeof entry.editedBy === 'object' && entry.editedBy !== null
                                            ? (entry.editedBy.fullName || entry.editedBy.name)
                                            : null;
                                        const prStringName = typeof entry.editedBy === 'string' && !isObjectId(entry.editedBy)
                                            ? entry.editedBy
                                            : null;
                                        const prResolvedName = prObjName || prStringName || entry.editorName || (entry.editorRole ? entry.editorRole.replace(/_/g, ' ') : 'Workshop User');
                                        const prFormattedRole = (entry.editorRole || '').replace(/_/g, ' ');

                                        return (
                                            <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2.5 before:h-2.5 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                                {idx !== (po.linkedPR.editHistory?.length || 0) - 1 && (
                                                    <div className="absolute left-[4px] top-4 w-[2px] h-[calc(100%+16px)] bg-white/10" />
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-bold tracking-wider font-mono" style={{ color: 'var(--text-dim)' }}>
                                                        {formatDateTime(entry.editedAt)}
                                                    </p>
                                                    {entry.action && (
                                                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#C8E600]">
                                                            {entry.action.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {prResolvedName}
                                                    </span>
                                                    {prFormattedRole && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                                            {prFormattedRole}
                                                        </span>
                                                    )}
                                                </div>
                                                {entry.changesSummary && (
                                                    <p className="text-xs italic mt-1 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                                        &ldquo;{entry.changesSummary}&rdquo;
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>No PR history recorded yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <PurchaseBillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                onSuccess={fetchPO}
                poId={po._id}
                poNumber={po.purchaseOrderNumber}
                totalAmount={po.totalAmount}
            />

            <ApproveRejectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAction}
                action={modalAction}
                loading={actionLoading}
                poId={po.purchaseOrderNumber}
            />

            {/* Merchandiser Revision Decision Modal (Authorization Note / Denial Note) */}
            {isMerchandiserRevModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${merchandiserRevDecision === 'APPROVE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                    {merchandiserRevDecision === 'APPROVE' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                                        {merchandiserRevDecision === 'APPROVE' ? 'Authorize Merchandiser Revision' : 'Deny Revision Request'}
                                    </h3>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                        Quotation: <span className="font-mono font-bold text-white">{po.purchaseOrderNumber}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMerchandiserRevModalOpen(false)}
                                className="p-1.5 rounded-lg border hover:bg-white/5 transition-all cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Merchandiser's Revision Request Reason context */}
                        {po.revisionReason && (
                            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                                <span className="text-[10px] uppercase font-bold text-purple-400 block tracking-wider">
                                    Reason from Merchandiser:
                                </span>
                                <p className="text-purple-200 italic font-medium">"{po.revisionReason}"</p>
                            </div>
                        )}

                        {/* Note Input */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                {merchandiserRevDecision === 'APPROVE' ? 'Optional authorization note for Merchandiser:' : 'Reason for denying revision (optional):'}
                            </label>
                            <textarea
                                rows={4}
                                value={merchandiserRevNote}
                                onChange={(e) => setMerchandiserRevNote(e.target.value)}
                                placeholder={
                                    merchandiserRevDecision === 'APPROVE'
                                        ? 'e.g. Authorized to renegotiate part prices and unit allocations as requested...'
                                        : 'e.g. Current quotation pricing has already been locked by procurement...'
                                }
                                className="w-full p-3.5 rounded-xl text-xs outline-none border focus:border-indigo-500 resize-none font-medium"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsMerchandiserRevModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold border hover:bg-white/5 cursor-pointer transition-all"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitMerchandiserRevisionDecision}
                                disabled={actionLoading}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg flex items-center gap-2 ${
                                    merchandiserRevDecision === 'APPROVE'
                                        ? 'bg-[#6366f1] hover:bg-[#5254db] text-white'
                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                }`}
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                                    merchandiserRevDecision === 'APPROVE' ? <CheckCircle size={15} /> : <XCircle size={15} />
                                )}
                                {merchandiserRevDecision === 'APPROVE' ? 'Authorize Revision' : 'Deny Revision'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 1: Merchandiser Unit Revision Request */}
            {isUnitRevisionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-xl rounded-2xl border p-6 space-y-5 shadow-2xl relative"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <Edit3 size={18} className="text-orange-400" />
                                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Request Unit Revision</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsUnitRevisionModalOpen(false)}
                                className="p-1.5 rounded-lg border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <XCircle size={16} />
                            </button>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            Propose updated unit quantities for this purchase order. This will be sent to Admin / Finance Admin for approval.
                        </p>

                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            {unitRevisionProposedItems.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl border flex items-center justify-between gap-4"
                                    style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{item.itemName}</div>
                                        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Current: {item.currentQuantity} units</div>
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <label className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Proposed Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={item.proposedQuantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setUnitRevisionProposedItems(prev => {
                                                    const next = [...prev];
                                                    next[idx] = { ...next[idx], proposedQuantity: val };
                                                    return next;
                                                });
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-orange-500"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                Justification Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={unitRevisionReason}
                                onChange={(e) => setUnitRevisionReason(e.target.value)}
                                placeholder="Explain why unit quantities need adjustment..."
                                className="w-full p-3 rounded-xl text-xs outline-none border focus:border-orange-500 resize-none font-medium"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsUnitRevisionModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitUnitRevisionRequest}
                                disabled={actionLoading || !unitRevisionReason.trim()}
                                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40"
                                style={{ background: '#f97316', color: '#fff' }}
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 2: Edit Revised Units (After Revision Approval) */}
            {isEditRevisedUnitsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl relative"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-[#C8E600]" />
                                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Apply Approved Unit Quantities</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditRevisedUnitsOpen(false)}
                                className="p-1.5 rounded-lg border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <XCircle size={16} />
                            </button>
                        </div>

                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            The revision was approved. Confirm or adjust the final unit quantities to submit for PO approval:
                        </p>

                        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                            {po.items.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl border flex items-center justify-between gap-4"
                                    style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{item.itemName}</div>
                                        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>UnitPrice: ${item.unitPrice.toFixed(2)}</div>
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <label className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Final Quantity</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={revisedItemQuantities[idx] ?? item.quantity}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setRevisedItemQuantities(prev => ({ ...prev, [idx]: val }));
                                            }}
                                            className="w-full px-3 py-1.5 rounded-lg text-xs font-bold outline-none border focus:border-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsEditRevisedUnitsOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApplyRevisedUnits}
                                disabled={actionLoading}
                                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                Submit Revised PO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal 3: Quotation Submission Form */}
            {isQuotationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <form onSubmit={handleSubmitQuotationForm} className="w-full max-w-xl rounded-2xl border p-6 space-y-5 shadow-2xl relative"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <UploadCloud size={18} className="text-[#C8E600]" />
                                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Submit Supplier Quotation</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuotationModalOpen(false)}
                                className="p-1.5 rounded-lg border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <XCircle size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Supplier Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    value={quotationForm.supplierName}
                                    onChange={(e) => setQuotationForm(prev => ({ ...prev, supplierName: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border focus:border-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Quotation Reference #</label>
                                <input
                                    value={quotationForm.quotationNumber}
                                    onChange={(e) => setQuotationForm(prev => ({ ...prev, quotationNumber: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold outline-none border focus:border-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Quoted Unit Price ($) <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={quotationForm.unitPrice}
                                    onChange={(e) => {
                                        const p = parseFloat(e.target.value) || 0;
                                        const totalUnits = po.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                                        setQuotationForm(prev => ({ ...prev, unitPrice: p, totalAmount: p * (totalUnits || 1) }));
                                    }}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border focus:border-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Total Quoted Amount ($) <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={quotationForm.totalAmount}
                                    onChange={(e) => setQuotationForm(prev => ({ ...prev, totalAmount: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-black text-[#C8E600] outline-none border focus:border-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Valid Until Date</label>
                                <input
                                    type="date"
                                    value={quotationForm.validUntil}
                                    onChange={(e) => setQuotationForm(prev => ({ ...prev, validUntil: e.target.value }))}
                                    className="w-full px-3.5 py-2 rounded-xl text-xs font-bold outline-none border focus:border-lime"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Quotation Notes</label>
                                <textarea
                                    rows={2}
                                    value={quotationForm.notes}
                                    onChange={(e) => setQuotationForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Payment terms, delivery timeline, warranty info..."
                                    className="w-full p-3 rounded-xl text-xs outline-none border focus:border-lime resize-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsQuotationModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                Submit Quotation
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal 4: Request Quotation Revision - Full Screen from Top */}
            {isQuotationRevisionModalOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full h-full flex flex-col overflow-y-auto" style={{ background: 'var(--bg-main, #0B0E14)' }}>
                        {/* Top Header Bar */}
                        <div 
                            className="sticky top-0 z-20 px-6 sm:px-10 py-5 border-b flex items-center justify-between"
                            style={{ background: 'var(--bg-card, #141722)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                                    <RotateCcw size={22} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Request Quotation Revision</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                        Purchase Order: <span className="font-mono text-orange-300 font-bold">{po.purchaseOrderNumber}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuotationRevisionModalOpen(false)}
                                className="p-2 rounded-xl border hover:bg-white/5 transition-all cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        {/* Full Screen Scrollable Content */}
                        <div className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-10 space-y-6">
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs flex items-start gap-3">
                                <RotateCcw size={18} className="text-orange-400 mt-0.5 shrink-0" />
                                <div className="space-y-1">
                                    <p className="font-bold text-sm text-orange-300">Quotation Revision Requirements</p>
                                    <p className="text-orange-200/80 leading-relaxed">
                                        Send required adjustments, target pricing, or supplier conditions back to the merchandiser.
                                        The quotation will move back to revision status so revised quotations can be submitted.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl border space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Revision Requirements & Reason <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={quotationRevisionReason}
                                        onChange={(e) => setQuotationRevisionReason(e.target.value)}
                                        placeholder="Specify pricing target, required delivery terms, or supplier discounts needed..."
                                        className="w-full p-4 rounded-xl text-sm outline-none border focus:border-orange-500 resize-y font-medium"
                                        style={{ minHeight: '160px', background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-wider block" style={{ color: 'var(--text-dim)' }}>
                                        Target Price ($) (Optional)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={quotationTargetPrice}
                                        onChange={(e) => setQuotationTargetPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="e.g. 850.00"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none border focus:border-orange-500"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sticky Bottom Actions Bar */}
                        <div 
                            className="sticky bottom-0 z-20 px-6 sm:px-10 py-4 border-t flex items-center justify-end gap-3"
                            style={{ background: 'var(--bg-card, #141722)', borderColor: 'var(--border-main)' }}
                        >
                            <button
                                type="button"
                                onClick={() => setIsQuotationRevisionModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold border hover:bg-white/5 transition-all cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRequestQuotationRevision}
                                disabled={actionLoading || !quotationRevisionReason.trim()}
                                className="px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer shadow-lg"
                                style={{ background: '#f97316', color: '#fff' }}
                            >
                                Send Revision Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderDetail;
