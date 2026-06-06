import { useState, useRef } from 'react';
import { Upload, X, Download, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { bulkUpsertAccountingCodes } from '../../../services/accountingService';

interface BulkAccountingCodeUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface MappedCode {
    code: string;
    name: string;
    description?: string;
    accountType?: string;
    mileageRate?: number;
    mileageUnit?: string;
    isMileage?: boolean;
    accountNumber?: string;
    accountStatus?: string;
    currency?: string;
    parentAccount?: string;
    cuentaEspanol?: string;
    _rowErrors: string[];
}



const SAMPLE_DATA = [
    {
        'Account Name': 'Rental Income (Sales)',
        'Account Code': 'IN0002',
        'Description': 'Revenue earned from driver rentals and vehicle hire.',
        'Account Type': 'Income',
        'Mileage Rate': '0.000',
        'Mileage Unit': '',
        'IsMileage': 'false',
        'Account #': '',
        'Account Status': 'Active',
        'Currency': 'USD',
        'Parent Account': '',
        'CF.Cuenta en Español:': 'Ingresos por Renta'
    },
    {
        'Account Name': 'NITZIA-PETTY CASH',
        'Account Code': '1.1.01.1(A)',
        'Description': 'PETTY CASH TO NITZIA',
        'Account Type': 'Cash',
        'Mileage Rate': '0.000',
        'Mileage Unit': '',
        'IsMileage': 'false',
        'Account #': '',
        'Account Status': 'Active',
        'Currency': 'USD',
        'Parent Account': 'Petty Cash',
        'CF.Cuenta en Español:': 'NITZIA - CAJA MATERIA'
    }
];

const BulkAccountingCodeUpload = ({ isOpen, onClose, onSuccess }: BulkAccountingCodeUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedCodes, setParsedCodes] = useState<MappedCode[]>([]);
    const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [resultsSummary, setResultsSummary] = useState<{ created: number; updated: number; errorsCount: number } | null>(null);

    const downloadInvalidRows = () => {
        const invalidRows = parsedCodes.filter(c => c._rowErrors.length > 0);
        if (invalidRows.length === 0) return;

        const dataToExport = invalidRows.map(c => ({
            'Account Name': c.name,
            'Account Code': c.code,
            'Description': c.description || '',
            'Account Type': c.accountType || '',
            'Mileage Rate': c.mileageRate || 0,
            'Mileage Unit': c.mileageUnit || '',
            'IsMileage': c.isMileage ? 'true' : 'false',
            'Account #': c.accountNumber || '',
            'Account Status': c.accountStatus || 'Active',
            'Currency': c.currency || 'USD',
            'Parent Account': c.parentAccount || '',
            'CF.Cuenta en Español:': c.cuentaEspanol || '',
            'Validation Errors': c._rowErrors.join(', ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invalid Accounts');
        XLSX.writeFile(workbook, 'invalid_accounting_codes.xlsx');
        toast.success(`Downloaded ${invalidRows.length} invalid rows for corrections.`);
    };

    const validateRow = (row: any): string[] => {
        const errors: string[] = [];
        if (!row.code || !String(row.code).trim()) {
            errors.push('Missing Account Code');
        }
        if (!row.name || !String(row.name).trim()) {
            errors.push('Missing Account Name');
        }
        return errors;
    };

    const mapHeaders = (row: any): Partial<MappedCode> => {
        const mapped: any = {};
        for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase();
            const val = row[key];
            if (normalizedKey === 'account name' || normalizedKey === 'nombre de la cuenta' || normalizedKey === 'name') {
                mapped.name = val;
            } else if (normalizedKey === 'account code' || normalizedKey === 'código de la cuenta' || normalizedKey === 'code') {
                mapped.code = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'description' || normalizedKey === 'descripción') {
                mapped.description = val;
            } else if (normalizedKey === 'account type' || normalizedKey === 'tipo de cuenta' || normalizedKey === 'category') {
                mapped.accountType = val;
            } else if (normalizedKey === 'mileage rate' || normalizedKey === 'tasa de millaje') {
                mapped.mileageRate = val !== undefined && val !== '' ? Number(val) : 0;
            } else if (normalizedKey === 'mileage unit' || normalizedKey === 'unidad de millaje') {
                mapped.mileageUnit = val;
            } else if (normalizedKey === 'ismileage' || normalizedKey === 'esmillaje') {
                mapped.isMileage = val === true || String(val).toLowerCase() === 'true';
            } else if (normalizedKey === 'account #' || normalizedKey === 'número de cuenta') {
                mapped.accountNumber = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'account status' || normalizedKey === 'estado de la cuenta') {
                mapped.accountStatus = val;
            } else if (normalizedKey === 'currency' || normalizedKey === 'moneda') {
                mapped.currency = val;
            } else if (normalizedKey === 'parent account' || normalizedKey === 'cuenta principal') {
                mapped.parentAccount = val;
            } else if (normalizedKey.includes('cuenta en español') || normalizedKey.includes('cf.cuenta en español:')) {
                mapped.cuentaEspanol = val;
            }
        }
        return mapped;
    };

    const parseFile = (file: File) => {
        setResultsSummary(null);
        setFileName(file.name);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);

                    const rows: MappedCode[] = (jsonData as any[]).map(row => {
                        const mapped = mapHeaders(row);
                        return {
                            code: mapped.code || '',
                            name: mapped.name || '',
                            description: mapped.description || '',
                            accountType: mapped.accountType || '',
                            mileageRate: mapped.mileageRate || 0,
                            mileageUnit: mapped.mileageUnit || '',
                            isMileage: !!mapped.isMileage,
                            accountNumber: mapped.accountNumber || '',
                            accountStatus: mapped.accountStatus || 'Active',
                            currency: mapped.currency || 'USD',
                            parentAccount: mapped.parentAccount || '',
                            cuentaEspanol: mapped.cuentaEspanol || '',
                            _rowErrors: validateRow(mapped)
                        };
                    });

                    setParsedCodes(rows);
                    if (rows.length === 0) {
                        toast.error('No rows found in Excel sheet.');
                    } else {
                        toast.success(`Successfully parsed ${rows.length} row(s)`);
                    }
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
                    const rows: MappedCode[] = (results.data as any[]).map(row => {
                        const mapped = mapHeaders(row);
                        return {
                            code: mapped.code || '',
                            name: mapped.name || '',
                            description: mapped.description || '',
                            accountType: mapped.accountType || '',
                            mileageRate: mapped.mileageRate || 0,
                            mileageUnit: mapped.mileageUnit || '',
                            isMileage: !!mapped.isMileage,
                            accountNumber: mapped.accountNumber || '',
                            accountStatus: mapped.accountStatus || 'Active',
                            currency: mapped.currency || 'USD',
                            parentAccount: mapped.parentAccount || '',
                            cuentaEspanol: mapped.cuentaEspanol || '',
                            _rowErrors: validateRow(mapped)
                        };
                    });

                    setParsedCodes(rows);
                    if (rows.length === 0) {
                        toast.error('No rows found in file.');
                    } else {
                        toast.success(`Successfully parsed ${rows.length} row(s)`);
                    }
                },
                error: (err: any) => {
                    toast.error(`CSV Parsing error: ${err.message}`);
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const downloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounting Codes');
        XLSX.writeFile(workbook, 'accounting_codes_template.xlsx');
    };

    const handleSubmit = async () => {
        const validCodes = parsedCodes.filter(c => c._rowErrors.length === 0);
        if (validCodes.length === 0) {
            toast.error('No valid accounting codes to import. Please resolve errors.');
            return;
        }

        setUploading(true);
        try {
            const payload = validCodes.map(({ _rowErrors, ...rest }) => rest);
            const res = await bulkUpsertAccountingCodes(payload);
            
            const { created, updated, errors } = res;
            setResultsSummary({
                created: created?.length || 0,
                updated: updated?.length || 0,
                errorsCount: errors?.length || 0
            });

            if (errors && errors.length > 0) {
                toast.error(`Imported with errors: ${errors.length} row(s) failed.`);
            } else {
                toast.success('All accounting codes imported successfully!');
            }

            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setParsedCodes([]);
        setPreviewFilter('all');
        setFileName('');
        setResultsSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    const errorCount = parsedCodes.filter(c => c._rowErrors.length > 0).length;
    const validCount = parsedCodes.filter(c => c._rowErrors.length === 0).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                            <Upload size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Bulk Import Accounting Codes</h2>
                            <p className="text-xs text-dim" style={{ color: 'var(--text-dim)' }}>Upload an Excel or CSV file to create or update chart of accounts</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:scale-105 transition-all text-dim hover:text-white" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Template Downloader */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border text-sm" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        <span className="font-medium text-dim" style={{ color: 'var(--text-dim)' }}>Download the sample template for the correct layout:</span>
                        <button
                            onClick={downloadTemplate}
                            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Download size={14} /> Download Template
                        </button>
                    </div>

                    {/* Drag and Drop Zone */}
                    {parsedCodes.length === 0 ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:bg-white/5 ${dragOver ? 'border-brand-lime bg-white/5' : 'border-white/10'}`}
                        >
                            <Upload size={40} className="mb-4 text-dim" style={{ color: 'var(--text-dim)' }} />
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Drag & drop your Excel/CSV file here or click to browse</p>
                            <p className="text-xs text-dim mt-1" style={{ color: 'var(--text-dim)' }}>Supports .xlsx, .xls, and .csv files</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* File Info */}
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{fileName}</p>
                                        <p className="text-xs text-dim" style={{ color: 'var(--text-dim)' }}>
                                            {parsedCodes.length} row(s) found • <span className="text-green-500 font-bold">{validCount} valid</span> • <span className="text-red-500 font-bold">{errorCount} invalid</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {errorCount > 0 && (
                                        <button
                                            onClick={downloadInvalidRows}
                                            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <Download size={12} /> Download Invalid Rows
                                        </button>
                                    )}
                                    <button onClick={handleReset} className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                        Clear File
                                    </button>
                                </div>
                            </div>

                            {/* Summary results after upload */}
                            {resultsSummary && (
                                <div className="p-4 rounded-xl border space-y-2 text-sm" style={{ borderColor: 'var(--border-main)', background: 'rgba(200,230,0,0.03)' }}>
                                    <p className="font-bold text-white">Upload Results Summary:</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 rounded-lg border text-center bg-green-500/5 border-green-500/20 text-green-500">
                                            <div className="text-lg font-black">{resultsSummary.created}</div>
                                            <div className="text-xs">Codes Created</div>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center bg-blue-500/5 border-blue-500/20 text-blue-500">
                                            <div className="text-lg font-black">{resultsSummary.updated}</div>
                                            <div className="text-xs">Codes Updated</div>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center bg-red-500/5 border-red-500/20 text-red-500">
                                            <div className="text-lg font-black">{resultsSummary.errorsCount}</div>
                                            <div className="text-xs">Rows Failed</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview Filter Tabs */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Preview Rows</h3>
                                <div className="flex gap-1 p-0.5 rounded-lg border text-xs bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('all')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'all' ? 'bg-white/10 text-white' : 'text-dim'}`}
                                    >
                                        All ({parsedCodes.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('valid')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'valid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-dim'}`}
                                    >
                                        Valid ({validCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('invalid')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'invalid' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-dim'}`}
                                    >
                                        Invalid ({errorCount})
                                    </button>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="rounded-xl overflow-hidden border max-h-[300px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Status</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Code</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Name</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Type</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Parent Account</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Cuenta Español</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Currency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedCodes
                                            .filter(c => {
                                                if (previewFilter === 'valid') return c._rowErrors.length === 0;
                                                if (previewFilter === 'invalid') return c._rowErrors.length > 0;
                                                return true;
                                            })
                                            .map((c, idx) => {
                                                const hasError = c._rowErrors.length > 0;
                                                return (
                                                    <tr key={idx} className={`border-b last:border-0 hover:bg-white/5 transition-colors ${hasError ? 'bg-red-500/5' : ''}`} style={{ borderColor: 'var(--border-main)' }}>
                                                        <td className="px-4 py-3">
                                                            {hasError ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-red-500 flex items-center gap-1 font-bold">
                                                                        <AlertTriangle size={14} /> Error
                                                                    </span>
                                                                    <span className="text-[10px] text-red-400 font-medium whitespace-normal leading-tight">
                                                                        {c._rowErrors.join(', ')}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-green-500 flex items-center gap-1 font-bold">
                                                                    <CheckCircle size={14} /> Valid
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-white font-bold">{c.code}</td>
                                                        <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.accountType}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.parentAccount}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.cuentaEspanol}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.currency}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t justify-end" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 transition-all text-sm cursor-pointer disabled:opacity-50"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Close
                    </button>
                    {parsedCodes.length > 0 && (
                        <button
                            onClick={handleSubmit}
                            disabled={uploading || validCount === 0}
                            className="px-6 py-2.5 rounded-xl font-bold bg-brand-lime text-black flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {uploading ? 'Importing...' : `Import ${validCount} Accounts`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkAccountingCodeUpload;
