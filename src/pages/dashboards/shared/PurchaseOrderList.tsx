import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Search, FileText, AlertTriangle, Eye, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { getAllPurchaseOrders, approveRejectPurchaseOrder } from '../../../services/purchaseOrderService';
import { getDecodedToken } from '../../../utils/auth';
import type { PurchaseOrder, POStatus, PaginationMetadata, PurchaseOrderFilters } from '../../../services/purchaseOrderService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { useNavigate } from 'react-router-dom';
import HasPermission from '../../../components/HasPermission';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const StatusBadge = ({ status }: { status: POStatus }) => {
    const { t } = useTranslation();
    const styles = {
        REQUESTED: {
            bg: 'rgba(59, 130, 246, 0.1)',
            text: '#3b82f6',
            border: 'rgba(59, 130, 246, 0.3)',
            icon: <Clock size={12} />
        },
        MANAGER_APPROVED: {
            bg: 'rgba(139, 92, 246, 0.1)',
            text: '#8b5cf6',
            border: 'rgba(139, 92, 246, 0.3)',
            icon: <CheckCircle size={12} />
        },
        WAITING: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={12} />
        },
        APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
            icon: <CheckCircle size={12} />
        },
        REJECTED: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
            icon: <XCircle size={12} />
        },
        DISPOSED: {
            bg: 'rgba(100, 116, 139, 0.1)',
            text: '#64748b',
            border: 'rgba(100, 116, 139, 0.3)',
            icon: <Trash2 size={12} />
        }
    };

    const style = styles[status];

    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {style.icon}
            {t(`management.common.status.${status.toLowerCase()}`, { defaultValue: status })}
        </div>
    );
};

const FilterLabel = ({ label }: { label: string }) => (
    <label className="block text-[10px] uppercase font-black tracking-widest mb-1.5 ml-1" style={{ color: 'var(--text-dim)' }}>
        {label}
    </label>
);

const PurchaseOrderList = () => {
    const { t } = useTranslation();
    // Data State
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    
    // Status State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    
    // Pagination State
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(5); // Increased default limit from 2 for better UX, but keeping it small if requested
    
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<POStatus | 'ALL'>('ALL');
    const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
    const [branchFilter, setBranchFilter] = useState<string>('ALL');
    const [isUsedFilter, setIsUsedFilter] = useState<'ALL' | 'TRUE' | 'FALSE'>('ALL');
    const [isBilledFilter, setIsBilledFilter] = useState<'ALL' | 'TRUE' | 'FALSE'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting State
    const [sortBy, setSortBy] = useState<PurchaseOrderFilters['sortBy']>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [currentUserId, setCurrentUserId] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const decoded = getDecodedToken();
        if (decoded) {
            setCurrentUserId(decoded.id || '');
        }
    }, []);

    // Fetch initial metadata (suppliers & branches)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [sResponse, bResponse] = await Promise.all([
                    getAllSuppliers({ limit: 1000 }),
                    getAllBranches({ limit: 1000 })
                ]);
                setSuppliers(sResponse.data || []);
                setBranches(bResponse.data || []);
            } catch (err) {
                console.error('Failed to fetch filter metadata:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMetadata();
    }, []);

    const fetchPOs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: PurchaseOrderFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchQuery.trim()) filters.search = searchQuery.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (supplierFilter !== 'ALL') filters.supplier = supplierFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (isUsedFilter !== 'ALL') filters.isUsed = isUsedFilter === 'TRUE';
            if (isBilledFilter !== 'ALL') filters.isBilled = isBilledFilter === 'TRUE';
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const response = await getAllPurchaseOrders(filters);
            setPos(Array.isArray(response.data) ? response.data : []);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.purchaseOrders.fetchFailed', { defaultValue: 'Failed to fetch purchase orders' }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchQuery, statusFilter, supplierFilter, branchFilter, isUsedFilter, isBilledFilter, startDate, endDate, sortBy, sortOrder, t]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPOs();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchPOs, searchQuery]);

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (field: PurchaseOrderFilters['sortBy']) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const handleQuickApprove = async (poId: string) => {
        if (!window.confirm('Are you sure you want to approve this order?')) return;
        try {
            await approveRejectPurchaseOrder(poId, { status: 'APPROVED' });
            fetchPOs();
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Approval failed');
        }
    };

    const SortIcon = ({ field }: { field: PurchaseOrderFilters['sortBy'] }) => {
        if (sortBy !== field) return <RefreshCw size={10} className="opacity-20" />;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: '#C8E600' }} /></div>;
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchase Orders', active: true }]} />

            {/* Compact Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.purchaseOrders.title')}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">{t('management.purchaseOrders.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchPOs}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 active:scale-95"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none ${showAdvancedFilters ? 'border-lime text-lime bg-lime/10' : ''}`}
                        style={{ 
                            background: showAdvancedFilters ? '' : 'var(--bg-card)', 
                            borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)', 
                            color: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--text-dim)' 
                        }}
                    >
                        <Filter size={14} /> {t('management.common.filters')}
                    </button>
                    <HasPermission permission="PURCHASE_ORDER_CREATE">
                        <button
                            onClick={() => navigate('create')}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-lg hover:scale-105 active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} /> {t('management.purchaseOrders.createBtn')}
                        </button>
                    </HasPermission>
                </div>
            </div>

            {/* Filter Section */}
            <div className="space-y-4 p-6 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                {/* Search Bar (Always visible) */}
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder={t('management.purchaseOrders.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-[#C8E600]/50 font-bold"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                        {/* Status Filter */}
                        <div>
                            <FilterLabel label={t('management.common.table.status')} />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.filters.allStatuses')}</option>
                                <option value="REQUESTED">Requested</option>
                                <option value="MANAGER_APPROVED">Manager Approved</option>
                                <option value="WAITING">{t('management.common.status.waiting')}</option>
                                <option value="APPROVED">{t('management.common.status.approved')}</option>
                                <option value="REJECTED">{t('management.common.status.rejected')}</option>
                                <option value="DISPOSED">Disposed</option>
                            </select>
                        </div>

                        {/* Branch Filter */}
                        <div>
                            <FilterLabel label={t('management.branches.title')} />
                            <select
                                value={branchFilter}
                                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.allBranches')}</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Supplier Filter */}
                        <div>
                            <FilterLabel label={t('management.suppliers.title')} />
                            <select
                                value={supplierFilter}
                                onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.allSuppliers')}</option>
                                {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Billed Filter */}
                        <div>
                            <FilterLabel label={t('management.purchaseOrders.filters.billingStatus')} />
                            <select
                                value={isBilledFilter}
                                onChange={(e) => { setIsBilledFilter(e.target.value as any); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.purchaseOrders.filters.allOrders')}</option>
                                <option value="TRUE">{t('management.purchaseOrders.filters.billedOnly')}</option>
                                <option value="FALSE">{t('management.purchaseOrders.filters.notBilled')}</option>
                            </select>
                        </div>

                        {/* Used Status Filter */}
                        <div>
                            <FilterLabel label={t('management.purchaseOrders.filters.onboardingStatus')} />
                            <select
                                value={isUsedFilter}
                                onChange={(e) => { setIsUsedFilter(e.target.value as any); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.purchaseOrders.filters.anyUsage')}</option>
                                <option value="FALSE">{t('management.purchaseOrders.filters.unusedOnly')}</option>
                                <option value="TRUE">{t('management.purchaseOrders.filters.alreadyUsed')}</option>
                            </select>
                        </div>

                        {/* Date Filters */}
                        <div>
                            <FilterLabel label={t('management.purchaseOrders.filters.startDate')} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div>
                            <FilterLabel label={t('management.purchaseOrders.filters.endDate')} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Reset Filters */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={() => {
                                    setStatusFilter('ALL');
                                    setBranchFilter('ALL');
                                    setSupplierFilter('ALL');
                                    setIsBilledFilter('ALL');
                                    setIsUsedFilter('ALL');
                                    setStartDate('');
                                    setEndDate('');
                                    setCurrentPage(1);
                                }}
                                className="w-full py-3 text-xs font-bold opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <RefreshCw size={12} /> {t('management.common.resetAll')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-left-2 duration-300" 
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table Section */}
            <div className="border shadow-lg rounded-[2rem] overflow-hidden" 
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    {loading && pos.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(200,230,0,0.3)]" />
                        </div>
                    ) : pos.length === 0 ? (
                        <div className="text-center py-24" style={{ color: 'var(--text-dim)' }}>
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileText size={40} className="opacity-20" />
                            </div>
                            <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>{t('management.purchaseOrders.empty.noOrders')}</p>
                            <p className="text-sm mt-1 opacity-50">{t('management.purchaseOrders.empty.refine')}</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-3 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('purchaseOrderNumber')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.poDetails')} <SortIcon field="purchaseOrderNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.common.table.status')} <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right group cursor-pointer select-none" onClick={() => handleSort('totalAmount')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.totalAmount')} <SortIcon field="totalAmount" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.sourceInfo')}
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('purchaseOrderDate')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.timeline')} <SortIcon field="purchaseOrderDate" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.purchaseOrders.table.explore')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y divide-white/5 font-medium ${loading ? 'opacity-40 transition-opacity' : ''}`} style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {pos.map((po, index) => (
                                    <tr
                                        key={po._id}
                                        onClick={() => navigate(po._id)}
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td className="py-4 px-3 font-semibold text-gray-500">
                                            {(index + 1 + (currentPage - 1) * limit).toString().padStart(2, '0')}
                                        </td>
                                        <td className="py-4 px-6 font-black">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {po.purchaseOrderNumber}
                                                    {po.isBilled && (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black tracking-tighter uppercase whitespace-nowrap">
                                                            {t('management.purchaseOrders.table.billed')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold opacity-40 px-1.5 py-0.5 rounded bg-white/5" style={{ color: 'var(--text-main)' }}>
                                                        {po.purpose}
                                                    </span>
                                                    {po.isEdited && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black italic uppercase">
                                                            {t('management.purchaseOrders.table.modded')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <StatusBadge status={po.status} />
                                        </td>
                                        <td className="py-4 px-6 text-right font-black text-sm" style={{ color: 'var(--text-main)' }}>
                                            ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            <div className="text-[10px] opacity-40 font-bold" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.purchaseOrders.table.uniqueItems', { count: po.items.length })}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                                    {typeof po.supplier === 'object' ? po.supplier.name : t('management.purchaseOrders.table.unknownVendor')}
                                                </div>
                                                <div className="text-[10px] opacity-50 font-medium flex items-center gap-2 pl-3.5" style={{ color: 'var(--text-dim)' }}>
                                                    {typeof po.branch === 'object' ? po.branch.name : t('management.purchaseOrders.table.unknownBranch')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {new Date(po.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] opacity-30 mt-0.5">
                                                    {new Date(po.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                            <div className="flex justify-center gap-2">
                                                {po.status === 'WAITING' && po.createdBy !== currentUserId && (
                                                    <HasPermission permission="PURCHASE_ORDER_APPROVE">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuickApprove(po._id);
                                                            }}
                                                            className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-[#C8E600] hover:border-[#C8E600]/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center mr-1"
                                                            title="Quick Approve"
                                                        >
                                                            <CheckCircle size={14} strokeWidth={2.5} />
                                                        </button>
                                                    </HasPermission>
                                                )}
                                                <button
                                                    onClick={() => navigate(po._id)}
                                                    className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                    title={t('management.purchaseOrders.table.explore')}
                                                >
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {!loading && pos.length > 0 && pagination && pagination.totalPages >= 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" 
                        style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                            Showing {pos.length} of {pagination.total} orders
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (pagination.totalPages <= 5) pageNum = i + 1;
                                    else if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum)}
                                            className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${currentPage === pageNum ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                            style={{ 
                                                background: currentPage === pageNum ? 'var(--brand-lime)' : 'transparent',
                                                color: currentPage === pageNum ? '#000' : 'var(--text-main)',
                                                border: currentPage === pageNum ? 'none' : '1px solid var(--border-main)'
                                            }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderList;
