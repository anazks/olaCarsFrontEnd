import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, Search, Filter, ChevronRight, ChevronLeft, RefreshCw, 
    ArrowUpDown, ArrowUp, ArrowDown, DollarSign, FileText, UserPlus
} from 'lucide-react';
import { driverService, type Driver, type DriverFilters, type PaginationMetadata } from '../../../../services/driverService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import { getUserRole } from '../../../../utils/auth';

const Customers = () => {
    const navigate = useNavigate();
    const userRole = getUserRole();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

    const getPageNumbers = () => {
        const totalPages = pagination?.totalPages || 1;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, page - 1);
        let end = Math.min(totalPages - 1, page + 1);

        if (page <= 3) {
            end = 4;
        }
        if (page >= totalPages - 2) {
            start = totalPages - 3;
        }

        if (start > 2) {
            pages.push('...');
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push('...');
        }

        pages.push(totalPages);
        return pages;
    };

    // Debounce Search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, branchFilter, sortBy, sortOrder, startDate, endDate]);

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

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const filters: DriverFilters = {
                page,
                limit,
                sortBy,
                sortOrder
            };

            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await driverService.getAllDrivers(filters);
            setDrivers(res.data || []);
            setPagination(res.pagination);
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            setError(error.message || 'Failed to load customers');
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, limit, sortBy, sortOrder, statusFilter, branchFilter, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-white/5 text-dim border-white/10';
        }
    };

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Customers', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Users size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Customer Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage and view all registered customers and their financial status</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={fetchData} 
                            className="p-2 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={() => navigate('../invoices')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="opacity-70" /> Invoices
                        </button>

                        <button
                            onClick={() => navigate('../payments-received')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <DollarSign size={14} className="opacity-70" /> Payments
                        </button>

                        <button
                                onClick={() => navigate('../../shared/drivers/create')}
                                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-lime text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300"
                                style={{ background: 'var(--brand-lime)' }}
                            >
                                <UserPlus size={14} /> Add Customer
                            </button>
                    </div>
                </div>

                {/* Filters Section (Following Invoice Registry design) */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or customer ID..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL STATUSES</option>
                                    {['ACTIVE', 'PENDING REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL BRANCHES</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">To</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('personalInfo.fullName')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer Details <SortIcon field="personalInfo.fullName" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('driverId')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer ID <SortIcon field="driverId" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact Info</div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch / Region</div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Registered <SortIcon field="createdAt" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Fetching Customers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <p className="text-xs font-black uppercase text-rose-500">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : drivers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <p className="text-xs font-black tracking-widest">No customers found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    drivers.map((driver, index) => (
                                        <tr 
                                            key={driver._id} 
                                            onClick={() => navigate(driver._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-5 px-6 font-semibold text-dim opacity-50">{(index + 1 + (page - 1) * limit).toString().padStart(2, '0')}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">
                                                            {driver.personalInfo.fullName[0].toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight text-white" style={{ color: 'var(--text-main)' }}>
                                                            {driver.personalInfo.fullName}
                                                        </span>
                                                        <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5 opacity-60">
                                                            Joined {new Date(driver.createdAt || driver.appliedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                {driver.driverId || 'TEMP-ID'}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo.phone}</span>
                                                    <span className="text-[9px] text-dim lowercase mt-0.5">{driver.personalInfo.email}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                        {(driver.branch as any)?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-dim tracking-widest mt-0.5">
                                                        {(driver.branch as any)?.city || (driver.branch as any)?.country || 'Global'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(driver.status)}`}>
                                                    {driver.status}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center text-dim font-bold">
                                                {new Date(driver.createdAt || driver.appliedAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <button className="p-2 bg-white/5 border border-white/10 text-dim hover:text-brand-lime hover:border-brand-lime/30 rounded-xl transition-all duration-300">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && drivers.length > 0 && pagination && pagination.totalPages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {drivers.length} of {pagination.total} customers
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((p, index) => {
                                        if (p === '...') {
                                            return (
                                                <span key={`ell-${index}`} className="px-2 text-dim text-xs font-black select-none">
                                                    ...
                                                </span>
                                            );
                                        }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setPage(Number(p))}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === p ? 'bg-brand-lime text-black shadow-lg scale-110' : 'text-dim hover:bg-white/5 border border-white/5'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Customers;
