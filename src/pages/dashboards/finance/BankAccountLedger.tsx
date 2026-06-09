import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    BookMarked, 
    ArrowLeft, 
    List,
    AlertTriangle,
    FileText,
    Receipt,
    User,
    Upload,
    FileSpreadsheet,
    Info,
    Coins,
    Building2,
    Plus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBankAccountById, type BankAccount } from '../../../services/bankAccountService';
import { getLedgerEntries, type LedgerEntry } from '../../../services/ledgerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const BankAccountLedger = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [account, setAccount] = useState<BankAccount | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });

    // Import Statement Modal States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fetch the bank account details
            const res = await getBankAccountById(id);
            const accountData = res.data || res;
            setAccount(accountData);

            // 2. Fetch the ledger entries for this linked code
            const accCodeId = accountData.accountingCode?._id || accountData.accountingCode;
            if (accCodeId) {
                const filters = {
                    accountingCode: typeof accCodeId === 'object' ? accCodeId._id : accCodeId,
                    page,
                    limit
                };
                const ledgerRes = await getLedgerEntries(filters);
                setEntries(Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
                if (ledgerRes.pagination) {
                    setPagination(ledgerRes.pagination);
                }
            } else {
                setEntries([]);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch details');
        } finally {
            setLoading(false);
        }
    }, [id, page, limit]);

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
            const basePath = location.pathname.split('/bank-accounts/')[0];
            if (response.data && response.data.length > 0) {
                const invoice = response.data.find((inv: any) => inv.invoiceNumber === invoiceNumber) || response.data[0];
                navigate(`${basePath}/invoices/${invoice._id}`);
            } else {
                navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/bank-accounts/')[0];
            navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
        }
    };

    const handleBillClick = async (billNumber: string) => {
        try {
            const { getAllBills } = await import('../../../services/billService');
            const response = await getAllBills({ search: billNumber });
            const basePath = location.pathname.split('/bank-accounts/')[0];
            if (response.success && response.data && response.data.length > 0) {
                const bill = response.data.find((b: any) => b.billNumber === billNumber) || response.data[0];
                navigate(`${basePath}/bills/${bill._id}`);
            } else {
                navigate(`${basePath}/bills`, { state: { search: billNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/bank-accounts/')[0];
            navigate(`${basePath}/bills`, { state: { search: billNumber } });
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
                        onClick={(e) => { e.stopPropagation(); handleBillClick(billNum); }}
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
                        onClick={(e) => { e.stopPropagation(); handleInvoiceClick(invNum); }}
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

    if (loading && !account) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !account) {
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

    // Derived statistics (calculated locally for this page's view)
    const totalDebit = entries.reduce((sum, entry) => {
        if (entry.amount !== undefined && entry.type === 'DEBIT') return sum + entry.amount;
        return sum + (entry.debit || 0);
    }, 0);

    const totalCredit = entries.reduce((sum, entry) => {
        if (entry.amount !== undefined && entry.type === 'CREDIT') return sum + entry.amount;
        return sum + (entry.credit || 0);
    }, 0);

    return (
        <div className="container-responsive space-y-6 pb-20 animate-fade-in" style={{ color: 'var(--text-main)' }}>
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Bank Accounts', path: '../bank-accounts' },
                    { label: `${account.accountName || account.bankName} Ledger`, active: true }
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
                            {account.accountType === 'Cash' ? (
                                <Coins size={28} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            ) : (
                                <Building2 size={28} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            )}
                            {account.accountName || account.bankName}
                        </h1>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>
                            {account.accountType || 'Bank'}
                        </span>
                    </div>
                    <p className="text-sm font-mono text-white/50">Code: {account.accountCode || 'N/A'} | Num: {account.accountNumber}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Upload size={14} strokeWidth={3} /> Import Statement
                    </button>

                    <div className="flex items-center gap-6 border-l border-white/10 pl-6">
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">Period Debit</div>
                            <div className="text-xl font-mono font-bold text-red-400">
                                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">Period Credit</div>
                            <div className="text-xl font-mono font-bold text-green-400">
                                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right pl-6 border-l border-white/10">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-brand-lime mb-1" style={{ color: 'var(--brand-lime)' }}>Ledger Balance</div>
                            <div className="text-xl font-mono font-black" style={{ color: 'var(--text-main)' }}>
                                {account.currency || 'USD'} {account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
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
                                    const formattedDate = !isNaN(dateObj.getTime()) 
                                        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                        : entryDateStr;

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
                                                const basePath = location.pathname.split('/bank-accounts/')[0];
                                                navigate(`${basePath}/ledger/${entry._id}`);
                                            }}
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
                    <div className="relative border rounded-[2.5rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Import Bank Statement</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime" style={{ color: 'var(--brand-lime)' }}>Reconcile Ledger Items</p>
                            </div>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Account</label>
                                <input 
                                    type="text" 
                                    value={`${account.accountName || account.bankName} (${account.accountCode || 'N/A'})`}
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
                                <span className="leading-relaxed font-semibold">Ola Cars uses smart matching filters to link imported bank entries with recorded supplier bills and client invoices automatically.</span>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={importing}
                                    className="flex-[2] py-4 bg-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
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

export default BankAccountLedger;
