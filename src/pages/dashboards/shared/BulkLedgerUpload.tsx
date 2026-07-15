import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2, ChevronDown, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { getAllBankAccounts, bulkUploadBankAccountTransactions, type BankAccount } from '../../../services/bankAccountService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getAllAccountingCodes, type AccountingCode } from '../../../services/accountingService';

interface BulkLedgerUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
    _rowErrors: string[];
    _rawRow?: any;
}

const TEMPLATE_HEADERS = [
    'DATE', 'PREFIX', 'NUMBER', 'BANK NAME', 'SUB ACCOUNT', 'PARENT ACCOUNT', 'RECEIPT', 'PAYMENT', 'DESCRIPTION', 'REMARKS', 'BRANCH'
];

const SAMPLE_ROWS = [
    {
        DATE: '2026-06-01',
        PREFIX: '2026',
        NUMBER: '0000001',
        'BANK NAME': 'Banco General AH 1601',
        'SUB ACCOUNT': 'JESSICA SOTO EU8783',
        'PARENT ACCOUNT': 'Accounts Receivable',
        RECEIPT: 100.00,
        PAYMENT: 0.00,
        DESCRIPTION: 'ACH - JESSICA VALERIA SOTO CASTRO',
        REMARKS: 'JESSICA SOTO EU8783',
        BRANCH: 'HEAD OFFICE'
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

    // Load bank accounts and branches on mount
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoadingData(true);
                try {
                    const [accountsRes, branchesRes, codesRes] = await Promise.all([
                        getAllBankAccounts({ limit: 100 }),
                        getAllBranches({ limit: 100 }),
                        getAllAccountingCodes({ limit: 1000 })
                    ]);

                    const accountsList = accountsRes.data || accountsRes || [];
                    const branchesList = branchesRes.data || branchesRes || [];
                    const codesList = Array.isArray(codesRes) ? codesRes : ((codesRes as any).data || []);

                    setAccounts(accountsList.filter((a: BankAccount) => a.status === 'ACTIVE'));
                    setBranches(branchesList.filter((b: Branch) => b.status === 'ACTIVE'));
                    setAllAccountingCodes(codesList);

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

                    // Branches will be automatically auto-assigned per transaction row
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
                const day = part1;
                const month = part2;
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

    const formatDateDMY = (dateStr: string): string => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}-${month}-${year}`;
    };

    const validateRow = useCallback((row: any, targetAccount?: BankAccount): string[] => {
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

        const subAccountVal = getRowVal(row, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']);
        const parentAccountVal = getRowVal(row, ['parent account', 'parent_account', 'Parent Account', 'PARENT ACCOUNT']);

        const subAccountStr = String(subAccountVal || '').trim();
        const parentAccountStr = String(parentAccountVal || '').trim();

        if (subAccountStr && !parentAccountStr) {
            errors.push('Parent Account is required when Sub Account is specified');
        }

        if (parentAccountStr) {
            const parentExists = allAccountingCodes.some(c =>
                c.code === parentAccountStr ||
                c.name.toLowerCase().trim() === parentAccountStr.toLowerCase()
            );
            if (!parentExists) {
                errors.push(`Parent Account "${parentAccountStr}" not found in Chart of Accounts`);
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

    const revalidateAndRecalculateRows = useCallback((currentRows: ParsedTransaction[], targetAccount: BankAccount | undefined) => {
        if (!currentRows || currentRows.length === 0) return [];

        let balanceAccum = targetAccount ? (targetAccount.currentBalance || targetAccount.initialBalance || 0) : 0;
        const isCreditCard = targetAccount?.accountType === 'Credit Card';

        return currentRows.map(row => {
            const raw = row._rawRow || row;
            const errors = validateRow(raw, targetAccount);

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

            return {
                ...row,
                "Running Balance": balanceAccum,
                _rowErrors: errors
            };
        });
    }, [validateRow]);

    useEffect(() => {
        if (rows.length > 0 && selectedAccountId) {
            const targetAccount = accounts.find(acc => acc._id === selectedAccountId);
            setRows(prev => revalidateAndRecalculateRows(prev, targetAccount));
        }
    }, [selectedAccountId, accounts, revalidateAndRecalculateRows]);

    const downloadFailedRowsCSV = (failed: ParsedTransaction[], nameOfFile: string) => {
        if (!failed || failed.length === 0) return;

        const csvHeaders = ["DATE", "PREFIX", "NUMBER", "BANK NAME", "SUB ACCOUNT", "PARENT ACCOUNT", "RECEIPT", "PAYMENT", "DESCRIPTION", "REMARKS", "BRANCH", "Errors"];
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
                `"${r._rowErrors.join("; ").replace(/"/g, '""')}"`
            ];
        });

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

            let balanceAccum = selectedAccount ? (selectedAccount.currentBalance || selectedAccount.initialBalance || 0) : 0;
            const isCreditCard = selectedAccount?.accountType === 'Credit Card';

            const parsed = jsonData.map(row => {
                const rowErrors = validateRow(row);

                const dateVal = getRowVal(row, ['date', 'Date', 'DATE']);
                const prefixVal = getRowVal(row, ['prefix', 'Prefix', 'PREFIX']);
                const numberVal = getRowVal(row, ['number', 'Number', 'NUMBER']);
                const rawReceipt = getRowVal(row, ['receipt', 'Receipt', 'RECEIPT']);
                const rawPayment = getRowVal(row, ['payment', 'Payment', 'PAYMENT']);
                const descVal = getRowVal(row, ['description', 'Description', 'DESCRIPTION']) || '';
                const remarksVal = getRowVal(row, ['remarks', 'Remarks', 'REMARKS']) || '';

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

                return {
                    Date: isoDate || String(dateVal || ''),
                    Description: (() => {
                        const rawDesc = descVal.trim() || remarksVal.trim();
                        if (rawDesc) return rawDesc;
                        const typeStr = resolvedType === 'DEBIT' ? 'Deposit' : 'Withdrawal';
                        const subAccountVal = getRowVal(row, ['sub account', 'sub_account', 'Sub Account', 'SUB ACCOUNT', 'accounts name', 'accounts_name', 'Accounts Name', 'ACCOUNTS NAME']);
                        const partyStr = subAccountVal ? ` for ${subAccountVal}` : '';
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
                    _rowErrors: rowErrors,
                    _rawRow: row
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
                const batchTransactions = validRows.slice(start, end).map((row) => {
                    const rest: any = { ...row._rawRow };
                    for (const key in row) {
                        if (key !== '_rowErrors' && key !== '_rawRow') {
                            rest[key] = row[key];
                        }
                    }
                    return rest;
                });

                // Only clear existing on the first batch
                const batchClearExisting = i === 0 ? clearExisting : false;

                const payload = {
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

                            {/* Branch auto-resolution is applied per transaction row */}

                            {/* Clear existing is removed to avoid accidental deletion */}
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
                                                    <td className="py-3 px-4 font-mono">{formatDateDMY(row.Date) || '-'}</td>
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

