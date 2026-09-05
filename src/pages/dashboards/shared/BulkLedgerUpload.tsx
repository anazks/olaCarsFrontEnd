import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2, ChevronDown, ChevronRight, ChevronLeft, Search, AlertCircle, Zap, ArrowLeft, Eye, Layers, Activity, Database, Check, Link2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getAllBankAccounts, bulkUploadBankAccountTransactions, type BankAccount } from '../../../services/bankAccountService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../services/accountingService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getInvoices, type Invoice } from '../../../services/invoiceService';
import { getAllBills, type Bill } from '../../../services/billService';

import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

interface BulkLedgerUploadProps {
    isOpen?: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
}

interface ParsedTransaction {
    [key: string]: any;
    Date: string;
    Description: string;
    "Transaction Details": string;
    Debit: number;
    Credit: number;
    "Running Balance": number;
    "Transaction Type": "DEBIT" | "CREDIT";
    Amount: number;
    transactionId?: string;
    customer?: Customer;
    customerName?: string;
    supplier?: Supplier;
    supplierName?: string;

    accountsName?: string;
    matchedAccount?: AccountingCode;
    _rowErrors: string[];
    _rawRow?: any;
}

interface UploadLiveStats {
    processedCount: number;
    totalCount: number;
    insertedCount: number;
    skippedCount: number;
    currentBatch: number;
    totalBatches: number;
    setOffCount: number;
    recentActivities: Array<{
        id: string;
        type: 'SUCCESS' | 'WARNING' | 'SETOFF' | 'INFO';
        title: string;
        details?: string;
        time: string;
    }>;
}

const TEMPLATE_HEADERS = [
    'DATE', 'PREFIX', 'NUMBER', 'BANK NAME', 'ACCOUNTS NAME', 'RECEIPT', 'PAYMENT', 'DESCRIPTION', 'REMARKS', 'BRANCH', 'DRIVER NAME', 'SUPPLIER NAME', 'CUSTOMER NAME'
];

const SAMPLE_ROWS = [
    {
        DATE: '01-06-2026',
        PREFIX: '2026',
        NUMBER: '0000001',
        'BANK NAME': 'Banco General AH 1601',
        'ACCOUNTS NAME': 'Accounts Receivable',
        RECEIPT: 100.00,
        PAYMENT: 0.00,
        DESCRIPTION: 'ACH - Driver Weekly Payment',
        REMARKS: 'Weekly Lease Settlement',
        BRANCH: 'HEAD OFFICE',
        'DRIVER NAME': 'Jessica Soto',
        'SUPPLIER NAME': '',
        'CUSTOMER NAME': ''
    },
    {
        DATE: '02-06-2026',
        PREFIX: '2026',
        NUMBER: '0000002',
        'BANK NAME': 'Banco General AH 1601',
        'ACCOUNTS NAME': 'Accounts Payable',
        RECEIPT: 0.00,
        PAYMENT: 250.00,
        DESCRIPTION: 'Vendor Payment - Spare Parts',
        REMARKS: 'Supplier Bill Settlement',
        BRANCH: 'HEAD OFFICE',
        'DRIVER NAME': '',
        'SUPPLIER NAME': 'Auto Parts Ltd',
        'CUSTOMER NAME': ''
    },
    {
        DATE: '03-06-2026',
        PREFIX: '2026',
        NUMBER: '0000003',
        'BANK NAME': 'Banco General AH 1601',
        'ACCOUNTS NAME': 'Accounts Receivable',
        RECEIPT: 500.00,
        PAYMENT: 0.00,
        DESCRIPTION: 'Customer ACH Deposit',
        REMARKS: 'Corporate Direct Deposit',
        BRANCH: 'HEAD OFFICE',
        'DRIVER NAME': '',
        'SUPPLIER NAME': '',
        'CUSTOMER NAME': 'Rodriguez Transport S.A.'
    },
    {
        DATE: '04-06-2026',
        PREFIX: '2026',
        NUMBER: '0000004',
        'BANK NAME': 'Banco General AH  1601',
        'ACCOUNTS NAME': 'Banco General CT  7905',
        RECEIPT: 0.00,
        PAYMENT: 1000.00,
        DESCRIPTION: 'Inter-Bank Transfer to Banco General CT  7905',
        REMARKS: 'Internal Funds Transfer between Company Accounts',
        BRANCH: 'HEAD OFFICE',
        'DRIVER NAME': '',
        'SUPPLIER NAME': '',
        'CUSTOMER NAME': ''
    }
];

export const computeRowBankTxType = (
    row: ParsedTransaction,
    accounts: BankAccount[] = [],
    _allAccountingCodes: AccountingCode[] = []
) => {
    const targetName = String(row.accountsName || row.matchedAccount?.name || '').trim();
    const matchedAccountObj = row.matchedAccount;

    const isTargetBankAcc = accounts.some(acc =>
        (matchedAccountObj && acc.accountingCode === matchedAccountObj._id) ||
        (targetName && (
            acc.accountName?.toLowerCase() === targetName.toLowerCase() ||
            acc.bankName?.toLowerCase() === targetName.toLowerCase() ||
            acc.accountNumber === targetName
        ))
    );

    const isBankTypeOrName = isTargetBankAcc ||
        (matchedAccountObj && (
            matchedAccountObj.accountType?.toLowerCase() === 'bank' ||
            matchedAccountObj.accountType?.toLowerCase() === 'cash' ||
            (matchedAccountObj.category as string) === 'Bank' ||
            (matchedAccountObj.category as string) === 'Cash'
        )) ||
        /bank|banco|cuenta.*banco|transfer.*bank|inter-bank|interbank/i.test(targetName) ||
        /inter-bank|transfer.*bank|transferencia.*banco/i.test(row.Description || '');

    const hasSupplier = Boolean(row.supplier || (row.supplierName && String(row.supplierName).trim()));
    const hasDriverName = Boolean((row.driverName && String(row.driverName).trim()) || row.isDriver);
    const hasCustomerName = Boolean((row.customerName && String(row.customerName).trim()) || row.isCustomer || row.customer);

    if (isBankTypeOrName && !hasCustomerName && !hasDriverName && !hasSupplier) {
        return {
            code: 'INTER_BANK',
            label: 'Inter-Bank',
            icon: '🏦',
            badgeStyle: 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
        };
    }

    if (hasSupplier) {
        return {
            code: 'VENDOR',
            label: 'Vendor',
            icon: '🏢',
            badgeStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
        };
    }

    if (hasDriverName) {
        return {
            code: 'DRIVER',
            label: 'Driver',
            icon: '🏎️',
            badgeStyle: 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
        };
    }

    if (hasCustomerName) {
        return {
            code: 'NON_DRIVER_CUSTOMER',
            label: 'Customer',
            icon: '👤',
            badgeStyle: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
        };
    }

    if (isBankTypeOrName) {
        return {
            code: 'INTER_BANK',
            label: 'Inter-Bank',
            icon: '🏦',
            badgeStyle: 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
        };
    }

    return {
        code: 'UNCLASSIFIED',
        label: 'General',
        icon: '📁',
        badgeStyle: 'bg-gray-500/10 text-gray-400 border border-gray-500/30'
    };
};

const parseSheetToJSON = (ws: XLSX.WorkSheet): any[] => {
    // Parse as 2D array first
    const rows2D: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (!rows2D || rows2D.length === 0) return [];

    // Find the header row index
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows2D.length, 30); i++) {
        const row = rows2D[i];
        if (Array.isArray(row)) {
            // Count matching target keywords
            const matchCount = row.filter(cell => {
                if (cell === undefined || cell === null) return false;
                const cleanCell = String(cell).trim().toLowerCase();
                return ['date', 'prefix', 'number', 'bank name', 'sub account', 'accounts name', 'parent account', 'receipt', 'payment', 'description', 'remarks', 'branch'].some(k => cleanCell.includes(k) || k.includes(cleanCell));
            }).length;
            if (matchCount >= 2) {
                headerIdx = i;
                break;
            }
        }
    }

    if (headerIdx >= 0) {
        const headers = rows2D[headerIdx].map(h => String(h || '').trim());
        return rows2D.slice(headerIdx + 1)
            .map(row => {
                const obj: any = {};
                headers.forEach((header, colIdx) => {
                    if (header) {
                        obj[header] = row[colIdx];
                    }
                });
                return obj;
            })
            .filter(row => {
                // Keep only rows that have at least one non-empty value
                return Object.values(row).some(v => v !== undefined && v !== null && String(v).trim() !== '');
            });
    }

    // Fallback if no header row was detected
    return XLSX.utils.sheet_to_json(ws);
};

const normalizeStr = (str: string) => {
    if (!str) return '';
    return str
        .replace(/\u00a0/g, ' ')
        .replace(/[\/\\_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const findAccountingCode = (
    queryStr: string,
    codes: AccountingCode[],
    bankAccounts?: BankAccount[]
): AccountingCode | undefined => {
    if (!queryStr) return undefined;
    const trimmedRaw = queryStr.trim();
    const cleanQuery = normalizeStr(queryStr);
    if (!cleanQuery) return undefined;

    // 0. Match against system Bank Accounts first (for Inter-Bank Transfers between /bank-accounts)
    if (bankAccounts && bankAccounts.length > 0) {
        const bankMatch = bankAccounts.find((a: BankAccount) => {
            const accName = normalizeStr(a.accountName || '');
            const bankName = normalizeStr(a.bankName || '');
            const accNum = normalizeStr(a.accountNumber || '');
            const combined = normalizeStr(`${a.bankName || ''} ${a.accountName || ''}`);
            const combinedRev = normalizeStr(`${a.accountName || ''} ${a.bankName || ''}`);
            return (
                accName === cleanQuery ||
                bankName === cleanQuery ||
                accNum === cleanQuery ||
                combined === cleanQuery ||
                combinedRev === cleanQuery ||
                (cleanQuery.length > 3 && (accName.includes(cleanQuery) || cleanQuery.includes(accName)))
            );
        });

        if (bankMatch && bankMatch.accountingCode) {
            const accCodeId = typeof bankMatch.accountingCode === 'object'
                ? String((bankMatch.accountingCode as any)._id || (bankMatch.accountingCode as any).id)
                : String(bankMatch.accountingCode);
            const codeFromBank = codes.find(c => String(c._id) === accCodeId);
            if (codeFromBank) return codeFromBank;
        }
    }

    // 1. Direct match on _id
    let match = codes.find(c => String(c._id) === trimmedRaw);
    if (match) return match;

    // 2. Direct match on code (e.g. "1.1.02-1" or "1.1.02.1")
    match = codes.find(c => c.code && (c.code.trim() === trimmedRaw || normalizeStr(c.code) === cleanQuery));
    if (match) return match;

    // 3. Exact normalized match on AccountingCode name
    match = codes.find(c => c.name && normalizeStr(c.name) === cleanQuery);
    if (match) return match;

    // 4. Check formatted strings like "code - name" or "name (code)"
    match = codes.find(c => {
        const formatted1 = normalizeStr(`${c.code || ''} ${c.name || ''}`);
        const formatted2 = normalizeStr(`${c.name || ''} ${c.code || ''}`);
        return formatted1 === cleanQuery || formatted2 === cleanQuery;
    });
    if (match) return match;

    // 6. Substring match: if cleanQuery is in account name or account name is in cleanQuery
    match = codes.find(c => {
        if (!c.name) return false;
        const normName = normalizeStr(c.name);
        return normName.length > 3 && (normName.includes(cleanQuery) || cleanQuery.includes(normName));
    });
    if (match) return match;

    // 7. Token/Word similarity matching (e.g. "Banco", "General", "AH", "1601")
    const queryTokens = cleanQuery.split(' ').filter(t => t.length > 0);
    if (queryTokens.length > 1) {
        match = codes.find(c => {
            if (!c.name) return false;
            const normName = normalizeStr(c.name);
            return queryTokens.every(token => normName.includes(token));
        });
        if (match) return match;

        if (bankAccounts && bankAccounts.length > 0) {
            const bankMatch = bankAccounts.find((a: BankAccount) => {
                const combined = normalizeStr(`${a.bankName || ''} ${a.accountName || ''}`);
                return queryTokens.every(token => combined.includes(token));
            });
            if (bankMatch && bankMatch.accountingCode) {
                const accCodeId = typeof bankMatch.accountingCode === 'object'
                    ? String((bankMatch.accountingCode as any)._id || (bankMatch.accountingCode as any).id)
                    : String(bankMatch.accountingCode);
                const codeFromBank = codes.find(c => String(c._id) === accCodeId);
                if (codeFromBank) return codeFromBank;
            }
        }
    }

    // 8. Intelligent translation/keyword match for common heads
    if (cleanQuery.includes("receivable") || cleanQuery.includes("cobrar")) {
        match = codes.find(c => c.code === "1.1.03");
        if (match) return match;
    }
    if (cleanQuery.includes("payable") || cleanQuery.includes("pagar")) {
        match = codes.find(c => c.code === "2.1.01");
        if (match) return match;
    }

    return undefined;
};

const getRowVal = (r: any, keys: string[]): any => {
    if (!r) return undefined;
    for (const key of keys) {
        const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
        if (r[key] !== undefined && r[key] !== '') return r[key];
        for (const k of Object.keys(r)) {
            if (k.replace(/^\ufeff/, '').trim().toLowerCase() === cleanKey) {
                if (r[k] !== undefined && r[k] !== '') return r[k];
            }
        }
    }
    return undefined;
};

const BulkLedgerUpload = ({ isOpen, onClose, onSuccess }: BulkLedgerUploadProps = {}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isAsPage = isOpen === undefined;
    const queryAccountId = searchParams.get('accountId');

    const fileRef = useRef<HTMLInputElement>(null);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [clearExisting] = useState(false);

    const [accountSearchQuery, setAccountSearchQuery] = useState('');
    const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
    const accountDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target as Node)) {
                setIsAccountDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedAccount = accounts.find(acc => acc._id === selectedAccountId);
    const filteredAccounts = accounts.filter(acc => {
        const name = (acc.accountName || acc.bankName || '').toLowerCase();
        const num = (acc.accountNumber || '').toLowerCase();
        const query = accountSearchQuery.toLowerCase();
        return name.includes(query) || num.includes(query);
    });

    const [loadingData, setLoadingData] = useState(false);
    const [rows, setRows] = useState<ParsedTransaction[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [allAccountingCodes, setAllAccountingCodes] = useState<AccountingCode[]>([]);
    const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [allBills, setAllBills] = useState<Bill[]>([]);
    const [expandedSetOffRows, setExpandedSetOffRows] = useState<Record<number, boolean>>({});
    const [uploadLiveStats, setUploadLiveStats] = useState<UploadLiveStats | null>(null);

    const [tableFilter, setTableFilter] = useState<'all' | 'valid' | 'errors'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(50);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const [showErrorsModal, setShowErrorsModal] = useState(false);
    const [errorCategoryFilter, setErrorCategoryFilter] = useState<string>('all');
    const [errorSearchQuery, setErrorSearchQuery] = useState('');
    const [resultActiveTab, setResultActiveTab] = useState<'entered' | 'skipped' | 'setoff'>('entered');

    // Load bank accounts, branches, customers, suppliers, invoices and supplier bills on mount
    useEffect(() => {
        if (isOpen || isAsPage) {
            const fetchData = async () => {
                setLoadingData(true);
                try {
                    const [accountsRes, branchesRes, codesRes, customersRes, suppliersRes, invoicesRes, billsRes] = await Promise.all([
                        getAllBankAccounts({ limit: 100 }),
                        getAllBranches({ limit: 100 }),
                        getAllAccountingCodes({ limit: 1000 }),
                        getAllCustomers({ limit: 10000, branch: 'ALL' }),
                        (getAllSuppliers as any)({ limit: 10000, branch: 'ALL' }),
                        getInvoices({ limit: 10000, status: 'PENDING,PARTIAL,OVERDUE', ignoreDefaultDates: true }),
                        getAllBills({ limit: 10000, status: 'OPEN,PARTIALLY_PAID,DRAFT', ignoreDefaultDates: true }).catch(() => ({ data: [] }))
                    ]);

                    const accountsList = accountsRes.data || accountsRes || [];
                    const branchesList = branchesRes.data || branchesRes || [];
                    const codesList = Array.isArray(codesRes) ? codesRes : ((codesRes as any).data || []);
                    const customersList = customersRes.data || customersRes || [];
                    const suppliersList = suppliersRes.data || suppliersRes || [];
                    const invoiceList = invoicesRes.data || (invoicesRes as any).invoices || [];
                    const billList = (billsRes as any).data || billsRes || [];

                    const activeAccounts = accountsList.filter((a: BankAccount) => a.status === 'ACTIVE');
                    setAccounts(activeAccounts);
                    setBranches(branchesList.filter((b: Branch) => b.status === 'ACTIVE'));
                    setAllAccountingCodes(codesList);
                    setAllCustomers(customersList);
                    setAllSuppliers(suppliersList);
                    setAllInvoices(invoiceList);
                    setAllBills(Array.isArray(billList) ? billList : []);

                    // Auto-select query accountId if present, otherwise Banco General AH 1601 or first account
                    if (queryAccountId && activeAccounts.some((a: BankAccount) => a._id === queryAccountId)) {
                        setSelectedAccountId(queryAccountId);
                    } else {
                        const bg1601 = activeAccounts.find((a: BankAccount) =>
                            a.accountName?.toLowerCase().includes('banco general') &&
                            a.accountName?.toLowerCase().includes('1601')
                        );
                        if (bg1601) {
                            setSelectedAccountId(bg1601._id);
                        } else if (activeAccounts.length > 0) {
                            setSelectedAccountId(activeAccounts[0]._id);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch bulk upload pre-requisites", err);
                    toast.error("Failed to load active bank accounts, branches, customers or suppliers");
                } finally {
                    setLoadingData(false);
                }
            };
            fetchData();
        }
    }, [isOpen, isAsPage, queryAccountId]);

interface SetOffDetail {
    invoiceNumber: string;
    amountApplied: number;
    dueBalance: number;
    newBalance: number;
    newStatus: string;
    dueDate?: string;
}

interface SetOffPreview {
    customerName: string;
    receiptAmount: number;
    totalSetOff: number;
    excessAmount: number;
    setOffDetails: SetOffDetail[];
    targetType?: 'CUSTOMER' | 'SUPPLIER';
}

    const cumulativeSetOffPreviews = useMemo<Map<number, SetOffPreview | null>>(() => {
        if (!rows || rows.length === 0) {
            return new Map<number, SetOffPreview | null>();
        }

        const runningBalanceMap: Record<string, number> = {};
        const isOverdueMap: Record<string, boolean> = {};

        const runningBillBalanceMap: Record<string, number> = {};
        const isBillOverdueMap: Record<string, boolean> = {};

        const checkOverdue = (inv: any) => {
            const st = String(inv.status || '').toUpperCase();
            if (st === 'OVERDUE') return true;
            if (inv.dueDate) {
                return new Date(inv.dueDate).getTime() < Date.now();
            }
            return false;
        };

        const getInvoiceCustomerId = (inv: any): string => {
            if (!inv) return '';
            if (inv.customer) {
                if (typeof inv.customer === 'object') return String(inv.customer._id || inv.customer.id || '');
                return String(inv.customer);
            }
            if (inv.customerId) {
                if (typeof inv.customerId === 'object') return String(inv.customerId._id || inv.customerId.id || '');
                return String(inv.customerId);
            }
            if (inv.driver) {
                const driverObj = typeof inv.driver === 'object' ? inv.driver : null;
                if (driverObj && driverObj.customer) {
                    return String(typeof driverObj.customer === 'object' ? driverObj.customer._id : driverObj.customer);
                }
            }
            return '';
        };

        const getBillSupplierId = (b: any): string => {
            if (!b) return '';
            if (b.supplier) {
                if (typeof b.supplier === 'object') return String(b.supplier._id || b.supplier.id || '');
                return String(b.supplier);
            }
            if (b.supplierId) {
                if (typeof b.supplierId === 'object') return String(b.supplierId._id || b.supplierId.id || '');
                return String(b.supplierId);
            }
            if (b.vendor) {
                if (typeof b.vendor === 'object') return String(b.vendor._id || b.vendor.id || '');
                return String(b.vendor);
            }
            return '';
        };

        // Pre-index open invoices and bills by entity for O(1) instant candidate access
        const customerInvoicesMap = new Map<string, any[]>();
        allInvoices.forEach(inv => {
            const bal = inv.balance ?? (inv.totalAmountDue - (inv.amountPaid || 0));
            runningBalanceMap[inv._id] = bal;
            isOverdueMap[inv._id] = checkOverdue(inv);

            const custId = getInvoiceCustomerId(inv);
            if (custId) {
                if (!customerInvoicesMap.has(custId)) customerInvoicesMap.set(custId, []);
                customerInvoicesMap.get(custId)!.push(inv);
            }
        });

        const supplierBillsMap = new Map<string, any[]>();
        allBills.forEach(b => {
            const bal = b.balanceDue ?? (b.totalAmount - (b.amountPaid || 0));
            runningBillBalanceMap[b._id] = bal;
            isBillOverdueMap[b._id] = b.dueDate ? (new Date(b.dueDate).getTime() < Date.now()) : false;

            const supId = getBillSupplierId(b);
            const supName = typeof b.supplier === 'object' ? String(b.supplier?.name || b.supplier?.companyName || '').toLowerCase().trim() : '';
            if (supId) {
                if (!supplierBillsMap.has(supId)) supplierBillsMap.set(supId, []);
                supplierBillsMap.get(supId)!.push(b);
            }
            if (supName && supName !== supId) {
                if (!supplierBillsMap.has(supName)) supplierBillsMap.set(supName, []);
                supplierBillsMap.get(supName)!.push(b);
            }
        });

        const previewsMap = new Map<number, SetOffPreview | null>();

        rows.forEach((row, rowIndex) => {
            // Customer Receipt set-off
            if (row.customer && (row["Transaction Type"] === 'DEBIT' || (row.Debit || 0) > 0)) {
                const customerId = String(row.customer._id || (row.customer as any).id || '');
                const amount = row.Amount || row.Debit || 0;

                const candidateInvoices = customerInvoicesMap.get(customerId) || [];
                const openInvoices = candidateInvoices.filter(inv => {
                    const currentBal = runningBalanceMap[inv._id] ?? 0;
                    const statusStr = String(inv.status || '').toUpperCase();
                    return ['PENDING', 'PARTIAL', 'OVERDUE'].includes(statusStr) && currentBal > 0;
                });

                const overdueInvoices = openInvoices
                    .filter(inv => isOverdueMap[inv._id])
                    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

                const nonOverduePartialInvoices = openInvoices
                    .filter(inv => !isOverdueMap[inv._id] && String(inv.status).toUpperCase() === 'PARTIAL')
                    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

                const nonOverduePendingInvoices = openInvoices
                    .filter(inv => !isOverdueMap[inv._id] && String(inv.status).toUpperCase() !== 'PARTIAL')
                    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

                const sortedInvoices = [...overdueInvoices, ...nonOverduePartialInvoices, ...nonOverduePendingInvoices];

                let remaining = amount;
                const setOffDetails: Array<{
                    invoiceNumber: string;
                    amountApplied: number;
                    dueBalance: number;
                    newBalance: number;
                    newStatus: string;
                    dueDate?: string;
                }> = [];

                let totalSetOff = 0;

                for (const inv of sortedInvoices) {
                    if (remaining <= 0.01) break;
                    const currentInvBal = runningBalanceMap[inv._id] ?? 0;
                    if (currentInvBal <= 0) continue;

                    const amountToApply = Math.min(remaining, currentInvBal);
                    const newBal = Math.max(0, currentInvBal - amountToApply);

                    runningBalanceMap[inv._id] = newBal;

                    const isInvOverdue = isOverdueMap[inv._id];
                    const newStatus = newBal <= 0 ? 'PAID' : (isInvOverdue ? 'OVERDUE' : 'PARTIAL');

                    setOffDetails.push({
                        invoiceNumber: inv.invoiceNumber,
                        amountApplied: amountToApply,
                        dueBalance: currentInvBal,
                        newBalance: newBal,
                        newStatus,
                        dueDate: inv.dueDate
                    });

                    totalSetOff += amountToApply;
                    remaining -= amountToApply;
                }

                const excessAmount = Math.max(0, amount - totalSetOff);

                previewsMap.set(rowIndex, {
                    customerName: row.customer.name,
                    receiptAmount: amount,
                    totalSetOff,
                    excessAmount,
                    setOffDetails,
                    targetType: 'CUSTOMER'
                });
                return;
            }

            // Supplier Payment set-off
            if (row.supplier && (row["Transaction Type"] === 'CREDIT' || (row.Credit || 0) > 0 || (row.Payment || 0) > 0)) {
                const supplierId = String(row.supplier._id || (row.supplier as any).id || '');
                const rowSupName = String(row.supplier.name || (row.supplier as any).companyName || '').toLowerCase().trim();
                const amount = row.Amount || row.Credit || row.Payment || 0;

                const candidateBills = (supplierBillsMap.get(supplierId) || []).concat(rowSupName ? (supplierBillsMap.get(rowSupName) || []) : []);
                const uniqueCandidateBills = Array.from(new Set(candidateBills));
                const openBills = uniqueCandidateBills.filter(b => {
                    const currentBal = runningBillBalanceMap[b._id] ?? 0;
                    const statusStr = String(b.status || '').toUpperCase();
                    return ['OPEN', 'PARTIALLY_PAID', 'DRAFT', 'PARTIAL', 'PENDING'].includes(statusStr) && currentBal > 0;
                });

                const overdueBills = openBills
                    .filter(b => isBillOverdueMap[b._id])
                    .sort((x, y) => new Date(x.dueDate || 0).getTime() - new Date(y.dueDate || y.billDate || 0).getTime());

                const nonOverduePartialBills = openBills
                    .filter(b => !isBillOverdueMap[b._id] && String(b.status).toUpperCase().includes('PARTIAL'))
                    .sort((x, y) => new Date(x.dueDate || 0).getTime() - new Date(y.dueDate || y.billDate || 0).getTime());

                const nonOverdueOpenBills = openBills
                    .filter(b => !isBillOverdueMap[b._id] && !String(b.status).toUpperCase().includes('PARTIAL'))
                    .sort((x, y) => new Date(x.dueDate || 0).getTime() - new Date(y.dueDate || y.billDate || 0).getTime());

                const sortedBills = [...overdueBills, ...nonOverduePartialBills, ...nonOverdueOpenBills];

                let remaining = amount;
                const setOffDetails: Array<{
                    invoiceNumber: string;
                    amountApplied: number;
                    dueBalance: number;
                    newBalance: number;
                    newStatus: string;
                    dueDate?: string;
                }> = [];

                let totalSetOff = 0;

                for (const b of sortedBills) {
                    if (remaining <= 0.01) break;
                    const currentBal = runningBillBalanceMap[b._id] ?? 0;
                    if (currentBal <= 0) continue;

                    const amountToApply = Math.min(remaining, currentBal);
                    const newBal = Math.max(0, currentBal - amountToApply);

                    runningBillBalanceMap[b._id] = newBal;

                    const isBOverdue = isBillOverdueMap[b._id];
                    const newStatus = newBal <= 0 ? 'PAID' : (isBOverdue ? 'OVERDUE' : 'PARTIALLY_PAID');

                    setOffDetails.push({
                        invoiceNumber: b.billNumber,
                        amountApplied: amountToApply,
                        dueBalance: currentBal,
                        newBalance: newBal,
                        newStatus,
                        dueDate: b.dueDate
                    });

                    totalSetOff += amountToApply;
                    remaining -= amountToApply;
                }

                const excessAmount = Math.max(0, amount - totalSetOff);

                previewsMap.set(rowIndex, {
                    customerName: row.supplier.name || (row.supplier as any).companyName || 'Supplier',
                    receiptAmount: amount,
                    totalSetOff,
                    excessAmount,
                    setOffDetails,
                    targetType: 'SUPPLIER'
                });
                return;
            }

            previewsMap.set(rowIndex, null);
        });

        return previewsMap;
    }, [rows, allInvoices, allBills]);

    const parseDateFlexible = (val: any): Date | null => {
        if (val === undefined || val === null) return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
        if (typeof val === 'number') {
            const totalDays = Math.floor(val - 25569);
            const date = new Date(Date.UTC(1970, 0, 1 + totalDays));
            return isNaN(date.getTime()) ? null : date;
        }
        const str = String(val).trim();
        if (!str) return null;
        if (/^\d{5}(\.\d+)?$/.test(str)) {
            const num = parseFloat(str);
            const totalDays = Math.floor(num - 25569);
            const date = new Date(Date.UTC(1970, 0, 1 + totalDays));
            return isNaN(date.getTime()) ? null : date;
        }
        const parts = str.split(/[\/\-.]/);
        if (parts.length === 3) {
            let year = 0, month = 0, day = 0;
            if (parts[0].length === 4) {
                year = parseInt(parts[0], 10);
                month = parseInt(parts[1], 10);
                day = parseInt(parts[2], 10);
            } else if (parts[2].length === 4 || parts[2].length === 2) {
                const p1 = parseInt(parts[0], 10);
                const p2 = parseInt(parts[1], 10);
                const p3 = parseInt(parts[2], 10);
                year = p3 < 100 ? 2000 + p3 : p3;

                if (p1 > 12 && p2 <= 12) {
                    day = p1;
                    month = p2;
                } else if (p1 <= 12 && p2 > 12) {
                    month = p1;
                    day = p2;
                } else {
                    // Default to DD-MM-YYYY format
                    day = p1;
                    month = p2;
                }
            }
            if (year && month && day) {
                const date = new Date(Date.UTC(year, month - 1, day));
                if (!isNaN(date.getTime())) return date;
            }
        }
        const fallback = new Date(str);
        if (isNaN(fallback.getTime())) return null;
        const date = new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
        return date;
    };

    const cleanNumber = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        const str = String(val).replace(/[^\d.-]/g, '');
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatDateDMY = (dateStr: string): string => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}-${month}-${year}`;
    };

    const validateRow = useCallback((
        row: any,
        targetAccount?: BankAccount,
        fileTxIdCounts?: Map<string, number>
    ): string[] => {
        const errors: string[] = [];

        const dateVal = getRowVal(row, ['date', 'Date', 'DATE']);
        const prefixVal = getRowVal(row, ['prefix', 'Prefix', 'PREFIX']);
        const numberVal = getRowVal(row, ['number', 'Number', 'NUMBER']);
        const bankNameVal = getRowVal(row, ['bank name', 'bank_name', 'Bank Name', 'BANK NAME']);
        const rawReceipt = getRowVal(row, ['receipt', 'Receipt', 'RECEIPT']);
        const rawPayment = getRowVal(row, ['payment', 'Payment', 'PAYMENT']);
        const receiptVal = cleanNumber(rawReceipt);
        const paymentVal = cleanNumber(rawPayment);

        if (!dateVal) {
            errors.push('Missing Date');
        } else {
            const parsedDate = parseDateFlexible(dateVal);
            if (!parsedDate) {
                errors.push('Invalid Date format');
            }
        }

        if (prefixVal === undefined || prefixVal === null || String(prefixVal).trim() === '') {
            errors.push('Missing Prefix');
        }

        if (numberVal === undefined || numberVal === null || String(numberVal).trim() === '') {
            errors.push('Missing Number');
        }

        if (prefixVal && numberVal) {
            const txIdStr = `${String(prefixVal).trim()}${String(numberVal).trim()}`;
            if (fileTxIdCounts && (fileTxIdCounts.get(txIdStr) || 0) > 1) {
                errors.push(`Duplicate Transaction ID "${txIdStr}" appears in upload file`);
            } else if (rows && rows.length > 0) {
                const count = rows.filter(r => {
                    const rRaw = r._rawRow || r;
                    const rP = getRowVal(rRaw, ['prefix', 'Prefix', 'PREFIX']);
                    const rN = getRowVal(rRaw, ['number', 'Number', 'NUMBER']);
                    return rP && rN && `${String(rP).trim()}${String(rN).trim()}` === txIdStr;
                }).length;
                if (count > 1) {
                    errors.push(`Duplicate Transaction ID "${txIdStr}" in file`);
                }
            }
        }

        const parentAccountVal = getRowVal(row, ['parent account', 'parent_account', 'Parent Account', 'PARENT ACCOUNT']);
        const parentAccountStr = String(parentAccountVal || '').trim();

        if (parentAccountStr) {
            const parentCode = findAccountingCode(parentAccountStr, allAccountingCodes);
            if (!parentCode) {
                errors.push(`Parent Account "${parentAccountStr}" not found in Chart of Accounts`);
            }
        }

        const accountsNameVal = getRowVal(row, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']);
        const accountsNameStr = String(accountsNameVal || '').trim();

        if (accountsNameStr) {
            const offsetCode = findAccountingCode(accountsNameStr, allAccountingCodes, accounts);
            if (!offsetCode) {
                errors.push(`Accounts Name "${accountsNameStr}" not found in Chart of Accounts or Bank Accounts`);
            }
        }

        const activeAccount = targetAccount || selectedAccount;
        if (!bankNameVal) {
            errors.push('Missing Bank Name');
        } else if (activeAccount) {
            const excelBank = String(bankNameVal).trim().toLowerCase();
            const selBank = String(activeAccount.bankName || '').trim().toLowerCase();
            const selAccName = String(activeAccount.accountName || '').trim().toLowerCase();
            
            const isMatch = (
                excelBank.includes(selBank) ||
                selBank.includes(excelBank) ||
                excelBank.includes(selAccName) ||
                selAccName.includes(excelBank)
            );
            if (!isMatch) {
                errors.push(`Bank name mismatch: Excel has "${bankNameVal}", but selected bank is "${activeAccount.accountName || activeAccount.bankName}"`);
            }
        }



        if (receiptVal < 0) errors.push('Receipt cannot be negative');
        if (paymentVal < 0) errors.push('Payment cannot be negative');
        if (receiptVal === 0 && paymentVal === 0) {
            errors.push('Transaction must have an amount (Receipt or Payment)');
        }
        if (receiptVal > 0 && paymentVal > 0) {
            errors.push('Row cannot have both Receipt and Payment');
        }

        const driverNameVal = getRowVal(row, ['driver name', 'driver_name', 'Driver Name', 'DRIVER NAME']);
        const supplierNameVal = getRowVal(row, ['supplier name', 'supplier_name', 'Supplier Name', 'SUPPLIER NAME']);
        const customerNameVal = getRowVal(row, ['customer name', 'customer_name', 'Customer Name', 'CUSTOMER NAME']);

        const hasEntity = Boolean(
            (driverNameVal && String(driverNameVal).trim()) ||
            (supplierNameVal && String(supplierNameVal).trim()) ||
            (customerNameVal && String(customerNameVal).trim()) ||
            row.customerId || row.supplierId || row.customer || row.supplier
        );

        if (!accountsNameStr && !parentAccountStr && !hasEntity) {
            errors.push('Missing Accounts Name: Please specify an Accounts Name or provide a Driver, Supplier, or Customer name');
        }

        const filledEntities = [driverNameVal, supplierNameVal, customerNameVal].filter(v => v && String(v).trim()).length;
        if (filledEntities > 1) {
            errors.push('Row cannot have more than one entity (Driver Name, Supplier Name, Customer Name) filled simultaneously');
        }

        const branchVal = getRowVal(row, ['branch', 'Branch', 'BRANCH']);
        if (!branchVal) {
            errors.push('Missing Branch');
        } else if (branches.length > 0) {
            const excelBranch = String(branchVal).trim().toLowerCase();
            // 1. Try exact name match
            let match = branches.find(b => b.name.trim().toLowerCase() === excelBranch);
            // 2. Try partial name match
            if (!match) {
                match = branches.find(b => {
                    const dbName = b.name.trim().toLowerCase();
                    return dbName.includes(excelBranch) || excelBranch.includes(dbName);
                });
            }
            // 3. Try type fallback
            if (!match) {
                const isWorkshopType = excelBranch.includes("workshop") || excelBranch.includes("taller");
                const targetType = isWorkshopType ? "WORKSHOP" : "BRANCH";
                match = branches.find(b => b.type === targetType);
            }

            if (!match) {
                errors.push(`Branch "${branchVal}" cannot be matched to any system branch`);
            }
        }

        return errors;
    }, [selectedAccount, branches, allAccountingCodes]);

    const matchCustomerHelper = useCallback((customerNameVal: string | undefined, customersList: Customer[]): Customer | undefined => {
        if (!customerNameVal || !String(customerNameVal).trim()) return undefined;
        const rawClean = String(customerNameVal).trim().toLowerCase();
        const strippedClean = rawClean.replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();

        // 1. Primary: Exact case-insensitive match
        let found = customersList.find(c => {
            const name = (c.name || '').toLowerCase().trim();
            const companyName = ((c as any).companyName || '').toLowerCase().trim();
            const displayName = ((c as any).displayName || '').toLowerCase().trim();
            const custNum = ((c as any).customerNumber || c.customerId || '').toLowerCase().trim();
            return (name === rawClean || companyName === rawClean || displayName === rawClean || custNum === rawClean);
        });
        if (found) return found;

        // 2. Secondary: Substring match
        found = customersList.find(c => {
            const name = (c.name || '').toLowerCase().trim();
            const companyName = ((c as any).companyName || '').toLowerCase().trim();
            const displayName = ((c as any).displayName || '').toLowerCase().trim();
            return (
                (name && (name.includes(rawClean) || rawClean.includes(name))) ||
                (companyName && (companyName.includes(rawClean) || rawClean.includes(companyName))) ||
                (displayName && (displayName.includes(rawClean) || rawClean.includes(displayName)))
            );
        });
        if (found) return found;

        // 3. Tertiary: Punctuation & normalized whitespace match
        if (strippedClean) {
            found = customersList.find(c => {
                const cleanCName = (c.name || '').toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanCComp = ((c as any).companyName || '').toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanCDisp = ((c as any).displayName || '').toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
                return (
                    (cleanCName && (cleanCName === strippedClean || cleanCName.includes(strippedClean) || strippedClean.includes(cleanCName))) ||
                    (cleanCComp && (cleanCComp === strippedClean || cleanCComp.includes(strippedClean) || strippedClean.includes(cleanCComp))) ||
                    (cleanCDisp && (cleanCDisp === strippedClean || cleanCDisp.includes(strippedClean) || strippedClean.includes(cleanCDisp)))
                );
            });
            if (found) return found;
        }

        // 4. Token Word Overlap (e.g. "ARRENDADORA OLA CARS" matches "ARRENDADORA OLA CARS, S.A.")
        const tokens = strippedClean.split(' ').filter(t => t.length > 2 && t !== 's.a' && t !== 'sa' && t !== 'inc' && t !== 'corp');
        if (tokens.length > 0) {
            found = customersList.find(c => {
                const targetStr = `${c.name || ''} ${(c as any).companyName || ''} ${(c as any).displayName || ''}`.toLowerCase();
                return tokens.every(token => targetStr.includes(token));
            });
            if (found) return found;
        }

        return undefined;
    }, []);

    const matchSupplierHelper = useCallback((supplierNameVal: string | undefined, suppliersList: Supplier[]): Supplier | undefined => {
        if (!supplierNameVal || !String(supplierNameVal).trim()) return undefined;
        const rawCleanSup = String(supplierNameVal).trim().toLowerCase();
        const strippedCleanSup = rawCleanSup.replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();

        let found = suppliersList.find(s => {
            const name = (s.name || '').toLowerCase().trim();
            const companyName = ((s as any).companyName || '').toLowerCase().trim();
            const displayName = ((s as any).displayName || '').toLowerCase().trim();
            const vendorNum = ((s as any).vendorNumber || '').toLowerCase().trim();
            const supCode = ((s as any).supplierCode || '').toLowerCase().trim();

            return (
                name === rawCleanSup ||
                companyName === rawCleanSup ||
                displayName === rawCleanSup ||
                vendorNum === rawCleanSup ||
                supCode === rawCleanSup
            );
        });
        if (found) return found;

        found = suppliersList.find(s => {
            const name = (s.name || '').toLowerCase().trim();
            const companyName = ((s as any).companyName || '').toLowerCase().trim();
            return (
                (name && (name.includes(rawCleanSup) || rawCleanSup.includes(name))) ||
                (companyName && (companyName.includes(rawCleanSup) || rawCleanSup.includes(companyName)))
            );
        });
        if (found) return found;

        if (strippedCleanSup) {
            found = suppliersList.find(s => {
                const cleanSName = (s.name || '').toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
                const cleanSComp = ((s as any).companyName || '').toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
                return (
                    (cleanSName && (cleanSName === strippedCleanSup || cleanSName.includes(strippedCleanSup) || strippedCleanSup.includes(cleanSName))) ||
                    (cleanSComp && (cleanSComp === strippedCleanSup || cleanSComp.includes(strippedCleanSup) || strippedCleanSup.includes(cleanSComp)))
                );
            });
            if (found) return found;
        }

        const tokens = strippedCleanSup.split(' ').filter(t => t.length > 2 && t !== 's.a' && t !== 'sa' && t !== 'inc' && t !== 'corp');
        if (tokens.length > 0) {
            found = suppliersList.find(s => {
                const targetStr = `${s.name || ''} ${(s as any).companyName || ''} ${(s as any).displayName || ''}`.toLowerCase();
                return tokens.every(token => targetStr.includes(token));
            });
            if (found) return found;
        }

        return undefined;
    }, []);

    const revalidateAndRecalculateRows = useCallback((
        currentRows: ParsedTransaction[],
        targetAccount: BankAccount | undefined
    ) => {
        if (!currentRows || currentRows.length === 0) return [];

        let balanceAccum = targetAccount ? (targetAccount.currentBalance || targetAccount.initialBalance || 0) : 0;
        const isCreditCard = targetAccount?.accountType === 'Credit Card';

        const fileTxIdCounts = new Map<string, number>();
        currentRows.forEach(r => {
            const raw = r._rawRow || r;
            const p = getRowVal(raw, ['prefix', 'Prefix', 'PREFIX']);
            const n = getRowVal(raw, ['number', 'Number', 'NUMBER']);
            if (p !== undefined && n !== undefined && p !== null && n !== null) {
                const id = `${String(p).trim()}${String(n).trim()}`;
                if (id) fileTxIdCounts.set(id, (fileTxIdCounts.get(id) || 0) + 1);
            }
        });

        return currentRows.map(row => {
            const raw = row._rawRow || row;
            const errors = validateRow(raw, targetAccount, fileTxIdCounts);

            const receiptVal = cleanNumber(getRowVal(raw, ['receipt', 'Receipt', 'RECEIPT']));
            const paymentVal = cleanNumber(getRowVal(raw, ['payment', 'Payment', 'PAYMENT']));
            let amountVal = receiptVal > 0 ? receiptVal : paymentVal;

            let resolvedType: 'DEBIT' | 'CREDIT' = 'DEBIT';
            if (receiptVal > 0 && paymentVal === 0) {
                resolvedType = 'DEBIT';
            } else if (paymentVal > 0 && receiptVal === 0) {
                resolvedType = 'CREDIT';
            }

            if (resolvedType === 'DEBIT') {
                balanceAccum = isCreditCard ? (balanceAccum - amountVal) : (balanceAccum + amountVal);
            } else if (resolvedType === 'CREDIT') {
                balanceAccum = isCreditCard ? (balanceAccum + amountVal) : (balanceAccum - amountVal);
            }

            const accountsNameVal = getRowVal(raw, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']);
            const accountsNameStr = String(accountsNameVal || '').trim();
            const matchedAccount = findAccountingCode(accountsNameStr, allAccountingCodes, accounts);

            const driverNameVal = getRowVal(raw, ['driver name', 'driver_name', 'Driver Name', 'DRIVER NAME']);
            const supplierNameVal = getRowVal(raw, ['supplier name', 'supplier_name', 'Supplier Name', 'SUPPLIER NAME']);
            const customerNameVal = getRowVal(raw, ['customer name', 'customer_name', 'Customer Name', 'CUSTOMER NAME']);

            const isDriver = Boolean(driverNameVal && String(driverNameVal).trim());
            const isCustomer = Boolean(customerNameVal && String(customerNameVal).trim() && !isDriver);

            const matchedCustomer = row.customer || matchCustomerHelper(driverNameVal ? String(driverNameVal) : (customerNameVal ? String(customerNameVal) : undefined), allCustomers);
            const matchedSupplier = row.supplier || matchSupplierHelper(supplierNameVal ? String(supplierNameVal) : undefined, allSuppliers);

            return {
                ...row,
                "Running Balance": balanceAccum,
                accountsName: accountsNameStr || undefined,
                matchedAccount,
                customer: matchedCustomer,
                driverName: driverNameVal ? String(driverNameVal).trim() : undefined,
                customerName: customerNameVal ? String(customerNameVal).trim() : undefined,
                isDriver,
                isCustomer,
                supplier: matchedSupplier,
                supplierName: supplierNameVal ? String(supplierNameVal).trim() : undefined,
                _rowErrors: errors
            };
        });
    }, [validateRow, allAccountingCodes, accounts, allCustomers, allSuppliers, matchCustomerHelper, matchSupplierHelper]);

    useEffect(() => {
        if (!selectedAccountId) return;
        const targetAccount = accounts.find(acc => acc._id === selectedAccountId);
        if (rows.length > 0) {
            setRows(prev => revalidateAndRecalculateRows(prev, targetAccount));
        }
    }, [selectedAccountId, accounts, revalidateAndRecalculateRows]);

    // Targeted async API search fallback for unmatched customer names in uploaded sheet (limited to first 10 for performance)
    useEffect(() => {
        if (rows.length > 0) {
            const unmatched = rows
                .filter(r => r.customerName && !r.customer)
                .map(r => r.customerName as string);

            const uniqueUnmatched = Array.from(new Set(unmatched)).slice(0, 10);
            if (uniqueUnmatched.length > 0) {
                uniqueUnmatched.forEach(async (nameStr) => {
                    try {
                        const res = await getAllCustomers({ search: nameStr, limit: 20, branch: 'ALL' });
                        const fetched = res.data || res || [];
                        if (Array.isArray(fetched) && fetched.length > 0) {
                            setAllCustomers(prev => {
                                const newMap = new Map(prev.map(c => [c._id, c]));
                                fetched.forEach(c => newMap.set(c._id, c));
                                return Array.from(newMap.values());
                            });
                        }
                    } catch (e) {
                        console.error("Async customer lookup failed:", e);
                    }
                });
            }
        }
    }, [rows]);

    const getErrorCategory = useCallback((err: string): 'duplicate' | 'account' | 'branch' | 'missing' | 'other' => {
        const l = err.toLowerCase();
        if (l.includes('already exists') || l.includes('duplicate')) return 'duplicate';
        if (l.includes('chart of accounts') || l.includes('bank accounts') || l.includes('bank name mismatch') || l.includes('parent account') || l.includes('accounts name')) return 'account';
        if (l.includes('branch')) return 'branch';
        if (l.includes('missing') || l.includes('format') || l.includes('receipt') || l.includes('payment') || l.includes('amount') || l.includes('entity')) return 'missing';
        return 'other';
    }, []);

    const errorRowsWithIndex = useMemo(() => {
        return rows
            .map((row, index) => ({ row, index }))
            .filter(({ row }) => row._rowErrors && row._rowErrors.length > 0);
    }, [rows]);

    const errorCategoryCounts = useMemo(() => {
        const counts = { all: errorRowsWithIndex.length, duplicate: 0, account: 0, branch: 0, missing: 0, other: 0 };
        errorRowsWithIndex.forEach(({ row }) => {
            const categories = new Set(row._rowErrors.map(getErrorCategory));
            categories.forEach(cat => {
                if (cat in counts) counts[cat as keyof typeof counts]++;
            });
        });
        return counts;
    }, [errorRowsWithIndex, getErrorCategory]);

    const filteredErrorRows = useMemo(() => {
        return errorRowsWithIndex.filter(({ row, index }) => {
            if (errorCategoryFilter !== 'all') {
                const matchesCat = row._rowErrors.some(err => getErrorCategory(err) === errorCategoryFilter);
                if (!matchesCat) return false;
            }
            if (errorSearchQuery.trim()) {
                const q = errorSearchQuery.toLowerCase();
                const raw = row._rawRow || {};
                const matchRow = (
                    String(index + 1).includes(q) ||
                    String(row.Description || '').toLowerCase().includes(q) ||
                    String(row.transactionId || '').toLowerCase().includes(q) ||
                    String(row.accountsName || '').toLowerCase().includes(q) ||
                    String(getRowVal(raw, ['bank name', 'Bank Name']) || '').toLowerCase().includes(q) ||
                    row._rowErrors.some(err => err.toLowerCase().includes(q))
                );
                if (!matchRow) return false;
            }
            return true;
        });
    }, [errorRowsWithIndex, errorCategoryFilter, errorSearchQuery, getErrorCategory]);

    const displayedRowsWithIndex = useMemo(() => {
        return rows
            .map((row, originalIndex) => ({ row, originalIndex }))
            .filter(({ row }) => {
                if (tableFilter === 'valid') return row._rowErrors.length === 0;
                if (tableFilter === 'errors') return row._rowErrors.length > 0;
                return true;
            });
    }, [rows, tableFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [tableFilter, pageSize]);

    const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(displayedRowsWithIndex.length / pageSize));

    const paginatedRowsWithIndex = useMemo(() => {
        if (pageSize === -1) return displayedRowsWithIndex;
        const start = (currentPage - 1) * pageSize;
        return displayedRowsWithIndex.slice(start, start + pageSize);
    }, [displayedRowsWithIndex, currentPage, pageSize]);

    const downloadFailedRowsCSV = (failed: ParsedTransaction[], nameOfFile: string, customSuffix = '') => {
        if (!failed || failed.length === 0) {
            toast.error("No failed rows to download.");
            return;
        }

        const csvHeaders = ["DATE", "PREFIX", "NUMBER", "BANK NAME", "SUB ACCOUNT", "PARENT ACCOUNT", "RECEIPT", "PAYMENT", "DESCRIPTION", "REMARKS", "BRANCH", "DRIVER NAME", "SUPPLIER NAME", "CUSTOMER NAME", "Errors"];
        const csvRows = failed.map(r => {
            const raw = r._rawRow || {};
            return [
                `"${String(getRowVal(raw, ['date', 'Date', 'DATE']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['prefix', 'Prefix', 'PREFIX']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['number', 'Number', 'NUMBER']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['bank name', 'bank_name', 'Bank Name', 'BANK NAME']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['parent account', 'parent_account', 'Parent Account', 'PARENT ACCOUNT']) || '').replace(/"/g, '""')}"`,
                String(cleanNumber(getRowVal(raw, ['receipt', 'Receipt', 'RECEIPT']))),
                String(cleanNumber(getRowVal(raw, ['payment', 'Payment', 'PAYMENT']))),
                `"${String(getRowVal(raw, ['description', 'Description', 'DESCRIPTION']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['remarks', 'Remarks', 'REMARKS']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['branch', 'Branch', 'BRANCH']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['driver name', 'driver_name', 'Driver Name', 'DRIVER NAME']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['supplier name', 'supplier_name', 'Supplier Name', 'SUPPLIER NAME']) || '').replace(/"/g, '""')}"`,
                `"${String(getRowVal(raw, ['customer name', 'customer_name', 'Customer Name', 'CUSTOMER NAME']) || '').replace(/"/g, '""')}"`,
                `"${r._rowErrors.join("; ").replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = nameOfFile ? nameOfFile.split('.')[0] : 'failed_transactions';
        link.setAttribute('download', `failed_rows_${name}${customSuffix ? `_${customSuffix}` : ''}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Downloaded ${failed.length} failed row(s) as CSV`);
    };

    const parseFile = (f: File) => {
        setIsParsingFile(true);
        setResult(null);
        setFileName(f.name);
        const ext = f.name.split('.').pop()?.toLowerCase();

        const processData = (jsonData: any[]) => {
            try {
                if (!jsonData || jsonData.length === 0) {
                    toast.error('The file is empty or has no rows.');
                    return;
                }

                let balanceAccum = selectedAccount ? (selectedAccount.currentBalance || selectedAccount.initialBalance || 0) : 0;
                const isCreditCard = selectedAccount?.accountType === 'Credit Card';

                const fileTxIdCounts = new Map<string, number>();
                jsonData.forEach(r => {
                    const p = getRowVal(r, ['prefix', 'Prefix', 'PREFIX']);
                    const n = getRowVal(r, ['number', 'Number', 'NUMBER']);
                    if (p !== undefined && n !== undefined && p !== null && n !== null) {
                        const id = `${String(p).trim()}${String(n).trim()}`;
                        if (id) fileTxIdCounts.set(id, (fileTxIdCounts.get(id) || 0) + 1);
                    }
                });

                const parsed = jsonData.map(row => {
                    const rowErrors = validateRow(row, selectedAccount, fileTxIdCounts);

                    const dateVal = getRowVal(row, ['date', 'Date', 'DATE']);
                    const prefixVal = getRowVal(row, ['prefix', 'Prefix', 'PREFIX']);
                    const numberVal = getRowVal(row, ['number', 'Number', 'NUMBER']);
                    const rawReceipt = getRowVal(row, ['receipt', 'Receipt', 'RECEIPT']);
                    const rawPayment = getRowVal(row, ['payment', 'Payment', 'PAYMENT']);
                    const descVal = getRowVal(row, ['description', 'Description', 'DESCRIPTION']) || '';
                    const remarksVal = getRowVal(row, ['remarks', 'Remarks', 'REMARKS']) || '';
                    const driverNameVal = getRowVal(row, ['driver name', 'driver_name', 'Driver Name', 'DRIVER NAME']);
                    const supplierNameVal = getRowVal(row, ['supplier name', 'supplier_name', 'Supplier Name', 'SUPPLIER NAME']);
                    const customerNameVal = getRowVal(row, ['customer name', 'customer_name', 'Customer Name', 'CUSTOMER NAME']);

                    const isDriver = Boolean(driverNameVal && String(driverNameVal).trim());
                    const isCustomer = Boolean(customerNameVal && String(customerNameVal).trim() && !isDriver);

                    const matchedCustomer = matchCustomerHelper(driverNameVal ? String(driverNameVal) : (customerNameVal ? String(customerNameVal) : undefined), allCustomers);
                    const matchedSupplier = matchSupplierHelper(supplierNameVal ? String(supplierNameVal) : undefined, allSuppliers);

                    const receiptVal = cleanNumber(rawReceipt);
                    const paymentVal = cleanNumber(rawPayment);
                    let amountVal = receiptVal > 0 ? receiptVal : paymentVal;

                    let resolvedType: 'DEBIT' | 'CREDIT' = 'DEBIT';
                    if (receiptVal > 0 && paymentVal === 0) {
                        resolvedType = 'DEBIT';
                    } else if (paymentVal > 0 && receiptVal === 0) {
                        resolvedType = 'CREDIT';
                    }

                    if (resolvedType === 'DEBIT') {
                        balanceAccum = isCreditCard ? (balanceAccum - amountVal) : (balanceAccum + amountVal);
                    } else if (resolvedType === 'CREDIT') {
                        balanceAccum = isCreditCard ? (balanceAccum + amountVal) : (balanceAccum - amountVal);
                    }

                    const parsedDate = parseDateFlexible(dateVal);
                    const isoDate = parsedDate
                        ? `${parsedDate.getUTCFullYear()}-${String(parsedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(parsedDate.getUTCDate()).padStart(2, '0')}`
                        : '';

                    const combinedTxId = (prefixVal !== undefined && numberVal !== undefined && prefixVal !== null && numberVal !== null)
                        ? `${String(prefixVal).trim()}${String(numberVal).trim()}`
                        : '';

                    const accountsNameVal = getRowVal(row, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']);
                    const accountsNameStr = String(accountsNameVal || '').trim();
                    const matchedAccount = findAccountingCode(accountsNameStr, allAccountingCodes, accounts);

                    return {
                        Date: isoDate || String(dateVal || ''),
                        Description: (() => {
                            const rawDesc = descVal.trim() || remarksVal.trim();
                            if (rawDesc) return rawDesc;
                            const typeStr = resolvedType === 'DEBIT' ? 'Deposit' : 'Withdrawal';
                            const partyStr = accountsNameStr ? ` for ${accountsNameStr}` : '';
                            const refStr = (prefixVal && numberVal) ? ` (Ref: ${prefixVal}-${numberVal})` : '';
                            return `${typeStr} of ${amountVal}${partyStr}${refStr}`.trim();
                        })(),
                        "Transaction Details": remarksVal.trim(),
                        Debit: receiptVal,
                        Credit: paymentVal,
                        "Running Balance": balanceAccum,
                        "Transaction Type": resolvedType,
                        Amount: amountVal,
                        transactionId: combinedTxId || undefined,
                        customer: matchedCustomer,
                        driverName: driverNameVal ? String(driverNameVal).trim() : undefined,
                        customerName: customerNameVal ? String(customerNameVal).trim() : undefined,
                        isDriver,
                        isCustomer,
                        supplier: matchedSupplier,
                        supplierName: supplierNameVal ? String(supplierNameVal).trim() : undefined,

                        accountsName: accountsNameStr || undefined,
                        matchedAccount: matchedAccount,
                        _rowErrors: rowErrors,
                        _rawRow: row
                    } as ParsedTransaction;
                });

                setRows(parsed);
                toast.success(`Parsed ${parsed.length} row(s) from ${f.name}`);
            } finally {
                setIsParsingFile(false);
            }
        };

        // Render loading state before CPU work begins
        setTimeout(() => {
            if (ext === 'xlsx' || ext === 'xls') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const wb = XLSX.read(data, { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        processData(parseSheetToJSON(ws));
                    } catch {
                        setIsParsingFile(false);
                        toast.error('Failed to parse Excel file.');
                    }
                };
                reader.onerror = () => {
                    setIsParsingFile(false);
                    toast.error('Failed to read file.');
                };
                reader.readAsArrayBuffer(f);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const wb = XLSX.read(e.target?.result, { type: 'string' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        processData(parseSheetToJSON(ws));
                    } catch {
                        setIsParsingFile(false);
                        toast.error('Failed to parse CSV file.');
                    }
                };
                reader.onerror = () => {
                    setIsParsingFile(false);
                    toast.error('Failed to read file.');
                };
                reader.readAsText(f);
            }
        }, 40);
    };

    const downloadSkippedReportCSV = (skippedList: any[], nameOfFile: string) => {
        if (!skippedList || skippedList.length === 0) {
            toast.error("No skipped transactions to download.");
            return;
        }

        const csvHeaders = ["Transaction ID", "Date", "Description", "Type", "Amount", "Reason For Skipping"];
        const csvRows = skippedList.map(s => [
            `"${String(s.transactionId || '-').replace(/"/g, '""')}"`,
            `"${String(s.date ? formatDateDMY(s.date) : '-').replace(/"/g, '""')}"`,
            `"${String(s.description || '-').replace(/"/g, '""')}"`,
            `"${String(s.type || '-').replace(/"/g, '""')}"`,
            String(Number(s.amount || 0).toFixed(2)),
            `"${String(s.reason || 'Skipped').replace(/"/g, '""')}"`
        ]);

        const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = nameOfFile ? nameOfFile.split('.')[0] : 'skipped_transactions';
        link.setAttribute('download', `skipped_transactions_report_${name}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success(`Downloaded ${skippedList.length} skipped transaction(s) as CSV`);
    };

    const handleSubmit = async () => {
        if (!selectedAccountId) {
            toast.error('Please select a target bank account');
            return;
        }

        const validRows = rows.filter(r => r._rowErrors.length === 0);
        const totalRows = validRows.length;
        if (totalRows === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        setUploading(true);
        setUploadProgress(5);

        const batchSize = 50;
        const totalBatches = Math.ceil(totalRows / batchSize);

        setUploadLiveStats({
            processedCount: 0,
            totalCount: totalRows,
            insertedCount: 0,
            skippedCount: 0,
            currentBatch: 1,
            totalBatches,
            setOffCount: 0,
            recentActivities: [{
                id: 'init-1',
                type: 'INFO',
                title: `Starting upload for ${totalRows.toLocaleString()} valid transactions across ${totalBatches} batch${totalBatches > 1 ? 'es' : ''}`,
                details: `Target: ${selectedAccount?.accountName || selectedAccount?.bankName}`,
                time: new Date().toLocaleTimeString()
            }]
        });

        let totalInsertedAcrossBatches = 0;
        let totalSkippedAcrossBatches = 0;
        const allInsertedTransactions: any[] = [];
        const allSkippedTransactions: any[] = [];
        const allSetOffResults: any[] = [];
        let finalNewBalance: number | undefined = undefined;

        try {
            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, totalRows);
                const currentBatchRows = validRows.slice(start, end);
                const batchTransactions = currentBatchRows.map((row) => {
                    const rest: any = { ...row._rawRow };
                    for (const key in row) {
                        if (key !== '_rowErrors' && key !== '_rawRow') {
                            rest[key] = row[key];
                        }
                    }
                    if (row.customer?._id) {
                        rest.customerId = row.customer._id;
                    }
                    if (row.supplier?._id) {
                        rest.supplierId = row.supplier._id;
                    }
                    if (row.driverName) {
                        rest['DRIVER NAME'] = row.driverName;
                    }
                    if (row.customerName) {
                        rest['CUSTOMER NAME'] = row.customerName;
                    }
                    if (row.supplierName) {
                        rest['SUPPLIER NAME'] = row.supplierName;
                    }
                    return rest;
                });

                const startPct = Math.round((i / totalBatches) * 100);
                const targetPct = Math.round(((i + 1) / totalBatches) * 100);

                let currentSimulatedPct = Math.max(startPct, 5);
                const stepMax = Math.max(targetPct - 5, currentSimulatedPct);

                const progressInterval = setInterval(() => {
                    if (currentSimulatedPct < stepMax) {
                        currentSimulatedPct = Math.min(currentSimulatedPct + Math.floor(Math.random() * 5) + 3, stepMax);
                        setUploadProgress(currentSimulatedPct);
                    }
                }, 100);

                const batchClearExisting = i === 0 ? clearExisting : false;

                const payload = {
                    clearExisting: batchClearExisting,
                    transactions: batchTransactions
                };

                let res: any;
                try {
                    res = await bulkUploadBankAccountTransactions(selectedAccountId, payload);
                } finally {
                    clearInterval(progressInterval);
                }

                setUploadProgress(targetPct);

                const batchData = res.data || res;
                const insertedInBatch = (batchData.insertedCount !== undefined ? batchData.insertedCount : (batchData.count || 0));
                const skippedInBatch = (batchData.skippedCount || 0);
                totalInsertedAcrossBatches += insertedInBatch;
                totalSkippedAcrossBatches += skippedInBatch;

                if (Array.isArray(batchData.insertedTransactions)) {
                    allInsertedTransactions.push(...batchData.insertedTransactions);
                } else {
                    // Fallback to batch rows that were sent
                    allInsertedTransactions.push(...currentBatchRows);
                }

                if (Array.isArray(batchData.skippedTransactions)) {
                    allSkippedTransactions.push(...batchData.skippedTransactions);
                }

                if (Array.isArray(batchData.setOffResults)) {
                    allSetOffResults.push(...batchData.setOffResults);
                }

                if (batchData.newBalance !== undefined) {
                    finalNewBalance = batchData.newBalance;
                }

                // Append real-time activity events
                const newItems: Array<{ id: string; type: 'SUCCESS' | 'WARNING' | 'SETOFF' | 'INFO'; title: string; details?: string; time: string }> = [];

                if (batchData.setOffResults && batchData.setOffResults.length > 0) {
                    batchData.setOffResults.forEach((so: any, sIdx: number) => {
                        newItems.push({
                            id: `so-${i}-${sIdx}-${Date.now()}`,
                            type: 'SETOFF',
                            title: `Auto Set-Off: $${Number(so.totalSetOff || so.amount || 0).toFixed(2)} applied for ${so.customerName || so.driverName || so.supplierName || 'Party'}`,
                            details: so.invoicesSetOff && so.invoicesSetOff.length > 0 
                                ? `Settled invoice(s): ${so.invoicesSetOff.map((inv: any) => inv.invoiceNumber || inv.invoiceId).join(', ')}`
                                : `${so.invoiceCount || 1} invoice(s) settled`,
                            time: new Date().toLocaleTimeString()
                        });
                    });
                }

                if (batchData.skippedTransactions && batchData.skippedTransactions.length > 0) {
                    batchData.skippedTransactions.slice(0, 3).forEach((sk: any, skIdx: number) => {
                        newItems.push({
                            id: `sk-${i}-${skIdx}-${Date.now()}`,
                            type: 'WARNING',
                            title: `Skipped: ${sk.transactionId ? `Txn ${sk.transactionId}` : 'Row'} (${sk.reason || 'Duplicate in DB'})`,
                            details: sk.description || '',
                            time: new Date().toLocaleTimeString()
                        });
                    });
                }

                newItems.push({
                    id: `batch-${i}-${Date.now()}`,
                    type: 'SUCCESS',
                    title: `Batch ${i + 1}/${totalBatches} saved: +${insertedInBatch} written to DB${skippedInBatch > 0 ? `, ${skippedInBatch} skipped` : ''}`,
                    details: finalNewBalance !== undefined ? `Updated Account Balance: $${finalNewBalance.toFixed(2)}` : undefined,
                    time: new Date().toLocaleTimeString()
                });

                setUploadLiveStats(prev => ({
                    processedCount: Math.min((i + 1) * batchSize, totalRows),
                    totalCount: totalRows,
                    insertedCount: totalInsertedAcrossBatches,
                    skippedCount: totalSkippedAcrossBatches,
                    currentBatch: i + 1,
                    totalBatches,
                    setOffCount: allSetOffResults.length,
                    recentActivities: [...newItems, ...(prev?.recentActivities || [])].slice(0, 12)
                }));

                if (i === totalBatches - 1) {
                    setUploadProgress(100);
                    await new Promise(resolve => setTimeout(resolve, 350));

                    // Also aggregate pre-upload client-side excluded rows into the skipped transactions report
                    const clientSideInvalidRows = rows.filter(r => r._rowErrors && r._rowErrors.length > 0);
                    clientSideInvalidRows.forEach((r, idx) => {
                        allSkippedTransactions.push({
                            transactionId: r.transactionId || `Row #${idx + 1}`,
                            date: r.Date || '-',
                            description: r.Description || 'Row excluded pre-upload due to validation errors',
                            amount: r.Amount || r.Debit || r.Credit || 0,
                            type: r["Transaction Type"] || 'DEBIT',
                            party: r.customer?.name || (r.supplier?.name || (r.supplier as any)?.companyName) || r.customerName || r.supplierName || r.accountsName || '-',
                            reason: `Validation Error: ${r._rowErrors.join('; ')}`
                        });
                    });

                    const finalSummary = {
                        totalReceived: rows.length,
                        insertedCount: totalInsertedAcrossBatches,
                        skippedCount: allSkippedTransactions.length,
                        newBalance: finalNewBalance !== undefined ? finalNewBalance : selectedAccount?.currentBalance,
                        insertedTransactions: allInsertedTransactions,
                        skippedTransactions: allSkippedTransactions,
                        setOffResults: allSetOffResults
                    };

                    setResult(finalSummary);

                    if (allSkippedTransactions.length > 0) {
                        toast.success(`Processed ${rows.length} rows: ${totalInsertedAcrossBatches} entered DB, ${allSkippedTransactions.length} skipped.`);
                    } else {
                        toast.success(`All ${totalInsertedAcrossBatches} transactions uploaded successfully to DB!`);
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Bulk upload failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: TEMPLATE_HEADERS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Statement Template');
        XLSX.writeFile(wb, `bank_transactions_template.${format}`);
        toast.success('Template downloaded!');
    };

    const handleReset = () => {
        setRows([]);
        setFileName('');
        setIsParsingFile(false);
        setResult(null);
        setAccountSearchQuery('');
        setIsAccountDropdownOpen(false);
        setTableFilter('all');
        setShowErrorsModal(false);
        setErrorCategoryFilter('all');
        setErrorSearchQuery('');
        setResultActiveTab('entered');
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClose = () => {
        const hasResult = !!result;
        handleReset();
        if (hasResult) {
            if (onSuccess) onSuccess();
            else navigate(-1);
        } else {
            if (onClose) onClose();
            else navigate(-1);
        }
    };

    if (!isOpen && !isAsPage) return null;

    const validCount = rows.filter(r => r._rowErrors.length === 0).length;
    const errorCount = rows.filter(r => r._rowErrors.length > 0).length;

    const totalDebitAmount = useMemo(() => {
        return rows.reduce((sum, r) => sum + (Number(r.Debit) || 0), 0);
    }, [rows]);

    const totalCreditAmount = useMemo(() => {
        return rows.reduce((sum, r) => sum + (Number(r.Credit) || 0), 0);
    }, [rows]);

    const renderMainBody = () => (
        <div className="space-y-5">
                    {/* Real-time Uploading Dashboard & Loader */}
                    {uploading && (
                        <div className="p-6 sm:p-8 border rounded-2xl flex flex-col space-y-6 shadow-2xl animate-fade-in" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            {/* Header Status */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3.5">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-lime/10 text-lime shrink-0 shadow-[0_0_20px_rgba(200,230,0,0.2)]" style={{ color: 'var(--brand-lime)' }}>
                                        <Loader2 className="animate-spin" size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-base font-black tracking-wide text-main" style={{ color: 'var(--text-main)' }}>
                                                Uploading & Processing Ledger
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-lime/10 text-lime border border-lime/30 animate-pulse" style={{ color: 'var(--brand-lime)', borderColor: 'var(--brand-lime)' }}>
                                                Live Processing
                                            </span>
                                        </div>
                                        <p className="text-xs mt-0.5 text-dim" style={{ color: 'var(--text-dim)' }}>
                                            Writing to <strong className="text-white">{selectedAccount?.accountName || selectedAccount?.bankName}</strong> • {uploadLiveStats ? `Batch ${uploadLiveStats.currentBatch} of ${uploadLiveStats.totalBatches}` : 'Initializing batches...'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-2xl font-black font-mono" style={{ color: 'var(--brand-lime)' }}>{uploadProgress}%</span>
                                    <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Completed</p>
                                </div>
                            </div>

                            {/* Glowing Progress Bar */}
                            <div className="space-y-1.5">
                                <div className="w-full bg-white/10 rounded-full h-3.5 overflow-hidden border p-0.5" style={{ borderColor: 'var(--border-main)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(200,230,0,0.8)] relative overflow-hidden"
                                        style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand-lime)' }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-[11px] font-semibold text-dim">
                                    <span>
                                        Processed <strong className="text-white">{uploadLiveStats?.processedCount || 0}</strong> of <strong className="text-white">{uploadLiveStats?.totalCount || validCount}</strong> transactions
                                    </span>
                                    <span>
                                        {uploadProgress < 30 ? "Validating & parsing batch..." : uploadProgress < 85 ? "Applying DB insertions & invoice set-offs..." : "Committing running balances..."}
                                    </span>
                                </div>
                            </div>

                            {/* 4 Real-time Metrics Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {/* Total / Progress Card */}
                                <div className="p-3.5 rounded-xl border bg-black/30 flex flex-col justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-dim text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Total Processed</span>
                                        <Activity size={14} className="text-blue-400" />
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-xl font-black font-mono text-white">
                                            {uploadLiveStats?.processedCount || 0}
                                        </span>
                                        <span className="text-xs text-dim font-bold ml-1">/ {uploadLiveStats?.totalCount || validCount}</span>
                                    </div>
                                    <div className="text-[10px] text-blue-400 font-bold mt-1">
                                        {uploadLiveStats ? `${Math.round((uploadLiveStats.processedCount / (uploadLiveStats.totalCount || 1)) * 100)}% of sheet` : 'Starting...'}
                                    </div>
                                </div>

                                {/* Entered DB Card */}
                                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-emerald-300 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Entered In DB</span>
                                        <Database size={14} className="text-emerald-400" />
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-xl font-black font-mono text-emerald-400">
                                            {uploadLiveStats?.insertedCount || 0}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-300/80 font-bold mt-1 flex items-center gap-1">
                                        <Check size={10} /> Saved to Ledger
                                    </div>
                                </div>

                                {/* Skipped Card */}
                                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-amber-300 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Skipped</span>
                                        <AlertTriangle size={14} className="text-amber-400" />
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-xl font-black font-mono text-amber-400">
                                            {uploadLiveStats?.skippedCount || 0}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-amber-300/80 font-bold mt-1">
                                        DB duplicates / mismatch
                                    </div>
                                </div>

                                {/* Set-Offs Card */}
                                <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-purple-300 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Set-Offs Applied</span>
                                        <Link2 size={14} className="text-purple-400" />
                                    </div>
                                    <div className="mt-2">
                                        <span className="text-xl font-black font-mono text-purple-400">
                                            {uploadLiveStats?.setOffCount || 0}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-purple-300/80 font-bold mt-1">
                                        Auto invoice settlements
                                    </div>
                                </div>
                            </div>

                            {/* Live Streaming Feed / Activity Ticker */}
                            {uploadLiveStats && uploadLiveStats.recentActivities.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-dim flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                            Real-Time Execution Stream
                                        </span>
                                        <span className="text-[10px] font-bold text-dim">Streaming Live</span>
                                    </div>
                                    <div className="p-3 rounded-xl border bg-black/40 max-h-48 overflow-y-auto space-y-2 border-white/10 font-mono text-xs custom-scrollbar">
                                        {uploadLiveStats.recentActivities.map((act) => (
                                            <div
                                                key={act.id}
                                                className={`p-2 rounded-lg border flex items-start justify-between gap-3 text-[11px] animate-fade-in ${
                                                    act.type === 'SUCCESS'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                                                        : act.type === 'SETOFF'
                                                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-200'
                                                        : act.type === 'WARNING'
                                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                                                        : 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                                                }`}
                                            >
                                                <div className="space-y-0.5 overflow-hidden">
                                                    <div className="font-bold truncate flex items-center gap-1.5">
                                                        {act.type === 'SUCCESS' && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                                                        {act.type === 'SETOFF' && <Link2 size={12} className="text-purple-400 shrink-0" />}
                                                        {act.type === 'WARNING' && <AlertTriangle size={12} className="text-amber-400 shrink-0" />}
                                                        {act.type === 'INFO' && <Info size={12} className="text-blue-400 shrink-0" />}
                                                        <span>{act.title}</span>
                                                    </div>
                                                    {act.details && (
                                                        <p className="text-[10px] text-white/60 truncate pl-4.5">{act.details}</p>
                                                    )}
                                                </div>
                                                <span className="text-[9px] text-white/40 shrink-0 font-sans">{act.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-[10px] uppercase tracking-widest font-black text-white/30 text-center">
                                Do not close this modal or refresh the window while upload is in progress
                            </div>
                        </div>
                    )}

                    {/* Setup Parameters */}
                    {!result && !uploading && (
                        <div className="relative z-30 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            {/* Bank Account Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Bank Account *</label>
                                {loadingData ? (
                                    <div className="flex items-center gap-2 py-2.5">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-xs text-dim">Loading accounts...</span>
                                    </div>
                                ) : (
                                    <div className="relative" ref={accountDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-lime text-left"
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <span className="truncate pr-2">
                                                {selectedAccount
                                                    ? `${selectedAccount.accountName || selectedAccount.bankName} (${selectedAccount.accountNumber})`
                                                    : '— Select Account —'}
                                            </span>
                                            <ChevronDown size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                                        </button>

                                        {isAccountDropdownOpen && (
                                            <div
                                                className="absolute left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden flex flex-col max-h-[250px]"
                                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                                            >
                                                {/* Search Input */}
                                                <div className="p-2 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)' }}>
                                                    <Search size={14} style={{ color: 'var(--text-dim)' }} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search account..."
                                                        value={accountSearchQuery}
                                                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                                                        className="w-full bg-transparent text-xs font-semibold outline-none py-1"
                                                        style={{ color: 'var(--text-main)' }}
                                                        autoFocus
                                                    />
                                                    {accountSearchQuery && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAccountSearchQuery('')}
                                                            className="p-1 hover:bg-white/10 rounded-full border-none cursor-pointer"
                                                        >
                                                            <X size={12} style={{ color: 'var(--text-dim)' }} />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* List */}
                                                <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[180px]">
                                                    {filteredAccounts.length === 0 ? (
                                                        <div className="p-3 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                                                            No accounts found
                                                        </div>
                                                    ) : (
                                                        filteredAccounts.map(acc => (
                                                            <button
                                                                key={acc._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedAccountId(acc._id);
                                                                    setIsAccountDropdownOpen(false);
                                                                }}
                                                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-all flex flex-col gap-0.5 border-none cursor-pointer ${selectedAccountId === acc._id ? 'bg-lime/10' : 'hover:bg-white/5'}`}
                                                                style={{
                                                                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                                    color: selectedAccountId === acc._id ? 'var(--brand-lime)' : 'var(--text-main)'
                                                                }}
                                                            >
                                                                <span>{acc.accountName || acc.bankName}</span>
                                                                <span className="text-[10px] font-normal" style={{ color: 'var(--text-dim)' }}>{acc.accountNumber}</span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Branch auto-resolution is applied per transaction row */}

                            {/* Clear existing is removed to avoid accidental deletion */}
                        </div>
                    )}

                    {/* Template downloads */}
                    {!result && !uploading && !isParsingFile && rows.length === 0 && (
                        <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${loadingData ? 'opacity-40 pointer-events-none' : ''}`} style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Download upload template with specific columns:</span>
                            <div className="ml-auto flex gap-2">
                                <button onClick={() => downloadTemplate('xlsx')} disabled={loadingData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-card hover:bg-black/10 disabled:opacity-40" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                    <Download size={14} /> Excel Template
                                </button>
                                <button onClick={() => downloadTemplate('csv')} disabled={loadingData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-card hover:bg-black/10 disabled:opacity-40" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                    <Download size={14} /> CSV Template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Parsing File Loading Phase */}
                    {isParsingFile && !result && !uploading && (
                        <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-2xl border border-dashed animate-pulse" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.03)' }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'rgba(200,230,0,0.12)', color: 'var(--brand-lime)' }}>
                                <Loader2 size={32} className="animate-spin" />
                            </div>
                            <div className="text-center space-y-1.5">
                                <p className="text-base font-bold text-main">
                                    Reading & Validating Transactions...
                                </p>
                                <p className="text-xs text-dim max-w-md mx-auto">
                                    Parsing <span className="font-semibold text-main">{fileName || 'uploaded file'}</span>, validating chart of accounts, verifying balances, and matching customer & supplier accounts...
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-medium text-dim px-3 py-1 rounded-full border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                <Zap size={13} style={{ color: 'var(--brand-lime)' }} />
                                <span>Optimized high-speed parsing engine active</span>
                            </div>
                        </div>
                    )}

                    {/* Drop zone */}
                    {rows.length === 0 && !result && !uploading && !isParsingFile && (
                        <div
                            onDrop={(e) => {
                                e.preventDefault();
                                setDragOver(false);
                                if (loadingData) return;
                                const f = e.dataTransfer.files?.[0];
                                if (f) parseFile(f);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (!loadingData) setDragOver(true);
                            }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => {
                                if (!loadingData) fileRef.current?.click();
                            }}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed transition-all ${
                                loadingData ? 'opacity-40 cursor-not-allowed pointer-events-none select-none' : 'cursor-pointer'
                            } ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{
                                borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)',
                                background: dragOver ? 'rgba(200,230,0,0.05)' : 'transparent'
                            }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.08)' }}>
                                <Upload size={28} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-main">
                                    {loadingData ? 'Loading Target Bank Account...' : 'Drop statement Excel or CSV here'}
                                </p>
                                <p className="text-xs mt-1 text-dim">
                                    {loadingData ? 'Please wait for target bank account to finish loading...' : 'or click to browse — .xlsx, .xls, .csv supported'}
                                </p>
                            </div>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                disabled={loadingData}
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && !loadingData) parseFile(f);
                                }}
                            />
                        </div>
                    )}

                    {/* Preview */}
                    {rows.length > 0 && !result && !uploading && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(200,230,0,0.1)' }}>
                                        <FileText size={20} style={{ color: 'var(--brand-lime)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-main">{fileName}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                                                <CheckCircle size={12} /> {validCount} valid transactions
                                            </span>
                                            {errorCount > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowErrorsModal(true)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer shadow-sm"
                                                    >
                                                        <AlertTriangle size={12} /> {errorCount} validation errors (View Details)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadFailedRowsCSV(rows.filter(r => r._rowErrors.length > 0), fileName)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer shadow-sm"
                                                        title="Download CSV of only the failed rows with error reasons"
                                                    >
                                                        <Download size={12} /> Download Errors CSV
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={handleReset} disabled={uploading} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-bold border hover:bg-black/5 disabled:opacity-40 cursor-pointer bg-transparent" style={{ borderColor: 'var(--border-main)' }}>
                                        Clear File
                                    </button>
                                    <button onClick={handleSubmit} disabled={uploading || validCount === 0 || !selectedAccountId}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 border-none hover:scale-[1.02] active:scale-95 transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploading ? 'Uploading...' : `Upload ${validCount} Transactions`}
                                    </button>
                                </div>
                            </div>

                            {/* Live Sheet Metrics Summary Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div className="p-3.5 rounded-xl border bg-black/20 flex flex-col justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-dim text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Total Parsed</span>
                                        <FileText size={14} className="text-blue-400" />
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-xl font-black font-mono text-white">{rows.length.toLocaleString()}</span>
                                        <span className="text-[10px] text-dim ml-1">rows</span>
                                    </div>
                                    <span className="text-[10px] text-blue-400/90 font-bold mt-1">From uploaded file</span>
                                </div>

                                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col justify-between">
                                    <div className="flex items-center justify-between text-emerald-300 text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Valid Ready</span>
                                        <CheckCircle size={14} className="text-emerald-400" />
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-xl font-black font-mono text-emerald-400">{validCount.toLocaleString()}</span>
                                        <span className="text-[10px] text-emerald-300/70 ml-1">rows</span>
                                    </div>
                                    <span className="text-[10px] text-emerald-300 font-bold mt-1">{rows.length > 0 ? `${Math.round((validCount / rows.length) * 100)}% valid` : '0%'}</span>
                                </div>

                                <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${errorCount > 0 ? 'border-rose-500/30 bg-rose-500/10' : 'border-white/10 bg-black/20'}`}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={`font-bold uppercase tracking-wider text-[10px] ${errorCount > 0 ? 'text-rose-300' : 'text-dim'}`}>Errors Blocked</span>
                                        <AlertTriangle size={14} className={errorCount > 0 ? 'text-rose-400' : 'text-dim'} />
                                    </div>
                                    <div className="mt-1">
                                        <span className={`text-xl font-black font-mono ${errorCount > 0 ? 'text-rose-400' : 'text-white/60'}`}>{errorCount.toLocaleString()}</span>
                                        <span className="text-[10px] text-dim ml-1">rows</span>
                                    </div>
                                    {errorCount > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setShowErrorsModal(true)}
                                            className="text-[10px] text-rose-300 hover:text-rose-200 underline font-bold mt-1 text-left cursor-pointer bg-transparent border-none p-0"
                                        >
                                            View {errorCount} issue{errorCount === 1 ? '' : 's'} &rarr;
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-emerald-400 font-bold mt-1">Clean dataset</span>
                                    )}
                                </div>

                                <div className="p-3.5 rounded-xl border bg-black/20 flex flex-col justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-dim text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Total Inflow (Debit)</span>
                                        <span className="text-[11px] font-bold text-emerald-400 font-mono">+$</span>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-lg font-black font-mono text-emerald-400">${totalDebitAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <span className="text-[10px] text-dim font-bold mt-1">Receipts & Deposits</span>
                                </div>

                                <div className="p-3.5 rounded-xl border bg-black/20 flex flex-col justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-dim text-xs">
                                        <span className="font-bold uppercase tracking-wider text-[10px]">Total Outflow (Credit)</span>
                                        <span className="text-[11px] font-bold text-rose-400 font-mono">-$</span>
                                    </div>
                                    <div className="mt-1">
                                        <span className="text-lg font-black font-mono text-rose-400">${totalCreditAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <span className="text-[10px] text-dim font-bold mt-1">Payments & Transfers</span>
                                </div>
                            </div>

                            {/* Summary Breakdown per Txn Type */}
                            {rows.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                    {(() => {
                                        const counts: Record<string, number> = { INTER_BANK: 0, DRIVER: 0, VENDOR: 0, NON_DRIVER_CUSTOMER: 0, UNCLASSIFIED: 0 };
                                        rows.forEach(r => {
                                            const t = computeRowBankTxType(r, accounts, allAccountingCodes).code;
                                            counts[t] = (counts[t] || 0) + 1;
                                        });

                                        return (
                                            <>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-dim">Detected Txn Types:</span>
                                                {counts.INTER_BANK > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                        🏦 Inter-Bank ({counts.INTER_BANK})
                                                    </span>
                                                )}
                                                {counts.DRIVER > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                        🏎️ Driver ({counts.DRIVER})
                                                    </span>
                                                )}
                                                {counts.VENDOR > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        🏢 Vendor ({counts.VENDOR})
                                                    </span>
                                                )}
                                                {counts.NON_DRIVER_CUSTOMER > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        👤 Customer ({counts.NON_DRIVER_CUSTOMER})
                                                    </span>
                                                )}
                                                {counts.UNCLASSIFIED > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                                        📁 General ({counts.UNCLASSIFIED})
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* View Filter Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <div className="flex items-center gap-1 p-1 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setTableFilter('all')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                                            tableFilter === 'all' ? 'bg-white/15 text-white shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        All Transactions ({rows.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTableFilter('valid')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                                            tableFilter === 'valid' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Valid Only ({validCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTableFilter('errors')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                            tableFilter === 'errors' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <span>Validation Errors ({errorCount})</span>
                                        {errorCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                                    </button>
                                </div>

                                {errorCount > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowErrorsModal(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
                                        >
                                            <Eye size={13} /> View Errors List ({errorCount})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadFailedRowsCSV(rows.filter(r => r._rowErrors.length > 0), fileName)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                                            title="Download CSV of error rows"
                                        >
                                            <Download size={13} /> Download CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to remove all ${errorCount} invalid rows from this upload?`)) {
                                                    setRows(prev => prev.filter(r => r._rowErrors.length === 0));
                                                    setTableFilter('all');
                                                    toast.success(`Removed ${errorCount} invalid rows`);
                                                }
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-dim hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                            title="Discard all rows with validation errors from this upload"
                                        >
                                            <Trash2 size={13} /> Purge Errors
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div className="border rounded-xl overflow-hidden relative z-1" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="py-3 px-4">Date</th>
                                                <th className="py-3 px-4">Description</th>
                                                <th className="py-3 px-4">Account Name</th>
                                                <th className="py-3 px-4">Txn Type</th>
                                                <th className="py-3 px-4">Details</th>
                                                <th className="py-3 px-4">Debit</th>
                                                <th className="py-3 px-4">Credit</th>
                                                <th className="py-3 px-4">Running Balance</th>
                                                <th className="py-3 px-4">Type</th>
                                                <th className="py-3 px-4">Amount</th>
                                                <th className="py-3 px-4">Transaction ID</th>
                                                <th className="py-3 px-4">Validation</th>
                                                <th className="py-3 px-4 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                            {paginatedRowsWithIndex.length === 0 ? (
                                                <tr>
                                                    <td colSpan={13} className="py-8 text-center text-dim text-xs">
                                                        {tableFilter === 'errors' ? 'No validation errors found!' : tableFilter === 'valid' ? 'No valid transactions found.' : 'No transactions to display.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedRowsWithIndex.map(({ row, originalIndex: idx }) => (
                                                <tr key={idx} className="relative hover:z-40" style={{ background: row._rowErrors.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                                    <td className="py-3 px-4 font-mono">{formatDateDMY(row.Date) || '-'}</td>
                                                    <td className="py-3 px-4 font-semibold">{row.Description || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex flex-col gap-1 min-w-[140px]">
                                                            {/* Account Name display */}
                                                            {row.supplier ? (
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-main" title={row.matchedAccount ? `${row.matchedAccount.code} - ${row.matchedAccount.name}` : '2.1.01 - Accounts Payable'}>
                                                                    <span className="text-amber-400">📂</span>
                                                                    <span className="truncate max-w-[150px]">{row.matchedAccount?.name || allAccountingCodes.find(c => c.code === "2.1.01")?.name || 'Accounts Payable'}</span>
                                                                </div>
                                                            ) : row.customer ? (
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-main" title={row.matchedAccount ? `${row.matchedAccount.code} - ${row.matchedAccount.name}` : '1.1.03 - Accounts Receivable'}>
                                                                    <span className="text-emerald-400">📂</span>
                                                                    <span className="truncate max-w-[150px]">{row.matchedAccount?.name || allAccountingCodes.find(c => c.code === "1.1.03")?.name || 'Accounts Receivable'}</span>
                                                                </div>
                                                            ) : row.matchedAccount ? (
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-main" title={`${row.matchedAccount.code} - ${row.matchedAccount.name}`}>
                                                                    <span className="text-emerald-400">📂</span>
                                                                    <span className="truncate max-w-[150px]">{row.matchedAccount.name}</span>
                                                                </div>
                                                            ) : row.accountsName ? (
                                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400" title={`Account "${row.accountsName}" not found in Chart of Accounts`}>
                                                                    <AlertCircle size={12} className="text-rose-400" />
                                                                    <span className="truncate max-w-[150px]">{row.accountsName}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-white/30 text-xs px-2">—</span>
                                                            )}

                                                            {/* Customer / Driver / Supplier context sub-info */}
                                                            {row.customer ? (
                                                                <div className="flex flex-col gap-0.5 mt-0.5 border-t border-white/5 pt-0.5">
                                                                    <div className="flex items-center gap-1 text-[10px] text-dim">
                                                                        <span>{row.isDriver ? '🏎️' : '👤'}</span>
                                                                        <span className="truncate max-w-[120px]">{row.customer.name}</span>
                                                                        {row.isCustomer && (
                                                                            <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-mono">No Auto Set-Off</span>
                                                                        )}
                                                                    </div>
                                                                    {row.isDriver && row["Transaction Type"] === 'DEBIT' && (
                                                                        <div className="mt-1 space-y-1">
                                                                            {(() => {
                                                                                const preview = cumulativeSetOffPreviews.get(idx);
                                                                                if (!preview) return null;
                                                                                const isExpanded = expandedSetOffRows[idx] !== false; // default to expanded

                                                                                return (
                                                                                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden transition-all max-w-[260px]">
                                                                                        {/* Expandable/Collapsible Header Button */}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setExpandedSetOffRows(prev => ({ ...prev, [idx]: !isExpanded }))}
                                                                                            className="w-full flex items-center justify-between gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-violet-300 hover:bg-violet-500/10 transition-colors cursor-pointer border-none bg-transparent"
                                                                                        >
                                                                                            <span className="flex items-center gap-1">
                                                                                                <Zap size={9} className="text-violet-400" /> Set-Off Preview ({preview.setOffDetails.length})
                                                                                            </span>
                                                                                            {isExpanded ? <ChevronDown size={12} className="text-violet-400" /> : <ChevronRight size={12} className="text-violet-400" />}
                                                                                        </button>

                                                                                        {/* Expandable Body */}
                                                                                        {isExpanded && (
                                                                                            <div className="p-2 pt-1 border-t border-violet-500/20 text-[10px] space-y-1 bg-black/20">
                                                                                                {preview.setOffDetails.length > 0 ? (
                                                                                                    <div className="space-y-1">
                                                                                                        <div className="text-[9px] uppercase tracking-wider font-bold text-white/50 border-b border-violet-500/10 pb-0.5">
                                                                                                            Invoices to set off ({preview.setOffDetails.length}):
                                                                                                        </div>
                                                                                                        {preview.setOffDetails.map((detail: SetOffDetail, dIdx: number) => (
                                                                                                            <div key={dIdx} className="flex justify-between items-center text-[9px] gap-1.5 p-1 rounded bg-white/5 border border-white/5">
                                                                                                                <span className="font-bold text-[#C8E600] truncate max-w-[90px]">{detail.invoiceNumber}</span>
                                                                                                                <div className="flex items-center gap-1 shrink-0 font-mono">
                                                                                                                    <span className="text-emerald-400 font-bold">+${detail.amountApplied.toFixed(2)}</span>
                                                                                                                    <span className={`px-1 py-0.2 rounded text-[7px] font-black uppercase ${
                                                                                                                        detail.newStatus === 'PAID' 
                                                                                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                                                                             : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                                                                    }`}>
                                                                                                                        {detail.newStatus}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="text-[9px] text-amber-300 font-medium p-1">
                                                                                                        No open invoices. Full amount recorded as advance.
                                                                                                    </div>
                                                                                                )}

                                                                                                {preview.excessAmount > 0.01 && (
                                                                                                    <div className="flex justify-between items-center text-[9px] font-bold text-[#C8E600] border-t border-violet-500/20 pt-1">
                                                                                                        <span>Advance (2.1.02)</span>
                                                                                                        <span className="font-mono">${preview.excessAmount.toFixed(2)}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : row.supplier ? (
                                                                <div className="flex flex-col gap-0.5 mt-0.5 border-t border-white/5 pt-0.5">
                                                                    <div className="flex items-center gap-1 text-[10px] text-dim">
                                                                        <span>🏢</span>
                                                                        <span className="truncate max-w-[120px]">{row.supplier.name || (row.supplier as any).companyName}</span>
                                                                    </div>
                                                                    {(row["Transaction Type"] === 'CREDIT' || (row.Credit || 0) > 0) && (
                                                                        <div className="mt-1 space-y-1">
                                                                            {(() => {
                                                                                const preview = cumulativeSetOffPreviews.get(idx);
                                                                                if (!preview) return null;
                                                                                const isExpanded = expandedSetOffRows[idx] !== false; // default to expanded

                                                                                return (
                                                                                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden transition-all max-w-[260px]">
                                                                                        {/* Expandable/Collapsible Header Button */}
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => setExpandedSetOffRows(prev => ({ ...prev, [idx]: !isExpanded }))}
                                                                                            className="w-full flex items-center justify-between gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer border-none bg-transparent"
                                                                                        >
                                                                                            <span className="flex items-center gap-1">
                                                                                                <Zap size={9} className="text-amber-400" /> Bill Set-Off Preview ({preview.setOffDetails.length})
                                                                                            </span>
                                                                                            {isExpanded ? <ChevronDown size={12} className="text-amber-400" /> : <ChevronRight size={12} className="text-amber-400" />}
                                                                                        </button>

                                                                                        {/* Expandable Body */}
                                                                                        {isExpanded && (
                                                                                            <div className="p-2 pt-1 border-t border-amber-500/20 text-[10px] space-y-1 bg-black/20">
                                                                                                {preview.setOffDetails.length > 0 ? (
                                                                                                    <div className="space-y-1">
                                                                                                        <div className="text-[9px] uppercase tracking-wider font-bold text-white/50 border-b border-amber-500/10 pb-0.5">
                                                                                                            Bills to set off ({preview.setOffDetails.length}):
                                                                                                        </div>
                                                                                                        {preview.setOffDetails.map((detail: SetOffDetail, dIdx: number) => (
                                                                                                            <div key={dIdx} className="flex justify-between items-center text-[9px] gap-1.5 p-1 rounded bg-white/5 border border-white/5">
                                                                                                                <span className="font-bold text-amber-300 truncate max-w-[90px]">{detail.invoiceNumber}</span>
                                                                                                                <div className="flex items-center gap-1 shrink-0 font-mono">
                                                                                                                    <span className="text-emerald-400 font-bold">+${detail.amountApplied.toFixed(2)}</span>
                                                                                                                    <span className={`px-1 py-0.2 rounded text-[7px] font-black uppercase ${
                                                                                                                        detail.newStatus === 'PAID' 
                                                                                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                                                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                                                                    }`}>
                                                                                                                        {detail.newStatus}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="text-[9px] text-amber-300 font-medium p-1">
                                                                                                        No open vendor bills. Full payment recorded as advance.
                                                                                                    </div>
                                                                                                )}

                                                                                                {preview.excessAmount > 0.01 && (
                                                                                                    <div className="flex justify-between items-center text-[9px] font-bold text-[#C8E600] border-t border-amber-500/20 pt-1">
                                                                                                        <span>Supplier Advances (1.1.04)</span>
                                                                                                        <span className="font-mono">${preview.excessAmount.toFixed(2)}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : row.customerName ? (
                                                                <div className="flex flex-col gap-1 mt-1">
                                                                    <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold" title={`Unmatched in preview: "${row.customerName}". Backend will auto-resolve on upload or select manually below.`}>
                                                                        <AlertCircle size={10} />
                                                                        <span className="truncate max-w-[120px]">{row.customerName}</span>
                                                                    </div>
                                                                    <select
                                                                        className="text-[10px] py-0.5 px-1 rounded bg-black/40 border border-white/10 text-white max-w-[140px] cursor-pointer"
                                                                        value={(row.customer as any)?._id || ''}
                                                                        onChange={(e) => {
                                                                            const selectedCust = allCustomers.find(c => c._id === e.target.value);
                                                                            setRows(prev => prev.map((r, i) => i === idx ? { ...r, customer: selectedCust } : r));
                                                                        }}
                                                                    >
                                                                        <option value="">-- Match Customer --</option>
                                                                        {allCustomers.map(c => (
                                                                            <option key={c._id} value={c._id}>
                                                                                {c.name} { (c as any).companyName ? `(${(c as any).companyName})` : '' }
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            ) : row.supplierName ? (
                                                                <div className="flex flex-col gap-1 mt-1">
                                                                    <div className="flex items-center gap-1 text-[9px] text-amber-400 font-bold" title={`Unmatched in preview: "${row.supplierName}". Backend will auto-resolve on upload or select manually below.`}>
                                                                        <AlertCircle size={10} />
                                                                        <span className="truncate max-w-[120px]">{row.supplierName}</span>
                                                                    </div>
                                                                    <select
                                                                        className="text-[10px] py-0.5 px-1 rounded bg-black/40 border border-white/10 text-white max-w-[140px] cursor-pointer"
                                                                        value={(row.supplier as any)?._id || ''}
                                                                        onChange={(e) => {
                                                                            const selectedSup = allSuppliers.find(s => s._id === e.target.value);
                                                                            setRows(prev => prev.map((r, i) => i === idx ? { ...r, supplier: selectedSup } : r));
                                                                        }}
                                                                    >
                                                                        <option value="">-- Match Supplier --</option>
                                                                        {allSuppliers.map(s => (
                                                                            <option key={s._id} value={s._id}>
                                                                                {s.name || (s as any).companyName}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {(() => {
                                                            const txType = computeRowBankTxType(row, accounts, allAccountingCodes);
                                                            return (
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${txType.badgeStyle}`}>
                                                                    <span>{txType.icon}</span>
                                                                    <span>{txType.label}</span>
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="py-3 px-4 max-w-[150px] truncate" title={row["Transaction Details"]}>{row["Transaction Details"] || '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-emerald-500 font-semibold">{row.Debit > 0 ? `$${row.Debit.toFixed(2)}` : '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-rose-500 font-semibold">{row.Credit > 0 ? `$${row.Credit.toFixed(2)}` : '-'}</td>
                                                    <td className="py-3 px-4 font-mono text-white/60">{row["Running Balance"] !== 0 ? `$${row["Running Balance"].toFixed(2)}` : '-'}</td>
                                                    <td className="py-3 px-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row["Transaction Type"] === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                            {row["Transaction Type"]}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold">${row.Amount.toFixed(2)}</td>
                                                    <td className="py-3 px-4 font-mono text-white/60">{row.transactionId || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {row._rowErrors.length > 0 ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                                                                    <AlertTriangle size={10} /> Error
                                                                </span>

                                                                {/* Interactive (i) Button with Popover Tooltip */}
                                                                <div className="relative group/errinfo">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowErrorsModal(true)}
                                                                        className="w-4 h-4 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 flex items-center justify-center text-[9px] font-black cursor-pointer transition-colors shadow-sm"
                                                                        title="View Validation Error Details"
                                                                    >
                                                                        i
                                                                    </button>

                                                                    {/* Hover Popover Tooltip */}
                                                                    <div className={`absolute right-0 ${idx < 2 ? 'top-full mt-1.5' : 'bottom-full mb-1.5'} hidden group-hover/errinfo:block z-[100] w-72 p-3 rounded-xl bg-slate-900/95 border border-rose-500/50 text-white shadow-2xl backdrop-blur-md space-y-1.5 pointer-events-none transition-all`}>
                                                                        <div className="flex items-center gap-1.5 border-b border-white/10 pb-1.5 text-rose-400 font-black text-[10px] uppercase tracking-wider">
                                                                            <AlertTriangle size={11} /> Validation Details
                                                                        </div>
                                                                        {row._rowErrors.map((errMessage: string, eIdx: number) => (
                                                                            <div key={eIdx} className="text-[11px] text-rose-200 leading-snug font-medium">
                                                                                • {errMessage}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-emerald-500 font-semibold"><CheckCircle size={12} /> Valid</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500 transition-colors border-none cursor-pointer" title="Remove Row">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Bar */}
                                {displayedRowsWithIndex.length > 0 && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-black/10" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="text-xs text-dim">
                                            {pageSize === -1 ? (
                                                <span>Showing all <strong>{displayedRowsWithIndex.length}</strong> transactions</span>
                                            ) : (
                                                <span>
                                                    Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, displayedRowsWithIndex.length)}</strong> of <strong>{displayedRowsWithIndex.length}</strong> transactions
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-xs text-dim">
                                                <span>Rows per page:</span>
                                                <select
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                    className="px-2 py-1 rounded-lg text-xs font-bold bg-white/10 border border-white/10 text-white outline-none cursor-pointer"
                                                >
                                                    <option value={25} className="bg-slate-900 text-white">25</option>
                                                    <option value={50} className="bg-slate-900 text-white">50</option>
                                                    <option value={100} className="bg-slate-900 text-white">100</option>
                                                    <option value={200} className="bg-slate-900 text-white">200</option>
                                                    <option value={-1} className="bg-slate-900 text-white">All</option>
                                                </select>
                                            </div>

                                            {pageSize !== -1 && totalPages > 1 && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(1)}
                                                        disabled={currentPage === 1}
                                                        className="px-2 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                        title="First Page"
                                                    >
                                                        &laquo;
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className="px-2 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                                    >
                                                        <ChevronLeft size={13} /> Prev
                                                    </button>

                                                    <span className="px-2.5 py-1 text-xs font-mono font-bold text-dim">
                                                        Page <strong className="text-white">{currentPage}</strong> / {totalPages}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="px-2 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                                                    >
                                                        Next <ChevronRight size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        disabled={currentPage === totalPages}
                                                        className="px-2 py-1 rounded-lg text-xs font-bold border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                                        title="Last Page"
                                                    >
                                                        &raquo;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preview Footer Action Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 text-dim hover:text-white transition-all cursor-pointer bg-transparent disabled:opacity-40"
                                >
                                    Cancel & Re-upload
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={uploading || validCount === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all border-none hover:scale-105 active:scale-95 shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                                    style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>Processing Upload ({uploadProgress}%)...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={15} />
                                            <span>Process & Upload {validCount} Transactions</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Result Screen */}
                    {result && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Result Top Alert */}
                            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                                (result.skippedCount || 0) > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        (result.skippedCount || 0) > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                        {(result.skippedCount || 0) > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-main">
                                            {result.insertedCount > 0
                                                ? (result.skippedCount > 0 ? 'Upload Completed with Skipped Items' : 'Upload Completed Successfully!')
                                                : 'No Transactions Added'}
                                        </h3>
                                        <p className="text-xs text-dim mt-0.5">
                                            {result.message || `${result.insertedCount} transactions entered into database.`}
                                        </p>
                                    </div>
                                </div>
                                {(result.skippedCount || 0) > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => downloadSkippedReportCSV(result.skippedTransactions || [], fileName)}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer shrink-0"
                                    >
                                        <Download size={13} /> Download Skipped Log (CSV)
                                    </button>
                                )}
                            </div>

                            {/* Summary Metrics Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-xl border bg-black/10 flex flex-col justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[11px] font-bold text-dim">Total Rows In File</span>
                                    <span className="text-xl font-black text-main mt-1">
                                        {result.totalProcessed || ((result.insertedCount || 0) + (result.skippedCount || 0))}
                                    </span>
                                    <span className="text-[10px] text-dim mt-0.5">Parsed file rows</span>
                                </div>
                                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-emerald-400">Entered to DB</span>
                                    <span className="text-xl font-black text-emerald-400 mt-1">
                                        {result.insertedCount || 0}
                                    </span>
                                    <span className="text-[10px] text-emerald-500/80 mt-0.5">Successfully inserted</span>
                                </div>
                                <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                                    (result.skippedCount || 0) > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-black/10'
                                }`}>
                                    <span className={`text-[11px] font-bold ${(result.skippedCount || 0) > 0 ? 'text-amber-400' : 'text-dim'}`}>
                                        Skipped / Not in DB
                                    </span>
                                    <span className={`text-xl font-black mt-1 ${(result.skippedCount || 0) > 0 ? 'text-amber-400' : 'text-dim'}`}>
                                        {result.skippedCount || 0}
                                    </span>
                                    <span className="text-[10px] text-dim mt-0.5">Duplicates / Mismatches</span>
                                </div>
                                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-blue-400">Updated Bank Balance</span>
                                    <span className="text-xl font-black text-blue-400 mt-1">
                                        ${Number(result.newBalance || 0).toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-blue-500/80 mt-0.5">{selectedAccount?.accountName || selectedAccount?.bankName}</span>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex items-center gap-1 p-1 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setResultActiveTab('entered')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
                                        resultActiveTab === 'entered' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <CheckCircle size={14} />
                                    <span>Entered into DB ({result.insertedTransactions?.length || result.insertedCount || 0})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResultActiveTab('skipped')}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
                                        resultActiveTab === 'skipped' ? 'bg-amber-500/20 text-amber-300 shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <AlertTriangle size={14} />
                                    <span>Skipped / Not in DB ({result.skippedTransactions?.length || result.skippedCount || 0})</span>
                                </button>
                                {result.setOffResults && result.setOffResults.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setResultActiveTab('setoff')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
                                            resultActiveTab === 'setoff' ? 'bg-violet-500/20 text-violet-300 shadow-sm' : 'text-dim hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Layers size={14} />
                                        <span>Auto Set-Off ({result.setOffResults.length})</span>
                                    </button>
                                )}
                            </div>

                            {/* Tab 1: Entered Transactions */}
                            {resultActiveTab === 'entered' && (
                                <div className="space-y-3">
                                    {(!result.insertedTransactions || result.insertedTransactions.length === 0) ? (
                                        <div className="p-8 text-center text-dim text-xs border rounded-xl" style={{ borderColor: 'var(--border-main)' }}>
                                            No transactions were entered into the database.
                                        </div>
                                    ) : (
                                        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                                        <tr>
                                                            <th className="py-2.5 px-3 font-bold text-dim">Date</th>
                                                            <th className="py-2.5 px-3 font-bold text-dim">Transaction ID</th>
                                                            <th className="py-2.5 px-3 font-bold text-dim">Description</th>
                                                            <th className="py-2.5 px-3 font-bold text-dim">Type</th>
                                                            <th className="py-2.5 px-3 font-bold text-dim text-right">Amount</th>
                                                            <th className="py-2.5 px-3 font-bold text-dim text-center">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                                        {result.insertedTransactions.map((item: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-white/[0.02]">
                                                                <td className="py-2.5 px-3 font-mono text-dim">{item.date ? formatDateDMY(item.date) : '-'}</td>
                                                                <td className="py-2.5 px-3 font-mono font-bold text-white">{item.transactionId || '-'}</td>
                                                                <td className="py-2.5 px-3 font-medium text-main">{item.description || '-'}</td>
                                                                <td className="py-2.5 px-3">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                        item.type === 'CREDIT' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                                                                    }`}>
                                                                        {item.type || 'DEBIT'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 font-mono font-bold text-right text-white">
                                                                    ${Number(item.amount || 0).toFixed(2)}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                        <CheckCircle size={10} /> Saved to DB
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 2: Skipped Transactions */}
                            {resultActiveTab === 'skipped' && (
                                <div className="space-y-3">
                                    {(!result.skippedTransactions || result.skippedTransactions.length === 0) ? (
                                        <div className="p-8 text-center text-emerald-400 text-xs border border-emerald-500/20 rounded-xl bg-emerald-500/5">
                                            🎉 0 transactions skipped! All valid records entered into the database.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs text-dim px-1">
                                                <span>Showing <strong>{result.skippedTransactions.length}</strong> skipped transactions with reasons:</span>
                                                <button
                                                    type="button"
                                                    onClick={() => downloadSkippedReportCSV(result.skippedTransactions || [], fileName)}
                                                    className="text-amber-300 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                                >
                                                    <Download size={12} /> Export CSV
                                                </button>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                                {result.skippedTransactions.map((s: any, sIdx: number) => (
                                                    <div
                                                        key={sIdx}
                                                        className="p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.04] space-y-2 transition-all"
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 font-mono">
                                                                    Item #{sIdx + 1}
                                                                </span>
                                                                {s.transactionId && (
                                                                    <span className="text-[11px] font-mono text-dim">
                                                                        Ref ID: <strong className="text-white">{s.transactionId}</strong>
                                                                    </span>
                                                                )}
                                                                {s.date && (
                                                                    <span className="text-[11px] font-mono text-dim">
                                                                        Date: <strong className="text-white">{formatDateDMY(s.date)}</strong>
                                                                    </span>
                                                                )}
                                                                {s.amount !== undefined && (
                                                                    <span className="text-[11px] font-bold text-dim">
                                                                        Amount: <strong className="text-white">${Number(s.amount).toFixed(2)}</strong> ({s.type || 'DEBIT'})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                            <div className="text-dim">
                                                                <span className="font-semibold text-main">{s.description || 'Transaction'}</span>
                                                                {s.party && <span className="ml-2 text-[11px] text-dim">({s.party})</span>}
                                                            </div>
                                                            <div className="flex items-start gap-1.5 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-semibold shrink-0">
                                                                <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                                                <span>{s.reason || 'Skipped due to validation'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: Auto Set-Off Details */}
                            {resultActiveTab === 'setoff' && result.setOffResults && result.setOffResults.length > 0 && (
                                            <div className="space-y-3">
                                                <div className="border rounded-2xl overflow-hidden divide-y" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                                    {result.setOffResults.map((so: any, idx: number) => {
                                                        const partyName = so.supplierName || so.customerName || 'Connected Party';
                                                        const isSupplier = Boolean(so.supplierName);
                                                        const items = isSupplier ? (so.billsSetOff || []) : (so.invoicesSetOff || []);
                                                        return (
                                                            <div key={idx} className="p-3.5 space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-xs font-bold text-main flex items-center gap-1.5">
                                                                        {isSupplier ? '🏢' : '👤'} {partyName}
                                                                    </span>
                                                                    <span className={`text-xs font-mono font-bold ${isSupplier ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                                        {isSupplier ? `Vendor Payment: $${Number(so.amount || 0).toFixed(2)}` : `Customer Receipt: $${Number(so.amount || 0).toFixed(2)}`}
                                                                    </span>
                                                                </div>
                                                                {items.length > 0 ? (
                                                                    <div className="space-y-1.5 bg-black/10 dark:bg-white/5 p-2.5 rounded-xl border border-white/5">
                                                                        {items.map((item: any, itemIdx: number) => {
                                                                            const docNum = item.billNumber || item.invoiceNumber;
                                                                            const status = item.newStatus || 'PAID';
                                                                            return (
                                                                                <div key={itemIdx} className="flex justify-between items-center text-[11px]">
                                                                                    <span className={`font-bold flex items-center gap-1 ${isSupplier ? 'text-amber-300' : 'text-violet-300'}`}>
                                                                                        {isSupplier ? '📄' : '🧾'} {docNum}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="font-mono text-white/70">${Number(item.amountApplied || 0).toFixed(2)}</span>
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                                                            {status}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[10px] text-white/40 pl-2">
                                                                        {isSupplier ? 'No unpaid bills to set off' : 'No unpaid invoices to set off'}
                                                                    </p>
                                                                )}
                                                                {so.excessAmount > 0.01 && (
                                                                    <p className="text-[10px] text-amber-400 pl-2 flex items-center gap-1 font-medium">
                                                                        ⚠️ Excess amount: ${Number(so.excessAmount).toFixed(2)} {isSupplier ? '(recorded as advance paid to vendor)' : '(recorded as advance received from customer)'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                            <div>
                                                {(result.skippedCount || 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadSkippedReportCSV(result.skippedTransactions || [], fileName)}
                                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
                                                    >
                                                        <Download size={14} /> Download Skipped Rows (CSV)
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleReset} className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all border hover:bg-white/5 cursor-pointer bg-transparent" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                                    Upload Another File
                                                </button>
                                                <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all border-none hover:scale-105 active:scale-95 shadow-md cursor-pointer" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                        </div>
                    )}
        </div>
    );

    return (
        <div className={isAsPage ? "container-responsive space-y-6 pb-20 animate-fade-in" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"}>
            {isAsPage ? (
                <div className="space-y-6 w-full">
                    {/* Breadcrumbs & Title */}
                    <Breadcrumbs items={selectedAccount ? [
                        { label: 'Finance', path: '#' },
                        { label: 'Bank Accounts', path: '../bank-accounts' },
                        { label: `${selectedAccount.accountName || selectedAccount.bankName} Ledger`, path: `../bank-accounts/${selectedAccount._id}/ledger` },
                        { label: 'Bulk Transactions Upload', active: true }
                    ] : [
                        { label: 'Finance', path: '#' },
                        { label: 'Bulk Uploads Hub', path: '../bulk-uploads' },
                        { label: 'Bulk Bank Transactions Upload', active: true }
                    ]} />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                        <div>
                            <button
                                onClick={handleClose}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-brand-black dark:hover:text-lime transition-colors mb-3 group cursor-pointer bg-transparent border-none"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                {selectedAccount ? `Back to ${selectedAccount.accountName || selectedAccount.bankName}` : 'Back'}
                            </button>
                            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                                <Upload size={26} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                Bulk Bank Transactions Upload
                            </h1>
                            <p className="text-xs text-dim mt-1" style={{ color: 'var(--text-dim)' }}>
                                Import, validate, and set off bank transactions via Excel/CSV for {selectedAccount ? selectedAccount.accountName || selectedAccount.bankName : 'bank accounts'}.
                            </p>
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="rounded-2xl border p-6 shadow-md flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {renderMainBody()}
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-scale-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                                <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Bulk Bank Transactions Upload</h2>
                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Reset and re-import ledger transactions via Excel/CSV for specific bank accounts</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110 border-none bg-transparent cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        {renderMainBody()}
                    </div>
                </div>
            )}

            {/* Dedicated Validation Errors Modal */}
            {showErrorsModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div
                        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-scale-in"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-main flex items-center gap-2">
                                        Validation Errors Review
                                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                            {errorRowsWithIndex.length} Failed Row{errorRowsWithIndex.length === 1 ? '' : 's'}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-dim mt-0.5">
                                        Review individual row validation failures, filter by error category, or download the error CSV report.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowErrorsModal(false)}
                                className="p-2 rounded-lg text-dim hover:text-white hover:bg-white/10 transition-all border-none bg-transparent cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Category Filter Chips & Search Bar */}
                        <div className="p-4 border-b space-y-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                            {/* Category Filter Chips */}
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setErrorCategoryFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                        errorCategoryFilter === 'all'
                                            ? 'bg-white/15 text-white border-white/30 shadow-sm'
                                            : 'bg-white/5 text-dim border-transparent hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    All Failures ({errorCategoryCounts.all})
                                </button>
                                {errorCategoryCounts.duplicate > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorCategoryFilter('duplicate')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            errorCategoryFilter === 'duplicate'
                                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                                : 'bg-amber-500/10 text-amber-400 border-transparent hover:bg-amber-500/15'
                                        }`}
                                    >
                                        Duplicate / Existing IDs ({errorCategoryCounts.duplicate})
                                    </button>
                                )}
                                {errorCategoryCounts.account > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorCategoryFilter('account')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            errorCategoryFilter === 'account'
                                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                                                : 'bg-rose-500/10 text-rose-400 border-transparent hover:bg-rose-500/15'
                                        }`}
                                    >
                                        Account / Bank Not Found ({errorCategoryCounts.account})
                                    </button>
                                )}
                                {errorCategoryCounts.branch > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorCategoryFilter('branch')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            errorCategoryFilter === 'branch'
                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                                                : 'bg-blue-500/10 text-blue-400 border-transparent hover:bg-blue-500/15'
                                        }`}
                                    >
                                        Branch Resolution ({errorCategoryCounts.branch})
                                    </button>
                                )}
                                {errorCategoryCounts.missing > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorCategoryFilter('missing')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            errorCategoryFilter === 'missing'
                                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                                                : 'bg-purple-500/10 text-purple-400 border-transparent hover:bg-purple-500/15'
                                        }`}
                                    >
                                        Missing Fields / Formats ({errorCategoryCounts.missing})
                                    </button>
                                )}
                                {errorCategoryCounts.other > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorCategoryFilter('other')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            errorCategoryFilter === 'other'
                                                ? 'bg-gray-500/20 text-gray-300 border-gray-500/40 shadow-sm'
                                                : 'bg-gray-500/10 text-gray-400 border-transparent hover:bg-gray-500/15'
                                        }`}
                                    >
                                        Other ({errorCategoryCounts.other})
                                    </button>
                                )}
                            </div>

                            {/* Search Box */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                                <input
                                    type="text"
                                    placeholder="Search by Row #, Description, Transaction ID, Account, or Error..."
                                    value={errorSearchQuery}
                                    onChange={(e) => setErrorSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-semibold outline-none border transition-all focus:border-rose-500"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                                {errorSearchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setErrorSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-dim hover:text-white border-none bg-transparent cursor-pointer"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Error List Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar max-h-[450px]">
                            {filteredErrorRows.length === 0 ? (
                                <div className="py-12 text-center text-dim text-xs">
                                    No validation errors match the selected filter or search.
                                </div>
                            ) : (
                                filteredErrorRows.map(({ row, index: originalIdx }) => {
                                    const raw = row._rawRow || {};
                                    const bankName = String(getRowVal(raw, ['bank name', 'Bank Name']) || selectedAccount?.accountName || '-');
                                    const accName = row.accountsName || String(getRowVal(raw, ['sub account', 'accounts name']) || '-');
                                    const branch = String(getRowVal(raw, ['branch', 'Branch']) || '-');
                                    const dateStr = formatDateDMY(row.Date);
                                    const amountStr = row.Debit > 0 ? `Debit: $${row.Debit.toFixed(2)}` : row.Credit > 0 ? `Credit: $${row.Credit.toFixed(2)}` : `Amount: $${row.Amount.toFixed(2)}`;

                                    return (
                                        <div
                                            key={originalIdx}
                                            className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.04] space-y-2.5 transition-all hover:border-rose-500/40"
                                        >
                                            {/* Row Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/10 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 font-mono">
                                                        Row #{originalIdx + 1}
                                                    </span>
                                                    {row.transactionId && (
                                                        <span className="text-[11px] font-mono text-dim">
                                                            Ref: <strong className="text-white">{row.transactionId}</strong>
                                                        </span>
                                                    )}
                                                    <span className="text-[11px] font-mono text-dim">
                                                        Date: <strong className="text-white">{dateStr}</strong>
                                                    </span>
                                                    <span className="text-[11px] font-bold text-dim">
                                                        {amountStr}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setRows(prev => prev.filter((_, i) => i !== originalIdx))}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded transition-colors border-none bg-transparent cursor-pointer"
                                                    title="Discard this invalid row"
                                                >
                                                    <Trash2 size={12} /> Remove Row
                                                </button>
                                            </div>

                                            {/* Row Context */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-dim block">Description</span>
                                                    <span className="text-main font-semibold truncate block" title={row.Description}>{row.Description || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-dim block">Bank / Account</span>
                                                    <span className="text-main font-semibold truncate block" title={`${bankName} -> ${accName}`}>{bankName} &rarr; {accName}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold text-dim block">Branch</span>
                                                    <span className="text-main font-semibold truncate block">{branch}</span>
                                                </div>
                                            </div>

                                            {/* Error Badges */}
                                            <div className="space-y-1 pt-1">
                                                <span className="text-[10px] uppercase font-black tracking-wider text-rose-400 block">
                                                    Failure Reasons:
                                                </span>
                                                <div className="space-y-1">
                                                    {row._rowErrors.map((errMessage: string, eIdx: number) => (
                                                        <div
                                                            key={eIdx}
                                                            className="flex items-start gap-1.5 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-medium"
                                                        >
                                                            <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                                                            <span>{errMessage}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="text-xs text-dim">
                                Showing <strong>{filteredErrorRows.length}</strong> of <strong>{errorRowsWithIndex.length}</strong> invalid row(s)
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const exportRows = filteredErrorRows.map(e => e.row);
                                        const suffix = errorCategoryFilter !== 'all' ? errorCategoryFilter : '';
                                        downloadFailedRowsCSV(exportRows, fileName, suffix);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition-all cursor-pointer"
                                >
                                    <Download size={14} /> Download {errorCategoryFilter !== 'all' ? `${errorCategoryFilter} Errors` : 'All Errors'} (CSV)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm(`Discard all ${errorRowsWithIndex.length} invalid rows?`)) {
                                            setRows(prev => prev.filter(r => r._rowErrors.length === 0));
                                            setShowErrorsModal(false);
                                            setTableFilter('all');
                                            toast.success(`Removed ${errorRowsWithIndex.length} invalid rows`);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-dim hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 transition-all cursor-pointer"
                                >
                                    <Trash2 size={14} /> Purge All Errors
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowErrorsModal(false)}
                                    className="px-5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border-none transition-all cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default BulkLedgerUpload;

