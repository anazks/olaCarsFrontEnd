import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, Users, Shield, Trash2, Edit2, Eye, ChevronLeft, ChevronRight, Check, X, FileText, Car } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import {
    getFleets,
    createFleet,
    updateFleet,
    deleteFleet,
    getNextFleetNumber,
    type Fleet
} from '../../../services/fleetService';
import { getAllOperationStaff } from '../../../services/operationStaffService';
import { getAllFinanceStaff } from '../../../services/financeStaffService';
import { getUserRole } from '../../../utils/auth';

interface StaffOption {
    _id: string;
    fullName: string;
    email: string;
}

export default function FleetManagement() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userRole = getUserRole()?.toLowerCase() || '';

    // Lists & Loading
    const [fleets, setFleets] = useState<Fleet[]>([]);
    const [loading, setLoading] = useState(true);
    const [operationStaff, setOperationStaff] = useState<StaffOption[]>([]);
    const [financeStaff, setFinanceStaff] = useState<StaffOption[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);

    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [staffModelFilter, setStaffModelFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    // Debounce search query to avoid redundant backend requests
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // Modals
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
    const [viewingFleetVehicles, setViewingFleetVehicles] = useState<Fleet | null>(null);

    // Form State
    const [formFleetNumber, setFormFleetNumber] = useState('');
    const [formAssignedStaffModel, setFormAssignedStaffModel] = useState<'OperationStaff' | 'FinanceStaff'>('OperationStaff');
    const [formAssignedStaff, setFormAssignedStaff] = useState('');
    const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [formDescription, setFormDescription] = useState('');
    const [isAutoGenerate, setIsAutoGenerate] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSaving, setFormSaving] = useState(false);

    // Load Fleets
    const fetchFleets = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams: any = {
                page,
                limit,
                search: debouncedSearch.trim() || undefined,
                status: statusFilter || undefined,
                assignedStaffModel: staffModelFilter || undefined
            };
            const res = await getFleets(queryParams);
            if (res.success) {
                setFleets(res.data);
                if (res.pagination) {
                    setPagination({
                        total: res.pagination.total,
                        page: res.pagination.page,
                        limit: res.pagination.limit,
                        totalPages: res.pagination.totalPages
                    });
                }
            }
        } catch (err) {
            console.error('Error fetching fleets:', err);
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, staffModelFilter]);

    // Load Staff Options
    const fetchStaffOptions = async () => {
        setStaffLoading(true);
        try {
            const [opRes, finRes] = await Promise.all([
                getAllOperationStaff({ limit: 1000, status: 'ACTIVE' }),
                getAllFinanceStaff({ limit: 1000, status: 'ACTIVE' })
            ]);
            setOperationStaff(opRes.data || []);
            setFinanceStaff(finRes.data || []);
        } catch (err) {
            console.error('Error fetching staff list:', err);
        } finally {
            setStaffLoading(false);
        }
    };

    useEffect(() => {
        fetchFleets();
    }, [fetchFleets]);

    useEffect(() => {
        if (isFormOpen) {
            fetchStaffOptions();
        }
    }, [isFormOpen]);

    // Auto-generate number trigger
    useEffect(() => {
        if (isFormOpen && isAutoGenerate && !selectedFleet) {
            getNextFleetNumber()
                .then(res => {
                    if (res.success) {
                        setFormFleetNumber(res.data.fleetNumber);
                    }
                })
                .catch(err => console.error('Failed to get next fleet number:', err));
        }
    }, [isFormOpen, isAutoGenerate, selectedFleet]);

    // Open Create Modal
    const handleOpenCreate = () => {
        setSelectedFleet(null);
        setFormFleetNumber('');
        setFormAssignedStaffModel('OperationStaff');
        setFormAssignedStaff('');
        setFormStatus('ACTIVE');
        setFormDescription('');
        setIsAutoGenerate(true);
        setFormError(null);
        setIsFormOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (fleet: Fleet) => {
        setSelectedFleet(fleet);
        setFormFleetNumber(fleet.fleetNumber);
        setFormAssignedStaffModel(fleet.assignedStaffModel);
        setFormAssignedStaff(fleet.assignedStaff?._id || '');
        setFormStatus(fleet.status);
        setFormDescription(fleet.description || '');
        setIsAutoGenerate(false);
        setFormError(null);
        setIsFormOpen(true);
    };

    // Handle Form Submit
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!isAutoGenerate && !formFleetNumber.trim()) {
            setFormError('Fleet Number is required');
            return;
        }

        if (!formAssignedStaff) {
            setFormError('Please assign a staff member');
            return;
        }

        setFormSaving(true);
        try {
            const payload = {
                fleetNumber: isAutoGenerate && !selectedFleet ? undefined : formFleetNumber.trim(),
                assignedStaff: formAssignedStaff,
                assignedStaffModel: formAssignedStaffModel,
                status: formStatus,
                description: formDescription.trim() || undefined
            };

            if (selectedFleet) {
                // Update
                const res = await updateFleet(selectedFleet._id, payload);
                if (res.success) {
                    setIsFormOpen(false);
                    fetchFleets();
                }
            } else {
                // Create
                const res = await createFleet(payload);
                if (res.success) {
                    setIsFormOpen(false);
                    fetchFleets();
                }
            }
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || 'An error occurred while saving.');
        } finally {
            setFormSaving(false);
        }
    };

    // Open Delete Confirm
    const handleOpenDelete = (fleet: Fleet) => {
        setSelectedFleet(fleet);
        setIsDeleteConfirmOpen(true);
    };

    // Confirm Delete
    const handleConfirmDelete = async () => {
        if (!selectedFleet) return;
        try {
            const res = await deleteFleet(selectedFleet._id);
            if (res.success) {
                setIsDeleteConfirmOpen(false);
                setSelectedFleet(null);
                fetchFleets();
            }
        } catch (err) {
            console.error('Failed to delete fleet:', err);
        }
    };

    // Pagination helper
    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPage(newPage);
        }
    };

    // Breadcrumb path configuration
    const breadcrumbItems = [
        { label: 'Dashboard', link: `/admin/${userRole}` },
        { label: 'Fleet Management' }
    ];

    const currentStaffList = formAssignedStaffModel === 'OperationStaff' ? operationStaff : financeStaff;

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen transition-all duration-300" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <Breadcrumbs items={breadcrumbItems} />
                    <h1 className="text-xl font-black tracking-tight text-[var(--text-main)] mt-2 flex items-center gap-2">
                        <Users className="w-6 h-6 text-[var(--brand-lime)]" />
                        {t('Fleet Management')}
                    </h1>
                </div>
                {['admin', 'operational-admin', 'financial-admin', 'branch-manager', 'country-manager'].includes(userRole) && (
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold bg-[var(--brand-lime)] text-[var(--brand-black)] hover:opacity-90 active:scale-95 transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Create Fleet
                    </button>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[rgba(132,204,22,0.1)] text-[var(--brand-lime)]">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-[var(--text-main)]">{pagination.total}</div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Total Fleets</div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Car className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-[var(--text-main)]">
                            {fleets.reduce((acc, f) => acc + (f.vehicles?.length || 0), 0)}
                        </div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Monitored Vehicles</div>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-[var(--text-main)]">
                            {fleets.filter(f => f.status === 'ACTIVE').length}
                        </div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1">Active Fleets</div>
                    </div>
                </div>
            </div>

            {/* Filtering and Search Controls */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search fleet number or staff..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)] focus:ring-1 focus:ring-[var(--brand-lime)]"
                    />
                </div>

                <div className="flex flex-wrap w-full md:w-auto items-center gap-4">
                    <select
                        value={staffModelFilter}
                        onChange={(e) => { setStaffModelFilter(e.target.value); setPage(1); }}
                        className="px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)]"
                    >
                        <option value="">All Staff Roles</option>
                        <option value="OperationStaff">Operations Staff</option>
                        <option value="FinanceStaff">Finance Staff</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)]"
                    >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                    </select>

                    <button
                        onClick={fetchFleets}
                        className="p-3 rounded-xl border border-[var(--border-main)] text-[var(--text-main)] hover:bg-[rgba(255,255,255,0.05)] active:scale-95 transition-all"
                        title="Reload"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Fleets Table */}
            <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-main)] bg-gray-50/5">
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fleet Number</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Staff</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Role</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Vehicles Assigned</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-main)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[var(--brand-lime)]" />
                                        Loading fleets...
                                    </td>
                                </tr>
                            ) : fleets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No fleet assignments found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                fleets.map((fleet) => (
                                    <tr key={fleet._id} className="hover:bg-gray-50/5 transition-all">
                                        <td className="p-4 font-black text-[var(--text-main)]">
                                            #{fleet.fleetNumber}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-[var(--text-main)]">
                                                {fleet.assignedStaff?.fullName || 'Unassigned'}
                                            </div>
                                            {fleet.assignedStaff?.email && (
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {fleet.assignedStaff.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                fleet.assignedStaffModel === 'OperationStaff'
                                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            }`}>
                                                {fleet.assignedStaffModel === 'OperationStaff' ? 'Operations' : 'Finance'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => setViewingFleetVehicles(fleet)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[rgba(255,255,255,0.05)] border border-[var(--border-main)] hover:bg-[rgba(255,255,255,0.1)] transition"
                                            >
                                                <Car className="w-3.5 h-3.5 text-[var(--brand-lime)]" />
                                                <span>{fleet.vehicles?.length || 0} Cars</span>
                                                <Eye className="w-3 h-3 ml-1 text-gray-500" />
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                fleet.status === 'ACTIVE'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                                {fleet.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {['admin', 'operational-admin', 'financial-admin', 'branch-manager', 'country-manager'].includes(userRole) && (
                                                    <>
                                                        <button
                                                            onClick={() => navigate(`/admin/${userRole}/fleet/${fleet._id}/assign-vehicles`)}
                                                            className="p-2 rounded-lg text-[var(--brand-lime)] hover:bg-[rgba(132,204,22,0.1)] active:scale-95 transition"
                                                            title="Assign Vehicles"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEdit(fleet)}
                                                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] active:scale-95 transition"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDelete(fleet)}
                                                            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 active:scale-95 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pagination.total > 0 && (
                    <div className="p-4 border-t border-[var(--border-main)] flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                            <span>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} fleets</span>
                            <span className="text-gray-400">|</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                    className="px-2 py-1 rounded bg-[var(--bg-main)] border border-[var(--border-main)] text-[var(--text-main)] focus:outline-none focus:border-[var(--brand-lime)] text-xs"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1 || pagination.totalPages <= 1}
                                className="p-2 rounded-lg border border-[var(--border-main)] text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.05)]"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-bold text-[var(--text-main)] px-3">
                                Page {page} of {pagination.totalPages || 1}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === pagination.totalPages || pagination.totalPages <= 1}
                                className="p-2 rounded-lg border border-[var(--border-main)] text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.05)]"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: Create/Edit Fleet */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                            <h2 className="text-xl font-black text-[var(--text-main)]">
                                {selectedFleet ? 'Edit Fleet' : 'Create New Fleet'}
                            </h2>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                                    {formError}
                                </div>
                            )}

                            {/* Fleet Number */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fleet Number</label>
                                {!selectedFleet && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            id="autoGen"
                                            checked={isAutoGenerate}
                                            onChange={(e) => {
                                                setIsAutoGenerate(e.target.checked);
                                                if (!e.target.checked) setFormFleetNumber('');
                                            }}
                                            className="rounded accent-[var(--brand-lime)] bg-[var(--bg-main)] border-[var(--border-main)] cursor-pointer"
                                        />
                                        <label htmlFor="autoGen" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                                            Auto-generate consecutive fleet number
                                        </label>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder="e.g. 101, 102"
                                    value={formFleetNumber}
                                    onChange={(e) => setFormFleetNumber(e.target.value)}
                                    disabled={isAutoGenerate && !selectedFleet}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)] disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Staff Role */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Staff Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setFormAssignedStaffModel('OperationStaff'); setFormAssignedStaff(''); }}
                                        className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                                            formAssignedStaffModel === 'OperationStaff'
                                                ? 'border-[var(--brand-lime)] bg-[rgba(132,204,22,0.05)] text-[var(--brand-lime)]'
                                                : 'border-[var(--border-main)] bg-[var(--bg-main)] text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Operations Staff
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setFormAssignedStaffModel('FinanceStaff'); setFormAssignedStaff(''); }}
                                        className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                                            formAssignedStaffModel === 'FinanceStaff'
                                                ? 'border-[var(--brand-lime)] bg-[rgba(132,204,22,0.05)] text-[var(--brand-lime)]'
                                                : 'border-[var(--border-main)] bg-[var(--bg-main)] text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        Finance Staff
                                    </button>
                                </div>
                            </div>

                            {/* Assigned Staff Dropdown */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned staff member</label>
                                <select
                                    value={formAssignedStaff}
                                    onChange={(e) => setFormAssignedStaff(e.target.value)}
                                    disabled={staffLoading}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)] disabled:opacity-50"
                                >
                                    <option value="">-- Choose staff member --</option>
                                    {currentStaffList.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.fullName} ({s.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                                <select
                                    value={formStatus}
                                    onChange={(e) => setFormStatus(e.target.value as any)}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)]"
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description (Optional)</label>
                                <textarea
                                    placeholder="Enter additional details..."
                                    rows={3}
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[var(--brand-lime)]"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-4 border-t border-[var(--border-main)] flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="px-5 py-3 rounded-xl border border-[var(--border-main)] font-bold text-gray-400 hover:text-white transition active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSaving}
                                    className="px-6 py-3 rounded-xl font-bold bg-[var(--brand-lime)] text-[var(--brand-black)] hover:opacity-90 active:scale-95 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {formSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: View Assigned Vehicles */}
            {viewingFleetVehicles && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                            <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                                <Car className="w-5 h-5 text-[var(--brand-lime)]" />
                                Cars in Fleet #{viewingFleetVehicles.fleetNumber}
                            </h2>
                            <button
                                onClick={() => setViewingFleetVehicles(null)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[450px] overflow-y-auto space-y-4">
                            {!viewingFleetVehicles.vehicles || viewingFleetVehicles.vehicles.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    No cars are currently associated with this fleet.
                                </div>
                            ) : (
                                <div className="divide-y divide-[var(--border-main)]">
                                    {viewingFleetVehicles.vehicles.map((v: any) => (
                                        <div key={v._id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-[var(--text-main)]">
                                                    {v.basicDetails?.make || 'Unknown'} {v.basicDetails?.model || 'Car'}
                                                </div>
                                                {v.basicDetails?.vin && (
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        VIN: {v.basicDetails.vin}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setViewingFleetVehicles(null);
                                                    navigate(`/admin/${userRole}/vehicles/${v._id}`);
                                                }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--border-main)] bg-[var(--bg-main)] text-gray-400 hover:text-white hover:border-[var(--brand-lime)] transition"
                                            >
                                                <span>View Details</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-[var(--border-main)] flex justify-between items-center">
                            {['admin', 'operational-admin', 'financial-admin', 'branch-manager', 'country-manager'].includes(userRole) ? (
                                <button
                                    onClick={() => {
                                        setViewingFleetVehicles(null);
                                        navigate(`/admin/${userRole}/fleet/${viewingFleetVehicles._id}/assign-vehicles`);
                                    }}
                                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--brand-lime)] text-[var(--brand-black)] hover:opacity-90 transition active:scale-95"
                                >
                                    Manage Assignments
                                </button>
                            ) : (
                                <div />
                            )}
                            <button
                                onClick={() => setViewingFleetVehicles(null)}
                                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-main)] text-gray-400 hover:text-white transition active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Delete Confirmation */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 space-y-4">
                            <h3 className="text-lg font-black text-red-500">Delete Fleet</h3>
                            <p className="text-sm text-gray-300">
                                Are you sure you want to delete Fleet <strong>#{selectedFleet?.fleetNumber}</strong>?
                                This will remove the fleet document and unlink all associated vehicles. This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-4 border-t border-[var(--border-main)] bg-gray-50/5 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-[var(--border-main)] font-bold text-gray-400 hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-5 py-2.5 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
