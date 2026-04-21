import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, DollarSign, ChevronDown, Filter, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
    getAllFinancialAdmins,
    createFinancialAdmin,
    updateFinancialAdmin,
    deleteFinancialAdmin,
    type FinancialAdmin,
    type CreateFinancialAdminPayload,
    type UpdateFinancialAdminPayload,
    type PaginationMetadata,
    type AdminFilters
} from '../../../services/financialAdminService';
import PermissionSelector from '../../../components/common/PermissionSelector';
import { getUser, getUserRole } from '../../../utils/auth';

type ModalMode = 'create' | 'edit' | null;

const FilterLabel = ({ label }: { label: string }) => (
    <label className="block text-[10px] uppercase font-black tracking-widest mb-1.5 ml-1" style={{ color: 'var(--text-dim)' }}>
        {label}
    </label>
);

const ManageFinancialAdmins = () => {
    const { t } = useTranslation();
    const [admins, setAdmins] = useState<FinancialAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<FinancialAdmin['status'] | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting State
    const [sortBy, setSortBy] = useState<AdminFilters['sortBy']>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<FinancialAdmin | null>(null);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', status: 'ACTIVE' as string, permissions: [] as string[] });
    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const currentUser = getUser();
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';
    const userPermissions = currentUser?.permissions || [];

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<FinancialAdmin | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: AdminFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchQuery.trim()) filters.search = searchQuery.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const response = await getAllFinancialAdmins(filters);
            setAdmins(response.data || []);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.finAdmins.fetchFailed', { defaultValue: 'Failed to fetch financial admins' }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchQuery, statusFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAdmins();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchAdmins, searchQuery]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedAdmin(null);
        setFormData({ fullName: '', email: '', password: '', status: 'ACTIVE', permissions: [] });
        setActiveTab('details');
        setFormError(null);
    };

    const openEditModal = (admin: FinancialAdmin) => {
        setModalMode('edit');
        setSelectedAdmin(admin);
        setFormData({
            fullName: admin.fullName,
            email: admin.email,
            password: '',
            status: admin.status,
            permissions: admin.permissions || []
        });
        setActiveTab('details');
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedAdmin(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateFinancialAdminPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    permissions: formData.permissions
                };
                await createFinancialAdmin(payload);
            } else if (modalMode === 'edit' && selectedAdmin) {
                const payload: UpdateFinancialAdminPayload = {
                    id: selectedAdmin._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    status: formData.status as any,
                    permissions: formData.permissions
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateFinancialAdmin(payload);
            }
            closeModal();
            fetchAdmins();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || t('management.common.operationFailed', { defaultValue: 'Operation failed' }));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteFinancialAdmin(deleteTarget._id);
            setDeleteTarget(null);
            fetchAdmins();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.deleteFailed', { defaultValue: 'Delete failed' }));
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (field: AdminFilters['sortBy']) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: AdminFilters['sortBy'] }) => {
        if (sortBy !== field) return <RefreshCw size={10} className="opacity-20" />;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: 'var(--brand-lime)' }} /></div>;
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'SUSPENDED': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
            case 'LOCKED': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <DollarSign size={28} style={{ color: 'var(--brand-lime)' }} />
                        {t('management.finAdmins.title')}
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.finAdmins.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAdmins}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
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
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        <Plus size={18} /> {t('management.finAdmins.add')}
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="space-y-4 p-6 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                {/* Search Bar (Always visible) */}
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder={t('management.common.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-bold"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
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
                                <option value="ACTIVE">{t('management.common.status.active')}</option>
                                <option value="SUSPENDED">{t('management.common.status.suspended')}</option>
                                <option value="LOCKED">{t('management.common.status.locked')}</option>
                            </select>
                        </div>

                        {/* Date Filters */}
                        <div>
                            <FilterLabel label={t('management.common.startDate')} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div>
                            <FilterLabel label={t('management.common.endDate')} />
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

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm transition-colors" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-x-auto transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                    </div>
                ) : admins.length === 0 ? (
                    <div className="text-center py-20 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">{t('management.finAdmins.notFound')}</p>
                        <p className="text-sm mt-1">{t('management.finAdmins.clickToAdd')}</p>
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="transition-colors" style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-main)' }}>
                                <th className="px-6 py-4">
                                    <button onClick={() => handleSort('fullName')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.common.table.name')} <SortIcon field="fullName" />
                                    </button>
                                </th>
                                <th className="px-6 py-4">
                                    <button onClick={() => handleSort('email')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.common.table.email')} <SortIcon field="email" />
                                    </button>
                                </th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.twoFactor')}</th>
                                <th className="px-6 py-4">
                                    <button onClick={() => handleSort('createdAt')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.common.table.created')} <SortIcon field="createdAt" />
                                    </button>
                                </th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            {admins.map((admin) => {
                                const sc = statusColor(admin.status);
                                return (
                                    <tr key={admin._id} className="transition-colors hover:bg-lime/5">
                                        <td className="px-6 py-4 text-left">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                                                    {admin.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium transition-colors" style={{ color: 'var(--text-main)' }}>{admin.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-left transition-colors" style={{ color: 'var(--text-dim)' }}>{admin.email}</td>
                                        <td className="px-6 py-4 text-left">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider transition-colors" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                {t(`management.common.status.${admin.status.toLowerCase()}`, { defaultValue: admin.status })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-left transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {admin.twoFactorEnabled ? (
                                                <span className="text-green-400 text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-green-400/10">{t('management.common.status.enabled')}</span>
                                            ) : (
                                                <span className="text-[10px] font-bold opacity-30">{t('management.common.status.disabled')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-left text-[11px] transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-blue-500/20"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-red-500/20"
                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* Pagination footer */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            {t('management.common.showing')} <span className="text-lime font-black">{admins.length}</span> {t('management.common.of')} <span className="text-white font-black">{pagination.total}</span> {t('management.common.records')}
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
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
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-lime text-black' : 'hover:bg-white/5 opacity-50'}`}
                                            style={{ color: currentPage === pageNum ? '#000' : 'var(--text-main)' }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages || loading}
                                className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ───── Create / Edit Modal ───── */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-lg mx-4 rounded-2xl p-6 border shadow-2xl transition-colors animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold transition-colors" style={{ color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? t('management.finAdmins.modalTitleCreate') : t('management.finAdmins.modalTitleEdit')}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5" style={{ color: 'var(--text-dim)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 border-b mb-6 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-brand-lime text-brand-lime' : 'border-transparent text-dim'}`}
                            >
                                {t('management.common.tabs.details', { defaultValue: 'Basic Details' })}
                            </button>
                            <button
                                onClick={() => setActiveTab('permissions')}
                                className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'permissions' ? 'border-brand-lime text-brand-lime' : 'border-transparent text-dim'}`}
                            >
                                {t('management.common.tabs.permissions', { defaultValue: 'Permissions' })}
                                {formData.permissions.length > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-lime text-black text-[10px] font-black">
                                        {formData.permissions.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeTab === 'details' ? (
                                <div className="space-y-4 min-h-[300px]">
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.fullName')}</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            placeholder="Jane Smith"
                                            className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.email')}</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="finance@olacars.com"
                                            className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    {(modalMode === 'create' || modalMode === 'edit') && (
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {modalMode === 'create' 
                                                    ? t('management.common.modal.password') 
                                                    : t('management.common.modal.newPasswordOptional', { defaultValue: 'New Password (Optional)' })
                                                }
                                            </label>
                                            <input
                                                type="password"
                                                required={modalMode === 'create'}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    )}

                                    {modalMode === 'edit' && (
                                        <div className="space-y-1.5">
                                            <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            >
                                                <option value="ACTIVE">{t('management.common.status.active')}</option>
                                                <option value="SUSPENDED">{t('management.common.status.suspended')}</option>
                                                <option value="LOCKED">{t('management.common.status.locked')}</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 min-h-[300px]">
                                    <PermissionSelector
                                        userPermissions={userPermissions}
                                        selectedPermissions={formData.permissions}
                                        isAdmin={isAdmin}
                                        onChange={(perms) => setFormData({ ...formData, permissions: perms })}
                                    />
                                </div>
                            ) }

                            {formError && (
                                <div className="text-red-400 text-sm p-3 rounded-xl transition-colors" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5 border"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0A0A0A', borderTopColor: 'transparent' }} />
                                        : modalMode === 'create' ? t('management.finAdmins.createButton') : t('management.common.modal.saveChanges')
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ───── Delete Confirmation Modal ───── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-sm mx-4 rounded-2xl p-6 text-center border shadow-2xl transition-colors animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold transition-colors mb-2" style={{ color: 'var(--text-main)' }}>{t('management.finAdmins.deleteTitle')}</h3>
                        <p className="text-sm transition-colors mb-6" style={{ color: 'var(--text-dim)' }}>
                            {t('management.common.delete.confirm', { name: deleteTarget.fullName })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5 border"
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center disabled:opacity-60 transition-all hover:bg-red-600 shadow-lg hover:-translate-y-0.5"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deleteLoading
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : t('management.common.delete.submit')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageFinancialAdmins;
