import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText,
    ArrowLeft,
    Clock,
    User,
    Tag,
    Info,
    Repeat,
    AlertTriangle,
    Pencil,
    Hash,
    BookOpen,
    Layers
} from 'lucide-react';
import { getLedgerEntryById, getLedgerEntries, updateLedgerEntry } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
};

const AccountingTransactionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [entry, setEntry] = useState<LedgerEntry | null>(null);
    const [relatedEntries, setRelatedEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [updatingDescription, setUpdatingDescription] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const data = await getLedgerEntryById(id);
                setEntry(data);
                setEditedDescription(data.description || '');

                // Fetch connected entries (same manualJournal ID, transaction ID, voucher, or reference ID)
                let list: LedgerEntry[] = [];
                const dataAny = data as any;

                const extractList = (res: any): LedgerEntry[] => {
                    if (!res) return [];
                    if (Array.isArray(res)) return res;
                    if (Array.isArray(res.data)) return res.data;
                    if (Array.isArray(res.entries)) return res.entries;
                    return [];
                };

                if (dataAny.transactionId) {
                    const res = await getLedgerEntries({ transactionId: dataAny.transactionId, limit: 50 });
                    list = extractList(res);
                }

                if (list.length === 0 && dataAny.transaction) {
                    const txId = typeof dataAny.transaction === 'object' ? dataAny.transaction._id : dataAny.transaction;
                    const res = await getLedgerEntries({ transaction: txId, limit: 50 });
                    list = extractList(res);
                }

                if (list.length === 0 && dataAny.manualJournal) {
                    const mjId = typeof dataAny.manualJournal === 'object' ? dataAny.manualJournal._id : dataAny.manualJournal;
                    const res = await getLedgerEntries({ manualJournal: mjId, limit: 50 });
                    list = extractList(res);
                }

                if (list.length === 0 && dataAny.voucher) {
                    const vId = typeof dataAny.voucher === 'object' ? dataAny.voucher._id : dataAny.voucher;
                    const res = await getLedgerEntries({ voucher: vId, limit: 50 });
                    list = extractList(res);
                }

                if (list.length === 0 && data.referenceId) {
                    const res = await getLedgerEntries({ search: data.referenceId, limit: 50 });
                    list = extractList(res);
                }

                // Ensure primary entry is included in list if not already present
                if (!list.some(e => String(e._id) === String(data._id))) {
                    list.unshift(data);
                }

                setRelatedEntries(list);
            } catch (err: any) {
                console.error("Failed to load chart of accounts transaction details:", err);
                setError(err.response?.data?.message || err.message || "Failed to load transaction details");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id]);

    const handleUpdateDescription = async () => {
        if (!entry || !id) return;
        if (!editedDescription.trim()) {
            toast.error("Description cannot be empty");
            return;
        }
        setUpdatingDescription(true);
        const toastId = toast.loading("Updating description...");
        try {
            const updated = await updateLedgerEntry(id, { description: editedDescription.trim() });
            setEntry(updated);
            setIsEditingDescription(false);
            toast.success("Description updated successfully", { id: toastId });
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update description", { id: toastId });
        } finally {
            setUpdatingDescription(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Transaction Details</h2>
                <p className="text-white/60">{error || 'Transaction entry not found'}</p>
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

    const category = entry.accountingCode?.category?.toUpperCase() || 'ASSET';
    const catStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES['ASSET'];

    const entryDateObj = new Date(entry.entryDate || entry.createdAt || Date.now());
    const formattedDate = !isNaN(entryDateObj.getTime())
        ? `${entryDateObj.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} ${entryDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : entry.entryDate;

    const isDebit = entry.type === 'DEBIT';
    const debitAmount = entry.amount !== undefined ? (isDebit ? entry.amount : 0) : (entry.debit || 0);
    const creditAmount = entry.amount !== undefined ? (!isDebit ? entry.amount : 0) : (entry.credit || 0);
    const primaryAmount = isDebit ? debitAmount : creditAmount;

    const entryAny = entry as any;
    const sourceDocType = entryAny.manualJournal ? 'Manual Journal' : (entryAny.transaction ? 'Bank Upload' : 'Ledger Entry');

    const codeId = entry.accountingCode?._id;
    const parentAccountPath = codeId ? `../../chart-of-accounts/${codeId}` : '../../chart-of-accounts';

    return (
        <div className="container-responsive space-y-6 animate-fade-in pb-20">
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Chart of Accounts', path: '../../chart-of-accounts' },
                    { label: entry.accountingCode?.name || 'Account', path: parentAccountPath },
                    { label: 'Transaction Details', active: true }
                ]} 
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-xs font-semibold mb-3 group opacity-70 hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Account Details
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            <BookOpen size={28} style={{ color: 'var(--brand-lime)' }} />
                            Chart of Accounts Transaction
                        </h1>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}>
                            {category} ({entry.accountingCode?.code || 'GL'})
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${isDebit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                            {entry.type}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto">
                    <div className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>Transaction Amount</div>
                    <div className={`text-3xl font-mono font-bold ${isDebit ? 'text-green-400' : 'text-red-400'}`}>
                        {isDebit ? '+' : '-'}${primaryAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (2 Cols) */}
                <div className="col-span-1 lg:col-span-2 space-y-6">

                    {/* Primary Info Card */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <Info size={16} /> Transaction Overview
                            </h3>
                            {!isEditingDescription && (
                                <button
                                    onClick={() => setIsEditingDescription(true)}
                                    className="flex items-center gap-1 text-xs font-bold hover:underline opacity-80 hover:opacity-100"
                                    style={{ color: 'var(--brand-lime)' }}
                                >
                                    <Pencil size={12} /> Edit Description
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Description</p>
                                {isEditingDescription ? (
                                    <div className="space-y-2 mt-1">
                                        <textarea
                                            value={editedDescription}
                                            onChange={(e) => setEditedDescription(e.target.value)}
                                            className="w-full p-3 rounded-xl border text-sm outline-none focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            rows={3}
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                            <button
                                                onClick={() => {
                                                    setIsEditingDescription(false);
                                                    setEditedDescription(entry.description || '');
                                                }}
                                                disabled={updatingDescription}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 hover:bg-white/5"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleUpdateDescription}
                                                disabled={updatingDescription}
                                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-lime text-black hover:opacity-90 disabled:opacity-50"
                                            >
                                                {updatingDescription ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="font-semibold text-base leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                        {entry.description || 'No description provided'}
                                    </p>
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Clock size={12}/> Time of Transaction
                                </p>
                                <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {formattedDate}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Hash size={12}/> Reference / Transaction ID
                                </p>
                                <p className="font-mono text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                    {entry.referenceId || entryAny.transactionId || 'N/A'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={12}/> Accounting Code
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/5 border border-white/10" style={{ color: 'var(--text-main)' }}>
                                        {entry.accountingCode?.code || 'N/A'}
                                    </span>
                                    <span className="text-xs font-semibold opacity-90" style={{ color: 'var(--text-main)' }}>
                                        {entry.accountingCode?.name || 'General Ledger'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Layers size={12}/> Stored Running Balance
                                </p>
                                <p className="font-mono text-sm font-bold text-blue-400">
                                    {entry.runningBalance !== undefined && entry.runningBalance !== null
                                        ? `$${entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Associated Transactions Section (Double-Entry Impact) */}
                    <div className="p-6 rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Repeat size={16} /> Associated Transactions
                        </h3>
                        {relatedEntries.length === 0 ? (
                            <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>No related associated transactions found.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b uppercase tracking-wider" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                        <tr>
                                            <th className="py-3 px-3 font-bold">Leg Role</th>
                                            <th className="py-3 px-3 font-bold">Ledger Account</th>
                                            <th className="py-3 px-3 font-bold text-center">Type</th>
                                            <th className="py-3 px-3 font-bold text-right">Debit ($)</th>
                                            <th className="py-3 px-3 font-bold text-right">Credit ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatedEntries.map(rel => {
                                            const isPrimary = String(rel._id) === String(entry._id);
                                            const relDebit = rel.amount !== undefined ? (rel.type === 'DEBIT' ? rel.amount : 0) : (rel.debit || 0);
                                            const relCredit = rel.amount !== undefined ? (rel.type === 'CREDIT' ? rel.amount : 0) : (rel.credit || 0);
                                            return (
                                                <tr key={rel._id} className={`border-b last:border-0 hover:bg-white/5 transition-colors ${isPrimary ? 'bg-[#C8E600]/10 font-medium' : ''}`} style={{ borderColor: 'var(--border-main)' }}>
                                                    <td className="py-3 px-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                                            isPrimary 
                                                                ? 'bg-[#C8E600]/20 text-[#C8E600] border-[#C8E600]/30' 
                                                                : 'bg-white/5 text-white/70 border-white/10'
                                                        }`}>
                                                            {isPrimary ? '⭐ Primary Leg' : '🔗 Partner Leg'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/5 border border-white/10" style={{ color: 'var(--text-main)' }}>
                                                                {rel.accountingCode?.code || 'GL'}
                                                            </span>
                                                            <span className="text-xs" style={{ color: 'var(--text-main)' }}>
                                                                {rel.accountingCode?.name || 'General Ledger'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                            rel.type === 'DEBIT' 
                                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                            {rel.type || 'DEBIT'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-green-400">
                                                        {relDebit > 0 ? `$${relDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                    <td className="py-3 px-3 text-right font-mono font-bold text-red-400">
                                                        {relCredit > 0 ? `$${relCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr style={{ background: 'var(--bg-sidebar)' }}>
                                            <td colSpan={3} className="py-3 px-3 font-bold uppercase tracking-widest text-xs text-right" style={{ color: 'var(--text-muted)' }}>Totals</td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-green-400">
                                                ${relatedEntries.reduce((sum, e) => sum + (e.amount !== undefined ? (e.type === 'DEBIT' ? e.amount : 0) : (e.debit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-red-400">
                                                ${relatedEntries.reduce((sum, e) => sum + (e.amount !== undefined ? (e.type === 'CREDIT' ? e.amount : 0) : (e.credit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="col-span-1 space-y-6">

                    {/* Source Origin Info */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={16} /> Source Origin
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Source Type</span>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>{sourceDocType}</span>
                            </div>

                            <div className="flex justify-between items-center pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Recorded By</span>
                                <div className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-main)' }}>
                                    <User size={14} style={{ color: 'var(--text-dim)' }} />
                                    {entry.creatorRole || 'SYSTEM'}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default AccountingTransactionDetailPage;
