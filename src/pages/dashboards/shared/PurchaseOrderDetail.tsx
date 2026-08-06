import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPurchaseOrderById,
    approveRejectPurchaseOrder,
} from '../../../services/purchaseOrderService';
import systemSettingsService from '../../../services/systemSettingsService';
import type { PurchaseOrder, POStatus } from '../../../services/purchaseOrderService';
import { getDecodedToken, ROLE_LEVELS, getUserRole } from '../../../utils/auth';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, FileText,
    User, Calendar, Landmark, UserCheck, History,
    AlertCircle, Package, Receipt, Trash2, ExternalLink, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as billService from '../../../services/billService';

import ApproveRejectModal from './ApproveRejectModal';
import PurchaseBillModal from './PurchaseBillModal';
import ConvertPoToBillModal from './ConvertPoToBillModal';
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
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

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

    const handleConvertToBill = () => {
        setIsConvertModalOpen(true);
    };

    const onConvertSuccess = (billId: string) => {
        setIsConvertModalOpen(false);
        const rolePath = getRolePath();
        navigate(`/admin/${rolePath}/bills/${billId}`);
    };

    const handleDispose = async () => {
        if (!id || !window.confirm('Are you sure you want to dispose of this Purchase Order?')) return;
        setActionLoading(true);
        try {
            await billService.disposePO(id);
            await fetchPO();
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Disposal failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReceivePO = async () => {
        if (!id || !window.confirm('Are you sure you want to mark this Purchase Order as RECEIVED? This will generate draft fixed assets for eligible items.')) return;
        setActionLoading(true);
        try {
            await approveRejectPurchaseOrder(id, {
                status: 'RECEIVED'
            });
            await fetchPO();
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Action failed');
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
    const canApprove = isFinanceApproval
        ? (po.createdBy !== userId && (userRole === 'admin' || userRole === 'financeadmin'))
        : (po.status === 'WAITING' &&
            po.createdBy !== userId &&
            userLevel > creatorLevel &&
            (po.totalAmount <= poThreshold || userLevel >= 5));

    const canPay = po.status === 'APPROVED' && !po.isBilled;

    const handleCopyLink = () => {
        if (!po) return;
        const shareableUrl = `${window.location.origin}/purchase-orders/${po._id || po.id}`;
        navigator.clipboard.writeText(shareableUrl);
        toast.success('Shareable PO link copied to clipboard!');
    };

    const statusColors: Record<POStatus, { bg: string; text: string; icon: React.ReactNode }> = {
        REQUESTED: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        MANAGER_APPROVED: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        WAITING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
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
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            >
                                <XCircle size={18} /> Reject
                            </button>
                        </HasPermission>
                        <HasPermission permission="PURCHASE_ORDER_APPROVE">
                            <button
                                onClick={() => openModal('APPROVE')}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                style={{ background: '#C8E600', color: '#111' }}
                            >
                                <CheckCircle size={18} /> Approve Order
                            </button>
                        </HasPermission>
                    </div>
                )}

                {canPay && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <HasPermission permission="PURCHASE_ORDER_EDIT">
                            <button
                                onClick={handleDispose}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <Trash2 size={18} /> Dispose PO
                            </button>
                        </HasPermission>
                        <HasPermission permission="PURCHASE_ORDER_EDIT">
                            <button
                                onClick={handleReceivePO}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-[#C8E600]/30 hover:bg-[#C8E600]/10 transition-all disabled:opacity-50 text-[#C8E600]"
                            >
                                <Package size={18} /> Receive PO
                            </button>
                        </HasPermission>
                        <HasPermission permission="PURCHASE_ORDER_EDIT">
                            <button
                                onClick={handleConvertToBill}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                style={{ background: '#C8E600', color: '#111' }}
                            >
                                {actionLoading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Receipt size={18} /> Convert to Bill</>}
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
                                        {po.paymentDate ? new Date(po.paymentDate).toLocaleDateString() : 'Not Specified'}
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
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>Actioned on {new Date(po.updatedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Edit History */}
                    {po.editHistory.length > 0 && (
                        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <History size={14} className="text-[#C8E600]" />
                                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Order Edit History</h3>
                            </div>
                            <div className="p-5 space-y-6">
                                {po.editHistory.map((entry, idx) => (
                                    <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                        {idx !== po.editHistory.length - 1 && (
                                            <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                        )}
                                        <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(entry.updatedAt || entry.editedAt || '').toLocaleDateString()} at {new Date(entry.updatedAt || entry.editedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-sm mt-1 mb-1 font-bold" style={{ color: 'var(--text-main)' }}>
                                            {typeof entry.editedBy === 'object' 
                                                ? ((entry.editedBy as any)?.fullName || (entry.editedBy as any)?.name) 
                                                : (entry.editedBy || entry.updatedBy)} {entry.editorRole ? `(${entry.editorRole})` : ''}
                                        </p>
                                        <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>"{entry.changesSummary || entry.changeSummary}"</p>
                                    </div>
                                ))}
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
                                    po.linkedPR.editHistory.map((entry: any, idx: number) => (
                                        <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                            {idx !== (po.linkedPR.editHistory?.length || 0) - 1 && (
                                                <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                            )}
                                            <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                                {new Date(entry.editedAt).toLocaleDateString()} at {new Date(entry.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-sm mt-1 mb-1 font-bold" style={{ color: 'var(--text-main)' }}>
                                                {typeof entry.editedBy === 'object' 
                                                    ? (entry.editedBy?.fullName || entry.editedBy?.name) 
                                                    : entry.editedBy} ({entry.editorRole})
                                            </p>
                                            <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>"{entry.changesSummary}"</p>
                                        </div>
                                    ))
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

            <ConvertPoToBillModal
                isOpen={isConvertModalOpen}
                onClose={() => setIsConvertModalOpen(false)}
                onSuccess={onConvertSuccess}
                poId={po._id}
                poNumber={po.purchaseOrderNumber}
                items={po.items}
                initialSupplier={po.supplier}
                initialDueDate={po.paymentDate}
            />

            <ApproveRejectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleAction}
                action={modalAction}
                loading={actionLoading}
                poId={po.purchaseOrderNumber}
            />
        </div>
    );
};

export default PurchaseOrderDetail;
