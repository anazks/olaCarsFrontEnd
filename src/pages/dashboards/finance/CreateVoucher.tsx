import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Save, 
    X, 
    AlertCircle, 
    Calculator, 
    ChevronDown, 
    Search, 
    Receipt, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowLeftRight, 
    FileText,
    Building2,
    UserCircle,
    Hash,
    Tag,
    Calendar
} from 'lucide-react';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { getAllTaxes } from '../../../services/taxService';
import { createVoucher } from '../../../services/ledgerService';
import type { VoucherType, JournalLine } from '../../../services/ledgerService';

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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
            >
                <span className="text-sm text-white truncate">
                    {selectedCode ? `${selectedCode.code} - ${selectedCode.name}` : 'Select Account'}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                        {filteredCodes.map(code => (
                            <div
                                key={code._id}
                                onClick={() => {
                                    onSelect(code._id);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className="px-4 py-3 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-white/[0.02] last:border-0"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white group-hover:text-black">{code.code}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 group-hover:bg-black/10 group-hover:text-black font-bold uppercase tracking-wider">
                                        {code.category}
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/60 group-hover:text-black/80 mt-0.5 truncate">{code.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateVoucher = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [type, setType] = useState<VoucherType>('PAYMENT');
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

    const [header, setHeader] = useState({
        date: new Date().toISOString().split('T')[0],
        branch: '',
        narration: '',
        referenceInfo: {
            referenceNumber: '',
            partyName: '',
            partyId: '',
            partyType: 'OTHER' as any
        }
    });

    const [lines, setLines] = useState<JournalLine[]>([
        { accountingCode: '', type: 'DEBIT', amount: 0, description: '' },
        { accountingCode: '', type: 'CREDIT', amount: 0, description: '' }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [codes, branchesData, taxesData] = await Promise.all([
                    getAllAccountingCodes(),
                    getAllBranches(),
                    getAllTaxes()
                ]);
                setAccountingCodes(codes);
                setBranches(branchesData.data || []);
                setTaxes(taxesData);
            } catch (err) {
                setError('Failed to load form data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper to auto-populate lines based on type
    useEffect(() => {
        if (type === 'PAYMENT') {
            setHeader(h => ({ ...h, narration: 'Payment for ' }));
            setLines([
                { accountingCode: '', type: 'DEBIT', amount: 0, description: 'Expense/Supplier amount' },
                { accountingCode: '', type: 'CREDIT', amount: 0, description: 'Bank/Cash payment' }
            ]);
        } else if (type === 'RECEIPT') {
            setHeader(h => ({ ...h, narration: 'Receipt from ' }));
            setLines([
                { accountingCode: '', type: 'DEBIT', amount: 0, description: 'Bank/Cash receipt' },
                { accountingCode: '', type: 'CREDIT', amount: 0, description: 'Income/Customer amount' }
            ]);
        } else if (type === 'CONTRA') {
            setHeader(h => ({ ...h, narration: 'Cash/Bank transfer' }));
            setLines([
                { accountingCode: '', type: 'DEBIT', amount: 0, description: 'Transfer To' },
                { accountingCode: '', type: 'CREDIT', amount: 0, description: 'Transfer From' }
            ]);
        }
    }, [type]);

    const handleAddLine = () => {
        setLines([...lines, { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }]);
    };

    const handleRemoveLine = (index: number) => {
        if (lines.length <= 2) return;
        setLines(lines.filter((_, i) => i !== index));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.branch) return setError('Please select a branch');
        if (totals.debit <= 0) return setError('Total amount must be greater than zero');
        
        if (['JOURNAL', 'CONTRA'].includes(type) && Math.abs(totals.debit - totals.credit) > 0.01) {
            return setError('Debits and Credits must balance');
        }

        setSubmitting(true);
        setError(null);
        try {
            await createVoucher({
                ...header,
                type,
                lines
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create voucher');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center"><div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin mx-auto" /></div>;

    const typeConfig = {
        PAYMENT: { icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        RECEIPT: { icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        JOURNAL: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        CONTRA: { icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        SALES: { icon: Receipt, color: 'text-[#C8E600]', bg: 'bg-[#C8E600]/10' },
        PURCHASE: { icon: Receipt, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
    };

    const ActiveIcon = typeConfig[type].icon;

    return (
        <div className="bg-[#0A0A0A] overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <div className={`p-3 ${typeConfig[type].bg} rounded-2xl`}>
                        <ActiveIcon size={28} className={typeConfig[type].color} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Create {type.charAt(0) + type.slice(1).toLowerCase()} Voucher</h2>
                        <p className="text-xs text-white/40 mt-0.5">Record structured financial transaction</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Type Selection */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {(Object.keys(typeConfig) as VoucherType[]).map((vType) => (
                        <button
                            key={vType}
                            type="button"
                            onClick={() => setType(vType)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                                type === vType 
                                ? `bg-white/5 border-${typeConfig[vType].color.split('-')[1]}-500/50 shadow-[0_0_15px_rgba(255,255,255,0.05)]` 
                                : 'border-white/5 bg-transparent hover:bg-white/5'
                            }`}
                        >
                            {vType === 'PAYMENT' && <ArrowUpRight size={16} className={type === vType ? 'text-rose-500' : 'text-white/20'} />}
                            {vType === 'RECEIPT' && <ArrowDownLeft size={16} className={type === vType ? 'text-emerald-500' : 'text-white/20'} />}
                            {vType === 'JOURNAL' && <FileText size={16} className={type === vType ? 'text-amber-500' : 'text-white/20'} />}
                            {vType === 'CONTRA' && <ArrowLeftRight size={16} className={type === vType ? 'text-blue-500' : 'text-white/20'} />}
                            {vType === 'SALES' && <Receipt size={16} className={type === vType ? 'text-[#C8E600]' : 'text-white/20'} />}
                            {vType === 'PURCHASE' && <Receipt size={16} className={type === vType ? 'text-indigo-500' : 'text-white/20'} />}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${type === vType ? 'text-white' : 'text-white/40'}`}>
                                {vType}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} /> Date
                        </label>
                        <input
                            required
                            type="date"
                            value={header.date}
                            onChange={e => setHeader({ ...header, date: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                            <Building2 size={12} /> Branch
                        </label>
                        <select
                            required
                            value={header.branch}
                            onChange={e => setHeader({ ...header, branch: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all appearance-none"
                        >
                            <option value="" className="bg-[#1A1A1A]">Select Branch</option>
                            {branches.map(b => <option key={b._id} value={b._id} className="bg-[#1A1A1A]">{b.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                            <Tag size={12} /> Narration
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Brief description..."
                            value={header.narration}
                            onChange={e => setHeader({ ...header, narration: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Reference Info Section (Conditionally expanded) */}
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                        <Hash size={12} /> Reference & Party Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40">Ref Number (Inv/Chq)</label>
                            <input
                                type="text"
                                value={header.referenceInfo.referenceNumber}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, referenceNumber: e.target.value } })}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-white/20 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40">Party Name</label>
                            <input
                                type="text"
                                value={header.referenceInfo.partyName}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyName: e.target.value } })}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-white/20 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40">Party Type</label>
                            <select
                                value={header.referenceInfo.partyType}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyType: e.target.value } })}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-white/20 outline-none transition-all appearance-none"
                            >
                                <option value="OTHER">Other</option>
                                <option value="CUSTOMER">Customer</option>
                                <option value="SUPPLIER">Supplier</option>
                                <option value="DRIVER">Driver</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-white/40">External ID</label>
                            <input
                                type="text"
                                value={header.referenceInfo.partyId}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyId: e.target.value } })}
                                className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-white/20 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Account</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Description</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">DR/CR</th>
                                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">Amount</th>
                                <th className="px-5 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {lines.map((line, index) => (
                                <tr key={index} className="hover:bg-white/[0.01]">
                                    <td className="p-3 w-1/3">
                                        <AccountSelector
                                            codes={accountingCodes}
                                            selectedId={line.accountingCode}
                                            onSelect={(id) => updateLine(index, 'accountingCode', id)}
                                            isOpen={openDropdownIndex === index}
                                            setIsOpen={(open) => setOpenDropdownIndex(open ? index : null)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="text"
                                            placeholder="Line memo"
                                            value={line.description}
                                            onChange={e => updateLine(index, 'description', e.target.value)}
                                            className="w-full bg-transparent border-none text-sm text-white focus:ring-0 outline-none"
                                        />
                                    </td>
                                    <td className="p-3 w-32">
                                        <select
                                            value={line.type}
                                            onChange={e => updateLine(index, 'type', e.target.value)}
                                            className={`w-full bg-transparent border-none text-xs font-bold focus:ring-0 outline-none ${line.type === 'DEBIT' ? 'text-emerald-500' : 'text-rose-500'}`}
                                        >
                                            <option value="DEBIT" className="bg-[#1A1A1A]">DEBIT</option>
                                            <option value="CREDIT" className="bg-[#1A1A1A]">CREDIT</option>
                                        </select>
                                    </td>
                                    <td className="p-3 w-40">
                                        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/5 focus-within:border-[#C8E600]/50 transition-all">
                                            <span className="text-white/20 text-xs">$</span>
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                value={line.amount || ''}
                                                onChange={e => updateLine(index, 'amount', Number(e.target.value))}
                                                className="w-full bg-transparent border-none p-0 text-sm text-white focus:ring-0 outline-none font-mono"
                                            />
                                        </div>
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLine(index)}
                                            className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all"
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
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Add Transaction Line
                    </button>
                </div>

                {/* Totals & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 pt-8 border-t border-white/5">
                    <div className="flex items-center gap-12">
                        <div className="space-y-1">
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Debit</p>
                            <p className="text-2xl font-mono font-bold text-emerald-500">${totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Total Credit</p>
                            <p className="text-2xl font-mono font-bold text-rose-500">${totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        {Math.abs(totals.debit - totals.credit) > 0.01 && (
                            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold">
                                UNBALANCED: DIFF ${(totals.debit - totals.credit).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl text-sm font-bold bg-white/5 text-white hover:bg-white/10 transition-all border border-white/5"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 md:flex-none px-12 py-3.5 rounded-2xl text-sm font-bold bg-[#C8E600] text-black disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(200,230,0,0.2)] hover:shadow-[0_0_40px_rgba(200,230,0,0.4)]"
                        >
                            {submitting ? 'Processing...' : <><Save size={20} /> Post Voucher</>}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm flex items-center gap-3">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreateVoucher;
