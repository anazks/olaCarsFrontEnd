import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Search,
    Filter,
    Trash2,
    Calendar,
    User,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    Eye,
    Coins,
    Check,
    Loader2,
    Wrench,
    X,
} from 'lucide-react';
import { getScrapItems, updateScrapItem, deleteScrapItem, type ScrapItem } from '../../../services/scrapService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const FinancialAdminScraps = () => {
    const { t } = useTranslation();
    const [scrapItems, setScrapItems] = useState<ScrapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
    const [showFilters, setShowFilters] = useState(false);

    // Modal state for Approval Review
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ScrapItem | null>(null);
    const [approving, setApproving] = useState(false);
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    const [rejectionText, setRejectionText] = useState('');

    useEffect(() => {
        loadScrapItems();
    }, [searchTerm, statusFilter]);

    const loadScrapItems = async () => {
        setLoading(true);
        try {
            // Fetch all scraps
            const data = await getScrapItems({
                search: searchTerm,
                status: statusFilter || undefined,
            });
            setScrapItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load scrap items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (item: ScrapItem) => {
        setSelectedItem(item);
        setShowRejectionForm(false);
        setRejectionText('');
        setShowReviewModal(true);
    };

    const handleApproveSale = async () => {
        if (!selectedItem) return;
        setApproving(true);
        try {
            await updateScrapItem(selectedItem._id, {
                saleApproved: true,
                status: 'DISPOSED', // Mark as Disposed once approved
            });
            setShowReviewModal(false);
            loadScrapItems();
        } catch (error) {
            console.error('Failed to approve scrap sale:', error);
        } finally {
            setApproving(false);
        }
    };

    const handleRejectSale = async () => {
        if (!selectedItem || !rejectionText.trim()) return;
        setApproving(true);
        try {
            await updateScrapItem(selectedItem._id, {
                status: 'REJECTED',
                rejectionNote: rejectionText,
            });
            setShowReviewModal(false);
            setShowRejectionForm(false);
            setRejectionText('');
            loadScrapItems();
        } catch (error) {
            console.error('Failed to reject scrap sale:', error);
        } finally {
            setApproving(false);
        }
    };

    const handleDeleteScrap = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this scrap record? This action cannot be undone.')) {
            return;
        }
        try {
            await deleteScrapItem(id);
            loadScrapItems();
        } catch (error) {
            console.error('Failed to delete scrap item:', error);
        }
    };

    // Filter items based on active tab
    const displayedItems = scrapItems.filter(item => {
        if (activeTab === 'PENDING') {
            return item.status === 'PENDING_SALE_APPROVAL';
        }
        return true;
    });

    // Stats calculations
    const approvedValuableSales = scrapItems
        .filter(item => item.type === 'Valuable' && item.saleApproved)
        .reduce((sum, item) => sum + (item.currentAmount || 0), 0);

    const pendingApprovalsAmount = scrapItems
        .filter(item => item.status === 'PENDING_SALE_APPROVAL')
        .reduce((sum, item) => sum + (item.currentAmount || 0), 0);

    const pendingApprovalsCount = scrapItems.filter(item => item.status === 'PENDING_SALE_APPROVAL').length;

    const getStatusBadge = (status: ScrapItem['status'], saleApproved?: boolean) => {
        if (status === 'PENDING_SALE_APPROVAL') {
            return {
                class: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
                label: 'Pending Sale Approval',
                icon: <AlertCircle size={12} className="mr-1 inline" />,
            };
        }
        if (status === 'DISPOSED' && saleApproved) {
            return {
                class: 'bg-green-500/10 text-green-500 border border-green-500/20',
                label: 'Sold & Disposed',
                icon: <CheckCircle size={12} className="mr-1 inline" />,
            };
        }
        switch (status) {
            case 'REJECTED':
                return {
                    class: 'bg-red-500/10 text-red-500 border border-red-500/20',
                    label: 'Sale Rejected',
                    icon: <AlertCircle size={12} className="mr-1 inline" />,
                };
            case 'PENDING_DISPOSAL':
                return {
                    class: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
                    label: 'Pending Disposal',
                    icon: <AlertCircle size={12} className="mr-1 inline" />,
                };
            case 'DISPOSED':
                return {
                    class: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                    label: 'Disposed',
                    icon: <CheckCircle size={12} className="mr-1 inline" />,
                };
            case 'RECYCLED':
                return {
                    class: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
                    label: 'Recycled',
                    icon: <CheckCircle size={12} className="mr-1 inline" />,
                };
            default:
                return {
                    class: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
                    label: status,
                    icon: null,
                };
        }
    };

    const formatId = (id: string) => {
        if (!id) return '';
        if (id.startsWith('SCRAP-')) return id;
        return `SCRAP-${id.substring(id.length - 6).toUpperCase()}`;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 animate-fadeInUp">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[{ label: 'Workshop Management', path: '#' }, { label: 'Scraps' }]} />

            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4 pb-6 border-b border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Wrench size={32} className="text-[#D4F12E]" />
                        Workshop Scraps Review
                    </h1>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
                        Review, audit, and approve valuable workshop scrap sales logged by the technical staff.
                    </p>
                </div>
            </div>

            {/* Financial Stats Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MetricStatCard
                    title="Confirmed Valuable Sales"
                    value={`$${approvedValuableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    description="Revenue generated from approved scrap sales"
                    icon={<Coins size={20} className="text-green-500" />}
                    iconBg="bg-green-500/10"
                />
                <MetricStatCard
                    title="Awaiting Sale Approval"
                    value={`$${pendingApprovalsAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    description={`Total value of proposed sales from ${pendingApprovalsCount} pending logs`}
                    icon={<AlertCircle size={20} className="text-yellow-500" />}
                    iconBg="bg-yellow-500/10"
                    highlight={pendingApprovalsCount > 0}
                />
                <MetricStatCard
                    title="Pending Approval Count"
                    value={`${pendingApprovalsCount} items`}
                    description="Scrap transaction logs awaiting financial clearance"
                    icon={<Wrench size={20} className="text-blue-500" />}
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
                        Pending Approvals ({pendingApprovalsCount})
                    </button>
                    <button
                        className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-[14px] bg-transparent border-none outline-none cursor-pointer ${
                            activeTab === 'ALL'
                                ? 'border-[#D4F12E] text-[var(--text-main)]'
                                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                        onClick={() => setActiveTab('ALL')}
                    >
                        All Scraps ({scrapItems.length})
                    </button>
                </div>

                {/* Filter and Search */}
                <div className="flex gap-3 pt-2 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by Part Name, Part Number, ID, or Staff..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 pl-10 rounded-xl border bg-transparent text-sm outline-none"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            id="scrap-search"
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
                                id="filter-scrap-status"
                            >
                                <option value="" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                                <option value="PENDING_DISPOSAL" style={{ background: 'var(--bg-card)' }}>Pending Disposal</option>
                                <option value="PENDING_SALE_APPROVAL" style={{ background: 'var(--bg-card)' }}>Pending Sale Approval</option>
                                <option value="DISPOSED" style={{ background: 'var(--bg-card)' }}>Disposed</option>
                                <option value="RECYCLED" style={{ background: 'var(--bg-card)' }}>Recycled</option>
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
                                    <th className="py-4 px-4">Scrap ID</th>
                                    <th className="py-4 px-4">Part Details</th>
                                    <th className="py-4 px-4">Type</th>
                                    <th className="py-4 px-4 text-center">Qty</th>
                                    <th className="py-4 px-4">Scrapped By</th>
                                    <th className="py-4 px-4">Date</th>
                                    <th className="py-4 px-4 text-right">Sale Price</th>
                                    <th className="py-4 px-4">Buyer</th>
                                    <th className="py-4 px-4">Status</th>
                                    <th className="py-4 px-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {displayedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-20 text-sm font-bold opacity-50 uppercase tracking-widest animate-pulse" style={{ color: 'var(--text-muted)' }}>
                                            <Trash2 size={40} className="mx-auto mb-2 opacity-20" />
                                            {activeTab === 'PENDING' ? 'No scrap sales awaiting approval.' : 'No scrap items found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    displayedItems.map((item) => {
                                        const badge = getStatusBadge(item.status, item.saleApproved);
                                        return (
                                            <tr key={item._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                                <td className="py-4 px-4 font-mono text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {formatId(item._id)}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {item.partName}
                                                    </div>
                                                    {item.partNumber && (
                                                        <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                                                            {item.partNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                                        item.type === 'Valuable' ? 'bg-lime-500/10 text-lime-500' : 'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                                                    {item.quantity}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        <User size={14} />
                                                        {item.scrappedBy}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 font-bold text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(item.scrappedDate || item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-4 text-right font-bold font-mono" style={{ color: item.currentAmount ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                    {item.currentAmount ? `$${item.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-xs" style={{ color: item.buyerName ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                    {item.buyerName || '—'}
                                                </td>
                                                <td className="py-4 px-4">
                                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${badge.class}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-center flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(item)}
                                                        className="px-2.5 py-1.5 rounded-lg border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                        title="Review Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteScrap(item._id)}
                                                        className="px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer animate-fadeIn"
                                                        title="Delete Scrap"
                                                    >
                                                        <Trash2 size={16} />
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

            {/* Approval Review Modal Dialog */}
            {showReviewModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)}></div>
                    
                    {/* Content */}
                    <div className="relative max-w-lg w-full p-6 rounded-3xl border shadow-xl animate-scaleIn" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {/* Close button */}
                        <button
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer bg-transparent border-none outline-none"
                            onClick={() => setShowReviewModal(false)}
                            title="Close modal"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold mb-5 flex items-center gap-2 border-b pb-3" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                            <Coins size={22} className="text-[#D4F12E]" />
                            Review Valuable Scrap Sale
                        </h2>

                        <div className="space-y-4">
                            {/* Grid Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Scrap ID</span>
                                    <span className="font-mono font-bold text-[var(--text-main)] text-sm">{formatId(selectedItem._id)}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Current Status</span>
                                    <div>
                                        <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-black tracking-widest uppercase ${getStatusBadge(selectedItem.status, selectedItem.saleApproved).class}`}>
                                            {getStatusBadge(selectedItem.status, selectedItem.saleApproved).label}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Part Name</span>
                                    <span className="font-bold text-[var(--text-main)] text-sm">{selectedItem.partName}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Part Number</span>
                                    <span className="font-mono font-semibold text-[var(--text-main)] text-sm">{selectedItem.partNumber || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Quantity</span>
                                    <span className="font-bold text-[var(--text-main)] text-sm">{selectedItem.quantity}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Logged By</span>
                                    <span className="font-semibold text-[var(--text-main)] text-sm">{selectedItem.scrappedBy}</span>
                                </div>
                            </div>

                            {/* Description block */}
                            <div className="p-3 rounded-xl border text-xs" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <span className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Description / Scrap Reason</span>
                                <p className="font-medium" style={{ color: 'var(--text-main)' }}>{selectedItem.description || 'No description provided'}</p>
                            </div>

                            {/* Sale details details */}
                            <div className="p-4 rounded-xl border bg-yellow-500/5 border-yellow-500/20 space-y-3">
                                <h3 className="text-xs font-bold flex items-center gap-1.5 text-yellow-500 uppercase tracking-wider">
                                    <Coins size={16} />
                                    Proposed Sale Details
                                </h3>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-[var(--text-muted)] block">Proposed Buyer:</span>
                                        <strong className="text-[var(--text-main)] text-sm">{selectedItem.buyerName || 'N/A'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-[var(--text-muted)] block">Proposed Sale Amount:</span>
                                        <strong className="text-[var(--text-main)] text-sm">${selectedItem.currentAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Rejection Form Box */}
                            {showRejectionForm && (
                                <div className="p-4 rounded-xl border bg-red-500/5 border-red-500/20 space-y-3">
                                    <label className="block text-xs font-bold text-red-500 uppercase tracking-wider">
                                        Rejection Note / Reason *
                                    </label>
                                    <textarea
                                        className="w-full px-4 py-2 rounded-xl border bg-transparent text-sm outline-none resize-none"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        rows={3}
                                        placeholder="Explain to the workshop manager why this sale is rejected..."
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
                                            disabled={approving || !rejectionText.trim()}
                                            onClick={handleRejectSale}
                                        >
                                            {approving ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                                            Confirm Rejection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Actions Form */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                                {!showRejectionForm && (
                                    <>
                                        <button
                                            type="button"
                                            className="px-5 py-2.5 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            onClick={() => setShowReviewModal(false)}
                                            disabled={approving}
                                        >
                                            Close
                                        </button>
                                        {selectedItem.status === 'PENDING_SALE_APPROVAL' && (
                                            <>
                                                <button
                                                    type="button"
                                                    className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold text-sm transition-colors cursor-pointer"
                                                    onClick={() => setShowRejectionForm(true)}
                                                    disabled={approving}
                                                >
                                                    Reject Sale
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleApproveSale}
                                                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-[#D4F12E] hover:bg-[#b8d424] text-black transition-colors flex items-center gap-1.5 cursor-pointer"
                                                    disabled={approving}
                                                >
                                                    {approving ? (
                                                        <>
                                                            <Loader2 size={16} className="animate-spin" />
                                                            Confirming...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Check size={16} />
                                                            Approve Sale
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

export default FinancialAdminScraps;
