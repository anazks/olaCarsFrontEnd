import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, 
    BookOpen, 
    Calendar, 
    User, 
    AlertCircle, 
    CheckCircle2, 
    Pencil, 
    Trash2, 
    Check, 
    AlertTriangle, 
    Building2, 
    DollarSign,
    RefreshCw,
    Scale,
    Search,
    ChevronDown
} from 'lucide-react';
import { 
    getManualJournalById, 
    updateLedgerEntry, 
    deleteSingleLedgerEntry, 
    deleteManualJournal 
} from '../../../services/ledgerService';
import type { ManualJournal, LedgerEntry } from '../../../services/ledgerService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import toast from 'react-hot-toast';

interface ManualJournalDetailModalProps {
    journalId: string;
    onClose: () => void;
    onJournalUpdated?: () => void;
    onJournalDeleted?: () => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'ASSET': { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
    'LIABILITY': { bg: 'rgba(249,115,22,0.15)', text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
    'EQUITY': { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
    'INCOME': { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    'EXPENSE': { bg: 'rgba(239,68,68,0.15)', text: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

/**
 * Custom Searchable Account Selector in Ola Dark Theme
 */
const SearchableAccountSelector = ({
    accounts,
    selectedId,
    onSelect,
    isOpen,
    setIsOpen
}: {
    accounts: AccountingCode[];
    selectedId: string;
    onSelect: (id: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) => {
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedAccount = accounts.find(a => a._id === selectedId);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, setIsOpen]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return accounts;
        return accounts.filter(a => 
            a.name?.toLowerCase().includes(q) ||
            a.code?.toLowerCase().includes(q) ||
            a.category?.toLowerCase().includes(q)
        );
    }, [accounts, search]);

    return (
        <div ref={containerRef} className="relative min-w-[240px]">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer bg-[#141721] hover:border-[#C8E600]/60 border-white/10 text-white min-h-[38px]"
            >
                {selectedAccount ? (
                    <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-[#C8E600]/15 text-[#C8E600] border border-[#C8E600]/30 shrink-0">
                            {selectedAccount.code}
                        </span>
                        <span className="truncate text-white text-xs font-medium">
                            {selectedAccount.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-dim text-xs">Select Account...</span>
                )}
                <ChevronDown size={14} className={`text-dim transition-transform shrink-0 ${isOpen ? 'rotate-180 text-[#C8E600]' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div 
                    className="absolute top-full left-0 mt-1.5 w-[360px] max-w-[90vw] rounded-2xl border border-white/15 shadow-2xl bg-[#12141A] z-[9999] overflow-hidden animate-in fade-in duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input Bar */}
                    <div className="p-2.5 border-b border-white/10 bg-[#181B24] flex items-center gap-2">
                        <Search size={14} className="text-[#C8E600] shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search account name, code, category..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs text-white placeholder:text-dim w-full"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="text-dim hover:text-white text-xs p-1 cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Filtered Account Items */}
                    <div className="max-h-[240px] overflow-y-auto divide-y divide-white/[0.04] p-1.5 space-y-1 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[#C8E600]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {filtered.length === 0 ? (
                            <div className="py-6 text-center text-xs text-dim">
                                No matching accounts found
                            </div>
                        ) : (
                            filtered.map((acc) => {
                                const isSelected = acc._id === selectedId;
                                const catStyle = CATEGORY_COLORS[acc.category] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'rgba(255,255,255,0.1)' };

                                return (
                                    <div
                                        key={acc._id}
                                        onClick={() => {
                                            onSelect(acc._id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${
                                            isSelected 
                                                ? 'bg-[#C8E600]/15 border-[#C8E600]/50 text-white' 
                                                : 'hover:bg-white/5 border-transparent text-dim hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate min-w-0">
                                            <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-[#C8E600] border border-[#C8E600]/20 shrink-0">
                                                {acc.code}
                                            </span>
                                            <span className="text-xs font-semibold text-white truncate">
                                                {acc.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {acc.category && (
                                                <span 
                                                    className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border"
                                                    style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
                                                >
                                                    {acc.category}
                                                </span>
                                            )}
                                            {isSelected && (
                                                <Check size={14} className="text-[#C8E600]" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ManualJournalDetailModal: React.FC<ManualJournalDetailModalProps> = ({
    journalId,
    onClose,
    onJournalUpdated,
    onJournalDeleted
}) => {
    const [journal, setJournal] = useState<ManualJournal | null>(null);
    const [lines, setLines] = useState<LedgerEntry[]>([]);
    const [accounts, setAccounts] = useState<AccountingCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit Line State
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
    const [editForm, setEditForm] = useState<{
        accountingCode: string;
        description: string;
        type: 'DEBIT' | 'CREDIT';
        amount: number;
    }>({
        accountingCode: '',
        description: '',
        type: 'DEBIT',
        amount: 0
    });
    const [savingLine, setSavingLine] = useState(false);

    // Delete Line State
    const [deletingLineId, setDeletingLineId] = useState<string | null>(null);
    const [lineToDelete, setLineToDelete] = useState<LedgerEntry | null>(null);

    // Delete Journal State
    const [showDeleteJournalConfirm, setShowDeleteJournalConfirm] = useState(false);
    const [deletingJournal, setDeletingJournal] = useState(false);

    // Fetch Journal Details & Accounting Codes
    const loadJournalDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getManualJournalById(journalId);
            setJournal(data.journal);
            setLines(data.lines || []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to load journal details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadJournalDetails();

        // Fetch accounts for edit dropdown
        getAllAccountingCodes()
            .then(res => {
                const list = Array.isArray(res) ? res : (res.data || []);
                setAccounts(list);
            })
            .catch(err => console.error("Failed to load accounting codes:", err));
    }, [journalId]);

    // Calculate totals
    const totalDebit = lines
        .filter(l => l.type === 'DEBIT')
        .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    const totalCredit = lines
        .filter(l => l.type === 'CREDIT')
        .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    const difference = Math.abs(totalDebit - totalCredit);

    // Start editing a line
    const handleStartEdit = (line: LedgerEntry) => {
        setLineToDelete(null);
        setEditingLineId(line._id);
        setIsAccountDropdownOpen(false);
        setEditForm({
            accountingCode: line.accountingCode?._id || '',
            description: line.description || '',
            type: line.type || 'DEBIT',
            amount: Number(line.amount) || 0
        });
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingLineId(null);
        setIsAccountDropdownOpen(false);
    };

    // Save edited line
    const handleSaveLine = async (lineId: string) => {
        if (!editForm.accountingCode) {
            toast.error("Please select an accounting code");
            return;
        }
        if (editForm.amount <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        setSavingLine(true);
        const toastId = toast.loading("Updating ledger entry...");
        try {
            const updated = await updateLedgerEntry(lineId, {
                accountingCode: editForm.accountingCode,
                description: editForm.description,
                type: editForm.type,
                amount: editForm.amount
            });

            // Update local lines
            setLines(prev => prev.map(l => l._id === lineId ? { ...l, ...updated } : l));
            setEditingLineId(null);
            setIsAccountDropdownOpen(false);
            toast.success("Ledger entry updated successfully", { id: toastId });

            if (onJournalUpdated) onJournalUpdated();
            // Refresh to ensure totals and parent journal reflect updates
            loadJournalDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Failed to update ledger entry", { id: toastId });
        } finally {
            setSavingLine(false);
        }
    };

    // Delete single line
    const handleConfirmDeleteLine = async () => {
        if (!lineToDelete) return;

        setDeletingLineId(lineToDelete._id);
        const toastId = toast.loading("Deleting ledger entry line...");
        try {
            await deleteSingleLedgerEntry(lineToDelete._id);
            setLines(prev => prev.filter(l => l._id !== lineToDelete._id));
            setLineToDelete(null);
            toast.success("Ledger entry line deleted", { id: toastId });

            if (onJournalUpdated) onJournalUpdated();
            loadJournalDetails();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Failed to delete line", { id: toastId });
        } finally {
            setDeletingLineId(null);
        }
    };

    // Delete entire journal
    const handleDeleteEntireJournal = async () => {
        setDeletingJournal(true);
        const toastId = toast.loading("Deleting manual journal...");
        try {
            await deleteManualJournal(journalId);
            toast.success("Manual journal and its entries deleted successfully", { id: toastId });
            if (onJournalDeleted) onJournalDeleted();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Failed to delete journal", { id: toastId });
        } finally {
            setDeletingJournal(false);
            setShowDeleteJournalConfirm(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            {/* Modal Container */}
            <div 
                className="relative w-full max-w-5xl rounded-[28px] border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                style={{ background: 'var(--bg-card, #0f1117)', borderColor: 'var(--border-main, rgba(255,255,255,0.1))' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.08))' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-[#C8E600]/10 border border-[#C8E600]/20 text-[#C8E600]">
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--text-main, #fff)]">
                                    {journal?.journalNumber || 'Manual Journal'}
                                </h3>
                                {journal?.status && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 size={11} />
                                        {journal.status}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-dim mt-0.5">
                                Transaction detail, double-entry ledger lines & audit trail
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadJournalDetails}
                            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-dim hover:text-[var(--text-main)] cursor-pointer"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-dim hover:text-[var(--text-main)] cursor-pointer"
                            title="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-3">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs text-dim">Loading journal details...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    ) : journal && (
                        <>
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Date */}
                                <div className="p-3.5 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5 mb-1">
                                        <Calendar size={12} className="opacity-60" /> Journal Date
                                    </span>
                                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-main, #fff)]">
                                        {new Date(journal.date).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>

                                {/* Branch */}
                                <div className="p-3.5 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5 mb-1">
                                        <Building2 size={12} className="opacity-60" /> Branch
                                    </span>
                                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-main, #fff)]">
                                        {(journal.branch as any)?.name || 'Default Branch'}
                                    </p>
                                </div>

                                {/* Created By */}
                                <div className="p-3.5 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5 mb-1">
                                        <User size={12} className="opacity-60" /> Created By
                                    </span>
                                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-main, #fff)] truncate">
                                        {(journal.createdBy as any)?.name || (journal.createdBy as any)?.email || 'Staff'} 
                                        <span className="text-[10px] text-dim ml-1 font-mono uppercase">({journal.creatorRole})</span>
                                    </p>
                                </div>

                                {/* Balancing Status */}
                                <div className="p-3.5 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5 mb-1">
                                        <Scale size={12} className="opacity-60" /> Balancing Status
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {isBalanced ? (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                                                <CheckCircle2 size={13} /> Balanced
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                                                <AlertTriangle size={13} /> Diff: ${difference.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Narration Memo Card */}
                            <div className="p-4 rounded-2xl border bg-white/[0.015]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                <span className="text-[10px] font-black uppercase tracking-wider text-dim block mb-1">
                                    Description / Narration
                                </span>
                                <p className="text-xs sm:text-sm text-[var(--text-main, #fff)] font-medium">
                                    {journal.description || 'No description provided.'}
                                </p>
                            </div>

                            {/* Financial Summary Strip */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border bg-white/[0.02]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim block mb-0.5">Total Debits</span>
                                    <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                                        ${totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim block mb-0.5">Total Credits</span>
                                    <span className="text-base sm:text-lg font-mono font-bold text-rose-400">
                                        ${totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim block mb-0.5">Journal Total Amount</span>
                                    <span className="text-base sm:text-lg font-mono font-bold text-[#C8E600]">
                                        ${Number(journal.totalAmount || totalDebit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            {/* Delete Line Confirmation Banner */}
                            {lineToDelete && (
                                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2.5">
                                        <AlertCircle size={18} className="text-rose-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-rose-300">
                                                Delete this ledger entry line ({lineToDelete.accountingCode?.code} - {lineToDelete.accountingCode?.name})?
                                            </p>
                                            <p className="text-[11px] text-rose-400/80">
                                                Amount: ${Number(lineToDelete.amount).toFixed(2)} ({lineToDelete.type}). Journal total and account balances will be updated.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                            onClick={() => setLineToDelete(null)}
                                            className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled={deletingLineId === lineToDelete._id}
                                            onClick={handleConfirmDeleteLine}
                                            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
                                        >
                                            {deletingLineId === lineToDelete._id ? 'Deleting...' : 'Confirm Delete'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Ledger Entries Table */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-main, #fff)] flex items-center gap-2">
                                        <BookOpen size={14} className="text-[#C8E600]" />
                                        Ledger Entries ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
                                    </h4>
                                    <span className="text-[11px] text-dim font-medium">
                                        Click edit or delete on any line below
                                    </span>
                                </div>

                                <div className={`border rounded-2xl bg-white/[0.01] ${editingLineId ? 'overflow-visible pb-28' : 'overflow-hidden'}`} style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.08))' }}>
                                    <div className={`${editingLineId ? 'overflow-visible min-h-[300px]' : 'overflow-x-auto'}`}>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.08))' }}>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim">Account Code & Name</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim">Line Memo / Description</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim text-center">Type</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim text-right">Debit ($)</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim text-right">Credit ($)</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-dim text-center w-24">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}>
                                                {lines.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-dim">
                                                            No ledger entries found for this journal.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    lines.map((line) => {
                                                        const isEditing = editingLineId === line._id;
                                                        const catStyle = line.accountingCode?.category 
                                                            ? CATEGORY_COLORS[line.accountingCode.category] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: 'rgba(255,255,255,0.1)' }
                                                            : null;

                                                        if (isEditing) {
                                                            return (
                                                                <tr key={line._id} className="bg-[#C8E600]/[0.03] border-l-2 border-l-[#C8E600] relative z-30">
                                                                    {/* Searchable Account Selector */}
                                                                    <td className="px-4 py-3 relative z-40">
                                                                        <SearchableAccountSelector
                                                                            accounts={accounts}
                                                                            selectedId={editForm.accountingCode}
                                                                            onSelect={(id) => setEditForm(prev => ({ ...prev, accountingCode: id }))}
                                                                            isOpen={isAccountDropdownOpen}
                                                                            setIsOpen={setIsAccountDropdownOpen}
                                                                        />
                                                                    </td>

                                                                    {/* Edit Description */}
                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="text"
                                                                            value={editForm.description}
                                                                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                                            placeholder="Line memo..."
                                                                            className="w-full text-xs px-3 py-2 rounded-xl border bg-[#141721] text-white outline-none border-white/10 focus:border-[#C8E600]/60 transition-colors min-h-[38px]"
                                                                        />
                                                                    </td>

                                                                    {/* Edit Type Segmented Buttons */}
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="inline-flex rounded-xl p-1 bg-[#141721] border border-white/10">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditForm(prev => ({ ...prev, type: 'DEBIT' }))}
                                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                                                    editForm.type === 'DEBIT'
                                                                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                                                                                        : 'text-dim hover:text-white border border-transparent'
                                                                                }`}
                                                                            >
                                                                                Debit
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setEditForm(prev => ({ ...prev, type: 'CREDIT' }))}
                                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                                                    editForm.type === 'CREDIT'
                                                                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                                                                                        : 'text-dim hover:text-white border border-transparent'
                                                                                }`}
                                                                            >
                                                                                Credit
                                                                            </button>
                                                                        </div>
                                                                    </td>

                                                                    {/* Edit Amount (Debit side) */}
                                                                    <td className="px-4 py-3 text-right">
                                                                        {editForm.type === 'DEBIT' ? (
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={editForm.amount || ''}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                                                className="w-28 text-right font-mono text-xs font-bold px-3 py-2 rounded-xl border bg-[#141721] text-emerald-400 outline-none border-white/10 focus:border-[#C8E600]/60 transition-colors min-h-[38px]"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-dim text-xs">—</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Edit Amount (Credit side) */}
                                                                    <td className="px-4 py-3 text-right">
                                                                        {editForm.type === 'CREDIT' ? (
                                                                            <input
                                                                                type="number"
                                                                                step="0.01"
                                                                                min="0"
                                                                                value={editForm.amount || ''}
                                                                                onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                                                                className="w-28 text-right font-mono text-xs font-bold px-3 py-2 rounded-xl border bg-[#141721] text-rose-400 outline-none border-white/10 focus:border-[#C8E600]/60 transition-colors min-h-[38px]"
                                                                            />
                                                                        ) : (
                                                                            <span className="text-dim text-xs">—</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Save / Cancel Buttons */}
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="flex items-center justify-center gap-1.5">
                                                                            <button
                                                                                disabled={savingLine}
                                                                                onClick={() => handleSaveLine(line._id)}
                                                                                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                                                                                title="Save changes"
                                                                            >
                                                                                <Check size={14} strokeWidth={3} />
                                                                            </button>
                                                                            <button
                                                                                onClick={handleCancelEdit}
                                                                                className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-dim hover:text-white transition-all cursor-pointer active:scale-95"
                                                                                title="Cancel"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return (
                                                            <tr key={line._id} className="hover:bg-white/[0.02] transition-colors group">
                                                                <td className="px-4 py-3 text-xs font-semibold text-[var(--text-main, #fff)]">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono font-bold text-[#C8E600]">
                                                                            {line.accountingCode?.code || '—'}
                                                                        </span>
                                                                        <span className="truncate max-w-[200px]">
                                                                            {line.accountingCode?.name || 'Unknown Account'}
                                                                        </span>
                                                                        {catStyle && (
                                                                            <span 
                                                                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border"
                                                                                style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}
                                                                            >
                                                                                {line.accountingCode?.category}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-dim max-w-xs truncate">
                                                                    {line.description || '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${line.type === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                                        {line.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-right font-mono font-bold text-emerald-400">
                                                                    {line.type === 'DEBIT' ? `$${Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-xs text-right font-mono font-bold text-rose-400">
                                                                    {line.type === 'CREDIT' ? `$${Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <div className="flex items-center justify-center gap-1.5">
                                                                        <button
                                                                            onClick={() => handleStartEdit(line)}
                                                                            className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:border-[#C8E600]/50 hover:bg-[#C8E600]/10 text-dim hover:text-[#C8E600] transition-all cursor-pointer active:scale-95"
                                                                            title="Edit Line"
                                                                        >
                                                                            <Pencil size={13} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setLineToDelete(line)}
                                                                            className="p-1.5 rounded-lg border border-white/5 bg-white/5 hover:border-rose-500/40 hover:bg-rose-500/10 text-dim hover:text-rose-400 transition-all cursor-pointer active:scale-95"
                                                                            title="Delete Line"
                                                                        >
                                                                            <Trash2 size={13} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t bg-white/[0.01]" style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.08))' }}>
                    <div>
                        {showDeleteJournalConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-rose-400">Delete entire journal & all lines?</span>
                                <button
                                    disabled={deletingJournal}
                                    onClick={handleDeleteEntireJournal}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20 active:scale-95"
                                >
                                    {deletingJournal ? 'Deleting...' : 'Yes, Delete Journal'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteJournalConfirm(false)}
                                    className="px-2.5 py-1.5 rounded-xl border border-white/10 text-xs font-medium hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowDeleteJournalConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer active:scale-95"
                            >
                                <Trash2 size={14} /> Delete Entire Journal
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-colors text-[var(--text-main, #fff)] cursor-pointer active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualJournalDetailModal;
