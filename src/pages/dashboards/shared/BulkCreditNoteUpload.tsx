import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadCreditNotes } from '../../../services/creditNoteService';
import { getAllCustomers } from '../../../services/customerService';

interface ParsedCreditNoteRow {
    [key: string]: any;
    _rowErrors: string[];
}

interface BulkCreditNoteUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Credit Note Date', 'Issued Date', 'Transaction Posting Date', 'Product ID', 'CreditNotes ID',
    'Credit Note Number', 'Credit Note Status', 'Accounts Receivable', 'Customer Name', 'Customer Number',
    'Billing Attention', 'Billing Address', 'Billing Street 2', 'Billing City', 'Billing State',
    'Billing Country', 'Billing Code', 'Billing Phone', 'Billing Fax', 'Shipping Attention',
    'Shipping Address', 'Shipping Street 2', 'Shipping City', 'Shipping State', 'Shipping Country',
    'Shipping Phone', 'Shipping Code', 'Shipping Fax', 'Customer ID', 'Currency Code', 'Exchange Rate',
    'Is Inclusive Tax', 'Total', 'Balance', 'Entity Discount Percent', 'Notes', 'Terms & Conditions',
    'Reference#', 'Shipping Charge', 'Shipping Charge Tax ID', 'Shipping Charge Tax Amount',
    'Shipping Charge Tax Name', 'Shipping Charge Tax %', 'Shipping Charge Tax Type',
    'Shipping Charge Account', 'Adjustment', 'Adjustment Account', 'Branch ID', 'Is Discount Before Tax',
    'Item Name', 'Discount', 'Discount Amount', 'Quantity', 'Item Desc', 'Item Tax Amount',
    'Item Total', 'Applied Invoice Number', 'Location Name', 'Project ID', 'Project Name',
    'Tax1 ID', 'Item Tax', 'Item Tax %', 'Item Tax Type', 'Sales person', 'Discount Type',
    'SubTotal', 'Round Off', 'Adjustment Description', 'Subject', 'Template Name', 'Usage unit',
    'Item Price', 'Account', 'Account Code', 'SKU', 'UPC', 'MPN', 'EAN', 'ISBN', 'p',
    'Entity Discount Amount', 'Line Item Location Name', 'Kit Combo Item Name',
    'CF.STAFF NAME', 'CF.CUFE', 'CF.Protocolo de autorización', 'CF.Fecha de autorización'
];

const SAMPLE_DATA = [
    {
        'Credit Note Date': '2026-06-02',
        'Issued Date': '2026-06-02',
        'Credit Note Number': 'CN-000101',
        'Customer Name': 'John Smith',
        'Customer Number': '+254700000001',
        'Total': '150.00',
        'Balance': '150.00',
        'Notes': 'Vehicle downtime credit adjustment',
        'Subject': 'Vehicle Downtime Adjustment',
        'Item Tax %': '7',
        'Item Tax Amount': '10.50',
        'Item Tax': 'ITBMS 7%',
        'Item Tax Type': 'Taxable',
        'Applied Invoice Number': 'INV-000101, INV-000102',
        'CF.STAFF NAME': 'Alice Vance',
        'CF.CUFE': 'CUFE-12345-OLA',
        'CF.Protocolo de autorización': 'PROT-OLA-99',
        'CF.Fecha de autorización': '2026-06-02'
    },
    {
        'Credit Note Date': '2026-06-03',
        'Issued Date': '2026-06-03',
        'Credit Note Number': 'CN-000102',
        'Customer Name': 'Maria Garcia',
        'Customer Number': '+254711223344',
        'Total': '80.00',
        'Balance': '80.00',
        'Notes': 'Administrative overcharge reversal',
        'Subject': 'Overcharge Reversal',
        'Item Tax %': '0',
        'Item Tax Amount': '0.00',
        'Item Tax': '',
        'Item Tax Type': 'Non-Taxable',
        'Applied Invoice Number': '',
        'CF.STAFF NAME': 'Bob Vance',
        'CF.CUFE': '',
        'CF.Protocolo de autorización': '',
        'CF.Fecha de autorización': ''
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
    
    const dateVal = getRowVal(row, ['Credit Note Date', 'creditNoteDate', 'Issued Date', 'issuedDate', 'Date', 'date']);
    const dateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'credit note date' || l === 'issued date' || l === 'date';
    }) || 'Credit Note Date';
    
    if (dateVal) {
        const parsed = parseFlexibleDate(dateVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[dateKey] = `${yyyy}-${mm}-${dd}`;
        }
    }

    return updated;
};

const BulkCreditNoteUpload = ({ isOpen, onClose, onSuccess }: BulkCreditNoteUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedCreditNoteRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [availableCustomerNames, setAvailableCustomerNames] = useState<Set<string>>(new Set());
    const [availableCustomerIds, setAvailableCustomerIds] = useState<Set<string>>(new Set());
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [verifiedInvoices, setVerifiedInvoices] = useState<Map<string, { exists: boolean, customerId?: string, customerName?: string }>>(new Map());
    const [verifyingInvoices, setVerifyingInvoices] = useState(false);

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
                    console.log(`[BulkCreditNoteUpload] Loaded ${names.size} customers for verification.`);
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
            setVerifiedInvoices(new Map());
            setParsedRows([]);
            setFileName('');
            setResult(null);
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
            errors.push('Customer Name is required (identified by Customer Name in excel field)');
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

        // 2. Validate Amount (Total, Balance, or Subtotal)
        const amount = getRowVal(row, ['Total', 'total', 'Amount', 'amount', 'SubTotal', 'subtotal', 'Balance', 'balance', 'Item Total', 'itemTotal']);
        if (amount === undefined || amount === null || amount === '') {
            errors.push('Total Credit Note Amount is required');
        } else {
            const parsedAmount = parseFloat(amount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                errors.push('Amount must be greater than or equal to 0');
            }
        }

        // 3. Validate Date
        const date = getRowVal(row, ['Credit Note Date', 'creditNoteDate', 'Issued Date', 'issuedDate', 'Date', 'date']);
        if (!date) {
            errors.push('Credit Note Date or Issued Date is required');
        } else {
            const parsed = parseFlexibleDate(date);
            if (!parsed) {
                errors.push('Invalid Date (expected YYYY-MM-DD or DD-MM-YYYY)');
            }
        }

        // 4. Validate Applied Invoices (no validation block, handled as fallback on backend)
        
        return errors;
    }, [availableCustomerNames, availableCustomerIds, verifiedInvoices]);

    // Asynchronously verify parsed invoice numbers against database
    useEffect(() => {
        if (parsedRows.length === 0) return;

        const uniqueTokens = new Set<string>();
        parsedRows.forEach(row => {
            const rawInvNumbers = getRowVal(row, ['Applied Invoice Number', 'appliedInvoiceNumber', 'Invoice Number', 'invoiceNumber']) || '';
            if (rawInvNumbers) {
                const tokens = rawInvNumbers.toString().split(',').map((s: string) => s.trim()).filter(Boolean);
                tokens.forEach((t: string) => uniqueTokens.add(t));
            }
        });

        if (uniqueTokens.size === 0) return;

        const tokensToVerify = Array.from(uniqueTokens).filter(t => !verifiedInvoices.has(t.toLowerCase()));
        if (tokensToVerify.length === 0) return;

        const verifyInvoicesAsync = async () => {
            setVerifyingInvoices(true);
            const { getInvoices } = await import('../../../services/invoiceService');

            const newVerifications = new Map<string, { exists: boolean, customerId?: string, customerName?: string }>();
            const CONCURRENCY = 5;
            for (let i = 0; i < tokensToVerify.length; i += CONCURRENCY) {
                const chunk = tokensToVerify.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (token) => {
                    try {
                        const res = await getInvoices({ search: token, limit: 10 });
                        const matchedInvoice = res.data?.find((inv: any) => {
                            const dbNum = (inv.invoiceNumber || '').trim().toLowerCase();
                            const queryNum = token.trim().toLowerCase();
                            return dbNum === queryNum || dbNum.includes(queryNum) || queryNum.includes(dbNum);
                        });

                        if (matchedInvoice) {
                            const custId = matchedInvoice.customer?._id || matchedInvoice.customer;
                            newVerifications.set(token.toLowerCase(), {
                                exists: true,
                                customerId: custId?.toString(),
                                customerName: matchedInvoice.customer?.name
                            });
                        } else {
                            newVerifications.set(token.toLowerCase(), { exists: false });
                        }
                    } catch (err) {
                        console.error(`Error verifying invoice ${token}:`, err);
                        newVerifications.set(token.toLowerCase(), { exists: false });
                    }
                }));
            }

            setVerifiedInvoices(prev => {
                const updated = new Map(prev);
                newVerifications.forEach((val, key) => {
                    updated.set(key, val);
                });
                return updated;
            });
            setVerifyingInvoices(false);
        };

        verifyInvoicesAsync();
    }, [parsedRows]);

    useEffect(() => {
        if (parsedRows.length > 0) {
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [availableCustomerNames, availableCustomerIds, verifiedInvoices, validateRow]);

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
                    
                    const rows: ParsedCreditNoteRow[] = (jsonData as any[]).map(row => {
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
                    const rows: ParsedCreditNoteRow[] = (results.data as any[]).map(row => {
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "CreditNotesTemplate");
            XLSX.writeFile(workbook, `credit_notes_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `credit_notes_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        const totalRowsCount = validRows.length;
        setUploading(true);
        setUploadProgress(0);
        setUploadStatusText(`Uploading credit notes (0 / ${totalRowsCount})...`);

        const CHUNK_SIZE = 20; // Process 20 credit notes at a time
        const chunks: any[][] = [];
        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const chunk = validRows.slice(i, i + CHUNK_SIZE).map(({ _rowErrors, ...rest }) => rest);
            chunks.push(chunk);
        }

        const finalResult = {
            successCount: 0,
            errorCount: 0,
            skippedCount: 0,
            errors: [] as string[],
            skipped: [] as string[],
            createdNotes: [] as string[]
        };

        try {
            let processedRowsCount = 0;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunk = chunks[chunkIdx];
                const res = await bulkUploadCreditNotes({ rows: chunk });
                
                finalResult.successCount += res.successCount || 0;
                finalResult.errorCount += res.errorCount || 0;
                finalResult.skippedCount += res.skippedCount || 0;
                if (res.errors) finalResult.errors.push(...res.errors);
                if (res.skipped) finalResult.skipped.push(...res.skipped);
                if (res.createdNotes) finalResult.createdNotes.push(...res.createdNotes);

                processedRowsCount += chunk.length;
                setUploadProgress(Math.round((processedRowsCount / totalRowsCount) * 100));
                setUploadStatusText(`Uploading credit notes (${processedRowsCount} / ${totalRowsCount})...`);
            }

            setResult(finalResult);

            if (finalResult.successCount > 0) {
                toast.success(`${finalResult.successCount} credit notes uploaded successfully.`);
                if (finalResult.skippedCount > 0) {
                    toast(`${finalResult.skippedCount} duplicate credit notes skipped.`, { icon: 'ℹ️', duration: 4000 });
                }
                onSuccess();
            } else if (finalResult.skippedCount > 0) {
                toast(`All ${finalResult.skippedCount} duplicate credit notes were skipped.`, { icon: 'ℹ️', duration: 4000 });
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl animate-scale-up"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                        <div>
                            <h2 className="text-base font-black tracking-tight text-main">Credit Note Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch credit note adjustments, match customer profiles, apply credit offsets to invoices, and update double-entry journals.</p>
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
                                            <h3 className="text-sm font-bold text-main mb-1">Upload your bulk credit notes file</h3>
                                            <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                            <div className="text-[10px] text-dim/60 space-y-0.5">
                                                <p>Supports .xlsx, .xls, and .csv files.</p>
                                                <p>Groups and resolves invoice applications sequentially for multi-invoice items.</p>
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
                                        Please use our standard template headers. Linking customer is **mandatory** and identified by `Customer Name` in the Excel field.
                                    </p>
                                    <div className="bg-card/40 rounded-lg p-3 border space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between text-[10px] font-bold text-dim">
                                            <span>Required Fields:</span>
                                            <span style={{ color: 'var(--brand-lime)' }}>Strict validation</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Customer Name', 'Total', 'Credit Note Date'].map(f => (
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
                                    {errorRowsCount > 0 && <span className="text-red-500">Errors: {errorRowsCount}</span>}
                                    {verifyingInvoices && (
                                        <span className="text-blue-500 flex items-center gap-1.5 animate-pulse">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Verifying invoice numbers...
                                        </span>
                                    )}
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
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Created Credit Notes</p>
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
                                                <th className="p-3 font-bold">CN Number</th>
                                                <th className="p-3 font-bold">Customer Name</th>
                                                <th className="p-3 font-bold">Date</th>
                                                <th className="p-3 font-bold">Amount</th>
                                                <th className="p-3 font-bold">Applied Invoices</th>
                                                <th className="p-3 font-bold">Validation Status</th>
                                                <th className="p-3 font-bold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const cnNumber = getRowVal(row, ['Credit Note Number', 'creditNoteNumber', 'CreditNotes ID', 'creditNotesId']);
                                                const cName = getRowVal(row, ['Customer Name', 'customerName', 'customer']);
                                                const cnDate = getRowVal(row, ['Credit Note Date', 'creditNoteDate', 'Issued Date', 'issuedDate', 'Date', 'date']);
                                                const cnAmount = getRowVal(row, ['Total', 'total', 'Amount', 'amount', 'SubTotal', 'subtotal', 'Balance', 'balance', 'Item Total', 'itemTotal']);
                                                const appliedInvoices = getRowVal(row, ['Applied Invoice Number', 'appliedInvoiceNumber', 'Invoice Number', 'invoiceNumber']);

                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-main">{cnNumber || 'Auto-generated'}</td>
                                                        <td className="p-3 text-main font-bold">{cName || <span className="text-red-500 font-bold">Missing</span>}</td>
                                                        <td className="p-3 text-main">{cnDate || <span className="text-red-500">Missing</span>}</td>
                                                        <td className="p-3 text-main font-bold">${cnAmount || 0}</td>
                                                         <td className="p-3 text-main font-semibold">
                                                             {appliedInvoices ? (
                                                                 <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                                     {appliedInvoices.toString().split(',').map((s: string) => s.trim()).filter(Boolean).map((token: string, tIdx: number) => {
                                                                         const cached = verifiedInvoices.get(token.toLowerCase());
                                                                         if (cached) {
                                                                             if (cached.exists) {
                                                                                 return (
                                                                                     <span key={tIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/25">
                                                                                         {token}
                                                                                     </span>
                                                                                 );
                                                                             } else {
                                                                                 return (
                                                                                     <span key={tIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20" title="Not found in database - will remain as fallback text notes">
                                                                                         {token}
                                                                                     </span>
                                                                                 );
                                                                             }
                                                                         }
                                                                         return (
                                                                             <span key={tIdx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/5 text-blue-400 border border-blue-500/10 animate-pulse">
                                                                                 {token}
                                                                             </span>
                                                                        );
                                                                     })}
                                                                 </div>
                                                             ) : (
                                                                 <span className="text-dim/60">General Open Pool</span>
                                                             )}
                                                         </td>
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
                            {validRowsCount} valid credit notes to upload.
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
                                        <Upload className="h-4 w-4" /> Upload {validRowsCount} Credit Note(s)
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

export default BulkCreditNoteUpload;
