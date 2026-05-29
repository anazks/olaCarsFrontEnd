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
        }
    };
    const style = styles[status] || styles.APPROVED;
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider w-fit"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {style.icon}
            {status === 'CONVERTED_TO_PO' ? 'CONVERTED' : status}
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

    const totalCost = (request.quantity || 0) * (request.part?.unitCost || 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchase Requests', path: '..' }, { label: request.requestNumber, active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600] cursor-pointer">
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details Card */}
                <div className="lg:col-span-2 space-y-6">
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
                                        ${(request.part?.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{request.quantity}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                                <tr className="bg-white/5">
                                    <td colSpan={3} className="px-6 py-6 text-right font-bold" style={{ color: 'var(--text-dim)' }}>Total Cost Estimate</td>
                                    <td className="px-6 py-6 text-right text-2xl font-black text-[#C8E600]">
                                        ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
        </div>
    );
};

export default WorkshopPurchaseRequestDetail;
