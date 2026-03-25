import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Building2, AlertTriangle, MapPin } from 'lucide-react';
import {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    type Branch,
    type CreateBranchPayload,
    type UpdateBranchPayload,
} from '../../../services/branchService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageBranches = () => {
    const { t } = useTranslation();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        status: '' as any,
        country: '',
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        country: 'Panama',
        managerId: '',
        status: 'ACTIVE' as string
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Common countries list
    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllBranches(filters);
            if (response.success) {
                setBranches(response.data);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.branches.fetchFailed', { defaultValue: 'Failed to fetch branches' }));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page on filter change
        }));
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedBranch(null);
        setFormData({
            name: '',
            code: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            email: '',
            country: 'Panama',
            managerId: '',
            status: 'ACTIVE'
        });
        setFormError(null);
    };

    const openEditModal = (branch: Branch) => {
        setModalMode('edit');
        setSelectedBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            phone: branch.phone || '',
            email: branch.email,
            country: branch.country || 'Panama',
            managerId: branch.managerId || '',
            status: branch.status
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedBranch(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateBranchPayload = {
                    ...formData,
                    status: formData.status as any
                };
                await createBranch(payload);
            } else if (modalMode === 'edit' && selectedBranch) {
                const payload: UpdateBranchPayload = {
                    id: selectedBranch._id,
                    ...formData,
                    status: formData.status as any
                };
                await updateBranch(payload);
            }
            closeModal();
            fetchBranches();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || t('management.common.operationFailed'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteBranch(deleteTarget._id);
            setDeleteTarget(null);
            fetchBranches();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.deleteFailed'));
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'INACTIVE': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            case 'MAINTENANCE': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Building2 size={28} style={{ color: '#C8E600' }} />
                        {t('management.branches.title')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>{t('management.branches.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchBranches}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {t('management.common.refresh')}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        <Plus size={18} /> {t('management.branches.add')}
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('management.common.searchPlaceholderBranches')}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 border ${
                            showAdvancedFilters 
                            ? 'border-lime text-lime bg-lime/10' 
                            : 'border-transparent text-gray-400 bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)' }}
                    >
                        <Plus size={18} className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-45' : ''}`} />
                        {t('management.common.advancedFilters')}
                    </button>
                </div>

                {showAdvancedFilters && (
                    <div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.common.allStatuses')}</option>
                                <option value="ACTIVE">{t('management.common.status.active')}</option>
                                <option value="INACTIVE">{t('management.common.status.inactive')}</option>
                                <option value="MAINTENANCE">{t('management.common.status.maintenance')}</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.country')}</label>
                            <select
                                value={filters.country}
                                onChange={(e) => handleFilterChange('country', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.common.allCountries')}</option>
                                {countries.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({
                                    page: 1,
                                    limit: 10,
                                    search: '',
                                    status: '',
                                    country: '',
                                    sortBy: 'createdAt',
                                    sortOrder: 'desc'
                                })}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-dashed transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.resetFilters')}
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
                    ) : branches.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">{t('management.branches.notFound')}</p>
                            <p className="text-sm mt-1">{t('management.branches.clickToAdd')}</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.branchInfo')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.location')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.contact')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branches.map((branch) => {
                                        const sc = statusColor(branch.status);
                                        return (
                                            <tr
                                                key={branch._id}
                                                className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                                style={{ borderColor: 'var(--border-main)' }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                        {branch.name}
                                                    </div>
                                                    <div className="text-xs font-mono" style={{ color: '#C8E600' }}>{branch.code}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-2 max-w-[250px]">
                                                        <MapPin size={14} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-dim)' }} />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm line-clamp-1" style={{ color: 'var(--text-main)' }}>{branch.address}</span>
                                                            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{branch.city}, {branch.state}, {branch.country}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm" style={{ color: 'var(--text-main)' }}>{branch.email}</div>
                                                    <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{branch.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                        {t(`management.common.status.${branch.status.toLowerCase()}`, { defaultValue: branch.status })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 uppercase">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(branch)}
                                                            className="p-2 rounded-xl transition-all cursor-pointer hover:bg-blue-500/20 active:scale-95"
                                                            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(branch)}
                                                            className="p-2 rounded-xl transition-all cursor-pointer hover:bg-red-500/20 active:scale-95"
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

                            {/* Pagination */}
                            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                    {t('management.common.showing')} <span style={{ color: 'var(--text-main)' }}>{branches.length}</span> {t('management.common.of')} <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> {t('management.common.branches')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={filters.page === 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {t('management.common.pagination.previous', { defaultValue: 'Previous' })}
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(pagination.totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => handlePageChange(i + 1)}
                                                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.page === i + 1 ? 'shadow-lg shadow-lime/20' : 'hover:bg-white/10'}`}
                                                style={{
                                                    background: filters.page === i + 1 ? 'var(--brand-lime)' : 'var(--bg-input)',
                                                    border: '1px solid var(--border-main)',
                                                    color: filters.page === i + 1 ? '#000' : 'var(--text-main)'
                                                }}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        disabled={filters.page === pagination.totalPages}
                                        onClick={() => handlePageChange(filters.page + 1)}
                                        className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {t('management.common.pagination.next', { defaultValue: 'Next' })}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {modalMode && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(8px)"
                    }}
                >

                    <div
                        className="rounded-2xl p-5 max-w-5xl w-full mx-2 relative border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-main)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h2
                                className="text-xl font-semibold"
                                style={{ color: "var(--text-main)" }}
                            >
                                {modalMode === "create"
                                    ? t('management.branches.modalTitleCreate')
                                    : t('management.branches.modalTitleEdit')}
                            </h2>

                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* GRID SECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                {/* Branch Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.branchName')}
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="Kochi Main"
                                    />
                                </div>

                                {/* Code */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.branchCode')}
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value })
                                        }
                                        placeholder="KOCHI01"
                                    />
                                </div>

                                {/* City */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.city')}
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.city}
                                        onChange={(e) =>
                                            setFormData({ ...formData, city: e.target.value })
                                        }
                                        placeholder="Kochi"
                                    />
                                </div>

                                {/* State */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.state')}
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.state}
                                        onChange={(e) =>
                                            setFormData({ ...formData, state: e.target.value })
                                        }
                                        placeholder="Kerala"
                                    />
                                </div>

                                {/* Country */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.country')}
                                    </label>

                                    <select
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.officialEmail')}
                                    </label>

                                    <input
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="branch@olacars.com"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        {t('management.common.modal.phone')}
                                    </label>

                                    <PhoneInput
                                        country={"in"}
                                        value={formData.phone}
                                        onChange={(phone) =>
                                            setFormData({ ...formData, phone })
                                        }
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "8px",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)"
                                        }}
                                    />
                                </div>

                            </div>

                            {/* ADDRESS FULL WIDTH */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={{ color: "var(--text-dim)" }}>
                                    {t('management.common.modal.address')}
                                </label>

                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-main)"
                                    }}
                                    value={formData.address}
                                    onChange={(e) =>
                                        setFormData({ ...formData, address: e.target.value })
                                    }
                                    placeholder="MG Road"
                                />
                            </div>

                            {/* STATUS */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={{ color: "var(--text-dim)" }}>
                                    {t('management.common.modal.status')}
                                </label>

                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({ ...formData, status: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-main)"
                                    }}
                                >
                                    <option value="ACTIVE">{t('management.common.status.active')}</option>
                                    <option value="INACTIVE">{t('management.common.status.inactive')}</option>
                                    <option value="MAINTENANCE">{t('management.common.status.maintenance')}</option>
                                </select>
                            </div>

                            {/* ERROR */}
                            {formError && (
                                <div
                                    className="p-3 rounded-lg text-sm"
                                    style={{
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                        color: "#ef4444"
                                    }}
                                >
                                    {formError}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 rounded-lg text-sm"
                                    style={{
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-dim)"
                                    }}
                                >
                                    {t('management.common.modal.cancel')}
                                </button>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-2.5 rounded-lg font-semibold flex justify-center items-center"
                                    style={{
                                        background: "#C8E600",
                                        color: "#0A0A0A"
                                    }}
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        modalMode === "create"
                                            ? t('management.branches.createButton')
                                            : t('management.branches.updateButton')
                                    )}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-md w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <Trash2 size={40} style={{ color: '#ef4444' }} />
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-3" style={{ color: 'var(--text-main)' }}>{t('management.branches.deleteTitle')}</h2>
                        <p className="text-center mb-8" style={{ color: 'var(--text-dim)' }}>
                            {t('management.branches.deleteConfirm', { name: deleteTarget.name })}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.modal.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                 {deleteLoading
                                     ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                     : t('management.common.delete.confirmSubmit')
                                 }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBranches;
