import { useState, useRef, useCallback } from 'react';
import { Upload, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Car } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUpdateVehicleRent, type BulkRentUpdateResult } from '../../../services/vehicleService';

interface ParsedRow {
    [key: string]: any;
    _resolvedVehicleNo?: string;
    _resolvedVin?: string;
    _resolvedWeeklyRent?: number;
    _rowErrors: string[];
}

interface BulkRentUpdateUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Vehicle No', 'Vehicle Model', 'Weekly Rent', 'VIN Number'
];

const SAMPLE_DATA = [
    {
        'Vehicle No': 'KCC 123A',
        'Vehicle Model': 'Toyota Corolla',
        'Weekly Rent': 150,
        'VIN Number': '1NXBR32E6NZ000001'
    },
    {
        'Vehicle No': 'KCD 456B',
        'Vehicle Model': 'Nissan X-Trail',
        'Weekly Rent': 180,
        'VIN Number': 'JN1TA0CP8LX000002'
    }
];

const BulkRentUpdateUpload = ({ isOpen, onClose, onSuccess }: BulkRentUpdateUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkRentUpdateResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [showErrorsOnly, setShowErrorsOnly] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const validateRow = useCallback((row: any): { vehicleNo: string; vin: string; weeklyRent: number; errors: string[] } => {
        const errors: string[] = [];

        const cleanNumber = (val: any) => {
            if (val === undefined || val === null || val === '') return undefined;
            if (typeof val === 'number') return val;
            let cleaned = String(val).replace(/[A-Za-z\$\€\£\¥\s]/g, '');
            if (cleaned.includes(',') && cleaned.includes('.')) {
                cleaned = cleaned.replace(/,/g, '');
            } else if (cleaned.includes(',')) {
                cleaned = cleaned.replace(/,/g, '.');
            }
            const n = Number(cleaned);
            return isNaN(n) ? undefined : n;
        };

        const getFuzzyValue = (rowObj: any, searchNames: string[]) => {
            if (!rowObj) return undefined;
            const keys = Object.keys(rowObj);
            const normalizedSearches = searchNames.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
            
            // Try exact case-insensitive matches first
            for (const key of keys) {
                const cleanKey = key.trim();
                if (searchNames.some(s => s.toLowerCase() === cleanKey.toLowerCase())) {
                    return rowObj[key];
                }
            }

            // Try alphanumeric-only normalization
            for (const key of keys) {
                const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normalizedSearches.includes(normKey)) {
                    return rowObj[key];
                }
            }

            return undefined;
        };

        const vehicleNoRaw = getFuzzyValue(row, ['Vehicle No', 'Vehicle_No', 'VehicleNo', 'registrationNumber', 'RegistrationNumber', 'registration_number']) || '';
        const vinRaw = getFuzzyValue(row, ['VIN Number', 'VIN_Number', 'VINNumber', 'vin', 'VIN', 'vinNumber']) || '';
        const weeklyRentRaw = getFuzzyValue(row, ['Weekly Rent', 'Weekly_Rent', 'WeeklyRent', 'weeklyRent', 'Weeklyrent', 'weekly_rent']);

        if (!vehicleNoRaw || !String(vehicleNoRaw).trim()) {
            errors.push('Missing required column: Vehicle No');
        }

        if (!vinRaw || !String(vinRaw).trim()) {
            errors.push('Missing required column: VIN Number');
        }

        const weeklyRent = cleanNumber(weeklyRentRaw);
        if (weeklyRentRaw === undefined || weeklyRentRaw === '') {
            errors.push('Missing required column: Weekly Rent');
        } else if (weeklyRent === undefined || weeklyRent < 0) {
            errors.push('Weekly Rent must be a positive number');
        }

        const vehicleNo = vehicleNoRaw ? String(vehicleNoRaw).trim() : '';
        const vin = vinRaw ? String(vinRaw).trim().toUpperCase() : '';

        return { vehicleNo, vin, weeklyRent: weeklyRent ?? 0, errors };
    }, []);

    const parse2DArrayToObjects = (aoa: any[][]): any[] => {
        if (!aoa || aoa.length === 0) return [];

        const targetHeaders = ['vehicle no', 'vehicle_no', 'vehicleno', 'weekly rent', 'weekly_rent', 'weeklyrent', 'vin number', 'vin_number', 'vinnumber', 'vin'];
        const normalizedTargets = targetHeaders.map(t => t.replace(/[^a-z0-9]/g, ''));
        let headerRowIdx = -1;

        for (let i = 0; i < aoa.length; i++) {
            const row = aoa[i];
            if (Array.isArray(row)) {
                const hasHeader = row.some(cell => {
                    if (cell === undefined || cell === null) return false;
                    const cleanCell = String(cell).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    return normalizedTargets.includes(cleanCell);
                });
                if (hasHeader) {
                    headerRowIdx = i;
                    break;
                }
            }
        }

        if (headerRowIdx === -1) {
            headerRowIdx = 0;
        }

        const rawHeaders = aoa[headerRowIdx];
        const headers = rawHeaders.map((h: any) => h !== undefined && h !== null ? String(h).trim() : '');

        const resultObjects: any[] = [];
        for (let i = headerRowIdx + 1; i < aoa.length; i++) {
            const row = aoa[i];
            if (!row || row.length === 0) continue;

            const isEmpty = row.every((cell: any) => cell === undefined || cell === null || String(cell).trim() === '');
            if (isEmpty) continue;

            const obj: any = {};
            headers.forEach((header, colIdx) => {
                if (header) {
                    obj[header] = row[colIdx];
                }
            });
            resultObjects.push(obj);
        }

        return resultObjects;
    };

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
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                    const jsonData = parse2DArrayToObjects(aoa);

                    const rows: ParsedRow[] = jsonData.map(row => {
                        const { vehicleNo, vin, weeklyRent, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedVehicleNo: vehicleNo,
                            _resolvedVin: vin,
                            _resolvedWeeklyRent: weeklyRent,
                            _rowErrors: errors,
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) {
                        toast.error('No data rows found in the Excel file.');
                    } else {
                        toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                    }
                } catch (err) {
                    toast.error('Failed to parse Excel file.');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const aoa = results.data as any[][];
                    const jsonData = parse2DArrayToObjects(aoa);
                    const rows: ParsedRow[] = jsonData.map(row => {
                        const { vehicleNo, vin, weeklyRent, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedVehicleNo: vehicleNo,
                            _resolvedVin: vin,
                            _resolvedWeeklyRent: weeklyRent,
                            _rowErrors: errors,
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) {
                        toast.error('No data rows found in the file.');
                    } else {
                        toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
                    }
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

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly Rent Update");
            XLSX.writeFile(workbook, 'vehicle_weekly_rent_template.xlsx');
            toast.success('Excel template downloaded!');
            return;
        }

        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vehicle_weekly_rent_template.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV template downloaded!');
    };

    const handleSubmit = async () => {
        const validRowsWithIndex = parsedRows
            .map((row, idx) => ({ row, idx }))
            .filter(item => item.row._rowErrors.length === 0);

        if (validRowsWithIndex.length === 0) {
            toast.error('No valid rows to upload. Please fix errors first.');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const BATCH_SIZE = 50;
        const totalRows = validRowsWithIndex.length;
        const combinedUpdated: any[] = [];
        const combinedErrors: any[] = [];

        try {
            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
                const batchItems = validRowsWithIndex.slice(i, i + BATCH_SIZE);
                const batchPayload = batchItems.map(item => ({
                    "Vehicle No": item.row._resolvedVehicleNo,
                    "VIN Number": item.row._resolvedVin,
                    "Weekly Rent": item.row._resolvedWeeklyRent,
                    "Vehicle Model": item.row['Vehicle Model'] || item.row['VehicleModel'] || item.row['model'] || ''
                }));

                const res = await bulkUpdateVehicleRent(batchPayload);

                // Map batch-relative results to absolute index in parsedRows
                if (res.data.updated) {
                    res.data.updated.forEach((upd) => {
                        const absoluteIdx = batchItems[upd.row - 1].idx;
                        combinedUpdated.push({
                            ...upd,
                            row: absoluteIdx + 1 // 1-indexed for display
                        });
                    });
                }

                if (res.data.errors) {
                    res.data.errors.forEach((err) => {
                        const absoluteIdx = batchItems[err.row - 1].idx;
                        combinedErrors.push({
                            ...err,
                            row: absoluteIdx + 1 // 1-indexed for display
                        });
                    });
                }

                // Update progress
                const progress = Math.min(100, Math.round(((i + batchItems.length) / totalRows) * 100));
                setUploadProgress(progress);
            }

            const finalResult: BulkRentUpdateResult = {
                updated: combinedUpdated,
                errors: combinedErrors
            };
            setResult(finalResult);

            const msg = `${combinedUpdated.length} vehicle(s) updated successfully${combinedErrors.length > 0 ? `, ${combinedErrors.length} error(s)` : ''}.`;
            toast.success(msg);
            if (combinedUpdated.length > 0) {
                onSuccess();
            }

            // Auto-download error rows as Excel if any errors exist
            if (combinedErrors.length > 0) {
                autoDownloadErrorSheet(combinedErrors);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk rent update failed.');
        } finally {
            setUploading(false);
        }
    };

    const autoDownloadErrorSheet = (errors: Array<{ row: number; message: string }>) => {
        try {
            const errorData = errors.map(err => {
                const originalRow = parsedRows[err.row - 1];
                return {
                    'Row #': err.row,
                    'Vehicle No': originalRow?._resolvedVehicleNo || '',
                    'Vehicle Model': originalRow?.['Vehicle Model'] || originalRow?.['VehicleModel'] || originalRow?.['model'] || '',
                    'Weekly Rent': originalRow?._resolvedWeeklyRent ?? '',
                    'VIN Number': originalRow?._resolvedVin || '',
                    'Error': err.message
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(errorData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');

            // Auto-size columns
            const colWidths = Object.keys(errorData[0] || {}).map(key => ({
                wch: Math.max(key.length, ...errorData.map(r => String((r as any)[key] || '').length)) + 2
            }));
            worksheet['!cols'] = colWidths;

            XLSX.writeFile(workbook, `rent_update_errors_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast('Error report downloaded automatically', { icon: '📄' });
        } catch (e) {
            console.error('Failed to auto-download error sheet:', e);
        }
    };

    const handleReset = () => {
        setParsedRows([]);
        setFileName('');
        setResult(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const validCount = parsedRows.filter(p => p._rowErrors.length === 0).length;
    const errorCount = parsedRows.filter(p => p._rowErrors.length > 0).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div
                className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden select-text"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ backgroundColor: 'rgba(200, 230, 0, 0.1)' }}>
                            <Car size={20} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                Bulk Vehicle Rent Update
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Bulk update weekly rent for vehicles and auto-synchronize schedules and invoices for linked drivers.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110 bg-transparent border-none outline-none cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Template Downloads */}
                    {!uploading && !result && (
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <Info size={16} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                Download template files with required column headers (Vehicle No, Weekly Rent, VIN Number):
                            </span>
                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={() => downloadTemplate('xlsx')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-transparent cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                                >
                                    <Download size={14} /> Excel Template
                                </button>
                                <button
                                    onClick={() => downloadTemplate('csv')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border bg-transparent cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                                >
                                    <Download size={14} /> CSV Template
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Progress Indicator */}
                    {uploading && (
                        <div className="p-10 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in duration-300" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <Loader2 size={32} className="animate-spin text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            <div className="space-y-3 w-full max-w-md">
                                <div className="flex justify-between items-center text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                    <span>Recalculating Repayment Timeline & Rent Schedules...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                                    <div 
                                        className="h-full transition-all duration-300 rounded-full" 
                                        style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand-lime)' }}
                                    />
                                </div>
                                <p className="text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>
                                    Adjusting basicDetails.weeklyRent, future invoices, general ledger entries, and rolling over current driver balances.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Drop Zone */}
                    {parsedRows.length === 0 && !result && !uploading && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{
                                borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)',
                                background: dragOver ? 'rgba(212,241,46,0.05)' : 'transparent'
                            }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/[0.02] border" style={{ borderColor: 'var(--border-main)' }}>
                                <Upload size={28} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                    Drop your Excel or CSV weekly rent file here
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                    or click to browse. Supports .xlsx, .xls, and .csv
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedRows.length > 0 && !result && !uploading && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xs font-bold text-main">File Preview: {fileName}</h3>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            {validCount} Ready
                                        </span>
                                        {errorCount > 0 && (
                                            <button
                                                onClick={() => setShowErrorsOnly(prev => !prev)}
                                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border cursor-pointer transition-all ${
                                                    showErrorsOnly
                                                        ? 'bg-rose-500/25 text-rose-300 border-rose-400/40 ring-1 ring-rose-400/30'
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                }`}
                                            >
                                                {showErrorsOnly ? `✕ Showing ${errorCount} Error(s)` : `${errorCount} Errors — Click to Filter`}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleReset} className="text-xs font-bold text-rose-400 hover:underline bg-transparent border-none cursor-pointer">
                                    Clear File
                                </button>
                            </div>

                            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                                    <thead>
                                        <tr className="border-b sticky top-0 bg-[#141414]" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 font-semibold text-dim">Row</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Status</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Vehicle No</th>
                                            <th className="px-4 py-3 font-semibold text-dim">VIN Number</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Vehicle Model</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Weekly Rent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {[...parsedRows]
                                            .map((row, idx) => ({ row, originalIdx: idx }))
                                            .sort((a, b) => b.row._rowErrors.length - a.row._rowErrors.length)
                                            .filter(({ row }) => !showErrorsOnly || row._rowErrors.length > 0)
                                            .map(({ row, originalIdx }) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const vNo = row._resolvedVehicleNo || '—';
                                                const vin = row._resolvedVin || '—';
                                                const rent = row._resolvedWeeklyRent !== undefined ? `$${row._resolvedWeeklyRent}` : '—';
                                                const model = row['Vehicle Model'] || row['VehicleModel'] || row['model'] || '—';

                                                return (
                                                    <tr key={originalIdx} className={`hover:bg-white/[0.01] ${hasErrors ? 'bg-rose-500/[0.06]' : ''}`}>
                                                        <td className="px-4 py-2 font-mono text-[10px] text-dim">{originalIdx + 1}</td>
                                                        <td className="px-4 py-2">
                                                            {hasErrors ? (
                                                                <div className="flex items-center gap-1 text-rose-400 font-bold">
                                                                    <AlertTriangle size={12} className="shrink-0" />
                                                                    <span className="max-w-[200px] overflow-hidden text-ellipsis block" title={row._rowErrors.join(', ')}>
                                                                        {row._rowErrors[0]}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                                                    <CheckCircle size={12} />
                                                                    <span>Valid</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 font-bold text-main uppercase">{vNo}</td>
                                                        <td className="px-4 py-2 font-mono text-dim uppercase">{vin}</td>
                                                        <td className="px-4 py-2 text-dim">{model}</td>
                                                        <td className="px-4 py-2 text-brand-lime font-bold" style={{ color: 'var(--brand-lime)' }}>{rent}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Result Summary */}
                    {result && (
                        <div className="p-6 rounded-2xl border space-y-4 animate-in zoom-in duration-300" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-main">Rent Bulk Update Handoff Complete</h4>
                                    <p className="text-xs text-dim">The vehicle records and linked driver repayment timelines have been recalculated.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-3">
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Vehicles Updated</p>
                                    <p className="text-2xl font-black text-emerald-400 mt-1">{result.updated.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Drivers Synced</p>
                                    <p className="text-2xl font-black text-brand-lime mt-1" style={{ color: 'var(--brand-lime)' }}>
                                        {result.updated.filter(u => u.driverUpdated).length}
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Rejected Rows</p>
                                    <p className="text-2xl font-black text-rose-400 mt-1">{result.errors.length}</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Failed Rows ({result.errors.length}):
                                    </p>
                                    <div className="border rounded-xl max-h-[200px] overflow-y-auto bg-black/35" style={{ borderColor: 'var(--border-main)' }}>
                                        <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                                            <thead>
                                                <tr className="border-b sticky top-0 bg-[#1a1a1a]" style={{ borderColor: 'var(--border-main)' }}>
                                                    <th className="px-3 py-2 font-semibold text-dim">Row</th>
                                                    <th className="px-3 py-2 font-semibold text-dim">Vehicle No</th>
                                                    <th className="px-3 py-2 font-semibold text-dim">VIN</th>
                                                    <th className="px-3 py-2 font-semibold text-dim">Weekly Rent</th>
                                                    <th className="px-3 py-2 font-semibold text-dim">Error</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                {result.errors.map((err: any, idx: number) => {
                                                    // Find the original parsed row for this error (err.row is 1-indexed)
                                                    const originalRow = parsedRows[err.row - 1];
                                                    const vNo = originalRow?._resolvedVehicleNo || '—';
                                                    const vin = originalRow?._resolvedVin || '—';
                                                    const rent = originalRow?._resolvedWeeklyRent !== undefined ? `$${originalRow._resolvedWeeklyRent}` : '—';

                                                    return (
                                                        <tr key={idx} className="hover:bg-rose-500/5">
                                                            <td className="px-3 py-2 font-mono text-dim">{err.row}</td>
                                                            <td className="px-3 py-2 font-bold text-main uppercase">{vNo}</td>
                                                            <td className="px-3 py-2 font-mono text-dim uppercase">{vin}</td>
                                                            <td className="px-3 py-2 font-bold" style={{ color: 'var(--brand-lime)' }}>{rent}</td>
                                                            <td className="px-3 py-2 text-rose-300/95 font-medium whitespace-normal max-w-[300px]">{err.message}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-white/5 bg-transparent cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    Upload Another
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] bg-brand-lime transition-all hover:scale-105 border-none cursor-pointer"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    Finish
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {parsedRows.length > 0 && !result && !uploading && (
                    <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-topbar)' }}>
                        <button
                            disabled={uploading}
                            onClick={handleClose}
                            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-white/5 disabled:opacity-40 bg-transparent cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={uploading || validCount === 0}
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] bg-brand-lime transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:pointer-events-none border-none cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            {uploading && <Loader2 size={14} className="animate-spin text-black" />}
                            {uploading ? 'Processing Update...' : `Commit ${validCount} Rent Update(s)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkRentUpdateUpload;
