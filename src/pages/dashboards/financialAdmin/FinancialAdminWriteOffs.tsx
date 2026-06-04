import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Filter,
    Calendar,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    Eye,
    Coins,
    Check,
    Loader2,
    ShieldAlert,
    X,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWriteOffs, approveWriteOff, rejectWriteOff, type WriteOff } from '../../../services/writeOffService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const FinancialAdminWriteOffs = () => {
    useTranslation();
    const [writeOffs, setWriteOffs] = useState<WriteOff[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
    const [showFilters, setShowFilters] = useState(false);

    // Modal state for Approval Review
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WriteOff | null>(null);
    const [processing, setProcessing] = useState(false);
    
    // Notes for approval/rejection
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    const [rejectionText, setRejectionText] = useState('');
    const [showApprovalForm, setShowApprovalForm] = useState(false);
    const [approvalText, setApprovalText] = useState('');

    useEffect(() => {
        loadWriteOffs();
    }, [searchTerm, statusFilter]);

    const loadWriteOffs = async () => {
        setLoading(true);
        try {
            const data = await getWriteOffs({
                search: searchTerm || undefined,
                status: statusFilter || undefined,
            });
            setWriteOffs(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Failed to load write-offs:', error);
            toast.error(error.response?.data?.message || 'Failed to load write-off requests');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (item: WriteOff) => {
        setSelectedItem(item);
        setShowRejectionForm(false);
        setShowApprovalForm(false);
        setRejectionText('');
        setApprovalText('');
        setShowReviewModal(true);
    };

    const handleConfirmApprove = async () => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            await approveWriteOff(selectedItem._id, approvalText || undefined);
            toast.success('Write-off request approved and stock adjusted');
            setShowReviewModal(false);
            loadWriteOffs();
        } catch (error: any) {
            console.error('Failed to approve write-off:', error);
            toast.error(error.response?.data?.message || 'Failed to approve write-off');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmReject = async () => {
        if (!selectedItem) return;
        if (!rejectionText.trim()) {
            toast.error('Rejection note is required');
            return;
        }
        setProcessing(true);
        try {
            await rejectWriteOff(selectedItem._id, rejectionText);
            toast.success('Write-off request rejected');
            setShowReviewModal(false);
            loadWriteOffs();
        } catch (error: any) {
            console.error('Failed to reject write-off:', error);
            toast.error(error.response?.data?.message || 'Failed to reject write-off');
        } finally {
            setProcessing(false);
        }
    };

    // Filter items based on active tab
    const displayedItems = writeOffs.filter(item => {
        if (activeTab === 'PENDING') {
            return item.status === 'PENDING';
        }
        return true;
    });

    // Stats calculations
    const approvedLossAmount = writeOffs
        .filter(item => item.status === 'APPROVED')
        .reduce((sum, item) => sum + item.amountLoss, 0);

    const pendingApprovalAmount = writeOffs
        .filter(item => item.status === 'PENDING')
        .reduce((sum, item) => sum + item.amountLoss, 0);

    const pendingCount = writeOffs.filter(item => item.status === 'PENDING').length;

    const getStatusBadge = (status: WriteOff['status']) => {
        switch (status) {
            case 'PENDING':
                return {
                    class: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
                    label: 'Pending Approval',
                    icon: <AlertCircle size={12} className="mr-1 inline" />,
                };
            case 'APPROVED':
                return {
                    class: 'bg-green-500/10 text-green-500 border border-green-500/20',
                    label: 'Approved & Deducted',
                    icon: <CheckCircle size={12} className="mr-1 inline" />,
                };
            case 'REJECTED':
                return {
                    class: 'bg-red-500/10 text-red-500 border border-red-500/20',
                    label: 'Rejected',
                    icon: <X size={12} className="mr-1 inline" />,
                };
            default:
                return {
                    class: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                    label: status,
                    icon: null,
                };
        }
    };

    const formatId = (item: WriteOff) => {
        if (item.requestNumber) return item.requestNumber;
        return `WOFF-${item._id.substring(item._id.length - 6).toUpperCase()}`;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 animate-fadeInUp">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[{ label: 'Workshop Management', path: '#' }, { label: 'Write-Offs' }]} />

            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4 pb-6 border-b border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <ShieldAlert size={32} className="text-[#D4F12E]" />
                        Inventory Write-Offs Review
                    </h1>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                        Review, audit, and authorize inventory write-off requests logged by the technical staff.
                    </p>
                </div>
            </div>

            {/* Financial Stats Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MetricStatCard
                    title="Approved Write-Off Losses"
                    value={`$${approvedLossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    description="Total value of approved inventory write-off adjustments"
                    icon={<Coins size={20} className="text-red-500" />}
                    iconBg="bg-red-500/10"
                />
                <MetricStatCard
                    title="Awaiting Authorization Value"
                    value={`$${pendingApprovalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    description={`Total proposed loss value from ${pendingCount} pending logs`}
                    icon={<AlertCircle size={20} className="text-yellow-500" />}
                    iconBg="bg-yellow-500/10"
                    highlight={pendingCount > 0}
                />
                <MetricStatCard
                    title="Pending Authorization Count"
                    value={`${pendingCount} requests`}
                    description="Write-off requests awaiting audit clearance"
                    icon={<ShieldAlert size={20} className="text-blue-500" />}
                    iconBg="bg-blue-500/10"
                />
            </div>

            {/* Search & Tabs Card */}
            <div className="rounded-3xl p-6 border shadow-sm space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Tabs */}
                <div className="flex gap-6 border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
                            activeTab === 'PENDING'
                                ? 'border-[#D4F12E] text-[var(--text-main)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                        onClick={() => setActiveTab('PENDING')}
                    >
                        Pending Clearances ({pendingCount})
                    </button>
                    <button
                        className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
                            activeTab === 'ALL'
                                ? 'border-[#D4F12E] text-[var(--text-main)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                        onClick={() => setActiveTab('ALL')}
                    >
                        All Write-Off Logs ({writeOffs.length})
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="flex gap-3 pt-2 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by Part Name, Part Number, ID, or Reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 pl-10 rounded-xl border bg-transparent text-sm outline-none font-medium"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    {activeTab === 'ALL' && (
                        <button
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                            onClick={() => setShowFilters(!showFilters)}
                            style={{ borderColor: showFilters ? '#D4F12E' : 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Filter size={16} />
                            <span className="hidden sm:inline">Filters</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {showFilters && activeTab === 'ALL' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border bg-transparent text-sm outline-none cursor-pointer appearance-none"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                                <option value="PENDING" style={{ background: 'var(--bg-card)' }}>Pending Approval</option>
                                <option value="APPROVED" style={{ background: 'var(--bg-card)' }}>Approved & Adjusted</option>
                                <option value="REJECTED" style={{ background: 'var(--bg-card)' }}>Rejected</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" style={{ color: 'var(--text-main)' }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="rounded-3xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={32} className="animate-spin text-[#D4F12E]" />
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                                <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <th className="py-4 px-4">Request ID</th>
                                    <th className="py-4 px-4">Part Details</th>
                                    <th className="py-4 px-4 text-center">Qty</th>
                                    <th className="py-4 px-4">Unit Cost</th>
                                    <th className="py-4 px-4 text-right">Total Loss</th>
                                    <th className="py-4 px-4">Reason</th>
                                    <th className="py-4 px-4">Requested By</th>
                                    <th className="py-4 px-4">Logged Date</th>
                                    <th className="py-4 px-4">Status</th>
                                    <th className="py-4 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {displayedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-20 text-sm font-bold opacity-50 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                            <ShieldAlert size={40} className="mx-auto mb-2 opacity-20" />
                                            {activeTab === 'PENDING' ? 'No write-off requests awaiting clearance.' : 'No write-off logs found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    displayedItems.map((item) => {
                                        const badge = getStatusBadge(item.status);
                                        return (
                                            <tr key={item._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                                <td className="py-4 px-4 font-mono text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {formatId(item)}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {item.part?.partName || 'Unknown Part'}
                                                    </div>
                                                    {item.part?.partNumber && (
                                                        <div className="text-[10px] font-mono opacity-50 uppercase" style={{ color: 'var(--text-muted)' }}>
                                                            {item.part.partNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 text-center font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {item.quantity} {item.part?.unit || 'pc'}
                                                </td>
                                                <td className="py-4 px-4 font-mono" style={{ color: 'var(--text-muted)' }}>
                                                    ${item.unitCost?.toFixed(2)}
                                                </td>
                                                <td className="py-4 px-4 text-right font-mono font-extrabold text-red-500">
                                                    ${item.amountLoss?.toFixed(2)}
                                                </td>
                                                <td className="py-4 px-4 max-w-[200px] truncate" style={{ color: 'var(--text-main)' }} title={item.reason}>
                                                    {item.reason}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                                        User ID: {item.requestedBy}
                                                    </div>
                                                    <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                        {item.requestedByRole || 'Staff'}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4" style={{ color: 'var(--text-muted)' }}>
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Calendar size={13} />
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${badge.class}`}>
                                                        {badge.icon}
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <button
                                                        onClick={() => handleViewDetails(item)}
                                                        className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[#D4F12E]/10 hover:border-[#D4F12E] transition-all cursor-pointer bg-transparent mx-auto group-hover:scale-105"
                                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                                                        title="Review Write-Off Request"
                                                    >
                                                        <Eye size={15} className="group-hover:text-[var(--text-main)]" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {showReviewModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <div className="rounded-3xl border w-full max-w-lg p-6 relative animate-scaleIn shadow-2xl"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {/* Close button */}
                        <button
                            onClick={() => setShowReviewModal(false)}
                            className="absolute top-4 right-4 p-1 rounded-lg border transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer bg-transparent"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-2.5 pb-4 border-b border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                            <ShieldAlert size={24} className="text-[#D4F12E]" />
                            <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                Review Write-Off Request
                            </h2>
                        </div>

                        <div className="mt-5 space-y-5">
                            {/* Grid fields */}
                            <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Request ID</div>
                                    <div className="font-mono font-bold text-sm" style={{ color: 'var(--text-main)' }}>{formatId(selectedItem)}</div>
                                </div>
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Status</div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 mt-0.5 ${getStatusBadge(selectedItem.status).class}`}>
                                        {getStatusBadge(selectedItem.status).icon}
                                        {getStatusBadge(selectedItem.status).label}
                                    </span>
                                </div>
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Part Name</div>
                                    <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{selectedItem.part?.partName || 'Unknown'}</div>
                                </div>
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Part Number</div>
                                    <div className="font-mono text-xs text-[var(--text-muted)]">{selectedItem.part?.partNumber || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Quantity Request</div>
                                    <div className="font-mono font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {selectedItem.quantity} {selectedItem.part?.unit || 'pc'}(s)
                                    </div>
                                </div>
                                <div>
                                    <div className="uppercase tracking-widest text-[9px] opacity-50 mb-0.5" style={{ color: 'var(--text-muted)' }}>Unit Cost</div>
                                    <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>${selectedItem.unitCost?.toFixed(2)}</div>
                                </div>
                                <div className="col-span-2 p-3 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-black tracking-wider text-red-500">Calculated Write-Off Loss Value</span>
                                    <span className="font-mono font-black text-lg text-red-500">${selectedItem.amountLoss?.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Reason box */}
                            <div className="p-3.5 rounded-2xl border text-xs" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="uppercase tracking-widest text-[9px] font-black mb-1" style={{ color: 'var(--text-muted)' }}>Reason for Write Off</div>
                                <p className="font-medium text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                    {selectedItem.reason}
                                </p>
                            </div>

                            {/* Documents */}
                            {selectedItem.documents && selectedItem.documents.length > 0 && (
                                <div className="p-3.5 rounded-2xl border text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="uppercase tracking-widest text-[9px] font-black mb-1" style={{ color: 'var(--text-muted)' }}>Attached Reference</div>
                                    <a
                                        href={selectedItem.documents[0]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[var(--sidebar-active)] hover:underline flex items-center gap-1.5 mt-1 font-semibold"
                                        style={{ color: 'var(--sidebar-active)' }}
                                    >
                                        <FileText size={14} />
                                        View Uploaded Reference Document / Image
                                    </a>
                                </div>
                            )}

                            {/* Audit Logging Info */}
                            <div className="text-[10px] font-medium border-t pt-3 flex flex-wrap gap-x-6 gap-y-1.5 opacity-70" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                <span>Requested By: <b>User {selectedItem.requestedBy}</b> ({selectedItem.requestedByRole})</span>
                                <span>Date: <b>{new Date(selectedItem.createdAt).toLocaleString()}</b></span>
                            </div>

                            {/* Notes displayed if APPROVED or REJECTED */}
                            {selectedItem.status === 'APPROVED' && selectedItem.approvalNote && (
                                <div className="p-3.5 rounded-2xl border border-green-500/20 bg-green-500/5 text-xs">
                                    <div className="font-black text-green-500 flex items-center gap-1 mb-1">
                                        <CheckCircle size={14} />
                                        Approval Audit Note
                                    </div>
                                    <p className="font-medium text-[var(--text-main)]" style={{ color: 'var(--text-main)' }}>{selectedItem.approvalNote}</p>
                                </div>
                            )}

                            {selectedItem.status === 'REJECTED' && selectedItem.rejectionNote && (
                                <div className="p-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs">
                                    <div className="font-black text-red-500 flex items-center gap-1 mb-1">
                                        <AlertCircle size={14} />
                                        Rejection Audit Note
                                    </div>
                                    <p className="font-medium text-[var(--text-main)]" style={{ color: 'var(--text-main)' }}>{selectedItem.rejectionNote}</p>
                                </div>
                            )}

                            {/* Rejection Form Input */}
                            {showRejectionForm && (
                                <div className="space-y-2.5 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 animate-slideIn">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-red-500">
                                        Specify Rejection Reason *
                                    </label>
                                    <textarea
                                        className="w-full p-2.5 rounded-xl border bg-transparent text-xs font-semibold outline-none resize-none"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        rows={3}
                                        placeholder="Explain to the workshop manager why this write-off is rejected..."
                                        value={rejectionText}
                                        onChange={(e) => setRejectionText(e.target.value)}
                                        required
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg border font-bold text-xs bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            onClick={() => setShowRejectionForm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg font-bold text-xs bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer flex items-center gap-1"
                                            disabled={processing || !rejectionText.trim()}
                                            onClick={handleConfirmReject}
                                        >
                                            {processing ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                            Confirm Rejection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Approval Form Input */}
                            {showApprovalForm && (
                                <div className="space-y-2.5 p-4 rounded-2xl border border-green-500/20 bg-green-500/5 animate-slideIn">
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-green-500">
                                        Approval Audit Note (Optional)
                                    </label>
                                    <textarea
                                        className="w-full p-2.5 rounded-xl border bg-transparent text-xs font-semibold outline-none resize-none"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        rows={2}
                                        placeholder="Add notes about this write-off approval (e.g. verified scrap status, authorized replacement)..."
                                        value={approvalText}
                                        onChange={(e) => setApprovalText(e.target.value)}
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg border font-bold text-xs bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            onClick={() => setShowApprovalForm(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded-lg font-bold text-xs bg-green-500 text-white hover:bg-green-600 transition-colors cursor-pointer flex items-center gap-1"
                                            disabled={processing}
                                            onClick={handleConfirmApprove}
                                        >
                                            {processing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            Confirm Approval
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                                {!showRejectionForm && !showApprovalForm && (
                                    <>
                                        <button
                                            type="button"
                                            className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            onClick={() => setShowReviewModal(false)}
                                            disabled={processing}
                                        >
                                            Close
                                        </button>
                                        {selectedItem.status === 'PENDING' && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold text-sm transition-colors cursor-pointer"
                                                    onClick={() => setShowRejectionForm(true)}
                                                    disabled={processing}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApprovalForm(true)}
                                                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#D4F12E] hover:bg-[#b8d424] text-black transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    disabled={processing}
                                                >
                                                    {processing ? (
                                                        <>
                                                            <Loader2 size={16} className="animate-spin" />
                                                            Approving...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check size={16} />
                                                            Approve Write-Off
                                                        </>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Visual Metric Card Component
const MetricStatCard = ({ title, value, description, icon, iconBg, highlight }: any) => (
    <div className="rounded-3xl p-6 border shadow-sm flex flex-col justify-between hover:-translate-y-1 duration-300 transition-all"
         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="flex justify-between items-start">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
        </div>
        <div className="mt-6">
            <div className={`text-3xl font-black leading-none tracking-tight ${highlight ? 'text-yellow-500' : ''}`} style={{ color: highlight ? undefined : 'var(--text-main)' }}>{value}</div>
            <p className="text-[11px] font-black tracking-wider uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{title}</p>
            <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
    </div>
);

export default FinancialAdminWriteOffs;
