import { useState, useEffect } from 'react';
import {
    DollarSign, Clock, CheckCircle, XCircle, Banknote,
    FileText, Eye, ChevronDown, ChevronUp, Calendar,
    AlertCircle, Search, Filter, RefreshCw, X, User,
    Globe, Tag, MessageSquare, Check, Ban, Loader2
} from 'lucide-react';
import {
    getPaymentRequests,
    updatePaymentRequestStatus,
    type PaymentRequest,
} from '../../../services/paymentRequestService';
import { format } from 'date-fns';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PAYMENT_REQUEST_STATUSES = ['INITIATED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID'] as const;
type PRStatus = typeof PAYMENT_REQUEST_STATUSES[number];

const STATUS_CONFIG: Record<PRStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    INITIATED: {
        label: 'Initiated',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10 border-blue-500/25',
        icon: <Clock size={12} />,
    },
    UNDER_REVIEW: {
        label: 'Under Review',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/25',
        icon: <AlertCircle size={12} />,
    },
    APPROVED: {
        label: 'Approved',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/25',
        icon: <CheckCircle size={12} />,
    },
    REJECTED: {
        label: 'Rejected',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/25',
        icon: <XCircle size={12} />,
    },
    PAID: {
        label: 'Paid',
        color: 'text-[#C8E600]',
        bgColor: 'bg-[#C8E600]/10 border-[#C8E600]/25',
        icon: <Banknote size={12} />,
    },
};

// ─── STATUS UPDATE MODAL ─────────────────────────────────────────────────────

interface StatusModalProps {
    request: PaymentRequest;
    onClose: () => void;
    onSuccess: (updated: PaymentRequest) => void;
}

const StatusUpdateModal = ({ request, onClose, onSuccess }: StatusModalProps) => {
    const [selectedStatus, setSelectedStatus] = useState<PRStatus>(request.status as PRStatus);
    const [reviewNotes, setReviewNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const allowedTransitions: Record<PRStatus, PRStatus[]> = {
        INITIATED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
        UNDER_REVIEW: ['APPROVED', 'REJECTED'],
        APPROVED: ['PAID'],
        REJECTED: [],
        PAID: [],
    };

    const nextStatuses = allowedTransitions[request.status as PRStatus] || [];
    const requiresNotes = selectedStatus === 'REJECTED' || selectedStatus === 'UNDER_REVIEW';

    const handleSubmit = async () => {
        if (requiresNotes && !reviewNotes.trim()) {
            setError('Please provide review notes for this action.');
            return;
        }
        if (selectedStatus === request.status) {
            setError('Please select a different status.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const updated = await updatePaymentRequestStatus(request._id, selectedStatus, reviewNotes);
            onSuccess(updated);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to update status. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const statusActions: Partial<Record<PRStatus, { label: string; icon: React.ReactNode; btnClass: string }>> = {
        UNDER_REVIEW: {
            label: 'Mark Under Review',
            icon: <AlertCircle size={16} />,
            btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',
        },
        APPROVED: {
            label: 'Approve Request',
            icon: <Check size={16} />,
            btnClass: 'bg-emerald-500 hover:bg-emerald-400 text-white',
        },
        REJECTED: {
            label: 'Reject Request',
            icon: <Ban size={16} />,
            btnClass: 'bg-red-500 hover:bg-red-400 text-white',
        },
        PAID: {
            label: 'Mark as Paid',
            icon: <Banknote size={16} />,
            btnClass: 'bg-[#C8E600] hover:bg-[#d4f533] text-black',
        },
    };

    const currentAction = statusActions[selectedStatus];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
            <div
                className="w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="px-7 py-5 border-b flex items-center justify-between" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                    <div>
                        <h2 className="text-base font-black" style={{ color: 'var(--text-main)' }}>Update Payment Request Status</h2>
                        <p className="text-xs mt-0.5 font-semibold text-[#C8E600]">{request.requestNumber}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                        <X size={18} style={{ color: 'var(--text-dim)' }} />
                    </button>
                </div>

                <div className="p-7 space-y-5">
                    {/* Request Summary */}
                    <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Request Summary</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[request.status as PRStatus]?.bgColor || ''} ${STATUS_CONFIG[request.status as PRStatus]?.color || ''}`}>
                                {STATUS_CONFIG[request.status as PRStatus]?.label || request.status}
                            </span>
                        </div>
                        <div className="text-xl font-black text-[#C8E600] mb-1">{request.currency} {request.amount.toLocaleString()}</div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>{request.reason}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                            <span className="flex items-center gap-1">
                                <User size={11} />
                                {typeof request.requestedBy === 'object' ? request.requestedBy?.fullName || 'Country Manager' : 'Country Manager'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                Due: {format(new Date(request.expectedPaymentDate), 'dd MMM yyyy')}
                            </span>
                        </div>
                    </div>

                    {/* Status Selection */}
                    {nextStatuses.length > 0 ? (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
                                Change Status To
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {nextStatuses.map(s => {
                                    const cfg = STATUS_CONFIG[s];
                                    const isSelected = selectedStatus === s;
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => { setSelectedStatus(s); setError(''); }}
                                            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all font-semibold text-sm
                                                ${isSelected
                                                    ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-1 ring-offset-[var(--bg-card)]`
                                                    : 'hover:bg-white/5'
                                                }`}
                                            style={{
                                                borderColor: isSelected ? undefined : 'var(--border-main)',
                                                ringColor: isSelected ? 'currentColor' : undefined,
                                            }}
                                        >
                                            <span className={cfg.color}>{cfg.icon}</span>
                                            {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl text-sm text-center" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                            This request is in a terminal state ({STATUS_CONFIG[request.status as PRStatus]?.label}). No further status changes are possible.
                        </div>
                    )}

                    {/* Review Notes */}
                    {nextStatuses.length > 0 && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                Review Notes {requiresNotes && <span className="text-red-400">*</span>}
                                {!requiresNotes && <span className="text-xs font-normal normal-case ml-1">(optional)</span>}
                            </label>
                            <div className="relative">
                                <MessageSquare size={14} className="absolute left-3 top-3 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                <textarea
                                    value={reviewNotes}
                                    onChange={e => { setReviewNotes(e.target.value); setError(''); }}
                                    rows={3}
                                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/30 transition"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                                    placeholder={
                                        selectedStatus === 'REJECTED'
                                            ? 'Explain why this request is being rejected...'
                                            : selectedStatus === 'APPROVED'
                                                ? 'Approval notes or conditions (optional)...'
                                                : 'Add any review notes...'
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm font-medium">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            onClick={onClose}
                            className="flex-1 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        {nextStatuses.length > 0 && currentAction && (
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || selectedStatus === request.status}
                                className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${currentAction.btnClass}`}
                            >
                                {submitting ? (
                                    <><Loader2 size={14} className="animate-spin" /> Updating...</>
                                ) : (
                                    <>{currentAction.icon} {currentAction.label}</>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const FinancialAdminPaymentRequests = () => {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PRStatus | ''>('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [reviewingRequest, setReviewingRequest] = useState<PaymentRequest | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await getPaymentRequests({ status: statusFilter || undefined, limit: 100 });
            setRequests(res.data || []);
        } catch (err) {
            console.error('[FinancialAdminPR] fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [statusFilter]);

    const handleStatusSuccess = (updated: PaymentRequest) => {
        setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
        setReviewingRequest(null);
    };

    const filtered = requests.filter(r => {
        const term = searchTerm.toLowerCase();
        return (
            r.reason.toLowerCase().includes(term) ||
            r.requestNumber.toLowerCase().includes(term) ||
            r.category.toLowerCase().includes(term) ||
            r.country?.toLowerCase().includes(term) ||
            (typeof r.requestedBy === 'object' && r.requestedBy?.fullName?.toLowerCase().includes(term))
        );
    });

    // Summary stats
    const stats = {
        total: requests.length,
        initiated: requests.filter(r => r.status === 'INITIATED').length,
        underReview: requests.filter(r => r.status === 'UNDER_REVIEW').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        rejected: requests.filter(r => r.status === 'REJECTED').length,
        totalAmount: requests.filter(r => ['APPROVED', 'PAID'].includes(r.status)).reduce((s, r) => s + r.amount, 0),
        pendingAmount: requests.filter(r => ['INITIATED', 'UNDER_REVIEW'].includes(r.status)).reduce((s, r) => s + r.amount, 0),
    };

    return (
        <div className="p-4 sm:p-8 min-h-full" style={{ background: 'var(--bg-main)' }}>

            {/* Status Update Modal */}
            {reviewingRequest && (
                <StatusUpdateModal
                    request={reviewingRequest}
                    onClose={() => setReviewingRequest(null)}
                    onSuccess={handleStatusSuccess}
                />
            )}

            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                    <div className="w-10 h-10 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center">
                        <DollarSign size={20} className="text-[#C8E600]" />
                    </div>
                    Payment Requests
                </h1>
                <p className="text-sm mt-1 ml-[52px]" style={{ color: 'var(--text-dim)' }}>
                    Review and process payment requests from Country Managers
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Pending Review', value: stats.initiated + stats.underReview, color: '#F59E0B', icon: <Clock size={16} /> },
                    { label: 'Approved Amount', value: `$${stats.totalAmount.toLocaleString()}`, color: '#10B981', icon: <CheckCircle size={16} /> },
                    { label: 'Pending Amount', value: `$${stats.pendingAmount.toLocaleString()}`, color: '#3B82F6', icon: <DollarSign size={16} /> },
                    { label: 'Rejected', value: stats.rejected, color: '#EF4444', icon: <XCircle size={16} /> },
                ].map(stat => (
                    <div key={stat.label} className="rounded-2xl p-4 border flex items-center gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-xl font-black" style={{ color: 'var(--text-main)' }}>{stat.value}</div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder="Search by reference, reason, country, or requester..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#C8E600]/30"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                    />
                </div>
                <div className="relative">
                    <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as PRStatus | '')}
                        className="pl-9 pr-8 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/30 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                    >
                        <option value="">All Statuses</option>
                        {PAYMENT_REQUEST_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchRequests}
                    className="p-2.5 rounded-xl border transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border-main)' }}
                    title="Refresh"
                >
                    <RefreshCw size={14} style={{ color: 'var(--text-dim)' }} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="flex justify-center items-center py-24">
                    <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                    <DollarSign size={40} className="mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-base font-bold" style={{ color: 'var(--text-dim)' }}>
                        {searchTerm || statusFilter ? 'No matching payment requests' : 'No payment requests yet'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Requests from Country Managers will appear here'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(req => {
                        const statusCfg = STATUS_CONFIG[req.status as PRStatus];
                        const isExpanded = expandedId === req._id;
                        const canAction = !['REJECTED', 'PAID'].includes(req.status);
                        const requesterName = typeof req.requestedBy === 'object'
                            ? req.requestedBy?.fullName || 'Country Manager'
                            : 'Country Manager';

                        return (
                            <div
                                key={req._id}
                                className="rounded-2xl border transition-all shadow-sm overflow-hidden"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                            >
                                {/* Row */}
                                <div className="p-5 flex items-center gap-4">
                                    {/* Status Icon */}
                                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${statusCfg.bgColor}`}>
                                        <span className={statusCfg.color}>{statusCfg.icon}</span>
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                            <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{req.requestNumber}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.bgColor} ${statusCfg.color}`}>
                                                {statusCfg.label}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                                {req.category}
                                            </span>
                                        </div>
                                        <p className="text-sm truncate" style={{ color: 'var(--text-dim)' }}>{req.reason}</p>
                                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                                            <span className="flex items-center gap-1">
                                                <User size={10} /> {requesterName}
                                            </span>
                                            {req.country && (
                                                <span className="flex items-center gap-1">
                                                    <Globe size={10} /> {req.country}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar size={10} /> Due: {format(new Date(req.expectedPaymentDate), 'dd MMM yyyy')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        <div className="text-lg font-black text-[#C8E600]">
                                            {req.currency} {req.amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {format(new Date(req.createdAt), 'dd MMM yyyy')}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {canAction && (
                                            <button
                                                onClick={() => setReviewingRequest(req)}
                                                className="px-3 py-1.5 rounded-xl bg-[#C8E600]/10 text-[#C8E600] text-xs font-bold border border-[#C8E600]/20 hover:bg-[#C8E600] hover:text-black transition-all"
                                            >
                                                Review
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : req._id)}
                                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                                        >
                                            {isExpanded
                                                ? <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} />
                                                : <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Panel */}
                                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-5 pb-5 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Request Details</p>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                            <span style={{ color: 'var(--text-dim)' }}>Amount</span>
                                                            <span className="font-black text-[#C8E600]">{req.currency} {req.amount.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                            <span style={{ color: 'var(--text-dim)' }}>Category</span>
                                                            <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-main)' }}>
                                                                <Tag size={12} /> {req.category}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                            <span style={{ color: 'var(--text-dim)' }}>Expected Date</span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                                                {format(new Date(req.expectedPaymentDate), 'EEEE, dd MMM yyyy')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                            <span style={{ color: 'var(--text-dim)' }}>Submitted</span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                                                {format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                            <span style={{ color: 'var(--text-dim)' }}>Country</span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{req.country || '—'}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between py-1.5" >
                                                            <span style={{ color: 'var(--text-dim)' }}>Requester</span>
                                                            <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{requesterName}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {req.additionalNotes && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-dim)' }}>Additional Notes</p>
                                                        <p className="text-sm leading-relaxed p-3 rounded-xl" style={{ color: 'var(--text-main)', background: 'var(--bg-input)' }}>
                                                            {req.additionalNotes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-4">
                                                {/* Supporting Document */}
                                                {req.supportingDocument && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Supporting Document</p>
                                                        <a
                                                            href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${req.supportingDocument.url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-[#C8E600]/40 transition-colors group"
                                                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                                                        >
                                                            <FileText size={16} className="text-[#C8E600] flex-shrink-0" />
                                                            <span className="text-sm font-semibold truncate flex-1 group-hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-main)' }}>
                                                                {req.supportingDocument.name}
                                                            </span>
                                                            <Eye size={14} className="flex-shrink-0 text-[#C8E600]" />
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Review Notes */}
                                                {req.reviewNotes && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Review Notes</p>
                                                        <div className={`p-3 rounded-xl border ${req.status === 'APPROVED' || req.status === 'PAID'
                                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                                            : req.status === 'REJECTED'
                                                                ? 'bg-red-500/10 border-red-500/20'
                                                                : 'bg-amber-500/10 border-amber-500/20'
                                                            }`}>
                                                            <p className="text-sm" style={{ color: 'var(--text-main)' }}>{req.reviewNotes}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Status History */}
                                                {req.statusHistory && req.statusHistory.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Status Timeline</p>
                                                        <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
                                                            {[...req.statusHistory].reverse().map((h, i) => {
                                                                const hCfg = STATUS_CONFIG[h.status as PRStatus];
                                                                return (
                                                                    <div key={i} className="flex items-start gap-3 text-xs">
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${hCfg?.bgColor || 'bg-gray-500/10 border-gray-500/20'}`}>
                                                                            <span className={hCfg?.color || 'text-gray-400'}>{hCfg?.icon}</span>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className={`font-bold ${hCfg?.color || ''}`}>{hCfg?.label || h.status}</span>
                                                                                <span style={{ color: 'var(--text-dim)' }}>{format(new Date(h.timestamp), 'dd MMM, HH:mm')}</span>
                                                                            </div>
                                                                            {h.notes && <p className="mt-0.5" style={{ color: 'var(--text-dim)' }}>{h.notes}</p>}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Review Action Button */}
                                                {canAction && (
                                                    <button
                                                        onClick={() => setReviewingRequest(req)}
                                                        className="w-full py-2.5 rounded-xl bg-[#C8E600] text-black text-sm font-black hover:bg-[#d4f533] transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Review & Update Status
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FinancialAdminPaymentRequests;
