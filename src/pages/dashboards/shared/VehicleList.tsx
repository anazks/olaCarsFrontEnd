import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, Car, AlertTriangle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllVehicles } from '../../../services/vehicleService';
import type { Vehicle, VehicleStatus, VehicleCategory, FuelType } from '../../../services/vehicleService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { getAllBranches, type Branch } from '../../../services/branchService';
import HasPermission from '../../../components/HasPermission';

// ── Status Styles ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'PENDING ENTRY': { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'DOCUMENTS REVIEW': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'INSURANCE VERIFICATION': { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
    'INSPECTION REQUIRED': { bg: 'rgba(236,72,153,0.1)', text: '#ec4899', border: 'rgba(236,72,153,0.3)' },
    'INSPECTION FAILED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'REPAIR IN PROGRESS': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'ACCOUNTING SETUP': { bg: 'rgba(20,184,166,0.1)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
    'GPS ACTIVATION': { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
    'BRANCH MANAGER APPROVAL': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
    'ACTIVE — AVAILABLE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — RENTED': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — MAINTENANCE': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'SUSPENDED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'TRANSFER PENDING': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'TRANSFER COMPLETE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'RETIRED': { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
};

const CATEGORIES = ['Sedan', 'SUV', 'Pickup', 'Van', 'Luxury', 'Commercial'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];

const StatusBadge = ({ status }: { status: VehicleStatus }) => {
    const { t } = useTranslation();
    const style = STATUS_STYLES[status] || STATUS_STYLES['PENDING ENTRY'];
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {t(`management.vehicles.statusLabels.${status}`)}
        </div>
    );
};

type FilterTab = 'ALL' | 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'RETIRED';

const VehicleList = () => {
    const { t } = useTranslation();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        status: undefined as VehicleStatus | undefined,
        branch: '',
        category: undefined as VehicleCategory | undefined,
        fuelType: undefined as FuelType | undefined,
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
    const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

    const navigate = useNavigate();

    const fetchMetadata = useCallback(async () => {
        try {
            const bResponse = await getAllBranches({ limit: 1000 });
            if (bResponse.success) setBranches(bResponse.data);
        } catch (err) {
            console.error('Failed to fetch filter metadata:', err);
        }
    }, []);

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllVehicles(filters);
            if (response.success) {
                setVehicles(response.data);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.operationFailed'));
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1
        }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const handleTabChange = (tab: FilterTab) => {
        setActiveTab(tab);
        let statusFilter: VehicleStatus | undefined = undefined;
        if (tab === 'SUSPENDED') statusFilter = 'SUSPENDED';
        else if (tab === 'RETIRED') statusFilter = 'RETIRED';
        handleFilterChange('status', statusFilter);
    };

    // Tabs for UI (metadata)
    const tabs: { key: FilterTab; label: string }[] = [
        { key: 'ALL', label: t('management.vehicles.tabs.all') },
        { key: 'ONBOARDING', label: t('management.vehicles.tabs.onboarding') },
        { key: 'ACTIVE', label: t('management.vehicles.tabs.active') },
        { key: 'SUSPENDED', label: t('management.vehicles.tabs.suspended') },
        { key: 'RETIRED', label: t('management.vehicles.tabs.retired') },
    ];

    return (
        <div className="container-responsive space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Car size={28} style={{ color: '#C8E600' }} />
                        {t('management.vehicles.title')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchVehicles}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {t('common.refresh')}
                    </button>
                    <HasPermission permission="VEHICLE_CREATE">
                        <button
                            onClick={() => navigate('create')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Plus size={18} />{t('management.vehicles.onboardingBtn')}
                        </button>
                    </HasPermission>
                </div>
            </div>

            <div className="flex gap-1 p-1 rounded-xl overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap"
                        style={{
                            background: activeTab === tab.key ? 'rgba(200,230,0,0.15)' : 'transparent',
                            color: activeTab === tab.key ? '#C8E600' : 'var(--text-dim)',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                        }}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                background: 'rgba(200,230,0,0.2)',
                                color: '#C8E600',
                            }}>
                                {pagination.total}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search and Advanced Filters Toggle */}
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('management.vehicles.searchPlaceholder')}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: showAdvancedFilters ? '#C8E600' : 'var(--text-dim)' }}
                    >
                        {t('management.vehicles.advancedFilters')} {showAdvancedFilters ? '↑' : '↓'}
                    </button>
                </div>

                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl animate-in slide-in-from-top-2 duration-200" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.category')}</label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.vehicles.filters.allCategories')}</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{t(`management.vehicles.categories.${cat}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('sidebar.sections.operations')}</label>
                            <select
                                value={filters.fuelType}
                                onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.vehicles.filters.allFuelTypes')}</option>
                                {FUEL_TYPES.map(fuel => (
                                    <option key={fuel} value={fuel}>{t(`management.vehicles.fuelTypes.${fuel}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.branchName')}</label>
                            <select
                                value={filters.branch}
                                onChange={(e) => handleFilterChange('branch', e.target.value)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.vehicles.filters.allBranches')}</option>
                                {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end pb-0.5">
                            <button
                                onClick={() => setFilters({
                                    ...filters,
                                    search: '',
                                    status: undefined,
                                    branch: '',
                                    category: undefined,
                                    fuelType: undefined,
                                    page: 1
                                })}
                                className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:bg-white/5"
                                style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.resetFilters')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Car size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">{t('management.vehicles.empty.noVehicles')}</p>
                            <p className="text-sm mt-1">{t('management.vehicles.empty.refine')}</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.vehicle')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.vin')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.year')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.category')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('common.status')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.price')}</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-right" style={{ color: 'var(--text-dim)' }}>{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicles.map((v) => (
                                        <tr
                                            key={v._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)' }}
                                            onClick={() => navigate(v._id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {v.basicDetails?.make || '—'} {v.basicDetails?.model || ''}
                                                    {v.basicDetails?.colour && (
                                                        <div className="w-3 h-3 rounded-full border border-white/10" style={{ background: v.basicDetails.colour.toLowerCase() }} />
                                                    )}
                                                </div>
                                                <div className="text-[10px] mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase tracking-wider">
                                                        {v.basicDetails?.fuelType ? t(`management.vehicles.fuelTypes.${v.basicDetails.fuelType}`) : '—'}
                                                    </span>
                                                    <span>{v.basicDetails?.transmission || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-mono" style={{ color: 'var(--text-main)' }}>{v.basicDetails?.vin || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{v.basicDetails?.year || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm" style={{ color: 'var(--text-main)' }}>
                                                    {v.basicDetails?.category ? t(`management.vehicles.categories.${v.basicDetails.category}`) : '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={v.status} />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {v.purchaseDetails.currency} {v.purchaseDetails.purchasePrice.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 text-right">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(v._id); }}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-lime/20 active:scale-95 ml-auto"
                                                        style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600' }}
                                                        title={t('common.view')}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <div className="text-xs font-black tracking-widest uppercase opacity-60" style={{ color: 'var(--text-dim)' }}>
                                    {t('management.vehicles.pagination.showing', { count: vehicles.length, total: pagination.total })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={filters.page === 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                        className="p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)' }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        {[...Array(pagination.totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => handlePageChange(i + 1)}
                                                className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${filters.page === i + 1 ? 'shadow-lg shadow-lime/20 scale-105' : 'hover:bg-white/10 opacity-50 hover:opacity-100'}`}
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
                                        className="p-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)' }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleList;
