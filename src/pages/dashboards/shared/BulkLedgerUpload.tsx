import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2, ChevronDown, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { getAllBankAccounts, bulkUploadBankAccountTransactions, type BankAccount } from '../../../services/bankAccountService';
import { getAllBranches, type Branch } from '../../../services/branchService';

interface BulkLedgerUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedTransaction {
    Date: string;
    Description: string;
    "Transaction Details": string;
    Debit: number;
    Credit: number;
    "Running Balance": number;
    "Transaction Type": "DEBIT" | "CREDIT";
    Amount: number;
    transactionId?: string;
    _rowErrors?: string[];
}

const TEMPLATE_HEADERS = [
    'Date', 'Description', 'Transaction Details', 'Debit', 'Credit', 'Running Balance', 'Transaction Type', 'Transaction ID'
];

const SAMPLE_ROWS = [
    {
        Date: '2026-06-01',
        Description: 'Opening Balance',
        "Transaction Details": 'System migration opening balance',
        Debit: 50000.00,
        Credit: 0.00,
        "Running Balance": 50000.00,
        "Transaction Type": 'DEBIT',
        "Transaction ID": 'TXN00001'
    },
    {
        Date: '2026-06-02',
        Description: 'Invoice Payment Received',
        "Transaction Details": 'INV-002305 from Client Alpha',
        Debit: 1500.00,
        Credit: 0.00,
        "Running Balance": 51500.00,
        "Transaction Type": 'DEBIT',
        "Transaction ID": 'TXN00002'
    },
    {
        Date: '2026-06-03',
        Description: 'Office Utilities Paid',
        "Transaction Details": 'Electricity bill payment - SB-88772',
        Debit: 0.00,
        Credit: 320.00,
        "Running Balance": 51180.00,
        "Transaction Type": 'CREDIT',
        "Transaction ID": 'TXN00003'
    }
];

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
                return ['date', 'description', 'debit', 'credit', 'amount', 'transaction_type', 'transaction_details', 'transaction_id'].some(k => cleanCell.includes(k) || k.includes(cleanCell));
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

const BulkLedgerUpload = ({ isOpen, onClose, onSuccess }: BulkLedgerUploadProps) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState('');
    const [clearExisting, setClearExisting] = useState(true);

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

    // Load bank accounts and branches on mount
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoadingData(true);
                try {
                    const [accountsRes, branchesRes] = await Promise.all([
                        getAllBankAccounts({ limit: 100 }),
                        getAllBranches({ limit: 100 })
                    ]);

                    const accountsList = accountsRes.data || accountsRes || [];
                    const branchesList = branchesRes.data || branchesRes || [];

                    setAccounts(accountsList.filter((a: BankAccount) => a.status === 'ACTIVE'));
                    setBranches(branchesList.filter((b: Branch) => b.status === 'ACTIVE'));

                    // Auto-select "Banco General AH 1601" or first account
                    const bg1601 = accountsList.find((a: BankAccount) =>
                        a.accountName?.toLowerCase().includes('banco general') &&
                        a.accountName?.toLowerCase().includes('1601')
                    );
                    if (bg1601) {
                        setSelectedAccountId(bg1601._id);
                    } else if (accountsList.length > 0) {
                        setSelectedAccountId(accountsList[0]._id);
                    }

                    if (branchesList.length > 0) {
                        setSelectedBranchId(branchesList[0]._id);
                    }
                } catch (err) {
                    console.error("Failed to fetch bulk upload pre-requisites", err);
                    toast.error("Failed to load active bank accounts or branches");
                } finally {
                    setLoadingData(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    const parseDateFlexible = (val: any): Date | null => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'number') {
            const totalDays = Math.round(val - 25569);
            const date = new Date(Date.UTC(1970, 0, 1 + totalDays));
            return isNaN(date.getTime()) ? null : date;
        }
        const str = String(val).trim();
        if (!str) return null;
        if (/^\d{5}(\.\d+)?$/.test(str)) {
            const num = parseFloat(str);
            const totalDays = Math.round(num - 25569);
            const date = new Date(Date.UTC(1970, 0, 1 + totalDays));
            return isNaN(date.getTime()) ? null : date;
        }
        const parts = str.split(/[\/\-.]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const date = new Date(Date.UTC(year, month, day));
                if (!isNaN(date.getTime())) return date;
            } else {
                const part1 = parseInt(parts[0], 10);
                const part2 = parseInt(parts[1], 10);
                const part3 = parseInt(parts[2], 10);
                const year = part3 < 100 ? 2000 + part3 : part3;
                let day = part1;
                let month = part2;
                if (month > 12 && day <= 12) {
                    day = part2;
                    month = part1;
                }
                const date = new Date(Date.UTC(year, month - 1, day));
                if (!isNaN(date.getTime())) return date;
            }
        }
        const fallback = new Date(str);
        if (isNaN(fallback.getTime())) return null;
        // Re-construct in UTC to avoid local-timezone shift
        const date = new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
        return date;
    };

    const cleanNumber = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        const str = String(val).replace(/[^\d.-]/g, '');
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    };

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];

        const dateVal = getRowVal(row, ['date', 'Date']);
        const descVal = getRowVal(row, ['description', 'Description']) || '';
        const detailsVal = getRowVal(row, ['transaction_details', 'transaction details', 'Transaction Details', 'details']) || '';
        const rawDebit = getRowVal(row, ['debit', 'Debit']);
        const rawCredit = getRowVal(row, ['credit', 'Credit']);
        const rawAmount = getRowVal(row, ['amount', 'Amount']);
        const rawType = getRowVal(row, ['transaction_type', 'transaction type', 'Transaction Type', 'type']) || '';

        const debitVal = cleanNumber(rawDebit);
        const creditVal = cleanNumber(rawCredit);
        let amountVal = cleanNumber(rawAmount);
        if (amountVal === 0) {
            amountVal = debitVal > 0 ? debitVal : creditVal;
        }

        if (!dateVal) {
            errors.push('Missing Date');
        } else {
            const parsedDate = parseDateFlexible(dateVal);
            if (!parsedDate) {
                errors.push('Invalid Date format');
            }
        }

        const typeStr = String(rawType).trim().toUpperCase();
        const finalDesc = String(descVal).trim() || String(detailsVal).trim() || (typeStr === 'OPENING BALANCE' ? 'Opening Balance' : '');
        if (!finalDesc) {
            errors.push('Missing Description');
        }

        if (debitVal < 0) errors.push('Debit cannot be negative');
        if (creditVal < 0) errors.push('Credit cannot be negative');
        if (amountVal < 0) errors.push('Amount cannot be negative');

        const hasDebit = rawDebit !== undefined && rawDebit !== null && String(rawDebit).trim() !== '';
        const hasCredit = rawCredit !== undefined && rawCredit !== null && String(rawCredit).trim() !== '';
        const hasAmount = rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim() !== '';

        if (!hasDebit && !hasCredit && !hasAmount) {
            errors.push('Transaction must have an amount (Debit, Credit, or Amount)');
        }

        return errors;
    }, []);

    const downloadFailedRowsCSV = (failed: ParsedTransaction[], nameOfFile: string) => {
        if (!failed || failed.length === 0) return;

        const csvHeaders = ["Date", "Description", "Transaction Details", "Debit", "Credit", "Running Balance", "Transaction Type", "Amount", "Transaction ID", "Errors"];
        const csvRows = failed.map(r => [
            `"${(r.Date || "").replace(/"/g, '""')}"`,
            `"${(r.Description || "").replace(/"/g, '""')}"`,
            `"${(r["Transaction Details"] || "").replace(/"/g, '""')}"`,
            String(r.Debit),
            String(r.Credit),
            String(r["Running Balance"]),
            `"${(r["Transaction Type"] || "").replace(/"/g, '""')}"`,
            String(r.Amount),
            `"${(r.transactionId || "").replace(/"/g, '""')}"`,
            `"${r._rowErrors.join("; ").replace(/"/g, '""')}"`
        ]);

        const csvContent = [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = nameOfFile ? nameOfFile.split('.')[0] : 'failed_transactions';
        link.setAttribute('download', `failed_rows_${name}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Failed rows downloaded automatically.");
    };

    const parseFile = (f: File) => {
        setResult(null);
        setFileName(f.name);
        const ext = f.name.split('.').pop()?.toLowerCase();

        const processData = (jsonData: any[]) => {
            if (!jsonData || jsonData.length === 0) {
                toast.error('The file is empty or has no rows.');
                return;
            }

            const parsed = jsonData.map(row => {
                const rowErrors = validateRow(row);

                const dateVal = getRowVal(row, ['date', 'Date']);
                const descVal = getRowVal(row, ['description', 'Description']) || '';
                const detailsVal = getRowVal(row, ['transaction_details', 'transaction details', 'Transaction Details', 'details']) || '';
                const debitVal = cleanNumber(getRowVal(row, ['debit', 'Debit']));
                const creditVal = cleanNumber(getRowVal(row, ['credit', 'Credit']));
                const runningBalVal = cleanNumber(getRowVal(row, ['running_balance', 'running balance', 'Running Balance', 'runningBal']));
                const rawType = String(getRowVal(row, ['transaction_type', 'transaction type', 'Transaction Type', 'type']) || '').trim();
                const rawAmount = getRowVal(row, ['amount', 'Amount']);
                let amountVal = cleanNumber(rawAmount);
                if (amountVal === 0) {
                    amountVal = debitVal > 0 ? debitVal : creditVal;
                }
                const txIdVal = getRowVal(row, ['transaction_id', 'transactionId', 'Transaction ID', 'reference_number', 'reference number', 'referenceNumber']);

                const typeStr = rawType.toUpperCase();
                const parsedDate = parseDateFlexible(dateVal);
                const isoDate = parsedDate
                    ? `${parsedDate.getUTCFullYear()}-${String(parsedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(parsedDate.getUTCDate()).padStart(2, '0')}`
                    : '';

                // Resolve type to DEBIT or CREDIT based on priority
                let resolvedType = '';

                // 1. Check Debit/Credit columns first
                if (debitVal > 0 && creditVal === 0) {
                    resolvedType = 'DEBIT';
                } else if (creditVal > 0 && debitVal === 0) {
                    resolvedType = 'CREDIT';
                }

                // 2. Check Amount suffix next
                if (!resolvedType) {
                    const amountStr = String(rawAmount || '').toUpperCase();
                    if (amountStr.includes('DR')) {
                        resolvedType = 'DEBIT';
                    } else if (amountStr.includes('CR')) {
                        resolvedType = 'CREDIT';
                    }
                }

                // 3. Match from the user's specific transaction types
                if (!resolvedType) {
                    const creditTypes = [
                        'CREDIT',
                        'EXPENSE',
                        'VENDOR PAYMENT',
                        'TRANSFER FUND',
                        'PAYMENT REFUND',
                        'SALES RETURN',
                        'WITHDRAWAL'
                    ];
                    if (creditTypes.includes(typeStr)) {
                        resolvedType = 'CREDIT';
                    } else {
                        // All others default to DEBIT (Customer Payment, Deposit, Expense Refund, Interest Income, Journal, Opening Balance, Other Income, Vendor Payment Refund, etc.)
                        resolvedType = 'DEBIT';
                    }
                }

                const finalDesc = descVal.trim() || detailsVal.trim() || (typeStr === 'OPENING BALANCE' ? 'Opening Balance' : '');

                return {
                    Date: isoDate || String(dateVal || ''),
                    Description: finalDesc,
                    "Transaction Details": detailsVal,
                    Debit: debitVal,
                    Credit: creditVal,
                    "Running Balance": runningBalVal,
                    "Transaction Type": resolvedType,
                    Amount: amountVal,
                    transactionId: txIdVal ? String(txIdVal) : undefined,
                    _rowErrors: rowErrors
                } as ParsedTransaction;
            });

            setRows(parsed);
            toast.success(`Parsed ${parsed.length} row(s) from ${f.name}`);
        };

        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    processData(parseSheetToJSON(ws));
                } catch { toast.error('Failed to parse Excel file.'); }
            };
            reader.readAsArrayBuffer(f);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target?.result, { type: 'string' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    processData(parseSheetToJSON(ws));
                } catch { toast.error('Failed to parse CSV file.'); }
            };
            reader.readAsText(f);
        }
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
        setUploadProgress(0);

        const batchSize = 50;
        const totalBatches = Math.ceil(totalRows / batchSize);

        try {
            for (let i = 0; i < totalBatches; i++) {
                const start = i * batchSize;
                const end = Math.min(start + batchSize, totalRows);
                const batchTransactions = validRows.slice(start, end).map(({ _rowErrors, ...rest }) => rest);

                // Only clear existing on the first batch
                const batchClearExisting = i === 0 ? clearExisting : false;

                const payload = {
                    branchId: selectedBranchId || undefined,
                    clearExisting: batchClearExisting,
                    transactions: batchTransactions
                };

                const res = await bulkUploadBankAccountTransactions(selectedAccountId, payload);

                // Update percentage
                const progressPct = Math.round(((i + 1) / totalBatches) * 100);
                setUploadProgress(progressPct);

                if (i === totalBatches - 1) {
                    setResult(res.data || res);
                    toast.success(res.message || 'Transactions uploaded successfully!');

                    const failedRows = rows.filter(r => r._rowErrors && r._rowErrors.length > 0);
                    if (failedRows.length > 0) {
                        downloadFailedRowsCSV(failedRows, fileName);
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
        setResult(null);
        setAccountSearchQuery('');
        setIsAccountDropdownOpen(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleClose = () => {
        const hasResult = !!result;
        handleReset();
        if (hasResult) {
            onSuccess();
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const validCount = rows.filter(r => r._rowErrors.length === 0).length;
    const errorCount = rows.filter(r => r._rowErrors.length > 0).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-fade-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
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
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Percentage Loader */}
                    {uploading && (
                        <div className="p-8 border rounded-2xl flex flex-col items-center justify-center space-y-6 shadow-[0_0_40px_rgba(200,230,0,0.06)]" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-lime/10" style={{ color: 'var(--brand-lime)' }}>
                                <Loader2 className="animate-spin" size={28} />
                            </div>
                            <div className="text-center w-full max-w-md">
                                <h4 className="text-md font-black uppercase tracking-wider text-main" style={{ color: 'var(--text-main)' }}>Uploading Ledger Entries</h4>
                                <p className="text-xs mt-1.5 text-dim" style={{ color: 'var(--text-dim)' }}>Please wait while your statement records are parsed and saved...</p>

                                <div className="mt-8 flex justify-between text-xs font-bold text-dim mb-2">
                                    <span className="uppercase tracking-widest text-[10px]">Processing Batches</span>
                                    <span className="text-lime font-black text-sm" style={{ color: 'var(--brand-lime)' }}>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border" style={{ borderColor: 'var(--border-main)' }}>
                                    <div
                                        className="bg-lime h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(200,230,0,0.6)]"
                                        style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand-lime)' }}
                                    />
                                </div>
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-white/30 text-center">
                                Do not close this modal or refresh the window
                            </div>
                        </div>
                    )}

                    {/* Setup Parameters */}
                    {!result && !uploading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
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

                            {/* Branch Selection */}
                            <div className="space-y-1.5">
                                <label className="block text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--text-dim)' }}>Assign to Branch</label>
                                {loadingData ? (
                                    <div className="flex items-center gap-2 py-2.5">
                                        <Loader2 size={14} className="animate-spin" />
                                        <span className="text-xs text-dim">Loading branches...</span>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={selectedBranchId}
                                            onChange={(e) => setSelectedBranchId(e.target.value)}
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-lime appearance-none"
                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">— Select Branch —</option>
                                            {branches.map(b => (
                                                <option key={b._id} value={b._id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    </div>
                                )}
                            </div>

                            {/* Reset / Clear Toggle */}
                            <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl border mt-2" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
                                <input
                                    id="clear-existing-checkbox"
                                    type="checkbox"
                                    checked={clearExisting}
                                    onChange={(e) => setClearExisting(e.target.checked)}
                                    className="w-4.5 h-4.5 rounded border-gray-300 text-red-600 focus:ring-red-500 accent-red-500 cursor-pointer"
                                />
                                <div className="cursor-pointer" onClick={() => setClearExisting(!clearExisting)}>
                                    <label htmlFor="clear-existing-checkbox" className="block text-xs font-black uppercase tracking-wider text-rose-400 cursor-pointer">
                                        Clear existing transaction history before uploading
                                    </label>
                                    <p className="text-[11px] text-white/50 mt-0.5">
                                        Check this to purge all ledger entries associated with this bank account and reset the balance. Required for a clean bank re-entry.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Template downloads */}
                    {!result && !uploading && rows.length === 0 && (
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Download upload template with specific columns:</span>
                            <div className="ml-auto flex gap-2">
                                <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-card hover:bg-black/10" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                    <Download size={14} /> Excel Template
                                </button>
                                <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-card hover:bg-black/10" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                    <Download size={14} /> CSV Template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Drop zone */}
                    {rows.length === 0 && !result && !uploading && (
                        <div
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)', background: dragOver ? 'rgba(200,230,0,0.05)' : 'transparent' }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.08)' }}>
                                <Upload size={28} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-main">Drop statement Excel or CSV here</p>
                                <p className="text-xs mt-1 text-dim">or click to browse — .xlsx, .xls, .csv supported</p>
                            </div>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
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
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span className="text-emerald-500 font-bold">{validCount} valid transactions</span>
                                            {errorCount > 0 && (
                                                <button
                                                    onClick={() => downloadFailedRowsCSV(rows.filter(r => r._rowErrors.length > 0), fileName)}
                                                    className="text-rose-500 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                                                >
                                                    {errorCount} validation errors (Download CSV)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <button onClick={handleReset} disabled={uploading} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-xs font-bold border hover:bg-black/5 disabled:opacity-40" style={{ borderColor: 'var(--border-main)' }}>
                                        Clear File
                                    </button>
                                    <button onClick={handleSubmit} disabled={uploading || validCount === 0 || !selectedAccountId}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold disabled:opacity-50 border-none hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploading ? 'Uploading...' : `Upload ${validCount} Transactions`}
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="py-3 px-4">Date</th>
                                                <th className="py-3 px-4">Description</th>
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
                                            {rows.map((row, idx) => (
                                                <tr key={idx} style={{ background: row._rowErrors.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                                    <td className="py-3 px-4 font-mono">{row.Date || '-'}</td>
                                                    <td className="py-3 px-4 font-semibold">{row.Description || '-'}</td>
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
                                                            <div className="flex flex-col text-rose-500" title={row._rowErrors.join(', ')}>
                                                                <div className="flex items-center gap-1 font-bold"><AlertTriangle size={12} /> Error</div>
                                                                <span className="text-[10px] text-rose-400 mt-0.5 max-w-[180px] break-words">{row._rowErrors.join(', ')}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-emerald-500 font-semibold"><CheckCircle size={12} /> Valid</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/40 hover:text-rose-500 transition-colors border-none cursor-pointer" title="Remove Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-4 animate-fade-in text-center py-8">
                            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                <CheckCircle size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-main mb-2">Import Successful!</h3>
                                <p className="text-sm text-dim">
                                    Successfully processed and imported <span className="font-bold text-emerald-500">{result.count || rows.length}</span> transaction entries.
                                </p>
                                <p className="text-xs text-white/50 mt-1">
                                    New account balance has been set to <span className="font-mono font-bold text-brand-lime">${(result.newBalance || 0).toFixed(2)}</span>
                                </p>
                            </div>

                            <div className="pt-6">
                                <button onClick={handleClose} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all border-none hover:scale-105 active:scale-95 shadow-md" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkLedgerUpload;

