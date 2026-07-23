import { useState, useEffect, useCallback, Fragment } from 'react';
import { Plus, Search, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, BookOpen, AlertCircle, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import { getManualJournals, getLedgerEntries } from '../../../services/ledgerService';
import type { ManualJournal, LedgerEntry } from '../../../services/ledgerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const ManualJournals = () => {
    const navigate = useNavigate();
    const [journals, setJournals] = useState<ManualJournal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedJournal, setExpandedJournal] = useState<string | null>(null);

    // Expandable journal lines cache
    const [journalLines, setJournalLines] = useState<Record<string, LedgerEntry[]>>({});
    const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});

    const getThisMonthStart = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };

    const getThisMonthEnd = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    };

    // Filter states
    const [startDate, setStartDate] = useState(getThisMonthStart);
    const [endDate, setEndDate] = useState(getThisMonthEnd);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState<{ total: number, page: number, limit: number, totalPages: number } | null>(null);

    const handleExportExcel = () => {
        if (journals.length === 0) {
            toast.error("No journals available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = journals.map((j, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Journal Number": j.journalNumber || 'N/A',
                "Reference Number": j.referenceNumber || '—',
                "Journal Date": j.journalDate ? new Date(j.journalDate).toLocaleDateString() : 'N/A',
                "Status": j.status || 'N/A',
                "Amount ($)": j.amount || 0,
                "Notes": j.notes || '—',
                "Created By": j.createdBy?.name || 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Manual Journals");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `manual_journals_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (journals.length === 0) {
            toast.error("No journals available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = journals.map((j, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Journal Number": j.journalNumber || 'N/A',
                "Reference Number": j.referenceNumber || '—',
                "Journal Date": j.journalDate ? new Date(j.journalDate).toLocaleDateString() : 'N/A',
                "Status": j.status || 'N/A',
                "Amount ($)": j.amount || 0,
                "Notes": j.notes || '—',
                "Created By": j.createdBy?.name || 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `manual_journals_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = () => {
        if (journals.length === 0) {
            toast.error("No journals available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Manual Journals Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

            const head = [["Sl No.", "Journal Number", "Reference #", "Journal Date", "Status", "Amount", "Created By"]];
            const body = journals.map((j, idx) => [
                String(idx + 1).padStart(2, '0'),
                j.journalNumber || 'N/A',
                j.referenceNumber || '—',
                j.journalDate ? new Date(j.journalDate).toLocaleDateString() : 'N/A',
                j.status || 'N/A',
                `$${(j.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                j.createdBy?.name || 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`manual_journals_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const fetchJournals = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: Record<string, any> = {
                page: currentPage,
                limit
            };
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (debouncedSearch) filters.search = debouncedSearch;

            // Fetch journals list from the backend
            const response = await getManualJournals(filters);
            setJournals(Array.isArray(response.data) ? response.data : []);
            setPagination(response.pagination || null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch manual journals');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, debouncedSearch, currentPage, limit]);

    useEffect(() => {
        fetchJournals();
    }, [fetchJournals]);

    // Fetch double entry lines for a specific manual journal dynamically on expand
    const handleToggleExpand = async (journalId: string) => {
        if (expandedJournal === journalId) {
            setExpandedJournal(null);
            return;
        }

        setExpandedJournal(journalId);

        if (!journalLines[journalId]) {
            setLoadingLines(prev => ({ ...prev, [journalId]: true }));
            try {
                // Fetch ledger entries that correspond to this manual journal's ID
                const response = await getLedgerEntries({ manualJournal: journalId });
                setJournalLines(prev => ({ ...prev, [journalId]: response.data || [] }));
            } catch (err) {
                console.error('Failed to load journal ledger lines:', err);
            } finally {
                setLoadingLines(prev => ({ ...prev, [journalId]: false }));
            }
        }
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Financial Admin', path: '/admin/financial-admin' },
                    { label: 'Accounting', path: '#' },
                    { label: 'Manual Journals', path: '/admin/financial-admin/manual-journals', active: true }
                ]}
            />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <BookOpen size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Manual Journals
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        Record and manage manual double-entry adjustments, provisions, and general ledger corrections.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-emerald-500" /> Excel
                    </button>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-blue-400" /> CSV
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-rose-500" /> PDF
                    </button>

                    <button
                        onClick={fetchJournals}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => navigate('new')}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        <Plus size={14} strokeWidth={3} />
                        New Journal Entry
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-3xl border bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                {/* Search */}
                <div className="flex-1 min-w-[280px] relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-30" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by notes or journal number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none text-xs transition-all focus:border-brand-lime/30"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                {/* Date Span Fields */}
                <div className="flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border-main)]">
                    <Calendar size={14} className="opacity-40 ml-2" />
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Date Span</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: 'dark' }}
                    />
                    <div className="w-px h-4 bg-white/10"></div>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                        className="bg-transparent px-2 py-1.5 outline-none text-[10px] font-bold"
                        style={{ color: 'var(--text-main)', colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {/* List & Double Entry Ledger Presentation */}
            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20 rounded-[32px] border bg-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : journals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-[32px] border bg-white/[0.02] text-center px-4" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="p-4 rounded-full bg-[var(--bg-input)] text-dim mb-4 border border-[var(--border-main)]">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">No Journals Recorded</h3>
                    <p className="text-xs text-dim mt-1 max-w-sm">
                        There are no manual double-entry adjustments for the selected date range. Click "New Journal Entry" above to post one.
                    </p>
                </div>
            ) : (
                <div className="rounded-[32px] border bg-white/[0.02] overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="w-12 px-6 py-5"></th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Date</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Journal #</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Narration / Notes</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Total Debit/Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {journals.map((journal) => {
                                    const isExpanded = expandedJournal === journal._id;

                                    return (
                                        <Fragment key={journal._id}>
                                            <tr className="hover:bg-white/[0.03] transition-all group">
                                                <td className="px-6 py-5 text-center">
                                                    <button
                                                        onClick={() => handleToggleExpand(journal._id)}
                                                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-brand-lime/30 text-dim hover:text-[var(--text-main)] transition-all cursor-pointer"
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-semibold text-[var(--text-main)]">
                                                    {new Date(journal.date).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-5 text-sm font-mono font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                    {journal.journalNumber}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-[var(--text-main)] max-w-md truncate">
                                                    {journal.description}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                        <CheckCircle2 size={10} />
                                                        {journal.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right text-sm font-bold font-mono text-[var(--text-main)]">
                                                    ${Number(journal.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-5 bg-white/[0.01] border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                        <div className="bg-[var(--bg-card)] border rounded-[20px] p-5 shadow-lg relative overflow-hidden animate-in fade-in duration-300" style={{ borderColor: 'var(--border-main)' }}>
                                                            <div className="flex justify-between items-center mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <BookOpen size={16} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                                                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                                                                        Double-Entry Ledger Details for {journal.journalNumber}
                                                                    </h4>
                                                                </div>
                                                            </div>
                                                            {loadingLines[journal._id] ? (
                                                                <div className="flex items-center justify-center py-6">
                                                                    <div className="w-5 h-5 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            ) : !journalLines[journal._id] || journalLines[journal._id].length === 0 ? (
                                                                <p className="text-xs text-dim text-center py-4">No ledger entry details recorded for this journal.</p>
                                                            ) : (
                                                                <div className="overflow-hidden border rounded-xl" style={{ borderColor: 'var(--border-main)' }}>
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                                            <tr>
                                                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Account</th>
                                                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40">Line Memo</th>
                                                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Debit</th>
                                                                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Credit</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                                                            {journalLines[journal._id].map((line, idx) => (
                                                                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                                                    <td className="px-4 py-3 text-xs font-semibold text-[var(--text-main)]">
                                                                                        {line.accountingCode?.code} - {line.accountingCode?.name}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-xs text-dim">
                                                                                        {line.description}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-xs text-right font-mono text-emerald-400 font-bold">
                                                                                        {line.type === 'DEBIT' ? `$${Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                                    </td>
                                                                                    <td className="px-4 py-3 text-xs text-right font-mono text-rose-400 font-bold">
                                                                                        {line.type === 'CREDIT' ? `$${Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Numbered Pagination Section */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="p-6 border-t bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-6" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <p className="text-xs font-bold opacity-40">
                                    Showing <span className="text-brand-lime font-black">{((currentPage-1)*limit)+1}</span> to <span className="text-brand-lime font-black">{Math.min(currentPage*limit, pagination.total)}</span> of <span className="text-[var(--text-main)] font-black">{pagination.total}</span> entries
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    disabled={currentPage === 1 || loading}
                                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                    className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all active:scale-90 cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                
                                <div className="flex items-center gap-1">
                                    {[...Array(pagination.totalPages)].map((_, i) => {
                                        const pNum = i + 1;
                                        if (pagination.totalPages > 5 && (pNum < currentPage - 2 || pNum > currentPage + 2)) return null;
                                        return (
                                            <button
                                                key={pNum}
                                                onClick={() => setCurrentPage(pNum)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all active:scale-90 cursor-pointer ${currentPage === pNum ? 'bg-brand-lime text-black shadow-[0_0_15px_rgba(200,230,0,0.3)]' : 'hover:bg-white/5 border border-white/5 opacity-40'}`}
                                                style={{ color: currentPage === pNum ? '#000' : 'var(--text-main)' }}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    disabled={currentPage === pagination.totalPages || loading}
                                    onClick={() => setCurrentPage(p => Math.min(p + 1, pagination.totalPages))}
                                    className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 disabled:opacity-20 transition-all active:scale-90 cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default ManualJournals;
