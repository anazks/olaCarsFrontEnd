import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Mail, Phone, Building2, UserCog, AlertTriangle, ChevronDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    getAllWorkshopManagers,
    createWorkshopManager,
    updateWorkshopManager,
    deleteWorkshopManager,
    type WorkshopManager,
    type CreateWorkshopManagerPayload,
    type UpdateWorkshopManagerPayload,
    type ManagerFilters,
    type PaginationMetadata
} from '../../../services/workshopManagerService';
import PermissionSelector from '../../../components/common/PermissionSelector';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const phoneInputStyles = `
  .phone-input-container .form-control:focus {
    border-color: var(--brand-lime) !important;
    box-shadow: 0 0 0 2px var(--brand-lime) !important;
    outline: none !important;
  }
  .phone-input-container .flag-dropdown.open,
  .phone-input-container .flag-dropdown:hover,
  .phone-input-container .flag-dropdown:focus {
    background: transparent !important;
  }
`;

const ManageWorkshopManagers = () => {
    const { t } = useTranslation();
    const [workshopManagers, setWorkshopManagers] = useState<WorkshopManager[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const currentUser = getUser();
    const currentRole = getUserRole()?.toLowerCase();
    const isBranchManager = currentRole === 'branchmanager';

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<WorkshopManager['status'] | 'ALL'>('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
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
    const [selectedManager, setSelectedManager] = useState<WorkshopManager | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        branchId: '',
        status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'LOCKED',
        permissions: [] as string[]
    });
    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    const userPermissions = currentUser?.permissions || [];
    const isAdmin = currentRole === 'admin';

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<WorkshopManager | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = useCallback(async () => {
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
            if (branchFilter !== 'ALL') filters.branchId = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const [managersRes, branchesData] = await Promise.all([
                getAllWorkshopManagers(filters),
                getAllBranches()
            ]);
            setWorkshopManagers(managersRes.data || []);
            setPagination(managersRes.pagination);
            setBranches(branchesData.data || []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.workshopManager.fetchFailed', { defaultValue: 'Failed to fetch data' }));
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchQuery, statusFilter, branchFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchData, searchQuery]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedManager(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            branchId: isBranchManager ? (typeof currentUser?.branchId === 'object' ? currentUser?.branchId?._id : (currentUser?.branchId || '')) : '',
            status: 'ACTIVE',
            permissions: []
        });
        setActiveTab('details');
        setFormError(null);
    };

    const openEditModal = (manager: WorkshopManager) => {
        setModalMode('edit');
        setSelectedManager(manager);
        setFormData({
            fullName: manager.fullName,
            email: manager.email,
            password: '',
            phone: manager.phone || '',
            branchId: typeof manager.branchId === 'object' ? manager.branchId?._id || '' : manager.branchId,
            status: manager.status,
            permissions: manager.permissions || []
        });
        setActiveTab('details');
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedManager(null);
        setFormError(null);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateWorkshopManagerPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    branchId: formData.branchId,
                    status: formData.status,
                    permissions: formData.permissions
                };
                await createWorkshopManager(payload);
            } else if (modalMode === 'edit' && selectedManager) {
                const payload: UpdateWorkshopManagerPayload = {
                    id: selectedManager._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    branchId: formData.branchId,
                    status: formData.status,
                    permissions: formData.permissions
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateWorkshopManager(payload);
            }
            fetchData();
            closeModal();
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
            await deleteWorkshopManager(deleteTarget._id);
            fetchData();
            setDeleteTarget(null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.deleteFailed'));
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
        if (sortBy !== field) return <div className="opacity-20 transition-opacity group-hover:opacity-50"><ChevronDown size={14} /></div>;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-lime" style={{ color: 'var(--brand-lime)' }} /></div>;
    };

    const FilterLabel = ({ label }: { label: string }) => (
        <label className="block text-[10px] uppercase font-black tracking-widest mb-1.5 ml-1" style={{ color: 'var(--text-dim)' }}>
            {label}
        </label>
    );

    const filteredManagers = workshopManagers;

    return (
        <div className="p-4 sm:p-6 transition-colors duration-300" style={{ background: 'var(--bg-main)' }}>
            <style>{phoneInputStyles}</style>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <UserCog size={28} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.workshopManager.title', { defaultValue: 'Workshop Managers' })}
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>{t('management.workshopManager.subtitle', { defaultValue: 'Manage workshop managers across branches' })}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border transition-all hover:bg-lime/5 disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title={t('management.common.refreshData', { defaultValue: 'Refresh data' })}
                        disabled={loading}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border outline-none ${showAdvancedFilters ? 'border-lime text-lime bg-lime/10' : ''}`}
                        style={{ 
                            background: showAdvancedFilters ? '' : 'var(--bg-card)', 
                            borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)', 
                            color: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--text-dim)' 
                        }}
                    >
                        <Filter size={18} /> {t('management.common.filters')}
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        <Plus size={20} /> {t('management.workshopManager.add', { defaultValue: 'Add Manager' })}
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.stats.totalManagers', { defaultValue: 'Total Managers' })}</p>
                    <h3 className="text-3xl font-black transition-colors" style={{ color: 'var(--text-main)' }}>{workshopManagers.length}</h3>
                </div>
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.stats.activeAccounts', { defaultValue: 'Active Accounts' })}</p>
                    <h3 className="text-3xl font-black text-lime transition-colors" style={{ color: 'var(--brand-lime)' }}>{workshopManagers.filter(s => s.status === 'ACTIVE').length}</h3>
                </div>
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.stats.totalBranches', { defaultValue: 'Total Branches' })}</p>
                    <h3 className="text-3xl font-black transition-colors" style={{ color: 'var(--text-main)' }}>{branches.length}</h3>
                </div>
            </div>

            {/* Toolbar / Filters */}
            <div className="p-6 rounded-2xl border mb-8 space-y-4 transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={20} style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder={t('management.common.searchPlaceholder')}
                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-bold shadow-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t transition-all animate-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--border-main)' }}>
                        <div>
                            <FilterLabel label="Account Status" />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.allStatuses')}</option>
                                <option value="ACTIVE">{t('management.common.status.active')}</option>
                                <option value="SUSPENDED">{t('management.common.status.suspended', { defaultValue: 'Suspended' })}</option>
                                <option value="LOCKED">{t('management.common.status.locked', { defaultValue: 'Locked' })}</option>
                            </select>
                        </div>
                        <div>
                            <FilterLabel label="Assigned Branch" />
                            <select
                                value={branchFilter}
                                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.allBranches')}</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FilterLabel label={t('management.common.joinedDateFrom', { defaultValue: 'Joined From' })} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <FilterLabel label={t('management.common.joinedDateTo', { defaultValue: 'Joined To' })} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden transition-colors shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-bottom text-[10px] uppercase font-black tracking-wider transition-colors" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('fullName')}>
                                    <div className="flex items-center gap-2">{t('management.common.modal.fullName')} <SortIcon field="fullName" /></div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-2">{t('management.common.table.contact')} <SortIcon field="email" /></div>
                                </th>
                                <th className="px-6 py-4">{t('management.common.table.branchInfo')}</th>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-2">{t('management.common.table.status')} <SortIcon field="status" /></div>
                                </th>
                                <th className="px-6 py-4 text-right">{t('management.common.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <RefreshCw size={24} className="animate-spin inline-block mb-2 text-lime" />
                                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('management.workshopManager.loading', { defaultValue: 'Loading workshop managers...' })}</p>
                                    </td>
                                </tr>
                            ) : filteredManagers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{t('management.workshopManager.notFound', { defaultValue: 'No Workshop Managers found' })}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredManagers.map((manager) => (
                                    <tr key={manager._id} className="hover:bg-black/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold font-medium" style={{ color: 'var(--text-main)' }}>{manager.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                                                    <Mail size={14} style={{ color: 'var(--text-dim)' }} />
                                                    {manager.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                    <Phone size={14} />
                                                    {manager.phone || t('management.common.noPhone', { defaultValue: 'No phone' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                                <Building2 size={16} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                                {typeof manager.branchId === 'object' ? manager.branchId?.name : (branches.find(b => b._id === manager.branchId)?.name || manager.branchId)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${manager.status === 'ACTIVE' ? 'bg-lime/10 text-lime' :
                                                manager.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {t(`management.common.status.${manager.status.toLowerCase()}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(manager)}
                                                    className="p-2 rounded-lg hover:bg-lime/10 transition-colors"
                                                    style={{ color: 'var(--text-dim)' }}
                                                    title={t('management.common.edit', { defaultValue: 'Edit' })}
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(manager)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                                                    title={t('management.common.delete.title', { defaultValue: 'Delete' })}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.01)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                            {t('management.common.showing')} <span style={{ color: 'var(--text-main)' }}>{workshopManagers.length}</span> {t('management.common.of')} <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> {t('management.common.records')}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-1">
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => handlePageChange(i + 1)}
                                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'shadow-lg' : 'hover:bg-black/5'}`}
                                        style={{ 
                                            background: currentPage === i + 1 ? 'var(--brand-lime)' : 'transparent',
                                            color: currentPage === i + 1 ? '#000' : 'var(--text-main)',
                                            border: currentPage === i + 1 ? 'none' : '1px solid var(--border-main)'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === pagination.totalPages || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-500 text-white shadow-2xl animate-slide-up z-[100]">
                    <AlertTriangle size={20} />
                    <span className="font-bold text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 hover:scale-110 active:scale-95 transition-transform">
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
                    <div
                        className="relative w-full max-w-xl p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black transition-colors uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    {modalMode === 'create' ? t('management.workshopManager.modalTitleCreate', { defaultValue: 'Add Workshop Manager' }) : t('management.workshopManager.modalTitleEdit', { defaultValue: 'Edit Workshop Manager' })}
                                </h2>
                                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                    {modalMode === 'create' ? t('management.workshopManager.subtitle', { defaultValue: 'Create a new manager account' }) : t('management.workshopManager.modalTitleEdit', { defaultValue: 'Edit Workshop Manager' })}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-black/10 transition-transform hover:rotate-90"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-sm flex items-center gap-3 font-medium">
                                <AlertTriangle size={18} />
                                {formError}
                            </div>
                        )}

                        {/* Tabs */}
                        <div className="flex gap-4 border-b mb-6 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('details')}
                                className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-brand-lime text-brand-lime' : 'border-transparent text-dim'}`}
                            >
                                {t('management.common.tabs.details', { defaultValue: 'Basic Details' })}
                            </button>
                            <button
                                type="button"
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

                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            {activeTab === 'details' ? (
                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1 text-left">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.common.modal.fullName')}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.common.modal.officialEmailLabel')}
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        {modalMode === 'create' && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                    {t('management.common.modal.password')}
                                                </label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime font-bold"
                                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.common.modal.phone')}
                                            </label>
                                            <PhoneInput
                                                country={'in'}
                                                value={formData.phone}
                                                onChange={phone => setFormData({ ...formData, phone })}
                                                containerStyle={{ width: '100%' }}
                                                inputStyle={{
                                                    width: '100%',
                                                    height: '48px',
                                                    borderRadius: '12px',
                                                    background: 'var(--bg-input)',
                                                    border: '1px solid var(--border-main)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '14px',
                                                    fontWeight: '700',
                                                    paddingLeft: '58px'
                                                }}
                                                buttonStyle={{
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-main)',
                                                    borderRadius: '12px 0 0 12px',
                                                    borderRight: 'none',
                                                    width: '48px'
                                                }}
                                                dropdownStyle={{ 
                                                    background: 'var(--bg-card)', 
                                                    color: 'var(--text-main)',
                                                    border: '1px solid var(--border-main)',
                                                    borderRadius: '12px',
                                                    marginTop: '4px',
                                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                                                }}
                                                searchStyle={{
                                                    background: 'var(--bg-input)',
                                                    color: 'var(--text-main)',
                                                    border: '1px solid var(--border-main)',
                                                    padding: '8px',
                                                    margin: '4px',
                                                    width: 'calc(100% - 8px)'
                                                }}
                                                containerClass="phone-input-container"
                                                inputClass="phone-input-field"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.common.modal.assignBranch')}
                                            </label>
                                            <select
                                                required
                                                value={formData.branchId}
                                                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime disabled:opacity-50"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                disabled={isBranchManager}
                                            >
                                                <option value="">{t('management.common.modal.selectBranch')}</option>
                                                {branches.map(branch => (
                                                    <option key={branch._id} value={branch._id}>{branch.name} ({branch.city})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                {t('management.common.modal.status')}
                                            </label>
                                            <select
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            >
                                                <option value="ACTIVE">{t('management.common.status.active')}</option>
                                                <option value="SUSPENDED">{t('management.common.status.suspended', { defaultValue: 'Suspended' })}</option>
                                                <option value="LOCKED">{t('management.common.status.locked', { defaultValue: 'Locked' })}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 min-h-[400px]">
                                    <PermissionSelector
                                        userPermissions={userPermissions}
                                        selectedPermissions={formData.permissions}
                                        isAdmin={isAdmin}
                                        onChange={(perms) => setFormData({ ...formData, permissions: perms })}
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-black/5"
                                    style={{ color: 'var(--text-dim)' }}
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-lg disabled:opacity-50"
                                    style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                                >
                                    {formLoading ? <RefreshCw className="animate-spin" size={18} /> : (modalMode === 'create' ? t('management.workshopManager.createButton', { defaultValue: 'Create Manager' }) : t('management.workshopManager.updateButton', { defaultValue: 'Update Manager' }))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div
                        className="relative w-full max-sm p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200 text-center"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-black mb-2 transition-colors uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{t('management.workshopManager.deleteTitle', { defaultValue: 'Delete Manager' })}</h2>
                        <p className="text-sm mb-8 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            {t('management.workshopManager.deleteConfirm', { defaultValue: 'Are you sure you want to delete this manager?', name: deleteTarget.fullName })}
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-black text-sm transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
                            >
                                {deleteLoading ? <RefreshCw className="animate-spin inline mr-2" size={18} /> : t('management.common.delete.confirmSubmit')}
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:bg-black/5"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                {t('management.common.modal.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageWorkshopManagers;
