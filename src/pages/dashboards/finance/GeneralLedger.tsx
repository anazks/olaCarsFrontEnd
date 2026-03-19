import { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, AlertTriangle, Calendar, Filter, Download } from 'lucide-react';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';

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

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCode, setSelectedCode] = useState('ALL');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Build filters dynamically
            const filters: Record<string, any> = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (selectedCode !== 'ALL') filters.accountingCode = selectedCode;

            const [ledgerData, codesData] = await Promise.all([
                getLedgerEntries(filters),
                getAllAccountingCodes().catch(() => []) // Fallback to empty if codes fail
            ]);

            setEntries(Array.isArray(ledgerData) ? ledgerData : []);
            setAccountingCodes(Array.isArray(codesData) ? codesData : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch ledger entries');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedCode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Derived statistics
    const totalDebit = entries.reduce((sum, entry) => {
        if (entry.amount !== undefined && entry.type === 'DEBIT') return sum + entry.amount;
        return sum + (entry.debit || 0);
    }, 0);

    const totalCredit = entries.reduce((sum, entry) => {
        if (entry.amount !== undefined && entry.type === 'CREDIT') return sum + entry.amount;
        return sum + (entry.credit || 0);
    }, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <FileText size={28} style={{ color: '#C8E600' }} />
                        General Ledger
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Immutable audit trail of all financial transactions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {/* Placeholder for export functionality */}
                    <button
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        disabled={entries.length === 0}
                    >
                        <Download size={16} /> Export CSV
                    </button>
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
                <div className="flex items-center gap-2">
                    <Calendar size={18} style={{ color: 'var(--text-dim)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Date Range:</span>
                </div>
                <div className="flex items-center gap-2 flex-grow max-w-sm">
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: 'dark' }} 
                    />
                    <span style={{ color: 'var(--text-dim)' }}>to</span>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: 'dark' }} 
                    />
                </div>
                
                <div className="hidden sm:block w-px h-8 mx-2" style={{ background: 'var(--border-main)' }}></div>
                
                <div className="flex items-center gap-2">
                    <Filter size={18} style={{ color: 'var(--text-dim)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Account:</span>
                </div>
                <select 
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="flex-grow sm:max-w-[250px] px-3 py-2 rounded-lg text-sm outline-none transition-colors border"
                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} 
                >
                    <option value="ALL">All Accounts</option>
                    {accountingCodes.map(c => (
                        <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                    ))}
                </select>

                {/* Clear Filters */}
                {(startDate || endDate || selectedCode !== 'ALL') && (
                    <button 
                        onClick={() => { setStartDate(''); setEndDate(''); setSelectedCode('ALL'); }}
                        className="text-sm font-medium hover:underline ml-auto"
                        style={{ color: '#ef4444' }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Total Debit (Displayed)</p>
                    <h3 className="text-2xl font-bold text-red-400">{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Total Credit (Displayed)</p>
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
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Credit</th>
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
                                        <tr key={entry._id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm" style={{ color: 'var(--text-main)' }}>{entry.description}</div>
                                                {entry.referenceId && (
                                                    <div className="text-[10px] font-mono mt-1 opacity-60">Ref: {entry.referenceId}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {entry.accountingCode?.code} - {entry.accountingCode?.name}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border"
                                                        style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                                                        {entry.accountingCode?.category}
                                                    </span>
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
            </div>
        </div>
    );
};

export default GeneralLedger;
