import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, RefreshCw, Search, FileText, AlertTriangle, Eye, Clock, CheckCircle, XCircle, ChevronLeft, ChevronRight, Filter, ChevronDown } from 'lucide-react';
import { getAllPurchaseOrders } from '../../../services/purchaseOrderService';
import type { PurchaseOrder, POStatus, PaginationMetadata, PurchaseOrderFilters } from '../../../services/purchaseOrderService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import HasPermission from '../../../components/HasPermission';

const StatusBadge = ({ status }: { status: POStatus }) => {
    const { t } = useTranslation();
    const styles = {
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

    const navigate = useNavigate();
    const userRole = getUserRole();
    const canCreate = userRole === 'branchmanager' || userRole === 'countrymanager';

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

    const SortIcon = ({ field }: { field: PurchaseOrderFilters['sortBy'] }) => {
        if (sortBy !== field) return <RefreshCw size={10} className="opacity-20" />;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: '#C8E600' }} /></div>;
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <FileText size={28} style={{ color: '#C8E600' }} />
                        {t('management.purchaseOrders.title')}
                    </h1>
                    <p className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--text-dim)' }}>{t('management.purchaseOrders.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPOs}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-white/5 active:scale-95"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border outline-none ${showAdvancedFilters ? 'border-lime text-lime bg-lime/10' : ''}`}
                        style={{ 
                            background: showAdvancedFilters ? '' : 'var(--bg-card)', 
                            borderColor: showAdvancedFilters ? '' : 'var(--border-main)', 
                            color: showAdvancedFilters ? '' : 'var(--text-main)' 
                        }}
                    >
                        <Filter size={16} /> {t('management.common.filters')}
                    </button>
                    <HasPermission permission="PURCHASE_ORDER_CREATE">
                        <button
                            onClick={() => navigate('create')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all shadow-lg hover:shadow-lime/20 hover:-translate-y-0.5 active:translate-y-0"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Plus size={18} /> {t('management.purchaseOrders.createBtn')}
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
                                <option value="ALL">{t('management.common.allStatuses')}</option>
                                <option value="WAITING">{t('management.common.status.waiting')}</option>
                                <option value="APPROVED">{t('management.common.status.approved')}</option>
                                <option value="REJECTED">{t('management.common.status.rejected')}</option>
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
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300 shadow-2xl" 
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
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
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="transition-colors duration-300" style={{ background: 'rgba(255,255,255,0.01)' }}>
                                    <th className="px-6 py-5">
                                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest outline-none hover:text-[#C8E600] transition-colors" 
                                            style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.poDetails')}
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                    <th className="px-6 py-5">
                                        <button onClick={() => handleSort('totalAmount')} 
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest outline-none hover:text-[#C8E600] transition-colors"
                                            style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.totalAmount')} <SortIcon field="totalAmount" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.purchaseOrders.table.sourceInfo')}</th>
                                    <th className="px-6 py-5">
                                        <button onClick={() => handleSort('purchaseOrderDate')} 
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest outline-none hover:text-[#C8E600] transition-colors"
                                            style={{ color: 'var(--text-dim)' }}>
                                            {t('management.purchaseOrders.table.timeline')} <SortIcon field="purchaseOrderDate" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.purchaseOrders.table.explore')}</th>
                                </tr>
                            </thead>
                            <tbody className={loading ? 'opacity-40 transition-opacity' : ''}>
                                {pos.map((po) => (
                                    <tr
                                        key={po._id}
                                        className="border-t hover:bg-[#C8E600]/[0.02] transition-colors group"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        <td className="px-6 py-6 lg:min-w-[220px]">
                                            <div className="flex flex-col gap-1">
                                                <div className="font-black text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {po.purchaseOrderNumber}
                                                    {po.isBilled && (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black tracking-tighter uppercase whitespace-nowrap">{t('management.purchaseOrders.table.billed')}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold opacity-40 px-1.5 py-0.5 rounded bg-white/5" style={{ color: 'var(--text-main)' }}>
                                                        {po.purpose}
                                                    </span>
                                                    {po.isEdited && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black italic uppercase">{t('management.purchaseOrders.table.modded')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <StatusBadge status={po.status} />
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="text-base font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className="text-[10px] opacity-40 font-bold" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.purchaseOrders.table.uniqueItems', { count: po.items.length })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-1">
                                                <div className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    <div className="w-1 h-1 rounded-full bg-[#C8E600]" />
                                                    {typeof po.supplier === 'object' ? po.supplier.name : t('management.purchaseOrders.table.unknownVendor')}
                                                </div>
                                                <div className="text-[10px] opacity-50 font-medium flex items-center gap-2 pl-3" style={{ color: 'var(--text-dim)' }}>
                                                    {typeof po.branch === 'object' ? po.branch.name : t('management.purchaseOrders.table.unknownBranch')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col">
                                                <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {new Date(po.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[10px] opacity-30 mt-0.5">
                                                    {new Date(po.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => navigate(po._id)}
                                                    className="p-3 rounded-xl transition-all cursor-pointer hover:bg-[#C8E600] hover:text-black group-hover:shadow-[0_0_15px_rgba(200,230,0,0.2)]"
                                                    style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)' }}
                                                    title={t('management.purchaseOrders.table.explore')}
                                                >
                                                    <Eye size={18} />
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
                {pagination && (
                    <div className="px-8 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4" 
                        style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            {t('management.purchaseOrders.pagination.reviewing', { 
                                count: pos.length, 
                                total: pagination.total,
                                interpolation: { escapeValue: false }
                            })}
                        </div>
                        
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={20} className="group-active:-translate-x-1 transition-transform" />
                                </button>
                                
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-2xl border border-white/5">
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
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-[#C8E600] text-black shadow-lg shadow-lime/20 scale-110' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                                                style={{ 
                                                    color: currentPage === pageNum ? '#000' : 'var(--text-main)' 
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
                                    className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed group"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={20} className="group-active:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderList;
