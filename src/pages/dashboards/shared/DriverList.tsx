import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, FileText, ChevronRight, Calendar, ChevronDown, RefreshCw, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { driverService, type Driver, type DriverFilters, type PaginationMetadata } from '../../../services/driverService';
import { getAllBranches, type Branch } from '../../../services/branchService';

const DriverList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
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

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDrivers();
        }, searchTerm ? 500 : 0);
        return () => clearTimeout(timer);
    }, [currentPage, statusFilter, branchFilter, startDate, endDate, sortBy, sortOrder, searchTerm]);

    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const data = await getAllBranches();
                setBranches(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };
        fetchBranchesData();
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const filters: DriverFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchTerm.trim()) filters.search = searchTerm.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await driverService.getAllDrivers(filters);
            setDrivers(res.data || []);
            setPagination(res.pagination);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-red-100 text-red-700';
            case 'PENDING REVIEW':
            case 'VERIFICATION':
            case 'CREDIT CHECK': 
            case 'MANAGER REVIEW':
            case 'CONTRACT PENDING': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
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
        <div className="p-6 container-responsive space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>{t('management.drivers.title')}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>{t('management.drivers.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDrivers}
                        className="p-2.5 rounded-xl border transition-all hover:bg-lime/5 disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title={t('common.refresh')}
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
                        onClick={() => navigate('new')}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg border-none"
                        style={{ 
                            backgroundColor: 'var(--brand-lime)', 
                            color: 'var(--brand-black)' 
                        }}
                    >
                        <Plus size={20} /> {t('management.drivers.newBtn')}
                    </button>
                </div>
            </div>

            {/* Toolbar / Filters */}
            <div className="p-6 rounded-2xl border mb-8 space-y-4 transition-colors shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={20} style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder={t('management.drivers.searchPlaceholder')}
                        className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-bold shadow-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t transition-all animate-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--border-main)' }}>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.status')} />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.drivers.filters.allStatuses')}</option>
                                {['DRAFT', 'PENDING REVIEW', 'VERIFICATION', 'CREDIT CHECK', 'MANAGER REVIEW', 'APPROVED', 'CONTRACT PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map(status => (
                                    <option key={status} value={status}>{t(`management.drivers.statusLabels.${status}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.branch')} />
                            <select
                                value={branchFilter}
                                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.common.modal.selectBranch')}</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.from')} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-3 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.to')} />
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

            {/* Drivers Table */}
            <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <tr>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('personalInfo.fullName')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.drivers.table.driver')} <SortIcon field="personalInfo.fullName" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('common.status')} <SortIcon field="status" />
                                    </div>
                                </th>
                                <th className="px-6 py-4">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.drivers.table.license')}</span>
                                </th>
                                <th className="px-6 py-4 cursor-pointer group" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.drivers.table.applied')} <SortIcon field="createdAt" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}></td>
                                    </tr>
                                ))
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-dim)' }}>
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={40} style={{ opacity: 0.2 }} />
                                            <p>{t('management.drivers.empty.noDrivers')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr
                                        key={driver._id}
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={() => navigate(driver._id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all group-hover:scale-110" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    {(driver.personalInfo?.fullName?.[0] || 'D')}
                                                </div>
                                                <div>
                                                    <div className="font-semibold transition-colors" style={{ color: 'var(--text-main)' }}>
                                                        {driver.personalInfo?.fullName}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{driver.personalInfo?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(driver.status)}`}>
                                                {t(`management.drivers.statusLabels.${driver.status}`)}
                                            </span>
                                        </td>
                                         <td className="px-6 py-4">
                                             <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                 <FileText size={14} />
                                                 {driver.drivingLicense?.licenseNumber || 'N/A'}
                                             </div>
                                             <div className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('management.drivers.table.expiry')}: {driver.drivingLicense?.expiryDate ? new Date(driver.drivingLicense.expiryDate).toLocaleDateString() : 'N/A'}</div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                                 <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                                                 {new Date(driver.appliedAt).toLocaleDateString()}
                                             </div>
                                         </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}>
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                            {t('management.drivers.pagination.showing', { count: drivers.length, total: pagination.total })}
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
                                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
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
        </div>
    );
};

export default DriverList;
