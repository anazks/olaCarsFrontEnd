import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Receipt, 
    Search, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Plus,
    Eye,
    RefreshCw
} from 'lucide-react';
import * as billService from '../../../../services/billService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import CreateBillModal from './CreateBillModal';
import type { RootState } from '../../../../store';
import { setFinanceDashboardData } from '../../../../store/dashboardSlice';

const BillList = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Redux store integration for caching
    const financeState = useSelector((state: RootState) => state.dashboard.finance);
    const reduxBills = financeState.liveData.bills;
    const isLoaded = financeState.isLoaded;

    const [loading, setLoading] = useState(!isLoaded || reduxBills.length === 0);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters states
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterFromDate, setFilterFromDate] = useState<string>('');
    const [filterToDate, setFilterToDate] = useState<string>('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [backendMetrics, setBackendMetrics] = useState({
        totalBilled: 0,
        totalBalanceDue: 0,
        openCount: 0,
        partialCount: 0,
        paidCount: 0,
        isFilteredPeriod: false
    });
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset pagination to page 1 if search or other filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filterMonth, filterYear, filterFromDate, filterToDate]);

    useEffect(() => {
        fetchBills();
    }, [currentPage, pageSize, debouncedSearch, filterMonth, filterYear, filterFromDate, filterToDate]);

    const fetchBills = async () => {
        setRefreshing(true);
        try {
            const res = await billService.getAllBills({
                page: currentPage,
                limit: pageSize,
                search: debouncedSearch,
                month: filterMonth,
                year: filterYear,
                fromDate: filterFromDate,
                toDate: filterToDate
            });
            dispatch(setFinanceDashboardData({
                liveData: {
                    ...financeState.liveData,
                    bills: res.data || []
                }
            }));
            if (res.pagination) {
                setTotalRecords(res.pagination.totalItems);
            } else {
                setTotalRecords(res.data?.length || 0);
            }
            if (res.metrics) {
                setBackendMetrics(res.metrics);
            }
        } catch (err: any) {
            console.error('Failed to fetch bills:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const statusColors: any = {
        OPEN: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={12} /> },
        PARTIALLY_PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <ArrowUpRight size={12} /> },
        PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={12} /> },
        VOID: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <AlertCircle size={12} /> }
    };

    // Reset page to 1 when search changes
    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedBills = reduxBills || [];

    const handlePageChange = (pageNum: number) => {
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        }
    };

    // Calculate up to 5 page numbers to show
    const getPageNumbers = () => {
        const pagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
        let endPage = startPage + pagesToShow - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - pagesToShow + 1);
        }

        const pages = [];
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    const metrics = backendMetrics;

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '/admin/financial-admin' }, { label: 'Bills', active: true }]} />

            {/* Small Dashboard Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Total Billed */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Receipt size={16} className="opacity-60 text-main animate-pulse" style={{ color: '#C8E600' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Total Billed (Filtered Period)' : 'Total Billed (Last 30 Days)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: 'var(--text-main)' }}>
                            ${metrics.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Filtered custom billing total' : 'Total amount of purchase bills generated'}
                        </p>
                    </div>

                    {/* Card 2: Balance Due */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="opacity-60 text-main" style={{ color: '#f59e0b' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Balance Due (Filtered Period)' : 'Balance Due (Last 30 Days)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2 text-orange-400" style={{ color: '#f59e0b' }}>
                            ${metrics.totalBalanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Pending vendor payables in period' : 'Pending vendor payables from last 30 days'}
                        </p>
                    </div>

                    {/* Card 3: Status Breakdown */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="opacity-60 text-main" style={{ color: '#C8E600' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Statuses (Filtered Period)' : 'Statuses (Last 30 Days)'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-[9px] font-black text-amber-500 uppercase">Open</p>
                                <p className="text-base font-black mt-0.5" style={{ color: 'var(--text-main)' }}>{metrics.openCount}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <p className="text-[9px] font-black text-blue-400 uppercase">Partial</p>
                                <p className="text-base font-black mt-0.5" style={{ color: 'var(--text-main)' }}>{metrics.partialCount}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20">
                                <p className="text-[9px] font-black text-green-400 uppercase">Paid</p>
                                <p className="text-base font-black mt-0.5" style={{ color: 'var(--text-main)' }}>{metrics.paidCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Collapsible Filter Panel */}
            {isFilterPanelOpen && (
                <div className="border rounded-[2rem] p-6 space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Filter Bills</h3>
                        <button 
                            type="button"
                            onClick={() => {
                                setFilterMonth('');
                                setFilterYear('');
                                setFilterFromDate('');
                                setFilterToDate('');
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-lime hover:opacity-80 transition-all bg-transparent border-none cursor-pointer"
                            style={{ color: '#C8E600' }}
                        >
                            Reset Filters
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Month Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Month</label>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">All Months</option>
                                <option value="1">January</option>
                                <option value="2">February</option>
                                <option value="3">March</option>
                                <option value="4">April</option>
                                <option value="5">May</option>
                                <option value="6">June</option>
                                <option value="7">July</option>
                                <option value="8">August</option>
                                <option value="9">September</option>
                                <option value="10">October</option>
                                <option value="11">November</option>
                                <option value="12">December</option>
                            </select>
                        </div>

                        {/* Year Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Year</label>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">All Years</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>From Date</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* To Date */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>To Date</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Purchase Bills</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Manage, verify, and track your vendor bills</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchBills}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 active:scale-95 cursor-pointer bg-transparent"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        title="Refresh bills list"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-lg cursor-pointer"
                        style={{ background: '#C8E600', color: '#111', border: 'none' }}
                    >
                        <Plus size={16} /> Create Bill
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-main" size={18} />
                    <input
                        type="text"
                        placeholder="Search by bill number, supplier, or notes..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-[#C8E600]/50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-4 py-3 rounded-2xl border font-bold outline-none cursor-pointer text-xs"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                    <button 
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`px-6 py-3 rounded-2xl border flex items-center gap-2 font-bold transition-all hover:bg-white/5 bg-transparent cursor-pointer ${isFilterPanelOpen ? 'bg-white/5 border-brand-lime' : ''}`}
                        style={{ borderColor: isFilterPanelOpen ? '#C8E600' : 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Filter size={18} /> Filters
                    </button>
                </div>
            </div>

            {/* Main Table / Loader Container */}
            <div className="border shadow-lg rounded-[2rem] overflow-hidden" 
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            <p style={{ color: 'var(--text-dim)' }}>Loading bills...</p>
                        </div>
                    ) : totalRecords === 0 ? (
                        <div className="py-20 text-center">
                            <Receipt size={48} className="mx-auto mb-4 opacity-10 text-main" />
                            <p className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>No bills found</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead>
                                <tr className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    <th className="py-4 px-4 font-bold text-center w-12">SL</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Bill Number</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Supplier</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Bill Date</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Due Date</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-right">Total Amount</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-right">Balance Due</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {paginatedBills.map((bill, index) => {
                                    const s = statusColors[bill.status] || statusColors.OPEN;
                                    const supplierName = typeof bill.supplier === 'object' && bill.supplier
                                        ? bill.supplier.name 
                                        : 'Unresolved Supplier';

                                    return (
                                        <tr 
                                            key={bill._id}
                                            onClick={() => navigate(`${bill._id}`)}
                                            className="transition-colors cursor-pointer hover:bg-white/[0.02]"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                        >
                                            <td className="py-4 px-4 text-center text-gray-500 font-semibold">
                                                {String(startIndex + index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-4 px-5 font-black text-sm">
                                                {bill.billNumber}
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="font-bold">{supplierName}</div>
                                                {bill.notes && bill.notes.toLowerCase().includes('vendor') && (
                                                    <div className="text-[9px] text-orange-400/80 font-semibold tracking-wide italic max-w-xs truncate">
                                                        Unresolved vendor info saved in notes
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="opacity-40" />
                                                    {new Date(bill.billDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="opacity-40" />
                                                    {new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-right font-black text-sm">
                                                ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-5 text-right font-black text-sm text-[#C8E600]">
                                                ${bill.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                                     style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                                    {s.icon} {bill.status.replace('_', ' ')}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`${bill._id}`)}
                                                    className="p-2 bg-white/5 border border-white/10 text-dim hover:text-[#C8E600] hover:border-[#C8E600]/30 rounded-xl cursor-pointer hover:scale-[1.05] active:scale-95 transition-all duration-300 flex items-center justify-center mx-auto"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination footer */}
                {!loading && totalRecords > 0 && totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" 
                         style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold text-dim">
                            Showing {paginatedBills.length} of {totalRecords} bills
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((pageNum) => (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${currentPage === pageNum ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                        style={{ 
                                            background: currentPage === pageNum ? '#C8E600' : 'transparent',
                                            color: currentPage === pageNum ? '#000' : 'var(--text-main)',
                                            border: currentPage === pageNum ? 'none' : '1px solid var(--border-main)'
                                        }}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                            </div>
                            
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <CreateBillModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSuccess={fetchBills} 
            />
        </div>
    );
};

export default BillList;
