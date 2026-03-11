import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getPurchaseOrderById,
    approveRejectPurchaseOrder,
} from '../../../services/purchaseOrderService';
import systemSettingsService from '../../../services/systemSettingsService';
import type { PurchaseOrder } from '../../../services/purchaseOrderService';
import { getDecodedToken, ROLE_LEVELS } from '../../../utils/auth';
import {
    ArrowLeft, Clock, CheckCircle, XCircle, FileText,
    User, Calendar, Landmark, UserCheck, History,
    AlertCircle, Package
} from 'lucide-react';
import ApproveRejectModal from './ApproveRejectModal';

const PurchaseOrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [po, setPo] = useState<PurchaseOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [poThreshold, setPoThreshold] = useState<number>(1000); // Default fallback

    const [userLevel, setUserLevel] = useState(0);
    const [userId, setUserId] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');

    const fetchPO = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getPurchaseOrderById(id);
            setPo(data);

            const decoded = getDecodedToken();
            if (decoded) {
                setUserId(decoded.id || '');
                const role = (decoded.role || decoded.roles || '').toLowerCase();
                setUserLevel(ROLE_LEVELS[role] || 0);
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
                rejectionReason: reason // Backend should handle this in history/status
            });
            setIsModalOpen(false);
            await fetchPO(); // Refresh data
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
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
                <button onClick={() => navigate('..')} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    Back to List
                </button>
            </div>
        );
    }

    const creatorLevel = ROLE_LEVELS[po.creatorRole.toLowerCase()] || 0;
    const canApprove =
        po.status === 'WAITING' &&
        po.createdBy !== userId &&
        userLevel > creatorLevel &&
        (po.totalAmount <= poThreshold || userLevel >= 5);

    const statusColors = {
        WAITING: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        APPROVED: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        REJECTED: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: <XCircle size={16} /> }
    };

    const s = statusColors[po.status];

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {po.purchaseOrderNumber}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                {s.icon} {po.status}
                            </div>
                            {po.isEdited && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">EDITED</span>
                            )}
                        </div>
                    </div>
                </div>

                {canApprove && (
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => openModal('REJECT')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                        >
                            <XCircle size={18} /> Reject
                        </button>
                        <button
                            onClick={() => openModal('APPROVE')}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#111' }}
                        >
                            <CheckCircle size={18} /> Approve Order
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
                                        {typeof po.supplier === 'object' ? po.supplier.name : 'N/A'}
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
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Price</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Qty</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {po.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{item.itemName}</div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{item.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                            ${(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-6 text-right font-bold" style={{ color: 'var(--text-dim)' }}>Total Amount</td>
                                    <td className="px-6 py-6 text-right text-2xl font-black text-[#C8E600]">
                                        ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Alerts & History */}
                <div className="space-y-6">
                    {/* Approval Context Alert */}
                    {po.status === 'WAITING' && (
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
                                {po.totalAmount > poThreshold
                                    ? `This order exceeds the $${poThreshold.toLocaleString()} threshold and requires a Super Admin (Level 5) to approve.`
                                    : `Requires approval from a role higher than ${po.creatorRole} (Level ${creatorLevel}+).`}
                            </p>
                            {!canApprove && po.status === 'WAITING' && (
                                <div className="text-[10px] font-bold italic opacity-60" style={{ color: 'var(--text-dim)' }}>
                                    {po.createdBy === userId ? 'You cannot approve your own order.' : 'Your role level is insufficient to approve this.'}
                                </div>
                            )}
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
                                <h3 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Edit History</h3>
                            </div>
                            <div className="p-5 space-y-6">
                                {po.editHistory.map((entry, idx) => (
                                    <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:w-2 before:h-2 before:bg-[#C8E600] before:rounded-full before:shadow-[0_0_8px_#C8E600]">
                                        {idx !== po.editHistory.length - 1 && (
                                            <div className="absolute left-[3px] top-4 w-[2px] h-[calc(100%+8px)] bg-white/10" />
                                        )}
                                        <p className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(entry.updatedAt).toLocaleDateString()} at {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-sm mt-1 mb-1 font-bold" style={{ color: 'var(--text-main)' }}>{entry.updatedBy}</p>
                                        <p className="text-xs italic" style={{ color: 'var(--text-dim)' }}>"{entry.changeSummary}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
