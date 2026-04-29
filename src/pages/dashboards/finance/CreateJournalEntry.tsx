import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { createManualJournal } from '../../../services/ledgerService';
import { getAllBranches } from '../../../services/branchService';
import { getAllTaxes } from '../../../services/taxService';
import { Search, ChevronDown, Building2 } from 'lucide-react';
import { getAllBankAccounts } from '../../../services/bankAccountService';
import type { BankAccount } from '../../../services/bankAccountService';
import type { AccountingCode } from '../../../services/accountingService';
import type { JournalLine } from '../../../services/ledgerService';

const AccountSelector = ({ codes, selectedId, onSelect, isOpen, setIsOpen }: { 
    codes: AccountingCode[], 
    selectedId: string, 
    onSelect: (id: string) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
}) => {
    const [search, setSearch] = useState('');
    const selectedCode = codes.find(c => c._id === selectedId);

    const filteredCodes = codes.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative">
            <div 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
            >
                <span className="text-sm text-white truncate">
                    {selectedCode ? `${selectedCode.code} - ${selectedCode.name}` : 'Select Account'}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-[300px] mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-white/5 bg-white/5 flex items-center gap-2">
                        <Search size={14} className="text-white/40" />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Search code or name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="bg-transparent border-none text-xs text-white focus:ring-0 outline-none w-full"
                        />
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filteredCodes.length > 0 ? (
                            filteredCodes.map(code => (
                                <div 
                                    key={code._id}
                                    onClick={() => {
                                        onSelect(code._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2.5 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-white/[0.02] last:border-0`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-white group-hover:text-black">{code.code}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 group-hover:bg-black/10 group-hover:text-black font-bold uppercase tracking-wider">
                                            {code.category}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-white/60 group-hover:text-black/80 mt-0.5 truncate">{code.name}</p>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-white/40 italic">No accounts found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateJournalEntry = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

    const [header, setHeader] = useState({
        description: '',
        date: new Date().toISOString().split('T')[0],
        branch: ''
    });

    const [lines, setLines] = useState<JournalLine[]>([
        { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [codesData, branchesData, taxesData, banksData] = await Promise.all([
                    getAllAccountingCodes(),
                    getAllBranches(),
                    getAllTaxes(),
                    getAllBankAccounts()
                ]);
                setAccountingCodes(codesData);
                setBranches(branchesData.data || []);
                setTaxes(taxesData);
                setBankAccounts(banksData.data || []);
            } catch (err: any) {
                setError('Failed to load initial data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddLine = () => {
        setLines([...lines, { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }]);
    };

    const handleRemoveLine = (index: number) => {
        if (lines.length <= 2) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines);
    };

    const updateLine = (index: number, field: keyof JournalLine | string, value: any) => {
        const newLines = [...lines];
        if (field === 'taxInfo') {
            newLines[index].taxInfo = { ...newLines[index].taxInfo, ...value };
        } else {
            (newLines[index] as any)[field] = value;
        }
        setLines(newLines);
    };

    const totals = lines.reduce((acc, line) => {
        if (line.type === 'DEBIT') acc.debit += Number(line.amount || 0);
        else acc.credit += Number(line.amount || 0);
        return acc;
    }, { debit: 0, credit: 0 });

    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.branch) {
            setError('Please select a branch');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        try {
            await createManualJournal({
                ...header,
                paymentMethod,
                bankAccount: paymentMethod === 'BANK' ? selectedBankId : undefined,
                lines
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create journal entry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="bg-[#121212] rounded-2xl border border-white/10 overflow-hidden max-w-5xl w-full">
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calculator size={24} className="text-[#C8E600]" />
                        Create Manual Journal Entry
                    </h2>
                    <p className="text-xs text-white/40 mt-1">Record manual adjustments, payroll, or tax provisions</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Journal Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/60 uppercase">Description</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. April 2026 Payroll Accrual"
                            value={header.description}
                            onChange={e => setHeader({ ...header, description: e.target.value })}
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/60 uppercase">Branch</label>
                        <select
                            required
                            value={header.branch}
                            onChange={e => setHeader({ ...header, branch: e.target.value })}
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                        >
                            <option value="">Select Branch</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name} ({b.country})</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/60 uppercase">Date</label>
                        <input
                            required
                            type="date"
                            value={header.date}
                            onChange={e => setHeader({ ...header, date: e.target.value })}
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/60 uppercase">Payment Method</label>
                        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('CASH')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    paymentMethod === 'CASH' 
                                    ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20' 
                                    : 'text-white/40 hover:text-white'
                                }`}
                            >
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('BANK')}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    paymentMethod === 'BANK' 
                                    ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20' 
                                    : 'text-white/40 hover:text-white'
                                }`}
                            >
                                Bank
                            </button>
                        </div>
                    </div>
                    {paymentMethod === 'BANK' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                            <label className="text-xs font-semibold text-white/60 uppercase">Bank Account</label>
                            <div className="relative">
                                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C8E600]" />
                                <select
                                    required
                                    value={selectedBankId}
                                    onChange={e => setSelectedBankId(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all appearance-none"
                                >
                                    <option value="" className="bg-[#1A1A1A]">Select Bank Account</option>
                                    {bankAccounts.map(acc => (
                                        <option key={acc._id} value={acc._id} className="bg-[#1A1A1A]">
                                            {acc.bankName} - {acc.accountNumber} ({acc.currency})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lines Table */}
                <div className="rounded-xl border border-white/10">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Account</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Description</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Type</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Tax Option</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {lines.map((line, index) => (
                                <tr key={index} className="hover:bg-white/[0.02]" style={{ position: 'relative', zIndex: openDropdownIndex === index ? 1000 : 1 }}>
                                    <td className="p-2 w-1/4 relative">
                                        <AccountSelector 
                                            codes={accountingCodes}
                                            selectedId={line.accountingCode}
                                            onSelect={(id) => updateLine(index, 'accountingCode', id)}
                                            isOpen={openDropdownIndex === index}
                                            setIsOpen={(open) => setOpenDropdownIndex(open ? index : null)}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            placeholder="Line memo"
                                            value={line.description}
                                            onChange={e => updateLine(index, 'description', e.target.value)}
                                            className="w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
                                        />
                                    </td>
                                    <td className="p-2 w-32">
                                        <select
                                            value={line.type}
                                            onChange={e => updateLine(index, 'type', e.target.value)}
                                            className="w-full bg-transparent border-none text-xs font-bold text-white focus:ring-0 outline-none"
                                        >
                                            <option value="DEBIT" className="bg-[#1A1A1A] text-emerald-500">DEBIT</option>
                                            <option value="CREDIT" className="bg-[#1A1A1A] text-rose-500">CREDIT</option>
                                        </select>
                                    </td>
                                    <td className="p-2 w-32">
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={line.amount}
                                            onChange={e => updateLine(index, 'amount', Number(e.target.value))}
                                            className="w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none font-mono"
                                        />
                                    </td>
                                    <td className="p-2 w-40">
                                        <select
                                            value={line.taxInfo?.taxApplied || ''}
                                            onChange={e => updateLine(index, 'taxInfo', { taxApplied: e.target.value })}
                                            className="w-full bg-transparent border-none text-[10px] text-white/60 focus:ring-0 outline-none"
                                        >
                                            <option value="" className="bg-[#1A1A1A]">No Tax</option>
                                            {taxes.map(t => (
                                                <option key={t._id} value={t._id} className="bg-[#1A1A1A]">{t.name} ({t.percentage}%)</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2 text-right">
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveLine(index)}
                                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    <button 
                        type="button"
                        onClick={handleAddLine}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Add Line
                    </button>
                </div>

                {/* Footer / Totals */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-4 w-full sm:w-auto">
                        {error && (
                            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-2 rounded-xl text-sm border border-rose-500/20">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/40 font-bold uppercase">Journal Amount</p>
                                <p className="text-xl font-mono font-bold text-[#C8E600]">${(totals.debit + totals.credit).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-xl text-sm font-bold bg-white/5 text-white hover:bg-white/10 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 sm:flex-none px-10 py-3 rounded-xl text-sm font-bold bg-[#C8E600] text-[#0A0A0A] disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,230,0,0.2)] hover:shadow-[0_0_30px_rgba(200,230,0,0.4)]"
                        >
                            {submitting ? 'Posting...' : <><Save size={18} /> Post Journal Entry</>}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default CreateJournalEntry;
