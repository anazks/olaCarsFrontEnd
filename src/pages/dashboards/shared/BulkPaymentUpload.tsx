import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadPayments } from '../../../services/paymentReceivedService';
import { getAllCustomers } from '../../../services/customerService';

interface ParsedPaymentRow {
    [key: string]: any;
    _rowErrors: string[];
}

interface BulkPaymentUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Payment Number', 'CustomerPayment ID', 'Mode', 'CustomerID', 'Description', 'Exchange Rate',
    'Amount', 'Unused Amount', 'Bank Charges', 'Reference Number', 'Currency Code', 'Branch ID',
    'Payment Number Prefix', 'Payment Number Suffix', 'Customer Name', 'Customer Number',
    'Payment Type', 'Location Name', 'Date', 'Created Time', 'Deposit To', 'Deposit To Account Code',
    'Tax Account', 'Payment Status', 'InvoicePayment ID', 'Amount Applied to Invoice',
    'Invoice Payment Applied Date', 'Early Payment Discount', 'Withholding Tax Amount',
    'Invoice Number', 'Invoice Date'
];

const SAMPLE_DATA = [
    {
        'Payment Number': 'PR-000101',
        'CustomerPayment ID': 'PM-ZOHO-001',
        'Mode': 'Cash',
        'CustomerID': 'DRV001',
        'Description': 'Weekly lease payment received',
        'Exchange Rate': '1',
        'Amount': '180',
        'Unused Amount': '0',
        'Bank Charges': '0',
        'Reference Number': 'REF-12345',
        'Currency Code': 'USD',
        'Branch ID': '',
        'Payment Number Prefix': '',
        'Payment Number Suffix': '',
        'Customer Name': 'John Smith',
        'Customer Number': '+254700000001',
        'Payment Type': 'Cash',
        'Location Name': 'Panama Branch',
        'Date': '2026-06-02',
        'Created Time': '2026-06-02 10:00:00',
        'Deposit To': 'Cash Account',
        'Deposit To Account Code': '1020',
        'Tax Account': '',
        'Payment Status': 'Completed',
        'InvoicePayment ID': 'IP-001',
        'Amount Applied to Invoice': '180',
        'Invoice Payment Applied Date': '2026-06-02',
        'Early Payment Discount': '0',
        'Withholding Tax Amount': '0',
        'Invoice Number': 'INV-000101',
        'Invoice Date': '2026-06-01'
    },
    {
        'Payment Number': 'PR-000102',
        'CustomerPayment ID': 'PM-ZOHO-002',
        'Mode': 'Bank Transfer',
        'CustomerID': 'DRV002',
        'Description': 'Maintenance recovery payment',
        'Exchange Rate': '1',
        'Amount': '100',
        'Unused Amount': '0',
        'Bank Charges': '0',
        'Reference Number': 'REF-98765',
        'Currency Code': 'USD',
        'Branch ID': '',
        'Payment Number Prefix': '',
        'Payment Number Suffix': '',
        'Customer Name': 'Maria Garcia',
        'Customer Number': '+254711223344',
        'Payment Type': 'Bank Transfer',
        'Location Name': 'Panama Branch',
        'Date': '2026-06-03',
        'Created Time': '2026-06-03 11:30:00',
        'Deposit To': 'Bank Account',
        'Deposit To Account Code': '1010',
        'Tax Account': '',
        'Payment Status': 'Completed',
        'InvoicePayment ID': 'IP-002',
        'Amount Applied to Invoice': '100',
        'Invoice Payment Applied Date': '2026-06-03',
        'Early Payment Discount': '0',
        'Withholding Tax Amount': '0',
        'Invoice Number': 'INV-000102',
        'Invoice Date': '2026-06-02'
    }
];

const parseFlexibleDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    
    if (typeof dateStr === 'number') {
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }

    const str = dateStr.toString().trim();
    if (!str) return null;

    const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }

    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }

    return null;
};

const getRowVal = (r: any, possibleKeys: string[]): any => {
    if (!r) return undefined;
    for (const key of possibleKeys) {
        const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
        if (r[key] !== undefined) return r[key];
        for (const k of Object.keys(r)) {
            const cleanK = k.replace(/^\ufeff/, '').trim().toLowerCase();
            if (cleanK === cleanKey) {
                return r[k];
            }
        }
    }
    return undefined;
};

const normalizeRowDates = (row: any): any => {
    const updated = { ...row };
    
    const dateVal = getRowVal(row, ['Date', 'date']);
    const dateKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'date') || 'Date';
    if (dateVal) {
        const parsed = parseFlexibleDate(dateVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[dateKey] = `${yyyy}-${mm}-${dd}`;
        }
    }

    const createdTimeVal = getRowVal(row, ['Created Time', 'createdTime']);
    const createdTimeKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'created time') || 'Created Time';
    if (createdTimeVal) {
        const parsed = parseFlexibleDate(createdTimeVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[createdTimeKey] = `${yyyy}-${mm}-${dd}`;
        }
    }
    
    return updated;
};

const BulkPaymentUpload = ({ isOpen, onClose, onSuccess }: BulkPaymentUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedPaymentRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [availableCustomerNames, setAvailableCustomerNames] = useState<Set<string>>(new Set());
    const [availableCustomerIds, setAvailableCustomerIds] = useState<Set<string>>(new Set());
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingCustomers(true);

            getAllCustomers({ limit: 100000 })
                .then(res => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    const names = new Set(list.map(c => c.name?.toLowerCase().trim().replace(/\s+/g, ' ')).filter((n): n is string => !!n));
                    const ids = new Set(list.map(c => c.customerId?.toLowerCase().trim()).filter((id): id is string => !!id));
                    setAvailableCustomerNames(names);
                    setAvailableCustomerIds(ids);
                    console.log(`[BulkPaymentUpload] Loaded ${names.size} customers for validation.`);
                })
                .catch(err => {
                    console.error('Failed to load customer names/IDs for validation', err);
                })
                .finally(() => {
                    setLoadingCustomers(false);
                });
        } else {
            setAvailableCustomerNames(new Set());
            setAvailableCustomerIds(new Set());
            setLoadingCustomers(false);
        }
    }, [isOpen]);

    const matchNameFlexibly = (inputName: string, dbNames: Set<string>): boolean => {
        const cleanInput = inputName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
        if (!cleanInput) return false;
        
        if (dbNames.has(cleanInput)) return true;
        
        for (const dbName of dbNames) {
            const cleanDb = dbName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
            if (cleanDb === cleanInput || cleanDb.includes(cleanInput) || cleanInput.includes(cleanDb)) {
                return true;
            }
            
            const inputWords = cleanInput.split(/\s+/).filter(w => w.length > 1);
            if (inputWords.length > 0) {
                const dbWords = cleanDb.split(/\s+/);
                const matchesAll = inputWords.every(word => dbWords.some(dbW => dbW.includes(word) || word.includes(dbW)));
                if (matchesAll) return true;
            }
        }
        return false;
    };

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        
        // 1. Validate Customer
        const customerName = getRowVal(row, ['Customer Name', 'customerName', 'customer']);
        const customerId = getRowVal(row, ['Customer ID', 'customerId', 'customerNumber']);
        const customerNumber = getRowVal(row, ['Customer Number', 'customerNumber']);

        if (!customerName) {
            errors.push('Customer Name is required');
        } else {
            const cleanName = customerName.toString().toLowerCase().trim().replace(/\s+/g, ' ');
            const hasNameMatch = matchNameFlexibly(cleanName, availableCustomerNames);
            
            let hasIdMatch = false;
            if (customerId) {
                hasIdMatch = availableCustomerIds.has(customerId.toString().toLowerCase().trim());
            }
            if (!hasIdMatch && customerNumber) {
                hasIdMatch = availableCustomerIds.has(customerNumber.toString().toLowerCase().trim());
            }

            if (!hasNameMatch && !hasIdMatch && availableCustomerNames.size > 0) {
                errors.push(`Customer Name "${customerName}" not found in database`);
            }
        }

        // 2. Validate Amount
        const amount = getRowVal(row, ['Amount', 'amount']);
        if (amount === undefined || amount === null || amount === '') {
            errors.push('Amount is required');
        } else {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
                errors.push('Amount must be a positive number');
            }
        }

        // 3. Validate Deposit To
        const depositTo = getRowVal(row, ['Deposit To', 'depositTo']);
        const depositToCode = getRowVal(row, ['Deposit To Account Code', 'depositToAccountCode']);
        if (!depositTo && !depositToCode) {
            errors.push('Deposit To account name or account code is required');
        }

        // 4. Validate Date
        const date = getRowVal(row, ['Date', 'date', 'Created Time', 'createdTime']);
        if (!date) {
            errors.push('Payment Date is required');
        } else {
            const parsed = parseFlexibleDate(date);
            if (!parsed) {
                errors.push('Invalid Date (expected YYYY-MM-DD or DD-MM-YYYY)');
            }
        }
        
        return errors;
    }, [availableCustomerNames, availableCustomerIds]);

    useEffect(() => {
        if (parsedRows.length > 0 && availableCustomerNames.size > 0) {
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [availableCustomerNames, availableCustomerIds, validateRow]);

    const parseFile = (file: File) => {
        setResult(null);
        setFileName(file.name);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    const rows: ParsedPaymentRow[] = (jsonData as any[]).map(row => {
                        const trimmedRow: any = {};
                        for (const key of Object.keys(row)) {
                            trimmedRow[key.trim()] = row[key];
                        }
                        const normalized = normalizeRowDates(trimmedRow);
                        return {
                            ...normalized,
                            _rowErrors: validateRow(normalized),
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found in the Excel file.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                } catch (err) {
                    toast.error('Failed to parse Excel file.');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    const rows: ParsedPaymentRow[] = (results.data as any[]).map(row => {
                        const normalized = normalizeRowDates(row);
                        return {
                            ...normalized,
                            _rowErrors: validateRow(normalized),
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found in the file.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                },
                error: (err: any) => {
                    toast.error(`Failed to parse file: ${err.message}`);
                }
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) parseFile(file);
    };

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "PaymentsReceived");
            XLSX.writeFile(workbook, `payments_received_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_received_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        // Group rows by Payment Number / CustomerPayment ID
        const paymentGroupsMap = new Map<string, any[]>();
        validRows.forEach(row => {
            const payNo = getRowVal(row, ['Payment Number', 'paymentNumber']);
            const payId = getRowVal(row, ['CustomerPayment ID', 'customerPaymentId']);
            const key = (payNo || payId || `TEMP-${Date.now()}-${Math.random()}`).toString().trim();
            if (!paymentGroupsMap.has(key)) {
                paymentGroupsMap.set(key, []);
            }
            paymentGroupsMap.get(key)!.push(row);
        });

        const groupsArray = Array.from(paymentGroupsMap.values());
        const totalPayments = groupsArray.length;

        setUploading(true);
        setUploadProgress(0);
        setUploadStatusText(`Uploading payments (0 / ${totalPayments})...`);

        const CHUNK_PAYMENT_SIZE = 50; // Process 50 payments at a time
        const chunks: any[][] = [];
        for (let i = 0; i < groupsArray.length; i += CHUNK_PAYMENT_SIZE) {
            const groupBatch = groupsArray.slice(i, i + CHUNK_PAYMENT_SIZE);
            const rowBatch = groupBatch.flat().map(({ _rowErrors, ...rest }) => rest);
            chunks.push(rowBatch);
        }

        const finalResult = {
            successCount: 0,
            errorCount: 0,
            skippedCount: 0,
            errors: [] as string[],
            skipped: [] as string[],
            createdPayments: [] as string[]
        };

        try {
            let processedPayments = 0;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const rowBatch = chunks[chunkIdx];
                const res = await bulkUploadPayments({ rows: rowBatch });
                
                finalResult.successCount += res.successCount || 0;
                finalResult.errorCount += res.errorCount || 0;
                finalResult.skippedCount += res.skippedCount || 0;
                if (res.errors) finalResult.errors.push(...res.errors);
                if (res.skipped) finalResult.skipped.push(...res.skipped);
                if (res.createdPayments) finalResult.createdPayments.push(...res.createdPayments);

                processedPayments += groupsArray.slice(chunkIdx * CHUNK_PAYMENT_SIZE, (chunkIdx + 1) * CHUNK_PAYMENT_SIZE).length;
                setUploadProgress(Math.round((processedPayments / totalPayments) * 100));
                setUploadStatusText(`Uploading payments (${processedPayments} / ${totalPayments})...`);
            }

            setResult(finalResult);

            if (finalResult.successCount > 0) {
                toast.success(`${finalResult.successCount} payments uploaded successfully.`);
                if (finalResult.skippedCount > 0) {
                    toast(`${finalResult.skippedCount} duplicate payments skipped.`, { icon: 'ℹ️', duration: 4000 });
                }
                onSuccess();
            } else if (finalResult.skippedCount > 0) {
                toast(`All ${finalResult.skippedCount} duplicate payments were skipped.`, { icon: 'ℹ️', duration: 4000 });
            } else if (finalResult.errorCount > 0) {
                toast.error(`Completed with ${finalResult.errorCount} errors.`);
            } else {
                toast.success('Upload complete.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
            setUploadProgress(100);
            setUploadStatusText('');
        }
    };

    const handleReset = () => {
        setParsedRows([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveRow = (index: number) => {
        setParsedRows(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    const errorRowsCount = parsedRows.filter(r => r._rowErrors.length > 0).length;
    const validRowsCount = parsedRows.length - errorRowsCount;

    // Calculate unique payment groups from valid rows
    const uniquePaymentCount = (() => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        const groupMap = new Map<string, boolean>();
        validRows.forEach(row => {
            const payNo = getRowVal(row, ['Payment Number', 'paymentNumber']);
            const payId = getRowVal(row, ['CustomerPayment ID', 'customerPaymentId']);
            const key = (payNo || payId || `TEMP-${Math.random()}`).toString().trim();
            groupMap.set(key, true);
        });
        return groupMap.size;
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl animate-scale-up"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                        <div>
                            <h2 className="text-base font-black tracking-tight text-main">Payment Received Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch payment receipts, match customer balances, and update ledger entries.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={uploading}
                        className="p-1.5 rounded-lg transition-colors hover:bg-input text-dim hover:text-main border-none bg-transparent cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Upload / Template Section */}
                    {parsedRows.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Drag & Drop Area */}
                            <div className="md:col-span-2">
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer min-h-[260px] ${
                                        dragOver ? 'border-brand-lime bg-lime-500/5' : 'border-border bg-card hover:bg-input/30'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)' }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                    />
                                    {loadingCustomers ? (
                                        <div className="space-y-3">
                                            <Loader2 className="h-10 w-10 animate-spin text-main mx-auto" />
                                            <p className="text-xs font-bold text-main">Caching customer registry for validation...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                                                <Upload className="h-6 w-6" style={{ color: 'var(--brand-lime)' }} />
                                            </div>
                                            <h3 className="text-sm font-bold text-main mb-1">Upload your bulk payments file</h3>
                                            <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                            <div className="text-[10px] text-dim/60 space-y-0.5">
                                                <p>Supports .xlsx, .xls, and .csv files.</p>
                                                <p>Groups automatically by Payment Number/ID to allocate multi-invoice offsets.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Template Download Card */}
                            <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                                        <h3 className="text-sm font-black text-main">Bulk Data Templates</h3>
                                    </div>
                                    <p className="text-xs text-dim leading-relaxed">
                                        Please use our standard template headers. Ensure customer names match exactly with database records to ensure auto-linkage.
                                    </p>
                                    <div className="bg-card/40 rounded-lg p-3 border space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between text-[10px] font-bold text-dim">
                                            <span>Required Fields:</span>
                                            <span style={{ color: 'var(--brand-lime)' }}>Strict validation</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Customer Name', 'Amount', 'Deposit To', 'Date'].map(f => (
                                                <span key={f} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <button
                                        onClick={() => downloadTemplate('xlsx')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                    >
                                        <Download className="h-4 w-4" /> Download Excel Template
                                    </button>
                                    <button
                                        onClick={() => downloadTemplate('csv')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                    >
                                        <Download className="h-4 w-4" /> Download CSV Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Data Review and Summary */
                        <div className="space-y-4">
                            {/* Summary Status Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border" 
                                 style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                    <span className="text-dim">File: <strong className="text-main">{fileName}</strong></span>
                                    <span className="text-dim">Total Rows: <strong className="text-main">{parsedRows.length}</strong></span>
                                    <span className="text-green-500">Valid Rows: {validRowsCount}</span>
                                    <span style={{ color: 'var(--brand-lime)' }}>Unique Payments: {uniquePaymentCount}</span>
                                    {errorRowsCount > 0 && <span className="text-red-500">Errors: {errorRowsCount}</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleReset}
                                        disabled={uploading}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer transition-colors bg-transparent text-main"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        Clear and Restart
                                    </button>
                                </div>
                            </div>

                            {/* Results Report Display */}
                            {result && (
                                <div className="rounded-xl border p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                                        <CheckCircle className="h-5 w-5" />
                                        <span>Upload Completed Successfully!</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-green-500">{result.successCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Created Payments</p>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-dim">{result.skippedCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Skipped Duplicates</p>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-red-500">{result.errorCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Failed Rows</p>
                                        </div>
                                    </div>
                                    {(result.errors.length > 0 || result.skipped.length > 0) && (
                                        <div className="mt-3 p-3 rounded-lg bg-input border space-y-2 max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                            {result.skipped.map((skip: string, idx: number) => (
                                                <div key={`skip-${idx}`} className="text-[10px] text-dim flex items-center gap-1.5">
                                                    <Info className="h-3 w-3 shrink-0 text-blue-500" />
                                                    <span>{skip}</span>
                                                </div>
                                            ))}
                                            {result.errors.map((err: string, idx: number) => (
                                                <div key={`err-${idx}`} className="text-[10px] text-red-500 flex items-center gap-1.5 font-medium">
                                                    <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                                                    <span>{err}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Upload Progress Loader */}
                            {uploading && (
                                <div className="space-y-2 p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-main">{uploadStatusText}</span>
                                        <span style={{ color: 'var(--brand-lime)' }}>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden bg-input">
                                        <div 
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{ backgroundColor: 'var(--brand-lime)', width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Table List of parsed rows */}
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                                <th className="p-3 font-bold">Row</th>
                                                <th className="p-3 font-bold">Payment Number</th>
                                                <th className="p-3 font-bold">Customer Name</th>
                                                <th className="p-3 font-bold">Date</th>
                                                <th className="p-3 font-bold">Amount</th>
                                                <th className="p-3 font-bold">Deposit To</th>
                                                <th className="p-3 font-bold">Invoice Number</th>
                                                <th className="p-3 font-bold">Validation Status</th>
                                                <th className="p-3 font-bold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const pNumber = getRowVal(row, ['Payment Number', 'paymentNumber']);
                                                const cName = getRowVal(row, ['Customer Name', 'customerName', 'customer']);
                                                const pDate = getRowVal(row, ['Date', 'date']);
                                                const pAmount = getRowVal(row, ['Amount', 'amount']);
                                                const pDepositTo = getRowVal(row, ['Deposit To', 'depositTo']) || getRowVal(row, ['Deposit To Account Code', 'depositToAccountCode']);
                                                const pInvoice = getRowVal(row, ['Invoice Number', 'invoiceNumber']);

                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-main">{pNumber || 'Auto-generated'}</td>
                                                        <td className="p-3 text-main font-bold">{cName || <span className="text-red-500 font-bold">Missing</span>}</td>
                                                        <td className="p-3 text-main">{pDate || <span className="text-red-500">Missing</span>}</td>
                                                        <td className="p-3 text-main font-bold">${pAmount || 0}</td>
                                                        <td className="p-3 text-main">{pDepositTo || <span className="text-red-500">Missing</span>}</td>
                                                        <td className="p-3 text-main font-semibold">{pInvoice || <span className="text-dim/60">Unapplied</span>}</td>
                                                        <td className="p-3">
                                                            {hasErrors ? (
                                                                <div className="space-y-1">
                                                                    {row._rowErrors.map((err, errIdx) => (
                                                                        <div key={errIdx} className="flex items-start gap-1 text-[10px] text-red-500 font-bold leading-tight">
                                                                            <AlertTriangle className="h-3 w-3 shrink-0 text-red-500 mt-0.5" />
                                                                            <span>{err}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]">
                                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                                    <span>Ready</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button 
                                                                onClick={() => handleRemoveRow(idx)}
                                                                disabled={uploading}
                                                                className="p-1 rounded text-dim hover:text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent disabled:opacity-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {parsedRows.length > 0 && (
                    <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <div className="text-xs text-dim font-bold">
                            {validRowsCount} valid rows → <span style={{ color: 'var(--brand-lime)' }}>{uniquePaymentCount} unique payments</span> to create.
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReset}
                                disabled={uploading}
                                className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer bg-transparent text-main disabled:opacity-50"
                                style={{ borderColor: 'var(--border-main)' }}
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={uploading || validRowsCount === 0}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all border-none hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer disabled:opacity-50 disabled:scale-100"
                                style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" /> Uploading Batch...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" /> Upload {uniquePaymentCount} Unique Payment(s)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkPaymentUpload;
