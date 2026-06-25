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
    Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getBankAccountById, type BankAccount, uploadBankStatement, recordManualPayment, getAllBankAccounts, deleteAllTransactions, getBankAccountTransactions } from '../../../services/bankAccountService';
import { type LedgerEntry } from '../../../services/ledgerService';
import { getAllBranches } from '../../../services/branchService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getInvoicesByCustomer, type Invoice } from '../../../services/invoiceService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import BulkLedgerUpload from '../shared/BulkLedgerUpload';

const BankAccountLedger = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [account, setAccount] = useState<BankAccount | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 25 });
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Import Statement Modal States
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);

    // Dynamic bank statement import preview & branch selection
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    
    // Record Payment Modal States
    const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
    const [otherAccounts, setOtherAccounts] = useState<BankAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [recording, setRecording] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    // Form states
    const [paymentAmount, setPaymentAmount] = useState('');
    const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10)); // default today YYYY-MM-DD
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [paymentCurrency, setPaymentCurrency] = useState('USD');
    const [fromAccountId, setFromAccountId] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);

    // Customer Selection States for Rental Income (500031)
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerList, setShowCustomerList] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const selectedFromAccountObj = otherAccounts.find(acc => acc._id === fromAccountId);
    const isRentalIncomeSelected = selectedFromAccountObj?.accountCode === '500031';

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.customerId?.toLowerCase().includes(customerSearch.toLowerCase())
    );

    const handleDeleteAllTransactions = async () => {
        if (!id) return;
        const confirmed = window.confirm(
            'Are you sure you want to delete ALL transactions for this bank account?\n\n' +
            'This will permanently delete all ledger entries and journal records, and reset the balance.\n\n' +
            'This action CANNOT be undone!'
        );
        if (!confirmed) return;
        setDeletingAll(true);
        try {
            const result = await deleteAllTransactions(id);
            toast.success(result.message || 'All transactions deleted successfully!');
            // Reload the ledger
            setEntries([]);
            setPagination({ total: 0, pages: 1, limit: 25 });
            if (account) {
                setAccount({ ...account, currentBalance: account.initialBalance || 0 });
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete transactions');
        } finally {
            setDeletingAll(false);
        }
    };

    useEffect(() => {
        if (isRecordPaymentModalOpen) {
            const fetchOtherAccounts = async () => {
                setLoadingAccounts(true);
                try {
                    const res = await getAllBankAccounts({ limit: 100 });
                    const allAccounts = res.data || [];
                    // filter out current ledger account
                    setOtherAccounts(allAccounts.filter((acc: BankAccount) => acc._id !== id && acc.status === 'ACTIVE'));
                } catch (err) {
                    console.error('Failed to fetch other accounts', err);
                    toast.error('Failed to load other accounts');
                } finally {
                    setLoadingAccounts(false);
                }
            };
            const fetchCustomers = async () => {
                try {
                    const res = await getAllCustomers({ status: 'ACTIVE', limit: 200 });
                    setCustomers(res.data || (res as any).customers || []);
                } catch (err) {
                    console.error('Failed to fetch customers', err);
                }
            };
            fetchOtherAccounts();
            fetchCustomers();
        }
    }, [isRecordPaymentModalOpen, id]);

    useEffect(() => {
        if (selectedCustomer) {
            const fetchCustomerInvoices = async () => {
                setLoadingInvoices(true);
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
                } finally {
                    setLoadingInvoices(false);
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
                limit
            };
            const txRes = await getBankAccountTransactions(id, filters);
            setEntries(Array.isArray(txRes.data) ? txRes.data : []);
            if (txRes.pagination) {
                setPagination(txRes.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch details');
        } finally {
            setLoading(false);
        }
    }, [id, page, limit]);

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
        if (!fromAccountId) {
            toast.error('Please select the source account (From Account)');
            return;
        }

        const selectedFromAccountObj = otherAccounts.find(acc => acc._id === fromAccountId);
        const isRentalIncomeSelected = selectedFromAccountObj?.accountCode === '500031';
        if (isRentalIncomeSelected && !selectedCustomer) {
            toast.error('Please select a customer for rental income');
            return;
        }

        setRecording(true);
        try {
            const formData = new FormData();
            formData.append('amount', paymentAmount);
            formData.append('depositDate', depositDate);
            formData.append('paymentMode', paymentMode);
            formData.append('currency', paymentCurrency);
            formData.append('fromAccountId', fromAccountId);
            formData.append('description', paymentDescription);
            if (supportingDocFile) {
                formData.append('supportingDocument', supportingDocFile);
            }
            if (isRentalIncomeSelected && selectedCustomer) {
                formData.append('customerId', selectedCustomer._id);
                if (selectedInvoiceId) {
                    formData.append('invoiceId', selectedInvoiceId);
                }
            }

            const res = await recordManualPayment(id, formData);
            toast.success(res.message || 'Payment recorded successfully');
            
            // Reset states
            setIsRecordPaymentModalOpen(false);
            setPaymentAmount('');
            setPaymentDescription('');
            setSupportingDocFile(null);
            setFromAccountId('');
            setCustomerSearch('');
            setSelectedCustomer(null);
            setShowCustomerList(false);
            setSelectedInvoiceId('');
            setCustomerInvoices([]);
            
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

    const renderDescriptionWithLinks = (description: string) => {
        if (!description) return <span style={{ color: 'var(--text-dim)' }}>—</span>;

        const billRegex = /((?:BILL|SB)-\w+(?:-\w+)*)/i;
        const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/i;

        const matchBill = description.match(billRegex);
        const matchInvoice = description.match(invoiceRegex);

        if (matchBill) {
            const billNum = matchBill[0];
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleBillClick(billNum); }}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C8E600] hover:underline self-start bg-[#C8E600]/10 border border-[#C8E600]/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Receipt size={11} strokeWidth={2.5} />
                        View Bill ({billNum})
                    </button>
                </div>
            );
        }

        if (matchInvoice) {
            const invNum = matchInvoice[0];
            return (
                <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleInvoiceClick(invNum); }}
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:underline self-start bg-lime/10 border border-lime/20 px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95"
                        style={{ color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.06)' }}
                    >
                        <FileText size={11} strokeWidth={2.5} />
                        View Invoice ({invNum})
                    </button>
                </div>
            );
        }

        return <div className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{description}</div>;
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
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-lime hover:text-brand-lime/80 transition-colors mb-4 group"
                        style={{ color: 'var(--brand-lime)' }}
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
                    <p className="text-sm font-mono text-white/50">Code: {account.accountCode || 'N/A'} | Num: {account.accountNumber}</p>
                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-4 sm:mt-0">
                    <button 
                        onClick={handleDeleteAllTransactions}
                        disabled={deletingAll}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 size={14} strokeWidth={3} />
                        {deletingAll ? 'Deleting...' : 'Clear All Transactions'}
                    </button>
                    <button 
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105 active:scale-95 shadow-md border border-white/10 cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={3} /> Record Payment
                    </button>
                    <button 
                        onClick={() => setIsBulkUploadOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    >
                        <FileSpreadsheet size={14} strokeWidth={3} /> Bulk Re-entry
                    </button>
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Upload size={14} strokeWidth={3} /> Import Statement
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <List size={18} className="text-white/50" />
                    <h3 className="font-bold text-sm tracking-wide text-white/80">Account Transactions</h3>
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
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th 
                                        className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50 cursor-pointer select-none hover:text-white transition-colors"
                                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date
                                            <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50">Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white/50">Audit Trace</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right text-white/50">Deposits</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right text-white/50">Withdrawals</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right text-white/50">Running Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEntries.map((entry) => {
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    const formattedDate = !isNaN(dateObj.getTime()) 
                                        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                        : entryDateStr;

                                    const debitVal = entry.amount !== undefined 
                                        ? (entry.type === 'DEBIT' ? entry.amount : 0) 
                                        : (entry.debit || 0);
                                        
                                    const creditVal = entry.amount !== undefined 
                                        ? (entry.type === 'CREDIT' ? entry.amount : 0) 
                                        : (entry.credit || 0);

                                    return (
                                        <tr 
                                            key={entry._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer" 
                                            style={{ borderColor: 'var(--border-main)' }}
                                            onClick={() => {
                                                const basePath = location.pathname.split('/bank-accounts/')[0];
                                                navigate(`${basePath}/bank-transactions/${entry._id}`);
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                 {renderDescriptionWithLinks(entry.description)}
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
                                                    {(runningBalancesMap[entry._id] !== undefined) 
                                                        ? runningBalancesMap[entry._id].toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                        : '-'}
                                                </span>
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
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(200,230,0,0.2)]"
                                    style={{ 
                                        borderColor: page === 1 ? 'var(--border-main)' : 'rgba(200,230,0,0.5)', 
                                        color: page === 1 ? 'var(--text-dim)' : 'rgb(200,230,0)',
                                        background: 'transparent'
                                    }}
                                >
                                    Previous
                                </button>
                                
                                <div className="flex items-center px-4">
                                    <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                        Page <span className="font-bold" style={{ color: 'rgb(200,230,0)' }}>{page}</span> of {pagination.pages}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={page === pagination.pages}
                                    className="px-4 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_10px_rgba(200,230,0,0.2)]"
                                    style={{ 
                                        borderColor: page === pagination.pages ? 'var(--border-main)' : 'rgba(200,230,0,0.5)', 
                                        color: page === pagination.pages ? 'var(--text-dim)' : 'rgb(200,230,0)',
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
                                        <p className="text-xs font-bold text-lime" style={{ color: 'var(--brand-lime)' }}>{importFile.name}</p>
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
                                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
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
                                    <div className="space-y-4 max-h-[200px] overflow-y-auto border rounded-xl p-3 bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                        <table className="w-full text-left border-collapse text-[11px]">
                                            <thead>
                                                <tr className="border-b text-white/50" style={{ borderColor: 'var(--border-main)' }}>
                                                    <th className="pb-1">Date</th>
                                                    <th className="pb-1">Details</th>
                                                    <th className="pb-1 text-right">Debit (Dep)</th>
                                                    <th className="pb-1 text-right">Credit (With)</th>
                                                    <th className="pb-1 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {parsedTransactions.map((tx, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5">
                                                        <td className="py-1.5 pr-2 font-mono whitespace-nowrap">{tx.date}</td>
                                                        <td className="py-1.5 pr-2 max-w-[180px] truncate">
                                                            <div className="font-bold text-white/80">{tx.description || 'Bank Line'}</div>
                                                            {tx.payee && <div className="text-[9px] text-white/45">Payee: {tx.payee}</div>}
                                                            {tx.referenceNumber && <div className="text-[9px] text-white/45 font-mono">Ref: {tx.referenceNumber}</div>}
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

                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-dim bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                <Info size={16} className="text-lime flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-lime)' }} />
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
                                    className="flex-1 py-4 bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all border cursor-pointer"
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
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Record Manual Payment</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime" style={{ color: 'var(--brand-lime)' }}>Post Double-Entry Ledger Transaction</p>
                            </div>
                        </div>

                        <form onSubmit={handleRecordPaymentSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                            {/* Row 1: Date, Mode, Source Account */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>From Account</label>
                                    {loadingAccounts ? (
                                        <div className="w-full border rounded-2xl px-4 py-3 text-xs text-dim bg-transparent" style={{ borderColor: 'var(--border-main)' }}>
                                            Loading other accounts...
                                        </div>
                                    ) : (
                                        <select 
                                            value={fromAccountId}
                                            onChange={e => setFromAccountId(e.target.value)}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none cursor-pointer"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                            required
                                        >
                                            <option value="" disabled style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Select Account</option>
                                            {otherAccounts.map(acc => (
                                                <option key={acc._id} value={acc._id} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                                    {acc.accountName || acc.bankName} ({acc.currency || 'USD'} {acc.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Customer selection for Rental Income (500031) */}
                            {isRentalIncomeSelected && (
                                <div className="space-y-4">
                                    <div className="space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Select Customer</label>
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
                                                required
                                            />
                                            {showCustomerList && filteredCustomers.length > 0 && !selectedCustomer && (
                                                <div className="absolute z-50 w-full mt-1 border rounded-2xl shadow-2xl max-h-52 overflow-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                                    {filteredCustomers.slice(0, 15).map(c => (
                                                        <button
                                                            type="button"
                                                            key={c._id}
                                                            onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(''); setShowCustomerList(false); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors cursor-pointer"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-[10px] font-black" style={{ color: 'var(--brand-lime)' }}>
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
                                                <span className="text-emerald-400 font-bold">Selected: {selectedCustomer.name} ({selectedCustomer.customerId})</span>
                                                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">Clear Selection</button>
                                            </div>
                                        )}
                                    </div>

                                    {selectedCustomer && (
                                        <div className="space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Apply to Invoice (Optional)</label>
                                            {loadingInvoices ? (
                                                <div className="text-xs font-bold py-2" style={{ color: 'var(--text-dim)' }}>Loading customer invoices...</div>
                                            ) : customerInvoices.length === 0 ? (
                                                <div className="text-xs font-bold py-2 text-amber-500">No open or partial invoices found for this customer.</div>
                                            ) : (
                                                <select
                                                    value={selectedInvoiceId}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setSelectedInvoiceId(val);
                                                        if (val) {
                                                            const selectedInv = customerInvoices.find(inv => inv._id === val);
                                                            if (selectedInv && (!paymentAmount || Number(paymentAmount) === 0)) {
                                                                setPaymentAmount(String(selectedInv.balance ?? selectedInv.totalAmountDue ?? ''));
                                                            }
                                                        }
                                                    }}
                                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none"
                                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                                >
                                                    <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>-- Select an Invoice --</option>
                                                    {customerInvoices.map(inv => (
                                                        <option 
                                                            key={inv._id} 
                                                            value={inv._id}
                                                            style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                                        >
                                                            {inv.invoiceNumber} ({inv.invoiceType || 'Rental'}) - Due: ${inv.balance?.toFixed(2) || inv.totalAmountDue?.toFixed(2)} [Total: ${inv.totalAmountDue?.toFixed(2)}]
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Row 2: Amount, Currency, Supporting Document */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</label>
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

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Supporting Document (Optional)</label>
                                    <div className="border border-dashed rounded-2xl px-4 py-3 text-center relative cursor-pointer flex items-center justify-center gap-2 h-[46px]" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                        <Upload size={14} className="text-dim opacity-60 flex-shrink-0" />
                                        {supportingDocFile ? (
                                            <p className="text-xs font-bold text-lime truncate max-w-[150px]" style={{ color: 'var(--brand-lime)' }}>{supportingDocFile.name}</p>
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
                            </div>

                            {/* Row 3: Description */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Description</label>
                                <textarea 
                                    value={paymentDescription}
                                    onChange={e => setPaymentDescription(e.target.value)}
                                    placeholder="Enter payment description details"
                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold bg-transparent outline-none min-h-[80px]"
                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsRecordPaymentModalOpen(false);
                                        setSupportingDocFile(null);
                                    }}
                                    className="flex-1 py-3 bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all border cursor-pointer"
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
                                        <>Record Payment</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <BulkLedgerUpload
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onSuccess={() => {
                    setIsBulkUploadOpen(false);
                    fetchData();
                }}
            />
        </div>
    );
};

export default BankAccountLedger;
