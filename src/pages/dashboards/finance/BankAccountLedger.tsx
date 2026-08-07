import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
    ArrowLeft,
    List,
    AlertTriangle,
    FileText,
    Receipt,
    User,
    Upload,
    FileSpreadsheet,
    Info,
    Coins,
    Building2,
    Plus,
    ArrowUpDown,
    Search,
    ArrowDownRight,
    ArrowUpRight,
    Eye,
    DollarSign,
    UserCheck,
    Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBankAccountById, type BankAccount, uploadBankStatement, recordManualPayment, getAllBankAccounts, getBankAccountTransactions, downloadBankAccountLedgerPdf } from '../../../services/bankAccountService';
import { type LedgerEntry } from '../../../services/ledgerService';
import { getAllBranches } from '../../../services/branchService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getInvoicesByCustomer, getInvoices, type Invoice } from '../../../services/invoiceService';
import { getAllBills, type Bill } from '../../../services/billService';
import { getAllAccountingCodes, type AccountingCode } from '../../../services/accountingService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const BankAccountLedger = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [account, setAccount] = useState<BankAccount | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalDeposits, setTotalDeposits] = useState(0);
    const [totalWithdrawals, setTotalWithdrawals] = useState(0);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [closingBalance, setClosingBalance] = useState<number | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [dlFrom, setDlFrom] = useState('');
    const [dlTo, setDlTo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [search, setSearch] = useState('');
    const [balance, setBalance] = useState('');

    // Selection and Bulk Edit States
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [editEntries, setEditEntries] = useState<any[]>([]);
    const [allBankAccountsList, setAllBankAccountsList] = useState<BankAccount[]>([]);
    const [allAccountingCodes, setAllAccountingCodes] = useState<AccountingCode[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    void allInvoices;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saving, setSaving] = useState(false);

    // Change Invoice Sidebar States
    const [invoiceSidebarOpen, setInvoiceSidebarOpen] = useState(false);
    const [invoiceSidebarEntryIdx, setInvoiceSidebarEntryIdx] = useState<number | null>(null);
    const [sidebarMode, setSidebarMode] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
    const [sidebarCustomers, setSidebarCustomers] = useState<Customer[]>([]);
    const [sidebarCustomerSearch, setSidebarCustomerSearch] = useState('');
    const [sidebarSelectedCustomer, setSidebarSelectedCustomer] = useState<Customer | null>(null);
    const [sidebarInvoices, setSidebarInvoices] = useState<Invoice[]>([]);
    const [sidebarLoadingInvoices, setSidebarLoadingInvoices] = useState(false);
    const [sidebarLoadingCustomers, setSidebarLoadingCustomers] = useState(false);

    // Supplier / Vendor Sidebar States
    const [sidebarSuppliers, setSidebarSuppliers] = useState<Supplier[]>([]);
    const [sidebarSupplierSearch, setSidebarSupplierSearch] = useState('');
    const [sidebarSelectedSupplier, setSidebarSelectedSupplier] = useState<Supplier | null>(null);
    const [sidebarBills, setSidebarBills] = useState<Bill[]>([]);
    const [sidebarLoadingSuppliers, setSidebarLoadingSuppliers] = useState(false);
    const [sidebarLoadingBills, setSidebarLoadingBills] = useState(false);

    // Change Amount Modal States
    const [changeAmountModalOpen, setChangeAmountModalOpen] = useState(false);
    const [changeAmountEntryIdx, setChangeAmountEntryIdx] = useState<number | null>(null);
    const [modalAmountVal, setModalAmountVal] = useState<number>(0);
    const [modalTypeVal, setModalTypeVal] = useState<string>('DEBIT');

    const openChangeAmountModal = (idx: number) => {
        setChangeAmountEntryIdx(idx);
        setModalAmountVal(editEntries[idx]?.amount || 0);
        setModalTypeVal(editEntries[idx]?.type || 'DEBIT');
        setChangeAmountModalOpen(true);
    };

    const closeChangeAmountModal = () => {
        setChangeAmountModalOpen(false);
        setChangeAmountEntryIdx(null);
    };

    const handleSaveAmountFromModal = () => {
        if (changeAmountEntryIdx === null) return;
        if (modalAmountVal <= 0) {
            toast.error('Amount must be greater than zero');
            return;
        }
        const updated = [...editEntries];
        updated[changeAmountEntryIdx].amount = modalAmountVal;
        updated[changeAmountEntryIdx].type = modalTypeVal;

        setEditEntries(updated);
        closeChangeAmountModal();
        toast.success(`Updated amount to $${modalAmountVal.toFixed(2)}.`);
    };

    useEffect(() => {
        setSelectedIds([]);
    }, [page, limit, sortDirection, startDate, endDate, search, balance]);

    useEffect(() => {
        if (isBulkEditing) {
            const loadDataAndInitialize = async () => {
                try {
                    const [banksRes, codesRes, invoicesRes] = await Promise.all([
                        getAllBankAccounts({ limit: 100 }),
                        getAllAccountingCodes(),
                        getInvoices({ limit: 1000, ignoreDefaultDates: true })
                    ]);

                    const bankList = banksRes.data || [];
                    const codesList = Array.isArray(codesRes) ? codesRes : ((codesRes as any).data || []);
                    const invoiceList = invoicesRes.data || (invoicesRes as any).invoices || [];

                    setAllBankAccountsList(bankList);
                    setAllAccountingCodes(codesList);
                    setAllInvoices(invoiceList);

                    const selected = entries.filter(e => selectedIds.includes(e._id)).map(e => {
                        const targetBankId = (e as any).bankAccountId || id;
                        const bank = bankList.find((b: any) => String(b._id) === String(targetBankId));

                        // Find the appropriate accounting code/offset account from the entry's partner leg or accountingCode
                        const targetCodeId = (e as any).accountingCode || '';
                        const matchedCode = codesList.find((c: any) =>
                            String(c._id) === String(targetCodeId) ||
                            (c.code || '').toLowerCase().trim() === String(targetCodeId).toLowerCase().trim() ||
                            (c.name || '').toLowerCase().trim() === String(targetCodeId).toLowerCase().trim()
                        );

                        // Find the linked invoice if any
                        let targetInvoiceId = (e as any).invoice || '';
                        if (!targetInvoiceId && e.description) {
                            const entityMatch = e.description.match(/entity_number:\s*([^\s|\]]+)/i);
                            if (entityMatch) {
                                targetInvoiceId = entityMatch[1];
                            } else {
                                const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/i;
                                const matchInvoice = e.description.match(invoiceRegex);
                                if (matchInvoice) {
                                    targetInvoiceId = matchInvoice[0];
                                }
                            }
                        }

                        const matchedInvoice = invoiceList.find((inv: any) =>
                            String(inv._id) === String(targetInvoiceId) ||
                            (inv.invoiceNumber || '').toLowerCase().trim() === String(targetInvoiceId).toLowerCase().trim()
                        );

                        // Resolve customer if invoice has one
                        let resolvedCustomerId = (e as any).customer || '';
                        if (matchedInvoice) {
                            const custId = typeof matchedInvoice.customer === 'object' && matchedInvoice.customer
                                ? matchedInvoice.customer._id
                                : matchedInvoice.customer;
                            if (custId) resolvedCustomerId = custId;
                        }

                        return {
                            id: e._id,
                            entryDate: e.entryDate ? new Date(e.entryDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                            description: e.description || '',
                            type: e.type || 'DEBIT',
                            amount: e.amount || 0,
                            accountingCode: matchedCode ? matchedCode._id : '',
                            tempAccountingCodeName: matchedCode ? `${matchedCode.code} - ${matchedCode.name}` : (targetCodeId || ''),
                            bankAccountId: targetBankId,
                            bankName: bank ? (bank.accountName || bank.bankName) : '',
                            tempBankName: bank ? (bank.accountName || bank.bankName) : '',
                            invoice: matchedInvoice ? matchedInvoice._id : '',
                            originalInvoice: matchedInvoice ? matchedInvoice._id : '',
                            customer: resolvedCustomerId || (e as any).customer,
                            customerName: (e as any).customerName || (typeof (e as any).customer === 'object' ? (e as any).customer?.name : ''),
                            supplier: (e as any).supplier,
                            supplierName: (e as any).supplierName || (typeof (e as any).supplier === 'object' ? ((e as any).supplier?.name || (e as any).supplier?.companyName) : ''),
                            contact: (e as any).contact,
                            contactModel: (e as any).contactModel,
                            contactName: (e as any).contactName || (typeof (e as any).contact === 'object' ? ((e as any).contact?.name || (e as any).contact?.companyName) : ''),
                            setOffSummary: (e as any).setOffSummary
                        };
                    });
                    setEditEntries(selected);
                } catch (err) {
                    console.error('Failed to load bulk edit dependencies', err);
                }
            };
            loadDataAndInitialize();
        } else {
            setEditEntries([]);
        }
    }, [isBulkEditing, selectedIds, entries, id]);

    // Import Statement Modal States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    // Dynamic bank statement import preview & branch selection
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    // Record Payment Modal States
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
    const [paymentType, setPaymentType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
    const [chartAccounts, setChartAccounts] = useState<Array<{
        _id: string;
        accountName: string;
        accountCode?: string;
        accountNumber?: string;
        category?: string;
        currency?: string;
        currentBalance?: number;
        type: 'BANK_ACCOUNT' | 'ACCOUNTING_CODE';
    }>>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [recording, setRecording] = useState(false);

    // Form states
    const [paymentAmount, setPaymentAmount] = useState('');
    const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10)); // default today YYYY-MM-DD
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountSearch, setToAccountSearch] = useState('');
    const [showToAccountList, setShowToAccountList] = useState(false);
    const [paymentDescription, setPaymentDescription] = useState('');
    const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);

    // Customer Selection States
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

    const selectedFromAccountObj = chartAccounts.find(acc => acc._id === fromAccountId);

    const filteredToAccounts = React.useMemo(() => {
        if (!toAccountSearch.trim()) return chartAccounts;
        const query = toAccountSearch.toLowerCase().trim();
        return chartAccounts.filter(acc => {
            const name = (acc.accountName || '').toLowerCase();
            const num = (acc.accountNumber || '').toLowerCase();
            const code = (acc.accountCode || '').toLowerCase();
            const cat = (acc.category || '').toLowerCase();
            return name.includes(query) || num.includes(query) || code.includes(query) || cat.includes(query);
        });
    }, [chartAccounts, toAccountSearch]);

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerId?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const liveSetOffPreview = React.useMemo(() => {
        if (!selectedCustomer || !customerInvoices || customerInvoices.length === 0) {
            return null;
        }
        const amt = Number(paymentAmount) || 0;
        if (amt <= 0) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isOverdue = (inv: Invoice) => {
            if (inv.status === 'OVERDUE') return true;
            if (inv.dueDate && new Date(inv.dueDate) < today) return true;
            return false;
        };

        const overdue = customerInvoices.filter(inv => isOverdue(inv)).sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        const partial = customerInvoices.filter(inv => !isOverdue(inv) && inv.status === 'PARTIAL').sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        const pending = customerInvoices.filter(inv => !isOverdue(inv) && inv.status !== 'PARTIAL').sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

        const sorted = [...overdue, ...partial, ...pending];

        let remaining = amt;
        const allocations: Array<{
            invoice: Invoice;
            currentBalance: number;
            amountApplied: number;
            newBalance: number;
            newStatus: string;
        }> = [];

        for (const inv of sorted) {
            if (remaining <= 0) break;
            const curBal = inv.balance ?? ((inv.totalAmountDue || 0) - (inv.amountPaid || 0));
            if (curBal <= 0) continue;

            const applied = Math.min(remaining, curBal);
            const newBal = Math.max(0, curBal - applied);
            const newStatus = newBal <= 0 ? 'PAID' : 'PARTIAL';

            allocations.push({
                invoice: inv,
                currentBalance: curBal,
                amountApplied: applied,
                newBalance: newBal,
                newStatus
            });

            remaining -= applied;
        }

        return {
            allocations,
            totalSetOff: amt - remaining,
            excessAdvance: remaining
        };
    }, [selectedCustomer, customerInvoices, paymentAmount]);

    useEffect(() => {
        if (isRecordPaymentModalOpen) {
            const fetchAccountsAndCustomers = async () => {
                setLoadingAccounts(true);
                try {
                    const [bankRes, codeRes, custRes] = await Promise.all([
                        getAllBankAccounts({ limit: 100 }),
                        getAllAccountingCodes({ limit: 1000 }),
                        getAllCustomers({ status: 'ACTIVE', limit: 200 })
                    ]);

                    const bankList = (bankRes.data || [])
                        .filter((acc: BankAccount) => acc._id !== id && acc.status === 'ACTIVE')
                        .map((acc: BankAccount) => ({
                            _id: acc._id,
                            accountName: acc.accountName || acc.bankName,
                            accountCode: acc.accountCode || acc.accountNumber,
                            accountNumber: acc.accountNumber,
                            category: 'BANK ACCOUNT',
                            currency: acc.currency,
                            currentBalance: acc.currentBalance,
                            type: 'BANK_ACCOUNT' as const
                        }));

                    const rawCodes = Array.isArray(codeRes) ? codeRes : ((codeRes as any)?.data || []);
                    const codeList = rawCodes.map((c: AccountingCode) => ({
                        _id: c._id,
                        accountName: `${c.code} - ${c.name}`,
                        accountCode: c.code,
                        category: c.category,
                        currency: c.currency,
                        type: 'ACCOUNTING_CODE' as const
                    }));

                    setChartAccounts([...bankList, ...codeList]);
                    setCustomers(custRes.data || (custRes as any).customers || []);
                } catch (err) {
                    console.error('Failed to fetch accounts and customers', err);
                    toast.error('Failed to load accounts list');
                } finally {
                    setLoadingAccounts(false);
                }
            };
            fetchAccountsAndCustomers();
        }
    }, [isRecordPaymentModalOpen, id]);

    useEffect(() => {
        if (selectedCustomer) {
            const fetchCustomerInvoices = async () => {
                try {
                    const invoices = await getInvoicesByCustomer(selectedCustomer._id);
                    // Filter to keep only PENDING, PARTIAL, OVERDUE invoices
                    const openInvoices = invoices.filter(inv =>
                        inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE'
                    );
                    setCustomerInvoices(openInvoices);
                } catch (err) {
                    console.error('Failed to fetch customer invoices', err);
                    toast.error('Failed to load invoices for selected customer');
                }
            };
            fetchCustomerInvoices();
        } else {
            setCustomerInvoices([]);
            setSelectedInvoiceId('');
        }
    }, [selectedCustomer]);

    interface ParsedTransaction {
        date: string;
        description: string;
        referenceNumber: string;
        payee: string;
        withdrawal: number;
        deposit: number;
        type: 'DEBIT' | 'CREDIT';
        amount: number;
        isValid: boolean;
        error?: string;
    }
    const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const branchesRes = await getAllBranches({ limit: 100 });
                const branchesList = branchesRes.data || [];
                setBranches(branchesList);
                if (branchesList.length > 0) {
                    setSelectedBranchId(branchesList[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch branches', err);
            }
        };
        fetchBranches();
    }, []);


    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // 1. Fetch the bank account details
            const res = await getBankAccountById(id);
            const accountData = res.data || res;
            setAccount(accountData);

            // 2. Fetch the transactions for this bank account
            const filters = {
                page,
                limit,
                sort: sortDirection,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: search || undefined,
                balance: balance || undefined
            };
            const txRes = await getBankAccountTransactions(id, filters);
            setEntries(Array.isArray(txRes.data) ? txRes.data : []);
            setTotalDeposits(txRes.totalDeposits || 0);
            setTotalWithdrawals(txRes.totalWithdrawals || 0);
            setOpeningBalance(txRes.openingBalance || 0);
            if (txRes.closingBalance !== undefined && txRes.closingBalance !== null) {
                setClosingBalance(txRes.closingBalance);
            } else {
                setClosingBalance(null);
            }
            if (txRes.pagination) {
                setPagination({
                    total: txRes.pagination.total || 0,
                    pages: txRes.pagination.totalPages || txRes.pagination.pages || 1,
                    limit: txRes.pagination.limit || 25
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch details');
        } finally {
            setLoading(false);
        }
    }, [id, page, limit, sortDirection, startDate, endDate, search, balance]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    const normalizeHeader = (header: string): string => {
        return header.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const processRawRows = (rawRows: Record<string, any>[]) => {
        if (!rawRows || rawRows.length === 0) {
            toast.error("The file is empty or contains no data rows.");
            return;
        }

        // Find keys
        const firstRow = rawRows[0];
        const keys = Object.keys(firstRow);

        let dateKey = '';
        let withdrawalKey = '';
        let depositKey = '';
        let payeeKey = '';
        let descKey = '';
        let refKey = '';

        keys.forEach(k => {
            const normalized = normalizeHeader(k);
            if (['date', 'transactiondate', 'entrydate'].includes(normalized)) {
                dateKey = k;
            } else if (['withdrawals', 'withdrawal', 'withdraw', 'debits', 'debit', 'dr'].includes(normalized)) {
                withdrawalKey = k;
            } else if (['deposits', 'deposit', 'credits', 'credit', 'cr'].includes(normalized)) {
                depositKey = k;
            } else if (['payee', 'paidto', 'party', 'contact'].includes(normalized)) {
                payeeKey = k;
            } else if (['description', 'details', 'memo', 'narration', 'comment'].includes(normalized)) {
                descKey = k;
            } else if (['referencenumber', 'ref', 'reference', 'refnumber', 'chequenumber'].includes(normalized)) {
                refKey = k;
            }
        });

        // Let's validate keys
        if (!dateKey) {
            toast.error("Missing required column: Date");
            return;
        }
        if (!withdrawalKey && !depositKey) {
            toast.error("Missing required column: Withdrawals or Deposits");
            return;
        }

        const transactions: ParsedTransaction[] = rawRows.map((row) => {
            const dateStr = String(row[dateKey] || '').trim();
            const withdrawalVal = Number(row[withdrawalKey]) || 0;
            const depositVal = Number(row[depositKey]) || 0;
            const payeeVal = payeeKey ? String(row[payeeKey] || '').trim() : '';
            const descVal = descKey ? String(row[descKey] || '').trim() : '';
            const refVal = refKey ? String(row[refKey] || '').trim() : '';

            let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
            let amount = 0;
            let isValid = true;
            let errorMsg = '';

            // Validation checks
            const parsedDate = new Date(dateStr);
            if (dateStr === '' || isNaN(parsedDate.getTime())) {
                isValid = false;
                errorMsg = 'Invalid date';
            }

            if (withdrawalVal > 0 && depositVal > 0) {
                isValid = false;
                errorMsg = 'Both DR/CR present';
            } else if (withdrawalVal <= 0 && depositVal <= 0) {
                isValid = false;
                errorMsg = 'No amount';
            } else if (withdrawalVal > 0) {
                type = 'CREDIT';
                amount = withdrawalVal;
            } else if (depositVal > 0) {
                type = 'DEBIT';
                amount = depositVal;
            }

            if (amount < 0) {
                isValid = false;
                errorMsg = 'Negative amount';
            }

            return {
                date: dateStr,
                description: descVal,
                referenceNumber: refVal,
                payee: payeeVal,
                withdrawal: withdrawalVal,
                deposit: depositVal,
                type,
                amount,
                isValid,
                error: errorMsg
            };
        });

        setParsedTransactions(transactions);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        setParsedTransactions([]);

        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    processRawRows(results.data as Record<string, any>[]);
                },
                error: (err) => {
                    toast.error(`CSV Parse Error: ${err.message}`);
                }
            });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);
                    processRawRows(jsonRows);
                } catch (err: any) {
                    toast.error(`Excel Parse Error: ${err.message || err}`);
                }
            };
            reader.readAsBinaryString(file);
        } else {
            toast.error("Unsupported file type. Please upload a .csv, .xls, or .xlsx file.");
        }
    };

    const handleImportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        if (!importFile) {
            toast.error('Please upload a statement file');
            return;
        }

        const validTxs = parsedTransactions.filter(tx => tx.isValid);
        if (validTxs.length === 0) {
            toast.error('No valid transactions to reconcile.');
            return;
        }

        if (!selectedBranchId) {
            toast.error('Please select a target branch.');
            return;
        }

        setImporting(true);
        try {
            const res = await uploadBankStatement(id, selectedBranchId, validTxs);
            toast.success(res.message || 'Statement reconciliation completed successfully.');
            setIsImportModalOpen(false);
            setImportFile(null);
            setParsedTransactions([]);
            fetchData();
        } catch (err: any) {
            console.error('Failed to import statement', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to import bank statement');
        } finally {
            setImporting(false);
        }
    };

    const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (paymentType === 'PAYMENT' && !fromAccountId) {
            toast.error('Please select the destination account (To Account) from Chart of Accounts');
            return;
        }

        if (paymentType === 'RECEIPT' && !selectedCustomer && !fromAccountId) {
            toast.error('Please select either a Customer or a To Account from Chart of Accounts');
            return;
        }

        setRecording(true);
        try {
            const formData = new FormData();
            formData.append('amount', paymentAmount);
            formData.append('depositDate', depositDate);
            formData.append('paymentMode', paymentMode);
            formData.append('currency', paymentCurrency);
            formData.append('entryType', paymentType);
            if (fromAccountId) {
                formData.append('toAccountId', fromAccountId);
                formData.append('fromAccountId', fromAccountId);
            }
            formData.append('description', paymentDescription);
            if (supportingDocFile) {
                formData.append('supportingDocument', supportingDocFile);
            }
            if (selectedCustomer) {
                formData.append('customerId', selectedCustomer._id);
                if (selectedInvoiceId) {
                    formData.append('invoiceId', selectedInvoiceId);
                }
            }

            const res = await recordManualPayment(id, formData);
            toast.success(res.message || `${paymentType === 'PAYMENT' ? 'Payment (Money Out)' : 'Receipt (Money In)'} recorded successfully`);

            // Reset states
            setIsRecordPaymentModalOpen(false);
            setPaymentAmount('');
            setPaymentDescription('');
            setSupportingDocFile(null);
            setFromAccountId('');
            setToAccountSearch('');
            setCustomerSearch('');
            setSelectedCustomer(null);
            setShowCustomerList(false);
            setSelectedInvoiceId('');
            setCustomerInvoices([]);
            setPaymentType('RECEIPT');

            // Reload ledger
            fetchData();
        } catch (err: any) {
            console.error('Failed to record manual payment', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to record manual payment');
        } finally {
            setRecording(false);
        }
    };

    const handleInvoiceClick = async (invoiceNumber: string) => {
        try {
            const { getInvoices } = await import('../../../services/invoiceService');
            const response = await getInvoices({ search: invoiceNumber });
            const basePath = location.pathname.split('/bank-accounts/')[0];
            if (response.data && response.data.length > 0) {
                const invoice = response.data.find((inv: any) => inv.invoiceNumber === invoiceNumber) || response.data[0];
                navigate(`${basePath}/invoices/${invoice._id}`);
            } else {
                navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/bank-accounts/')[0];
            navigate(`${basePath}/invoices`, { state: { search: invoiceNumber } });
        }
    };

    const handleBillClick = async (billNumber: string) => {
        try {
            const { getAllBills } = await import('../../../services/billService');
            const response = await getAllBills({ search: billNumber });
            const basePath = location.pathname.split('/bank-accounts/')[0];
            if (response.success && response.data && response.data.length > 0) {
                const bill = response.data.find((b: any) => b.billNumber === billNumber) || response.data[0];
                navigate(`${basePath}/bills/${bill._id}`);
            } else {
                navigate(`${basePath}/bills`, { state: { search: billNumber } });
            }
        } catch (err) {
            const basePath = location.pathname.split('/bank-accounts/')[0];
            navigate(`${basePath}/bills`, { state: { search: billNumber } });
        }
    };

    const renderDescriptionWithLinks = (description: string, entry?: any) => {
        if (!description) return <span style={{ color: 'var(--text-dim)' }}>—</span>;

        const billRegex = /((?:BILL|SB)-\w+(?:-\w+)*)/gi;
        const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/gi;

        const matchedBills = Array.from(new Set(description.match(billRegex) || []));

        // Collect invoices from description regex match
        const matchedInvoicesFromDesc = description.match(invoiceRegex) || [];

        // Collect invoices from entry setOffSummary or invoices array if present
        const invoicesFromEntry: string[] = [];
        if (entry) {
            if (Array.isArray(entry.invoices)) {
                entry.invoices.forEach((inv: any) => {
                    const num = typeof inv === 'string' ? inv : inv?.invoiceNumber;
                    if (num) invoicesFromEntry.push(num);
                });
            }
            if (entry.setOffSummary && Array.isArray(entry.setOffSummary.invoices)) {
                entry.setOffSummary.invoices.forEach((inv: any) => {
                    if (inv?.invoiceNumber) invoicesFromEntry.push(inv.invoiceNumber);
                });
            }
        }

        const matchedInvoices = Array.from(new Set([...matchedInvoicesFromDesc, ...invoicesFromEntry]));

        if (matchedBills.length > 0 || matchedInvoices.length > 0) {
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {matchedBills.map((billNum) => (
                            <button
                                key={billNum}
                                onClick={(e) => { e.stopPropagation(); handleBillClick(billNum); }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 dark:text-lime dark:bg-lime/10 dark:border-lime/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 hover:underline self-start cursor-pointer"
                            >
                                <Receipt size={11} strokeWidth={2.5} />
                                View Bill ({billNum})
                            </button>
                        ))}
                        {matchedInvoices.map((invNum) => (
                            <button
                                key={invNum}
                                onClick={(e) => { e.stopPropagation(); handleInvoiceClick(invNum); }}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 dark:text-lime dark:bg-lime/10 dark:border-lime/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 hover:underline self-start cursor-pointer"
                            >
                                <FileText size={11} strokeWidth={2.5} />
                                View Invoice ({invNum})
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>;
    };

    // === Change / Link Customer / Vendor Sidebar Handlers (Auto Set-off) ===
    const openInvoiceSidebar = async (entryIdx: number) => {
        setInvoiceSidebarEntryIdx(entryIdx);
        setInvoiceSidebarOpen(true);
        setSidebarCustomerSearch('');
        setSidebarSupplierSearch('');
        setSidebarSelectedCustomer(null);
        setSidebarSelectedSupplier(null);
        setSidebarInvoices([]);
        setSidebarBills([]);

        const entry = editEntries[entryIdx];
        const isVendor = entry.contactModel === 'Supplier' ||
            entry.type === 'CREDIT' ||
            Boolean(entry.supplier || entry.supplierName || (entry.setOffSummary && (entry.setOffSummary as any).bills?.length));

        if (isVendor) {
            setSidebarMode('VENDOR');
            setSidebarLoadingSuppliers(true);
            try {
                const res = await getAllSuppliers({ limit: 500 });
                setSidebarSuppliers(res.data || (res as any).suppliers || []);
            } catch (err) {
                console.error('Failed to fetch suppliers for sidebar', err);
                toast.error('Failed to load suppliers');
            } finally {
                setSidebarLoadingSuppliers(false);
            }
        } else {
            setSidebarMode('CUSTOMER');
            setSidebarLoadingCustomers(true);
            try {
                const res = await getAllCustomers({ status: 'ACTIVE', limit: 500 });
                setSidebarCustomers(res.data || (res as any).customers || []);
            } catch (err) {
                console.error('Failed to fetch customers for sidebar', err);
                toast.error('Failed to load customers');
            } finally {
                setSidebarLoadingCustomers(false);
            }
        }
    };

    const closeInvoiceSidebar = () => {
        setInvoiceSidebarOpen(false);
        setInvoiceSidebarEntryIdx(null);
        setSidebarCustomerSearch('');
        setSidebarSupplierSearch('');
        setSidebarSelectedCustomer(null);
        setSidebarSelectedSupplier(null);
        setSidebarInvoices([]);
        setSidebarBills([]);
    };

    const handleCustomerClickForPreview = async (customer: Customer) => {
        setSidebarSelectedCustomer(customer);
        setSidebarLoadingInvoices(true);
        try {
            const invs = await getInvoicesByCustomer(customer._id);
            const openInvs = invs.filter(inv => inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE');
            setSidebarInvoices(openInvs);
        } catch (err) {
            console.error('Failed to fetch customer invoices for set-off preview', err);
            setSidebarInvoices([]);
        } finally {
            setSidebarLoadingInvoices(false);
        }
    };

    const handleSupplierClickForPreview = async (supplier: Supplier) => {
        setSidebarSelectedSupplier(supplier);
        setSidebarLoadingBills(true);
        try {
            const billsRes = await getAllBills({ supplier: supplier._id, limit: 100 });
            const billsList = billsRes.data || (billsRes as any).bills || [];
            const openBills = billsList.filter((b: Bill) =>
                b.status === 'OPEN' || b.status === 'PARTIALLY_PAID' || b.status === 'DRAFT'
            );
            setSidebarBills(openBills);
        } catch (err) {
            console.error('Failed to fetch supplier bills for set-off preview', err);
            setSidebarBills([]);
        } finally {
            setSidebarLoadingBills(false);
        }
    };

    const calculateSetOffSimulation = () => {
        if (invoiceSidebarEntryIdx === null) return null;
        const entry = editEntries[invoiceSidebarEntryIdx];
        const amount = entry?.amount || 0;

        if (sidebarMode === 'VENDOR') {
            if (!sidebarSelectedSupplier) return null;

            const isOverdue = (bill: Bill) => {
                if (bill.dueDate) {
                    return new Date(bill.dueDate).getTime() < Date.now();
                }
                return false;
            };

            const overdueBills = sidebarBills
                .filter(b => isOverdue(b))
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const partialBills = sidebarBills
                .filter(b => !isOverdue(b) && String(b.status).toUpperCase() === 'PARTIALLY_PAID')
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const openBills = sidebarBills
                .filter(b => !isOverdue(b) && String(b.status).toUpperCase() !== 'PARTIALLY_PAID')
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

            const sortedBills = [...overdueBills, ...partialBills, ...openBills];

            let remaining = amount;
            const setOffDetails: Array<{
                bill: Bill;
                amountApplied: number;
                newBalance: number;
                newStatus: string;
            }> = [];

            let totalSetOff = 0;

            for (const bill of sortedBills) {
                if (remaining <= 0.01) break;
                const billBalance = bill.balanceDue !== undefined ? bill.balanceDue : (bill.totalAmount - (bill.amountPaid || 0));
                if (billBalance <= 0) continue;

                const amountToApply = Math.min(remaining, billBalance);
                const newBal = Math.max(0, billBalance - amountToApply);
                const newStatus = newBal <= 0 ? 'PAID' : 'PARTIALLY_PAID';

                setOffDetails.push({
                    bill,
                    amountApplied: amountToApply,
                    newBalance: newBal,
                    newStatus
                });

                totalSetOff += amountToApply;
                remaining -= amountToApply;
            }

            const excessAmount = Math.max(0, amount - totalSetOff);

            return {
                type: 'VENDOR' as const,
                amount,
                totalSetOff,
                excessAmount,
                setOffDetails,
                supplier: sidebarSelectedSupplier
            };
        }

        // CUSTOMER Mode
        if (!sidebarSelectedCustomer) return null;

        const isOverdue = (inv: any) => {
            const st = String(inv.status || '').toUpperCase();
            if (st === 'OVERDUE') return true;
            if (inv.dueDate) {
                return new Date(inv.dueDate).getTime() < Date.now();
            }
            return false;
        };

        const overdueInvoices = sidebarInvoices
            .filter(inv => isOverdue(inv))
            .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

        const nonOverduePartialInvoices = sidebarInvoices
            .filter(inv => !isOverdue(inv) && String(inv.status).toUpperCase() === 'PARTIAL')
            .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

        const nonOverduePendingInvoices = sidebarInvoices
            .filter(inv => !isOverdue(inv) && String(inv.status).toUpperCase() !== 'PARTIAL')
            .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());

        const sortedInvoices = [...overdueInvoices, ...nonOverduePartialInvoices, ...nonOverduePendingInvoices];

        let remaining = amount;
        const setOffDetails: Array<{
            invoice: Invoice;
            amountApplied: number;
            newBalance: number;
            newStatus: string;
        }> = [];

        let totalSetOff = 0;

        for (const inv of sortedInvoices) {
            if (remaining <= 0.01) break;
            const invBalance = inv.balance ?? (inv.totalAmountDue - (inv.amountPaid || 0));
            if (invBalance <= 0) continue;

            const amountToApply = Math.min(remaining, invBalance);
            const newBal = Math.max(0, invBalance - amountToApply);
            const isInvOverdue = isOverdue(inv);
            const newStatus = newBal <= 0 ? 'PAID' : (isInvOverdue ? 'OVERDUE' : 'PARTIAL');

            setOffDetails.push({
                invoice: inv,
                amountApplied: amountToApply,
                newBalance: newBal,
                newStatus
            });

            totalSetOff += amountToApply;
            remaining -= amountToApply;
        }

        const excessAmount = Math.max(0, amount - totalSetOff);

        return {
            type: 'CUSTOMER' as const,
            amount,
            totalSetOff,
            excessAmount,
            setOffDetails,
            customer: sidebarSelectedCustomer
        };
    };

    const handleSidebarCustomerSelect = (customer: Customer) => {
        if (invoiceSidebarEntryIdx === null) return;

        const updated = [...editEntries];
        const entry = updated[invoiceSidebarEntryIdx];

        // Assign Customer for Auto Set-off
        entry.customer = customer._id;
        entry.customerName = customer.name;
        entry.contactModel = 'Customer';
        entry.contactName = customer.name;
        entry.supplier = undefined;
        entry.supplierName = undefined;
        entry.invoice = undefined;

        const simulation = calculateSetOffSimulation();
        if (simulation && simulation.type === 'CUSTOMER') {
            (entry as any).setOffSummary = {
                totalSetOff: simulation.totalSetOff,
                invoiceCount: simulation.setOffDetails.length,
                excessAmount: simulation.excessAmount,
                invoices: simulation.setOffDetails.map(d => ({
                    invoiceNumber: d.invoice.invoiceNumber,
                    amountApplied: d.amountApplied
                }))
            };
        }

        // Auto-resolve offset account to Accounts Receivable (code 1.1.03)
        const arCode = allAccountingCodes.find((c: any) => {
            const code = String(c.code || '').trim();
            const name = String(c.name || '').toLowerCase();
            const type = String(c.type || c.accountType || '').toLowerCase();
            return code === '1.1.03' || type.includes('receivable') || name.includes('accounts receivable');
        });
        if (arCode) {
            entry.accountingCode = arCode._id;
            entry.tempAccountingCodeName = `${arCode.code} - ${arCode.name}`;
        }

        setEditEntries(updated);
        toast.success(`Assigned ${customer.name} for automatic invoice set-off`);
        closeInvoiceSidebar();
    };

    const handleSidebarSupplierSelect = (supplier: Supplier) => {
        if (invoiceSidebarEntryIdx === null) return;

        const updated = [...editEntries];
        const entry = updated[invoiceSidebarEntryIdx];

        const supplierName = supplier.name || supplier.companyName || 'Supplier';

        // Assign Supplier for Auto Set-off
        entry.supplier = supplier._id;
        entry.supplierName = supplierName;
        entry.contactModel = 'Supplier';
        entry.contactName = supplierName;
        entry.customer = undefined;
        entry.customerName = undefined;
        entry.invoice = undefined;

        const simulation = calculateSetOffSimulation();
        if (simulation && simulation.type === 'VENDOR') {
            (entry as any).setOffSummary = {
                totalSetOff: simulation.totalSetOff,
                billCount: simulation.setOffDetails.length,
                excessAmount: simulation.excessAmount,
                bills: simulation.setOffDetails.map(d => ({
                    billNumber: d.bill.billNumber,
                    amountApplied: d.amountApplied
                }))
            };
        }

        // Auto-resolve offset account to Accounts Payable (code 2.1.01)
        const apCode = allAccountingCodes.find((c: any) => {
            const code = String(c.code || '').trim();
            const name = String(c.name || '').toLowerCase();
            const type = String(c.type || c.accountType || '').toLowerCase();
            return code === '2.1.01' || type.includes('payable') || name.includes('accounts payable');
        });
        if (apCode) {
            entry.accountingCode = apCode._id;
            entry.tempAccountingCodeName = `${apCode.code} - ${apCode.name}`;
        }

        setEditEntries(updated);
        toast.success(`Assigned ${supplierName} for automatic bill set-off`);
        closeInvoiceSidebar();
    };

    const handleUnlinkInvoice = (entryIdx: number) => {
        void handleUnlinkInvoice;
        const updated = [...editEntries];
        updated[entryIdx].invoice = undefined;
        updated[entryIdx].bill = undefined;
        updated[entryIdx].customer = undefined;
        updated[entryIdx].customerName = undefined;
        updated[entryIdx].supplier = undefined;
        updated[entryIdx].supplierName = undefined;
        updated[entryIdx].contactName = undefined;
        updated[entryIdx].contactModel = undefined;
        (updated[entryIdx] as any).setOffSummary = undefined;

        // Clear the auto-set code so user can pick an offset account
        updated[entryIdx].accountingCode = '';
        updated[entryIdx].tempAccountingCodeName = '';

        setEditEntries(updated);
        toast.success('Contact unlinked from transaction');
    };



    const handleBulkEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        for (let i = 0; i < editEntries.length; i++) {
            const entry = editEntries[i];
            if (!entry.description) {
                toast.error('All descriptions must be filled');
                return;
            }
            if (entry.amount <= 0) {
                toast.error('All amounts must be greater than zero');
                return;
            }

            // Skip offset account validation for invoice/supplier connected entries
            if (!entry.invoice && !entry.customer && !entry.supplier && !(entry as any).bill) {
                const normVal = (val: any) => String(val || '').replace(/\u00a0/g, ' ').replace(/[\/\\_-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const rawVal = String(entry.accountingCode || '').trim();
                const cleanEntry = normVal(entry.accountingCode);

                const hasMatchedCode = allAccountingCodes.some(c =>
                    String(c._id) === rawVal ||
                    (c.code && (c.code.trim() === rawVal || normVal(c.code) === cleanEntry)) ||
                    (c.name && (normVal(c.name) === cleanEntry || normVal(c.name).includes(cleanEntry) || cleanEntry.includes(normVal(c.name)))) ||
                    normVal(`${c.code || ''} ${c.name || ''}`) === cleanEntry
                );
                if (!hasMatchedCode) {
                    toast.error(`Row ${i + 1}: Offset Account "${entry.accountingCode || 'N/A'}" is not found in Chart of Accounts.`);
                    return;
                }
            }
        }

        try {
            setSaving(true);
            const { bulkEditBankAccountTransactions } = await import('../../../services/bankAccountService');

             const updatesPayload = editEntries.map(entry => {
                const normVal = (val: any) => String(val || '').replace(/\u00a0/g, ' ').replace(/[\/\\_-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                const rawVal = String(entry.accountingCode || '').trim();
                const cleanEntry = normVal(entry.accountingCode);

                const resolvedCodeObj = allAccountingCodes.find(c =>
                    String(c._id) === rawVal ||
                    (c.code && (c.code.trim() === rawVal || normVal(c.code) === cleanEntry)) ||
                    (c.name && (normVal(c.name) === cleanEntry || normVal(c.name).includes(cleanEntry) || cleanEntry.includes(normVal(c.name)))) ||
                    normVal(`${c.code || ''} ${c.name || ''}`) === cleanEntry
                );

                return {
                    id: entry.id,
                    entryDate: entry.entryDate ? new Date(entry.entryDate).toISOString() : new Date().toISOString(),
                    description: entry.description,
                    type: entry.type,
                    amount: entry.amount,
                    bankAccountId: entry.bankAccountId,
                    accountingCode: resolvedCodeObj ? resolvedCodeObj._id : entry.accountingCode,
                    customer: entry.customer || undefined,
                    supplier: entry.supplier || undefined,
                    invoice: entry.invoice || undefined,
                    bill: (entry as any).bill || undefined
                };
            });

            await bulkEditBankAccountTransactions(id, updatesPayload);
            toast.success('Entry updated and running balances recalculated successfully.');
            setIsBulkEditing(false);
            setSelectedIds([]);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to save bulk edits', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update transactions');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPdf = async () => {
        if (!id) return;
        setShowDownloadModal(false);
        setDownloading(true);
        const toastId = toast.loading('Generating ledger PDF...');
        try {
            const params: any = {
                startDate: dlFrom || undefined,
                endDate: dlTo || undefined,
                search: search || undefined,
                sort: sortDirection
            };
            const data = await downloadBankAccountLedgerPdf(id, params);
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const safeName = ((account?.accountName || account?.bankName || 'ledger') as string).replace(/\s+/g, '_');
            link.setAttribute('download', `${safeName}_ledger_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Ledger PDF downloaded!', { id: toastId });
        } catch (err: any) {
            console.error('Failed to download ledger PDF:', err);
            toast.error(err?.response?.data?.message || err.message || 'Failed to generate ledger PDF', { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    const handleBulkDeleteSubmit = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            const { bulkDeleteBankAccountTransactions } = await import('../../../services/bankAccountService');
            await bulkDeleteBankAccountTransactions(id, selectedIds);
            toast.success('Transactions deleted and running balances recalculated successfully.');
            setShowDeleteConfirm(false);
            setSelectedIds([]);
            fetchData();
        } catch (err: any) {
            console.error('Failed to delete transactions', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to delete transactions');
        } finally {
            setDeleting(false);
        }
    };

    const sortedEntries = React.useMemo(() => {
        return [...entries].sort((a, b) => {
            const dateA = new Date(a.entryDate || a.date || 0).getTime();
            const dateB = new Date(b.entryDate || b.date || 0).getTime();
            if (dateA === dateB) {
                const idA = String(a._id || '');
                const idB = String(b._id || '');
                return sortDirection === 'asc' ? idA.localeCompare(idB) : idB.localeCompare(idA);
            }
            return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        });
    }, [entries, sortDirection]);

    const isEntryConnectedWithInvoice = React.useCallback((entry: any): boolean => {
        if (!entry) return false;
        if (entry.invoice || entry.invoiceId || entry.invoiceNumber) return true;
        if (Array.isArray(entry.invoices) && entry.invoices.length > 0) return true;
        if (entry.setOffSummary && Array.isArray(entry.setOffSummary.invoices) && entry.setOffSummary.invoices.length > 0) return true;

        if (entry.description) {
            const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*|\b(?:invoice|inv\s*#|factura)\b)/i;
            if (invoiceRegex.test(entry.description)) return true;
        }
        return false;
    }, []);

    const selectableEntries = React.useMemo(() => {
        return sortedEntries;
    }, [sortedEntries]);

    const runningBalancesMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        if (!account) return map;

        // Sort visible entries chronologically (oldest first) to compute running balances starting from initialBalance
        const chronological = [...entries].sort((a, b) => {
            const dateA = new Date(a.entryDate || a.date || 0).getTime();
            const dateB = new Date(b.entryDate || b.date || 0).getTime();
            if (dateA === dateB) {
                return String(a._id || '').localeCompare(String(b._id || ''));
            }
            return dateA - dateB;
        });

        let current = account.initialBalance || 0;
        chronological.forEach(entry => {
            if (entry.runningBalance !== undefined && entry.runningBalance !== null) {
                current = entry.runningBalance;
            } else {
                const debit = entry.amount !== undefined
                    ? (entry.type === 'DEBIT' ? entry.amount : 0)
                    : (entry.debit || 0);
                const credit = entry.amount !== undefined
                    ? (entry.type === 'CREDIT' ? entry.amount : 0)
                    : (entry.credit || 0);
                current = current + debit - credit;
            }
            map[entry._id] = current;
        });
        return map;
    }, [entries, account]);

    if (loading && !account) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Account</h2>
                <p className="text-white/60">{error || 'Account not found'}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 mt-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold">
                    Go Back
                </button>
            </div>
        );
    }
    if (isBulkEditing && account) {
        return (
            <div className="container-responsive space-y-6 pb-20 animate-fade-in" style={{ color: 'var(--text-main)' }}>
                <Breadcrumbs
                    items={[
                        { label: 'Finance', path: '#' },
                        { label: 'Bank Accounts', path: '../bank-accounts' },
                        { label: `${account.accountName || account.bankName} Ledger`, path: `../bank-accounts/${id}/ledger` },
                        { label: 'Entry Edit', active: true }
                    ]}
                />

                {/* Page Title & Navigation Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            Entry Edit Engine
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            Edit transaction entry details. Use "Change Amount" or "Change Customer" actions to trigger automatic invoice set-offs and balance recalculations.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleBulkEditSubmit} className="space-y-6">
                    {/* All Edit Fields Overview Table */}
                    <div className="rounded-2xl border bg-card overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-4 border-b bg-black/5 dark:bg-white/5 flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                <FileText size={16} className="text-[#C8E600]" /> All Edit Fields Overview
                            </h3>
                            <span className="text-[11px] font-bold text-[#C8E600] px-3 py-1 rounded-full bg-[#C8E600]/10 border border-[#C8E600]/20">
                                {editEntries.length} Transaction(s) Selected
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Date & Time</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-44">Connected Bank</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-64">Customer / Vendor</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-44">Type & Amount</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider w-64 text-center">Edit Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {editEntries.map((entry, idx) => (
                                        <tr key={entry.id || idx} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="datetime-local"
                                                    value={entry.entryDate}
                                                    onChange={e => {
                                                        const updated = [...editEntries];
                                                        updated[idx].entryDate = e.target.value;
                                                        setEditEntries(updated);
                                                    }}
                                                    className="w-full bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={entry.description}
                                                    onChange={e => {
                                                        const updated = [...editEntries];
                                                        updated[idx].description = e.target.value;
                                                        setEditEntries(updated);
                                                    }}
                                                    className="w-full bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    required
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    placeholder="Search Connected Bank..."
                                                    value={entry.tempBankName || ''}
                                                    list={`bank-list-${idx}`}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const updated = [...editEntries];
                                                        updated[idx].tempBankName = val;
                                                        updated[idx].bankName = val;
                                                        const match = allBankAccountsList.find(b =>
                                                            (b.accountName || '').toLowerCase().trim() === val.toLowerCase().trim() ||
                                                            (b.bankName || '').toLowerCase().trim() === val.toLowerCase().trim()
                                                        );
                                                        if (match) {
                                                            updated[idx].bankAccountId = match._id;
                                                        }
                                                        setEditEntries(updated);
                                                    }}
                                                    className="w-full bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    required
                                                />
                                                <datalist id={`bank-list-${idx}`}>
                                                    {allBankAccountsList.map(bankAcc => (
                                                        <option key={bankAcc._id} value={bankAcc.accountName || bankAcc.bankName}>
                                                            {bankAcc.accountNumber}
                                                        </option>
                                                    ))}
                                                </datalist>
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const contactName = entry.contactName ||
                                                        entry.customerName ||
                                                        entry.supplierName ||
                                                        entry.vendorName ||
                                                        (typeof entry.contact === 'object' && entry.contact ? (entry.contact.name || entry.contact.companyName) : '') ||
                                                        (typeof entry.customer === 'object' && entry.customer ? (entry.customer.name || entry.customer.companyName) : '') ||
                                                        (typeof entry.supplier === 'object' && entry.supplier ? (entry.supplier.name || entry.supplier.companyName) : '');

                                                    const isVendor = entry.contactModel === 'Supplier' || Boolean(entry.supplier || entry.supplierName || (entry.setOffSummary && entry.setOffSummary.bills?.length));

                                                    if (contactName || entry.customer || entry.supplier || entry.invoice || entry.bills || entry.setOffSummary) {
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold self-start ${
                                                                    isVendor
                                                                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                                                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                                                }`}>
                                                                    {isVendor ? `🏬 ${contactName || 'Vendor Linked'}` : `👤 ${contactName || 'Customer Linked'}`}
                                                                </span>
                                                                {(entry as any).setOffSummary && (
                                                                    <div className="text-[10px] space-y-0.5 opacity-90 pl-1">
                                                                        {(entry as any).setOffSummary.invoices?.map((inv: any, iIdx: number) => (
                                                                            <div key={iIdx} className="text-emerald-400 font-bold">
                                                                                ⚡ Set off: {inv.invoiceNumber} (${inv.amountApplied?.toFixed(2)})
                                                                            </div>
                                                                        ))}
                                                                        {(entry as any).setOffSummary.bills?.map((b: any, bIdx: number) => (
                                                                            <div key={bIdx} className="text-amber-400 font-bold">
                                                                                ⚡ Set off: {b.billNumber} (${b.amountApplied?.toFixed(2)})
                                                                            </div>
                                                                        ))}
                                                                        {(entry as any).setOffSummary.excessAmount > 0 && (
                                                                            <div className="text-[#C8E600] font-bold">
                                                                                ⚡ Advance: ${(entry as any).setOffSummary.excessAmount?.toFixed(2)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return <span className="text-xs opacity-50 italic">None</span>;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                                        ${entry.amount?.toFixed(2)}
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                        entry.type === 'DEBIT'
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    }`}>
                                                        {entry.type === 'DEBIT' ? 'DEBIT (Deposit)' : 'CREDIT (Withdrawal)'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Change Amount Button -> Opens Change Amount Modal */}
                                                    <button
                                                        type="button"
                                                        onClick={() => openChangeAmountModal(idx)}
                                                        className="px-3 py-2 text-xs font-bold uppercase tracking-wider bg-[#C8E600]/15 hover:bg-[#C8E600]/30 text-[#C8E600] border border-[#C8E600]/30 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <DollarSign size={13} /> Change Amount
                                                    </button>

                                                    {/* Change Customer / Change Vendor Button -> Opens Sidebar Modal */}
                                                    {(() => {
                                                        const isVendor = entry.contactModel === 'Supplier' || entry.type === 'CREDIT' || Boolean(entry.supplier || entry.supplierName || (entry.setOffSummary && (entry.setOffSummary as any).bills?.length));
                                                        const isLinked = isVendor ? Boolean(entry.supplier || entry.supplierName) : Boolean(entry.customer || entry.customerName);

                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() => openInvoiceSidebar(idx)}
                                                                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                                                                    isVendor
                                                                        ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border-amber-500/30'
                                                                        : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30'
                                                                }`}
                                                            >
                                                                <UserCheck size={13} />
                                                                {isLinked
                                                                    ? (isVendor ? 'Change Vendor' : 'Change Customer')
                                                                    : (isVendor ? 'Link Vendor' : 'Link Customer')
                                                                }
                                                            </button>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-end pt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setIsBulkEditing(false);
                            }}
                            className="px-6 py-3 bg-black/5 dark:bg-white/5 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border cursor-pointer"
                            style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-[#C8E600] text-black text-xs font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#C8E600' }}
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Save & Recalculate Transaction</>
                            )}
                        </button>
                    </div>
                </form>

                {/* DEDICATED CHANGE AMOUNT MODAL */}
                {changeAmountModalOpen && changeAmountEntryIdx !== null && (() => {
                    const entry = editEntries[changeAmountEntryIdx];
                    return (
                        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
                                onClick={closeChangeAmountModal}
                            />

                            {/* Modal Box */}
                            <div
                                className="relative w-full max-w-lg bg-card border rounded-2xl p-6 shadow-2xl z-10 space-y-6 animate-scale-in"
                                style={{
                                    background: 'var(--bg-card)',
                                    borderColor: 'var(--border-main)',
                                    color: 'var(--text-main)'
                                }}
                            >
                                <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-[#C8E600]/10 text-[#C8E600]">
                                            <DollarSign size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                                                Change Transaction Amount
                                            </h3>
                                            <p className="text-[11px] opacity-70">
                                                Update amount & deposit type for Row #{changeAmountEntryIdx + 1}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeChangeAmountModal}
                                        className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        style={{ color: 'var(--text-dim)' }}
                                    >
                                        Close
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3.5 rounded-xl border bg-black/5 dark:bg-white/5 text-xs space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="font-bold flex items-center gap-1.5 text-[#C8E600]">
                                            <Zap size={14} /> Automatic Set-off Recalculation Engine
                                        </div>
                                        <p className="text-[11px] opacity-75 leading-relaxed">
                                            Saving a new amount will restore previous invoice states, recalculate invoice set-offs with the new amount, and update running balances sequentially.
                                        </p>
                                    </div>

                                    {entry?.customerName && (
                                        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                                            <span>👤 Linked Customer: <strong>{entry.customerName}</strong></span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20">Set-off Active</span>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-main)' }}>
                                                Transaction Type
                                            </label>
                                            <select
                                                value={modalTypeVal}
                                                onChange={e => setModalTypeVal(e.target.value)}
                                                className="w-full bg-transparent border rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-[#C8E600] cursor-pointer"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            >
                                                <option value="DEBIT" className="bg-[var(--bg-card)]">DEBIT (Incoming Deposit)</option>
                                                <option value="CREDIT" className="bg-[var(--bg-card)]">CREDIT (Outgoing Withdrawal)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-main)' }}>
                                                New Amount ($)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={modalAmountVal}
                                                    onChange={e => setModalAmountVal(parseFloat(e.target.value) || 0)}
                                                    className="w-full text-right bg-transparent border rounded-xl pl-8 pr-4 py-2.5 text-base font-black outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    autoFocus
                                                />
                                                <DollarSign size={16} className="absolute left-3 top-3 text-[#C8E600]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={closeChangeAmountModal}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveAmountFromModal}
                                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#C8E600] text-black hover:bg-[#b5cf00] transition-colors cursor-pointer"
                                    >
                                        Apply New Amount
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* CHANGE CUSTOMER SIDEBAR MODAL */}

                {/* Change/Link Customer Sidebar */}
                {invoiceSidebarOpen && (() => {
                    const currentActiveSidebarEntry = invoiceSidebarEntryIdx !== null ? editEntries[invoiceSidebarEntryIdx] : null;

                    const currentConnectedSupplierId = currentActiveSidebarEntry ? (
                        (typeof currentActiveSidebarEntry.supplier === 'object' && currentActiveSidebarEntry.supplier ? (currentActiveSidebarEntry.supplier as any)._id : currentActiveSidebarEntry.supplier) ||
                        (currentActiveSidebarEntry.contactModel === 'Supplier' ? (typeof currentActiveSidebarEntry.contact === 'object' && currentActiveSidebarEntry.contact ? (currentActiveSidebarEntry.contact as any)._id : currentActiveSidebarEntry.contact) : null)
                    ) : null;

                    const currentConnectedSupplierName = currentActiveSidebarEntry ? (
                        currentActiveSidebarEntry.supplierName ||
                        (typeof currentActiveSidebarEntry.supplier === 'object' ? ((currentActiveSidebarEntry.supplier as any)?.name || (currentActiveSidebarEntry.supplier as any)?.companyName) : null) ||
                        (currentActiveSidebarEntry.contactModel === 'Supplier' ? (currentActiveSidebarEntry.contactName || (typeof currentActiveSidebarEntry.contact === 'object' ? ((currentActiveSidebarEntry.contact as any)?.name || (currentActiveSidebarEntry.contact as any)?.companyName) : null)) : null)
                    ) : null;

                    const currentConnectedCustomerId = currentActiveSidebarEntry ? (
                        (typeof currentActiveSidebarEntry.customer === 'object' && currentActiveSidebarEntry.customer ? (currentActiveSidebarEntry.customer as any)._id : currentActiveSidebarEntry.customer) ||
                        (currentActiveSidebarEntry.contactModel === 'Customer' || !currentActiveSidebarEntry.contactModel ? (typeof currentActiveSidebarEntry.contact === 'object' && currentActiveSidebarEntry.contact ? (currentActiveSidebarEntry.contact as any)._id : currentActiveSidebarEntry.contact) : null)
                    ) : null;

                    const currentConnectedCustomerName = currentActiveSidebarEntry ? (
                        currentActiveSidebarEntry.customerName ||
                        (typeof currentActiveSidebarEntry.customer === 'object' ? (currentActiveSidebarEntry.customer as any)?.name : null) ||
                        (currentActiveSidebarEntry.contactModel === 'Customer' || !currentActiveSidebarEntry.contactModel ? (currentActiveSidebarEntry.contactName || (typeof currentActiveSidebarEntry.contact === 'object' ? (currentActiveSidebarEntry.contact as any)?.name : null)) : null)
                    ) : null;

                    const filteredSidebarSuppliers = sidebarSuppliers.filter(sup => {
                        if (currentConnectedSupplierId && String(sup._id) === String(currentConnectedSupplierId)) {
                            return false;
                        }
                        if (currentConnectedSupplierName && (
                            (sup.name || '').trim().toLowerCase() === currentConnectedSupplierName.trim().toLowerCase() ||
                            (sup.companyName || '').trim().toLowerCase() === currentConnectedSupplierName.trim().toLowerCase()
                        )) {
                            return false;
                        }

                        if (!sidebarSupplierSearch.trim()) return true;
                        const q = sidebarSupplierSearch.toLowerCase();
                        return (sup.name || '').toLowerCase().includes(q) ||
                            (sup.companyName || '').toLowerCase().includes(q) ||
                            (sup.vendorNumber || '').toLowerCase().includes(q);
                    });

                    const filteredSidebarCustomers = sidebarCustomers.filter(cust => {
                        if (currentConnectedCustomerId && String(cust._id) === String(currentConnectedCustomerId)) {
                            return false;
                        }
                        if (currentConnectedCustomerName && (cust.name || '').trim().toLowerCase() === currentConnectedCustomerName.trim().toLowerCase()) {
                            return false;
                        }

                        if (!sidebarCustomerSearch.trim()) return true;
                        const q = sidebarCustomerSearch.toLowerCase();
                        return (cust.name || '').toLowerCase().includes(q) ||
                            (cust.customerId || '').toLowerCase().includes(q);
                    });

                    return (
                        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                            {/* Backdrop */}
                            <div 
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                                onClick={closeInvoiceSidebar}
                            />

                        {/* Sidebar content */}
                        <div 
                            className="relative w-full max-w-md bg-card border-l h-full shadow-2xl flex flex-col z-10 animate-slide-in-right"
                            style={{ 
                                background: 'var(--bg-card)', 
                                borderColor: 'var(--border-main)',
                                animation: 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                            }}
                        >
                            {/* Keyframes for animation */}
                            <style>{`
                                @keyframes slideIn {
                                    from { transform: translateX(100%); }
                                    to { transform: translateX(0); }
                                }
                            `}</style>

                            {/* Header */}
                            <div className="p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                        {sidebarMode === 'VENDOR' ? '🏬 Link Vendor (Auto Set-off)' : '👤 Link Customer (Auto Set-off)'}
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={closeInvoiceSidebar}
                                        className="text-xs font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                        style={{ color: 'var(--text-dim)' }}
                                    >
                                        Close
                                    </button>
                                </div>
                                {invoiceSidebarEntryIdx !== null && (() => {
                                    const entry = editEntries[invoiceSidebarEntryIdx];
                                    return (
                                        <div className="mt-4 p-3 bg-black/10 dark:bg-white/5 rounded-xl border border-white/5 space-y-2 text-xs">
                                            <div>
                                                <span className="opacity-60">Transaction: </span>
                                                <strong style={{ color: 'var(--text-main)' }}>{entry?.description}</strong>
                                            </div>
                                            <div>
                                                <span className="opacity-60">Amount: </span>
                                                <strong style={{ color: 'var(--text-main)' }}>${entry?.amount}</strong>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Main Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {sidebarMode === 'VENDOR' ? (
                                    /* VENDOR MODE */
                                    sidebarSelectedSupplier ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                                <div>
                                                    <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{sidebarSelectedSupplier.name || sidebarSelectedSupplier.companyName}</div>
                                                    <div className="text-[10px] opacity-60 mt-0.5">{sidebarSelectedSupplier.vendorNumber || 'No ID'}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSidebarSelectedSupplier(null)}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-[#C8E600] hover:underline"
                                                >
                                                    Change Vendor
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs font-bold">
                                                    <span className="uppercase tracking-widest text-[10px]" style={{ color: 'var(--text-dim)' }}>
                                                        Automated Bill Set-Off Simulation
                                                    </span>
                                                    {invoiceSidebarEntryIdx !== null && (
                                                        <span className="text-[#C8E600] font-black">
                                                            Payment: ${editEntries[invoiceSidebarEntryIdx]?.amount?.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>

                                                {sidebarLoadingBills ? (
                                                    <div className="text-xs font-bold py-6 text-center" style={{ color: 'var(--text-dim)' }}>
                                                        Loading supplier bills & calculating set-off...
                                                    </div>
                                                ) : (() => {
                                                    const sim = calculateSetOffSimulation();
                                                    if (!sim || sim.type !== 'VENDOR') return null;

                                                    return (
                                                        <div className="space-y-3">
                                                            {sim.setOffDetails.length > 0 ? (
                                                                <div className="border rounded-xl p-3 space-y-2.5 bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex justify-between">
                                                                        <span>Bills to be Set Off ({sim.setOffDetails.length})</span>
                                                                        <span>Applied: ${sim.totalSetOff.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                                                        {sim.setOffDetails.map((detail, dIdx) => (
                                                                            <div key={dIdx} className="p-2.5 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 text-xs space-y-1">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="font-bold text-[#C8E600]">{detail.bill.billNumber}</span>
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                                        detail.newStatus === 'PAID'
                                                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                                    }`}>
                                                                                        {detail.newStatus}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between text-[11px] opacity-70">
                                                                                    <span>Due: ${detail.bill.balanceDue ?? (detail.bill.totalAmount - (detail.bill.amountPaid || 0))}</span>
                                                                                    <span className="font-semibold text-amber-400">+${detail.amountApplied.toFixed(2)}</span>
                                                                                </div>
                                                                                {detail.newBalance > 0 && (
                                                                                    <div className="text-[10px] opacity-50 text-right">
                                                                                        New Balance: ${detail.newBalance.toFixed(2)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-300 space-y-1">
                                                                    <div className="font-bold flex items-center gap-1.5">
                                                                        <Info size={14} /> No Open Bills Found
                                                                    </div>
                                                                    <p className="text-[11px] opacity-80">
                                                                        Supplier has no open bills. The full amount will be registered as an advance payment.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {sim.excessAmount > 0 && (
                                                                <div className="p-3 rounded-xl border border-[#C8E600]/30 bg-[#C8E600]/10 text-xs space-y-1">
                                                                    <div className="font-bold flex justify-between items-center text-[#C8E600]">
                                                                        <span>Advance Paid (1.1.05)</span>
                                                                        <span className="text-sm font-black">${sim.excessAmount.toFixed(2)}</span>
                                                                    </div>
                                                                    <p className="text-[10px] opacity-70" style={{ color: 'var(--text-main)' }}>
                                                                        Will be routed to Account 1.1.05 Advance Paid To Supplier
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="pt-2 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSidebarSupplierSelect(sidebarSelectedSupplier)}
                                                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#C8E600] text-black hover:bg-[#b5cf00] transition-colors cursor-pointer text-center"
                                                                >
                                                                    Confirm & Apply Vendor Set-off
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSidebarSelectedSupplier(null)}
                                                                    className="py-2.5 px-3 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                                                                    style={{ color: 'var(--text-main)' }}
                                                                >
                                                                    Back
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                                Select Vendor for Automated Set-off Preview
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="Search vendor by name or ID..."
                                                    value={sidebarSupplierSearch}
                                                    onChange={(e) => setSidebarSupplierSearch(e.target.value)}
                                                    className="w-full bg-transparent border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <Search className="absolute left-3.5 top-3 text-muted" size={14} style={{ color: 'var(--text-dim)' }} />
                                            </div>

                                            {sidebarLoadingSuppliers ? (
                                                <div className="text-xs font-bold py-4 text-center" style={{ color: 'var(--text-dim)' }}>
                                                    Loading vendors...
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                                                    {filteredSidebarSuppliers.length === 0 ? (
                                                        <div className="text-xs py-4 text-center text-amber-500 font-medium">
                                                            No active vendors found
                                                        </div>
                                                    ) : (
                                                        filteredSidebarSuppliers.map(sup => (
                                                            <button
                                                                key={sup._id}
                                                                type="button"
                                                                onClick={() => handleSupplierClickForPreview(sup)}
                                                                className="w-full text-left p-3 rounded-xl border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex justify-between items-center cursor-pointer group"
                                                                style={{ borderColor: 'var(--border-main)' }}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-bold group-hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-main)' }}>{sup.name || sup.companyName}</div>
                                                                    <div className="text-[10px] opacity-60 mt-0.5">{sup.vendorNumber || 'No ID'}</div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-[#C8E600] opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                    Preview Set-off <ArrowDownRight size={13} />
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    /* CUSTOMER MODE */
                                    sidebarSelectedCustomer ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                                <div>
                                                    <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{sidebarSelectedCustomer.name}</div>
                                                    <div className="text-[10px] opacity-60 mt-0.5">{sidebarSelectedCustomer.customerId || 'No ID'}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSidebarSelectedCustomer(null)}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-[#C8E600] hover:underline"
                                                >
                                                    Change Customer
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-xs font-bold">
                                                    <span className="uppercase tracking-widest text-[10px]" style={{ color: 'var(--text-dim)' }}>
                                                        Automated Set-Off Simulation
                                                    </span>
                                                    {invoiceSidebarEntryIdx !== null && (
                                                        <span className="text-[#C8E600] font-black">
                                                            Receipt: ${editEntries[invoiceSidebarEntryIdx]?.amount?.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>

                                                {sidebarLoadingInvoices ? (
                                                    <div className="text-xs font-bold py-6 text-center" style={{ color: 'var(--text-dim)' }}>
                                                        Loading customer invoices & calculating set-off...
                                                    </div>
                                                ) : (() => {
                                                    const sim = calculateSetOffSimulation();
                                                    if (!sim || sim.type !== 'CUSTOMER') return null;

                                                    return (
                                                        <div className="space-y-3">
                                                            {sim.setOffDetails.length > 0 ? (
                                                                <div className="border rounded-xl p-3 space-y-2.5 bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex justify-between">
                                                                        <span>Invoices to be Set Off ({sim.setOffDetails.length})</span>
                                                                        <span>Applied: ${sim.totalSetOff.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                                                        {sim.setOffDetails.map((detail, dIdx) => (
                                                                            <div key={dIdx} className="p-2.5 rounded-lg border bg-black/10 dark:bg-white/5 border-white/10 text-xs space-y-1">
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="font-bold text-[#C8E600]">{detail.invoice.invoiceNumber}</span>
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                                                        detail.newStatus === 'PAID' 
                                                                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                                                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                                                    }`}>
                                                                                        {detail.newStatus}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between text-[11px] opacity-70">
                                                                                    <span>Due: ${detail.invoice.balance ?? (detail.invoice.totalAmountDue - (detail.invoice.amountPaid || 0))}</span>
                                                                                    <span className="font-semibold text-emerald-400">+${detail.amountApplied.toFixed(2)}</span>
                                                                                </div>
                                                                                {detail.newBalance > 0 && (
                                                                                    <div className="text-[10px] opacity-50 text-right">
                                                                                        New Balance: ${detail.newBalance.toFixed(2)}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs text-amber-300 space-y-1">
                                                                    <div className="font-bold flex items-center gap-1.5">
                                                                        <Info size={14} /> No Open Invoices Found
                                                                    </div>
                                                                    <p className="text-[11px] opacity-80">
                                                                        Customer has no open invoices. The full amount will be registered as an advance.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {sim.excessAmount > 0 && (
                                                                <div className="p-3 rounded-xl border border-[#C8E600]/30 bg-[#C8E600]/10 text-xs space-y-1">
                                                                    <div className="font-bold flex justify-between items-center text-[#C8E600]">
                                                                        <span>Advance Received (2.1.02)</span>
                                                                        <span className="text-sm font-black">${sim.excessAmount.toFixed(2)}</span>
                                                                    </div>
                                                                    <p className="text-[10px] opacity-70" style={{ color: 'var(--text-main)' }}>
                                                                        Will be routed to Account 2.1.02 Advance Received From Customer
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="pt-2 flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSidebarCustomerSelect(sidebarSelectedCustomer)}
                                                                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-[#C8E600] text-black hover:bg-[#b5cf00] transition-colors cursor-pointer text-center"
                                                                >
                                                                    Confirm & Apply Customer Set-off
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSidebarSelectedCustomer(null)}
                                                                    className="py-2.5 px-3 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                                                                    style={{ color: 'var(--text-main)' }}
                                                                >
                                                                    Back
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                                Select Customer for Automated Set-off Preview
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="text"
                                                    placeholder="Search customer by name or ID..."
                                                    value={sidebarCustomerSearch}
                                                    onChange={(e) => setSidebarCustomerSearch(e.target.value)}
                                                    className="w-full bg-transparent border rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-[#C8E600]"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <Search className="absolute left-3.5 top-3 text-muted" size={14} style={{ color: 'var(--text-dim)' }} />
                                            </div>

                                            {sidebarLoadingCustomers ? (
                                                <div className="text-xs font-bold py-4 text-center" style={{ color: 'var(--text-dim)' }}>
                                                    Loading customers...
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                                                    {filteredSidebarCustomers.length === 0 ? (
                                                        <div className="text-xs py-4 text-center text-amber-500 font-medium">
                                                            No active customers found
                                                        </div>
                                                    ) : (
                                                        filteredSidebarCustomers.map(cust => (
                                                            <button
                                                                key={cust._id}
                                                                type="button"
                                                                onClick={() => handleCustomerClickForPreview(cust)}
                                                                className="w-full text-left p-3 rounded-xl border bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex justify-between items-center cursor-pointer group"
                                                                style={{ borderColor: 'var(--border-main)' }}
                                                            >
                                                                <div>
                                                                    <div className="text-xs font-bold group-hover:text-[#C8E600] transition-colors" style={{ color: 'var(--text-main)' }}>{cust.name}</div>
                                                                    <div className="text-[10px] opacity-60 mt-0.5">{cust.customerId || 'No ID'}</div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-[#C8E600] opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                    Preview Set-off <ArrowDownRight size={13} />
                                                                </span>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6 pb-20 animate-fade-in" style={{ color: 'var(--text-main)' }}>
            <Breadcrumbs
                items={[
                    { label: 'Finance', path: '#' },
                    { label: 'Bank Accounts', path: '../bank-accounts' },
                    { label: `${account.accountName || account.bankName} Ledger`, active: true }
                ]}
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted hover:text-brand-black dark:hover:text-lime transition-colors mb-4 group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Accounts
                    </button>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            {(account.accountType as string) === 'Cash' ? (
                                <Coins size={28} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            ) : (
                                <Building2 size={28} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            )}
                            {account.accountName || account.bankName}
                        </h1>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>
                            {account.accountType || 'Bank'}
                        </span>
                    </div>
                    <p className="text-sm font-mono" style={{ color: 'var(--text-dim)' }}>Code: {account.accountCode || 'N/A'} | Num: {account.accountNumber}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
                    <button
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-black/5 hover:bg-black/10 text-brand-black border border-black/10 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-white/10 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={3} /> Record Payment
                    </button>
                    <button
                        onClick={() => {
                            setDlFrom(startDate);
                            setDlTo(endDate);
                            setShowDownloadModal(true);
                        }}
                        disabled={downloading}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={14} strokeWidth={3} /> {downloading ? 'Downloading...' : 'Download PDF'}
                    </button>
                    <button
                        onClick={() => {
                            const basePath = location.pathname.split('/bank-accounts/')[0];
                            navigate(`${basePath}/bulk-bank-upload?accountId=${account._id}`);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    >
                        <FileSpreadsheet size={14} strokeWidth={3} /> Bulk Re-entry
                    </button>
                    <button
                        onClick={() => {
                            const basePath = location.pathname.split('/bank-accounts/')[0];
                            navigate(`${basePath}/bulk-bank-upload?accountId=${account._id}`);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Upload size={14} strokeWidth={3} /> Import Statement
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Opening Balance Card */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-amber-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Coins className="text-amber-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">Start Balance</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Opening Balance</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-amber-400 text-lg mr-1">$</span>
                                {(openingBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Total Deposits Card */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-green-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <ArrowDownRight className="text-green-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">Incoming</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Total Deposits</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-green-400 text-lg mr-1">$</span>
                                {totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Total Withdrawals Card */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-rose-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                <ArrowUpRight className="text-rose-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">Outgoing</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Total Withdrawals</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-rose-400 text-lg mr-1">$</span>
                                {totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Current Balance Card */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="text-blue-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                {startDate || endDate ? 'Period Balance' : 'Live Balance'}
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>
                                {startDate || endDate ? 'Ending Balance' : 'Current Balance'}
                            </p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-blue-400 text-lg mr-1">$</span>
                                {(closingBalance !== null ? closingBalance : (account.currentBalance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search, Date, and Sort Filters */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex flex-col lg:flex-row gap-4 justify-between items-center transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Box */}
                <div className="relative w-full lg:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 opacity-40" style={{ color: 'var(--text-main)' }} />
                    <input
                        type="text"
                        placeholder="Search description or Tx ID..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full bg-transparent border rounded-xl pl-9 pr-8 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); setPage(1); }}
                            className="absolute right-2.5 top-2 text-[10px] uppercase font-bold text-rose-500 hover:text-rose-400 cursor-pointer"
                        >
                            clear
                        </button>
                    )}
                </div>

                {/* Find by Running Balance Box */}
                <div className="relative w-full lg:max-w-xs">
                    <Coins className="absolute left-3 top-2.5 h-3.5 w-3.5 opacity-40" style={{ color: 'var(--text-main)' }} />
                    <input
                        type="text"
                        placeholder="Find running balance..."
                        value={balance}
                        onChange={e => { setBalance(e.target.value); setPage(1); }}
                        className="w-full bg-transparent border rounded-xl pl-9 pr-8 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    {balance && (
                        <button
                            onClick={() => { setBalance(''); setPage(1); }}
                            className="absolute right-2.5 top-2 text-[10px] uppercase font-bold text-rose-500 hover:text-rose-400 cursor-pointer"
                        >
                            clear
                        </button>
                    )}
                </div>

                {/* Date range pickers */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Filter By Date:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setPage(1); }}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <span className="opacity-45 text-xs" style={{ color: 'var(--text-dim)' }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={e => { setEndDate(e.target.value); setPage(1); }}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                            className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 cursor-pointer"
                        >
                            Clear dates
                        </button>
                    )}
                </div>

                {/* Sorting drop-down */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Sort:</span>
                    <select
                        value={sortDirection}
                        onChange={e => { setSortDirection(e.target.value as 'asc' | 'desc'); setPage(1); }}
                        className="bg-transparent border rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-lime transition-all cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="desc" className="bg-[var(--bg-card)]">Newest First</option>
                        <option value="asc" className="bg-[var(--bg-card)]">Oldest First</option>
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)' }}>
                    <List size={18} style={{ color: 'var(--text-dim)' }} />
                    <h3 className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-main)' }}>Account Transactions</h3>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No transactions found</p>
                            <p className="text-sm mt-1">This account hasn't been used in any ledger entries yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                    <th className="px-6 py-4 w-12 text-center select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectableEntries.length > 0 && selectableEntries.every(entry => selectedIds.includes(entry._id))}
                                            disabled={selectableEntries.length === 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(selectableEntries.map(entry => entry._id));
                                                } else {
                                                    setSelectedIds([]);
                                                }
                                            }}
                                            className={`rounded border-white/20 text-[#C8E600] focus:ring-[#C8E600] bg-transparent ${selectableEntries.length === 0 ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                                            title={selectableEntries.length === 0 ? "No transactions to select" : "Select all transactions"}
                                        />
                                    </th>
                                    <th
                                        className="px-6 py-4 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none hover:text-brand-black dark:hover:text-white transition-colors"
                                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date
                                            <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Audit Trace</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Deposits</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Withdrawals</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Running Balance</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEntries.map((entry) => {
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    let formattedDate = entryDateStr;
                                    if (!isNaN(dateObj.getTime())) {
                                        const day = String(dateObj.getDate()).padStart(2, '0');
                                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                                        const year = dateObj.getFullYear();
                                        const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        formattedDate = `${day}/${month}/${year} ${timeStr}`;
                                    }

                                    const debitVal = entry.amount !== undefined
                                        ? (entry.type === 'DEBIT' ? entry.amount : 0)
                                        : (entry.debit || 0);

                                    const creditVal = entry.amount !== undefined
                                        ? (entry.type === 'CREDIT' ? entry.amount : 0)
                                        : (entry.credit || 0);

                                    const isSelected = selectedIds.includes(entry._id);
                                    const isConnectedWithInvoice = isEntryConnectedWithInvoice(entry);

                                    return (
                                        <tr
                                            key={entry._id}
                                            className={`border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? 'bg-[#C8E600]/10 hover:bg-[#C8E600]/15' : ''}`}
                                            style={{ borderColor: 'var(--border-main)' }}
                                            onClick={() => {
                                                const basePath = location.pathname.split('/bank-accounts/')[0];
                                                navigate(`${basePath}/bank-transactions/${entry._id}`);
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedIds(prev => [...prev, entry._id]);
                                                        } else {
                                                            setSelectedIds(prev => prev.filter(id => id !== entry._id));
                                                        }
                                                    }}
                                                    className="rounded border-white/20 text-[#C8E600] focus:ring-[#C8E600] bg-transparent cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {renderDescriptionWithLinks(entry.description, entry)}
                                                {entry.referenceId && (
                                                    <div className="text-[10px] font-mono mt-1 opacity-60">Ref: {entry.referenceId}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs opacity-70" style={{ color: 'var(--text-dim)' }}>
                                                    <User size={12} />
                                                    {entry.creatorRole || 'SYSTEM'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {debitVal > 0 ? (
                                                    <span className="font-mono text-sm font-bold text-green-400">
                                                        {debitVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {creditVal > 0 ? (
                                                    <span className="font-mono text-sm font-bold text-red-400">
                                                        {creditVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-mono text-sm font-bold text-blue-400">
                                                    {(entry.runningBalance !== undefined && entry.runningBalance !== null)
                                                        ? entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                        : (runningBalancesMap[entry._id] !== undefined)
                                                            ? runningBalancesMap[entry._id].toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                            : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedIds([entry._id]);
                                                        setIsBulkEditing(true);
                                                    }}
                                                    className="p-2 rounded-xl bg-white/5 hover:bg-[#C8E600]/20 text-white/80 hover:text-[#C8E600] border border-white/10 hover:border-[#C8E600]/30 transition-all cursor-pointer inline-flex items-center justify-center"
                                                    title="View / Edit Entry"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination UI */}
                {!loading && entries.length > 0 && pagination && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-topbar)' }}>
                        <div className="text-sm" style={{ color: 'var(--text-dim)' }}>
                            Showing <span className="font-bold" style={{ color: 'var(--text-main)' }}>{((page - 1) * limit) + 1}</span> to <span className="font-bold" style={{ color: 'var(--text-main)' }}>{Math.min(page * limit, pagination.total)}</span> of <span className="font-bold" style={{ color: 'var(--text-main)' }}>{pagination.total}</span> entries
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                                className="px-2 py-1 rounded border text-xs outline-none bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                <option value="10">10 / page</option>
                                <option value="25">25 / page</option>
                                <option value="50">50 / page</option>
                                <option value="100">100 / page</option>
                            </select>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{
                                        borderColor: page === 1 ? 'var(--border-main)' : 'var(--sidebar-active)',
                                        color: page === 1 ? 'var(--text-dim)' : 'var(--sidebar-active)',
                                        background: 'transparent'
                                    }}
                                >
                                    Previous
                                </button>

                                <div className="flex items-center px-4">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                        Page <span className="font-bold" style={{ color: 'var(--sidebar-active)' }}>{page}</span> of {pagination.pages}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
                                    style={{
                                        borderColor: page === pagination.pages ? 'var(--border-main)' : 'var(--sidebar-active)',
                                        color: page === pagination.pages ? 'var(--text-dim)' : 'var(--sidebar-active)',
                                        background: 'transparent'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Statement Modal Workspace */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
                    <div className={`relative border rounded-[2.5rem] w-full ${parsedTransactions.length > 0 ? 'max-w-2xl' : 'max-w-md'} overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Import Bank Statement</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime" style={{ color: 'var(--brand-lime)' }}>Reconcile Ledger Items</p>
                            </div>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Account</label>
                                <input
                                    type="text"
                                    value={`${account.accountName || account.bankName} (${account.accountCode || 'N/A'})`}
                                    disabled
                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold opacity-60"
                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Branch</label>
                                <select
                                    value={selectedBranchId}
                                    onChange={e => setSelectedBranchId(e.target.value)}
                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none cursor-pointer"
                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    required
                                >
                                    <option value="" disabled style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Select Branch</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                            {b.name} ({b.country || b.city || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Upload Statement File (CSV / Excel)</label>
                                <div className="border border-dashed rounded-2xl p-6 text-center space-y-3 hover:border-lime/50 transition-all relative" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <FileSpreadsheet size={32} className="mx-auto text-dim opacity-40" />
                                    {importFile ? (
                                        <p className="text-xs font-bold text-emerald-700 dark:text-lime">{importFile.name}</p>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Drag statement here or click to browse</p>
                                            <p className="text-[10px] text-dim">Maximum file size: 5MB</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required={!importFile}
                                    />
                                </div>
                            </div>

                            {importFile && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImportFile(null);
                                            setParsedTransactions([]);
                                        }}
                                        className="text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                                    >
                                        Clear Uploaded File
                                    </button>
                                </div>
                            )}

                            {parsedTransactions.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                        Transactions Preview ({parsedTransactions.length} rows, {parsedTransactions.filter(t => t.isValid).length} valid)
                                    </label>
                                    <div className="space-y-4 max-h-[200px] overflow-y-auto border rounded-xl p-3 bg-black/5 dark:bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead>
                                                <tr className="border-b text-muted dark:text-white/50" style={{ borderColor: 'var(--border-main)' }}>
                                                    <th className="pb-1">Date</th>
                                                    <th className="pb-1">Details</th>
                                                    <th className="pb-1 text-right">Debit (Dep)</th>
                                                    <th className="pb-1 text-right">Credit (With)</th>
                                                    <th className="pb-1 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                                {parsedTransactions.map((tx, idx) => (
                                                    <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5">
                                                        <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{tx.date}</td>
                                                        <td className="py-1.5 pr-2 max-w-[180px] truncate">
                                                            <div className="font-bold text-main dark:text-white/80" style={{ color: 'var(--text-main)' }}>{tx.description || 'Bank Line'}</div>
                                                            {tx.payee && <div className="text-[9px] text-muted dark:text-white/45">Payee: {tx.payee}</div>}
                                                            {tx.referenceNumber && <div className="text-[9px] text-muted dark:text-white/45 font-mono">Ref: {tx.referenceNumber}</div>}
                                                        </td>
                                                        <td className="py-1.5 pr-2 text-right font-mono font-bold text-green-400">
                                                            {tx.type === 'DEBIT' ? tx.amount.toFixed(2) : ''}
                                                        </td>
                                                        <td className="py-1.5 pr-2 text-right font-mono font-bold text-red-400">
                                                            {tx.type === 'CREDIT' ? tx.amount.toFixed(2) : ''}
                                                        </td>
                                                        <td className="py-1.5 text-center whitespace-nowrap">
                                                            {tx.isValid ? (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-bold">Valid</span>
                                                            ) : (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold" title={tx.error}>Error</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs bg-black/5 dark:bg-white/5 border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                <Info size={16} className="text-emerald-700 dark:text-lime flex-shrink-0 mt-0.5" />
                                <span className="leading-relaxed font-semibold">Ola Cars reconciles imported statement lines directly as ledger entries, automatically updating the current bank account balance.</span>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsImportModalOpen(false);
                                        setImportFile(null);
                                        setParsedTransactions([]);
                                    }}
                                    className="flex-1 py-4 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={importing || parsedTransactions.filter(tx => tx.isValid).length === 0}
                                    className="flex-[2] py-4 bg-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {importing ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Reconcile Statement</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Manual Payment Modal Workspace */}
            {isRecordPaymentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRecordPaymentModalOpen(false)} />
                    <div className="relative border rounded-[2.5rem] w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Record Bank Payment / Receipt</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime" style={{ color: 'var(--brand-lime)' }}>Post Double-Entry Ledger Transaction</p>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Segmented Toggle for Receipt (Money In) vs Payment (Money Out) */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Transaction Type</label>
                                <div className="flex gap-3 p-1.5 rounded-2xl bg-black/5 dark:bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentType('RECEIPT')}
                                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                                            paymentType === 'RECEIPT'
                                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-sm'
                                                : 'border-transparent text-dim hover:text-main'
                                        }`}
                                    >
                                        <ArrowDownRight size={16} className="text-emerald-500" />
                                        Receipt (Money In)
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentType('PAYMENT');
                                            setSelectedCustomer(null);
                                            setCustomerSearch('');
                                            setSelectedInvoiceId('');
                                        }}
                                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                                            paymentType === 'PAYMENT'
                                                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 shadow-sm'
                                                : 'border-transparent text-dim hover:text-main'
                                        }`}
                                    >
                                        <ArrowUpRight size={16} className="text-red-500" />
                                        Payment (Money Out)
                                    </button>
                                </div>
                            </div>

                            {/* Active Bank Account Display */}
                            <div className="p-3.5 rounded-2xl border bg-black/5 dark:bg-white/5 text-xs flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-2.5">
                                    <Building2 size={16} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                    <span className="font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                        Bank Account: <span className="underline decoration-lime">{account?.accountName || account?.bankName}</span>
                                    </span>
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                    paymentType === 'RECEIPT' 
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                }`}>
                                    {paymentType === 'RECEIPT' ? 'Target Account (DEBIT +)' : 'Source Account (CREDIT -)'}
                                </span>
                            </div>

                            {/* Row 1: Date, Mode, Amount, Currency */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Deposit Date</label>
                                    <input
                                        type="date"
                                        value={depositDate}
                                        onChange={e => setDepositDate(e.target.value)}
                                        className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Mode</label>
                                    <select
                                        value={paymentMode}
                                        onChange={e => setPaymentMode(e.target.value)}
                                        className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none cursor-pointer"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        required
                                    >
                                        <option value="Bank remittance" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Bank remittance</option>
                                        <option value="Bank Transfer" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Bank Transfer</option>
                                        <option value="Cash" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Cash</option>
                                        <option value="Cheque" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Cheque</option>
                                        <option value="Credit card" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Credit card</option>
                                        <option value="UPI" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>UPI</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Currency</label>
                                    <select
                                        value={paymentCurrency}
                                        onChange={e => setPaymentCurrency(e.target.value)}
                                        className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none cursor-pointer"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        required
                                    >
                                        <option value="USD" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>USD</option>
                                        <option value="INR" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>INR</option>
                                        <option value="AED" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>AED</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section: Customer Selection for RECEIPT */}
                            {paymentType === 'RECEIPT' && (
                                <div className="space-y-4 p-4 rounded-2xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-wider text-lime" style={{ color: 'var(--brand-lime)' }}>Customer Receipt & Auto Set-Off</span>
                                        <span className="text-[10px] text-dim font-medium">Select a customer to route payment to Accounts Receivable & auto set-off invoices</span>
                                    </div>

                                    <div className="space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Customer (Optional)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search customer by name or ID..."
                                                value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.customerId})` : customerSearch}
                                                onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); setShowCustomerList(true); }}
                                                onFocus={() => setShowCustomerList(true)}
                                                onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                                                className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none"
                                                style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                            />
                                            {showCustomerList && filteredCustomers.length > 0 && !selectedCustomer && (
                                                <div className="absolute z-50 w-full mt-1 border rounded-2xl shadow-2xl max-h-52 overflow-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                                    {filteredCustomers.slice(0, 15).map(c => (
                                                        <button
                                                            type="button"
                                                            key={c._id}
                                                            onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerList(false); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors cursor-pointer"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 dark:bg-brand-lime/10 dark:border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-[10px] font-black text-emerald-700 dark:text-lime">
                                                                    {c.name ? c.name.slice(0, 2).toUpperCase() : 'CU'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black" style={{ color: 'var(--text-main)' }}>{c.name}</p>
                                                                <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-dim)' }}>{c.customerId}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {selectedCustomer && (
                                            <div className="flex items-center justify-between mt-1 text-xs">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Selected Customer: {selectedCustomer.name} ({selectedCustomer.customerId})</span>
                                                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 font-bold cursor-pointer">Clear Customer Selection</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Live Auto Set-Off Allocation Preview Breakdown Card */}
                                    {liveSetOffPreview && (
                                        <div className="space-y-3 p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/30 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Coins size={16} className="text-emerald-500" />
                                                    <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                        Live Auto Set-Off Breakdown
                                                    </span>
                                                </div>
                                                <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    Amount: ${Number(paymentAmount).toFixed(2)}
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto max-h-48 custom-scrollbar border rounded-xl border-emerald-500/20 bg-black/5 dark:bg-black/20">
                                                <table className="w-full text-left text-[11px] border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-dim">
                                                            <th className="p-2 font-bold">Invoice #</th>
                                                            <th className="p-2 font-bold text-right">Open Due</th>
                                                            <th className="p-2 font-bold text-right text-emerald-400">Applied</th>
                                                            <th className="p-2 font-bold text-right">Rem. Due</th>
                                                            <th className="p-2 font-bold text-center">New Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {liveSetOffPreview.allocations.map((alloc, i) => (
                                                            <tr key={i} className="hover:bg-white/5">
                                                                <td className="p-2 font-mono font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                                                    {alloc.invoice.invoiceNumber}
                                                                </td>
                                                                <td className="p-2 text-right font-mono text-dim">
                                                                    ${alloc.currentBalance.toFixed(2)}
                                                                </td>
                                                                <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                                    +${alloc.amountApplied.toFixed(2)}
                                                                </td>
                                                                <td className="p-2 text-right font-mono font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                                                    ${alloc.newBalance.toFixed(2)}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                                                        alloc.newStatus === 'PAID'
                                                                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                    }`}>
                                                                        {alloc.newStatus}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-emerald-500/20">
                                                <span className="text-dim">Total Set-off Against Invoices:</span>
                                                <span className="font-mono text-emerald-600 dark:text-emerald-400">${liveSetOffPreview.totalSetOff.toFixed(2)}</span>
                                            </div>

                                            {liveSetOffPreview.excessAdvance > 0 && (
                                                <div className="flex items-center justify-between text-xs font-bold p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                                                    <span>Logged as Customer Advance Received (2.1.02):</span>
                                                    <span className="font-mono">${liveSetOffPreview.excessAdvance.toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section: Chart of Accounts Selection for To Account */}
                            {(!selectedCustomer || paymentType === 'PAYMENT') && (
                                <div className="space-y-1 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                        {paymentType === 'RECEIPT' ? 'To Account (Income / Category / Offset Account) *' : 'To Account (Expense / Supplier / Offset Account) *'}
                                    </label>
                                    {loadingAccounts ? (
                                        <div className="w-full border rounded-2xl px-4 py-3 text-xs text-dim bg-transparent" style={{ borderColor: 'var(--border-main)' }}>
                                            Loading Chart of Accounts...
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search Chart of Accounts or Bank Accounts by code or name..."
                                                value={selectedFromAccountObj ? `${selectedFromAccountObj.accountName}${selectedFromAccountObj.category ? ` [${selectedFromAccountObj.category}]` : ''}` : toAccountSearch}
                                                onChange={e => { setToAccountSearch(e.target.value); setFromAccountId(''); setShowToAccountList(true); }}
                                                onFocus={() => setShowToAccountList(true)}
                                                onBlur={() => setTimeout(() => setShowToAccountList(false), 200)}
                                                className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none pr-10"
                                                style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                                required={!selectedCustomer}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-dim">
                                                <Search size={16} />
                                            </div>

                                            {showToAccountList && filteredToAccounts.length > 0 && !selectedFromAccountObj && (
                                                <div className="absolute z-50 w-full mt-1 border rounded-2xl shadow-2xl max-h-56 overflow-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                                    {filteredToAccounts.map(acc => (
                                                        <button
                                                            type="button"
                                                            key={acc._id}
                                                            onMouseDown={() => { setFromAccountId(acc._id); setToAccountSearch(''); setShowToAccountList(false); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer border-b border-white/5 last:border-none"
                                                        >
                                                            <div>
                                                                <p className="text-xs font-black text-main" style={{ color: 'var(--text-main)' }}>{acc.accountName}</p>
                                                                <p className="text-[10px] text-dim font-mono uppercase" style={{ color: 'var(--text-dim)' }}>
                                                                    {acc.category ? `Category: ${acc.category}` : acc.accountNumber ? `Acc #${acc.accountNumber}` : ''}
                                                                </p>
                                                            </div>
                                                            {acc.currentBalance !== undefined && (
                                                                <span className="text-xs font-mono font-bold text-lime" style={{ color: 'var(--brand-lime)' }}>
                                                                    {acc.currency || 'USD'} ${acc.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {showToAccountList && filteredToAccounts.length === 0 && !selectedFromAccountObj && (
                                                <div className="absolute z-50 w-full mt-1 p-3 border rounded-2xl shadow-2xl text-xs text-dim text-center animate-in fade-in slide-in-from-top-1 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                                    No accounts found matching "{toAccountSearch}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedFromAccountObj && (
                                        <div className="flex items-center justify-between mt-1 text-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Selected To Account: {selectedFromAccountObj.accountName}</span>
                                            <button type="button" onClick={() => { setFromAccountId(''); setToAccountSearch(''); }} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 font-bold cursor-pointer">Clear Selection</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCustomer && paymentType === 'RECEIPT' && (
                                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                                    <Info size={16} className="flex-shrink-0" />
                                    <span>Offset account automatically routed to <strong>Accounts Receivable (1.1.03)</strong> for Customer Receipt.</span>
                                </div>
                            )}

                            {/* Row: Supporting Document & Description */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Supporting Document (Optional)</label>
                                    <div className="border border-dashed rounded-2xl px-4 py-3 text-center relative cursor-pointer flex items-center justify-center gap-2 h-[46px]" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                        <Upload size={14} className="text-dim opacity-60 flex-shrink-0" />
                                        {supportingDocFile ? (
                                            <p className="text-xs font-bold text-emerald-700 dark:text-lime truncate max-w-[150px]">{supportingDocFile.name}</p>
                                        ) : (
                                            <p className="text-xs text-dim truncate">Click to upload file</p>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={e => setSupportingDocFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Description</label>
                                    <textarea
                                        value={paymentDescription}
                                        onChange={e => setPaymentDescription(e.target.value)}
                                        placeholder="Enter payment description details"
                                        className="w-full border rounded-2xl px-4 py-2 text-sm font-bold bg-transparent outline-none h-[46px] min-h-[46px] resize-none"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRecordPaymentModalOpen(false);
                                        setSupportingDocFile(null);
                                    }}
                                    className="flex-1 py-3 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={recording}
                                    className="flex-[2] py-3 bg-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {recording ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>{paymentType === 'PAYMENT' ? 'Record Payment (Money Out)' : 'Record Receipt (Money In)'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FLOATING ACTION BAR FOR SELECTED ITEMS */}
            {selectedIds.length > 0 && !isBulkEditing && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-6 py-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-bottom duration-300 backdrop-blur-md"
                    style={{
                        background: 'rgba(20, 20, 20, 0.85)',
                        borderColor: 'var(--border-main)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                    }}>
                    <span className="text-xs font-bold text-white">
                        {selectedIds.length} transaction{selectedIds.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        >
                            Delete Selected
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="px-3 py-2 text-xs font-bold text-white/60 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative border rounded-[2rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 space-y-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>Delete Transactions?</h3>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                    Are you sure you want to delete these {selectedIds.length} selected transaction{selectedIds.length > 1 ? 's' : ''}? This action cannot be undone, and the running balances will be recalculated sequentially.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkDeleteSubmit}
                                    disabled={deleting}
                                    className="flex-1 py-3.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-red-500 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30"
                                >
                                    {deleting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Delete Now</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Download PDF Modal */}
            {showDownloadModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDownloadModal(false)} />
                    <div className="relative border rounded-[2rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div className="flex items-center gap-3">
                                <FileText className="text-brand-lime" size={24} style={{ color: 'var(--brand-lime)' }} />
                                <div>
                                    <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Export PDF Statement</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime" style={{ color: 'var(--brand-lime)' }}>Define Report Criteria</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDownloadModal(false)} className="text-dim hover:text-white transition-all text-lg font-bold cursor-pointer" style={{ color: 'var(--text-dim)' }}>&times;</button>
                        </div>

                        <div className="p-8 space-y-6">
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                Choose a custom date range to filter the ledger report. Leave the dates blank to export the entire history.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={dlFrom}
                                        onChange={e => setDlFrom(e.target.value)}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-lime transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={dlTo}
                                        min={dlFrom}
                                        onChange={e => setDlTo(e.target.value)}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-lime transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDownloadModal(false)}
                                    className="flex-1 py-3.5 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPdf}
                                    disabled={downloading}
                                    className="flex-1 py-3.5 bg-brand-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-30"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {downloading ? (
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Download PDF</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankAccountLedger;
