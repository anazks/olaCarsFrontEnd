import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Bill } from '../../../../services/billService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import CreateBillModal from './CreateBillModal';

const BillList = () => {
    const navigate = useNavigate();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await billService.getAllBills();
            setBills(res.data);
        } catch (err: any) {
            console.error('Failed to fetch bills:', err);
        } finally {
            setLoading(false);
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
        setCurrentPage(1);
    };

    const filteredBills = bills.filter(b => 
        b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        (typeof b.supplier === 'object' && b.supplier && b.supplier.name.toLowerCase().includes(search.toLowerCase())) ||
        (b.notes && b.notes.toLowerCase().includes(search.toLowerCase()))
    );

    // Pagination math
    const totalRecords = filteredBills.length;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedBills = filteredBills.slice(startIndex, startIndex + pageSize);

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

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '/admin/financial-admin' }, { label: 'Bills', active: true }]} />

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
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
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
                    <button className="px-6 py-3 rounded-2xl border flex items-center gap-2 font-bold transition-all hover:bg-white/5 bg-transparent cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
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
        </div>
    );
};

export default BillList;
