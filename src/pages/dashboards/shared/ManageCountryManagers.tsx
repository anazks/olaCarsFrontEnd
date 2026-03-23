import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Globe, AlertTriangle, Filter, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    getAllCountryManagers,
    createCountryManager,
    updateCountryManager,
    deleteCountryManager,
    type CountryManager,
    type CreateCountryManagerPayload,
    type UpdateCountryManagerPayload,
    type ManagerFilters,
    type PaginationMetadata
} from '../../../services/countryManagerService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageCountryManagers = () => {
    const { t } = useTranslation();
    const [managers, setManagers] = useState<CountryManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<CountryManager['status'] | 'ALL'>('ALL');
    const [countryFilter, setCountryFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedManager, setSelectedManager] = useState<CountryManager | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        country: 'Panama',
        status: 'ACTIVE' as string,
        twoFactorEnabled: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Common countries list
    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<CountryManager | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchManagers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: ManagerFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchQuery.trim()) filters.search = searchQuery.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (countryFilter !== 'ALL') filters.country = countryFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const response = await getAllCountryManagers(filters);
            setManagers(response.data || []);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.countryManagers.fetchFailed', { defaultValue: 'Failed to fetch country managers' }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchQuery, statusFilter, countryFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchManagers();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchManagers, searchQuery]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedManager(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            country: 'Panama',
            status: 'ACTIVE',
            twoFactorEnabled: true
        });
        setFormError(null);
    };

    const openEditModal = (manager: CountryManager) => {
        setModalMode('edit');
        setSelectedManager(manager);
        setFormData({
            fullName: manager.fullName,
            email: manager.email,
            password: '',
            phone: manager.phone || '',
            country: manager.country || 'Panama',
            status: manager.status,
            twoFactorEnabled: manager.twoFactorEnabled
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedManager(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateCountryManagerPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    country: formData.country,
                    status: formData.status as any,
                    twoFactorEnabled: formData.twoFactorEnabled
                };
                await createCountryManager(payload);
            } else if (modalMode === 'edit' && selectedManager) {
                const payload: UpdateCountryManagerPayload = {
                    id: selectedManager._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    country: formData.country,
                    status: formData.status as any,
                    twoFactorEnabled: formData.twoFactorEnabled
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateCountryManager(payload);
            }
            closeModal();
            fetchManagers();
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
            await deleteCountryManager(deleteTarget._id);
            setDeleteTarget(null);
            fetchManagers();
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

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <RefreshCw size={10} className="opacity-20" />;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: '#C8E600' }} /></div>;
    };

    const FilterLabel = ({ label }: { label: string }) => (
        <label className="block text-[10px] uppercase font-black tracking-widest mb-1.5 ml-1" style={{ color: 'var(--text-dim)' }}>
            {label}
        </label>
    );

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'SUSPENDED': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
            case 'LOCKED': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Globe size={28} style={{ color: '#C8E600' }} />
                        {t('management.countryManagers.title')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>{t('management.countryManagers.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchManagers}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border outline-none ${showAdvancedFilters ? 'border-[#C8E600] text-[#C8E600] bg-[#C8E600]/10' : ''}`}
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
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        <Plus size={18} /> {t('management.countryManagers.add')}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
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

                        {/* Country Filter */}
                        <div>
                            <FilterLabel label={t('management.common.table.country')} />
                            <select
                                value={countryFilter}
                                onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.allCountries')}</option>
                                {countries.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
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
                                    setCountryFilter('ALL');
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
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : managers.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Globe size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">{t('management.countryManagers.notFound')}</p>
                            <p className="text-sm mt-1">{t('management.countryManagers.clickToAdd')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4">
                                        <button onClick={() => handleSort('fullName')} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider outline-none hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.common.table.name')} <SortIcon field="fullName" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">
                                        <button onClick={() => handleSort('email')} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider outline-none hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.common.table.phoneEmail')} <SortIcon field="email" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.country')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.twoFactor')}</th>
                                    <th className="px-6 py-4">
                                        <button onClick={() => handleSort('createdAt')} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider outline-none hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.common.table.created')} <SortIcon field="createdAt" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managers.map((manager: CountryManager) => {
                                    const sc = statusColor(manager.status);
                                    return (
                                        <tr
                                            key={manager._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(200,230,0,0.15)', color: '#C8E600' }}>
                                                        {manager.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>{manager.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs space-y-0.5">
                                                    <span style={{ color: 'var(--text-main)' }}>{manager.email}</span>
                                                    <span style={{ color: 'var(--text-dim)' }}>{manager.phone || t('management.countryManagers.noPhone', { defaultValue: 'No phone' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    <Globe size={14} style={{ color: '#C8E600' }} />
                                                    {manager.country || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                    {t(`management.common.status.${manager.status.toLowerCase()}`, { defaultValue: manager.status })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {manager.twoFactorEnabled ? (
                                                    <span className="text-xs font-bold" style={{ color: '#22c55e' }}>{t('management.common.status.enabled')}</span>
                                                ) : (
                                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{t('management.common.status.disabled')}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(manager)}
                                                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-blue-500/20"
                                                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(manager)}
                                                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-red-500/20"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
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
                </div>

                {/* Pagination footer */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            {t('management.common.showing')} <span className="text-lime font-black">{managers.length}</span> {t('management.common.of')} <span className="text-white font-black">{pagination.total}</span> {t('management.common.records')}
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

            {/* Modals */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-lg w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? t('management.countryManagers.modalTitleCreate') : t('management.countryManagers.modalTitleEdit')}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.fullName')}</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.email')}</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="manager@olacars.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.country')}</label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.phone')}</label>
                                    <PhoneInput
                                        country={({
                                            "Panama": "pa",
                                            "United States": "us",
                                            "United Kingdom": "gb",
                                            "Canada": "ca",
                                            "Australia": "au",
                                            "Germany": "de",
                                            "France": "fr",
                                            "India": "in",
                                            "Nigeria": "ng",
                                            "South Africa": "za",
                                            "United Arab Emirates": "ae"
                                        } as Record<string, string>)[formData.country] || 'pa'}
                                        value={formData.phone}
                                        onChange={(phone) => setFormData({ ...formData, phone })}
                                        containerStyle={{ width: '100%' }}
                                        inputStyle={{
                                            width: '100%',
                                            height: '46px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-main)',
                                            color: 'var(--text-main)',
                                            borderRadius: '12px',
                                            fontSize: '14px'
                                        }}
                                        buttonStyle={{
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-main)',
                                            borderRadius: '12px 0 0 12px'
                                        }}
                                        dropdownStyle={{
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            border: '1px solid var(--border-main)'
                                        }}
                                    />
                                </div>
                            </div>

                            {modalMode === 'create' && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.common.modal.password')}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.status')}</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="ACTIVE" style={{ background: 'var(--bg-card)' }}>{t('management.common.status.active')}</option>
                                        <option value="SUSPENDED" style={{ background: 'var(--bg-card)' }}>{t('management.common.status.suspended')}</option>
                                        <option value="LOCKED" style={{ background: 'var(--bg-card)' }}>{t('management.common.status.locked')}</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl transition-all hover:bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={formData.twoFactorEnabled}
                                                onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                                            />
                                            <div className={`w-10 h-5 rounded-full transition-colors ${formData.twoFactorEnabled ? 'bg-[#C8E600]' : 'bg-gray-600'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{t('management.common.modal.twoFactorEnabled')}</span>
                                    </label>
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-60"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                                        : modalMode === 'create' ? t('management.countryManagers.createButton') : t('management.common.modal.saveChanges')
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-sm w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors text-center"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={28} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('management.countryManagers.deleteTitle')}</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
                            {t('management.common.delete.confirm', { name: deleteTarget.fullName })}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center"
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

export default ManageCountryManagers;
