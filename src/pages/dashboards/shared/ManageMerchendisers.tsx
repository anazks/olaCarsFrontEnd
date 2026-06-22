import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Mail, Phone, ShieldCheck, AlertTriangle, ChevronDown, Filter, ChevronLeft, ChevronRight, User, Unlock } from 'lucide-react';
import {
    getAllMerchendisers,
    createMerchendiser,
    updateMerchendiser,
    deleteMerchendiser,
    type MerchendiseUser,
    type CreateMerchendisePayload,
    type UpdateMerchendisePayload,
    type MerchendiseFilters,
    type PaginationMetadata
} from '../../../services/merchendiseService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import HasPermission from '../../../components/HasPermission';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import PermissionSelector from '../../../components/common/PermissionSelector';
import { getUser, getUserRole } from '../../../utils/auth';
import { validatePhoneDetails } from '../../../utils/phoneValidation';

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

const ManageMerchendisers = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [merchendisers, setMerchendisers] = useState<MerchendiseUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');

    const currentUser = getUser();
    const userRole = getUserRole();
    const isAdmin = userRole === 'admin';
    const userPermissions = currentUser?.permissions || [];

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<MerchendiseUser['status'] | 'ALL'>('ALL');
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
    const [selectedMerch, setSelectedMerch] = useState<MerchendiseUser | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'LOCKED',
        permissions: [] as string[]
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<MerchendiseUser | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: MerchendiseFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchQuery.trim()) filters.search = searchQuery.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await getAllMerchendisers(filters);
            setMerchendisers(res.data || []);
            setPagination(res.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, searchQuery, statusFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchData, searchQuery]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedMerch(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            status: 'ACTIVE',
            permissions: []
        });
        setActiveTab('details');
        setFormError(null);
    };



    const closeModal = () => {
        setModalMode(null);
        setSelectedMerch(null);
        setFormError(null);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.email.trim())) {
            setFormError(t('management.merchendiser.form.invalidEmailFormat', { defaultValue: 'Please enter a valid email address.' }));
            setFormLoading(false);
            return;
        }

        // Validate phone number using the centralized helper if provided
        const cleanedPhone = formData.phone ? formData.phone.replace(/\D/g, '') : '';
        const isPhoneEmpty = !cleanedPhone || cleanedPhone.length <= 4;

        if (!isPhoneEmpty) {
            const phoneValidation = validatePhoneDetails(formData.phone);
            if (!phoneValidation.isValid) {
                let errorMsg = '';
                switch (phoneValidation.errorKey) {
                    case 'REPEATED_DIGITS':
                        errorMsg = t('management.merchendiser.form.invalidPhoneRepeated', { defaultValue: 'Phone number cannot consist of repeated digits.' });
                        break;
                    case 'TOO_SHORT':
                        errorMsg = t('management.merchendiser.form.phoneTooShort', { defaultValue: 'Phone number is too short.' });
                        break;
                    case 'TOO_LONG':
                        errorMsg = t('management.merchendiser.form.phoneTooLong', { defaultValue: 'Phone number is too long.' });
                        break;
                    case 'INVALID_FORMAT':
                    default:
                        errorMsg = t('management.merchendiser.form.invalidPhoneLength', { defaultValue: 'Please enter a valid phone number.' });
                        break;
                }
                setFormError(errorMsg);
                setFormLoading(false);
                return;
            }
        }

        try {
            if (modalMode === 'create') {
                const payload: CreateMerchendisePayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password || undefined,
                    phone: formData.phone || undefined,
                    status: formData.status,
                    permissions: formData.permissions
                };
                await createMerchendiser(payload);
            } else if (modalMode === 'edit' && selectedMerch) {
                const payload: UpdateMerchendisePayload = {
                    id: selectedMerch._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone || undefined,
                    status: formData.status,
                    permissions: formData.permissions
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateMerchendiser(payload);
            }
            fetchData();
            closeModal();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || 'Operation failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUnblock = async (merch: MerchendiseUser) => {
        try {
            await updateMerchendiser({
                id: merch._id,
                status: 'ACTIVE'
            });
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Operation failed');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteMerchendiser(deleteTarget._id);
            fetchData();
            setDeleteTarget(null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
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

    return (
        <div className="p-4 sm:p-6 transition-colors duration-300 animate-fadeIn" style={{ background: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Staff Management', path: '../staff-management' }, { label: 'Manage Merchendisers', active: true }]} />

            <style>{phoneInputStyles}</style>

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-lg font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <ShieldCheck size={28} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.merchendiser.title', 'Manage Merchendisers')}
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        {t('management.merchendiser.subtitle', 'Register, view, and configure credentials and status for global merchandiser staff')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border transition-all hover:bg-lime/5 disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
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
                    <HasPermission permission="STAFF_CREATE">
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={20} /> {t('management.merchendiser.add', 'Add Merchendiser')}
                        </button>
                    </HasPermission>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>
                        {t('management.merchendiser.stats.total', 'Total Merchendisers')}
                    </p>
                    <h3 className="text-3xl font-black transition-colors" style={{ color: 'var(--text-main)' }}>{merchendisers.length}</h3>
                </div>
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>
                        {t('management.merchendiser.stats.active', 'Active Accounts')}
                    </p>
                    <h3 className="text-3xl font-black text-lime transition-colors" style={{ color: 'var(--brand-lime)' }}>
                        {merchendisers.filter(s => s.status === 'ACTIVE').length}
                    </h3>
                </div>
            </div>

            {/* Filters */}
            <div className="p-6 rounded-2xl border mb-8 space-y-4 transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
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

                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t transition-all animate-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--border-main)' }}>
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
                            <FilterLabel label="Joined From" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <FilterLabel label="Joined To" />
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
            <div className="rounded-2xl border overflow-hidden transition-colors shadow-sm animate-fadeIn" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
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
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-2">{t('management.common.table.status')} <SortIcon field="status" /></div>
                                </th>
                                <th className="px-6 py-4 text-right">{t('management.common.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <RefreshCw size={24} className="animate-spin inline-block mb-2 text-lime" />
                                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading Merchendisers...</p>
                                    </td>
                                </tr>
                            ) : merchendisers.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>No Merchendisers found</p>
                                    </td>
                                </tr>
                            ) : (
                                merchendisers.map((merch) => (
                                    <tr key={merch._id} className="hover:bg-black/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border text-lime" style={{ borderColor: 'var(--border-main)', color: 'var(--brand-lime)' }}>
                                                    <User size={14} />
                                                </div>
                                                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{merch.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                                                    <Mail size={14} style={{ color: 'var(--text-dim)' }} />
                                                    {merch.email}
                                                </div>
                                                {merch.phone && (
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                        <Phone size={14} />
                                                        {merch.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${merch.status === 'ACTIVE' ? 'bg-lime/10 text-lime' :
                                                merch.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {t(`management.common.status.${merch.status.toLowerCase()}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {merch.status === 'LOCKED' && (
                                                    <HasPermission permission="STAFF_EDIT">
                                                        <button
                                                            onClick={() => handleUnblock(merch)}
                                                            className="p-2 rounded-lg hover:bg-lime/10 transition-colors"
                                                            style={{ color: 'var(--brand-lime)' }}
                                                            title={t('common.unblock', { defaultValue: 'Unblock' })}
                                                        >
                                                            <Unlock size={18} />
                                                        </button>
                                                    </HasPermission>
                                                )}
                                                <HasPermission permission="STAFF_EDIT">
                                                    <button
                                                        onClick={() => navigate(`edit/${merch._id}`)}
                                                        className="p-2 rounded-lg hover:bg-lime/10 transition-colors"
                                                        style={{ color: 'var(--text-dim)' }}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                </HasPermission>
                                                <HasPermission permission="STAFF_DELETE">
                                                    <button
                                                        onClick={() => setDeleteTarget(merch)}
                                                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </HasPermission>
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
                            Showing <span style={{ color: 'var(--text-main)' }}>{merchendisers.length}</span> of <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> records
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

            {/* Create/Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
                    <div
                        className="relative w-full max-w-lg p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-lg font-black transition-colors uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    {modalMode === 'create' ? 'Add Merchendiser' : 'Edit Merchendiser'}
                                </h2>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                    {modalMode === 'create' ? 'Create a new login for a merchandiser user' : 'Update merchandiser profile and credentials'}
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
                                <div className="space-y-4 text-left max-h-[350px] overflow-y-auto pr-1">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            placeholder="Vikrant Verma"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            Official Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            placeholder="merchandiser@olacars.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            Password {modalMode === 'edit' && '(leave blank to keep current)'}
                                        </label>
                                        <input
                                            type="password"
                                            required={modalMode === 'create'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime font-bold"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            Contact Phone
                                        </label>
                                        <PhoneInput
                                            country={'pa'}
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
                                            Account Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                            className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime font-bold text-xs"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="SUSPENDED">SUSPENDED</option>
                                            <option value="LOCKED">LOCKED</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 min-h-[400px]">
                                    <PermissionSelector
                                        staffName={formData.fullName}
                                        userPermissions={userPermissions}
                                        selectedPermissions={formData.permissions}
                                        isAdmin={isAdmin}
                                        onChange={(perms) => setFormData({ ...formData, permissions: perms })}
                                    />
                                </div>
                            )}

                            <div className="flex gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-bold border transition-colors outline-none cursor-pointer"
                                    style={{ background: 'transparent', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all hover:shadow-lg disabled:opacity-50 cursor-pointer"
                                    style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                                >
                                    {formLoading ? 'Saving...' : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div
                        className="relative w-full max-w-md p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
                                <AlertTriangle size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black transition-colors uppercase tracking-tight text-main" style={{ color: 'var(--text-main)' }}>
                                    Delete Merchendiser
                                </h3>
                                <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                    Are you sure you want to delete <span className="font-bold text-main" style={{ color: 'var(--text-main)' }}>{deleteTarget.fullName}</span>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-4 w-full pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold border transition-colors outline-none cursor-pointer"
                                    style={{ background: 'transparent', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                    disabled={deleteLoading}
                                >
                                    No, Keep
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors outline-none cursor-pointer"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageMerchendisers;
