import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, RefreshCw, AlertTriangle, Calendar, Filter, PlusCircle, User, Receipt, Calculator, BookMarked, Eye, Trash2 } from 'lucide-react';
import { getLedgerEntries, deleteLedgerJournal } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import CreateJournalEntry from './CreateJournalEntry';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }, // Green
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }, // Red
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }, // Blue
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' }, // Orange
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }, // Purple
};

const GeneralLedger = () => {
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });
    const [summaryStats, setSummaryStats] = useState({ totalDebit: 0, totalCredit: 0 });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

    const userRole = getUserRole() || '';
    const canCreateEntry = ['admin', 'financeadmin', 'financestaff'].includes(userRole.toLowerCase());
    const isAdmin = userRole.toLowerCase() === 'admin';

    const handleDeleteEntry = async (entry: LedgerEntry, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = window.confirm(
            `Delete this journal entry and ALL its related ledger lines?\n\nDescription: ${entry.description}\n\nThis cannot be undone.`
        );
        if (!confirmed) return;
        setDeletingEntryId(entry._id);
        try {
            const result = await deleteLedgerJournal(entry._id);
            // Remove all entries with the same manualJournal from local state
            setEntries(prev => prev.filter(e => e._id !== entry._id));
            // Re-fetch to ensure clean state
            fetchData();
            const { toast } = await import('react-hot-toast');
            toast.success(result.message || 'Journal deleted successfully');
        } catch (err: any) {
            const { toast } = await import('react-hot-toast');
            toast.error(err?.response?.data?.message || 'Failed to delete journal');
        } finally {
            setDeletingEntryId(null);
        }
    };

    const getThisMonthStart = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    };

    const getThisMonthEnd = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    };

    // Filters
    const [startDate, setStartDate] = useState(getThisMonthStart);
    const [endDate, setEndDate] = useState(getThisMonthEnd);
    const [selectedCode, setSelectedCode] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Keep end date valid relative to start date
    useEffect(() => {
        if (startDate && endDate && endDate < startDate) {
            setEndDate(startDate);
        }
    }, [startDate, endDate]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Build filters dynamically
            const filters: Record<string, any> = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (selectedCode !== 'ALL') filters.accountingCode = selectedCode;
            if (debouncedSearch) filters.search = debouncedSearch;

            // Add pagination
            filters.page = page;
            filters.limit = limit;

            const [ledgerResponse, codesData] = await Promise.all([
                getLedgerEntries(filters),
                getAllAccountingCodes().catch(() => []) // Fallback to empty if codes fail
            ]);

            setEntries(Array.isArray(ledgerResponse.data) ? ledgerResponse.data : []);
            if (ledgerResponse.pagination) {
                setPagination(ledgerResponse.pagination);
            }
            if (ledgerResponse.summary) {
                setSummaryStats(ledgerResponse.summary);
            } else {
                setSummaryStats({ totalDebit: 0, totalCredit: 0 });
            }
            setAccountingCodes(Array.isArray(codesData) ? codesData : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch ledger entries');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedCode, debouncedSearch, page, limit]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, selectedCode, debouncedSearch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'create' && canCreateEntry) {
            setShowCreateModal(true);
            // Clear the param so it doesn't reopen on refresh if not intended
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, canCreateEntry, navigate, location.pathname]);

    // Derived statistics
    const totalDebit = summaryStats.totalDebit;
    const totalCredit = summaryStats.totalCredit;

    const handleInvoiceClick = async (e: React.MouseEvent, invoiceNumber: string) => {
        e.stopPropagation();
        try {
            const { getInvoices } = await import('../../../services/invoiceService');
            const response = await getInvoices({ search: invoiceNumber });
            if (response.data && response.data.length > 0) {
                const invoice = response.data.find((inv: any) => inv.invoiceNumber === invoiceNumber) || response.data[0];
                navigate(`/admin/financial-admin/invoices/${invoice._id}`);
            } else {
                navigate('/admin/financial-admin/invoices', { state: { search: invoiceNumber } });
            }
        } catch (err) {
            navigate('/admin/financial-admin/invoices', { state: { search: invoiceNumber } });
        }
    };

    const handleBillClick = async (e: React.MouseEvent, billNumber: string) => {
        e.stopPropagation();
        try {
            const { getAllBills } = await import('../../../services/billService');
            const response = await getAllBills({ search: billNumber });
            if (response.success && response.data && response.data.length > 0) {
                const bill = response.data.find((b: any) => b.billNumber === billNumber) || response.data[0];
                navigate(`/admin/financial-admin/bills/${bill._id}`);
            } else {
                navigate('/admin/financial-admin/bills', { state: { search: billNumber } });
            }
        } catch (err) {
            navigate('/admin/financial-admin/bills', { state: { search: billNumber } });
        }
    };

    const renderDescriptionWithLinks = (description: string) => {
        if (!description) return <span style={{ color: 'var(--text-dim)' }}>—</span>;

        const billRegex = /((?:BILL|SB)-\w+(?:-\w+)*)/i;
        const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/i;

        const matchBill = description.match(billRegex);
        const matchInvoice = description.match(invoiceRegex);

        if (matchBill) {
            const billNum = matchBill[0];
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <button
                        onClick={(e) => handleBillClick(e, billNum)}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C8E600] hover:underline self-start bg-[#C8E600]/10 border border-[#C8E600]/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Receipt size={11} strokeWidth={2.5} />
                        View Bill ({billNum})
                    </button>
                </div>
            );
        }

        if (matchInvoice) {
            const invNum = matchInvoice[0];
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <button
                        onClick={(e) => handleInvoiceClick(e, invNum)}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:underline self-start bg-lime/10 border border-lime/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
                        style={{ color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.06)' }}
                    >
                        <FileText size={11} strokeWidth={2.5} />
                        View Invoice ({invNum})
                    </button>
                </div>
            );
        }

        return <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>;
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'General Ledger', active: true }
                ]}
            />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        General Ledger
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5 flex flex-wrap items-center gap-2">
                        <span>Immutable audit trail of all financial transactions</span>
                        {startDate && endDate && (
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[var(--brand-lime)] font-mono text-[10px]">
                                {new Date(startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} – {new Date(endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchData}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {canCreateEntry && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-lg hover:scale-105 active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <PlusCircle size={14} strokeWidth={3} /> Add Manual Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Filters Bar */}
            <div className="p-4 rounded-2xl border transition-colors duration-300 flex flex-col sm:flex-row gap-4 flex-wrap" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex items-center gap-2 flex-grow max-w-xs">
                    <input
                        type="text"
                        placeholder="Search description, code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="hidden sm:block w-px h-8 mx-1" style={{ background: 'var(--border-main)' }}></div>

                <div className="flex items-center gap-2">
                    <Calendar size={18} style={{ color: 'var(--text-dim)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Date:</span>
                </div>
                <div className="flex items-center gap-2 flex-grow max-w-xs">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: 'dark' }}
                    />
                    <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (startDate && val && val < startDate) {
                                setEndDate(startDate);
                            } else {
                                setEndDate(val);
                            }
                        }}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: 'dark' }}
                    />
                </div>

                <div className="hidden sm:block w-px h-8 mx-1" style={{ background: 'var(--border-main)' }}></div>

                <div className="flex items-center gap-2">
                    <Filter size={18} style={{ color: 'var(--text-dim)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Account:</span>
                </div>
                <select
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="flex-grow sm:max-w-[200px] px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <option value="ALL">All Accounts</option>
                    {accountingCodes.map(c => (
                        <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                    ))}
                </select>

                {/* Clear Filters */}
                {(startDate !== getThisMonthStart() || endDate !== getThisMonthEnd() || selectedCode !== 'ALL' || searchQuery !== '') && (
                    <button
                        onClick={() => {
                            setStartDate(getThisMonthStart());
                            setEndDate(getThisMonthEnd());
                            setSelectedCode('ALL');
                            setSearchQuery('');
                        }}
                        className="text-sm font-medium hover:underline ml-auto"
                        style={{ color: '#ef4444' }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Navigation Shortcuts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    onClick={() => navigate('../taxes')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Calculator size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Tax Management</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Configure tax settings</p>
                </div>

                <div
                    onClick={() => navigate('../chart-of-accounts')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <BookMarked size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Chart of Accounts</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Manage accounting codes</p>
                </div>

                <div
                    onClick={() => navigate('../bills')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Receipt size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Purchase Bills</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Track vendor bills</p>
                </div>

                <div
                    onClick={() => navigate('../invoices')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <FileText size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Invoices</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Manage rent invoices</p>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Total Debit</p>
                    <h3 className="text-2xl font-bold text-red-400">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Total Credit</p>
                    <h3 className="text-2xl font-bold text-green-400">{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Net Movement</p>
                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                        {Math.abs(totalCredit - totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-dim)' }}>
                            {totalCredit > totalDebit ? '(Credit Bal.)' : totalCredit < totalDebit ? '(Debit Bal.)' : ''}
                        </span>
                    </h3>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No transactions found</p>
                            <p className="text-sm mt-1">Adjust your filters to see ledger entries.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Audit Trace</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Credit</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => {
                                    // Formatting the date
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    const formattedDate = !isNaN(dateObj.getTime())
                                        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : entryDateStr;

                                    const style = CATEGORY_STYLES[entry.accountingCode?.category] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent' };

                                    const debitVal = entry.amount !== undefined
                                        ? (entry.type === 'DEBIT' ? entry.amount : 0)
                                        : (entry.debit || 0);

                                    const creditVal = entry.amount !== undefined
                                        ? (entry.type === 'CREDIT' ? entry.amount : 0)
                                        : (entry.credit || 0);

                                    return (
                                        <tr
                                            key={entry._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)' }}
                                            onClick={() => navigate(`./${entry._id}`)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderDescriptionWithLinks(entry.description)}
                                                {entry.referenceId && (
                                                    <div className="text-[10px] font-mono mt-1 opacity-60">Ref: {entry.referenceId}</div>
                                                )}
                                            </td>
                                            <td
                                                className="px-6 py-4"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (entry.accountingCode?._id) {
                                                        navigate(`../chart-of-accounts/${entry.accountingCode._id}`);
                                                    }
                                                }}
                                            >
                                                <div className="flex flex-col gap-1 items-start group/acc cursor-pointer">
                                                    <span className="font-mono text-xs font-bold group-hover/acc:text-brand-lime transition-colors" style={{ color: 'var(--text-main)' }}>
                                                        {entry.accountingCode?.code} - {entry.accountingCode?.name}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border"
                                                        style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                                                        {entry.accountingCode?.category}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs opacity-70" style={{ color: 'var(--text-dim)' }}>
                                                    <User size={12} />
                                                    {entry.creatorRole || 'SYSTEM'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {debitVal > 0 ? (
                                                    <span className="font-mono text-sm font-bold text-red-400">
                                                        {debitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {creditVal > 0 ? (
                                                    <span className="font-mono text-sm font-bold text-green-400">
                                                        {creditVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`./${entry._id}`)}
                                                        className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all hover:bg-brand-lime/10 text-[var(--brand-lime)] border border-transparent hover:border-brand-lime/20 cursor-pointer"
                                                        style={{ color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.06)' }}
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} strokeWidth={2.5} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => handleDeleteEntry(entry, e)}
                                                            disabled={deletingEntryId === entry._id}
                                                            className="inline-flex items-center justify-center p-1.5 rounded-lg transition-all hover:bg-red-500/10 text-red-400 border border-transparent hover:border-red-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                            title="Delete journal entry"
                                                        >
                                                            <Trash2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination UI */}
                {!loading && entries.length > 0 && pagination && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-topbar)' }}>
                        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            Showing <span className="font-bold" style={{ color: 'var(--text-main)' }}>{((page - 1) * limit) + 1}</span> to <span className="font-bold" style={{ color: 'var(--text-main)' }}>{Math.min(page * limit, pagination.total)}</span> of <span className="font-bold" style={{ color: 'var(--text-main)' }}>{pagination.total}</span> entries
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="px-2 py-1 rounded border text-xs outline-none bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <option value="10">10 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(200,230,0,0.2)]"
                                    style={{
                                        borderColor: page === 1 ? 'var(--border-main)' : 'rgba(200,230,0,0.5)',
                                        color: page === 1 ? 'var(--text-dim)' : 'rgb(200,230,0)',
                                        background: 'transparent'
                                    }}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center px-4">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                        Page <span className="font-bold" style={{ color: 'rgb(200,230,0)' }}>{page}</span> of {pagination.pages}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(200,230,0,0.2)]"
                                    style={{
                                        borderColor: page === pagination.pages ? 'var(--border-main)' : 'rgba(200,230,0,0.5)',
                                        color: page === pagination.pages ? 'var(--text-dim)' : 'rgb(200,230,0)',
                                        background: 'transparent'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Journal Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <CreateJournalEntry
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            fetchData();
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default GeneralLedger;
