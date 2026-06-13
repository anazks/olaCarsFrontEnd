import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { getAllSuppliers } from '../../../services/supplierService';
import { getAllAccountingCodes } from '../../../services/accountingService';

interface ParsedRow {
    [key: string]: any;
    _rowErrors: string[];
    _rowWarnings: string[];
    _uploadStatus?: 'pending' | 'success' | 'failed';
    _uploadError?: string;
}

interface BulkExpenseUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Expense Date', 'Expense Description', 'Expense Account', 'Expense Account Code',
    'Paid Through', 'Paid Through Account Code', 'Vendor', 'Vendor Number',
    'Location Name', 'Project Name', 'Entry Number', 'Currency Code',
    'Exchange Rate', 'Is Inclusive Tax', 'Mileage Rate', 'Mileage Type',
    'Tax Type', 'Tax Amount', 'Expense Amount', 'Total', 'Is Billable',
    'Expense Reference ID', 'Is Reimbursable'
];

const SAMPLE_DATA = [
    {
        'Expense Date': '2026-06-12',
        'Expense Description': 'Office Stationery and Supplies',
        'Expense Account': 'Office Expenses',
        'Expense Account Code': '6010',
        'Paid Through': 'Petty Cash',
        'Paid Through Account Code': '1030',
        'Vendor': 'Stationery Depot',
        'Vendor Number': 'VEND-003',
        'Location Name': 'Downtown Branch',
        'Project Name': 'Q2 Office Rebranding',
        'Entry Number': 'EXP-REF-001',
        'Currency Code': 'USD',
        'Exchange Rate': '1.0',
        'Is Inclusive Tax': 'FALSE',
        'Mileage Rate': '',
        'Mileage Type': '',
        'Tax Type': 'Standard Tax',
        'Tax Amount': '0.00',
        'Expense Amount': '150.00',
        'Total': '150.00',
        'Is Billable': 'FALSE',
        'Expense Reference ID': 'REF-EXP-9901',
        'Is Reimbursable': 'FALSE'
    },
    {
        'Expense Date': '2026-06-13',
        'Expense Description': 'Fuel for Company Vehicle',
        'Expense Account': 'Automobile Expenses',
        'Expense Account Code': '6020',
        'Paid Through': 'Main Bank Account',
        'Paid Through Account Code': '1010',
        'Vendor': 'Puma Energy',
        'Vendor Number': 'VEND-004',
        'Location Name': 'Panama Branch',
        'Project Name': 'Logistics Delivery',
        'Entry Number': 'EXP-REF-002',
        'Currency Code': 'USD',
        'Exchange Rate': '1.0',
        'Is Inclusive Tax': 'FALSE',
        'Mileage Rate': '',
        'Mileage Type': '',
        'Tax Type': 'Exempt',
        'Tax Amount': '0.00',
        'Expense Amount': '65.00',
        'Total': '65.00',
        'Is Billable': 'TRUE',
        'Expense Reference ID': 'REF-EXP-9902',
        'Is Reimbursable': 'TRUE'
    }
];

const parseFlexibleDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
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
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) return date;
    }
    const parsedDate = new Date(str);
    return !isNaN(parsedDate.getTime()) ? parsedDate : null;
};

const getRowVal = (r: any, possibleKeys: string[]): any => {
    if (!r) return undefined;
    for (const key of possibleKeys) {
        const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
        if (r[key] !== undefined) return r[key];
        for (const k of Object.keys(r)) {
            const cleanK = k.replace(/^\ufeff/, '').trim().toLowerCase();
            if (cleanK === cleanKey) return r[k];
        }
    }
    return undefined;
};

const normalizeRowDates = (row: any): any => {
    const updated = { ...row };
    const dateVal = getRowVal(row, ['Expense Date', 'expenseDate', 'Date', 'date']);
    const dateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'expense date' || l === 'date';
    }) || 'Expense Date';
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

const BulkExpenseUpload = ({ isOpen, onClose, onSuccess }: BulkExpenseUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [availableSupplierNames, setAvailableSupplierNames] = useState<Set<string>>(new Set());
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [availableAccountCodes, setAvailableAccountCodes] = useState<Set<string>>(new Set());
    const [availableAccountNames, setAvailableAccountNames] = useState<Set<string>>(new Set());
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingSuppliers(true);
            getAllSuppliers({ limit: 100000 })
                .then(res => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    const names = new Set(list.map(s => s.name?.toLowerCase().trim().replace(/\s+/g, ' ')).filter((n): n is string => !!n));
                    setAvailableSupplierNames(names);
                })
                .catch(err => console.error('Failed to load suppliers for validation', err))
                .finally(() => setLoadingSuppliers(false));

            setLoadingAccounts(true);
            getAllAccountingCodes({ limit: 100000 })
                .then(res => {
                    const list = Array.isArray(res) ? res : ((res as any).data || []);
                    const codes = new Set(list.map(a => a.code?.toLowerCase().trim()).filter((c): c is string => !!c));
                    const names = new Set(list.map(a => a.name?.toLowerCase().trim().replace(/\s+/g, ' ')).filter((n): n is string => !!n));
                    setAvailableAccountCodes(codes);
                    setAvailableAccountNames(names);
                })
                .catch(err => console.error('Failed to load accounting codes for validation', err))
                .finally(() => setLoadingAccounts(false));
        } else {
            setAvailableSupplierNames(new Set());
            setAvailableAccountCodes(new Set());
            setAvailableAccountNames(new Set());
            setLoadingSuppliers(false);
            setLoadingAccounts(false);
            setParsedRows([]);
            setFileName('');
            setResult(null);
        }
    }, [isOpen]);

    const validateRow = useCallback((row: any): { errors: string[], warnings: string[] } => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const amount = getRowVal(row, ['Expense Amount', 'expenseAmount', 'Amount', 'amount']);
        if (amount !== undefined && amount !== null && amount !== '') {
            const parsed = parseFloat(amount);
            if (isNaN(parsed) || parsed <= 0) errors.push('Expense Amount must be greater than 0');
        } else {
            errors.push('Expense Amount is required');
        }
        
        const date = getRowVal(row, ['Expense Date', 'expenseDate', 'Date', 'date']);
        if (date) {
            const parsed = parseFlexibleDate(date);
            if (!parsed) errors.push('Invalid Date (expected YYYY-MM-DD)');
        } else {
            errors.push('Expense Date is required');
        }

        // Paid Through Account Code check (required by model, so let's error if neither name nor code provided or if not found)
        const ptName = getRowVal(row, ['Paid Through', 'paidThrough']);
        const ptCode = getRowVal(row, ['Paid Through Account Code', 'paidThroughAccountCode']);
        if (!ptName && !ptCode) {
            errors.push('Paid Through Account (name or code) is required');
        } else {
            let found = false;
            if (ptCode) {
                found = availableAccountCodes.has(ptCode.toString().trim().toLowerCase());
            }
            if (!found && ptName) {
                const cleanName = ptName.toString().trim().toLowerCase().replace(/\s+/g, ' ');
                found = availableAccountNames.has(cleanName);
                if (!found) {
                    const cleanInput = cleanName.replace(/[^a-z0-9\s]/g, '').trim();
                    for (const name of availableAccountNames) {
                        const cleanDb = name.replace(/[^a-z0-9\s]/g, '').trim();
                        if (cleanDb === cleanInput || cleanDb.includes(cleanInput) || cleanInput.includes(cleanDb)) {
                            found = true;
                            break;
                        }
                    }
                }
            }
            if (!found) {
                errors.push(`Paid Through Account '${ptCode || ptName}' not found in database`);
            }
        }

        // Expense Account Code check
        const expName = getRowVal(row, ['Expense Account', 'expenseAccount']);
        const expCode = getRowVal(row, ['Expense Account Code', 'expenseAccountCode']);
        if (!expName && !expCode) {
            errors.push('Expense Account (name or code) is required');
        } else {
            let found = false;
            if (expCode) {
                found = availableAccountCodes.has(expCode.toString().trim().toLowerCase());
            }
            if (!found && expName) {
                const cleanName = expName.toString().trim().toLowerCase().replace(/\s+/g, ' ');
                found = availableAccountNames.has(cleanName);
                if (!found) {
                    const cleanInput = cleanName.replace(/[^a-z0-9\s]/g, '').trim();
                    for (const name of availableAccountNames) {
                        const cleanDb = name.replace(/[^a-z0-9\s]/g, '').trim();
                        if (cleanDb === cleanInput || cleanDb.includes(cleanInput) || cleanInput.includes(cleanDb)) {
                            found = true;
                            break;
                        }
                    }
                }
            }
            if (!found) {
                errors.push(`Expense Account '${expCode || expName}' not found in database`);
            }
        }

        // Location Check
        const locationName = getRowVal(row, ['Location Name', 'locationName', 'Location', 'location']);
        if (!locationName) {
            warnings.push('Location Name is missing (will default to first available BRANCH)');
        }

        // Supplier check (optional - missing vendor name/number is allowed, but warning if provided but not in DB)
        const vendorName = getRowVal(row, ['Vendor', 'vendor', 'Vendor Name', 'vendorName']);
        const vendorNumber = getRowVal(row, ['Vendor Number', 'vendorNumber', 'Supplier Number', 'supplierNumber']);
        if (vendorName) {
            const cleanName = vendorName.toString().trim().toLowerCase().replace(/\s+/g, ' ');
            let found = availableSupplierNames.has(cleanName);
            if (!found) {
                const cleanInput = cleanName.replace(/[^a-z0-9\s]/g, '').trim();
                for (const name of availableSupplierNames) {
                    const cleanDb = name.replace(/[^a-z0-9\s]/g, '').trim();
                    if (cleanDb === cleanInput || cleanDb.includes(cleanInput) || cleanInput.includes(cleanDb)) {
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                warnings.push(`Vendor '${vendorName}' not found in database (will be saved to notes)`);
            }
        } else if (vendorNumber) {
            warnings.push(`Vendor number '${vendorNumber}' provided without matching vendor name (will try resolving by number or save to notes)`);
        }

        return { errors, warnings };
    }, [availableSupplierNames, availableAccountCodes, availableAccountNames]);

    useEffect(() => {
        if (parsedRows.length > 0) {
            setParsedRows(prev => prev.map(row => {
                const { errors, warnings } = validateRow(row);
                return { ...row, _rowErrors: errors, _rowWarnings: warnings };
            }));
        }
    }, [availableSupplierNames, availableAccountCodes, availableAccountNames, validateRow]);

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
                    const rows: ParsedRow[] = (jsonData as any[]).map(row => {
                        const trimmedRow: any = {};
                        for (const key of Object.keys(row)) trimmedRow[key.trim()] = row[key];
                        const normalized = normalizeRowDates(trimmedRow);
                        const { errors, warnings } = validateRow(normalized);
                        return { ...normalized, _rowErrors: errors, _rowWarnings: warnings };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                } catch { toast.error('Failed to parse Excel file.'); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    const rows: ParsedRow[] = (results.data as any[]).map(row => {
                        const normalized = normalizeRowDates(row);
                        const { errors, warnings } = validateRow(normalized);
                        return { ...normalized, _rowErrors: errors, _rowWarnings: warnings };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                },
                error: (err: any) => toast.error(`Failed to parse: ${err.message}`)
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) parseFile(file); };
    const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) parseFile(file); };

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ExpensesTemplate");
            XLSX.writeFile(workbook, `expenses_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `expenses_bulk_template.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const downloadFailedRows = (failedList: ParsedRow[]) => {
        if (failedList.length === 0) return;
        
        const exportData = failedList.map(row => {
            const cleanRow: any = {};
            for (const key of Object.keys(row)) {
                if (!key.startsWith('_')) {
                    cleanRow[key] = row[key];
                }
            }
            cleanRow['Upload Error'] = row._uploadError || row._rowErrors?.join(', ') || 'Unknown error';
            return cleanRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "FailedExpenses");
        XLSX.writeFile(workbook, `failed_expenses_${Date.now()}.xlsx`);
    };

    const handleSubmit = async () => {
        const updatedRows = parsedRows.map(r => ({
            ...r,
            _uploadStatus: (r._rowErrors && r._rowErrors.length > 0) ? 'failed' as const : 'pending' as const,
            _uploadError: (r._rowErrors && r._rowErrors.length > 0) ? r._rowErrors.join(', ') : ''
        }));

        const validRowsWithIndices = updatedRows
            .map((row, index) => ({ row, index }))
            .filter(item => item.row._uploadStatus !== 'failed');

        if (validRowsWithIndices.length === 0) {
            toast.error('No valid rows to upload.');
            const allFailed = updatedRows.filter(r => r._uploadStatus === 'failed');
            if (allFailed.length > 0) {
                downloadFailedRows(allFailed);
            }
            return;
        }

        const totalRowsCount = validRowsWithIndices.length;
        setUploading(true); setUploadProgress(0);
        setUploadStatusText(`Uploading expenses (0 / ${totalRowsCount})...`);

        const CHUNK_SIZE = 50;
        const chunks: { row: any; index: number }[][] = [];
        for (let i = 0; i < validRowsWithIndices.length; i += CHUNK_SIZE) {
            chunks.push(validRowsWithIndices.slice(i, i + CHUNK_SIZE));
        }

        try {
            let processedCount = 0;
            for (const chunk of chunks) {
                const payloadRows = chunk.map(item => {
                    const { _rowErrors, _rowWarnings, _uploadStatus, _uploadError, ...rest } = item.row;
                    return rest;
                });

                const res = await api.post('/api/expenses/bulk-upload', { rows: payloadRows });
                const data = res.data?.data || res.data || {};

                // Default success for chunk
                chunk.forEach(item => {
                    updatedRows[item.index]._uploadStatus = 'success';
                });

                // Resolve errors relative to chunk
                if (data.errors && Array.isArray(data.errors)) {
                    data.errors.forEach((errStr: string) => {
                        const match = errStr.match(/Row (\d+):\s*(.*)/i);
                        if (match) {
                            const oneBasedIdx = parseInt(match[1], 10);
                            const idxInChunk = oneBasedIdx - 1;
                            if (idxInChunk >= 0 && idxInChunk < chunk.length) {
                                const targetIndex = chunk[idxInChunk].index;
                                updatedRows[targetIndex]._uploadStatus = 'failed';
                                updatedRows[targetIndex]._uploadError = match[2];
                            }
                        }
                    });
                }

                processedCount += chunk.length;
                setUploadProgress(Math.round((processedCount / totalRowsCount) * 100));
                setUploadStatusText(`Uploading expenses (${processedCount} / ${totalRowsCount})...`);
            }

            setParsedRows(updatedRows);
            const successCount = updatedRows.filter(r => r._uploadStatus === 'success').length;
            const failedCount = updatedRows.filter(r => r._uploadStatus === 'failed').length;

            const finalResult = {
                successCount,
                errorCount: failedCount,
                errors: updatedRows.filter(r => r._uploadStatus === 'failed').map(r => r._uploadError || 'Unknown error')
            };
            setResult(finalResult);

            if (successCount > 0) {
                toast.success(`${successCount} expense(s) created.`);
                if (failedCount === 0) onSuccess();
            } else if (failedCount > 0) {
                toast.error(`Completed with ${failedCount} errors.`);
            }

            const allFailedRows = updatedRows.filter(r => r._uploadStatus === 'failed');
            if (allFailedRows.length > 0) {
                toast.error(`Auto-downloading ${allFailedRows.length} failed rows for review.`);
                downloadFailedRows(allFailedRows);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Bulk upload failed.');
            // Mark any pending row as failed
            updatedRows.forEach(row => {
                if (row._uploadStatus === 'pending') {
                    row._uploadStatus = 'failed';
                    row._uploadError = 'Connection failed or interrupted during upload';
                }
            });
            setParsedRows(updatedRows);
            const allFailedRows = updatedRows.filter(r => r._uploadStatus === 'failed');
            if (allFailedRows.length > 0) {
                downloadFailedRows(allFailedRows);
            }
        } finally { setUploading(false); setUploadProgress(100); setUploadStatusText(''); }
    };

    const handleReset = () => { setParsedRows([]); setFileName(''); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handleRemoveRow = (index: number) => { setParsedRows(prev => prev.filter((_, i) => i !== index)); };

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
                            <h2 className="text-base font-black tracking-tight text-main">Expense Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch expenses, resolve account codes and suppliers, and automatically dump unaligned columns into Notes.</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={uploading} className="p-1.5 rounded-lg transition-colors hover:bg-input text-dim hover:text-main border-none bg-transparent cursor-pointer disabled:opacity-50">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {parsedRows.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer min-h-[260px] ${dragOver ? 'border-brand-lime bg-lime-500/5' : 'border-border bg-card hover:bg-input/30'}`}
                                    onClick={() => fileInputRef.current?.click()} style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)' }}>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv,.xlsx,.xls" className="hidden" />
                                    {loadingSuppliers ? (
                                        <div className="space-y-3"><Loader2 className="h-10 w-10 animate-spin text-main mx-auto" /><p className="text-xs font-bold text-main">Caching supplier registry...</p></div>
                                    ) : (<>
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}><Upload className="h-6 w-6" style={{ color: 'var(--brand-lime)' }} /></div>
                                        <h3 className="text-sm font-bold text-main mb-1">Upload your expenses bulk file</h3>
                                        <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                        <div className="text-[10px] text-dim/60 space-y-0.5"><p>Supports .xlsx, .xls, and .csv files.</p><p>Each row represents one expense record.</p></div>
                                    </>)}
                                </div>
                            </div>
                            <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2"><FileText className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} /><h3 className="text-sm font-black text-main">Bulk Data Templates</h3></div>
                                    <p className="text-xs text-dim leading-relaxed">Download our pre-structured templates to prepare your file. Unmapped fields will be wrapped and stored in Notes.</p>
                                    <div className="bg-card/40 rounded-lg p-3 border space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between text-[10px] font-bold text-dim"><span>Key Fields:</span><span style={{ color: 'var(--brand-lime)' }}>Strict validation</span></div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Expense Amount', 'Expense Date', 'Expense Account', 'Paid Through', 'Location Name'].map(f => (
                                                <span key={f} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>{f}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <button onClick={() => downloadTemplate('xlsx')} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                        <Download className="h-4 w-4" /> Download Excel Template
                                    </button>
                                    <button onClick={() => downloadTemplate('csv')} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                        <Download className="h-4 w-4" /> Download CSV Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                    <span className="text-dim">File: <strong className="text-main">{fileName}</strong></span>
                                    <span className="text-dim">Total Rows: <strong className="text-main">{parsedRows.length}</strong></span>
                                    <span className="text-green-500">Valid: {validRowsCount}</span>
                                    {errorRowsCount > 0 && <span className="text-red-500">Errors: {errorRowsCount}</span>}
                                </div>
                                <button onClick={handleReset} disabled={uploading} className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer transition-colors bg-transparent text-main" style={{ borderColor: 'var(--border-main)' }}>Clear and Restart</button>
                            </div>

                            {result && (
                                <div className="rounded-xl border p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-sm"><CheckCircle className="h-5 w-5" /><span>Upload Completed!</span></div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}><p className="text-lg font-black text-green-500">{result.successCount}</p><p className="text-[9px] uppercase tracking-wider text-dim">Created</p></div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}><p className="text-lg font-black text-red-500">{result.errorCount}</p><p className="text-[9px] uppercase tracking-wider text-dim">Failed</p></div>
                                    </div>
                                    {result.errors.length > 0 && (
                                        <div className="mt-3 p-3 rounded-lg bg-input border space-y-2 max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                            {result.errors.map((err: string, idx: number) => (
                                                <div key={idx} className="text-[10px] text-red-500 flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3 w-3 shrink-0" /><span>{err}</span></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {uploading && (
                                <div className="space-y-2 p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-xs font-bold"><span className="text-main">{uploadStatusText}</span><span style={{ color: 'var(--brand-lime)' }}>{uploadProgress}%</span></div>
                                    <div className="w-full h-2 rounded-full overflow-hidden bg-input"><div className="h-full rounded-full transition-all duration-300" style={{ backgroundColor: 'var(--brand-lime)', width: `${uploadProgress}%` }} /></div>
                                </div>
                            )}

                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead><tr className="border-b" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                            <th className="p-3 font-bold">Row</th>
                                            <th className="p-3 font-bold">Date</th>
                                            <th className="p-3 font-bold">Expense Account</th>
                                            <th className="p-3 font-bold">Paid Through</th>
                                            <th className="p-3 font-bold">Amount</th>
                                            <th className="p-3 font-bold">Vendor Name</th>
                                            <th className="p-3 font-bold">Status</th>
                                            <th className="p-3 font-bold text-center">Actions</th>
                                        </tr></thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const isUploaded = row._uploadStatus === 'success';
                                                const isFailed = row._uploadStatus === 'failed';
                                                const hasErrors = row._rowErrors.length > 0 || isFailed;
                                                const hasWarnings = row._rowWarnings?.length > 0;
                                                const vendorName = getRowVal(row, ['Vendor', 'vendor', 'Vendor Name', 'vendorName']);
                                                const expenseAcc = getRowVal(row, ['Expense Account', 'expenseAccount']) || getRowVal(row, ['Expense Account Code', 'expenseAccountCode']);
                                                const paidThrough = getRowVal(row, ['Paid Through', 'paidThrough']) || getRowVal(row, ['Paid Through Account Code', 'paidThroughAccountCode']);
                                                const amount = getRowVal(row, ['Expense Amount', 'expenseAmount', 'Amount', 'amount']);
                                                const expenseDate = getRowVal(row, ['Expense Date', 'expenseDate', 'Date', 'date']);
                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${isUploaded ? 'bg-green-500/[0.02]' : isFailed ? 'bg-red-500/5' : hasErrors ? 'bg-red-500/5' : hasWarnings ? 'bg-amber-500/[0.03]' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 text-main">{expenseDate || 'Missing'}</td>
                                                        <td className="p-3 font-semibold text-main">{expenseAcc || 'Missing'}</td>
                                                        <td className="p-3 text-main">{paidThrough || 'Missing'}</td>
                                                        <td className="p-3 text-main font-bold">${amount || 0}</td>
                                                        <td className="p-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-main font-bold">{vendorName || <span className="text-dim/60 italic">None (Optional)</span>}</span>
                                                                {vendorName && (
                                                                    !hasWarnings ? (
                                                                        <span className="text-[8px] text-green-500 font-black tracking-wider uppercase">✓ Verified Vendor</span>
                                                                    ) : (
                                                                        <span className="text-[8px] text-amber-500 font-black tracking-wider uppercase">⚠️ Unresolved (Will save to notes)</span>
                                                                    )
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                            {isUploaded ? (
                                                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]"><CheckCircle className="h-3.5 w-3.5" /><span>Uploaded</span></div>
                                                            ) : isFailed ? (
                                                                <div className="flex items-start gap-1 text-[10px] text-red-500 font-bold"><AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /><span>{row._uploadError || 'Upload failed'}</span></div>
                                                            ) : row._rowErrors.length > 0 ? (
                                                                <div className="space-y-1">{row._rowErrors.map((err, i) => (<div key={i} className="flex items-start gap-1 text-[10px] text-red-500 font-bold"><AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /><span>{err}</span></div>))}</div>
                                                            ) : hasWarnings ? (
                                                                <div className="space-y-1">{row._rowWarnings.map((warn, i) => (<div key={i} className="flex items-start gap-1 text-[10px] text-amber-500 font-bold"><Info className="h-3 w-3 shrink-0 mt-0.5" /><span>{warn}</span></div>))}</div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]"><CheckCircle className="h-3.5 w-3.5" /><span>Ready</span></div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center"><button onClick={() => handleRemoveRow(idx)} disabled={uploading} className="p-1 rounded bg-transparent hover:bg-input text-dim hover:text-red-500 transition-colors border-none cursor-pointer disabled:opacity-50" title="Remove"><Trash2 size={14} /></button></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                {result && result.errorCount > 0 && (
                                    <button
                                        onClick={() => {
                                            const failedList = parsedRows.filter(r => r._uploadStatus === 'failed');
                                            downloadFailedRows(failedList);
                                        }}
                                        className="px-4 py-2 rounded-lg text-xs font-bold border hover:scale-[1.01] active:scale-95 transition-all cursor-pointer bg-red-500/10 text-red-500"
                                        style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                    >
                                        Download Failed Rows
                                    </button>
                                )}
                                <button onClick={result ? onClose : handleReset} disabled={uploading} className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer bg-transparent text-main" style={{ borderColor: 'var(--border-main)' }}>{result ? 'Close' : 'Cancel'}</button>
                                {!result && (
                                    <button onClick={handleSubmit} disabled={uploading || parsedRows.length === 0 || errorRowsCount > 0} className="px-6 py-2 rounded-lg text-xs font-bold transition-all text-black hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:scale-100" style={{ background: 'var(--brand-lime)' }}>
                                        {uploading ? (<span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Importing...</span>) : `Submit ${validRowsCount} Record(s)`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkExpenseUpload;
