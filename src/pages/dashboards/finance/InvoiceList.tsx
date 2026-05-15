import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FileText, RefreshCw, Filter, Search, CheckCircle2, 
    Clock, AlertCircle, Eye, ChevronLeft, ChevronRight, DollarSign, Calendar
} from 'lucide-react';
import { getInvoices } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const InvoiceList = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    
    // Server Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = { page, limit };
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (debouncedSearch) filters.search = debouncedSearch;
            
            const response = await getInvoices(filters);
            if (response && response.data) {
                setInvoices(response.data || []);
                if (response.pagination) {
                    setPagination({
                        total: response.pagination.totalItems || 0,
                        pages: response.pagination.totalPages || 1
                    });
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load');
            toast.error('Error syncing invoices');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, debouncedSearch, page, limit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRowClick = (id: string) => {
        navigate(`./${id}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
    };

    return (
        <div className="container-responsive flex flex-col h-[calc(100vh-110px)] overflow-hidden pb-4">
            <div className="flex-shrink-0 mb-4">
                <Breadcrumbs 
                    items={[
                        { label: 'Sales', path: '#' },
                        { label: 'Invoices', active: true }
                    ]} 
                />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden space-y-6 animate-in fade-in duration-500">
                
                {/* Uniform Compact Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Invoice Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage vehicle rental leases and record operator payments.</p>
                    </div>
                    <button 
                        onClick={() => fetchData()} 
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-lg select-none cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Sync Ledger
                    </button>
                </div>

                {/* Unified Search and Filters (Uniform Capsule Design) */}
                <div className="flex flex-col md:flex-row gap-3 flex-shrink-0 select-none">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Search by Invoice No., Operator full name, or custom identifiers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <div className="relative select-none">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" size={14} style={{ color: 'var(--text-dim)' }} />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer select-none"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL" style={{background: 'var(--bg-card)'}}>ALL STATEMENTS</option>
                                <option value="PENDING" style={{background: 'var(--bg-card)'}}>PENDING</option>
                                <option value="PARTIAL" style={{background: 'var(--bg-card)'}}>PARTIALLY PAID</option>
                                <option value="PAID" style={{background: 'var(--bg-card)'}}>SETTLED / PAID</option>
                                <option value="OVERDUE" style={{background: 'var(--bg-card)'}}>OVERDUE</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Unified Grid Canvas with Fixed Scrolling */}
                <div className="flex-1 min-h-0 flex flex-col border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead className="sticky top-0 z-10 select-none shadow-sm" style={{ background: 'var(--bg-input)' }}>
                                <tr className="text-[10px] font-black uppercase tracking-widest border-b border-white/5" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 w-[15%]">Invoice Ref</th>
                                    <th className="py-4 px-6 w-[25%]">Operator / Driver</th>
                                    <th className="py-4 px-6 w-[15%]"><div className="flex items-center gap-1"><Calendar size={12}/> Due Date</div></th>
                                    <th className="py-4 px-6 text-right w-[15%]"><div className="flex items-center justify-end gap-1"><DollarSign size={12}/> Total Amount</div></th>
                                    <th className="py-4 px-6 text-right w-[15%]"><div className="flex items-center justify-end gap-1"><DollarSign size={12}/> Balance</div></th>
                                    <th className="py-4 px-6 text-center w-[10%]">Status</th>
                                    <th className="py-4 px-6 text-center w-[5%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Decrypting Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <AlertCircle className="text-rose-500 mx-auto mb-2" size={28} />
                                                <p className="text-xs font-black text-white uppercase">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No statements recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Try adjusting search queries or dynamic filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice) => (
                                        <tr 
                                            key={invoice._id} 
                                            onClick={() => handleRowClick(invoice._id)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer active:bg-white/[0.04]"
                                        >
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide text-white font-black">{invoice.invoiceNumber}</span>
                                                    <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5">{invoice.weekLabel || 'Cycle'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">{(typeof invoice.driver === 'object' ? (invoice.driver.personalInfo?.fullName || 'OP').slice(0,2) : 'OP').toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight">{typeof invoice.driver === 'object' ? invoice.driver.personalInfo?.fullName : 'System Pool'}</span>
                                                        <span className="text-[9px] font-mono font-semibold text-dim uppercase tracking-widest mt-0.5">{typeof invoice.driver === 'object' ? invoice.driver.driverId : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                ${invoice.totalAmountDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                <span className={invoice.balance > 0 ? (invoice.status === 'OVERDUE' ? 'text-rose-500' : 'text-amber-400') : 'text-emerald-400'}>
                                                    ${invoice.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={invoice.status} />
                                            </td>
                                            <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => handleRowClick(invoice._id)}
                                                        className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                        title="Inspect Invoice Document"
                                                    >
                                                        <Eye size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Uniform Capsule Pagination Footer */}
                    {!loading && invoices.length > 0 && pagination && (
                        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t flex-shrink-0 shadow-2xl select-none" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.05)' }}>
                            <div className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>
                                Showing <span style={{ color: 'var(--text-main)' }}>{invoices.length}</span> of <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> entries
                            </div>
                            
                            <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-2xl border shadow-inner" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => handlePageChange(page - 1)}
                                    className="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-card)] active:scale-95"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={16} strokeWidth={3} />
                                </button>
                                
                                <div className="flex items-center gap-2 px-3">
                                    <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>Page {page}</span>
                                    <span className="text-sm font-bold opacity-40" style={{ color: 'var(--text-main)' }}>/ {pagination.pages || 1}</span>
                                </div>

                                <button
                                    disabled={page === pagination.pages || pagination.pages === 0}
                                    onClick={() => handlePageChange(page + 1)}
                                    className="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-card)] active:scale-95"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PAID': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none"><CheckCircle2 size={10} strokeWidth={3}/> Paid</span>;
        case 'PARTIAL': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/20 select-none"><Clock size={10} strokeWidth={3}/> Partial</span>;
        case 'OVERDUE': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none"><AlertCircle size={10} strokeWidth={3}/> Overdue</span>;
        default: return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-white/5 text-[#A3A3A3] border-white/10 select-none">Pending</span>;
    }
};

export default InvoiceList;
