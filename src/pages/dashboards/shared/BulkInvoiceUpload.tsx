import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadInvoices } from '../../../services/invoiceService';
import { getAllDrivers } from '../../../services/driverService';

interface ParsedInvoiceRow {
    fullName: string;
    amount: string | number;
    amountPaid?: string | number;
    dueDate?: string;
    description?: string;
    notes?: string;
    weekLabel?: string;
    _rowErrors: string[];
}

interface BulkInvoiceUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = ['fullName', 'amount', 'amountPaid', 'dueDate', 'weekLabel', 'description', 'notes'];

const SAMPLE_DATA = [
    { fullName: 'John Smith', amount: '180', amountPaid: '180', dueDate: '2026-06-15', weekLabel: 'Week 24', description: 'Weekly Rent', notes: 'Paid in full' },
    { fullName: 'Maria Garcia', amount: '200', amountPaid: '100', dueDate: '2026-06-20', weekLabel: '', description: 'Service charge', notes: 'Partial payment' }
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

    // Match DD-MM-YYYY or DD/MM/YYYY
    const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }

    // Try standard JS Date parsing
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }

    return null;
};

const normalizeRowDates = (row: any): any => {
    const updated = { ...row };
    if (updated.dueDate) {
        const parsed = parseFlexibleDate(updated.dueDate);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated.dueDate = `${yyyy}-${mm}-${dd}`;
        }
    }
    return updated;
};

const BulkInvoiceUpload = ({ isOpen, onClose, onSuccess }: BulkInvoiceUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [invoiceType, setInvoiceType] = useState<'RENTAL' | 'WORKSHOP' | 'DEPOSIT'>('RENTAL');
    const [parsedRows, setParsedRows] = useState<ParsedInvoiceRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [availableDriverNames, setAvailableDriverNames] = useState<Set<string>>(new Set());
    const [loadingDrivers, setLoadingDrivers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingDrivers(true);
            getAllDrivers({ limit: 1000 })
                .then(res => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    const names = new Set(list.map(d => d.personalInfo?.fullName?.toLowerCase().trim()).filter(Boolean));
                    setAvailableDriverNames(names);
                })
                .catch(err => {
                    console.error('Failed to load driver names for validation', err);
                })
                .finally(() => {
                    setLoadingDrivers(false);
                });
        } else {
            setAvailableDriverNames(new Set());
            setLoadingDrivers(false);
        }
    }, [isOpen]);

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        const name = row.fullName?.toString().trim();
        if (!name) {
            errors.push('Missing fullName');
        } else if (availableDriverNames.size > 0 && !availableDriverNames.has(name.toLowerCase())) {
            errors.push(`Driver "${name}" not found`);
        }
        
        const amt = Number(row.amount);
        if (isNaN(amt) || amt < 0) errors.push('Invalid amount');

        if (row.amountPaid) {
            const paid = Number(row.amountPaid);
            if (isNaN(paid) || paid < 0) errors.push('Invalid amountPaid');
        }

        if (row.dueDate) {
            const parsed = parseFlexibleDate(row.dueDate);
            if (!parsed) {
                errors.push('Invalid dueDate (expected DD-MM-YYYY or YYYY-MM-DD)');
            }
        }
        
        return errors;
    }, [availableDriverNames]);

    // Re-validate rows when driver names load
    useEffect(() => {
        if (parsedRows.length > 0 && availableDriverNames.size > 0) {
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [availableDriverNames, validateRow]);

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
                    
                    const rows: ParsedInvoiceRow[] = (jsonData as any[]).map(row => {
                        const normalized = normalizeRowDates(row);
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
                    const rows: ParsedInvoiceRow[] = (results.data as any[]).map(row => {
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
            XLSX.writeFile(workbook, `invoice_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        setUploading(true);
        try {
            const payload = validRows.map(({ _rowErrors, ...rest }) => rest);
            const res = await bulkUploadInvoices({ rows: payload, invoiceType });
            setResult(res);
            if (res.errorCount > 0) {
                toast.error(`Completed with ${res.errorCount} errors.`);
            } else {
                toast.success(`${res.successCount} invoices created successfully.`);
            }
            if (res.successCount > 0) {
                onSuccess();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
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

    const handleRemoveInvalid = () => {
        setParsedRows(prev => prev.filter(row => row._rowErrors.length === 0));
        toast.success('Removed all invalid rows');
    };

    if (!isOpen) return null;

    const validCount = parsedRows.filter(r => r._rowErrors.length === 0).length;
    const errorCount = parsedRows.filter(r => r._rowErrors.length > 0).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                            <FileText size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Bulk Invoice Upload</h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Upload CSV or XLSX to generate multiple invoices</p>
                        </div>
                    </div>
                    <button onClick={() => { handleReset(); onClose(); }} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-dim uppercase tracking-wider">Select Invoice Category</label>
                        <div className="grid grid-cols-3 gap-3">
                            {(['RENTAL', 'WORKSHOP', 'DEPOSIT'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setInvoiceType(type)}
                                    className={`py-3 rounded-xl border text-sm font-bold transition-all ${invoiceType === type ? 'shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
                                    style={{
                                        borderColor: invoiceType === type ? 'var(--brand-lime)' : 'var(--border-main)',
                                        background: invoiceType === type ? 'var(--brand-lime)' : 'var(--bg-input)',
                                        color: invoiceType === type ? '#000' : 'var(--text-main)'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Downloads */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                            Download the sample template to match columns perfectly:
                        </span>
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <Download size={14} /> Excel
                            </button>
                            <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <Download size={14} /> CSV
                            </button>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    {parsedRows.length === 0 && !result && (
                        <div
                            onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)', background: dragOver ? 'rgba(200,230,0,0.05)' : 'transparent' }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}>
                                <Upload size={28} className="text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-main">Drop your Excel or CSV file here</p>
                                <p className="text-xs mt-1 text-dim">or click to browse</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                        </div>
                    )}

                    {/* Preview State */}
                    {parsedRows.length > 0 && !result && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                        <FileText size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-main">{fileName}</p>
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span className="text-emerald-500 font-bold">{validCount} valid</span>
                                            {errorCount > 0 && <span className="text-rose-500 font-bold">{errorCount} errors</span>}
                                            {loadingDrivers && (
                                                <span className="text-blue-500 font-bold flex items-center gap-1">
                                                    <Loader2 size={12} className="animate-spin" /> Verifying driver names...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {errorCount > 0 && (
                                        <button 
                                            onClick={handleRemoveInvalid} 
                                            className="px-4 py-2 rounded-lg text-xs font-bold border border-rose-500 text-rose-500 hover:bg-rose-50 transition-colors"
                                        >
                                            Remove All Invalid
                                        </button>
                                    )}
                                    <button onClick={handleReset} className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                        Change File
                                    </button>
                                    <button
                                        onClick={handleSubmit} disabled={uploading || validCount === 0 || loadingDrivers}
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 border-none hover:scale-[1.02]"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploading ? 'Processing...' : `Upload ${validCount} Invoices`}
                                    </button>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="py-3 px-4">Driver Name</th>
                                                <th className="py-3 px-4">Amount</th>
                                                <th className="py-3 px-4">Amount Paid</th>
                                                <th className="py-3 px-4">Due Date</th>
                                                <th className="py-3 px-4">Status</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => (
                                                <tr key={idx} style={{ background: row._rowErrors.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                                    <td className="py-3 px-4">{row.fullName || '-'}</td>
                                                    <td className="py-3 px-4 font-bold">{row.amount || '-'}</td>
                                                    <td className="py-3 px-4 font-bold text-emerald-500">{row.amountPaid || '-'}</td>
                                                    <td className="py-3 px-4 text-dim">{row.dueDate || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {loadingDrivers ? (
                                                            <div className="flex items-center gap-1.5 text-blue-500">
                                                                <Loader2 size={14} className="animate-spin" /> Verifying...
                                                            </div>
                                                        ) : row._rowErrors.length > 0 ? (
                                                            <div className="flex flex-col text-rose-500" title={row._rowErrors.join(', ')}>
                                                                <div className="flex items-center gap-1.5 font-bold">
                                                                    <AlertTriangle size={14} /> Error
                                                                 </div>
                                                                <span className="text-[10px] text-rose-400 mt-0.5 max-w-[200px] break-words">
                                                                    {row._rowErrors.join(', ')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-emerald-500">
                                                                <CheckCircle size={14} /> Valid
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button 
                                                            onClick={() => handleRemoveRow(idx)}
                                                            className="p-1.5 rounded-lg hover:bg-rose-50 text-dim hover:text-rose-500 transition-colors border-none"
                                                            title="Remove Row"
                                                        >
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

                    {/* Result State */}
                    {result && (
                        <div className="space-y-4 animate-fade-in text-center py-8">
                            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${result.errorCount === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {result.errorCount === 0 ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-main mb-2">Upload Complete</h3>
                                <p className="text-sm text-dim">
                                    Successfully created <span className="font-bold text-emerald-500">{result.successCount}</span> invoices.
                                    {result.errorCount > 0 && <span className="text-rose-500"> Failed for {result.errorCount} rows.</span>}
                                </p>
                            </div>

                            {result.errorCount > 0 && (
                                <div className="mt-6 text-left max-w-lg mx-auto p-4 rounded-xl border bg-rose-500/5 border-rose-500/20">
                                    <p className="text-xs font-bold text-rose-500 mb-2 uppercase tracking-wider">Error Log:</p>
                                    <ul className="text-xs space-y-1 text-dim max-h-32 overflow-y-auto custom-scrollbar">
                                        {result.errors?.map((err: string, i: number) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-6">
                                <button onClick={() => { handleReset(); onClose(); }} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all border-none" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>
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

export default BulkInvoiceUpload;
