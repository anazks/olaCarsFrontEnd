import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { getAllSuppliers } from '../../../services/supplierService';

interface ParsedRow {
    [key: string]: any;
    _rowErrors: string[];
    _rowWarnings?: string[];
}

interface BulkVendorPaymentUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Payment Number', 'Payment Number Prefix', 'Payment Number Suffix', 'VendorPayment ID',
    'Mode', 'Description', 'Exchange Rate', 'Amount', 'Unused Amount', 'Reference Number',
    'Currency Code', 'Branch ID', 'Bank Charges', 'Payment Status', 'Date', 'Location Name',
    'Vendor Name', 'Vendor Number', 'EmailID', 'Paid Through', 'Paid Through Account Code',
    'Tax Account', 'Bank Reference Number', 'PIPayment ID', 'Bill ID', 'Bill Amount',
    'Bill Payment Applied Date', 'Bill Date', 'Bill Number', 'Withholding Tax Amount',
    'Withholding Tax Amount (BCY)'
];

const SAMPLE_DATA = [
    {
        'Payment Number': 'PMT-00001',
        'Mode': 'Bank Transfer',
        'Amount': '1500.00',
        'Reference Number': 'REF-VP-001',
        'Payment Status': 'Completed',
        'Date': '2026-06-10',
        'Vendor Name': 'Acme Car Parts',
        'Vendor Number': 'VEND-001',
        'Paid Through': 'Cash Account',
        'Paid Through Account Code': '1020',
        'Bill Number': 'BILL-000101',
        'Bill Amount': '1500.00',
        'Location Name': 'Panama Branch',
        'Description': 'Monthly supplier payment for parts'
    },
    {
        'Payment Number': 'PMT-00002',
        'Mode': 'Cash',
        'Amount': '750.00',
        'Reference Number': 'REF-VP-002',
        'Payment Status': 'Completed',
        'Date': '2026-06-11',
        'Vendor Name': 'Panama Fleet Supplies',
        'Vendor Number': 'VEND-002',
        'Paid Through': 'Bank Account',
        'Paid Through Account Code': '1010',
        'Bill Number': 'BILL-000102',
        'Bill Amount': '750.00',
        'Location Name': 'Panama Branch',
        'Description': 'Workshop consumables payment'
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
    const dateVal = getRowVal(row, ['Date', 'date', 'Payment Date', 'paymentDate']);
    const dateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'date' || l === 'payment date';
    }) || 'Date';
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

const BulkVendorPaymentUpload = ({ isOpen, onClose, onSuccess }: BulkVendorPaymentUploadProps) => {
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
        } else {
            setAvailableSupplierNames(new Set());
            setLoadingSuppliers(false);
            setParsedRows([]);
            setFileName('');
            setResult(null);
        }
    }, [isOpen]);

    const validateRow = useCallback((row: any): { errors: string[], warnings: string[] } => {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        const amount = getRowVal(row, ['Amount', 'amount']);
        if (amount !== undefined && amount !== null && amount !== '') {
            const parsed = parseFloat(amount);
            if (isNaN(parsed) || parsed <= 0) errors.push('Amount must be greater than 0');
        } else {
            errors.push('Amount is required');
        }
        
        const date = getRowVal(row, ['Date', 'date', 'Payment Date', 'paymentDate']);
        if (date) {
            const parsed = parseFlexibleDate(date);
            if (!parsed) errors.push('Invalid Date (expected YYYY-MM-DD)');
        }

        // Supplier check
        const vendorName = getRowVal(row, ['Vendor Name', 'vendorName', 'Supplier Name', 'supplierName']);
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
                warnings.push(`Vendor '${vendorName}' not found in database (will be saved to Notes)`);
            }
        } else {
            warnings.push('No Vendor Name provided (will be saved to Notes)');
        }

        return { errors, warnings };
    }, [availableSupplierNames]);

    useEffect(() => {
        if (parsedRows.length > 0) {
            setParsedRows(prev => prev.map(row => {
                const { errors, warnings } = validateRow(row);
                return { ...row, _rowErrors: errors, _rowWarnings: warnings };
            }));
        }
    }, [availableSupplierNames, validateRow]);

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
            XLSX.utils.book_append_sheet(workbook, worksheet, "VendorPaymentsTemplate");
            XLSX.writeFile(workbook, `vendor_payments_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `vendor_payments_bulk_template.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) { toast.error('No valid rows to upload.'); return; }
        const totalRowsCount = validRows.length;
        setUploading(true); setUploadProgress(0);
        setUploadStatusText(`Uploading vendor payments (0 / ${totalRowsCount})...`);

        const CHUNK_SIZE = 50;
        const chunks: any[][] = [];
        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            chunks.push(validRows.slice(i, i + CHUNK_SIZE).map(({ _rowErrors, ...rest }) => rest));
        }

        const finalResult = { successCount: 0, errorCount: 0, errors: [] as string[], createdPayments: [] as string[] };
        try {
            let processedCount = 0;
            for (const chunk of chunks) {
                const res = await api.post('/api/payments-made/bulk-upload', { rows: chunk });
                const data = res.data?.data || res.data || {};
                finalResult.successCount += data.successCount || 0;
                finalResult.errorCount += data.errorCount || 0;
                if (data.errors) finalResult.errors.push(...data.errors);
                if (data.createdPayments) finalResult.createdPayments.push(...data.createdPayments);
                processedCount += chunk.length;
                setUploadProgress(Math.round((processedCount / totalRowsCount) * 100));
                setUploadStatusText(`Uploading vendor payments (${processedCount} / ${totalRowsCount})...`);
            }
            setResult(finalResult);
            if (finalResult.successCount > 0) {
                toast.success(`${finalResult.successCount} vendor payment(s) created.`);
                if (finalResult.errorCount === 0) onSuccess();
            } else if (finalResult.errorCount > 0) {
                toast.error(`Completed with ${finalResult.errorCount} errors.`);
            } else { toast.success('Upload complete.'); onSuccess(); }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Bulk upload failed.');
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
                            <h2 className="text-base font-black tracking-tight text-main">Vendor Payment Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch vendor payments, resolve supplier matching, and parse unmapped fields into notes.</p>
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
                                        <h3 className="text-sm font-bold text-main mb-1">Upload your vendor payments file</h3>
                                        <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                        <div className="text-[10px] text-dim/60 space-y-0.5"><p>Supports .xlsx, .xls, and .csv files.</p><p>Each row represents one vendor payment record.</p></div>
                                    </>)}
                                </div>
                            </div>
                            <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2"><FileText className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} /><h3 className="text-sm font-black text-main">Bulk Data Templates</h3></div>
                                    <p className="text-xs text-dim leading-relaxed">Use our standard template headers. Match suppliers using `Vendor Name` or `Vendor Number`.</p>
                                    <div className="bg-card/40 rounded-lg p-3 border space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between text-[10px] font-bold text-dim"><span>Key Fields:</span><span style={{ color: 'var(--brand-lime)' }}>Loose validation</span></div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Amount', 'Vendor Name', 'Mode', 'Date'].map(f => (
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
                                            <th className="p-3 font-bold">Row</th><th className="p-3 font-bold">Payment #</th><th className="p-3 font-bold">Vendor Name</th>
                                            <th className="p-3 font-bold">Amount</th><th className="p-3 font-bold">Mode</th><th className="p-3 font-bold">Date</th>
                                            <th className="p-3 font-bold">Status</th><th className="p-3 font-bold text-center">Actions</th>
                                        </tr></thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const hasWarnings = (row._rowWarnings?.length || 0) > 0;
                                                const vendorName = getRowVal(row, ['Vendor Name', 'vendorName']);
                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : hasWarnings ? 'bg-amber-500/[0.03]' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-main">{getRowVal(row, ['Payment Number', 'paymentNumber']) || 'Auto'}</td>
                                                        <td className="p-3">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-main font-bold">{vendorName || <span className="text-dim/60 italic">In notes</span>}</span>
                                                                {vendorName && (
                                                                    !hasWarnings ? (
                                                                        <span className="text-[8px] text-green-500 font-black tracking-wider uppercase">✓ Verified Vendor</span>
                                                                    ) : (
                                                                        <span className="text-[8px] text-amber-500 font-black tracking-wider uppercase">⚠️ Unresolved</span>
                                                                    )
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-main font-bold">${getRowVal(row, ['Amount', 'amount']) || 0}</td>
                                                        <td className="p-3 text-main">{getRowVal(row, ['Mode', 'mode']) || 'Other'}</td>
                                                        <td className="p-3 text-dim">{getRowVal(row, ['Date', 'date']) || 'Today'}</td>
                                                        <td className="p-3">{hasErrors ? (
                                                            <div className="space-y-1">{row._rowErrors.map((err, i) => (<div key={i} className="flex items-start gap-1 text-[10px] text-red-500 font-bold"><AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /><span>{err}</span></div>))}</div>
                                                        ) : hasWarnings ? (
                                                            <div className="space-y-1">{(row._rowWarnings || []).map((warn: string, i: number) => (<div key={i} className="flex items-start gap-1 text-[10px] text-amber-500 font-bold"><Info className="h-3 w-3 shrink-0 mt-0.5" /><span>{warn}</span></div>))}</div>
                                                        ) : (<div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]"><CheckCircle className="h-3.5 w-3.5" /><span>Ready</span></div>)}</td>
                                                        <td className="p-3 text-center"><button onClick={() => handleRemoveRow(idx)} disabled={uploading} className="p-1 rounded bg-transparent hover:bg-input text-dim hover:text-red-500 transition-colors border-none cursor-pointer disabled:opacity-50" title="Remove"><Trash2 size={14} /></button></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
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

export default BulkVendorPaymentUpload;
