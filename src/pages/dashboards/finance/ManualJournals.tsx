import { useState, useEffect, useCallback, Fragment } from 'react';
import { Plus, Search, Calendar, ChevronDown, ChevronUp, BookOpen, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { getManualJournals, getLedgerEntries } from '../../../services/ledgerService';
import type { ManualJournal, LedgerEntry } from '../../../services/ledgerService';
import CreateJournalEntry from './CreateJournalEntry';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const ManualJournals = () => {
    const [journals, setJournals] = useState<ManualJournal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
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
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Financial Admin', path: '/admin/financial-admin' },
                    { label: 'Accounting', path: '#' },
                    { label: 'Manual Journals', path: '/admin/financial-admin/manual-journals', active: true }
                ]}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-main)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8E600]/5 blur-[80px] rounded-full" />
                <div className="space-y-1 z-10">
                    <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-2">
                        <BookOpen className="text-[#C8E600]" size={24} />
                        Manual Journals
                    </h1>
                    <p className="text-xs text-dim">
                        Record and manage manual double-entry adjustments, provisions, and general ledger corrections.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="z-10 bg-[#C8E600] text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(200,230,0,0.15)]"
                >
                    <Plus size={16} />
                    New Journal Entry
                </button>
            </div>

            {/* Filter Hub */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search Field */}
                    <div className="flex-1 min-w-[280px] relative">
                        <Search className="absolute left-3.5 top-3 text-dim" size={16} />
                        <input
                            type="text"
                            placeholder="Search by notes or journal number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] placeholder:text-dim/50 focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>

                    {/* Date Span Fields */}
                    <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-3 py-1.5">
                        <Calendar size={14} className="text-dim" />
                        <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Date Span</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-28"
                        />
                        <span className="text-dim font-bold text-xs">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-28"
                        />
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={fetchJournals}
                        className="p-2.5 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl text-dim hover:text-[var(--text-main)] transition-colors"
                        title="Reload Journals"
                    >
                        <RefreshCw size={16} />
                    </button>
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
                <div className="flex items-center justify-center py-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl">
                    <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : journals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-center px-4">
                    <div className="p-4 rounded-full bg-[var(--bg-input)] text-dim mb-4">
                        <BookOpen size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)]">No Journals Recorded</h3>
                    <p className="text-xs text-dim mt-1 max-w-sm">
                        There are no manual double-entry adjustments for the selected date range. Click "New Journal Entry" above to post one.
                    </p>
                </div>
            ) : (
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[var(--bg-input)] border-b border-[var(--border-main)]">
                                <tr>
                                    <th className="w-12"></th>
                                    <th className="px-6 py-4 text-xs font-bold text-dim uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-dim uppercase tracking-wider">Journal #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-dim uppercase tracking-wider">Narration / Notes</th>
                                    <th className="px-6 py-4 text-xs font-bold text-dim uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-dim uppercase tracking-wider text-right">Total Debit/Credit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-main)]">
                                {journals.map((journal) => {
                                    const isExpanded = expandedJournal === journal._id;

                                    return (
                                        <Fragment key={journal._id}>
                                            <tr className="hover:bg-[var(--bg-input)]/30 transition-colors">
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleExpand(journal._id)}
                                                        className="p-1 rounded bg-[var(--bg-input)] hover:brightness-110 text-dim transition-all"
                                                    >
                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-[var(--text-main)]">
                                                    {new Date(journal.date).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono font-bold text-[#C8E600]">
                                                    {journal.journalNumber}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-[var(--text-main)] max-w-md truncate">
                                                    {journal.description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={10} />
                                                        {journal.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold font-mono text-[var(--text-main)]">
                                                    ${Number(journal.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 bg-[var(--bg-input)]/10 border-b border-[var(--border-main)]">
                                                        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-4 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="flex justify-between items-center mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <BookOpen size={16} className="text-[#C8E600]" />
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
                                                                <div className="overflow-hidden border border-[var(--border-main)] rounded-lg">
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead className="bg-[var(--bg-input)] border-b border-[var(--border-main)]">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-[10px] font-bold text-dim uppercase tracking-wider">Account</th>
                                                                                <th className="px-4 py-2 text-[10px] font-bold text-dim uppercase tracking-wider">Line Memo</th>
                                                                                <th className="px-4 py-2 text-[10px] font-bold text-dim uppercase tracking-wider text-right">Debit</th>
                                                                                <th className="px-4 py-2 text-[10px] font-bold text-dim uppercase tracking-wider text-right">Credit</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-[var(--border-main)]">
                                                                            {journalLines[journal._id].map((line, idx) => (
                                                                                <tr key={idx} className="hover:bg-[var(--bg-input)]/10 transition-colors">
                                                                                    <td className="px-4 py-2 text-xs font-semibold text-[var(--text-main)]">
                                                                                        {line.accountingCode?.code} - {line.accountingCode?.name}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-dim">
                                                                                        {line.description}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-right font-mono text-emerald-400 font-bold font-semibold">
                                                                                        {line.type === 'DEBIT' ? `$${Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-xs text-right font-mono text-rose-400 font-bold font-semibold">
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
                        <div className="px-6 py-4 border-t border-[var(--border-main)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-input)]/10">
                            <p className="text-xs font-bold text-dim">
                                Showing {journals.length} of {pagination.total} entries
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="p-2 rounded-lg border border-[var(--border-main)] transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-main)] text-xs font-bold"
                                >
                                    Prev
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                            style={{ 
                                                background: currentPage === i + 1 ? '#C8E600' : 'transparent',
                                                color: currentPage === i + 1 ? '#000' : 'var(--text-main)',
                                                border: currentPage === i + 1 ? 'none' : '1px solid var(--border-main)'
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                                    disabled={currentPage === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-[var(--border-main)] transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-main)] text-xs font-bold"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Journal Modal Container */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div
                        className="relative w-full max-w-5xl my-8 transform transition-all"
                        onClick={e => e.stopPropagation()}
                    >
                        <CreateJournalEntry
                            onClose={() => setShowCreateModal(false)}
                            onSuccess={() => {
                                setShowCreateModal(false);
                                fetchJournals();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualJournals;
