import { useState, useRef, useCallback, useEffect, Fragment } from 'react';
import { Database, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { dataMigrateDrivers, type DataMigrationResult } from '../../../services/driverService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getDecodedToken } from '../../../utils/auth';

interface ParsedRow {
    fullName: string; email: string; phone: string;
    whatsappNumber?: string; dateOfBirth?: string; nationality?: string;
    idType?: string; idNumber?: string;
    licenseNumber?: string; licenseCountry?: string; licenseExpiry?: string;
    emergencyName?: string; emergencyRelationship?: string; emergencyPhone?: string;
    vehicleNumber: string;
    vehicleMake?: string; vehicleModel?: string; vehicleYear?: string;
    vehicleCategory?: string; vehicleFuelType?: string; vehicleColour?: string; vehicleVin?: string;
    activationDate?: string; deactivationDate?: string; 
    weeklyRent?: string | number; durationWeeks?: string | number;
    remarks?: string;
    _rowErrors: string[];
    migrationStatus?: 'MIGRATED' | 'FAILED';
    serverError?: string;
    driverId?: string;
}

const detectDuplicates = (rows: ParsedRow[]) => {
    const vins = new Map<string, number[]>();
    const regs = new Map<string, number[]>();

    rows.forEach((row, idx) => {
        const vin = String(row.vehicleVin || '').trim().toUpperCase();
        if (vin) {
            if (!vins.has(vin)) vins.set(vin, []);
            vins.get(vin)!.push(idx);
        }

        const reg = String(row.vehicleNumber || '').trim().toUpperCase();
        if (reg) {
            if (!regs.has(reg)) regs.set(reg, []);
            regs.get(reg)!.push(idx);
        }
    });

    vins.forEach((indices, vin) => {
        if (indices.length > 1) {
            indices.forEach(idx => {
                const otherRows = indices.map(i => i + 1).filter(r => r !== idx + 1);
                rows[idx]._rowErrors.push(`Duplicate VIN '${vin}' in this file (also on row(s) ${otherRows.join(', ')})`);
            });
        }
    });

    regs.forEach((indices, reg) => {
        if (indices.length > 1) {
            indices.forEach(idx => {
                const otherRows = indices.map(i => i + 1).filter(r => r !== idx + 1);
                rows[idx]._rowErrors.push(`Duplicate Vehicle Number '${reg}' in this file (also on row(s) ${otherRows.join(', ')})`);
            });
        }
    });
};

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; }

const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager'];

const MIGRATION_COLUMNS = [
    'fullName','email','phone','whatsappNumber','dateOfBirth','nationality',
    'idType','idNumber','licenseNumber','licenseCountry','licenseExpiry',
    'emergencyName','emergencyRelationship','emergencyPhone',
    'vehicleNumber','vehicleMake','vehicleModel','vehicleYear',
    'vehicleCategory','vehicleFuelType','vehicleColour','vehicleVin',
    'activationDate','deactivationDate','weeklyRent','durationWeeks','remarks'
];

const SAMPLE_DATA = [{
    fullName:'John Smith', email:'john@example.com', phone:'+254700000001',
    whatsappNumber:'+254700000001', dateOfBirth:'1995-05-15', nationality:'Kenyan',
    idType:'National ID', idNumber:'ID-12345', licenseNumber:'DL-123',
    licenseCountry:'Kenya', licenseExpiry:'2028-12-31',
    emergencyName:'Jane Smith', emergencyRelationship:'Spouse', emergencyPhone:'+254700000002',
    vehicleNumber:'KAA 123A',
    vehicleMake:'Toyota', vehicleModel:'Corolla', vehicleYear:'2022',
    vehicleCategory:'Sedan', vehicleFuelType:'GASOLINE', vehicleColour:'White', vehicleVin:'', 
    activationDate:'15/01/24', deactivationDate:'', weeklyRent: 1500, durationWeeks: 60, remarks:'Migrated from old system'
}];

const DataMigrationUpload = ({ isOpen, onClose, onSuccess }: Props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign;

    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(true);
    const [result, setResult] = useState<DataMigrationResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');

    useEffect(() => {
        if (isOpen && needsBranchSelection) {
            setBranchesLoading(true);
            getAllBranches().then(data => {
                const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
                const nonWorkshop = list.filter((b: Branch) => b.type !== 'WORKSHOP');
                setBranches(nonWorkshop);
            }).catch(() => {}).finally(() => setBranchesLoading(false));
        }
    }, [isOpen, needsBranchSelection]);

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        const nameVal = String(row.fullName || '').trim();
        if (!nameVal) errors.push('Missing fullName');
        else if (/^\d+$/.test(nameVal)) errors.push('Name cannot be just numbers');

        if (!row.vehicleNumber || !String(row.vehicleNumber).trim()) errors.push('Missing vehicleNumber');
        
        const emailVal = String(row.email || '').trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) errors.push('Invalid email');
        
        const phoneVal = String(row.phone || '').trim();
        if (phoneVal && /[a-zA-Z]/.test(phoneVal)) errors.push('Phone cannot contain alphabets');

        if (!row.weeklyRent) errors.push('Missing weekly rent');
        else if (isNaN(Number(row.weeklyRent))) errors.push('Weekly rent must be a number');

        if (!row.durationWeeks) errors.push('Missing duration weeks');
        else if (isNaN(Number(row.durationWeeks))) errors.push('Duration weeks must be a number');

        if (!row.activationDate) {
            errors.push('Missing activation date');
        } else {
            if (typeof row.activationDate === 'string' && !/^\d{2}\/\d{2}\/\d{2,4}$/.test(row.activationDate)) {
                errors.push('Activation date must be in DD/MM/YY or DD/MM/YYYY format');
            }
        }

        if (row.activationDate && row.durationWeeks) {
            let parsedDate = null;
            if (typeof row.activationDate === 'number') {
                const utcDays = Math.floor(row.activationDate - 25569);
                parsedDate = new Date(utcDays * 86400 * 1000);
            } else if (typeof row.activationDate === 'string') {
                const parts = row.activationDate.split('/');
                if (parts.length === 3) {
                    let year = parts[2];
                    if (year.length === 2) year = `20${year}`;
                    parsedDate = new Date(`${year}-${parts[1]}-${parts[0]}`);
                } else {
                    const dashParts = row.activationDate.split('-');
                    if (dashParts.length === 3 && dashParts[2].length === 4) {
                        parsedDate = new Date(`${dashParts[2]}-${dashParts[1]}-${dashParts[0]}`);
                    } else if (dashParts.length === 3 && dashParts[0].length === 4) {
                        parsedDate = new Date(`${dashParts[0]}-${dashParts[1]}-${dashParts[2]}`);
                    } else {
                        parsedDate = new Date(row.activationDate);
                    }
                }
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
                const duration = Number(row.durationWeeks);
                const endDate = new Date(parsedDate);
                endDate.setDate(endDate.getDate() + (duration * 7));
                
                const today = new Date();
                today.setHours(0,0,0,0);
                
                if (endDate < today) {
                    errors.push('Activation date is too far in the past for this duration (all weeks have elapsed)');
                }
            }
        }

        return errors;
    }, []);

    const parseFile = (file: File) => {
        setResult(null); setFileName(file.name);
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const wb = XLSX.read(data, { type: 'array' });
                    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                    const rows: ParsedRow[] = (json as any[]).map(r => ({ ...r, _rowErrors: validateRow(r) }));
                    detectDuplicates(rows);
                    setParsedRows(rows);
                    rows.length === 0 ? toast.error('No data rows found.') : toast.success(`Parsed ${rows.length} row(s)`);
                } catch { toast.error('Failed to parse Excel file.'); }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    const rows: ParsedRow[] = (results.data as any[]).map(r => ({ ...r, _rowErrors: validateRow(r) }));
                    detectDuplicates(rows);
                    setParsedRows(rows);
                    rows.length === 0 ? toast.error('No data rows found.') : toast.success(`Parsed ${rows.length} row(s)`);
                },
                error: (err: any) => toast.error(`Parse failed: ${err.message}`)
            });
        }
    };

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Migration");
            XLSX.writeFile(wb, 'data_migration_template.xlsx');
        } else {
            const content = Papa.unparse(SAMPLE_DATA, { columns: MIGRATION_COLUMNS });
            const blob = new Blob([content], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'data_migration_template.csv'; a.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleSubmit = async () => {
        const valid = parsedRows.filter(d => d._rowErrors.length === 0);
        if (valid.length === 0) { toast.error('No valid rows to upload.'); return; }
        if (needsBranchSelection && !selectedBranch) { toast.error('Please select a branch.'); return; }

        setUploading(true);
        try {
            const normalizeDate = (val: any): string | undefined => {
                if (!val) return undefined;
                if (typeof val === 'number') {
                    const utcDays = Math.floor(val - 25569);
                    const d = new Date(utcDays * 86400 * 1000);
                    return d.toISOString().split('T')[0];
                }
                if (typeof val === 'string') {
                    if (val.includes('/')) {
                        const parts = val.split('/');
                        if (parts.length === 3) {
                            let year = parts[2];
                            if (year.length === 2) year = `20${year}`;
                            return `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        }
                    }
                    if (val.includes('-')) {
                        const parts = val.split('-');
                        if (parts.length === 3) {
                            if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            if (parts[0].length === 4) return val;
                        }
                    }
                    return val;
                }
                return undefined;
            };

            const payload = valid.map(({ _rowErrors, migrationStatus, serverError, driverId, ...rest }, index) => ({
                ...rest,
                originalRow: parsedRows.indexOf(valid[index]) + 1,
                activationDate: normalizeDate(rest.activationDate),
                deactivationDate: normalizeDate(rest.deactivationDate),
                dateOfBirth: normalizeDate(rest.dateOfBirth),
                licenseExpiry: normalizeDate(rest.licenseExpiry),
            }));

            const branchToSend = needsBranchSelection ? selectedBranch : undefined;
            const res = await dataMigrateDrivers(payload, branchToSend, undefined, undefined, updateExisting);
            
            // Map successes and errors
            const createdMap = new Map<number, any>();
            if (res.data?.created) {
                res.data.created.forEach((c: any) => createdMap.set(c.row, c));
            }
            const errorMap = new Map<number, string>();
            if (res.data?.errors) {
                res.data.errors.forEach((e: any) => errorMap.set(e.row, e.message));
            }

            const updatedRows = parsedRows.map((row, index) => {
                const rowNum = index + 1;
                if (createdMap.has(rowNum)) {
                    const cInfo = createdMap.get(rowNum);
                    return {
                        ...row,
                        migrationStatus: 'MIGRATED' as const,
                        driverId: cInfo.driverId,
                        serverError: undefined
                    };
                } else if (errorMap.has(rowNum)) {
                    return {
                        ...row,
                        migrationStatus: 'FAILED' as const,
                        serverError: errorMap.get(rowNum)
                    };
                }
                return row;
            });
            setParsedRows(updatedRows);
            setResult(res.data);
            toast.success(res.message);
            if (res.data.created.length > 0) onSuccess();
        } catch (err: any) {
            const serverMsg = err?.response?.data?.message;
            const resData = err?.response?.data?.data;
            if (resData) {
                const createdMap = new Map<number, any>();
                if (resData.created) {
                    resData.created.forEach((c: any) => createdMap.set(c.row, c));
                }
                const errorMap = new Map<number, string>();
                if (resData.errors) {
                    resData.errors.forEach((e: any) => errorMap.set(e.row, e.message));
                }

                const updatedRows = parsedRows.map((row, index) => {
                    const rowNum = index + 1;
                    if (createdMap.has(rowNum)) {
                        const cInfo = createdMap.get(rowNum);
                        return {
                            ...row,
                            migrationStatus: 'MIGRATED' as const,
                            driverId: cInfo.driverId,
                            serverError: undefined
                        };
                    } else if (errorMap.has(rowNum)) {
                        return {
                            ...row,
                            migrationStatus: 'FAILED' as const,
                            serverError: errorMap.get(rowNum)
                        };
                    }
                    return row;
                });
                setParsedRows(updatedRows);
                setResult(resData);
            }

            const rowErrors = err?.response?.data?.data?.errors;
            if (rowErrors && rowErrors.length > 0) {
                toast.error(`Row ${rowErrors[0].row}: ${rowErrors[0].message}`);
            } else {
                toast.error(serverMsg || 'Data migration failed.');
            }
        } finally { setUploading(false); }
    };

    const handleReset = () => { setParsedRows([]); setFileName(''); setResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handleClose = () => { handleReset(); setSelectedBranch(''); onClose(); };

    const validCount = parsedRows.filter(d => d._rowErrors.length === 0).length;
    const errorCount = parsedRows.filter(d => d._rowErrors.length > 0).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                            <Database size={20} style={{ color: '#f59e0b' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Data Migration Upload</h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Migrate drivers &amp; vehicles from your legacy system</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}><X size={20} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Branch Selector */}
                    {needsBranchSelection && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: '#f59e0b', background: 'rgba(245,158,11,0.03)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Assign to Branch *</label>
                            {branchesLoading ? (
                                <div className="flex items-center gap-2 py-3"><Loader2 size={16} className="animate-spin" style={{ color: '#f59e0b' }} /><span className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading branches…</span></div>
                            ) : (
                                <div className="relative">
                                    <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
                                        className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 appearance-none"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="">— Select a branch —</option>
                                        {branches.filter(b => b.type !== 'WORKSHOP').map(b => <option key={b._id} value={b._id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Auto-assign info */}
                    {isAutoAssign && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
                            <CheckCircle size={16} style={{ color: '#f59e0b' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>All migrated records will be assigned to your branch.</span>
                        </div>
                    )}

                    {/* Update Existing Option */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <input
                            type="checkbox"
                            id="updateExisting"
                            checked={updateExisting}
                            onChange={(e) => setUpdateExisting(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500/20 cursor-pointer"
                            style={{ accentColor: '#f59e0b' }}
                        />
                        <label htmlFor="updateExisting" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-main)' }}>
                            Update existing records if found
                        </label>
                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>(Matches by Vehicle VIN & Driver Phone/Name)</span>
                    </div>

                    {/* Template Downloads */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} style={{ color: '#f59e0b' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Download the migration template:</span>
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                <Download size={14} /> Excel Template
                            </button>
                            <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                <Download size={14} /> CSV Template
                            </button>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    {parsedRows.length === 0 && !result && (
                        <div onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{ borderColor: dragOver ? '#f59e0b' : 'var(--border-main)', background: dragOver ? 'rgba(245,158,11,0.05)' : 'transparent' }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
                                <FileText size={28} style={{ color: '#f59e0b' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Drop your migration Excel or CSV file here</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>or click to browse. Supports .xlsx, .xls, .csv</p>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedRows.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}><FileText size={14} className="inline mr-1" />{fileName}</span>
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,200,80,0.1)', color: '#22c55e' }}>
                                        <CheckCircle size={12} /> {validCount} valid
                                    </span>
                                    {errorCount > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                            <AlertTriangle size={12} /> {errorCount} errors
                                        </span>
                                    )}
                                </div>
                                <button onClick={handleReset} className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Clear &amp; Re-upload</button>
                            </div>

                            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="overflow-x-auto max-h-[300px]">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0" style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-main)', zIndex: 1 }}>
                                            <tr>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>#</th>
                                                {MIGRATION_COLUMNS.map(key => (
                                                        <th key={key} className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>
                                                            {key}
                                                        </th>
                                                    ))}
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Status</th>
                                                <th className="px-3 py-2 font-bold text-center" style={{ color: 'var(--text-dim)' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedRows.map((row, i) => (
                                                <Fragment key={i}>
                                                    <tr style={{ 
                                                        borderBottom: (row._rowErrors.length > 0 || row.serverError) ? 'none' : '1px solid var(--border-main)', 
                                                        background: (row._rowErrors.length > 0 || row.migrationStatus === 'FAILED') 
                                                            ? 'rgba(239,68,68,0.04)' 
                                                            : row.migrationStatus === 'MIGRATED' 
                                                                ? 'rgba(34,197,94,0.04)' 
                                                                : 'transparent' 
                                                    }}>
                                                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                                        {MIGRATION_COLUMNS.map(key => {
                                                                let val = row[key as keyof ParsedRow];
                                                                
                                                                if (typeof val === 'number' && val > 40000 && val < 60000 && key.toLowerCase().includes('date')) {
                                                                    const utcDays = Math.floor(val - 25569);
                                                                    const d = new Date(utcDays * 86400 * 1000);
                                                                    const day = d.getUTCDate().toString().padStart(2, '0');
                                                                    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
                                                                    const year = d.getUTCFullYear();
                                                                    val = `${day}-${month}-${year}`;
                                                                }

                                                                return (
                                                                    <td key={key} className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
                                                                        {String(val || '—')}
                                                                    </td>
                                                                );
                                                            })}
                                                        <td className="px-3 py-2 whitespace-nowrap">
                                                            {row.migrationStatus === 'MIGRATED' ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                                                                    MIGRATED {row.driverId ? `(${row.driverId})` : ''}
                                                                </span>
                                                            ) : row.migrationStatus === 'FAILED' ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                                    FAILED
                                                                </span>
                                                            ) : row._rowErrors.length === 0 ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,200,80,0.1)', color: '#22c55e' }}>OK</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                                                    {row._rowErrors.length} error(s)
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            {!result ? (
                                                                <button 
                                                                    onClick={() => setParsedRows(prev => prev.filter((_, index) => index !== i))}
                                                                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-red-400 hover:text-red-300"
                                                                    title="Remove Entry"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {(row._rowErrors.length > 0 || row.serverError) && (
                                                        <tr style={{ borderBottom: '1px solid var(--border-main)', background: 'rgba(239,68,68,0.04)' }}>
                                                            <td colSpan={MIGRATION_COLUMNS.length + 3} className="px-4 py-2 pt-0 pb-3">
                                                                <div className="flex items-start gap-2 p-2.5 rounded-lg border border-red-500/20 bg-red-500/5">
                                                                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                                                                    <div className="flex flex-col gap-1 text-left">
                                                                        {row._rowErrors.map((err, errIdx) => (
                                                                            <span key={errIdx} className="text-[11px] font-medium text-red-400">
                                                                                • {err}
                                                                            </span>
                                                                        ))}
                                                                        {row.serverError && (
                                                                            <span className="text-[11px] font-bold text-red-400">
                                                                                • Server Error: {row.serverError}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(0,200,80,0.3)', background: 'rgba(0,200,80,0.05)' }}>
                                <p className="text-sm font-bold" style={{ color: '#22c55e' }}>✓ {result.created.length} driver(s) migrated successfully</p>
                                {result.created.length > 0 && (
                                    <div className="mt-3 space-y-1">
                                        {result.created.map((c, i) => (
                                            <div key={i} className="flex items-center gap-3 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                                                <span className="font-black px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{c.driverId}</span>
                                                <span>{c.name}</span>
                                                <span style={{ color: 'var(--text-dim)' }}>→ Vehicle: {c.vehicleNumber}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {result.errors.length > 0 && (
                                <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                                    <p className="text-sm font-bold" style={{ color: '#ef4444' }}>✗ {result.errors.length} error(s)</p>
                                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                                        {result.errors.map((e, i) => (
                                            <p key={i} className="text-xs" style={{ color: '#ef4444' }}>Row {e.row}: {e.message}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                    <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        {result ? 'Close' : 'Cancel'}
                    </button>
                    {!result && parsedRows.length > 0 && (
                        <button onClick={handleSubmit} disabled={uploading || validCount === 0}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 shadow-lg border-none"
                            style={{ backgroundColor: '#f59e0b', color: '#0A0A0A' }}>
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                            {uploading ? 'Migrating…' : `Migrate ${validCount} Record(s)`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataMigrationUpload;

