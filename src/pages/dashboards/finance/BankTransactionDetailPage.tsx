import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Tag, Building2, Info, Coins, CircleCheck, Hash, MapPin, TriangleAlert, Layers } from 'lucide-react';
import { getBankTransactionById } from '../../../services/bankAccountService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const TYPE_STYLES = {
    'DEBIT': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)', label: 'DEBIT (Deposit)' }, // Green
    'CREDIT': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)', label: 'CREDIT (Withdrawal)' }, // Red
};

const BankTransactionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [transaction, setTransaction] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const res = await getBankTransactionById(id);
                setTransaction(res);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch transaction details');
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !transaction) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <TriangleAlert size={48} className="text-red-500" />
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Error Loading Transaction</h2>
                <p style={{ color: 'var(--text-muted)' }}>{error || 'Transaction not found'}</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="px-4 py-2 mt-4 rounded-xl transition-all font-semibold border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    Go Back
                </button>
            </div>
        );
    }

    const typeStyle = TYPE_STYLES[transaction.type as 'DEBIT' | 'CREDIT'] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent', label: transaction.type };
    
    const dateObj = new Date(transaction.entryDate || transaction.createdAt);
    const formattedDate = !isNaN(dateObj.getTime()) 
        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
        : transaction.entryDate;

    return (
        <div className="container-responsive space-y-6 animate-fade-in pb-20">
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Bank Accounts', path: '../../bank-accounts' },
                    { label: 'Transaction Details', active: true }
                ]} 
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-lime hover:text-brand-lime/80 transition-colors mb-4 group"
                        style={{ color: 'var(--brand-lime)' }}
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Account Ledger
                    </button>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Coins size={28} style={{ color: 'var(--brand-lime)' }} />
                        Bank Transaction details
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border ml-2" style={{ background: typeStyle.bg, color: typeStyle.text, borderColor: typeStyle.border }}>
                            {typeStyle.label}
                        </span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Transaction Value</div>
                    <div className={`text-3xl font-mono font-bold ${transaction.type === 'DEBIT' ? 'text-green-400' : 'text-red-400'}`}>
                        {transaction.type === 'DEBIT' ? '+' : '-'}{transaction.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Details Card */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    
                    {/* Primary Info */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Info size={16} /> Transaction Summary
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Description</p>
                                <p className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>{transaction.description}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}><Clock size={12}/> Time of Transaction</p>
                                <p className="font-mono text-sm" style={{ color: 'var(--text-main)' }}>{formattedDate}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}><Hash size={12}/> Transaction Reference ID</p>
                                <p className="font-mono text-sm font-bold" style={{ color: 'var(--text-main)' }}>{transaction.transactionId || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}><Layers size={12}/> Running Balance</p>
                                <p className="font-mono text-sm text-blue-400 font-bold">
                                    {transaction.runningBalance !== undefined ? transaction.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}><MapPin size={12}/> Branch Location</p>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                    {transaction.branch ? `${transaction.branch.name} (${transaction.branch.code || ''})` : 'Global / Head Office'}
                                </p>
                            </div>
                            {transaction.accountingCode && (
                                <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}><Tag size={12}/> Linked Accounting Code</p>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-white/5 border px-3 py-1.5 rounded-lg font-mono font-bold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                            {transaction.accountingCode.code}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{transaction.accountingCode.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Category: {transaction.accountingCode.category}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Connected Double-Entry Ledger Entries */}
                    <div className="p-6 rounded-2xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <Layers size={16} className="text-[#C8E600]" /> Connected Ledger Entries (Double-Entry Impact)
                                </h3>
                                <p className="text-xs opacity-70 mt-0.5">
                                    Double-entry accounting journal lines generated for this bank transaction upload/edit.
                                </p>
                            </div>
                            <span className="text-[11px] font-bold text-[#C8E600] px-3 py-1 rounded-full bg-[#C8E600]/10 border border-[#C8E600]/20">
                                {transaction.connectedLedgerEntries?.length || 0} Line(s) Connected
                            </span>
                        </div>

                        {transaction.connectedLedgerEntries && transaction.connectedLedgerEntries.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b text-[11px] font-semibold uppercase tracking-wider" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                            <th className="px-4 py-3">Accounting Code</th>
                                            <th className="px-4 py-3">Type</th>
                                            <th className="px-4 py-3 text-right">Amount ($)</th>
                                            <th className="px-4 py-3">Contact / Description</th>
                                            <th className="px-4 py-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transaction.connectedLedgerEntries.map((lEntry: any) => (
                                            <tr key={lEntry._id} className="border-b last:border-0 hover:bg-white/5 transition-colors text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="px-4 py-3 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/5 border border-white/10" style={{ color: 'var(--text-main)' }}>
                                                            {lEntry.accountingCode?.code || 'N/A'}
                                                        </span>
                                                        <span className="opacity-90">{lEntry.accountingCode?.name || 'General Ledger'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                        lEntry.type === 'DEBIT' 
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    }`}>
                                                        {lEntry.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                    ${lEntry.amount?.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-0.5">
                                                        {lEntry.contact && (
                                                            <div className="font-bold text-emerald-400 flex items-center gap-1">
                                                                👤 {lEntry.contact.name || lEntry.contact.customerId}
                                                            </div>
                                                        )}
                                                        <div className="opacity-70 truncate max-w-xs">{lEntry.description}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`../ledger-entries/${lEntry._id}`)}
                                                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border rounded-lg transition-colors cursor-pointer"
                                                        style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                                    >
                                                        View Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-xs opacity-60 italic py-4 text-center">No connected double-entry ledger lines found.</p>
                        )}
                    </div>

                    {/* Invoice Set-off History Card (If present) */}
                    {transaction.setOffHistory && (
                        <div className="p-6 rounded-2xl border space-y-4 bg-emerald-500/5" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                        ⚡ Automated Invoice Set-off History
                                    </h3>
                                    <p className="text-xs opacity-75 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        Before and After invoice state snapshots preserved for this transaction.
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                    Customer: {transaction.setOffHistory.customer?.name || 'Linked Customer'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {transaction.setOffHistory.invoiceSnapshots?.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b text-[10px] font-bold uppercase tracking-wider text-emerald-400 border-emerald-500/20">
                                                    <th className="px-3 py-2">Invoice #</th>
                                                    <th className="px-3 py-2">Applied Amount</th>
                                                    <th className="px-3 py-2">Before State</th>
                                                    <th className="px-3 py-2">After State</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transaction.setOffHistory.invoiceSnapshots.map((snap: any, sIdx: number) => (
                                                    <tr key={sIdx} className="border-b last:border-0 border-emerald-500/10 text-xs">
                                                        <td className="px-3 py-2.5 font-bold text-emerald-400">
                                                            {snap.invoiceNumber}
                                                        </td>
                                                        <td className="px-3 py-2.5 font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                            ${snap.amountApplied?.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="text-[11px] opacity-70">
                                                                Paid: ${snap.before?.amountPaid?.toFixed(2)} | Bal: ${snap.before?.balance?.toFixed(2)}
                                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-bold">{snap.before?.status}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="text-[11px] font-semibold text-emerald-400">
                                                                Paid: ${snap.after?.amountPaid?.toFixed(2)} | Bal: ${snap.after?.balance?.toFixed(2)}
                                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">{snap.after?.status}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {transaction.setOffHistory.excessAmount > 0 && (
                                    <div className="p-3 rounded-xl bg-[#C8E600]/10 border border-[#C8E600]/30 text-xs flex justify-between items-center">
                                        <div>
                                            <div className="font-black text-[#C8E600] flex items-center gap-1.5">
                                                ⚡ Advance Received (Account 2.1.02)
                                            </div>
                                            <div className="text-[10px] opacity-70 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                                Excess payment unconsumed by open invoices routed to customer advance.
                                            </div>
                                        </div>
                                        <div className="text-base font-black text-[#C8E600] font-mono">
                                            ${transaction.setOffHistory.excessAmount?.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="col-span-1 space-y-6">
                    
                    {/* Source Bank Account Card */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Building2 size={16} /> Bank Account
                        </h3>
                        {transaction.bankAccount ? (
                            <div className="space-y-4 text-sm">
                                <div className="pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-xs block" style={{ color: 'var(--text-dim)' }}>Account Name</span>
                                    <span className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                                        {transaction.bankAccount.accountName || transaction.bankAccount.bankName}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Account Number</span>
                                    <span className="font-mono font-semibold" style={{ color: 'var(--text-main)' }}>{transaction.bankAccount.accountNumber}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Currency</span>
                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{transaction.bankAccount.currency || 'USD'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span style={{ color: 'var(--text-muted)' }}>Status</span>
                                    <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: '#22c55e' }}>
                                        <CircleCheck size={12} /> {transaction.bankAccount.status || 'ACTIVE'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>No bank account linked.</p>
                        )}
                    </div>

                    {/* Audit Trail */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <User size={16} /> Audit Trail
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs block mb-1" style={{ color: 'var(--text-dim)' }}>Processed By</span>
                                <div className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>
                                    {transaction.createdBy && typeof transaction.createdBy === 'object' 
                                        ? transaction.createdBy.name || transaction.createdBy.email 
                                        : 'SYSTEM'}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs block mb-1" style={{ color: 'var(--text-dim)' }}>Role / Authority</span>
                                <div className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border-main)' }}>
                                    {transaction.creatorRole || 'SYSTEM'}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BankTransactionDetailPage;
