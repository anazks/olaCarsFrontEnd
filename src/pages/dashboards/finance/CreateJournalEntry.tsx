import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, Calculator } from 'lucide-react';
import { getAllAccountingCodes, createAccountingCode } from '../../../services/accountingService';
import { createManualJournal } from '../../../services/ledgerService';
import { getAllBranches, createBranch } from '../../../services/branchService';
import { getAllTaxes, createTax } from '../../../services/taxService';
import { Search, ChevronDown, Building2, UserPlus } from 'lucide-react';
import { getAllBankAccounts, createBankAccount } from '../../../services/bankAccountService';
import { getAllCountryManagers, createCountryManager } from '../../../services/countryManagerService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import type { AccountingCode } from '../../../services/accountingService';
import type { JournalLine } from '../../../services/ledgerService';
import type { CountryManager } from '../../../services/countryManagerService';

const AccountSelector = ({ codes, selectedId, onSelect, isOpen, setIsOpen, onAddNew }: { 
    codes: AccountingCode[], 
    selectedId: string, 
    onSelect: (id: string) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    onAddNew?: () => void
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
                            <div className="p-4 text-center text-xs flex flex-col items-center">
                                <span className="text-white/40 italic block mb-2">No accounts found</span>
                                {onAddNew && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setIsOpen(false);
                                            onAddNew();
                                        }} 
                                        className="text-[#C8E600] font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add New Code
                                    </button>
                                )}
                            </div>
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
    const [countryManagers, setCountryManagers] = useState<CountryManager[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
    const [selectedBankId, setSelectedBankId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

    // Quick create states
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showBankModal, setShowBankModal] = useState(false);
    const [showCountryManagerModal, setShowCountryManagerModal] = useState(false);
    const [showAccountingCodeModal, setShowAccountingCodeModal] = useState(false);
    const [showTaxModal, setShowTaxModal] = useState(false);
    const [targetLineIndex, setTargetLineIndex] = useState<number | null>(null);
    const [quickCreateLoading, setQuickCreateLoading] = useState(false);
    const [quickCreateError, setQuickCreateError] = useState<string | null>(null);

    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    const countryToIso2: Record<string, string> = {
        "Panama": "pa",
        "United States": "us",
        "United Kingdom": "gb",
        "Canada": "ca",
        "Australia": "au",
        "Germany": "de",
        "France": "fr",
        "India": "in",
        "Nigeria": "ng",
        "South Africa": "za",
        "United Arab Emirates": "ae"
    };
    
    const [newBranch, setNewBranch] = useState({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '', country: '', countryManager: '', status: 'ACTIVE' });
    const [newBank, setNewBank] = useState({ bankName: '', accountNumber: '', accountHolderName: '', swiftCode: '', ifscCode: '', branchName: '', currency: 'USD', initialBalance: 0 });
    const [newCountryManager, setNewCountryManager] = useState({ fullName: '', email: '', password: '', phone: '', country: '' });
    const [newAccountingCode, setNewAccountingCode] = useState<{code: string, name: string, category: any}>({ code: '', name: '', category: 'EXPENSE' });
    const [newTax, setNewTax] = useState({ name: '', rate: 0 });

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
                const [codesData, branchesData, taxesData, banksData, managersData] = await Promise.all([
                    getAllAccountingCodes(),
                    getAllBranches(),
                    getAllTaxes(),
                    getAllBankAccounts(),
                    getAllCountryManagers()
                ]);
                setAccountingCodes(codesData);
                setBranches(branchesData.data || []);
                setTaxes(taxesData);
                setBankAccounts(banksData.data || []);
                setCountryManagers(managersData.data || []);
            } catch (err: any) {
                setError('Failed to load initial data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newBranch.phone || newBranch.phone.length < 5) {
            setQuickCreateError("Please enter a valid phone number");
            return;
        }

        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createBranch({ ...newBranch, status: newBranch.status as any });
            // Refresh branches
            const branchesData = await getAllBranches();
            setBranches(branchesData.data || []);
            // Auto select
            setHeader({ ...header, branch: res._id });
            setShowBranchModal(false);
            setNewBranch({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '', country: '', countryManager: '', status: 'ACTIVE' });
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create branch');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateBank = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newBank.bankName || !newBank.accountNumber || !newBank.accountHolderName) {
            setQuickCreateError("Please fill in all required fields");
            return;
        }

        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createBankAccount({ ...newBank, status: 'ACTIVE' });
            // Refresh banks
            const banksData = await getAllBankAccounts();
            setBankAccounts(banksData.data || []);
            // Auto select
            setSelectedBankId(res._id);
            setPaymentMethod('BANK');
            setShowBankModal(false);
            setNewBank({ bankName: '', accountNumber: '', accountHolderName: '', swiftCode: '', ifscCode: '', branchName: '', currency: 'USD', initialBalance: 0 });
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create bank account');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateCountryManager = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createCountryManager({ ...newCountryManager, status: 'ACTIVE' });
            // Refresh managers
            const managersData = await getAllCountryManagers();
            setCountryManagers(managersData.data || []);
            // Auto select
            setNewBranch({ ...newBranch, countryManager: res._id, country: res.country });
            setShowCountryManagerModal(false);
            setNewCountryManager({ fullName: '', email: '', password: '', phone: '', country: '' });
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create country manager');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateAccountingCode = async (e: React.FormEvent) => {
        e.preventDefault();

        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createAccountingCode(newAccountingCode);
            // Refresh codes
            const codesData = await getAllAccountingCodes();
            setAccountingCodes(codesData);
            
            if (targetLineIndex !== null) {
                updateLine(targetLineIndex, 'accountingCode', res._id);
            }
            setShowAccountingCodeModal(false);
            setNewAccountingCode({ code: '', name: '', category: 'EXPENSE' });
            setTargetLineIndex(null);
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create accounting code');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createTax(newTax);
            // Refresh taxes
            const taxData = await getAllTaxes();
            setTaxes(taxData);
            
            if (targetLineIndex !== null) {
                updateLine(targetLineIndex, 'taxInfo', { taxApplied: res._id });
            }
            setShowTaxModal(false);
            setNewTax({ name: '', rate: 0 });
            setTargetLineIndex(null);
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create tax profile');
        } finally {
            setQuickCreateLoading(false);
        }
    };

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
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-white/60 uppercase">Branch</label>
                            {branches.length === 0 && (
                                <button type="button" onClick={() => setShowBranchModal(true)} className="text-[10px] text-[#C8E600] font-bold hover:underline flex items-center gap-1">
                                    <Plus size={10} /> Add Branch
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <select
                                required
                                disabled={branches.length === 0}
                                value={header.branch}
                                onChange={e => setHeader({ ...header, branch: e.target.value })}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">{branches.length === 0 ? 'No Branches Available' : 'Select Branch'}</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name} ({b.country})</option>
                                ))}
                            </select>
                            {branches.length > 0 && (
                                <button type="button" onClick={() => setShowBranchModal(true)} className="px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/60 transition-all flex items-center justify-center" title="Quick Add Branch">
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
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
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-white/60 uppercase">Bank Account</label>
                                {bankAccounts.length === 0 && (
                                    <button type="button" onClick={() => setShowBankModal(true)} className="text-[10px] text-[#C8E600] font-bold hover:underline flex items-center gap-1">
                                        <Plus size={10} /> Add Bank
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2 relative">
                                <div className="relative flex-1">
                                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C8E600]" />
                                    <select
                                        required
                                        disabled={bankAccounts.length === 0}
                                        value={selectedBankId}
                                        onChange={e => setSelectedBankId(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="" className="bg-[#1A1A1A]">{bankAccounts.length === 0 ? 'No Bank Accounts' : 'Select Bank Account'}</option>
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
                                {bankAccounts.length > 0 && (
                                    <button type="button" onClick={() => setShowBankModal(true)} className="px-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white/60 transition-all flex items-center justify-center" title="Quick Add Bank">
                                        <Plus size={16} />
                                    </button>
                                )}
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
                                            onAddNew={() => {
                                                setTargetLineIndex(index);
                                                setShowAccountingCodeModal(true);
                                            }}
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
                                    <td className="p-2 w-40 relative group">
                                        <div className="flex items-center gap-1">
                                            <select
                                                disabled={taxes.length === 0}
                                                value={line.taxInfo?.taxApplied || ''}
                                                onChange={e => updateLine(index, 'taxInfo', { taxApplied: e.target.value })}
                                                className="w-full bg-transparent border-none text-[10px] text-white/60 focus:ring-0 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="" className="bg-[#1A1A1A]">{taxes.length === 0 ? 'No Tax Options' : 'No Tax'}</option>
                                                {taxes.map(t => (
                                                    <option key={t._id} value={t._id} className="bg-[#1A1A1A]">{t.name} ({t.rate || (t as any).percentage}%)</option>
                                                ))}
                                            </select>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    setTargetLineIndex(index);
                                                    setShowTaxModal(true);
                                                }} 
                                                className={`p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 transition-all ${taxes.length === 0 ? 'opacity-100 text-[#C8E600]' : 'opacity-0 group-hover:opacity-100'}`}
                                                title="Quick Add Tax"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>
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

            {/* Quick Create Modals */}
            {showBranchModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[#121212] rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building2 size={20} className="text-[#C8E600]" /> Quick Add Branch</h3>
                            <button onClick={() => setShowBranchModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateBranch} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Branch Name</label>
                                    <input required type="text" value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="Main Branch" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Branch Code</label>
                                    <input required type="text" value={newBranch.code} onChange={e => setNewBranch({...newBranch, code: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="BR01" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs text-white/60">Country Manager</label>
                                        {countryManagers.length === 0 && (
                                            <button type="button" onClick={() => setShowCountryManagerModal(true)} className="text-[10px] text-[#C8E600] font-bold hover:underline flex items-center gap-1">
                                                <Plus size={10} /> Add
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            required
                                            disabled={countryManagers.length === 0}
                                            value={newBranch.countryManager || ''}
                                            onChange={(e) => {
                                                const managerId = e.target.value;
                                                const manager = countryManagers.find(m => m._id === managerId);
                                                setNewBranch({ 
                                                    ...newBranch, 
                                                    countryManager: managerId,
                                                    country: manager ? manager.country : ''
                                                });
                                            }}
                                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] disabled:opacity-50"
                                        >
                                            <option value="">{countryManagers.length === 0 ? 'No Managers' : 'Select Manager'}</option>
                                            {countryManagers.map(m => (
                                                <option key={m._id} value={m._id} className="bg-[#1A1A1A]">
                                                    {m.fullName} ({m.country})
                                                </option>
                                            ))}
                                        </select>
                                        {countryManagers.length > 0 && (
                                            <button type="button" onClick={() => setShowCountryManagerModal(true)} className="px-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-white/60 transition-all flex items-center justify-center">
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Email</label>
                                    <input required type="email" value={newBranch.email} onChange={e => setNewBranch({...newBranch, email: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="branch@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">City</label>
                                    <input required type="text" value={newBranch.city} onChange={e => setNewBranch({...newBranch, city: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="New York" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">State</label>
                                    <input required type="text" value={newBranch.state} onChange={e => setNewBranch({...newBranch, state: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="NY" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Phone</label>
                                    <PhoneInput
                                        country={countryToIso2[newBranch.country] || "in"}
                                        value={newBranch.phone}
                                        onChange={(phone) => setNewBranch({...newBranch, phone})}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "#1A1A1A",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            color: "white",
                                            borderRadius: "0.5rem",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "#1A1A1A",
                                            border: "1px solid rgba(255,255,255,0.1)"
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Status</label>
                                    <select 
                                        required 
                                        value={newBranch.status} 
                                        onChange={e => setNewBranch({...newBranch, status: e.target.value})} 
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] appearance-none"
                                    >
                                        <option value="ACTIVE" className="bg-[#1A1A1A]">Active</option>
                                        <option value="INACTIVE" className="bg-[#1A1A1A]">Inactive</option>
                                        <option value="MAINTENANCE" className="bg-[#1A1A1A]">Maintenance</option>
                                    </select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-white/60">Address</label>
                                    <input required type="text" value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="123 Street" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowBranchModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBankModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[#121212] rounded-2xl p-6 w-full max-w-xl border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building2 size={20} className="text-[#C8E600]" /> Quick Add Bank Account</h3>
                            <button onClick={() => setShowBankModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateBank} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-white/60">Bank Name</label>
                                    <input required type="text" value={newBank.bankName} onChange={e => setNewBank({...newBank, bankName: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="Chase Bank" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Account Number</label>
                                    <input required type="text" value={newBank.accountNumber} onChange={e => setNewBank({...newBank, accountNumber: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="123456789" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Account Holder Name</label>
                                    <input required type="text" value={newBank.accountHolderName} onChange={e => setNewBank({...newBank, accountHolderName: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="John Doe" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Branch Name</label>
                                    <input type="text" value={newBank.branchName} onChange={e => setNewBank({...newBank, branchName: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="Main Branch" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">SWIFT / BIC Code</label>
                                    <input type="text" value={newBank.swiftCode} onChange={e => setNewBank({...newBank, swiftCode: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] font-mono" placeholder="SWIFT Code" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">IFSC Code (Optional)</label>
                                    <input type="text" value={newBank.ifscCode} onChange={e => setNewBank({...newBank, ifscCode: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] font-mono" placeholder="IFSC Code" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Currency</label>
                                    <input required type="text" value={newBank.currency} onChange={e => setNewBank({...newBank, currency: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="USD" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Initial Balance</label>
                                    <input required type="number" step="0.01" value={newBank.initialBalance} onChange={e => setNewBank({...newBank, initialBalance: parseFloat(e.target.value) || 0})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="0.00" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowBankModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Bank Account'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCountryManagerModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[#121212] rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserPlus size={20} className="text-[#C8E600]" /> Quick Add Country Manager</h3>
                            <button onClick={() => setShowCountryManagerModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateCountryManager} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Full Name</label>
                                    <input required type="text" value={newCountryManager.fullName} onChange={e => setNewCountryManager({...newCountryManager, fullName: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="John Doe" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Country</label>
                                    <select 
                                        required 
                                        value={newCountryManager.country} 
                                        onChange={e => setNewCountryManager({...newCountryManager, country: e.target.value})} 
                                        className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] appearance-none"
                                    >
                                        <option value="" className="bg-[#1A1A1A]">Select Country</option>
                                        {countries.map(c => (
                                            <option key={c} value={c} className="bg-[#1A1A1A]">{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Email</label>
                                    <input required type="email" value={newCountryManager.email} onChange={e => setNewCountryManager({...newCountryManager, email: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-white/60">Phone</label>
                                    <PhoneInput
                                        country={countryToIso2[newCountryManager.country] || "in"}
                                        value={newCountryManager.phone}
                                        onChange={(phone) => setNewCountryManager({...newCountryManager, phone})}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "#1A1A1A",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            color: "white",
                                            borderRadius: "0.5rem",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "#1A1A1A",
                                            border: "1px solid rgba(255,255,255,0.1)"
                                        }}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-white/60">Temporary Password</label>
                                    <input required type="password" value={newCountryManager.password} onChange={e => setNewCountryManager({...newCountryManager, password: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowCountryManagerModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Country Manager'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showAccountingCodeModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[#121212] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={20} className="text-[#C8E600]" /> Quick Add Accounting Code</h3>
                            <button onClick={() => setShowAccountingCodeModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateAccountingCode} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Code Number</label>
                                <input required type="text" value={newAccountingCode.code} onChange={e => setNewAccountingCode({...newAccountingCode, code: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] font-mono" placeholder="4000" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Account Name</label>
                                <input required type="text" value={newAccountingCode.name} onChange={e => setNewAccountingCode({...newAccountingCode, name: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="Sales Revenue" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Category</label>
                                <select 
                                    required 
                                    value={newAccountingCode.category} 
                                    onChange={e => setNewAccountingCode({...newAccountingCode, category: e.target.value as any})} 
                                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] appearance-none"
                                >
                                    <option value="INCOME" className="bg-[#1A1A1A]">Income</option>
                                    <option value="EXPENSE" className="bg-[#1A1A1A]">Expense</option>
                                    <option value="ASSET" className="bg-[#1A1A1A]">Asset</option>
                                    <option value="LIABILITY" className="bg-[#1A1A1A]">Liability</option>
                                    <option value="EQUITY" className="bg-[#1A1A1A]">Equity</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowAccountingCodeModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Code'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {showTaxModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[#121212] rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={20} className="text-[#C8E600]" /> Quick Add Tax</h3>
                            <button onClick={() => setShowTaxModal(false)} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateTax} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Tax Name</label>
                                <input required type="text" value={newTax.name} onChange={e => setNewTax({...newTax, name: e.target.value})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600]" placeholder="e.g. VAT" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-white/60">Tax Rate (%)</label>
                                <input required type="number" step="0.01" min="0" max="100" value={newTax.rate} onChange={e => setNewTax({...newTax, rate: Number(e.target.value)})} className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#C8E600] font-mono" placeholder="10" />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-white/5">
                                <button type="button" onClick={() => setShowTaxModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Tax'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateJournalEntry;
