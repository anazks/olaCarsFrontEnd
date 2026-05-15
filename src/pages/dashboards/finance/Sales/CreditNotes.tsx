import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, Filter, X, FileText, RefreshCw, 
    AlertCircle, User, DollarSign, CheckCircle2,
    Eye, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import { 
    getAllCreditNotes, 
    createCreditNote, 
    type CreditNote 
} from '../../../../services/creditNoteService';
import { getAllDrivers } from '../../../../services/driverService';
import { getInvoicesByDriver } from '../../../../services/invoiceService';
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

    // Server-Side Pagination
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    
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
    }, [statusFilter, debouncedSearch]);

    const fetchCreditNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = { page, limit };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            // Wait, does the current API support string searching on backend? If so we can add it.
            // But we'll respect existing param pattern.
            const res = await getAllCreditNotes(params);
            if (res && res.success) {
                setCreditNotes(res.data || []);
                if (res.pagination) {
                    setPagination({
                        total: res.pagination.total || 0,
                        pages: res.pagination.pages || 1
                    });
                }
            }
        } catch (e) {
            console.error("Sync error:", e);
            toast.error("Failed syncing credit notes.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter]);

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

    // Fetch specific driver's open invoices when chosen
    useEffect(() => {
        if (selectedDriverId) {
            const loadInvoices = async () => {
                setLoadingInvoices(true);
                try {
                    const res = await getInvoicesByDriver(selectedDriverId);
                    const activePool = (res || []).filter((i: any) => i.status !== 'PAID' && i.balance > 0);
                    setDriverInvoices(activePool);
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoadingInvoices(false);
                }
            };
            loadInvoices();
            setSelectedInvoiceId('');
        } else {
            setDriverInvoices([]);
            setSelectedInvoiceId('');
        }
    }, [selectedDriverId]);

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

    const filteredNotes = useMemo(() => {
        if (!debouncedSearch) return creditNotes;
        const q = debouncedSearch.toLowerCase();
        return creditNotes.filter(note => {
            const num = (note.creditNoteNumber || '').toLowerCase();
            const fullName = (note.driverId?.personalInfo?.fullName || '').toLowerCase();
            const reasonText = (note.reason || '').toLowerCase();
            return num.includes(q) || fullName.includes(q) || reasonText.includes(q);
        });
    }, [creditNotes, debouncedSearch]);

    return (
        <div className="container-responsive flex flex-col h-[calc(100vh-110px)] overflow-hidden pb-4">
            <div className="flex-shrink-0 mb-4">
                <Breadcrumbs 
                    items={[
                        { label: 'Sales', path: '#' },
                        { label: 'Credit Notes', active: true }
                    ]} 
                />
            </div>

            <div className="flex-1 flex flex-col overflow-hidden space-y-6 animate-in fade-in duration-500">
                
                {/* Compact Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-indigo-400" />
                            Credit Notes Ledger
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Execute accounting reversals, lease adjustments, and reconcile active accounts.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-lime border border-brand-lime/10 hover:bg-brand-lime/90 text-black font-black text-[10px] uppercase tracking-widest rounded-xl select-none shadow-xl hover:scale-[1.02] cursor-pointer active:scale-95 transition-all"
                        >
                            <Plus size={14} strokeWidth={3} /> Issue Credit
                        </button>
                        <button 
                            onClick={() => fetchCreditNotes()} 
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-lg select-none cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                            Sync
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
                    </div>
                </div>

                {/* Registry Data Grid Wrapper */}
                <div className="flex-1 min-h-0 flex flex-col border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead className="sticky top-0 z-10 select-none shadow-sm" style={{ background: 'var(--bg-input)' }}>
                                <tr className="text-[10px] font-black uppercase tracking-widest border-b border-white/5" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 w-[15%]">Note Reference</th>
                                    <th className="py-4 px-6 w-[25%]">Operator / Driver</th>
                                    <th className="py-4 px-6 w-[15%]"><div className="flex items-center gap-1"><Calendar size={12}/> Note Date</div></th>
                                    <th className="py-4 px-6 w-[20%]">Allocated Reason</th>
                                    <th className="py-4 px-6 text-right w-[15%]"><div className="flex items-center justify-end gap-1"><DollarSign size={12}/> Credit Amount</div></th>
                                    <th className="py-4 px-6 text-center w-[10%]">State</th>
                                    <th className="py-4 px-6 text-center w-[5%]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Querying Credit Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No credit notes recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Process manual corrections via 'Issue Credit'</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredNotes.map((note) => (
                                        <tr 
                                            key={note._id} 
                                            onClick={() => handleRowClick(note._id)}
                                            className="hover:bg-white/[0.02] transition-colors cursor-pointer active:bg-white/[0.04]"
                                        >
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide text-white font-black uppercase">{note.creditNoteNumber || 'CN-DRAFT'}</span>
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
                                            <td className="py-4 px-6 truncate max-w-[180px] font-semibold text-dim">
                                                {note.reason || 'Administrative Correction'}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm text-indigo-400">
                                                ${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={note.status} />
                                            </td>
                                            <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center">
                                                    <button 
                                                        onClick={() => handleRowClick(note._id)}
                                                        className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                        title="Open Reversal Document"
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

                    {/* Pagination Footer */}
                    {!loading && filteredNotes.length > 0 && pagination && (
                        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t flex-shrink-0 shadow-2xl select-none" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.05)' }}>
                            <div className="text-xs font-black tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>
                                Showing <span style={{ color: 'var(--text-main)' }}>{filteredNotes.length}</span> of <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> records
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

            {/* ================= ISSUE CREDIT NOTE SLIDE-OVER ================= */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}></div>
                    <div className="relative w-full max-w-md h-full border-l flex flex-col text-left animate-in slide-in-from-right duration-300 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        
                        <div className="flex items-center justify-between p-6 border-b bg-black/20 flex-shrink-0" style={{ borderColor: 'var(--border-main)' }}>
                            <div><h2 className="text-lg font-black text-white flex items-center gap-2"><FileText size={20} className="text-brand-lime" /> Issue Credit Note</h2><p className="text-xs text-dim">Manual ledger adjustment.</p></div>
                            <button onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="p-2 text-dim hover:text-white rounded-xl transition-all"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleCreateCreditNote} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>1. Target Operator *</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <select required value={selectedDriverId} onChange={(e) => setSelectedDriverId(e.target.value)} className="w-full pl-10 pr-8 py-2.5 border rounded-xl text-xs font-semibold text-white appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <option value="" style={{background: 'var(--bg-card)'}}>Choose Profile</option>
                                        {loadingDrivers ? (
                                            <option disabled style={{background: 'var(--bg-card)'}}>Loading drivers...</option>
                                        ) : drivers.map(d => <option key={d._id} value={d._id} style={{background: 'var(--bg-card)'}}>{d.personalInfo?.fullName || 'Unnamed Driver'} ({d.driverId || 'N/A'})</option>)}
                                    </select>
                                </div>
                            </div>

                            {selectedDriverId && (
                                <div className="space-y-1.5 p-3.5 border rounded-2xl animate-in zoom-in-95" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>2. Link Ledger Invoice</label>
                                    <select value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-xs font-semibold text-white appearance-none cursor-pointer" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                        <option value="" style={{background: 'var(--bg-card)'}}>General Pool Adjustment</option>
                                        {loadingInvoices ? (
                                            <option disabled style={{background: 'var(--bg-card)'}}>Querying ledger...</option>
                                        ) : driverInvoices.map(i => <option key={i._id} value={i._id} style={{background: 'var(--bg-card)'}}>{i.invoiceNumber} (Unpaid ${i.balance})</option>)}
                                    </select>
                                    {selectedInvoiceData && (
                                        <div className="mt-3 p-3 bg-brand-lime/10 border border-brand-lime/20 rounded-xl text-xs flex flex-col gap-1 shadow-inner animate-in slide-in-from-top-1">
                                            <div className="flex justify-between text-[#A3A3A3]"><span>Gross:</span><span className="text-white font-black">${selectedInvoiceData.totalAmountDue}</span></div>
                                            <div className="flex justify-between font-bold"><span className="text-brand-lime">Outstanding Balance:</span><span className="text-white text-sm font-black">${selectedInvoiceData.balance}</span></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>3. Amount *</label>
                                    <div className="relative"><DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input required type="number" step="0.01" min="0.01" max={selectedInvoiceData ? selectedInvoiceData.balance : undefined} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-bold text-white outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}/></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>4. Date *</label>
                                    <input required type="date" value={creditNoteDate} onChange={e => setCreditNoteDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-xs font-semibold text-white outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', colorScheme: 'dark' }}/>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>5. Reason *</label>
                                <select required value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold text-white appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <option value="" style={{background: 'var(--bg-card)'}}>Choose Category</option>
                                    <option value="Overcharge Reversal" style={{background: 'var(--bg-card)'}}>Overcharge Reversal</option>
                                    <option value="Vehicle Downtime Adjustment" style={{background: 'var(--bg-card)'}}>Vehicle Downtime Adjustment</option>
                                    <option value="Goodwill / Rental Discount" style={{background: 'var(--bg-card)'}}>Goodwill / Rental Discount</option>
                                    <option value="Damages Dispute Refund" style={{background: 'var(--bg-card)'}}>Damages Dispute Refund</option>
                                    <option value="Administrative Correction" style={{background: 'var(--bg-card)'}}>Administrative Correction</option>
                                </select>
                            </div>

                            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>6. Notes</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-xl text-xs text-white resize-none outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}/></div>
                        </form>

                        <div className="p-6 border-t bg-black/20 flex gap-3 flex-shrink-0" style={{ borderColor: 'var(--border-main)' }}>
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
