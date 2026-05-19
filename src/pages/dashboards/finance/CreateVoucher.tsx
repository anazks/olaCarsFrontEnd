import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Save, 
    X, 
    AlertCircle, 
    ChevronDown, 
    Search, 
    Receipt, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowLeftRight, 
    FileText,
    Building2,
    Hash,
    Tag,
    Calendar
} from 'lucide-react';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { createVoucher } from '../../../services/ledgerService';
import type { VoucherType, JournalLine } from '../../../services/ledgerService';
import { useTheme } from '../../../context/ThemeContext';


const AccountSelector = ({ codes, selectedId, onSelect, isOpen, setIsOpen }: {
    codes: AccountingCode[],
    selectedId: string,
    onSelect: (id: string) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const selectedCode = codes.find(c => c._id === selectedId);

    const filteredCodes = codes.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
    );

    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';

    return (
        <div className="relative">
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
            >
                <span className="text-sm truncate text-[color:var(--text-main)]">
                    {selectedCode ? `${selectedCode.code} - ${selectedCode.name}` : 'Select Account'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: textDimColor }} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 border rounded-xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                     style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}>
                    <div className="p-3 border-b flex items-center gap-2"
                         style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                        <Search size={14} style={{ color: textDimColor }} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search code or name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.stopPropagation()}
                            className="bg-transparent border-none text-xs focus:ring-0 outline-none w-full text-[color:var(--text-main)]"
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
                                className="px-4 py-3 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b last:border-0"
                                style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[color:var(--text-main)] group-hover:text-black">{code.code}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider group-hover:bg-black/10 group-hover:text-black text-[color:var(--text-muted)]"
                                          style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB' }}>
                                        {code.category}
                                    </span>
                                </div>
                                <p className="text-[11px] group-hover:text-black/80 mt-0.5 truncate text-[color:var(--text-muted)]">{code.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateVoucher = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [type, setType] = useState<VoucherType>('PAYMENT');
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
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
        { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [codes, branchesData] = await Promise.all([
                    getAllAccountingCodes(),
                    getAllBranches()
                ]);
                setAccountingCodes(codes);
                setBranches(branchesData.data || []);
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
        } else if (type === 'RECEIPT') {
            setHeader(h => ({ ...h, narration: 'Receipt from ' }));
        } else if (type === 'CONTRA') {
            setHeader(h => ({ ...h, narration: 'Cash/Bank transfer' }));
        }
    }, [type]);

    const handleAddLine = () => {
        setLines([...lines, { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }]);
    };

    const handleRemoveLine = (index: number) => {
        if (lines.length <= 1) return;
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

        if (lines.some(line => !line.accountingCode)) {
            return setError('Please select an accounting code for all transaction lines');
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

    // Accessibility high-contrast colors in light mode
    const borderStyle = { borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' };
    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';

    return (
        <div className="overflow-hidden bg-transparent" style={{ backgroundColor: 'var(--bg-card)' }}>
            {/* Header */}
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white/[0.01]" style={borderStyle}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 ${typeConfig[type].bg} rounded-2xl`}>
                        <ActiveIcon size={28} className={typeConfig[type].color} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-[color:var(--text-main)]">Create {type.charAt(0) + type.slice(1).toLowerCase()} Voucher</h2>
                        <p className="text-xs mt-0.5" style={{ color: textDimColor }}>Record structured financial transaction</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/5 transition-all" style={{ color: textDimColor }}>
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
                                ? `bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]` 
                                : 'bg-transparent hover:bg-white/5'
                            }`}
                            style={{ borderColor: type === vType ? 'var(--brand-lime)' : (isDark ? 'var(--border-main)' : '#D1D5DB') }}
                        >
                            {vType === 'PAYMENT' && <ArrowUpRight size={16} className={type === vType ? 'text-rose-500' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            {vType === 'RECEIPT' && <ArrowDownLeft size={16} className={type === vType ? 'text-emerald-500' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            {vType === 'JOURNAL' && <FileText size={16} className={type === vType ? 'text-amber-500' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            {vType === 'CONTRA' && <ArrowLeftRight size={16} className={type === vType ? 'text-blue-500' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            {vType === 'SALES' && <Receipt size={16} className={type === vType ? 'text-[#C8E600]' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            {vType === 'PURCHASE' && <Receipt size={16} className={type === vType ? 'text-indigo-500' : ''} style={{ color: type === vType ? '' : textDimColor }} />}
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: type === vType ? 'var(--text-main)' : textDimColor }}>
                                {vType}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Calendar size={12} /> Date
                        </label>
                        <input
                            required
                            type="date"
                            value={header.date}
                            onChange={e => setHeader({ ...header, date: e.target.value })}
                            className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB', colorScheme: isDark ? 'dark' : 'light' }}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Building2 size={12} /> Branch
                        </label>
                        <select
                            required
                            value={header.branch}
                            onChange={e => setHeader({ ...header, branch: e.target.value })}
                            className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none cursor-pointer focus:border-[#C8E600] text-[color:var(--text-main)]"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                        >
                            <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Select Branch</option>
                            {branches.map(b => <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Tag size={12} /> Narration
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Brief description..."
                            value={header.narration}
                            onChange={e => setHeader({ ...header, narration: e.target.value })}
                            className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                        />
                    </div>
                </div>

                {/* Reference Info Section */}
                <div className="p-6 border rounded-2xl space-y-4" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: textDimColor }}>
                        <Hash size={12} /> Reference & Party Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px]" style={{ color: textDimColor }}>Ref Number (Inv/Chq)</label>
                            <input
                                type="text"
                                value={header.referenceInfo.referenceNumber}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, referenceNumber: e.target.value } })}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px]" style={{ color: textDimColor }}>Party Name</label>
                            <input
                                type="text"
                                value={header.referenceInfo.partyName}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyName: e.target.value } })}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px]" style={{ color: textDimColor }}>Party Type</label>
                            <select
                                value={header.referenceInfo.partyType}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyType: e.target.value } })}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all appearance-none cursor-pointer focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            >
                                <option value="OTHER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Other</option>
                                <option value="CUSTOMER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Customer</option>
                                <option value="SUPPLIER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Supplier</option>
                                <option value="DRIVER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Driver</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px]" style={{ color: textDimColor }}>External ID</label>
                            <input
                                type="text"
                                value={header.referenceInfo.partyId}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyId: e.target.value } })}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border overflow-hidden bg-transparent" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className={`${lines.length > 3 ? 'max-h-[300px] overflow-y-auto custom-scrollbar' : ''}`}>
                        <table className="w-full text-left border-collapse">
                            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                <tr>
                                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Account</th>
                                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Description</th>
                                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>DR/CR</th>
                                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Amount</th>
                                    <th className="px-5 py-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                {lines.map((line, index) => (
                                    <tr key={index} className="hover:bg-white/[0.01]" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
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
                                                className="w-full bg-transparent border-none text-sm focus:ring-0 outline-none text-[color:var(--text-main)]"
                                            />
                                        </td>
                                        <td className="p-3 w-32">
                                            <select
                                                value={line.type}
                                                onChange={e => updateLine(index, 'type', e.target.value)}
                                                className={`w-full bg-transparent border-none text-xs font-bold focus:ring-0 outline-none cursor-pointer ${line.type === 'DEBIT' ? 'text-emerald-500' : 'text-rose-500'}`}
                                            >
                                                <option value="DEBIT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>DEBIT</option>
                                                <option value="CREDIT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>CREDIT</option>
                                            </select>
                                        </td>
                                        <td className="p-3 w-40">
                                            <div className="flex items-center gap-2 rounded-xl px-3 py-2 border transition-all focus-within:border-[#C8E600]/50"
                                                 style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                                <span className="text-xs" style={{ color: textDimColor }}>$</span>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    value={line.amount || ''}
                                                    onChange={e => updateLine(index, 'amount', e.target.value === '' ? 0 : Number(e.target.value))}
                                                    className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none font-mono text-[color:var(--text-main)]"
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
                    </div>
                    <button
                        type="button"
                        onClick={handleAddLine}
                        className="w-full py-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-t hover:bg-white/5"
                        style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB', color: textDimColor }}
                    >
                        <Plus size={14} /> Add Transaction Line
                    </button>
                </div>

                {/* Totals & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 pt-8 border-t" style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className="flex items-center gap-12">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Total Debit</p>
                            <p className="text-2xl font-mono font-bold text-emerald-500">${totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Total Credit</p>
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
                            className="flex-1 md:flex-none px-8 py-3.5 rounded-2xl text-sm font-bold transition-all border"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB', color: 'var(--text-main)' }}
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
