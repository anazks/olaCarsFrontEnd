import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, Filter, X, FileText, RefreshCw, 
    AlertCircle, User, DollarSign, CheckCircle2,
    Eye, ChevronLeft, ChevronRight, Calendar,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import { 
    getAllCreditNotes, 
    createCreditNote, 
    type CreditNote 
} from '../../../../services/creditNoteService';
import { getAllDrivers } from '../../../../services/driverService';
import { getInvoicesByDriver, getPendingInvoicesByDriver } from '../../../../services/invoiceService';
import toast from 'react-hot-toast';

const CreditNotes = () => {
    const navigate = useNavigate();
    
    // Unified Listing
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Server-Side Pagination
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
    const [driverInvoices, setDriverInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
    
    // Issuance Form States
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [creditNoteDate, setCreditNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState<boolean>(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch, sortBy, sortOrder, startDate, endDate]);

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

    const fetchCreditNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit, sortBy, sortOrder };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            
            const res = await getAllCreditNotes(params);
            if (res) {
                const dataArray = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : []);
                setCreditNotes(dataArray);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
            }
        } catch (e) {
            console.error("Sync error:", e);
            toast.error("Failed syncing credit notes.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, debouncedSearch, sortBy, sortOrder, startDate, endDate]);

    useEffect(() => {
        fetchCreditNotes();
    }, [fetchCreditNotes]);

    // Fetch drivers for Issuance
    useEffect(() => {
        if (isCreateModalOpen && drivers.length === 0) {
            const loadDrivers = async () => {
                setLoadingDrivers(true);
                try {
                    const res = await getAllDrivers();
                    // Adjust mapping structure based on typical driver response
                    setDrivers(res?.data || res || []);
                } catch (err) {
                    console.error("Driver load error", err);
                } finally {
                    setLoadingDrivers(false);
                }
            };
            loadDrivers();
        }
    }, [isCreateModalOpen, drivers.length]);

    // Specific driver's invoices for the modal
    const [invoiceSort, setInvoiceSort] = useState<'date' | 'number'>('date');
    const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceDateFilter, setInvoiceDateFilter] = useState('');

    useEffect(() => {
        if (selectedDriverId) {
            const loadInvoices = async () => {
                setLoadingInvoices(true);
                try {
                    // Use getInvoicesByDriver to see all (Paid/Unpaid)
                    const res = await getInvoicesByDriver(selectedDriverId);
                    setDriverInvoices(res || []);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoadingInvoices(false);
                }
            };
            loadInvoices();
            setSelectedInvoiceId('');
            setInvoiceSearch('');
            setInvoiceDateFilter('');
        } else {
            setDriverInvoices([]);
            setSelectedInvoiceId('');
        }
    }, [selectedDriverId]);

    const sortedDriverInvoices = useMemo(() => {
        if (!Array.isArray(driverInvoices)) return [];
        
        let filtered = [...driverInvoices];

        // 1. Search Filter
        if (invoiceSearch.trim()) {
            const q = invoiceSearch.toLowerCase();
            filtered = filtered.filter(i => i.invoiceNumber.toLowerCase().includes(q));
        }

        // 2. Date Filter
        if (invoiceDateFilter) {
            filtered = filtered.filter(i => {
                const d = new Date(i.dueDate || i.createdAt).toISOString().split('T')[0];
                return d === invoiceDateFilter;
            });
        }

        // 3. Sorting
        return filtered.sort((a, b) => {
            if (invoiceSort === 'date') {
                const dateA = new Date(a.dueDate || a.createdAt).getTime();
                const dateB = new Date(b.dueDate || b.createdAt).getTime();
                return invoiceSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                return invoiceSortOrder === 'desc' 
                    ? b.invoiceNumber.localeCompare(a.invoiceNumber)
                    : a.invoiceNumber.localeCompare(b.invoiceNumber);
            }
        });
    }, [driverInvoices, invoiceSort, invoiceSortOrder, invoiceSearch, invoiceDateFilter]);

    const handleRowClick = (id: string) => {
        navigate(`./${id}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
    };

    const handleCreateCreditNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDriverId || !amount || !reason) {
            toast.error("Fill mandatory fields.");
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                driverId: selectedDriverId,
                amount: Number(amount),
                reason,
                notes,
                creditNoteDate
            };
            if (selectedInvoiceId) {
                payload.invoiceId = selectedInvoiceId;
            }
            const res = await createCreditNote(payload);
            if (res.success) {
                toast.success("Credit Note issued in registry!");
                await fetchCreditNotes();
                resetForm();
                setIsCreateModalOpen(false);
            }
        } catch (e) { 
            console.error(e); 
            toast.error("Failed issuing credit note.");
        } finally { 
            setSubmitting(false); 
        }
    };

    const resetForm = () => {
        setSelectedDriverId('');
        setSelectedInvoiceId('');
        setAmount('');
        setReason('');
        setNotes('');
        setCreditNoteDate(new Date().toISOString().split('T')[0]);
    };

    const selectedInvoiceData = useMemo(() => {
        if (!selectedInvoiceId) return null;
        return driverInvoices.find(i => i._id === selectedInvoiceId) || null;
    }, [driverInvoices, selectedInvoiceId]);

    const displayedNotes = creditNotes;

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Credit Notes', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Compact Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-indigo-400" />
                            Credit Notes Ledger
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Execute accounting reversals, lease adjustments, and reconcile active accounts.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => fetchCreditNotes()} 
                            className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            title="Refresh Data"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            Issue Credit
                        </button>
                    </div>
                </div>

                {/* Dynamic Search Capsule */}
                <div className="flex flex-col md:flex-row gap-3 flex-shrink-0 select-none">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={16} style={{ color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Filter ledger registry by note No., operator key, or memo..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <div className="relative select-none">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} style={{ color: 'var(--text-dim)' }} />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer select-none"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL" style={{background: 'var(--bg-card)'}}>ALL REVERSALS</option>
                                <option value="OPEN" style={{background: 'var(--bg-card)'}}>OPEN DRAFTS</option>
                                <option value="CLOSED" style={{background: 'var(--bg-card)'}}>CLOSED / APPLIED</option>
                                <option value="VOID" style={{background: 'var(--bg-card)'}}>VOID REVERSALS</option>
                            </select>
                        </div>
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
                    </div>
                </div>

                {/* Registry Data Grid Wrapper */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('creditNoteNumber')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            CN Number <SortIcon field="creditNoteNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[25%] group cursor-pointer select-none" onClick={() => handleSort('driverId')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Operator <SortIcon field="driverId" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('creditNoteDate')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <Calendar size={12}/> Issued <SortIcon field="creditNoteDate" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[15%] group cursor-pointer select-none" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <DollarSign size={12}/> Amount <SortIcon field="amount" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[10%] group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[5%] text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Querying Credit Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayedNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No credit notes recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Process manual corrections via 'Issue Credit'</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedNotes.map((note) => (
                                        <tr 
                                            key={note._id} 
                                            onClick={() => handleRowClick(note._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide font-black uppercase" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'CN-DRAFT'}</span>
                                                    {note.invoiceId?.invoiceNumber && (
                                                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider mt-0.5 border border-indigo-500/30 bg-indigo-500/5 inline-block px-1.5 py-0.5 rounded self-start">Linked: {note.invoiceId.invoiceNumber}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-indigo-400 text-[10px] font-black">{(note.driverId?.personalInfo?.fullName || 'OP').slice(0,2).toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight">{note.driverId?.personalInfo?.fullName || (note as any).name || 'Legacy Pool'}</span>
                                                        <span className="text-[9px] font-mono font-semibold text-dim uppercase tracking-widest mt-0.5">{note.driverId?.driverId || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {new Date(note.creditNoteDate || note.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm text-indigo-400">
                                                ${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={note.status} />
                                            </td>
                                            <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => handleRowClick(note._id)}
                                                    className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                    title="Open Reversal Document"
                                                >
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Numbered Pagination */}
                    {!loading && displayedNotes.length > 0 && pagination && pagination.pages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Page {page} of {pagination.pages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${page === pageNum ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
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

            {/* ================= ISSUE CREDIT NOTE MODAL ================= */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}></div>
                    <div className="relative w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl animate-in zoom-in-95 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        
                        <div className="flex items-center justify-between p-6 border-b bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <FileText size={20} className="text-brand-lime" /> Issue Credit Note
                                </h2>
                                <p className="text-xs text-dim">Manual ledger adjustment.</p>
                            </div>
                            <button onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="p-2 text-dim hover:text-main rounded-xl transition-all"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleCreateCreditNote} className="max-h-[70vh] overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>1. Target Operator *</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <select required value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className="w-full pl-10 pr-8 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="" style={{background: 'var(--bg-card)'}}>Choose Profile</option>
                                        {loadingDrivers ? (
                                            <option disabled style={{background: 'var(--bg-card)'}}>Loading drivers...</option>
                                        ) : drivers.map(d => <option key={d._id} value={d._id} style={{background: 'var(--bg-card)'}}>{d.personalInfo?.fullName || 'Unnamed Driver'} ({d.driverId || 'N/A'})</option>)}
                                    </select>
                                </div>
                            </div>

                            {selectedDriverId && (
                                <div className="space-y-1.5 p-3.5 border rounded-2xl animate-in zoom-in-95" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>2. Link Ledger Invoice</label>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (invoiceSort === 'date') setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                                                    else { setInvoiceSort('date'); setInvoiceSortOrder('desc'); }
                                                }}
                                                className={`text-[9px] px-2 py-0.5 rounded border transition-all ${invoiceSort === 'date' ? 'bg-brand-lime text-black border-brand-lime' : 'text-dim border-white/10'}`}
                                            >
                                                DATE {invoiceSort === 'date' && (invoiceSortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (invoiceSort === 'number') setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
                                                    else { setInvoiceSort('number'); setInvoiceSortOrder('desc'); }
                                                }}
                                                className={`text-[9px] px-2 py-0.5 rounded border transition-all ${invoiceSort === 'number' ? 'bg-brand-lime text-black border-brand-lime' : 'text-dim border-white/10'}`}
                                            >
                                                NO. {invoiceSort === 'number' && (invoiceSortOrder === 'asc' ? '↑' : '↓')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modal-specific Filters */}
                                    <div className="flex gap-2 mb-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim opacity-50" size={12} />
                                            <input 
                                                type="text"
                                                placeholder="Search No..."
                                                value={invoiceSearch}
                                                onChange={e => setInvoiceSearch(e.target.value)}
                                                className="w-full pl-8 pr-2 py-1.5 border rounded-lg text-[10px] font-bold outline-none"
                                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                            {invoiceSearch && (
                                                <button onClick={() => setInvoiceSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-main"><X size={10}/></button>
                                            )}
                                        </div>
                                        <div className="relative flex-1">
                                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim opacity-50" size={12} />
                                            <input 
                                                type="date"
                                                value={invoiceDateFilter}
                                                onChange={e => setInvoiceDateFilter(e.target.value)}
                                                className="w-full pl-8 pr-2 py-1.5 border rounded-lg text-[10px] font-bold outline-none appearance-none"
                                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                            {invoiceDateFilter && (
                                                <button onClick={() => setInvoiceDateFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-main"><X size={10}/></button>
                                            )}
                                        </div>
                                    </div>

                                    <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="" style={{background: 'var(--bg-card)'}}>General Pool Adjustment ({sortedDriverInvoices.length} visible)</option>
                                        {loadingInvoices ? (
                                            <option disabled style={{background: 'var(--bg-card)'}}>Querying ledger...</option>
                                        ) : sortedDriverInvoices.length === 0 ? (
                                            <option disabled style={{background: 'var(--bg-card)'}}>No matching invoices</option>
                                        ) : sortedDriverInvoices.map(i => (
                                            <option key={i._id} value={i._id} style={{background: 'var(--bg-card)'}}>
                                                {i.invoiceNumber} — {i.status} (${i.balance} left) — {new Date(i.dueDate).toLocaleDateString()}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedInvoiceData && (
                                        <div className="mt-3 p-3 bg-brand-lime/10 border border-brand-lime/20 rounded-xl text-xs flex flex-col gap-1 shadow-inner animate-in slide-in-from-top-1">
                                            <div className="flex justify-between text-dim"><span>Gross:</span><span className="font-black" style={{ color: 'var(--text-main)' }}>${selectedInvoiceData.totalAmountDue}</span></div>
                                            <div className="flex justify-between font-bold"><span className="text-brand-lime">Outstanding Balance:</span><span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>${selectedInvoiceData.balance}</span></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>3. Amount *</label>
                                    <div className="relative"><DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input required type="number" step="0.01" min="0.01" max={selectedInvoiceData ? selectedInvoiceData.balance : undefined} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-bold outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>4. Date *</label>
                                    <input required type="date" value={creditNoteDate} onChange={e => setCreditNoteDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-xs font-semibold outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/>
                                </div>
                            </div>

                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>5. Reason *</label>
                                <select required value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <option value="" style={{background: 'var(--bg-card)'}}>Choose Category</option>
                                    <option value="Overcharge Reversal" style={{background: 'var(--bg-card)'}}>Overcharge Reversal</option>
                                    <option value="Vehicle Downtime Adjustment" style={{background: 'var(--bg-card)'}}>Vehicle Downtime Adjustment</option>
                                    <option value="Goodwill / Rental Discount" style={{background: 'var(--bg-card)'}}>Goodwill / Rental Discount</option>
                                    <option value="Damages Dispute Refund" style={{background: 'var(--bg-card)'}}>Damages Dispute Refund</option>
                                    <option value="Administrative Correction" style={{background: 'var(--bg-card)'}}>Administrative Correction</option>
                                </select>
                            </div>

                            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>6. Notes</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-xl text-xs resize-none outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>
                        </form>

                        <div className="p-6 border-t flex gap-3" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                            <button type="button" onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="flex-1 py-3 border font-black text-[10px] uppercase rounded-xl hover:bg-white/5 transition-all cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Cancel</button>
                            <button onClick={handleCreateCreditNote} disabled={submitting} className="flex-1 py-3 bg-brand-lime text-black rounded-xl text-[10px] font-black uppercase hover:scale-[1.03] shadow flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer">{submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}{submitting ? 'Posting...' : 'Post Credit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'CLOSED':
        case 'APPLIED':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none">Closed</span>;
        case 'VOID':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none">Void</span>;
        default:
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-amber-500/10 text-amber-400 border-amber-500/20 select-none">Open</span>;
    }
};

export default CreditNotes;
