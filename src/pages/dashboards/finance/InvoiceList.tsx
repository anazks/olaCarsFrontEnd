import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    FileText, RefreshCw, Filter, Search, CheckCircle2, 
    Clock, AlertCircle, Eye, ChevronLeft, ChevronRight, Calendar, Plus,
    ArrowUpDown, ArrowUp, ArrowDown, Trash2, Settings
} from 'lucide-react';
import { getInvoicesRegistry, deleteInvoice, deleteAllInvoices } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceSettingsModal from './InvoiceSettingsModal';
import BulkInvoiceUpload from '../shared/BulkInvoiceUpload';
import { getUserRole } from '../../../utils/auth';

const InvoiceList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = getUserRole();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        if (location.state?.search) {
            setSearchQuery(location.state.search);
        }
    }, [location.state]);
    
    // Server Pagination
    const [page, setPage] = useState(1);
    const limit = 25;
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const [sortBy, setSortBy] = useState('dueDate');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, sortBy, sortOrder, startDate, endDate, statusFilter]);

    const handlePageChange = (pageNum: number) => {
        setPage(pageNum);
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = { page, limit, sortBy, sortOrder };
            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            
            const res = await getInvoicesRegistry(filters);
            console.log('[InvoiceList] API Response:', res);
            if (res) {
                // Direct extraction from Invoice model response
                const data = res.data || res;
                const dataArray = Array.isArray(data) ? data : [];
                setInvoices(dataArray);
                
                const pag = res.pagination || {};
                setPagination({
                    total: pag.totalItems || dataArray.length,
                    pages: pag.totalPages || 1
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load');
            toast.error('Error syncing invoices');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, limit, sortBy, sortOrder, startDate, endDate, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRowClick = (id: string) => {
        navigate(`./${id}`);
    };



    const handleDeleteInvoice = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this invoice?')) return;
        try {
            await deleteInvoice(id);
            toast.success('Invoice deleted successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('CRITICAL: Are you sure you want to delete ALL invoices? This action cannot be undone.')) return;
        try {
            await deleteAllInvoices();
            toast.success('All invoices deleted successfully');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete all invoices');
        }
    };


    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Invoices', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Uniform Compact Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Invoice Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage vehicle rental leases and record operator payments.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => setShowSettingsModal(true)} 
                            className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            title="Automation Settings"
                        >
                            <Settings size={14} />
                        </button>

                        {userRole !== 'admin' && (
                        <button 
                            onClick={handleDeleteAll}
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-300 border border-rose-500/20 cursor-pointer"
                        >
                            <Trash2 size={13} strokeWidth={2.5}/> Delete All
                        </button>
                    )}
                    
                        <button 
                            onClick={() => setShowBulkUpload(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-main)' }}
                        >
                            <FileText size={14} strokeWidth={3} />
                            Bulk Upload
                        </button>

                        <button 
                            onClick={() => setShowCreateModal(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            New Invoice
                        </button>
                    
                    </div>
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
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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
                    <div className="relative flex-shrink-0">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} style={{ color: 'var(--text-dim)' }} />
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer select-none"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="ALL" style={{background: 'var(--bg-card)'}}>ALL STATUSES</option>
                            <option value="PENDING" style={{background: 'var(--bg-card)'}}>PENDING</option>
                            <option value="PARTIAL" style={{background: 'var(--bg-card)'}}>PARTIAL</option>
                            <option value="PAID" style={{background: 'var(--bg-card)'}}>PAID</option>
                            <option value="OVERDUE" style={{background: 'var(--bg-card)'}}>OVERDUE</option>
                        </select>
                    </div>
                    </div>
                </div>

                {/* Unified Grid Canvas */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-3 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left w-[12%] group cursor-pointer select-none" onClick={() => handleSort('invoiceNumber')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Invoice Number <SortIcon field="invoiceNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[15%]">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Description / Type
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[20%] group cursor-pointer select-none" onClick={() => handleSort('driver')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Driver Details <SortIcon field="driver" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[10%] group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('totalAmountDue')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Gross Billed <SortIcon field="totalAmountDue" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('amountPaid')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Net Settled <SortIcon field="amountPaid" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('balance')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Current Balance <SortIcon field="balance" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('vehicle')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Vehicle / Fleet <SortIcon field="vehicle" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[12%]">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Node Location
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[12%] group cursor-pointer select-none" onClick={() => handleSort('dueDate')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <Calendar size={12}/> Due Date <SortIcon field="dueDate" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[5%] text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Decrypting Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={11} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <AlertCircle className="text-rose-500 mx-auto mb-2" size={28} />
                                                <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No statements recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Try adjusting search queries or dynamic filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice, index) => (
                                        <tr 
                                            key={invoice._id} 
                                            onClick={() => handleRowClick(invoice._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1 + (page - 1) * limit).toString().padStart(2, '0')}</td>
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{invoice.invoiceNumber}</span>
                                                    <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5 opacity-60">ID: {invoice._id?.slice(-8)}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold truncate max-w-[150px]" style={{ color: 'var(--text-main)' }}>
                                                        {(invoice as any).description || invoice.notes || (invoice.invoiceType === 'RENTAL' ? `Rent ${invoice.weekLabel || ''}` : 'Manual Entry')}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${invoice.invoiceType === 'RENTAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                            {invoice.invoiceType || 'RENTAL'}
                                                        </span>
                                                        {invoice.invoiceType === 'RENTAL' && (
                                                            <span className="text-[9px] font-black text-dim uppercase tracking-wider">{invoice.weekLabel || 'Cycle'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">
                                                            {(invoice.driver?.personalInfo?.fullName || 'OP').slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight">
                                                            {invoice.driver?.personalInfo?.fullName || 'System Pool'}
                                                        </span>
                                                        <span className="text-[9px] font-mono font-semibold text-dim uppercase tracking-widest mt-0.5">
                                                            {invoice.driver?.driverId || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={invoice.status} />
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                ${invoice.totalAmountDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold text-emerald-400">
                                                ${invoice.amountPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                <span className={invoice.balance > 0 ? (invoice.status === 'OVERDUE' ? 'text-rose-500' : 'text-amber-400') : 'text-emerald-400'}>
                                                    ${invoice.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {invoice.vehicle?.legalDocs?.registrationNumber || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-dim">
                                                        Fleet #{invoice.vehicle?.basicDetails?.fleetNumber || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {invoice.driver?.branch?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-dim">
                                                        {invoice.driver?.branch?.country || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleRowClick(invoice._id)}
                                                        className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                        title="Inspect Invoice Document"
                                                    >
                                                        <Eye size={14} strokeWidth={2.5} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteInvoice(invoice._id)}
                                                        className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-rose-500 hover:border-rose-500/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={14} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Numbered Pagination */}
                    {!loading && invoices.length > 0 && pagination && pagination.pages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {invoices.length} of {pagination.total} statements
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                        let pageNum: number;
                                        if (pagination.pages <= 5) pageNum = i + 1;
                                        else if (page <= 3) pageNum = i + 1;
                                        else if (page >= pagination.pages - 2) pageNum = pagination.pages - 4 + i;
                                        else pageNum = page - 2 + i;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === pageNum ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                                style={{ 
                                                    background: page === pageNum ? 'var(--brand-lime)' : 'transparent',
                                                    color: page === pageNum ? '#000' : 'var(--text-main)',
                                                    border: page === pageNum ? 'none' : '1px solid var(--border-main)'
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === pagination.pages || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <CreateInvoiceModal 
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchData();
                    }}
                />
            )}

            {showSettingsModal && (
                <InvoiceSettingsModal 
                    onClose={() => setShowSettingsModal(false)}
                />
            )}

            <BulkInvoiceUpload 
                isOpen={showBulkUpload} 
                onClose={() => setShowBulkUpload(false)} 
                onSuccess={() => {
                    setShowBulkUpload(false);
                    fetchData();
                }} 
            />
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
