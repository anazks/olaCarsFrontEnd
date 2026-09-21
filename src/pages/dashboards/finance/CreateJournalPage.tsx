import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Trash2, Save, X, AlertCircle, Calculator, Building2, UserPlus, 
    Search, ChevronDown, Check, User, Layers, CheckCircle2, ShieldAlert, 
    Building, FileText, RefreshCw 
} from 'lucide-react';
import { getAllAccountingCodes, createAccountingCode } from '../../../services/accountingService';
import { createManualJournal } from '../../../services/ledgerService';
import { getAllBranches, createBranch } from '../../../services/branchService';
import { getAllTaxes, createTax } from '../../../services/taxService';
import { getAllCustomers, createCustomer } from '../../../services/customerService';
import { getAllCountryManagers, createCountryManager } from '../../../services/countryManagerService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getInvoicesByCustomer } from '../../../services/invoiceService';
import { getAllBills } from '../../../services/billService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

import type { AccountingCode } from '../../../services/accountingService';
import type { CountryManager } from '../../../services/countryManagerService';
import type { Customer } from '../../../services/customerService';

// Custom Dropdown Hook to handle click outside
function useClickOutside(ref: React.RefObject<any>, handler: () => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

// ----------------------------------------------------------------------
// CUSTOM SEARCHABLE SELECTORS
// ----------------------------------------------------------------------

// 1. Branch Selector
const BranchSelector = ({
    branches,
    selectedId,
    onSelect,
    onAddNew
}: {
    branches: any[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const selectedBranch = branches.find(b => b._id === selectedId);
    const filtered = branches.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        (b.country && b.country.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative w-full" ref={ref}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] cursor-pointer hover:brightness-110 transition-all text-sm text-[var(--text-main)]"
            >
                <span className="truncate">
                    {selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : 'Select Branch'}
                </span>
                <ChevronDown size={16} className={`opacity-40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex items-center gap-2">
                        <Search size={14} className="text-dim" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search branch..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-full"
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? (
                            filtered.map(b => (
                                <div
                                    key={b._id}
                                    onClick={() => {
                                        onSelect(b._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2.5 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/10 last:border-0 flex justify-between items-center ${selectedId === b._id ? 'bg-white/[0.03]' : ''}`}
                                >
                                    <div>
                                        <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-black">{b.name}</p>
                                        <span className="text-[10px] text-dim group-hover:text-black/70">{b.code} - {b.country}</span>
                                    </div>
                                    {selectedId === b._id && <Check size={14} className="text-[#C8E600] group-hover:text-black" />}
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-xs text-dim italic">No branches found</p>
                        )}
                    </div>
                    <div
                        onClick={() => {
                            setIsOpen(false);
                            onAddNew();
                        }}
                        className="px-4 py-3 bg-white/[0.02] border-t border-[var(--border-main)] hover:bg-[#C8E600] group cursor-pointer transition-colors text-[#C8E600] hover:text-black text-xs font-bold flex items-center gap-2"
                    >
                        <Plus size={14} /> Add New Branch
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. Grouped Account Selector
const AccountSelector = ({
    codes,
    selectedId,
    onSelect,
    onAddNew
}: {
    codes: AccountingCode[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const selectedCode = codes.find(c => c._id === selectedId);
    const filtered = codes.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
    );

    // Normalize category mapping to fit 5 core categories
    const normalizeCategory = (category: string): string => {
        if (!category) return 'OTHER';
        const cat = category.toUpperCase().trim();
        if (
            cat === 'ASSET' ||
            cat === 'CASH' ||
            cat === 'BANK' ||
            cat === 'FIXED ASSET' ||
            cat === 'OTHER CURRENT ASSET' ||
            cat === 'OTHER ASSET' ||
            cat === 'ACCOUNTS RECEIVABLE' ||
            cat === 'STOCK'
        ) return 'ASSET';
        if (
            cat === 'LIABILITY' ||
            cat === 'ACCOUNTS PAYABLE' ||
            cat === 'OTHER CURRENT LIABILITY' ||
            cat === 'NON CURRENT LIABILITY' ||
            cat === 'OTHER LIABILITY' ||
            cat === 'NON CURRENT LIAB' ||
            cat === 'OUTPUT TAX' ||
            cat === 'INPUT TAX'
        ) return 'LIABILITY';
        if (cat === 'EQUITY') return 'EQUITY';
        if (cat === 'INCOME' || cat === 'OTHER INCOME' || cat === 'NCOME') return 'INCOME';
        if (cat === 'EXPENSE' || cat === 'OTHER EXPENSE' || cat === 'COST OF GOODS SOLD') return 'EXPENSE';
        return 'OTHER';
    };

    // Group filtered codes by category
    const categories = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE', 'OTHER'];
    const grouped = categories.reduce((acc, cat) => {
        const list = filtered.filter(c => normalizeCategory(c.category) === cat);
        if (list.length > 0) acc[cat] = list;
        return acc;
    }, {} as Record<string, AccountingCode[]>);

    const categoryStyles: Record<string, string> = {
        ASSET: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/5 dark:border-emerald-500/10',
        LIABILITY: 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/5 dark:border-amber-500/10',
        EQUITY: 'text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-500/5 dark:border-violet-500/10',
        INCOME: 'text-cyan-600 bg-cyan-50 border-cyan-200 dark:text-cyan-400 dark:bg-cyan-500/5 dark:border-cyan-500/10',
        EXPENSE: 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/5 dark:border-rose-500/10',
        OTHER: 'text-gray-500 bg-gray-50 border-gray-200 dark:text-dim dark:bg-white/[0.03] dark:border-white/5'
    };

    return (
        <div className={`relative w-full ${isOpen ? 'z-50' : ''}`} ref={ref}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] cursor-pointer hover:brightness-110 transition-all text-xs text-[var(--text-main)]"
            >
                <span className="truncate font-semibold">
                    {selectedCode ? `${selectedCode.code} - ${selectedCode.name}` : 'Select Account'}
                </span>
                <ChevronDown size={14} className={`opacity-40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-[320px] mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex items-center gap-2">
                        <Search size={14} className="text-dim" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search account code or name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-full"
                        />
                    </div>
                    
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        <div
                            onClick={() => {
                                setIsOpen(false);
                                onAddNew();
                            }}
                            className="px-4 py-2.5 bg-white/[0.02] border-b border-[var(--border-main)]/20 hover:bg-[#C8E600] group cursor-pointer transition-colors text-[#C8E600] hover:text-black text-xs font-bold flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Add New Account
                        </div>

                        {categories.map(cat => {
                            const list = grouped[cat];
                            if (!list) return null;
                            const catStyle = categoryStyles[cat] || categoryStyles.OTHER;
                            return (
                                <div key={cat} className="space-y-1">
                                    <div className={`px-4 py-1.5 text-[9px] font-black tracking-widest uppercase border-y ${catStyle}`}>
                                        {cat}s
                                    </div>
                                    {list.map(code => (
                                        <div
                                            key={code._id}
                                            onClick={() => {
                                                onSelect(code._id);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                            className={`pl-8 pr-4 py-2 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/5 last:border-0 flex justify-between items-center ${selectedId === code._id ? 'bg-white/[0.03]' : ''}`}
                                        >
                                            <div className="truncate pr-2">
                                                <p className="text-[11px] font-bold text-[var(--text-main)] group-hover:text-black">
                                                    {code.code} - {code.name}
                                                </p>
                                            </div>
                                            {selectedId === code._id && <Check size={12} className="text-[#C8E600] group-hover:text-black flex-shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {Object.keys(grouped).length === 0 && (
                            <p className="p-4 text-center text-xs text-dim italic">No accounts found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Customer (Driver) Party Selector
const CustomerPartySelector = ({
    customers,
    selectedId,
    onSelect,
    onAddNew
}: {
    customers: Customer[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const selectedCustomer = customers.find(c => c._id === selectedId);
    const filtered = customers.filter(c => {
        const q = search.toLowerCase();
        return (
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.customerId?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            (c.driver?.driverId && c.driver.driverId.toLowerCase().includes(q))
        );
    });

    return (
        <div className="relative w-full" ref={ref}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] cursor-pointer hover:brightness-110 transition-all text-xs text-[var(--text-main)]"
            >
                <div className="flex items-center gap-2 truncate">
                    <User size={14} className="text-[#C8E600] shrink-0" />
                    <span className="truncate font-semibold">
                        {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerId || selectedCustomer.driver?.driverId || 'Customer'})` : 'Select Customer / Driver...'}
                    </span>
                </div>
                <ChevronDown size={14} className={`opacity-40 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex items-center gap-2">
                        <Search size={14} className="text-dim" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search by customer name, ID, driver ID, phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-full"
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        <div
                            onClick={() => {
                                setIsOpen(false);
                                onAddNew();
                            }}
                            className="px-4 py-2.5 bg-white/[0.02] border-b border-[var(--border-main)]/20 hover:bg-[#C8E600] group cursor-pointer transition-colors text-[#C8E600] hover:text-black text-xs font-bold flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Add New Customer
                        </div>
                        {filtered.length > 0 ? (
                            filtered.map(c => (
                                <div
                                    key={c._id}
                                    onClick={() => {
                                        onSelect(c._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2.5 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/10 last:border-0 flex justify-between items-center ${selectedId === c._id ? 'bg-white/[0.03]' : ''}`}
                                >
                                    <div className="truncate pr-2">
                                        <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-black">{c.name}</p>
                                        <span className="text-[10px] text-dim group-hover:text-black/70 truncate block">
                                            ID: {c.customerId || 'N/A'}{c.driver?.driverId ? ` • Driver: ${c.driver.driverId}` : ''}{c.phone ? ` • ${c.phone}` : ''}
                                        </span>
                                    </div>
                                    {selectedId === c._id && <Check size={14} className="text-[#C8E600] group-hover:text-black flex-shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-xs text-dim italic">No customers found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Supplier / Vendor Selector
const SupplierPartySelector = ({
    suppliers,
    selectedId,
    onSelect
}: {
    suppliers: Supplier[];
    selectedId: string;
    onSelect: (id: string) => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const selectedSupplier = suppliers.find(s => s._id === selectedId);
    const filtered = suppliers.filter(s => {
        const q = search.toLowerCase();
        return (
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.companyName && s.companyName.toLowerCase().includes(q)) ||
            (s.phone && s.phone.toLowerCase().includes(q)) ||
            ((s as any).category && (s as any).category.toLowerCase().includes(q))
        );
    });

    return (
        <div className="relative w-full" ref={ref}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] cursor-pointer hover:brightness-110 transition-all text-xs text-[var(--text-main)]"
            >
                <div className="flex items-center gap-2 truncate">
                    <Building size={14} className="text-[#C8E600] shrink-0" />
                    <span className="truncate font-semibold">
                        {selectedSupplier ? `${selectedSupplier.name || selectedSupplier.companyName}` : 'Select Vendor / Supplier...'}
                    </span>
                </div>
                <ChevronDown size={14} className={`opacity-40 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex items-center gap-2">
                        <Search size={14} className="text-dim" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search by vendor name, company, phone..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-transparent border-none text-xs text-[var(--text-main)] focus:ring-0 outline-none w-full"
                        />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                        {filtered.length > 0 ? (
                            filtered.map(s => (
                                <div
                                    key={s._id}
                                    onClick={() => {
                                        onSelect(s._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2.5 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/10 last:border-0 flex justify-between items-center ${selectedId === s._id ? 'bg-white/[0.03]' : ''}`}
                                >
                                    <div className="truncate pr-2">
                                        <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-black">{s.name || s.companyName}</p>
                                        <span className="text-[10px] text-dim group-hover:text-black/70 truncate block">
                                            {s.companyName ? `${s.companyName} • ` : ''}{s.phone || 'No phone'}
                                        </span>
                                    </div>
                                    {selectedId === s._id && <Check size={14} className="text-[#C8E600] group-hover:text-black flex-shrink-0" />}
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-xs text-dim italic">No vendors found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Open Document interface for auto set-off simulation
interface OpenDoc {
    id: string;
    docNumber: string;
    date: string;
    dueDate?: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    status: string;
    isOverdue: boolean;
}

// 5. Tax Selector
const TaxSelector = ({
    taxes,
    selectedId,
    onSelect,
    onAddNew
}: {
    taxes: any[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    const selectedTax = taxes.find(t => t._id === selectedId);

    return (
        <div className={`relative w-full ${isOpen ? 'z-50' : ''}`} ref={ref}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] cursor-pointer hover:brightness-110 transition-all text-xs text-[var(--text-main)]"
            >
                <span className="truncate">
                    {selectedTax ? `${selectedTax.name} (${selectedTax.rate}%)` : 'Select Tax'}
                </span>
                <ChevronDown size={14} className={`opacity-40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-[220px] mt-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                        <div
                            onClick={() => {
                                setIsOpen(false);
                                onAddNew();
                            }}
                            className="px-4 py-2.5 bg-white/[0.02] border-b border-[var(--border-main)]/20 hover:bg-[#C8E600] group cursor-pointer transition-colors text-[#C8E600] hover:text-black text-xs font-bold flex items-center gap-1.5"
                        >
                            <Plus size={14} /> Add New Tax
                        </div>
                        <div
                            onClick={() => {
                                onSelect('');
                                setIsOpen(false);
                            }}
                            className={`px-4 py-2 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/10 last:border-0 flex justify-between items-center ${!selectedId ? 'bg-white/[0.03]' : ''}`}
                        >
                            <span className="text-xs text-[var(--text-main)] group-hover:text-black">No Tax</span>
                            {!selectedId && <Check size={12} className="text-[#C8E600] group-hover:text-black" />}
                        </div>
                        {taxes.map(t => (
                            <div
                                key={t._id}
                                onClick={() => {
                                    onSelect(t._id);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b border-[var(--border-main)]/10 last:border-0 flex justify-between items-center ${selectedId === t._id ? 'bg-white/[0.03]' : ''}`}
                            >
                                <div className="truncate pr-2">
                                    <p className="text-xs font-bold text-[var(--text-main)] group-hover:text-black">{t.name}</p>
                                    <span className="text-[10px] text-dim group-hover:text-black/70">{t.rate}%</span>
                                </div>
                                {selectedId === t._id && <Check size={12} className="text-[#C8E600] group-hover:text-black flex-shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ----------------------------------------------------------------------
// MAIN CREATE JOURNAL PAGE COMPONENT
// ----------------------------------------------------------------------
const CreateJournalPage = () => {
    const navigate = useNavigate();

    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [countryManagers, setCountryManagers] = useState<CountryManager[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Entity Set-off Mode State
    const [entityType, setEntityType] = useState<'NONE' | 'CUSTOMER' | 'SUPPLIER'>('NONE');
    const [selectedPartyId, setSelectedPartyId] = useState<string>('');
    const [autoSetOff, setAutoSetOff] = useState<boolean>(true);
    const [openDocs, setOpenDocs] = useState<OpenDoc[]>([]);
    const [loadingDocs, setLoadingDocs] = useState<boolean>(false);

    // Modal view triggers
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showCountryManagerModal, setShowCountryManagerModal] = useState(false);
    const [showAccountingCodeModal, setShowAccountingCodeModal] = useState(false);
    const [showTaxModal, setShowTaxModal] = useState(false);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // Context mappings for inline creations
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

    // Form inputs
    const [newBranch, setNewBranch] = useState({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '', country: '', countryManager: '', status: 'ACTIVE' });
    const [newCountryManager, setNewCountryManager] = useState({ fullName: '', email: '', password: '', phone: '', country: '' });
    const [newAccountingCode, setNewAccountingCode] = useState<{ code: string, name: string, category: any }>({ code: '', name: '', category: 'EXPENSE' });
    const [newTax, setNewTax] = useState({ name: '', rate: 0 });
    const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', country: '', status: 'ACTIVE' as const });

    const [header, setHeader] = useState({
        description: '',
        date: new Date().toISOString().split('T')[0],
        branch: ''
    });

    const [lines, setLines] = useState<any[]>([
        { accountingCode: '', type: 'DEBIT', amount: '', description: '', taxInfo: { taxApplied: '' } },
        { accountingCode: '', type: 'CREDIT', amount: '', description: '', taxInfo: { taxApplied: '' } }
    ]);

    // Initial resources load
    const fetchData = useCallback(async () => {
        try {
            const [codesRes, branchesRes, taxesRes, managersRes, customersRes, suppliersRes] = await Promise.allSettled([
                getAllAccountingCodes({ limit: 1000 }),
                getAllBranches(),
                getAllTaxes(),
                getAllCountryManagers(),
                getAllCustomers(),
                getAllSuppliers({ limit: 1000 })
            ]);

            if (codesRes.status === 'fulfilled') {
                const codesData = codesRes.value as any;
                setAccountingCodes(Array.isArray(codesData) ? codesData : (codesData.data || []));
            }
            if (branchesRes.status === 'fulfilled') {
                const branchList = branchesRes.value.data || [];
                setBranches(branchList);
                if (branchList.length > 0 && !header.branch) {
                    setHeader(prev => ({ ...prev, branch: branchList[0]._id }));
                }
            }
            if (taxesRes.status === 'fulfilled') setTaxes(taxesRes.value);
            if (managersRes.status === 'fulfilled') setCountryManagers(managersRes.value.data || []);
            if (customersRes.status === 'fulfilled') setCustomers(customersRes.value.data || []);
            if (suppliersRes.status === 'fulfilled') {
                const sData = suppliersRes.value as any;
                setSuppliers(Array.isArray(sData) ? sData : (sData.data || []));
            }

            if (codesRes.status === 'rejected' || branchesRes.status === 'rejected') {
                setError('Failed to load critical initial data.');
            }
        } catch (err: any) {
            setError('Failed to load initial data');
        } finally {
            setLoading(false);
        }
    }, [header.branch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch open invoices or bills when party or entity mode changes
    useEffect(() => {
        if (entityType === 'NONE' || !selectedPartyId) {
            setOpenDocs([]);
            return;
        }

        let isMounted = true;
        setLoadingDocs(true);

        const loadOpenDocs = async () => {
            try {
                if (entityType === 'CUSTOMER') {
                    const invoices = await getInvoicesByCustomer(selectedPartyId);
                    if (!isMounted) return;
                    const now = new Date();
                    const openList: OpenDoc[] = (invoices || [])
                        .filter(inv => {
                            const tot = Number(inv.totalAmountDue ?? (inv as any).totalAmount ?? inv.baseAmount ?? 0);
                            const paid = Number(inv.amountPaid || 0);
                            const bal = Number(inv.balance ?? (inv as any).balanceDue ?? (tot - paid));
                            return bal > 0.01 && (inv.status as string) !== 'PAID' && (inv.status as string) !== 'CANCELLED' && (inv.status as string) !== 'VOID';
                        })
                        .sort((a, b) => {
                            const priority = (s: string) => s === 'OVERDUE' ? 1 : s === 'PARTIAL' ? 2 : 3;
                            if (priority(a.status) !== priority(b.status)) return priority(a.status) - priority(b.status);
                            return new Date(a.dueDate || a.generatedAt || a.createdAt || 0).getTime() - new Date(b.dueDate || b.generatedAt || b.createdAt || 0).getTime();
                        })
                        .map(inv => {
                            const tot = Number(inv.totalAmountDue ?? (inv as any).totalAmount ?? inv.baseAmount ?? 0);
                            const paid = Number(inv.amountPaid || 0);
                            const bal = Number(inv.balance ?? (inv as any).balanceDue ?? (tot - paid));
                            const due = inv.dueDate ? new Date(inv.dueDate) : null;
                            return {
                                id: inv._id,
                                docNumber: inv.invoiceNumber || 'INV',
                                date: inv.invoiceDate || inv.generatedAt || inv.createdAt || '',
                                dueDate: inv.dueDate,
                                totalAmount: tot,
                                amountPaid: paid,
                                balanceDue: bal,
                                status: inv.status,
                                isOverdue: due ? due < now && inv.status !== 'PAID' : false
                            };
                        });
                    setOpenDocs(openList);
                } else if (entityType === 'SUPPLIER') {
                    const res = await getAllBills({ supplier: selectedPartyId, limit: 1000 });
                    if (!isMounted) return;
                    const bills = res.data || [];
                    const now = new Date();
                    const openList: OpenDoc[] = bills
                        .filter(bill => {
                            const tot = Number(bill.totalAmount ?? (bill as any).totalAmountDue ?? 0);
                            const paid = Number(bill.amountPaid || 0);
                            const bal = Number(bill.balanceDue ?? (bill as any).balance ?? (tot - paid));
                            return bal > 0.01 && (bill.status as string) !== 'PAID' && (bill.status as string) !== 'VOID' && (bill.status as string) !== 'CANCELLED';
                        })
                        .sort((a, b) => {
                            return new Date(a.dueDate || a.createdAt).getTime() - new Date(b.dueDate || b.createdAt).getTime();
                        })
                        .map(bill => {
                            const tot = Number(bill.totalAmount ?? (bill as any).totalAmountDue ?? 0);
                            const paid = Number(bill.amountPaid || 0);
                            const bal = Number(bill.balanceDue ?? (bill as any).balance ?? (tot - paid));
                            const due = bill.dueDate ? new Date(bill.dueDate) : null;
                            return {
                                id: bill._id,
                                docNumber: bill.billNumber || 'BILL',
                                date: bill.billDate || bill.createdAt,
                                dueDate: bill.dueDate,
                                totalAmount: tot,
                                amountPaid: paid,
                                balanceDue: bal,
                                status: bill.status,
                                isOverdue: due ? due < now && bill.status !== 'PAID' : false
                            };
                        });
                    setOpenDocs(openList);
                } else {
                    setOpenDocs([]);
                }
            } catch (err) {
                console.error('Failed to fetch open documents for party', err);
                setOpenDocs([]);
            } finally {
                if (isMounted) setLoadingDocs(false);
            }
        };

        loadOpenDocs();

        return () => {
            isMounted = false;
        };
    }, [entityType, selectedPartyId]);

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBranch.phone || newBranch.phone.length < 5) {
            setQuickCreateError("Please enter a valid phone number");
            return;
        }

        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createBranch(newBranch);
            const branchList = await getAllBranches();
            setBranches(branchList.data || []);
            setHeader(prev => ({ ...prev, branch: res.data._id }));
            setShowBranchModal(false);
            setNewBranch({ name: '', code: '', address: '', city: '', state: '', phone: '', email: '', country: '', countryManager: '', status: 'ACTIVE' });
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create branch');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateCountryManager = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            await createCountryManager(newCountryManager);
            const managersRes = await getAllCountryManagers();
            setCountryManagers(managersRes.data || []);
            setShowCountryManagerModal(false);
            setNewCountryManager({ fullName: '', email: '', password: '', phone: '', country: '' });
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create manager');
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
            const codesData = await getAllAccountingCodes({ limit: 1000 });
            setAccountingCodes(Array.isArray(codesData) ? codesData : (codesData.data || []));

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
            const taxesData = await getAllTaxes();
            setTaxes(taxesData);

            if (targetLineIndex !== null) {
                updateLine(targetLineIndex, 'taxInfo', { taxApplied: res._id });
            }
            setShowTaxModal(false);
            setNewTax({ name: '', rate: 0 });
            setTargetLineIndex(null);
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create tax');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleCreateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.branch) {
            setQuickCreateError("Please select a branch in the form header first.");
            return;
        }

        setQuickCreateLoading(true);
        setQuickCreateError(null);
        try {
            const res = await createCustomer({
                ...newCustomer,
                branch: header.branch
            });
            const customersData = await getAllCustomers();
            setCustomers(customersData.data || []);

            setSelectedPartyId(res._id);
            setShowCustomerModal(false);
            setNewCustomer({ name: '', email: '', phone: '', address: '', city: '', state: '', country: '', status: 'ACTIVE' });
            setTargetLineIndex(null);
        } catch (err: any) {
            setQuickCreateError(err.response?.data?.message || err.message || 'Failed to create customer');
        } finally {
            setQuickCreateLoading(false);
        }
    };

    const handleAddLine = () => {
        setLines([...lines, { accountingCode: '', type: 'DEBIT', amount: '', description: '', taxInfo: { taxApplied: '' } }]);
    };

    const handleRemoveLine = (index: number) => {
        if (lines.length <= 2) return;
        setLines(lines.filter((_, i) => i !== index));
    };

    const updateLine = (index: number, field: string, value: any) => {
        const newLines = [...lines];
        if (field === 'taxInfo') {
            newLines[index].taxInfo = { ...newLines[index].taxInfo, ...value };
        } else {
            newLines[index][field] = value;
        }
        setLines(newLines);
    };

    const handleDebitChange = (index: number, valStr: string) => {
        let clean = valStr.replace(/[^0-9.]/g, '');
        const parts = clean.split('.');
        if (parts.length > 2) {
            clean = `${parts[0]}.${parts.slice(1).join('')}`;
        }
        const newLines = [...lines];
        newLines[index].type = 'DEBIT';
        newLines[index].amount = clean;
        setLines(newLines);
    };

    const handleCreditChange = (index: number, valStr: string) => {
        let clean = valStr.replace(/[^0-9.]/g, '');
        const parts = clean.split('.');
        if (parts.length > 2) {
            clean = `${parts[0]}.${parts.slice(1).join('')}`;
        }
        const newLines = [...lines];
        newLines[index].type = 'CREDIT';
        newLines[index].amount = clean;
        setLines(newLines);
    };

    const totals = lines.reduce((acc, line) => {
        if (line.type === 'DEBIT') acc.debit += Number(line.amount || 0);
        else acc.credit += Number(line.amount || 0);
        return acc;
    }, { debit: 0, credit: 0 });

    // Live Set-off Simulation
    const simulatedSetOff = useMemo(() => {
        const effectiveAmount = totals.debit;
        let remaining = effectiveAmount;
        let totalSettled = 0;

        const items = openDocs.map(doc => {
            const applied = Math.min(doc.balanceDue, Math.max(0, remaining));
            remaining -= applied;
            totalSettled += applied;
            return {
                ...doc,
                applied,
                projectedBalance: Math.max(0, doc.balanceDue - applied),
                projectedStatus: (doc.balanceDue - applied) <= 0.01 ? 'PAID' : (applied > 0 ? 'PARTIAL' : doc.status)
            };
        });

        const totalOutstanding = openDocs.reduce((sum, d) => sum + d.balanceDue, 0);
        const excessAdvance = Math.max(0, effectiveAmount - totalSettled);

        return {
            items,
            totalOutstanding,
            totalSettled,
            excessAdvance
        };
    }, [openDocs, totals.debit]);

    // Live Cross-Category Accounting Code Validation
    const categoryViolation = useMemo(() => {
        if (entityType === 'CUSTOMER') {
            for (let i = 0; i < lines.length; i++) {
                const code = accountingCodes.find(c => c._id === lines[i].accountingCode);
                if (code) {
                    const cat = String(code.category || '').toUpperCase();
                    if (cat === 'ACCOUNTS PAYABLE' || (cat.includes('PAYABLE') && !cat.includes('TAX'))) {
                        return {
                            lineIndex: i,
                            accountName: code.name,
                            message: `Line #${i + 1} uses "${code.name}" (Accounts Payable). Accounts Payable accounts cannot be used when Customer is selected. For customer set-off, use Accounts Receivable or standard income/asset/bank accounts.`
                        };
                    }
                }
            }
        } else if (entityType === 'SUPPLIER') {
            for (let i = 0; i < lines.length; i++) {
                const code = accountingCodes.find(c => c._id === lines[i].accountingCode);
                if (code) {
                    const cat = String(code.category || '').toUpperCase();
                    if (cat === 'ACCOUNTS RECEIVABLE' || cat.includes('RECEIVABLE')) {
                        return {
                            lineIndex: i,
                            accountName: code.name,
                            message: `Line #${i + 1} uses "${code.name}" (Accounts Receivable). Accounts Receivable accounts cannot be used when Vendor is selected. For vendor set-off, use Accounts Payable or standard expense/asset/bank accounts.`
                        };
                    }
                }
            }
        }
        return null;
    }, [entityType, lines, accountingCodes]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.branch) {
            setError('Please select a branch');
            return;
        }

        if (entityType !== 'NONE' && !selectedPartyId) {
            setError(`Please select a ${entityType === 'CUSTOMER' ? 'Customer / Driver' : 'Vendor / Supplier'} or switch mode to General Journal.`);
            return;
        }

        if (categoryViolation) {
            setError(categoryViolation.message);
            return;
        }

        if (lines.some(line => !line.accountingCode)) {
            setError('Please select an accounting code for all transaction lines');
            return;
        }

        const debits = lines.filter(l => l.type === 'DEBIT');
        const credits = lines.filter(l => l.type === 'CREDIT');

        if (debits.length === 0 || credits.length === 0) {
            setError('A valid double-entry journal must contain at least one DEBIT line and one CREDIT line.');
            return;
        }

        const diff = Math.abs(totals.debit - totals.credit);
        if (diff > 0.01) {
            setError(`The journal is out of balance. Total Debits must equal Total Credits. Difference: $${diff.toFixed(2)}.`);
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const sanitizedLines = lines.map(line => {
                const cleaned: any = {
                    accountingCode: line.accountingCode,
                    type: line.type,
                    amount: Number(line.amount || 0),
                    description: line.description || ''
                };
                if (line.taxInfo && line.taxInfo.taxApplied && line.taxInfo.taxApplied !== '') {
                    cleaned.taxInfo = {
                        taxApplied: line.taxInfo.taxApplied
                    };
                }
                return cleaned;
            });
            await createManualJournal({
                ...header,
                contact: entityType !== 'NONE' ? selectedPartyId : undefined,
                contactModel: entityType === 'CUSTOMER' ? 'Customer' : entityType === 'SUPPLIER' ? 'Supplier' : undefined,
                autoSetOff: entityType !== 'NONE' ? autoSetOff : false,
                lines: sanitizedLines
            });
            // Go back to the manual journals list page
            navigate('../manual-journals');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create journal entry');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-20 min-h-[500px]">
            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="container-responsive space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Financial Admin', path: '../' },
                    { label: 'Manual Journals', path: '../manual-journals' },
                    { label: 'Create Entry', path: '#', active: true }
                ]}
            />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Calculator size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        New Manual Journal Entry
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        Post manual adjustments, tax allocations, payroll accruals, and ledger corrections.
                    </p>
                </div>
                <button
                    onClick={() => navigate('../manual-journals')}
                    className="p-2.5 rounded-xl border hover:bg-white/5 transition-all text-xs font-bold flex items-center gap-2"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                >
                    <X size={14} /> Cancel
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Journal Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-3xl border bg-white/[0.01]" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Narration / Description</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g. FY2026 Tax Accrual Adjustments"
                            value={header.description}
                            onChange={e => setHeader({ ...header, description: e.target.value })}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[#C8E600] outline-none transition-all"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Branch</label>
                        <BranchSelector
                            branches={branches}
                            selectedId={header.branch}
                            onSelect={id => setHeader({ ...header, branch: id })}
                            onAddNew={() => setShowBranchModal(true)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Date</label>
                        <input
                            required
                            type="date"
                            value={header.date}
                            onChange={e => setHeader({ ...header, date: e.target.value })}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] focus:border-[#C8E600] outline-none transition-all"
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>
                </div>

                {/* Entity Link & Auto Set-Off Configuration */}
                <div className="p-6 rounded-3xl border bg-white/[0.01] space-y-5" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Layers size={18} className="text-[#C8E600]" />
                                <h3 className="text-sm font-bold text-[var(--text-main)]">Auto Set-Off & Party Link</h3>
                            </div>
                            <p className="text-xs text-dim mt-0.5">
                                Link this manual journal to a Driver or Vendor to automatically set off pending invoices or bills.
                            </p>
                        </div>

                        {/* Mode Selector */}
                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] self-stretch sm:self-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setEntityType('NONE');
                                    setSelectedPartyId('');
                                }}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    entityType === 'NONE' 
                                        ? 'bg-[#C8E600] text-black shadow-md' 
                                        : 'text-dim hover:text-[var(--text-main)]'
                                }`}
                            >
                                None (General)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEntityType('CUSTOMER');
                                    setSelectedPartyId('');
                                }}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    entityType === 'CUSTOMER' 
                                        ? 'bg-[#C8E600] text-black shadow-md' 
                                        : 'text-dim hover:text-[var(--text-main)]'
                                }`}
                            >
                                Customer (Driver)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEntityType('SUPPLIER');
                                    setSelectedPartyId('');
                                }}
                                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    entityType === 'SUPPLIER' 
                                        ? 'bg-[#C8E600] text-black shadow-md' 
                                        : 'text-dim hover:text-[var(--text-main)]'
                                }`}
                            >
                                Vendor (Supplier)
                            </button>
                        </div>
                    </div>

                    {/* Customer Selection View */}
                    {entityType === 'CUSTOMER' && (
                        <div className="pt-4 border-t border-[var(--border-main)]/40 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                        Select Customer / Driver for Invoices Set-off
                                    </label>
                                    <CustomerPartySelector
                                        customers={customers}
                                        selectedId={selectedPartyId}
                                        onSelect={id => setSelectedPartyId(id)}
                                        onAddNew={() => setShowCustomerModal(true)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pb-3">
                                    <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoSetOff}
                                            onChange={e => setAutoSetOff(e.target.checked)}
                                            className="w-4 h-4 rounded border-[var(--border-main)] text-[#C8E600] focus:ring-0 bg-[var(--bg-input)]"
                                        />
                                        <span className="text-xs font-bold text-[var(--text-main)]">
                                            Auto Set-off Open Invoices (FIFO / Overdue Priority)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Open Invoices Table / Live Simulation */}
                            {selectedPartyId && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                                            <FileText size={15} className="text-[#C8E600]" />
                                            Available Open Invoices
                                        </span>
                                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 font-mono text-dim">
                                            {loadingDocs ? 'Loading...' : `${openDocs.length} unpaid`}
                                        </span>
                                    </div>

                                    {loadingDocs ? (
                                        <div className="p-6 text-center text-xs text-dim flex items-center justify-center gap-2 border border-[var(--border-main)] rounded-2xl">
                                            <RefreshCw size={14} className="animate-spin text-[#C8E600]" /> Fetching driver invoices...
                                        </div>
                                    ) : openDocs.length === 0 ? (
                                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                                            <CheckCircle2 size={16} /> No outstanding invoices found for this driver.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* KPI Bar */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] text-xs">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Total Unpaid Debt</p>
                                                    <p className="text-sm font-bold font-mono text-rose-400">${simulatedSetOff.totalOutstanding.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Journal Amount</p>
                                                    <p className="text-sm font-bold font-mono text-[#C8E600]">${totals.debit.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">To Be Settled</p>
                                                    <p className="text-sm font-bold font-mono text-emerald-400">${simulatedSetOff.totalSettled.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Excess / Advance</p>
                                                    <p className="text-sm font-bold font-mono text-blue-400">${simulatedSetOff.excessAdvance.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            {/* Documents List */}
                                            <div className="rounded-2xl border border-[var(--border-main)] overflow-hidden">
                                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead className="border-b border-[var(--border-main)] bg-white/[0.02]">
                                                            <tr>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-dim">Doc #</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-dim">Due Date</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-dim">Total</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-dim">Balance Due</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-emerald-400">Applied Now</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-center text-dim">Projected Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y border-[var(--border-main)]">
                                                            {simulatedSetOff.items.map(doc => (
                                                                <tr key={doc.id} className={doc.applied > 0 ? 'bg-emerald-500/5' : ''}>
                                                                    <td className="px-3.5 py-2.5 font-bold font-mono text-[var(--text-main)] flex items-center gap-1.5">
                                                                        {doc.docNumber}
                                                                        {doc.isOverdue && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold uppercase">
                                                                                Overdue
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-dim">
                                                                        {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono text-dim">
                                                                        ${doc.totalAmount.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-400">
                                                                        ${doc.balanceDue.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-400">
                                                                        ${doc.applied.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-center">
                                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                                            doc.projectedStatus === 'PAID'
                                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                                : doc.projectedStatus === 'PARTIAL'
                                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                                : 'bg-rose-500/20 text-rose-400'
                                                                        }`}>
                                                                            {doc.projectedStatus}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Supplier Selection View */}
                    {entityType === 'SUPPLIER' && (
                        <div className="pt-4 border-t border-[var(--border-main)]/40 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                        Select Vendor / Supplier for Bills Set-off
                                    </label>
                                    <SupplierPartySelector
                                        suppliers={suppliers}
                                        selectedId={selectedPartyId}
                                        onSelect={id => setSelectedPartyId(id)}
                                    />
                                </div>
                                <div className="flex items-center gap-3 pb-3">
                                    <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoSetOff}
                                            onChange={e => setAutoSetOff(e.target.checked)}
                                            className="w-4 h-4 rounded border-[var(--border-main)] text-[#C8E600] focus:ring-0 bg-[var(--bg-input)]"
                                        />
                                        <span className="text-xs font-bold text-[var(--text-main)]">
                                            Auto Set-off Open Bills (FIFO / Overdue Priority)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Open Bills Table / Live Simulation */}
                            {selectedPartyId && (
                                <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-2">
                                            <FileText size={15} className="text-[#C8E600]" />
                                            Available Open Bills
                                        </span>
                                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 font-mono text-dim">
                                            {loadingDocs ? 'Loading...' : `${openDocs.length} unpaid`}
                                        </span>
                                    </div>

                                    {loadingDocs ? (
                                        <div className="p-6 text-center text-xs text-dim flex items-center justify-center gap-2 border border-[var(--border-main)] rounded-2xl">
                                            <RefreshCw size={14} className="animate-spin text-[#C8E600]" /> Fetching vendor bills...
                                        </div>
                                    ) : openDocs.length === 0 ? (
                                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                                            <CheckCircle2 size={16} /> No outstanding bills found for this vendor.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* KPI Bar */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] text-xs">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Total Unpaid Debt</p>
                                                    <p className="text-sm font-bold font-mono text-rose-400">${simulatedSetOff.totalOutstanding.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Journal Amount</p>
                                                    <p className="text-sm font-bold font-mono text-[#C8E600]">${totals.debit.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">To Be Settled</p>
                                                    <p className="text-sm font-bold font-mono text-emerald-400">${simulatedSetOff.totalSettled.toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-dim">Excess / Advance</p>
                                                    <p className="text-sm font-bold font-mono text-blue-400">${simulatedSetOff.excessAdvance.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            {/* Documents List */}
                                            <div className="rounded-2xl border border-[var(--border-main)] overflow-hidden">
                                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                                                    <table className="w-full text-left border-collapse text-xs">
                                                        <thead className="border-b border-[var(--border-main)] bg-white/[0.02]">
                                                            <tr>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-dim">Doc #</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-dim">Due Date</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-dim">Total</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-dim">Balance Due</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-right text-emerald-400">Applied Now</th>
                                                                <th className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-center text-dim">Projected Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y border-[var(--border-main)]">
                                                            {simulatedSetOff.items.map(doc => (
                                                                <tr key={doc.id} className={doc.applied > 0 ? 'bg-emerald-500/5' : ''}>
                                                                    <td className="px-3.5 py-2.5 font-bold font-mono text-[var(--text-main)] flex items-center gap-1.5">
                                                                        {doc.docNumber}
                                                                        {doc.isOverdue && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold uppercase">
                                                                                Overdue
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-dim">
                                                                        {doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono text-dim">
                                                                        ${doc.totalAmount.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-400">
                                                                        ${doc.balanceDue.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-400">
                                                                        ${doc.applied.toFixed(2)}
                                                                    </td>
                                                                    <td className="px-3.5 py-2.5 text-center">
                                                                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                                            doc.projectedStatus === 'PAID'
                                                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                                                : doc.projectedStatus === 'PARTIAL'
                                                                                ? 'bg-amber-500/20 text-amber-400'
                                                                                : 'bg-rose-500/20 text-rose-400'
                                                                        }`}>
                                                                            {doc.projectedStatus}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Real-time Category Violation Alert */}
                {categoryViolation && (
                    <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3 animate-in fade-in duration-200">
                        <ShieldAlert size={22} className="text-rose-400 shrink-0" />
                        <div>
                            <p className="font-bold text-sm text-rose-400">Accounting Code Category Restriction</p>
                            <p className="mt-0.5 text-rose-300/90 leading-relaxed">{categoryViolation.message}</p>
                        </div>
                    </div>
                )}

                {/* Double Entry Lines Table */}
                <div className="rounded-3xl border border-[var(--border-main)] bg-white/[0.01]">
                    <div className="min-h-[300px]">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="w-1/3 px-4 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Account</th>
                                    <th className="w-1/3 px-4 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Description (Memo)</th>
                                    <th className="w-48 px-4 py-4 text-[10px] font-black uppercase tracking-widest opacity-40">Tax</th>
                                    <th className="w-48 min-w-[180px] px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest opacity-40">Debits</th>
                                    <th className="w-48 min-w-[180px] px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest opacity-40">Credits</th>
                                    <th className="w-12 px-4 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {lines.map((line, index) => {
                                    const isViolatingRow = categoryViolation?.lineIndex === index;
                                    return (
                                        <tr 
                                            key={index} 
                                            className={`transition-all ${
                                                isViolatingRow 
                                                    ? 'bg-rose-500/10 border-l-4 border-rose-500' 
                                                    : 'hover:bg-white/[0.01]'
                                            }`}
                                        >
                                            <td className="p-3">
                                                <AccountSelector
                                                    codes={accountingCodes}
                                                    selectedId={line.accountingCode}
                                                    onSelect={id => updateLine(index, 'accountingCode', id)}
                                                    onAddNew={() => {
                                                        setTargetLineIndex(index);
                                                        setShowAccountingCodeModal(true);
                                                    }}
                                                />
                                            </td>
                                            
                                            <td className="p-3">
                                                <input
                                                    type="text"
                                                    placeholder="Enter memo..."
                                                    value={line.description}
                                                    onChange={e => updateLine(index, 'description', e.target.value)}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:border-[#C8E600] outline-none transition-all"
                                                />
                                            </td>

                                            <td className="p-3">
                                                <TaxSelector
                                                    taxes={taxes}
                                                    selectedId={line.taxInfo?.taxApplied}
                                                    onSelect={id => updateLine(index, 'taxInfo', { taxApplied: id })}
                                                    onAddNew={() => {
                                                        setTargetLineIndex(index);
                                                        setShowTaxModal(true);
                                                    }}
                                                />
                                            </td>

                                            <td className="p-3 w-48 min-w-[180px]">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    value={line.type === 'DEBIT' ? line.amount : ''}
                                                    onChange={e => handleDebitChange(index, e.target.value)}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-sm text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:border-[#C8E600] outline-none"
                                                />
                                            </td>

                                            <td className="p-3 w-48 min-w-[180px]">
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="0.00"
                                                    value={line.type === 'CREDIT' ? line.amount : ''}
                                                    onChange={e => handleCreditChange(index, e.target.value)}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-sm text-right font-mono text-rose-600 dark:text-rose-400 font-bold focus:border-[#C8E600] outline-none"
                                                />
                                            </td>

                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLine(index)}
                                                    className="p-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/20 text-rose-500/40 hover:text-rose-500 transition-all cursor-pointer"
                                                    disabled={lines.length <= 2}
                                                    title={lines.length <= 2 ? "A manual journal must have at least 2 lines" : "Remove line"}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddLine}
                        className="w-full py-4 bg-white/[0.01] hover:bg-white/[0.03] text-dim hover:text-[var(--text-main)] text-xs font-bold transition-all flex items-center justify-center gap-2 border-t cursor-pointer"
                        style={{ borderColor: 'var(--border-main)' }}
                    >
                        <Plus size={14} /> Add Another Line
                    </button>
                </div>

                {/* Double Entry Balancer Summary */}
                <div className="flex justify-end pt-2">
                    <div className="bg-[var(--bg-card)] border rounded-3xl p-6 min-w-[360px] space-y-4" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex justify-between text-xs text-dim">
                            <span className="font-bold uppercase tracking-wider">Sub Total</span>
                            <div className="flex gap-12 font-mono font-bold">
                                <span className="w-24 text-right">${totals.debit.toFixed(2)}</span>
                                <span className="w-24 text-right">${totals.credit.toFixed(2)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-[var(--text-main)] border-t border-[var(--border-main)]/50 pt-4">
                            <span className="uppercase tracking-wider">Total Amount</span>
                            <div className="flex gap-12 font-mono text-[#C8E600]">
                                <span className="w-24 text-right">${totals.debit.toFixed(2)}</span>
                                <span className="w-24 text-right">${totals.credit.toFixed(2)}</span>
                            </div>
                        </div>
                        {Math.abs(totals.debit - totals.credit) > 0.001 && (
                            <div className="flex justify-between text-xs font-bold text-rose-500 border-t border-[var(--border-main)]/30 pt-3">
                                <span>OUT OF BALANCE</span>
                                <span className="font-mono">${Math.abs(totals.debit - totals.credit).toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-6 pt-4 border-t border-white/5">
                    <div className="space-y-1 w-full sm:w-auto">
                        {error && (
                            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-2.5 rounded-xl text-sm border border-rose-500/20">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        {!error && (
                            <div className="text-[10px] text-dim font-bold uppercase tracking-wider">
                                Double entry must balance
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => navigate('../manual-journals')}
                            className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-main)] hover:brightness-110 transition-all"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !!categoryViolation}
                            className="flex-1 sm:flex-none px-10 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#C8E600] text-black disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,230,0,0.25)] cursor-pointer disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Posting...' : <><Save size={14} /> Post Journal</>}
                        </button>
                    </div>
                </div>
            </form>

            {/* Quick Create Branch Modal */}
            {showBranchModal && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-2xl border border-[var(--border-main)] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><Building2 size={20} className="text-[#C8E600]" /> Quick Add Branch</h3>
                            <button onClick={() => setShowBranchModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-dim hover:text-[var(--text-main)] transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateBranch} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Branch Name</label>
                                    <input required type="text" value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="Main Branch" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Branch Code</label>
                                    <input required type="text" value={newBranch.code} onChange={e => setNewBranch({ ...newBranch, code: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="BR01" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs text-dim">Country Manager</label>
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
                                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] disabled:opacity-50"
                                            style={{ colorScheme: 'dark' }}
                                        >
                                            <option value="" className="bg-[var(--bg-card)]">{countryManagers.length === 0 ? 'No Managers' : 'Select Manager'}</option>
                                            {countryManagers.map(m => (
                                                <option key={m._id} value={m._id} className="bg-[var(--bg-card)]">
                                                    {m.fullName} ({m.country})
                                                </option>
                                            ))}
                                        </select>
                                        {countryManagers.length > 0 && (
                                            <button type="button" onClick={() => setShowCountryManagerModal(true)} className="px-3 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg hover:brightness-110 text-dim transition-all flex items-center justify-center">
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Email</label>
                                    <input required type="email" value={newBranch.email} onChange={e => setNewBranch({ ...newBranch, email: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="branch@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">City</label>
                                    <input required type="text" value={newBranch.city} onChange={e => setNewBranch({ ...newBranch, city: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="New York" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">State</label>
                                    <input required type="text" value={newBranch.state} onChange={e => setNewBranch({ ...newBranch, state: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="NY" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Phone</label>
                                    <PhoneInput
                                        country={countryToIso2[newBranch.country] || "in"}
                                        value={newBranch.phone}
                                        onChange={(phone) => setNewBranch({ ...newBranch, phone })}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "0.5rem",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)"
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Status</label>
                                    <select
                                        required
                                        value={newBranch.status}
                                        onChange={e => setNewBranch({ ...newBranch, status: e.target.value })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] appearance-none"
                                        style={{ colorScheme: 'dark' }}
                                    >
                                        <option value="ACTIVE" className="bg-[var(--bg-card)]">Active</option>
                                        <option value="INACTIVE" className="bg-[var(--bg-card)]">Inactive</option>
                                        <option value="MAINTENANCE" className="bg-[var(--bg-card)]">Maintenance</option>
                                    </select>
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-dim">Address</label>
                                    <input required type="text" value={newBranch.address} onChange={e => setNewBranch({ ...newBranch, address: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="123 Street" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border-main)]">
                                <button type="button" onClick={() => setShowBranchModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:brightness-110 transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Branch'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Create Country Manager Modal */}
            {showCountryManagerModal && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-2xl border border-[var(--border-main)] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><UserPlus size={20} className="text-[#C8E600]" /> Quick Add Country Manager</h3>
                            <button onClick={() => setShowCountryManagerModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-dim hover:text-[var(--text-main)] transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateCountryManager} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Full Name</label>
                                    <input required type="text" value={newCountryManager.fullName} onChange={e => setNewCountryManager({ ...newCountryManager, fullName: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="John Doe" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Country</label>
                                    <select
                                        required
                                        value={newCountryManager.country}
                                        onChange={e => setNewCountryManager({ ...newCountryManager, country: e.target.value })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] appearance-none"
                                        style={{ colorScheme: 'dark' }}
                                    >
                                        <option value="" className="bg-[var(--bg-card)]">Select Country</option>
                                        {countries.map(c => (
                                            <option key={c} value={c} className="bg-[var(--bg-card)]">{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Email</label>
                                    <input required type="email" value={newCountryManager.email} onChange={e => setNewCountryManager({ ...newCountryManager, email: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="john@example.com" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-dim">Phone</label>
                                    <PhoneInput
                                        country={countryToIso2[newCountryManager.country] || "in"}
                                        value={newCountryManager.phone}
                                        onChange={(phone) => setNewCountryManager({ ...newCountryManager, phone })}
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "0.5rem",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)"
                                        }}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-xs text-dim">Temporary Password</label>
                                    <input required type="password" value={newCountryManager.password} onChange={e => setNewCountryManager({ ...newCountryManager, password: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="••••••••" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border-main)]">
                                <button type="button" onClick={() => setShowCountryManagerModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Country Manager'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Create Accounting Code Modal */}
            {showAccountingCodeModal && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-md border border-[var(--border-main)] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><Plus size={20} className="text-[#C8E600]" /> Quick Add Accounting Code</h3>
                            <button onClick={() => setShowAccountingCodeModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-dim hover:text-[var(--text-main)] transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateAccountingCode} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Code Number</label>
                                <input required type="text" value={newAccountingCode.code} onChange={e => setNewAccountingCode({ ...newAccountingCode, code: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] font-mono" placeholder="4000" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Account Name</label>
                                <input required type="text" value={newAccountingCode.name} onChange={e => setNewAccountingCode({ ...newAccountingCode, name: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="Sales Revenue" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Category</label>
                                <select
                                    required
                                    value={newAccountingCode.category}
                                    onChange={e => setNewAccountingCode({ ...newAccountingCode, category: e.target.value as any })}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] appearance-none"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    <option value="INCOME" className="bg-[var(--bg-card)]">Income</option>
                                    <option value="EXPENSE" className="bg-[var(--bg-card)]">Expense</option>
                                    <option value="ASSET" className="bg-[var(--bg-card)]">Asset</option>
                                    <option value="LIABILITY" className="bg-[var(--bg-card)]">Liability</option>
                                    <option value="EQUITY" className="bg-[var(--bg-card)]">Equity</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border-main)]">
                                <button type="button" onClick={() => setShowAccountingCodeModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Code'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Create Tax Modal */}
            {showTaxModal && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-sm border border-[var(--border-main)] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><Plus size={20} className="text-[#C8E600]" /> Quick Add Tax</h3>
                            <button onClick={() => setShowTaxModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-dim hover:text-[var(--text-main)] transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateTax} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Tax Name</label>
                                <input required type="text" value={newTax.name} onChange={e => setNewTax({ ...newTax, name: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="e.g. VAT" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Tax Rate (%)</label>
                                <input required type="number" step="0.01" min="0" max="100" value={newTax.rate} onChange={e => setNewTax({ ...newTax, rate: Number(e.target.value) })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600] font-mono" placeholder="10" />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border-main)]">
                                <button type="button" onClick={() => setShowTaxModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Tax'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Quick Create Customer Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 z-[11000] flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
                    <div className="bg-[var(--bg-card)] rounded-3xl p-6 w-full max-w-md border border-[var(--border-main)] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><User size={20} className="text-[#C8E600]" /> Quick Add Customer</h3>
                            <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-[var(--bg-input)] rounded-lg text-dim hover:text-[var(--text-main)] transition-colors"><X size={18} /></button>
                        </div>
                        {quickCreateError && <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} />{quickCreateError}</div>}
                        <form onSubmit={handleCreateCustomer} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Customer Name</label>
                                <input required type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="John Smith" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Email Address</label>
                                <input required type="email" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[#C8E600]" placeholder="johnsmith@example.com" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-dim">Phone Number</label>
                                <PhoneInput
                                    country={countryToIso2[newCustomer.country] || "in"}
                                    value={newCustomer.phone}
                                    onChange={(phone) => setNewCustomer({ ...newCustomer, phone })}
                                    containerStyle={{ width: "100%" }}
                                    inputStyle={{
                                        width: "100%",
                                        height: "36px",
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-main)",
                                        borderRadius: "0.5rem",
                                        fontSize: "14px"
                                    }}
                                    buttonStyle={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)"
                                    }}
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[var(--border-main)]">
                                <button type="button" onClick={() => setShowCustomerModal(false)} className="flex-1 py-2.5 rounded-lg text-sm bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" disabled={quickCreateLoading} className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-[#C8E600] text-black hover:bg-[#b0cc00] transition-colors disabled:opacity-50">{quickCreateLoading ? 'Saving...' : 'Save Customer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateJournalPage;
