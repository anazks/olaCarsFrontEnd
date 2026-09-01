import { useState, useEffect, useMemo } from 'react';
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
    Calendar,
    CheckCircle2,
    Sparkles,
    User,
    Building,
    Layers
} from 'lucide-react';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { getAllCustomers } from '../../../services/customerService';
import { getAllSuppliers } from '../../../services/supplierService';
import { getAllBankAccounts } from '../../../services/bankAccountService';
import { getInvoicesByCustomer } from '../../../services/invoiceService';
import { getAllBills } from '../../../services/billService';
import { createVoucher } from '../../../services/ledgerService';
import type { VoucherType, JournalLine } from '../../../services/ledgerService';
import { useTheme } from '../../../context/ThemeContext';
import toast from 'react-hot-toast';

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

const AccountSelector = ({ codes, selectedId, onSelect, isOpen, setIsOpen, placeholder = 'Select Account', searchPlaceholder = 'Search account name or code...', emptyMessage = 'No matching accounts' }: {
    codes: AccountingCode[],
    selectedId: string,
    onSelect: (id: string) => void,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    placeholder?: string,
    searchPlaceholder?: string,
    emptyMessage?: string
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');
    const selectedCode = codes.find(c => c._id === selectedId);

    const filteredCodes = useMemo(() => {
        const q = search.toLowerCase().trim();
        const list = codes.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            c.category?.toLowerCase().includes(q) ||
            (c.accountType && c.accountType.toLowerCase().includes(q))
        );
        return list.sort((a, b) => {
            if (q) {
                const aNameStarts = a.name.toLowerCase().startsWith(q);
                const bNameStarts = b.name.toLowerCase().startsWith(q);
                if (aNameStarts && !bNameStarts) return -1;
                if (!aNameStarts && bNameStarts) return 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [codes, search]);

    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';

    return (
        <div className={`relative ${isOpen ? 'z-[9999]' : 'z-[1]'}`}>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all hover:border-[#C8E600]/50 min-h-[38px]"
                style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
            >
                {selectedCode ? (
                    <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                        <span className="text-xs font-bold truncate text-[color:var(--text-main)]">
                            {selectedCode.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0"
                              style={{ backgroundColor: isDark ? 'var(--bg-card)' : '#FFFFFF', color: isDark ? '#C8E600' : '#1F2937' }}>
                            {selectedCode.code}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs truncate font-medium" style={{ color: textDimColor }}>
                        {placeholder}
                    </span>
                )}
                <ChevronDown size={14} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} style={{ color: textDimColor }} />
            </div>

            {isOpen && (
                <div 
                    className="absolute top-full left-0 min-w-[320px] w-full mt-2 border rounded-2xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}
                >
                    <div className="p-2.5 border-b flex items-center gap-2"
                         style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                        <Search size={14} style={{ color: textDimColor }} />
                        <input
                            autoFocus
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent border-none text-xs focus:ring-0 outline-none w-full text-[color:var(--text-main)]"
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#C8E600] [&::-webkit-scrollbar-thumb]:rounded-full">
                        {filteredCodes.length > 0 ? (
                            filteredCodes.map(code => (
                                <div
                                    key={code._id}
                                    onClick={() => {
                                        onSelect(code._id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="px-3.5 py-2.5 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b last:border-0"
                                    style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs font-bold text-[color:var(--text-main)] group-hover:text-black truncate">
                                            {code.name}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider group-hover:bg-black group-hover:text-[#C8E600] text-[color:var(--text-muted)] shrink-0"
                                              style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB' }}>
                                            {code.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-mono font-bold text-[#C8E600] group-hover:text-black">
                                            {code.code}
                                        </span>
                                        {code.accountType && (
                                            <span className="text-[10px] text-[color:var(--text-muted)] group-hover:text-black/80">
                                                • {code.accountType}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-3.5 text-center text-xs" style={{ color: textDimColor }}>{emptyMessage}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const PartySelector = ({
    partyType,
    items,
    selectedId,
    manualName,
    onSelect,
    onManualNameChange,
    isOpen,
    setIsOpen
}: {
    partyType: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER';
    items: any[];
    selectedId: string;
    manualName: string;
    onSelect: (item: any | null) => void;
    onManualNameChange: (name: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [search, setSearch] = useState('');

    const selectedItem = useMemo(() => {
        return items.find(i => i._id === selectedId);
    }, [items, selectedId]);

    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(item => {
            const name = (item.name || item.fullName || item.companyName || '').toLowerCase();
            const phone = (item.phone || item.mobileNumber || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const contactPerson = (item.contactPerson || '').toLowerCase();
            const code = (item.code || item.customerId || item.supplierCode || '').toLowerCase();
            return name.includes(q) || phone.includes(q) || email.includes(q) || contactPerson.includes(q) || code.includes(q);
        });
    }, [items, search]);

    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';

    if (partyType !== 'CUSTOMER' && partyType !== 'SUPPLIER') {
        return (
            <input
                type="text"
                placeholder="Enter Party Name..."
                value={manualName}
                onChange={e => onManualNameChange(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
            />
        );
    }

    const placeholder = partyType === 'CUSTOMER' ? 'Search & select customer...' : 'Search & select supplier / vendor...';

    return (
        <div className="relative">
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-all hover:border-[#C8E600]/60 min-h-[40px]"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
            >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {selectedItem ? (
                        <>
                            <div className="w-6 h-6 rounded-lg bg-[#C8E600]/20 text-[#C8E600] flex items-center justify-center font-bold text-xs shrink-0">
                                {partyType === 'CUSTOMER' ? <User size={13} /> : <Building size={13} />}
                            </div>
                            <div className="truncate text-left">
                                <p className="text-xs font-bold truncate text-[color:var(--text-main)]">
                                    {selectedItem.name || selectedItem.companyName || selectedItem.fullName}
                                </p>
                                <p className="text-[10px] truncate" style={{ color: textDimColor }}>
                                    {selectedItem.phone || selectedItem.email || (selectedItem.contactPerson ? `Contact: ${selectedItem.contactPerson}` : 'Registered Party')}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2" style={{ color: textDimColor }}>
                            <Search size={13} />
                            <span className="text-xs font-medium">{placeholder}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {selectedItem && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(null);
                            }}
                            className="p-1 rounded hover:bg-white/10 text-[color:var(--text-dim)] hover:text-rose-400 transition-colors"
                            title="Clear Selection"
                        >
                            <X size={12} />
                        </button>
                    )}
                    <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: textDimColor }} />
                </div>
            </div>

            {isOpen && (
                <div 
                    className="absolute top-full left-0 w-full mt-2 border rounded-xl shadow-2xl z-[99999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}
                >
                    <div className="p-2 border-b flex items-center gap-2"
                         style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                        <Search size={13} style={{ color: textDimColor }} />
                        <input
                            autoFocus
                            type="text"
                            placeholder={`Search ${partyType === 'CUSTOMER' ? 'customers...' : 'suppliers...'}`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="bg-transparent border-none text-xs focus:ring-0 outline-none w-full text-[color:var(--text-main)]"
                        />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#C8E600] [&::-webkit-scrollbar-thumb]:rounded-full">
                        {filteredItems.length > 0 ? (
                            filteredItems.map(item => {
                                const isSelected = item._id === selectedId;
                                const displayName = item.name || item.companyName || item.fullName;
                                const subInfo = item.phone || item.email || (item.contactPerson ? `Contact: ${item.contactPerson}` : null);
                                return (
                                    <div
                                        key={item._id}
                                        onClick={() => {
                                            onSelect(item);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`px-3 py-2 hover:bg-[#C8E600] group cursor-pointer transition-colors border-b last:border-0 flex items-center justify-between gap-2 ${
                                            isSelected ? 'bg-white/[0.04]' : ''
                                        }`}
                                        style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-black/20 group-hover:bg-black group-hover:text-[#C8E600] text-[11px] font-bold flex items-center justify-center shrink-0">
                                                {displayName?.[0]?.toUpperCase() || 'P'}
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-bold text-[color:var(--text-main)] group-hover:text-black truncate">
                                                    {displayName}
                                                </p>
                                                {subInfo && (
                                                    <p className="text-[10px] group-hover:text-black/80 truncate mt-0.5" style={{ color: textDimColor }}>
                                                        {subInfo}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle2 size={14} className="text-[#C8E600] group-hover:text-black shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs" style={{ color: textDimColor }}>
                                No {partyType.toLowerCase()}s found matching "{search}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const CreateVoucher = ({ onClose, onSuccess, type: initialType = 'PAYMENT' }: { onClose: () => void; onSuccess: () => void; type?: VoucherType }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [type, setType] = useState<VoucherType>(initialType);
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
    const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
    const [autoSetOff, setAutoSetOff] = useState<boolean>(true);

    // Open documents for set-off preview
    const [openDocs, setOpenDocs] = useState<OpenDoc[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    const today = new Date();
    const localDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [header, setHeader] = useState({
        date: localDateString,
        branch: '',
        narration: '',
        contact: '',
        contactModel: 'Supplier' as 'Customer' | 'Supplier' | 'Driver' | 'Other',
        referenceInfo: {
            referenceNumber: '',
            partyName: '',
            partyId: '',
            partyType: 'SUPPLIER' as 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER'
        }
    });

    const [lines, setLines] = useState<JournalLine[]>([
        { accountingCode: '', type: 'DEBIT', amount: 0, description: '' }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [codes, branchesData, customersData, suppliersData, bankAccountsData] = await Promise.all([
                    getAllAccountingCodes(),
                    getAllBranches(),
                    getAllCustomers({ limit: 200 }).catch(() => ({ data: [] })),
                    getAllSuppliers({ limit: 200 }).catch(() => ({ data: [] })),
                    getAllBankAccounts({ limit: 1000 }).catch(() => ({ data: [] }))
                ]);
                setAccountingCodes(codes || []);
                setBranches(branchesData?.data || []);
                
                const custList = (customersData as any)?.data?.customers || (customersData as any)?.customers || (customersData as any)?.data || [];
                setCustomers(custList);

                const suppList = (suppliersData as any)?.data?.suppliers || (suppliersData as any)?.suppliers || (suppliersData as any)?.data || [];
                setSuppliers(suppList);

                const bankList = bankAccountsData?.data || [];
                setBankAccounts(bankList);

                if (branchesData?.data?.length > 0) {
                    setHeader(h => ({ ...h, branch: branchesData.data[0]._id }));
                }
            } catch (err) {
                setError('Failed to load form data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter to Bank & Cash accounting codes only
    const bankAccountingCodes = useMemo(() => {
        const linkedCodeIds = new Set<string>();
        const linkedCodeNumbers = new Set<string>();

        (bankAccounts || []).forEach(b => {
            const id = b.accountingCode?._id || (typeof b.accountingCode === 'string' ? b.accountingCode : null);
            if (id) linkedCodeIds.add(String(id));
            if (b.accountCode) linkedCodeNumbers.add(String(b.accountCode).toLowerCase().trim());
        });

        return (accountingCodes || []).filter(c => {
            if (linkedCodeIds.has(String(c._id))) return true;
            if (c.code && linkedCodeNumbers.has(String(c.code).toLowerCase().trim())) return true;

            const accType = (c.accountType || '').toLowerCase().trim();
            const cat = (c.category || '').toLowerCase().trim();
            const name = (c.name || '').toLowerCase().trim();
            const code = (c.code || '').trim();

            if (accType === 'bank' || accType === 'cash' || accType === 'credit card') return true;
            if (cat === 'bank' || cat === 'cash') return true;
            if (code.startsWith('1.1.01') || code.startsWith('1.1.02')) return true;
            if (name.includes('bank') || name.includes('banco') || name.includes('cash') || name.includes('caja') || name.includes('petty')) return true;

            return false;
        });
    }, [accountingCodes, bankAccounts]);

    // Account codes available for line selection depending on voucher type
    const availableAccountingCodes = useMemo(() => {
        if (type === 'CONTRA') {
            return bankAccountingCodes;
        }
        return accountingCodes;
    }, [type, accountingCodes, bankAccountingCodes]);

    // Fetch open invoices or bills when party or voucher type changes
    useEffect(() => {
        if (!header.contact || (type !== 'RECEIPT' && type !== 'PAYMENT')) {
            setOpenDocs([]);
            return;
        }

        let isMounted = true;
        setLoadingDocs(true);

        const loadOpenDocs = async () => {
            try {
                if (type === 'RECEIPT' && header.referenceInfo.partyType === 'CUSTOMER') {
                    const invoices = await getInvoicesByCustomer(header.contact);
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
                } else if (type === 'PAYMENT' && header.referenceInfo.partyType === 'SUPPLIER') {
                    const res = await getAllBills({ supplier: header.contact, limit: 1000 });
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
    }, [header.contact, type, header.referenceInfo.partyType]);

    // Preset helper when voucher type changes
    useEffect(() => {
        if (!accountingCodes.length) return;

        const bankOrCashCode = bankAccountingCodes[0] || accountingCodes.find(c => c.code === '1.1.01' || c.code === '1.1.02' || c.category === 'ASSET');
        const secondBankOrCashCode = bankAccountingCodes[1] || (bankAccountingCodes.length > 0 ? bankAccountingCodes[0] : null);
        const arCode = accountingCodes.find(c => c.code === '1.1.03' || c.name.toLowerCase().includes('receivable'));
        const apCode = accountingCodes.find(c => c.code === '2.1.01' || c.name.toLowerCase().includes('payable'));
        const salesRevenueCode = accountingCodes.find(c => c.code === '4.1.01' || c.category === 'INCOME');
        const expenseCode = accountingCodes.find(c => c.category === 'EXPENSE');

        if (type === 'RECEIPT') {
            setAutoSetOff(true);
            setHeader(h => ({ 
                ...h, 
                narration: 'Receipt from customer',
                contactModel: 'Customer',
                referenceInfo: { ...h.referenceInfo, partyType: 'CUSTOMER' }
            }));
            setLines([
                { accountingCode: bankOrCashCode?._id || '', type: 'DEBIT', amount: 0, description: 'Deposit to Bank/Cash' },
                { accountingCode: arCode?._id || '', type: 'CREDIT', amount: 0, description: 'Customer Invoice / Advance Set-off' }
            ]);
        } else if (type === 'PAYMENT') {
            setAutoSetOff(true);
            setHeader(h => ({ 
                ...h, 
                narration: 'Payment to vendor',
                contactModel: 'Supplier',
                referenceInfo: { ...h.referenceInfo, partyType: 'SUPPLIER' }
            }));
            setLines([
                { accountingCode: apCode?._id || '', type: 'DEBIT', amount: 0, description: 'Vendor Bill / Advance Set-off' },
                { accountingCode: bankOrCashCode?._id || '', type: 'CREDIT', amount: 0, description: 'Payment from Bank/Cash' }
            ]);
        } else if (type === 'CONTRA') {
            setAutoSetOff(false);
            setHeader(h => ({ 
                ...h, 
                narration: 'Cash-Bank internal transfer',
                contactModel: 'Other',
                referenceInfo: { ...h.referenceInfo, partyType: 'OTHER' }
            }));
            setLines([
                { accountingCode: bankOrCashCode?._id || '', type: 'DEBIT', amount: 0, description: 'Receiving Bank/Cash Account' },
                { accountingCode: secondBankOrCashCode?._id || '', type: 'CREDIT', amount: 0, description: 'Sending Bank/Cash Account' }
            ]);
        } else if (type === 'SALES') {
            setAutoSetOff(false);
            setHeader(h => ({ 
                ...h, 
                narration: 'Sales voucher entry',
                contactModel: 'Customer',
                referenceInfo: { ...h.referenceInfo, partyType: 'CUSTOMER' }
            }));
            setLines([
                { accountingCode: arCode?._id || '', type: 'DEBIT', amount: 0, description: 'Accounts Receivable' },
                { accountingCode: salesRevenueCode?._id || '', type: 'CREDIT', amount: 0, description: 'Sales Revenue' }
            ]);
        } else if (type === 'PURCHASE') {
            setAutoSetOff(false);
            setHeader(h => ({ 
                ...h, 
                narration: 'Purchase voucher entry',
                contactModel: 'Supplier',
                referenceInfo: { ...h.referenceInfo, partyType: 'SUPPLIER' }
            }));
            setLines([
                { accountingCode: expenseCode?._id || '', type: 'DEBIT', amount: 0, description: 'Purchase / Expense Account' },
                { accountingCode: apCode?._id || '', type: 'CREDIT', amount: 0, description: 'Accounts Payable' }
            ]);
        } else {
            setAutoSetOff(false);
            setHeader(h => ({ 
                ...h, 
                narration: 'General journal adjustment',
                contactModel: 'Other',
                referenceInfo: { ...h.referenceInfo, partyType: 'OTHER' }
            }));
            setLines([
                { accountingCode: '', type: 'DEBIT', amount: 0, description: '' },
                { accountingCode: '', type: 'CREDIT', amount: 0, description: '' }
            ]);
        }
    }, [type, accountingCodes, bankAccountingCodes]);

    const handlePartyTypeChange = (pType: 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'OTHER') => {
        const cModel = pType === 'CUSTOMER' ? 'Customer' : pType === 'SUPPLIER' ? 'Supplier' : pType === 'DRIVER' ? 'Driver' : 'Other';
        setHeader(h => ({
            ...h,
            contact: '',
            contactModel: cModel,
            referenceInfo: {
                ...h.referenceInfo,
                partyType: pType,
                partyId: '',
                partyName: ''
            }
        }));
    };

    const handlePartySelect = (selectedItem: any | null) => {
        if (!selectedItem) {
            setHeader(h => ({
                ...h,
                contact: '',
                referenceInfo: { ...h.referenceInfo, partyId: '', partyName: '' }
            }));
            return;
        }

        const name = selectedItem.name || selectedItem.companyName || selectedItem.fullName || '';
        setHeader(h => ({
            ...h,
            contact: selectedItem._id,
            referenceInfo: {
                ...h.referenceInfo,
                partyId: selectedItem._id,
                partyName: name
            }
        }));
    };

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

    const totals = useMemo(() => {
        return lines.reduce((acc, line) => {
            const amt = Number(line.amount || 0);
            if (line.type === 'DEBIT') acc.debit += amt;
            else acc.credit += amt;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [lines]);

    const effectiveTotal = useMemo(() => {
        return totals.debit > 0 ? totals.debit : totals.credit;
    }, [totals]);

    // Live Set-Off Simulation
    const simulatedSetOff = useMemo(() => {
        let pool = effectiveTotal;
        let totalSettled = 0;

        const items = openDocs.map(doc => {
            const bal = Number(doc.balanceDue || (doc.totalAmount - (doc.amountPaid || 0)));
            const applied = Math.min(pool, bal);
            const remaining = Math.max(0, bal - applied);
            pool -= applied;
            totalSettled += applied;

            return {
                ...doc,
                applied,
                remaining,
                willBeFullySettled: remaining <= 0.001 && applied > 0,
                willBePartiallySettled: remaining > 0.001 && applied > 0,
                isUntouched: applied <= 0
            };
        });

        return {
            items,
            totalOutstanding: openDocs.reduce((sum, d) => sum + d.balanceDue, 0),
            totalSettled,
            excessAdvance: Math.max(0, pool)
        };
    }, [openDocs, effectiveTotal]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!header.branch) return setError('Please select a branch');
        
        if (effectiveTotal <= 0) return setError('Total amount must be greater than zero');
        
        if (['JOURNAL', 'CONTRA'].includes(type) && Math.abs(totals.debit - totals.credit) > 0.01) {
            return setError('Debits and Credits must balance for Contra and Journal vouchers');
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
                autoSetOff,
                lines
            });
            toast.success(`${type} Voucher posted successfully!`);
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
    const borderStyle = { borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' };
    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';
    const currentPartyItems = header.referenceInfo.partyType === 'CUSTOMER' ? customers : suppliers;

    return (
        <div className="overflow-hidden bg-transparent" style={{ backgroundColor: 'var(--bg-card)' }}>
            {/* Header */}
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white/[0.01]" style={borderStyle}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 ${typeConfig[type].bg} rounded-2xl`}>
                        <ActiveIcon size={28} className={typeConfig[type].color} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-[color:var(--text-main)]">
                            Create {type.charAt(0) + type.slice(1).toLowerCase()} Voucher
                        </h2>
                        <p className="text-xs mt-0.5" style={{ color: textDimColor }}>
                            Double-entry accounting with intelligent auto set-off & audit trail
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer" style={{ color: textDimColor }}>
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
                            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                                type === vType 
                                ? `bg-white/5 shadow-[0_0_15px_rgba(200,230,0,0.15)] ring-1 ring-[#C8E600]` 
                                : 'bg-transparent hover:bg-white/5 opacity-70 hover:opacity-100'
                            }`}
                            style={{ borderColor: type === vType ? 'var(--brand-lime)' : (isDark ? 'var(--border-main)' : '#D1D5DB') }}
                        >
                            {vType === 'PAYMENT' && <ArrowUpRight size={16} className="text-rose-500" />}
                            {vType === 'RECEIPT' && <ArrowDownLeft size={16} className="text-emerald-500" />}
                            {vType === 'JOURNAL' && <FileText size={16} className="text-amber-500" />}
                            {vType === 'CONTRA' && <ArrowLeftRight size={16} className="text-blue-500" />}
                            {vType === 'SALES' && <Receipt size={16} className="text-[#C8E600]" />}
                            {vType === 'PURCHASE' && <Receipt size={16} className="text-indigo-500" />}
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: type === vType ? 'var(--text-main)' : textDimColor }}>
                                {vType}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Primary Meta Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Calendar size={12} /> Voucher Date
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
                            <Tag size={12} /> Narration / Notes
                        </label>
                        <input
                            required
                            type="text"
                            placeholder="Brief description of the transaction..."
                            value={header.narration}
                            onChange={e => setHeader({ ...header, narration: e.target.value })}
                            className="w-full border rounded-xl px-4 py-3 text-sm outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                        />
                    </div>
                </div>

                {/* Party & Auto Set-off Section */}
                <div className="p-6 border rounded-2xl space-y-5" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#F3F4F6', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: textDimColor }}>
                            <Hash size={13} /> Party & Reference Details
                        </h3>
                        
                        {(type === 'RECEIPT' || type === 'PAYMENT') && (
                            <label className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                <input
                                    type="checkbox"
                                    checked={autoSetOff}
                                    onChange={e => setAutoSetOff(e.target.checked)}
                                    className="rounded text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
                                />
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                    <Sparkles size={13} /> Auto Set-off {type === 'RECEIPT' ? 'Customer Invoices' : 'Supplier Bills'}
                                </span>
                            </label>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold" style={{ color: textDimColor }}>Party Type</label>
                            <select
                                value={header.referenceInfo.partyType}
                                onChange={e => handlePartyTypeChange(e.target.value as any)}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all appearance-none cursor-pointer focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            >
                                <option value="SUPPLIER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Supplier / Vendor</option>
                                <option value="CUSTOMER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Customer</option>
                                <option value="DRIVER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Driver</option>
                                <option value="OTHER" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Other</option>
                            </select>
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold" style={{ color: textDimColor }}>
                                {header.referenceInfo.partyType === 'CUSTOMER' ? 'Select Registered Customer' : 
                                 header.referenceInfo.partyType === 'SUPPLIER' ? 'Select Registered Supplier / Vendor' : 'Party Name'}
                            </label>
                            
                            <PartySelector
                                partyType={header.referenceInfo.partyType}
                                items={currentPartyItems}
                                selectedId={header.contact}
                                manualName={header.referenceInfo.partyName}
                                onSelect={handlePartySelect}
                                onManualNameChange={(name) => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, partyName: name } })}
                                isOpen={isPartyDropdownOpen}
                                setIsOpen={setIsPartyDropdownOpen}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold" style={{ color: textDimColor }}>
                                {(type === 'RECEIPT' || type === 'PAYMENT') ? 'Cheque / UTR / Txn Ref (Optional)' : 'External Ref # (Optional)'}
                            </label>
                            <input
                                type="text"
                                placeholder={(type === 'RECEIPT' || type === 'PAYMENT') ? 'e.g. CHQ-48210 / UTR-992' : 'e.g. REF-2024'}
                                value={header.referenceInfo.referenceNumber}
                                onChange={e => setHeader({ ...header, referenceInfo: { ...header.referenceInfo, referenceNumber: e.target.value } })}
                                className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600] text-[color:var(--text-main)]"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                            />
                        </div>
                    </div>

                    {/* Auto Set-off Open Invoices / Bills Display */}
                    {autoSetOff && header.contact && (type === 'RECEIPT' || type === 'PAYMENT') && (
                        <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <Layers size={15} className="text-[#C8E600]" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--text-main)]">
                                        Open {type === 'RECEIPT' ? 'Invoices' : 'Bills'} ({openDocs.length})
                                    </h4>
                                </div>
                                <div className="text-[10px] font-medium" style={{ color: textDimColor }}>
                                    Auto Set-off Priority: Overdue &rarr; Oldest
                                </div>
                            </div>

                            {loadingDocs ? (
                                <div className="p-4 text-center text-xs space-y-2 border rounded-xl" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                    <div className="w-4 h-4 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p style={{ color: textDimColor }}>Fetching open records...</p>
                                </div>
                            ) : openDocs.length === 0 ? (
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                    <span>
                                        No unpaid {type === 'RECEIPT' ? 'invoices' : 'bills'}. Full amount (<strong>${effectiveTotal.toFixed(2)}</strong>) will be booked as <strong>{type === 'RECEIPT' ? 'Customer Advance (2.1.02)' : 'Supplier Advance (1.1.06)'}</strong>.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                        <div>
                                            <p className="text-[8px] font-bold uppercase" style={{ color: textDimColor }}>Total Debt</p>
                                            <p className="text-xs font-bold font-mono text-rose-400">${simulatedSetOff.totalOutstanding.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold uppercase" style={{ color: textDimColor }}>Voucher Amount</p>
                                            <p className="text-xs font-bold font-mono text-[#C8E600]">${effectiveTotal.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold uppercase" style={{ color: textDimColor }}>Applied</p>
                                            <p className="text-xs font-bold font-mono text-emerald-400">${simulatedSetOff.totalSettled.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-bold uppercase" style={{ color: textDimColor }}>Advance</p>
                                            <p className="text-xs font-bold font-mono text-blue-400">${simulatedSetOff.excessAdvance.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                        <div className="max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[#C8E600] [&::-webkit-scrollbar-thumb]:rounded-full">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead className="border-b" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                                    <tr>
                                                        <th className="px-3 py-1.5 text-[9px] font-bold uppercase" style={{ color: textDimColor }}>Doc #</th>
                                                        <th className="px-3 py-1.5 text-[9px] font-bold uppercase text-right" style={{ color: textDimColor }}>Balance</th>
                                                        <th className="px-3 py-1.5 text-[9px] font-bold uppercase text-right text-emerald-400">Applied</th>
                                                        <th className="px-3 py-1.5 text-[9px] font-bold uppercase text-center" style={{ color: textDimColor }}>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                                    {simulatedSetOff.items.map((doc) => (
                                                        <tr key={doc.id} className={doc.applied > 0 ? 'bg-emerald-500/5' : ''}>
                                                            <td className="px-3 py-2 font-bold font-mono text-[color:var(--text-main)]">
                                                                {doc.docNumber}
                                                                {doc.isOverdue && <span className="ml-1 text-[8px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold uppercase">Overdue</span>}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-rose-400">
                                                                ${doc.balanceDue.toFixed(2)}
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                                                                {doc.applied > 0 ? `-$${doc.applied.toFixed(2)}` : '$0.00'}
                                                            </td>
                                                            <td className="px-3 py-2 text-center">
                                                                {doc.willBeFullySettled ? (
                                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[8px]">Cleared</span>
                                                                ) : doc.willBePartiallySettled ? (
                                                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[8px]">Partial</span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-[color:var(--text-dim)] text-[8px]">Pending</span>
                                                                )}
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

                {/* Contra Voucher Notification Banner */}
                {type === 'CONTRA' && (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                            <ArrowLeftRight size={16} />
                        </div>
                        <div>
                            <p className="font-bold text-blue-300">Contra Voucher (Internal Transfer)</p>
                            <p className="text-[11px] text-blue-400/80 mt-0.5">
                                Showing Bank & Cash Accounts only. Use Contra vouchers exclusively for transfers between Bank accounts and Cash accounts.
                            </p>
                        </div>
                    </div>
                )}

                {/* Transaction Lines Table */}
                <div className="rounded-2xl border overflow-visible" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className="overflow-visible">
                        <table className="w-full text-left border-collapse">
                            <thead className="border-b" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                <tr>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest w-1/3" style={{ color: textDimColor }}>
                                        {type === 'CONTRA' ? 'Bank / Cash Account' : 'Account Code'}
                                    </th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Description / Memo</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest w-28" style={{ color: textDimColor }}>DR / CR</th>
                                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest w-44" style={{ color: textDimColor }}>Amount ($)</th>
                                    <th className="px-5 py-3.5 text-right w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                {lines.map((line, index) => (
                                    <tr key={index} className={`hover:bg-white/[0.01] transition-colors ${openDropdownIndex === index ? 'relative z-[990]' : 'relative z-[1]'}`} style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                                        <td className={`p-3 ${openDropdownIndex === index ? 'relative z-[999]' : ''}`}>
                                            <AccountSelector
                                                codes={availableAccountingCodes}
                                                selectedId={line.accountingCode}
                                                onSelect={(id) => updateLine(index, 'accountingCode', id)}
                                                isOpen={openDropdownIndex === index}
                                                setIsOpen={(open) => {
                                                    setOpenDropdownIndex(open ? index : null);
                                                    if (open) setIsPartyDropdownOpen(false);
                                                }}
                                                placeholder={type === 'CONTRA' ? 'Select Bank / Cash Account' : 'Select Account'}
                                                searchPlaceholder={type === 'CONTRA' ? 'Search bank or cash accounts...' : 'Search code, name or category...'}
                                                emptyMessage={type === 'CONTRA' ? 'No matching bank or cash accounts' : 'No matching accounts'}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                placeholder="Line description..."
                                                value={line.description}
                                                onChange={e => updateLine(index, 'description', e.target.value)}
                                                className="w-full bg-transparent border-none text-xs focus:ring-0 outline-none text-[color:var(--text-main)]"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                value={line.type}
                                                onChange={e => updateLine(index, 'type', e.target.value)}
                                                className={`w-full bg-transparent border-none text-xs font-bold focus:ring-0 outline-none cursor-pointer ${line.type === 'DEBIT' ? 'text-emerald-400' : 'text-rose-400'}`}
                                            >
                                                <option value="DEBIT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>DEBIT (DR)</option>
                                                <option value="CREDIT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>CREDIT (CR)</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 border transition-all focus-within:border-[#C8E600]"
                                                 style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                                <span className="text-xs font-bold" style={{ color: textDimColor }}>$</span>
                                                <input
                                                    required
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={line.amount || ''}
                                                    onChange={e => updateLine(index, 'amount', e.target.value === '' ? 0 : Number(e.target.value))}
                                                    className="w-full bg-transparent border-none p-0 text-xs font-bold focus:ring-0 outline-none font-mono text-[color:var(--text-main)]"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLine(index)}
                                                disabled={lines.length <= 1}
                                                className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 disabled:opacity-20 transition-all cursor-pointer"
                                                title="Remove Line"
                                            >
                                                <Trash2 size={15} />
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
                        className="w-full py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-t hover:bg-white/5 cursor-pointer"
                        style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB', color: textDimColor }}
                    >
                        <Plus size={14} /> Add Transaction Line
                    </button>
                </div>

                {/* Totals & Submit Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-6 border-t" style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className="flex flex-wrap items-center gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Total Debit</p>
                            <p className="text-xl font-mono font-bold text-emerald-400">${totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Total Credit</p>
                            <p className="text-xl font-mono font-bold text-rose-400">${totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        {Math.abs(totals.debit - totals.credit) > 0.01 && (
                            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1.5">
                                <AlertCircle size={13} />
                                Diff: ${Math.abs(totals.debit - totals.credit).toFixed(2)}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 md:flex-none px-6 py-3 rounded-xl text-xs font-bold transition-all border hover:bg-white/5 cursor-pointer"
                            style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#E5E7EB', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB', color: 'var(--text-main)' }}
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 md:flex-none px-8 py-3 rounded-xl text-xs font-black bg-[#C8E600] text-black disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(200,230,0,0.25)] hover:shadow-[0_0_35px_rgba(200,230,0,0.4)] cursor-pointer"
                        >
                            {submitting ? 'Posting...' : <><Save size={16} /> Post Voucher</>}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs flex items-center gap-2.5">
                        <AlertCircle size={16} className="shrink-0" /> {error}
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreateVoucher;

