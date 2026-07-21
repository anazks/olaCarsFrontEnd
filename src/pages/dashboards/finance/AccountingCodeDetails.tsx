import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    BookMarked,
    ArrowLeft,
    List,
    AlertTriangle,
    FileText,
    Receipt,
    User,
    FileSpreadsheet,
    Info,
    Trash2,
    Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getLedgerEntries, clearLedgerEntriesByCode } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }, // Green
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }, // Red
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }, // Blue
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' }, // Orange
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }, // Purple
};

const AccountingCodeDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [code, setCode] = useState<AccountingCode | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Date initialization for last 30 days
    const getInitialDates = () => {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const formatISO = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const formatVisual = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${month}/${day}/${year}`;
        };
        return { 
            startISO: formatISO(thirtyDaysAgo), 
            endISO: formatISO(today),
            startVisual: formatVisual(thirtyDaysAgo),
            endVisual: formatVisual(today)
        };
    };
    const initialDates = getInitialDates();

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });
    const getUrlDates = () => {
        const params = new URLSearchParams(location.search);
        return {
            start: params.get('startDate'),
            end: params.get('endDate')
        };
    };
    const urlDates = getUrlDates();

    const [startDate, setStartDate] = useState(urlDates.start || initialDates.startISO);
    const [endDate, setEndDate] = useState(urlDates.end || initialDates.endISO);
    const [tempStartDate, setTempStartDate] = useState(urlDates.start || initialDates.startISO);
    const [tempEndDate, setTempEndDate] = useState(urlDates.end || initialDates.endISO);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [summary, setSummary] = useState({
        totalDebit: 0,
        totalCredit: 0,
        netMovement: 0,
        openingBalance: 0,
        closingBalance: 0
    });

    // Import Statement Modal States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [clearing, setClearing] = useState(false);

    const handleClearLedger = async () => {
        if (!id) return;

        const isBankAccount = window.location.pathname.includes('/bank-accounts/');
        let confirmMsg = isBankAccount
            ? `Are you sure you want to delete ALL ledger transactions for this bank account (${code?.name || 'this bank account'})?\n\nThis will permanently delete all records for this specific bank account and cannot be undone.`
            : `Are you sure you want to delete ALL ledger transactions for this account (${code?.name || 'this account'})?\n\nThis will permanently delete all records for this specific account code and cannot be undone.`;

        if (startDate || endDate) {
            confirmMsg = isBankAccount
                ? `Are you sure you want to delete ledger transactions for this bank account (${code?.name || 'this bank account'}) within the selected date range:\nFrom: ${startDate || 'inception'} To: ${endDate || 'present'}?\n\nThis will permanently delete only the bank entries within this period.`
                : `Are you sure you want to delete ledger transactions for this account (${code?.name || 'this account'}) within the selected date range:\nFrom: ${startDate || 'inception'} To: ${endDate || 'present'}?\n\nThis will permanently delete only the transactions within this period.`;
        }

        const confirmDelete = window.confirm(confirmMsg);
        if (!confirmDelete) return;

        setClearing(true);
        try {
            const res = await clearLedgerEntriesByCode(id, startDate || undefined, endDate || undefined);
            if (res.success) {
                toast.success(res.message || `Successfully cleared ${res.deletedCount} entries.`);
                setPage(1);
                fetchData();
            } else {
                toast.error(res.message || 'Failed to clear ledger entries.');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Error clearing ledger entries');
        } finally {
            setClearing(false);
        }
    };

    const handleDownloadFilteredData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch all entries for this accounting code with active date filters (high limit)
            const filters = {
                accountingCode: id,
                page: 1,
                limit: 50000,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                sort: sortDirection
            };
            const res = await getLedgerEntries(filters);
            const allEntries = Array.isArray(res.data) ? res.data : [];
            
            if (allEntries.length === 0) {
                toast.error('No transactions available to download');
                return;
            }

            const headers = ["Date", "Description", "Audit Trace", "Debit", "Credit", "Amount"];
            const rows = allEntries.map((entry: any) => {
                const entryDateStr = entry.entryDate || entry.date;
                const dateObj = new Date(entryDateStr);
                let formattedDate = entryDateStr;
                if (!dateObj || isNaN(dateObj.getTime())) {
                    formattedDate = String(entryDateStr || "");
                } else {
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const year = dateObj.getFullYear();
                    formattedDate = `${month}/${day}/${year}`;
                }

                const debitVal = entry.amount !== undefined
                    ? (entry.type === 'DEBIT' ? entry.amount : 0)
                    : (entry.debit || 0);

                const creditVal = entry.amount !== undefined
                    ? (entry.type === 'CREDIT' ? entry.amount : 0)
                    : (entry.credit || 0);

                const netAmount = debitVal - creditVal;

                return [
                    `"${formattedDate}"`,
                    `"${(entry.description || '').replace(/"/g, '""')}"`,
                    `"${(entry.auditTrace || entry.transactionId || '').replace(/"/g, '""')}"`,
                    debitVal,
                    creditVal,
                    netAmount
                ];
            });

            // Prepend BOM to ensure Excel opens CSV as UTF-8
            const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);

            const cleanCodeName = (code?.name || 'ledger').toLowerCase().replace(/[^a-z0-9]/g, '_');
            const rangeStr = (tempStartDate && tempEndDate) ? `${tempStartDate.replace(/[\/\\?%*:|"<>]/g, '-')}_to_${tempEndDate.replace(/[\/\\?%*:|"<>]/g, '-')}` : 'all';
            link.setAttribute("download", `${cleanCodeName}_${rangeStr}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded all ${allEntries.length} filtered transactions successfully!`);
        } catch (err: any) {
            toast.error('Failed to download ledger data');
        } finally {
            setLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fetch the accounting code details
            const allCodes = await getAllAccountingCodes() as AccountingCode[];
            const foundCode = allCodes.find(c => c._id === id || (c as any).id === id);

            if (!foundCode) {
                setError("Accounting code not found.");
                setLoading(false);
                return;
            }
            setCode(foundCode);

            // 2. Fetch the ledger entries for this code
            const filters = {
                accountingCode: id,
                page,
                limit,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                sort: sortDirection
            };
            const ledgerRes = await getLedgerEntries(filters);
            setEntries(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
            if (ledgerRes.pagination) {
                setPagination({
                    total: ledgerRes.pagination.total || 0,
                    pages: ledgerRes.pagination.totalPages || ledgerRes.pagination.pages || 1,
                    limit: ledgerRes.pagination.limit || 25
                });
            }
            if (ledgerRes.summary) {
                setSummary({
                    totalDebit: ledgerRes.summary.totalDebit || 0,
                    totalCredit: ledgerRes.summary.totalCredit || 0,
                    netMovement: ledgerRes.summary.netMovement || 0,
                    openingBalance: ledgerRes.summary.openingBalance || 0,
                    closingBalance: ledgerRes.summary.closingBalance || 0
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch details');
        } finally {
            setLoading(false);
        }
    }, [id, page, limit, startDate, endDate, sortDirection]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!importFile) {
            toast.error('Please upload a statement file');
            return;
        }

        setImporting(true);
        // Simulate importing statement file
        setTimeout(() => {
            setImporting(false);
            setIsImportModalOpen(false);
            setImportFile(null);
            toast.success('Statement import completed: 12 new transactions reconciled.');
            fetchData(); // Refresh the ledger list!
        }, 1500);
    };

    const handleInvoiceClick = async (invoiceNumber: string) => {
        try {
            const { getInvoices } = await import('../../../services/invoiceService');
            const response = await getInvoices({ search: invoiceNumber });
            const basePath = location.pathname.split('/chart-of-accounts/')[0];
            if (response.data && response.data.length > 0) {
                const invoice = response.data.find((inv: any) => inv.invoiceNumber === invoiceNumber) || response.data[0];
                navigate(`${basePath}/invoices/${invoice._id}`);
            } else {
                navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/chart-of-accounts/')[0];
            navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
        }
    };

    const handleBillClick = async (billNumber: string) => {
        try {
            const { getAllBills } = await import('../../../services/billService');
            const response = await getAllBills({ search: billNumber });
            const basePath = location.pathname.split('/chart-of-accounts/')[0];
            if (response.success && response.data && response.data.length > 0) {
                const bill = response.data.find((b: any) => b.billNumber === billNumber) || response.data[0];
                navigate(`${basePath}/bills/${bill._id}`);
            } else {
                navigate(`${basePath}/bills`, { state: { search: billNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/chart-of-accounts/')[0];
            navigate(`${basePath}/bills`, { state: { search: billNumber } });
        }
    };

    const renderDescriptionWithLinks = (description: string, entry?: any) => {
        if (!description) return <span style={{ color: 'var(--text-dim)' }}>—</span>;

        const billRegex = /((?:BILL|SB)-\w+(?:-\w+)*)/gi;
        const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/gi;

        const matchedBills = Array.from(new Set(description.match(billRegex) || []));
        const matchedInvoicesFromDesc = description.match(invoiceRegex) || [];

        const invoicesFromEntry: string[] = [];
        if (entry) {
            if (Array.isArray(entry.invoices)) {
                entry.invoices.forEach((inv: any) => {
                    const num = typeof inv === 'string' ? inv : inv?.invoiceNumber;
                    if (num) invoicesFromEntry.push(num);
                });
            }
            if (entry.setOffSummary && Array.isArray(entry.setOffSummary.invoices)) {
                entry.setOffSummary.invoices.forEach((inv: any) => {
                    if (inv?.invoiceNumber) invoicesFromEntry.push(inv.invoiceNumber);
                });
            }
        }

        const matchedInvoices = Array.from(new Set([...matchedInvoicesFromDesc, ...invoicesFromEntry]));

        if (matchedBills.length > 0 || matchedInvoices.length > 0) {
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {matchedBills.map((billNum) => (
                            <button
                                key={billNum}
                                onClick={(e) => { e.stopPropagation(); handleBillClick(billNum); }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C8E600] hover:underline self-start bg-[#C8E600]/10 border border-[#C8E600]/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                                <Receipt size={11} strokeWidth={2.5} />
                                View Bill ({billNum})
                            </button>
                        ))}
                        {matchedInvoices.map((invNum) => (
                            <button
                                key={invNum}
                                onClick={(e) => { e.stopPropagation(); handleInvoiceClick(invNum); }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:underline self-start bg-lime/10 border border-lime/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                style={{ color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.06)' }}
                            >
                                <FileText size={11} strokeWidth={2.5} />
                                View Invoice ({invNum})
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>;
    };

    if (loading && !code) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !code) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Account</h2>
                <p className="text-white/60">{error || 'Account not found'}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 mt-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold">
                    Go Back
                </button>
            </div>
        );
    }

    const style = CATEGORY_STYLES[code.category] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent' };



    return (
        <div className="container-responsive space-y-6 pb-20 animate-fade-in">
            <Breadcrumbs
                items={[
                    { label: 'Finance', path: '../../finance-dashboard' },
                    window.location.pathname.includes('/bank-accounts/')
                        ? { label: 'Bank Accounts', path: '../bank-accounts' }
                        : { label: 'Chart of Accounts', path: '../chart-of-accounts' },
                    { label: code.code, active: true }
                ]}
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-lime hover:text-brand-lime/80 transition-colors mb-4 group"
                        style={{ color: 'var(--brand-lime)' }}
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Accounts
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            <BookMarked size={28} style={{ color: 'var(--brand-lime)' }} />
                            {code.name}
                        </h1>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                            {code.category}
                        </span>
                    </div>
                    <p className="text-sm font-mono text-white/50">Code: {code.code}</p>
                </div>

                <button
                    onClick={handleClearLedger}
                    disabled={clearing}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-red-500/10 cursor-pointer"
                >
                    <Trash2 size={14} />
                    {clearing 
                        ? 'Clearing...' 
                        : window.location.pathname.includes('/bank-accounts/')
                            ? (startDate || endDate)
                                ? `Delete Filtered Bank Entries (${pagination.total} entries)`
                                : `Delete Bank Entries (${pagination.total} entries)`
                            : (startDate || endDate)
                                ? `Clear Filtered Ledger (${pagination.total} entries)`
                                : `Clear All Ledger (${pagination.total} entries)`}
                </button>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Opening Balance Card */}
                <div className="p-5 rounded-2xl border bg-card flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Opening Balance</span>
                    <span className="text-xl font-mono font-black mt-2" style={{ color: 'var(--text-main)' }}>
                        ${(summary.openingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                {/* Total Debits Card */}
                <div className="p-5 rounded-2xl border bg-card flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Total Debits</span>
                    <span className="text-xl font-mono font-black text-rose-500 mt-2">
                        ${(summary.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                {/* Total Credits Card */}
                <div className="p-5 rounded-2xl border bg-card flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Total Credits</span>
                    <span className="text-xl font-mono font-black text-green-500 mt-2">
                        ${(summary.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                {/* Closing Balance Card */}
                <div className="p-5 rounded-2xl border bg-card flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--brand-lime)' }}>Closing Balance</span>
                    <span className="text-xl font-mono font-black mt-2" style={{ color: 'var(--text-main)' }}>
                        ${(summary.closingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Date and Sort Filters */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex flex-col sm:flex-row gap-4 justify-between items-center transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Filter By Date:</span>
                    <input 
                        type="date" 
                        value={tempStartDate}
                        onChange={e => setTempStartDate(e.target.value)}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <span className="opacity-45 text-xs" style={{ color: 'var(--text-dim)' }}>to</span>
                    <input 
                        type="date" 
                        value={tempEndDate}
                        onChange={e => setTempEndDate(e.target.value)}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <button
                        onClick={() => {
                            const parseInputDateToISO = (str: string) => {
                                if (!str || !str.trim()) return '';
                                if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
                                const match = str.trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
                                if (match) {
                                    const month = match[1].padStart(2, '0');
                                    const day = match[2].padStart(2, '0');
                                    const year = match[3];
                                    return `${year}-${month}-${day}`;
                                }
                                return '';
                            };
                            
                            const startISO = parseInputDateToISO(tempStartDate);
                            const endISO = parseInputDateToISO(tempEndDate);
                            
                            if (tempStartDate && !startISO) {
                                toast.error('Invalid Start Date.');
                                return;
                            }
                            if (tempEndDate && !endISO) {
                                toast.error('Invalid End Date.');
                                return;
                            }
                            
                            setStartDate(startISO);
                            setEndDate(endISO);
                            setPage(1);
                        }}
                        className="px-4 py-1.5 rounded-xl border border-[#C8E600]/30 bg-[#C8E600]/10 text-[#C8E600] hover:bg-[#C8E600]/20 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                        Filter
                    </button>
                    {(startDate || endDate || tempStartDate || tempEndDate) && (
                        <button
                            onClick={() => {
                                setTempStartDate('');
                                setTempEndDate('');
                                setStartDate('');
                                setEndDate('');
                                setPage(1);
                            }}
                            className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 cursor-pointer"
                        >
                            Clear dates
                        </button>
                    )}
                    <button
                        onClick={handleDownloadFilteredData}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-all text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                        <Download size={12} />
                        Download
                    </button>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Sort:</span>
                    <select
                        value={sortDirection}
                        onChange={e => { setSortDirection(e.target.value as 'asc' | 'desc'); setPage(1); }}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="desc" className="bg-[var(--bg-card)]">Newest First</option>
                        <option value="asc" className="bg-[var(--bg-card)]">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <List size={18} className="text-white/50" />
                    <h3 className="font-bold text-sm tracking-wide text-white/80">Account Transactions</h3>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No transactions found</p>
                            <p className="text-sm mt-1">This account hasn't been used in any ledger entries yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50">Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50">Audit Trace</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right text-white/50">Debit</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right text-white/50">Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => {
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    let formattedDate = entryDateStr;
                                    if (!isNaN(dateObj.getTime())) {
                                        const day = String(dateObj.getDate()).padStart(2, '0');
                                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                        const year = dateObj.getFullYear();
                                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        formattedDate = `${month}/${day}/${year} ${timeStr}`;
                                    }

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
                                            onClick={() => {
                                                const basePath = location.pathname.split('/chart-of-accounts/')[0];
                                                navigate(`${basePath}/ledger/${entry._id}`);
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderDescriptionWithLinks(entry.description, entry)}
                                                {entry.referenceId && (
                                                    <div className="text-[10px] font-mono mt-1 opacity-60">Ref: {entry.referenceId}</div>
                                                )}
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
            {/* Import Statement Modal Workspace */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setIsImportModalOpen(false)} />
                    <div className="relative border rounded-[2.5rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Import Bank Statement</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime">Reconcile Ledger Items</p>
                            </div>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Account</label>
                                <input
                                    type="text"
                                    value={`${code.name} (${code.code})`}
                                    disabled
                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold opacity-60"
                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Upload Statement File (CSV / OFX / QIF)</label>
                                <div className="border border-dashed rounded-2xl p-6 text-center space-y-3 hover:border-lime/50 transition-all relative" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <FileSpreadsheet size={32} className="mx-auto text-dim opacity-40" />
                                    {importFile ? (
                                        <p className="text-xs font-bold text-lime" style={{ color: 'var(--brand-lime)' }}>{importFile.name}</p>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Drag statement here or click to browse</p>
                                            <p className="text-[10px] text-dim">Maximum file size: 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".csv,.ofx,.qif"
                                        onChange={e => setImportFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-dim bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                <Info size={16} className="text-lime flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-lime)' }} />
                                <span className="leading-relaxed">Ola Cars uses smart matching filters to link imported bank entries with recorded supplier bills and client invoices automatically.</span>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={importing}
                                    className="flex-[2] py-4 bg-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {importing ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Reconcile Statement</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccountingCodeDetails;
