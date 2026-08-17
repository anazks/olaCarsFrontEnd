import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Clock, 
    User, 
    Tag, 
    Building2, 
    Info, 
    Coins,
    CheckCircle,
    Hash,
    MapPin,
    AlertTriangle,
    Layers,
    DollarSign,
    Truck,
    X,
    FileText,
    Paperclip,
    Shield,
    BookOpen,
    Zap,
    Receipt,
    Repeat,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getBankTransactionById, updateLinkedAccountingCode } from '../../../services/bankAccountService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { TransactionEditModal } from './modals/TransactionEditModal';
import type { TxClassification, EditMode } from './modals/TransactionEditModal';

const CUTOFF_DATE_STR = '2026-06-15';

export const isTransactionDisabledForEdit = (dateVal: string | Date | undefined): boolean => {
    if (!dateVal) return false;
    const dateObj = new Date(dateVal);
    if (isNaN(dateObj.getTime())) return false;

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const yyyymmdd = `${year}-${month}-${day}`;

    const utcYear = dateObj.getUTCFullYear();
    const utcMonth = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(dateObj.getUTCDate()).padStart(2, '0');
    const utcYyyymmdd = `${utcYear}-${utcMonth}-${utcDay}`;

    return yyyymmdd <= CUTOFF_DATE_STR || utcYyyymmdd <= CUTOFF_DATE_STR;
};

const TYPE_STYLES = {
    'DEBIT': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)', label: 'DEBIT (Deposit)' }, // Green
    'CREDIT': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)', label: 'CREDIT (Withdrawal)' }, // Red
};

/* ─────────────────────────────────────────────────────────
   Ledger Entry Detail Modal – comprehensive view of a 
   single connected ledger entry
   ───────────────────────────────────────────────────────── */
const LedgerEntryDetailModal = ({ 
    isOpen, 
    onClose, 
    entry,
    onChangeAccount,
    isCutoffDisabled
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    entry: any;
    onChangeAccount?: (entry: any) => void;
    isCutoffDisabled?: boolean;
}) => {
    if (!isOpen || !entry) return null;

    const entryDate = new Date(entry.entryDate || entry.createdAt);
    const formattedEntryDate = !isNaN(entryDate.getTime())
        ? `${entryDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} ${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'N/A';

    const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
    const updatedAt = entry.updatedAt ? new Date(entry.updatedAt) : null;
    const fmtTs = (d: Date | null) => d && !isNaN(d.getTime()) ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—';

    const isDebit = entry.type === 'DEBIT';

    const txClassLabel: Record<string, string> = {
        DRIVER: '🏎️ Driver',
        VENDOR: '🚚 Vendor',
        INTER_BANK: '🏦 Inter-Bank',
        NON_DRIVER_CUSTOMER: '👤 Customer',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-0 shadow-2xl animate-scale-up"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ─────────────────────────────── */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b rounded-t-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDebit ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                            <BookOpen size={20} className={isDebit ? 'text-emerald-400' : 'text-amber-400'} />
                        </div>
                        <div>
                            <h3 className="text-base font-black tracking-tight">Ledger Entry Details</h3>
                            <p className="text-[10px] font-mono opacity-60 mt-0.5">ID: {entry._id}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* ── Amount + Type Hero ──────────────── */}
                    <div className="flex items-center justify-between p-5 rounded-xl border" style={{ background: isDebit ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', borderColor: isDebit ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}>
                        <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isDebit ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                                {entry.type}
                            </span>
                            <p className="text-xs mt-2 opacity-70">Ledger Entry Amount</p>
                        </div>
                        <div className={`text-3xl font-mono font-black ${isDebit ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isDebit ? '+' : '-'}${entry.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                        </div>
                    </div>

                    {/* ── Core Fields Grid ────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Accounting Code */}
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Tag size={11} /> Accounting Code
                                </p>
                                {onChangeAccount && (
                                    <button
                                        type="button"
                                        disabled={isCutoffDisabled}
                                        onClick={() => {
                                            onClose();
                                            onChangeAccount(entry);
                                        }}
                                        title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Account"}
                                        className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border rounded-lg transition-colors flex items-center gap-1 ${
                                            isCutoffDisabled 
                                                ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                                : 'bg-[#C8E600]/10 hover:bg-[#C8E600]/20 border-[#C8E600]/30 text-[#C8E600] cursor-pointer'
                                        }`}
                                    >
                                        <Repeat size={10} /> Change Account
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-sm px-2 py-0.5 rounded bg-white/5 border border-white/10">
                                    {entry.accountingCode?.code || 'N/A'}
                                </span>
                                <span className="text-xs font-semibold opacity-90">{entry.accountingCode?.name || '—'}</span>
                            </div>
                            {entry.accountingCode?.category && (
                                <p className="text-[10px] opacity-50">Category: {entry.accountingCode.category}</p>
                            )}
                            {entry.accountingCode?.accountType && (
                                <p className="text-[10px] opacity-50">Account Type: {entry.accountingCode.accountType}</p>
                            )}
                        </div>

                        {/* Entry Date */}
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Clock size={11} /> Entry Date
                            </p>
                            <p className="text-sm font-semibold">{formattedEntryDate}</p>
                        </div>

                        {/* Transaction ID */}
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Hash size={11} /> Transaction Ref ID
                            </p>
                            <p className="text-sm font-mono font-bold">{entry.transactionId || '—'}</p>
                        </div>

                        {/* Running Balance */}
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Layers size={11} /> Running Balance
                            </p>
                            <p className="text-sm font-mono font-bold text-blue-400">
                                {entry.runningBalance !== undefined && entry.runningBalance !== null
                                    ? `$${entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : '—'}
                            </p>
                        </div>

                        {/* Bank Tx Classification */}
                        {entry.bankTxType && (
                            <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Info size={11} /> Bank Tx Classification
                                </p>
                                <p className="text-sm font-bold">{txClassLabel[entry.bankTxType] || entry.bankTxType}</p>
                            </div>
                        )}

                        {/* Transaction Type */}
                        {entry.transactionType && (
                            <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                    <Info size={11} /> Transaction Type
                                </p>
                                <p className="text-sm font-bold">{entry.transactionType}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Description ─────────────────────── */}
                    <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={11} /> Description
                        </p>
                        <p className="text-sm leading-relaxed">{entry.description || '—'}</p>
                    </div>

                    {/* ── Contact / Supplier ──────────────── */}
                    {(entry.contact || entry.supplier) && (
                        <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-main)', background: 'rgba(34,197,94,0.04)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-emerald-400">
                                <User size={11} /> Linked Party
                            </p>
                            {entry.contact && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                        <User size={14} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-400">
                                            {entry.contact.name || entry.contact.customerId || 'Customer'}
                                        </p>
                                        {entry.contact.phone && <p className="text-[10px] opacity-60">{entry.contact.phone}</p>}
                                        {entry.contact.email && <p className="text-[10px] opacity-60">{entry.contact.email}</p>}
                                        {entry.contact.customerId && <p className="text-[10px] font-mono opacity-50">ID: {entry.contact.customerId}</p>}
                                    </div>
                                </div>
                            )}
                            {entry.supplier && (
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                                        <Truck size={14} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-400">
                                            {entry.supplier.name || entry.supplier.companyName || 'Supplier'}
                                        </p>
                                        {entry.supplier.phone && <p className="text-[10px] opacity-60">{entry.supplier.phone}</p>}
                                        {entry.supplier.email && <p className="text-[10px] opacity-60">{entry.supplier.email}</p>}
                                        {(entry.supplier.vendorNumber || entry.supplier.supplierCode) && (
                                            <p className="text-[10px] font-mono opacity-50">Code: {entry.supplier.vendorNumber || entry.supplier.supplierCode}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tax Info ────────────────────────── */}
                    {entry.taxInfo && (entry.taxInfo.taxAmount > 0 || entry.taxInfo.taxApplied) && (
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-2" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Receipt size={11} /> Tax Information
                            </p>
                            <div className="flex items-center gap-4 text-xs">
                                <div>
                                    <span className="opacity-60">Tax Amount:</span>{' '}
                                    <span className="font-mono font-bold">${entry.taxInfo.taxAmount?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div>
                                    <span className="opacity-60">Inclusive:</span>{' '}
                                    <span className="font-bold">{entry.taxInfo.isTaxInclusive ? 'Yes' : 'No'}</span>
                                </div>
                                {entry.taxInfo.taxApplied && typeof entry.taxInfo.taxApplied === 'object' && (
                                    <div>
                                        <span className="opacity-60">Tax:</span>{' '}
                                        <span className="font-bold">{entry.taxInfo.taxApplied.name || entry.taxInfo.taxApplied._id}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Set-off Summary ─────────────────── */}
                    {entry.setOffSummary && (entry.setOffSummary.totalSetOff > 0 || entry.setOffSummary.invoiceCount > 0) && (
                        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.04)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-[#C8E600]">
                                <Zap size={11} /> Set-off Summary
                            </p>
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-60">Total Set-off:</span>
                                    <span className="font-mono font-bold text-[#C8E600]">${entry.setOffSummary.totalSetOff?.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-60">Invoices:</span>
                                    <span className="font-bold">{entry.setOffSummary.invoiceCount}</span>
                                </div>
                                {entry.setOffSummary.excessAmount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="opacity-60">Excess:</span>
                                        <span className="font-mono font-bold text-amber-400">${entry.setOffSummary.excessAmount?.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Linked Invoices ─────────────────── */}
                    {entry.invoices && entry.invoices.length > 0 && (
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-3" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <FileText size={11} /> Linked Invoices ({entry.invoices.length})
                            </p>
                            <div className="space-y-1.5">
                                {entry.invoices.map((inv: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg text-xs">
                                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                            <FileText size={12} /> {inv.invoiceNumber || inv.invoiceId || `Invoice #${idx + 1}`}
                                        </span>
                                        <span className="font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                            ${inv.amountApplied?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Attachments ─────────────────────── */}
                    {entry.attachments && entry.attachments.length > 0 && (
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-3" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Paperclip size={11} /> Attachments ({entry.attachments.length})
                            </p>
                            <div className="space-y-1.5">
                                {entry.attachments.map((att: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs hover:bg-blue-500/20 transition-colors"
                                    >
                                        <span className="font-semibold text-blue-400 flex items-center gap-1.5 truncate">
                                            <Paperclip size={12} /> {att.name}
                                        </span>
                                        {att.uploadedAt && (
                                            <span className="text-[10px] opacity-50 ml-3 shrink-0">
                                                {new Date(att.uploadedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Branch Info ─────────────────────── */}
                    {entry.branch && (
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <MapPin size={11} /> Branch
                            </p>
                            <p className="text-sm font-semibold">
                                {typeof entry.branch === 'object'
                                    ? `${entry.branch.name || ''} ${entry.branch.code ? `(${entry.branch.code})` : ''}`
                                    : entry.branch}
                            </p>
                        </div>
                    )}

                    {/* ── Audit Trail ─────────────────────── */}
                    <div className="p-4 rounded-xl border bg-white/[0.02] space-y-3" style={{ borderColor: 'var(--border-main)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                            <Shield size={11} /> Audit Trail
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="opacity-60 block text-[10px] mb-0.5">Created By</span>
                                <span className="font-bold">
                                    {entry.createdBy && typeof entry.createdBy === 'object'
                                        ? entry.createdBy.name || entry.createdBy.email || entry.createdBy._id
                                        : entry.createdBy || 'SYSTEM'}
                                </span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-[10px] mb-0.5">Role / Authority</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)' }}>
                                    {entry.creatorRole || 'SYSTEM'}
                                </span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-[10px] mb-0.5">Created At</span>
                                <span className="font-mono text-[11px]">{fmtTs(createdAt)}</span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-[10px] mb-0.5">Last Updated</span>
                                <span className="font-mono text-[11px]">{fmtTs(updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Linked References ───────────────── */}
                    {(entry.transaction || entry.manualJournal || entry.voucher) && (
                        <div className="p-4 rounded-xl border bg-white/[0.02] space-y-2" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                <Layers size={11} /> Linked References
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                {entry.transaction && (
                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                        <span className="opacity-60">Payment Tx: </span>
                                        <span className="font-mono font-bold text-[11px]">
                                            {typeof entry.transaction === 'object' ? entry.transaction._id : entry.transaction}
                                        </span>
                                    </div>
                                )}
                                {entry.manualJournal && (
                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                        <span className="opacity-60">Manual Journal: </span>
                                        <span className="font-mono font-bold text-[11px]">
                                            {typeof entry.manualJournal === 'object' ? entry.manualJournal._id : entry.manualJournal}
                                        </span>
                                    </div>
                                )}
                                {entry.voucher && (
                                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                        <span className="opacity-60">Voucher: </span>
                                        <span className="font-mono font-bold text-[11px]">
                                            {typeof entry.voucher === 'object' ? entry.voucher._id : entry.voucher}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────── */}
                <div className="sticky bottom-0 z-10 flex justify-end px-6 py-4 border-t rounded-b-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#C8E600] text-black transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────
   Modal: Change Linked Accounting Code (Single-Leg Swap)
   ───────────────────────────────────────────────────────── */
interface ChangeLinkedAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    targetLeg: any;
    transaction: any;
}

const ChangeLinkedAccountModal = ({ isOpen, onClose, onSuccess, targetLeg, transaction }: ChangeLinkedAccountModalProps) => {
    const [allAccounts, setAllAccounts] = useState<any[]>([]);
    const [selectedCodeId, setSelectedCodeId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && targetLeg) {
            setSelectedCodeId(targetLeg.accountingCode?._id || targetLeg.accountingCode || '');
            setSearchQuery('');
            const fetchAccounts = async () => {
                setLoading(true);
                try {
                    const res = await getAllAccountingCodes() as any;
                    const list = Array.isArray(res) ? res : (res.data || []);
                    setAllAccounts(list);
                } catch (err) {
                    toast.error('Failed to load chart of accounts');
                } finally {
                    setLoading(false);
                }
            };
            fetchAccounts();
        }
    }, [isOpen, targetLeg]);

    // Partner Leg Account IDs to exclude (so both legs cannot be assigned the exact same account)
    const partnerAccountIds = useMemo(() => {
        if (!transaction || !targetLeg) return new Set<string>();

        const targetLegId = String(targetLeg._id || '');
        const ids = new Set<string>();

        // 1. Primary transaction accounting code (if targetLeg is a connected entry)
        const primaryId = String(transaction._id || '');
        if (primaryId !== targetLegId && transaction.accountingCode) {
            const pCodeId = String(transaction.accountingCode._id || transaction.accountingCode);
            if (pCodeId) ids.add(pCodeId);
        }

        // 2. Connected ledger entries (if targetLeg is primary or another connected entry)
        const connected = transaction.connectedLedgerEntries || [];
        connected.forEach((cEntry: any) => {
            const cLegId = String(cEntry._id || '');
            if (cLegId !== targetLegId && cEntry.accountingCode) {
                const cCodeId = String(cEntry.accountingCode._id || cEntry.accountingCode);
                if (cCodeId) ids.add(cCodeId);
            }
        });

        return ids;
    }, [transaction, targetLeg]);

    const selectableAccounts = useMemo(() => {
        return allAccounts.filter(acc => !partnerAccountIds.has(String(acc._id || '')));
    }, [allAccounts, partnerAccountIds]);

    const filteredAccounts = useMemo(() => {
        if (!searchQuery.trim()) return selectableAccounts;
        const q = searchQuery.toLowerCase().trim();
        return selectableAccounts.filter(acc => {
            const codeStr = String(acc.code || '').toLowerCase();
            const nameStr = String(acc.name || '').toLowerCase();
            const catStr = String(acc.category || acc.accountType || '').toLowerCase();
            return codeStr.includes(q) || nameStr.includes(q) || catStr.includes(q);
        });
    }, [selectableAccounts, searchQuery]);

    if (!isOpen || !targetLeg) return null;

    const currentCode = targetLeg.accountingCode?.code || 'N/A';
    const currentName = targetLeg.accountingCode?.name || 'Unassigned';

    const handleSubmit = async () => {
        if (!selectedCodeId) {
            toast.error('Please select a target accounting code');
            return;
        }
        if (selectedCodeId === (targetLeg.accountingCode?._id || targetLeg.accountingCode)) {
            toast.error('Selected account must be different from current account');
            return;
        }
        if (partnerAccountIds.has(selectedCodeId)) {
            toast.error('Cannot select the accounting code of a connected partner leg');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Updating linked account...');
        try {
            await updateLinkedAccountingCode(targetLeg._id, { newAccountingCodeId: selectedCodeId });
            toast.success('Linked accounting code updated successfully!', { id: toastId });
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to update linked account', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl space-y-5 animate-scale-up" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                    <h3 className="text-base font-black flex items-center gap-2">
                        <Repeat size={18} className="text-[#C8E600]" /> Change Linked Account Code
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10"><X size={18} /></button>
                </div>

                <div className="p-3 rounded-xl border bg-white/5 space-y-1 text-xs" style={{ borderColor: 'var(--border-main)' }}>
                    <p className="opacity-60 font-semibold uppercase text-[10px]">Target Leg Line</p>
                    <p className="font-bold font-mono text-sm">{targetLeg.type}: ${targetLeg.amount?.toFixed(2)} ({targetLeg.description || 'No description'})</p>
                    <p className="text-xs">Current Code: <span className="font-mono font-bold text-[#C8E600]">{currentCode} - {currentName}</span></p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider block opacity-70">Select New Accounting Code</label>
                    
                    {/* Search Input Filter Box */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 opacity-40" style={{ color: 'var(--text-main)' }} />
                        <input
                            type="text"
                            placeholder="Search code, name, or category..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border rounded-xl pl-9 pr-8 py-2 text-xs outline-none focus:border-[#C8E600] transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            disabled={submitting || loading}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2.5 opacity-40 hover:opacity-100"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="p-3 text-center text-xs opacity-60">Loading Chart of Accounts...</div>
                    ) : (
                        <select
                            value={selectedCodeId}
                            onChange={e => setSelectedCodeId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-medium"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            disabled={submitting}
                        >
                            <option value="">
                                {filteredAccounts.length === 0 ? 'No matching accounting codes found' : 'Select Accounting Code...'}
                            </option>
                            {filteredAccounts.map(acc => (
                                <option key={acc._id} value={acc._id} className="bg-[var(--bg-card)]">
                                    {acc.code} - {acc.name} ({acc.category || acc.accountType || 'GL'})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                    <p className="font-bold flex items-center gap-1"><Info size={12} /> Single-Leg Isolation Notice</p>
                    <p className="opacity-90">Only this specific leg's accounting code will be updated. Connected partner legs remain completely untouched.</p>
                </div>

                <div className="flex justify-end items-center gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10">Cancel</button>
                    <button onClick={handleSubmit} disabled={submitting || loading || !selectedCodeId} className="px-5 py-2 rounded-xl text-xs font-black uppercase bg-[#C8E600] text-black hover:opacity-90 disabled:opacity-50">
                        {submitting ? 'Updating...' : 'Confirm Account Swap'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const detectTxClassification = (tx: any): TxClassification => {
    if (!tx) return 'NON_DRIVER_CUSTOMER';

    if (tx.detectedType && ['DRIVER', 'VENDOR', 'INTER_BANK', 'NON_DRIVER_CUSTOMER'].includes(tx.detectedType)) {
        return tx.detectedType as TxClassification;
    }

    const connected = tx.connectedLedgerEntries || [];
    const currentCodeId = String(tx.accountingCode?._id || tx.accountingCode || '');

    const isInterBank = connected.some((lEntry: any) => {
        const accType = lEntry.accountingCode?.accountType;
        const codeId = String(lEntry.accountingCode?._id || lEntry.accountingCode || '');
        return (accType === 'Bank' || accType === 'Cash') && codeId !== currentCodeId;
    }) || (tx.description && /inter-bank|transfer.*bank|transferencia.*banco/i.test(tx.description));

    if (isInterBank) return 'INTER_BANK';

    if (tx.supplier || tx.contactModel === 'Supplier' || tx.setOffHistory?.targetType === 'SUPPLIER') {
        return 'VENDOR';
    }

    const contact = tx.contact;
    const isDriver = !!(
        (contact && (contact.driver || contact.driverId || contact.isDriver)) ||
        (tx.setOffHistory && tx.setOffHistory.targetType === 'CUSTOMER') ||
        (tx.description && /driver|conductor|chofer/i.test(tx.description))
    );

    if (isDriver) return 'DRIVER';

    if (contact || tx.contactModel === 'Customer') {
        return 'NON_DRIVER_CUSTOMER';
    }

    return tx.type === 'CREDIT' ? 'VENDOR' : 'DRIVER';
};

const BankTransactionDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [transaction, setTransaction] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeEditMode, setActiveEditMode] = useState<EditMode>('AMOUNT');

    // Ledger Entry Detail Modal state
    const [isLedgerDetailOpen, setIsLedgerDetailOpen] = useState(false);
    const [selectedLedgerEntry, setSelectedLedgerEntry] = useState<any>(null);

    // Change Linked Account Modal state
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [targetLegForSwap, setTargetLegForSwap] = useState<any>(null);

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

    useEffect(() => {
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
                <AlertTriangle size={48} className="text-red-500" />
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

    const classification = detectTxClassification(transaction);
    const isCutoffDisabled = isTransactionDisabledForEdit(transaction.entryDate || transaction.date || transaction.createdAt);
    const typeStyle = TYPE_STYLES[transaction.type as 'DEBIT' | 'CREDIT'] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent', label: transaction.type };
    
    const dateObj = new Date(transaction.entryDate || transaction.createdAt);
    const formattedDate = !isNaN(dateObj.getTime()) 
        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
        : transaction.entryDate;

    const handleOpenEdit = (mode: EditMode) => {
        if (isCutoffDisabled) return;
        setActiveEditMode(mode);
        setIsEditModalOpen(true);
    };

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
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            <Coins size={28} style={{ color: 'var(--brand-lime)' }} />
                            Bank Transaction details
                        </h1>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: typeStyle.bg, color: typeStyle.text, borderColor: typeStyle.border }}>
                            {typeStyle.label}
                        </span>

                        {/* Classification Badge */}
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-white/5 border-white/10" style={{ color: 'var(--text-main)' }}>
                            {classification === 'DRIVER' && '🏎️ Driver Transaction'}
                            {classification === 'VENDOR' && '🚚 Vendor Transaction'}
                            {classification === 'INTER_BANK' && '🏦 Inter-Bank Transfer'}
                            {classification === 'NON_DRIVER_CUSTOMER' && '👤 Customer Transaction'}
                        </span>
                    </div>
                </div>

                {/* Right Side: Amount & Context-Aware Edit Action Buttons */}
                <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                    <div className="text-right">
                        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-dim)' }}>Transaction Value</div>
                        <div className={`text-3xl font-mono font-bold ${transaction.type === 'DEBIT' ? 'text-green-400' : 'text-red-400'}`}>
                            {transaction.type === 'DEBIT' ? '+' : '-'}${transaction.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Context Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* 1. Driver Transaction Buttons */}
                        {classification === 'DRIVER' && (
                            <>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('AMOUNT')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Edit Amount"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-[#C8E600]/10 hover:bg-[#C8E600]/20 text-[#C8E600] border-[#C8E600]/30 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <DollarSign size={14} /> Edit Amount
                                </button>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('PARTY')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Driver"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <User size={14} /> Change Driver
                                </button>
                            </>
                        )}

                        {/* 2. Vendor Transaction Buttons */}
                        {classification === 'VENDOR' && (
                            <>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('AMOUNT')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Edit Amount"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <DollarSign size={14} /> Edit Amount
                                </button>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('PARTY')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Vendor"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <Truck size={14} /> Change Vendor
                                </button>
                            </>
                        )}

                        {/* 3. Inter-Bank Transaction Button */}
                        {classification === 'INTER_BANK' && (
                            <button
                                disabled={isCutoffDisabled}
                                onClick={() => !isCutoffDisabled && handleOpenEdit('AMOUNT')}
                                title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Edit Amount"}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                    isCutoffDisabled 
                                        ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 hover:scale-105 cursor-pointer'
                                }`}
                            >
                                <DollarSign size={14} /> Edit Amount
                            </button>
                        )}

                        {/* 4. Non-Driver Customer Transaction Buttons */}
                        {classification === 'NON_DRIVER_CUSTOMER' && (
                            <>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('AMOUNT')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Edit Amount"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <DollarSign size={14} /> Edit Amount
                                </button>
                                <button
                                    disabled={isCutoffDisabled}
                                    onClick={() => !isCutoffDisabled && handleOpenEdit('PARTY')}
                                    title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Customer"}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                                        isCutoffDisabled 
                                            ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                            : 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:scale-105 cursor-pointer'
                                    }`}
                                >
                                    <User size={14} /> Change Customer
                                </button>
                            </>
                        )}
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
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                            <Tag size={12}/> Linked Accounting Code
                                        </p>
                                        <button
                                            type="button"
                                            disabled={isCutoffDisabled}
                                            onClick={() => {
                                                if (isCutoffDisabled) return;
                                                setTargetLegForSwap(transaction);
                                                setIsAccountModalOpen(true);
                                            }}
                                            title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Account"}
                                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-colors flex items-center gap-1 ${
                                                isCutoffDisabled 
                                                    ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                                    : 'bg-[#C8E600]/10 hover:bg-[#C8E600]/20 border-[#C8E600]/30 text-[#C8E600] cursor-pointer'
                                            }`}
                                        >
                                            <Repeat size={11} /> Change Account
                                        </button>
                                    </div>
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
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={isCutoffDisabled}
                                                            onClick={() => {
                                                                if (isCutoffDisabled) return;
                                                                setTargetLegForSwap(lEntry);
                                                                setIsAccountModalOpen(true);
                                                            }}
                                                            title={isCutoffDisabled ? "Transactions till 15/06/2026 cannot be edited" : "Change Account"}
                                                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-colors flex items-center gap-1 ${
                                                                isCutoffDisabled 
                                                                    ? 'bg-white/5 text-white/40 border-white/10 opacity-40 cursor-not-allowed' 
                                                                    : 'bg-[#C8E600]/10 hover:bg-[#C8E600]/20 border-[#C8E600]/30 text-[#C8E600] cursor-pointer'
                                                            }`}
                                                        >
                                                            <Repeat size={11} /> Change Account
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedLedgerEntry(lEntry);
                                                                setIsLedgerDetailOpen(true);
                                                            }}
                                                            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border rounded-lg transition-colors cursor-pointer"
                                                            style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                                        >
                                                            View Detail
                                                        </button>
                                                    </div>
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

                    {/* Invoice & Bill Set-off History Card (If present) */}
                    {transaction.setOffHistory && (
                        <div className="p-6 rounded-2xl border space-y-4 bg-emerald-500/5" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <div className="flex justify-between items-center border-b border-emerald-500/20 pb-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                                        ⚡ Automated {transaction.setOffHistory.targetType === 'SUPPLIER' ? 'Bill Set-off' : 'Invoice Set-off'} History
                                    </h3>
                                    <p className="text-xs opacity-75 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        Before and After state snapshots preserved for this bank transaction.
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                                    {transaction.setOffHistory.targetType === 'SUPPLIER'
                                        ? `Vendor: ${transaction.setOffHistory.supplier?.name || transaction.setOffHistory.supplier?.companyName || 'Linked Vendor'}`
                                        : `Customer: ${transaction.setOffHistory.customer?.name || 'Linked Customer'}`
                                    }
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Customer Invoice Snapshots */}
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

                                {/* Supplier Bill Snapshots */}
                                {transaction.setOffHistory.billSnapshots?.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b text-[10px] font-bold uppercase tracking-wider text-emerald-400 border-emerald-500/20">
                                                    <th className="px-3 py-2">Bill #</th>
                                                    <th className="px-3 py-2">Applied Amount</th>
                                                    <th className="px-3 py-2">Before State</th>
                                                    <th className="px-3 py-2">After State</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transaction.setOffHistory.billSnapshots.map((snap: any, sIdx: number) => (
                                                    <tr key={sIdx} className="border-b last:border-0 border-emerald-500/10 text-xs">
                                                        <td className="px-3 py-2.5 font-bold text-emerald-400">
                                                            {snap.billNumber}
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
                                                ⚡ {transaction.setOffHistory.targetType === 'SUPPLIER' ? 'Vendor Advance / Prepayment' : 'Advance Received (Account 2.1.02)'}
                                            </div>
                                            <div className="text-[10px] opacity-70 mt-0.5" style={{ color: 'var(--text-main)' }}>
                                                {transaction.setOffHistory.targetType === 'SUPPLIER'
                                                    ? 'Excess payment unconsumed by open vendor bills routed to vendor advance.'
                                                    : 'Excess payment unconsumed by open invoices routed to customer advance.'
                                                }
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
                                        <CheckCircle size={12} /> {transaction.bankAccount.status || 'ACTIVE'}
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

            {/* Context-Aware Transaction Edit Modal */}
            <TransactionEditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={fetchTransaction}
                transaction={transaction}
                classification={classification}
                initialMode={activeEditMode}
            />

            {/* Ledger Entry Detail Modal */}
            <LedgerEntryDetailModal
                isOpen={isLedgerDetailOpen}
                onClose={() => { setIsLedgerDetailOpen(false); setSelectedLedgerEntry(null); }}
                entry={selectedLedgerEntry}
                isCutoffDisabled={isCutoffDisabled}
                onChangeAccount={(leg) => {
                    setTargetLegForSwap(leg);
                    setIsAccountModalOpen(true);
                }}
            />

            {/* Change Linked Account Modal */}
            <ChangeLinkedAccountModal
                isOpen={isAccountModalOpen}
                onClose={() => { setIsAccountModalOpen(false); setTargetLegForSwap(null); }}
                onSuccess={fetchTransaction}
                targetLeg={targetLegForSwap}
                transaction={transaction}
            />
        </div>
    );
};

export default BankTransactionDetailPage;
