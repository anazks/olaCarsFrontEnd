import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import { Database, FileText, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Trash2, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { dataMigrateDrivers, verifyAndCorrectDriverPlans, type DataMigrationResult } from '../../../services/driverService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getDecodedToken } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

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

const detectDuplicates = (_rows: ParsedRow[]) => {
    // Note: Multiple rows with the same Vehicle Number or VIN in the migration file represent 
    // sequential historic driver assignments for that vehicle over time. The backend processes 
    // these rows sequentially with updateExisting=true.
};

interface Props { isOpen?: boolean; onClose?: () => void; onSuccess?: () => void; }

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

const DataMigrationUpload = ({ isOpen = true, onClose, onSuccess }: Props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign;

    const [uploadMode, setUploadMode] = useState<'MIGRATE' | 'VERIFY'>('MIGRATE');
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [updateExisting, setUpdateExisting] = useState(true);
    const [result, setResult] = useState<DataMigrationResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
    const [uploadProgress, setUploadProgress] = useState<{
        processed: number;
        total: number;
        percentage: number;
        currentChunk: number;
        totalChunks: number;
    } | null>(null);
    const [verifyStats, setVerifyStats] = useState<{
        verifiedCount: number;
        statusCorrectedCount: number;
        plansStruckOffCount: number;
        vehiclesReleasedCount: number;
    } | null>(null);

    useEffect(() => {
        if (needsBranchSelection) {
            setBranchesLoading(true);
            getAllBranches().then(data => {
                const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
                const nonWorkshop = list.filter((b: Branch) => b.type !== 'WORKSHOP');
                setBranches(nonWorkshop);
            }).catch(() => {}).finally(() => setBranchesLoading(false));
        }
    }, [needsBranchSelection]);

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

        return errors;
    }, []);

    const parseFile = (file: File) => {
        setResult(null); setFileName(file.name); setStatusFilter('ALL'); setUploadProgress(null);
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

    const downloadInvalidRows = (format: 'xlsx' | 'csv') => {
        const invalidRows = parsedRows.filter(r => r._rowErrors.length > 0 || Boolean(r.serverError) || r.migrationStatus === 'FAILED');
        if (invalidRows.length === 0) {
            toast.error('No invalid rows found to download.');
            return;
        }

        const exportData = invalidRows.map(r => {
            const rowData: Record<string, any> = {};
            MIGRATION_COLUMNS.forEach(col => {
                rowData[col] = (r as any)[col] !== undefined && (r as any)[col] !== null ? (r as any)[col] : '';
            });
            const errorList = [...(r._rowErrors || [])];
            if (r.serverError) errorList.push(`Server Error: ${r.serverError}`);
            rowData['parsingErrors'] = errorList.join('; ');
            return rowData;
        });

        const dateStr = new Date().toISOString().slice(0, 10);
        if (format === 'xlsx') {
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Invalid Rows");
            XLSX.writeFile(wb, `invalid_rows_data_migration_${dateStr}.xlsx`);
        } else {
            const content = Papa.unparse(exportData, { columns: [...MIGRATION_COLUMNS, 'parsingErrors'] });
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invalid_rows_data_migration_${dateStr}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        toast.success(`Downloaded ${invalidRows.length} invalid row(s) in migration template format.`);
    };

    const handleSubmit = async () => {
        const valid = parsedRows.filter(d => d._rowErrors.length === 0);
        if (valid.length === 0) { toast.error('No valid rows to upload.'); return; }
        if (needsBranchSelection && !selectedBranch) { toast.error('Please select a branch.'); return; }

        setUploading(true);
        const CHUNK_SIZE = 50;
        const totalCount = valid.length;
        const totalChunks = Math.ceil(totalCount / CHUNK_SIZE);

        setUploadProgress({
            processed: 0,
            total: totalCount,
            percentage: 0,
            currentChunk: 1,
            totalChunks
        });

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

        const branchToSend = needsBranchSelection ? selectedBranch : undefined;
        const accumulatedCreated: any[] = [];
        const accumulatedErrors: any[] = [];
        let currentRowsState = [...parsedRows];

        try {
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const chunkStart = chunkIndex * CHUNK_SIZE;
                const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalCount);
                const validChunk = valid.slice(chunkStart, chunkEnd);

                setUploadProgress({
                    processed: chunkStart,
                    total: totalCount,
                    percentage: Math.round((chunkStart / totalCount) * 100),
                    currentChunk: chunkIndex + 1,
                    totalChunks
                });

                const payload = validChunk.map((item) => {
                    const { _rowErrors, migrationStatus, serverError, driverId, ...rest } = item;
                    return {
                        ...rest,
                        originalRow: parsedRows.indexOf(item) + 1,
                        activationDate: normalizeDate(rest.activationDate),
                        deactivationDate: normalizeDate(rest.deactivationDate),
                        dateOfBirth: normalizeDate(rest.dateOfBirth),
                        licenseExpiry: normalizeDate(rest.licenseExpiry),
                    };
                });

                let accumulatedVerified = 0;
                let accumulatedStatusCorrected = 0;
                let accumulatedPlansStruckOff = 0;
                let accumulatedVehiclesReleased = 0;

                try {
                    if (uploadMode === 'VERIFY') {
                        const res = await verifyAndCorrectDriverPlans(payload);
                        if (res.data) {
                            accumulatedVerified += res.data.verifiedCount || 0;
                            accumulatedStatusCorrected += res.data.statusCorrectedCount || 0;
                            accumulatedPlansStruckOff += res.data.plansStruckOffCount || 0;
                            accumulatedVehiclesReleased += res.data.vehiclesReleasedCount || 0;

                            const detailsMap = new Map<number, any>();
                            if (res.data.details) {
                                res.data.details.forEach((d: any) => {
                                    detailsMap.set(d.row, d);
                                    if (d.status === 'NOT_FOUND') {
                                        accumulatedErrors.push({ row: d.row, message: d.message });
                                    } else {
                                        accumulatedCreated.push({ row: d.row, driverId: d.driverId, name: d.driverName });
                                    }
                                });
                            }

                            currentRowsState = currentRowsState.map((row, index) => {
                                const rowNum = index + 1;
                                if (detailsMap.has(rowNum)) {
                                    const dInfo = detailsMap.get(rowNum);
                                    if (dInfo.status === 'NOT_FOUND') {
                                        return { ...row, migrationStatus: 'FAILED' as const, serverError: dInfo.message };
                                    }
                                    return { ...row, migrationStatus: 'MIGRATED' as const, driverId: dInfo.driverId, serverError: undefined };
                                }
                                return row;
                            });
                        }
                    } else {
                        const res = await dataMigrateDrivers(payload, branchToSend, undefined, undefined, updateExisting);
                        
                        const createdMap = new Map<number, any>();
                        if (res.data?.created) {
                            res.data.created.forEach((c: any) => {
                                createdMap.set(c.row, c);
                                accumulatedCreated.push(c);
                            });
                        }
                        const errorMap = new Map<number, string>();
                        if (res.data?.errors) {
                            res.data.errors.forEach((e: any) => {
                                errorMap.set(e.row, e.message);
                                accumulatedErrors.push(e);
                            });
                        }

                        currentRowsState = currentRowsState.map((row, index) => {
                            const rowNum = index + 1;
                            if (createdMap.has(rowNum)) {
                                const cInfo = createdMap.get(rowNum);
                                return { ...row, migrationStatus: 'MIGRATED' as const, driverId: cInfo.driverId, serverError: undefined };
                            } else if (errorMap.has(rowNum)) {
                                return { ...row, migrationStatus: 'FAILED' as const, serverError: errorMap.get(rowNum) };
                            }
                            return row;
                        });
                    }
                    setParsedRows([...currentRowsState]);
                    
                    if (uploadMode === 'VERIFY') {
                        setVerifyStats({
                            verifiedCount: accumulatedVerified,
                            statusCorrectedCount: accumulatedStatusCorrected,
                            plansStruckOffCount: accumulatedPlansStruckOff,
                            vehiclesReleasedCount: accumulatedVehiclesReleased
                        });
                    }
                } catch (err: any) {
                    const serverMsg = err?.response?.data?.message || err?.message || 'Chunk migration failed';
                    const resData = err?.response?.data?.data;
                    if (resData) {
                        if (resData.created) {
                            resData.created.forEach((c: any) => accumulatedCreated.push(c));
                        }
                        if (resData.errors) {
                            resData.errors.forEach((e: any) => accumulatedErrors.push(e));
                        }
                    }
                    validChunk.forEach(item => {
                        const rowNum = parsedRows.indexOf(item) + 1;
                        accumulatedErrors.push({ row: rowNum, message: serverMsg });
                    });
                }
            }

            setUploadProgress({
                processed: totalCount,
                total: totalCount,
                percentage: 100,
                currentChunk: totalChunks,
                totalChunks
            });

            const combinedResult = {
                created: accumulatedCreated,
                errors: accumulatedErrors
            };
            setResult(combinedResult);

            if (accumulatedCreated.length > 0) {
                toast.success(`Successfully migrated ${accumulatedCreated.length} record(s)!`);
                if (onSuccess) onSuccess();
            }
            if (accumulatedErrors.length > 0) {
                toast.error(`Migration completed with ${accumulatedErrors.length} error(s).`);
            }
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress(null);
            }, 600);
        }
    };

    const handleReset = () => { setParsedRows([]); setFileName(''); setResult(null); setStatusFilter('ALL'); setUploadProgress(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handleClose = () => { 
        handleReset(); 
        setSelectedBranch(''); 
        if (onClose) {
            onClose();
        } else {
            navigate(-1);
        }
    };

    const validCount = parsedRows.filter(d => d._rowErrors.length === 0 && !d.serverError).length;
    const errorCount = parsedRows.filter(d => d._rowErrors.length > 0 || Boolean(d.serverError)).length;

    const filteredRows = useMemo(() => {
        return parsedRows
            .map((row, originalIndex) => ({ row, originalIndex }))
            .filter(({ row }) => {
                const hasErrors = row._rowErrors.length > 0 || Boolean(row.serverError);
                if (statusFilter === 'VALID') return !hasErrors && row.migrationStatus !== 'FAILED';
                if (statusFilter === 'ERRORS') return hasErrors;
                return true;
            });
    }, [parsedRows, statusFilter]);

    const handleRemoveAllErrorRows = () => {
        const validOnly = parsedRows.filter(r => r._rowErrors.length === 0 && !r.serverError);
        const removedCount = parsedRows.length - validOnly.length;
        setParsedRows(validOnly);
        setStatusFilter('ALL');
        toast.success(`Removed ${removedCount} error row(s)`);
    };

    if (!isOpen) return null;

    return (
        <div className="w-full p-4 sm:p-6 space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Bulk Uploads', path: '../bulk-uploads' }, { label: 'Data Migration Upload', active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border shadow-sm w-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex items-center gap-4">
                    <button onClick={handleClose} className="p-2.5 rounded-xl border transition-all hover:scale-105 cursor-pointer" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)' }} title="Go Back">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                        <Database size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Data Migration Upload</h1>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Migrate drivers &amp; vehicles from your legacy system in bulk</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        {result ? 'Done' : 'Back to Hub'}
                    </button>
                </div>
            </div>

            {/* Page Body Container */}
            <div className="w-full p-4 sm:p-6 rounded-2xl border shadow-sm space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Dual Mode Switch Tab Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-2xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                    <button
                        type="button"
                        onClick={() => setUploadMode('MIGRATE')}
                        className={`w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            uploadMode === 'MIGRATE'
                                ? 'bg-amber-500 text-black shadow-lg scale-[1.01]'
                                : 'text-dim hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <Database size={16} />
                        Mode 1: Upload &amp; Migrate New Data
                    </button>
                    <button
                        type="button"
                        onClick={() => setUploadMode('VERIFY')}
                        className={`w-full sm:w-1/2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            uploadMode === 'VERIFY'
                                ? 'bg-brand-lime text-black shadow-lg scale-[1.01]'
                                : 'text-dim hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <CheckCircle size={16} />
                        Mode 2: Verify &amp; Correct Driver Status &amp; Struck-Off Rent Plans
                    </button>
                </div>
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
                        <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                            <Download size={14} /> Excel Template
                        </button>
                        <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                            <Download size={14} /> CSV Template
                        </button>
                    </div>
                </div>

                {/* Full-Screen Migration Progress Screen Overlay */}
                {uploading && uploadProgress && (
                    <div className="fixed inset-0 z-[100] backdrop-blur-md flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}>
                        <div className="w-full max-w-md p-8 rounded-3xl border shadow-2xl space-y-6 text-center animate-in fade-in zoom-in duration-300"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            
                            {/* Glowing Icon Header */}
                            <div className="relative w-20 h-20 mx-auto flex items-center justify-center rounded-3xl"
                                style={{ background: 'rgba(245, 158, 11, 0.12)', boxShadow: '0 0 30px rgba(245, 158, 11, 0.25)' }}>
                                <Database size={38} className="animate-pulse" style={{ color: '#f59e0b' }} />
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow" style={{ background: '#f59e0b', color: '#000' }}>
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                            </div>

                            {/* Title & Subtitle */}
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    Data Migration In Progress
                                </h2>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                    Please do not refresh or close this window while migrating.
                                </p>
                            </div>

                            {/* Big Percentage Number Display */}
                            <div className="py-2">
                                <span className="text-5xl font-black tracking-tighter" style={{ color: '#f59e0b' }}>
                                    {uploadProgress.percentage}%
                                </span>
                            </div>

                            {/* Progress Bar Track */}
                            <div className="space-y-2">
                                <div className="w-full h-4 rounded-full overflow-hidden p-0.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)' }}>
                                    <div 
                                        className="h-full rounded-full transition-all duration-300 ease-out" 
                                        style={{ 
                                            width: `${uploadProgress.percentage}%`, 
                                            background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)'
                                        }} 
                                    />
                                </div>
                                
                                {/* Details Footer */}
                                <div className="flex items-center justify-between text-xs font-bold pt-1" style={{ color: 'var(--text-muted)' }}>
                                    <span>Batch {uploadProgress.currentChunk} of {uploadProgress.totalChunks}</span>
                                    <span>{uploadProgress.processed.toLocaleString()} / {uploadProgress.total.toLocaleString()} Records</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                    <FileText size={15} style={{ color: '#f59e0b' }} /> {fileName}
                                </span>

                                {/* Status Filter Tabs */}
                                <div className="flex items-center gap-1 p-1 rounded-lg border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('ALL')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-amber-500 text-black shadow-sm' : 'text-dim hover:text-main'}`}
                                    >
                                        All ({parsedRows.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatusFilter('VALID')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'VALID' ? 'bg-green-500 text-black shadow-sm' : 'text-dim hover:text-main'}`}
                                    >
                                        <CheckCircle size={12} /> Valid ({validCount})
                                    </button>
                                    {errorCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setStatusFilter('ERRORS')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === 'ERRORS' ? 'bg-red-500 text-white shadow-sm' : 'text-red-400 hover:text-red-300'}`}
                                        >
                                            <AlertTriangle size={12} /> Errors ({errorCount})
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                                {errorCount > 0 && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => downloadInvalidRows('xlsx')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
                                            title="Download invalid rows pre-filled in Excel migration template"
                                        >
                                            <Download size={13} /> Invalid Rows (Excel)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadInvalidRows('csv')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
                                            title="Download invalid rows pre-filled in CSV migration template"
                                        >
                                            <Download size={13} /> Invalid Rows (CSV)
                                        </button>
                                    </div>
                                )}
                                {errorCount > 0 && !result && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAllErrorRows}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer shadow-sm"
                                        title="Remove all rows containing errors"
                                    >
                                        <Trash2 size={13} /> Remove {errorCount} Error Row(s)
                                    </button>
                                )}
                                <button onClick={handleReset} className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Clear &amp; Re-upload</button>
                            </div>
                        </div>

                        {errorCount > 0 && statusFilter === 'ERRORS' && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                                <div className="flex items-center gap-2.5 text-xs font-medium text-amber-300">
                                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                                    <span>Showing <strong>{errorCount}</strong> invalid row(s). You can download these rows pre-populated in the migration template format, correct the fields, and re-upload.</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => downloadInvalidRows('xlsx')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all cursor-pointer shadow-sm"
                                    >
                                        <Download size={13} /> Download Excel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => downloadInvalidRows('csv')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
                                    >
                                        <Download size={13} /> Download CSV
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border overflow-hidden w-full" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[350px] w-full">
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
                                        {filteredRows.map(({ row, originalIndex }) => (
                                            <Fragment key={originalIndex}>
                                                <tr style={{ 
                                                    borderBottom: (row._rowErrors.length > 0 || row.serverError) ? 'none' : '1px solid var(--border-main)', 
                                                    background: (row._rowErrors.length > 0 || row.migrationStatus === 'FAILED') 
                                                        ? 'rgba(239,68,68,0.04)' 
                                                        : row.migrationStatus === 'MIGRATED' 
                                                            ? 'rgba(34,197,94,0.04)' 
                                                            : 'transparent' 
                                                }}>
                                                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>{originalIndex + 1}</td>
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
                                                                onClick={() => setParsedRows(prev => prev.filter((_, idx) => idx !== originalIndex))}
                                                                className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-red-400 hover:text-red-300 cursor-pointer"
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
                                        {filteredRows.length === 0 && (
                                            <tr>
                                                <td colSpan={MIGRATION_COLUMNS.length + 3} className="px-4 py-8 text-center text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                                    No rows match the selected filter tab ("{statusFilter}").
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Summary */}
                {verifyStats && (
                    <div className="p-5 rounded-2xl border shadow-sm space-y-3" style={{ borderColor: 'rgba(200, 230, 0, 0.3)', background: 'rgba(200, 230, 0, 0.04)' }}>
                        <div className="flex items-center gap-2">
                            <CheckCircle size={18} className="text-brand-lime" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-brand-lime">Driver Status &amp; Rent Repayment Plan Verification Summary</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black uppercase text-dim tracking-widest">Verified Drivers</p>
                                <p className="text-lg font-black text-white">{verifyStats.verifiedCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black uppercase text-dim tracking-widest">Statuses Corrected</p>
                                <p className="text-lg font-black text-amber-400">{verifyStats.statusCorrectedCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black uppercase text-dim tracking-widest">Struck-Off Future Plans</p>
                                <p className="text-lg font-black text-red-400">{verifyStats.plansStruckOffCount}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                <p className="text-[10px] font-black uppercase text-dim tracking-widest">Vehicles Safely Released</p>
                                <p className="text-lg font-black text-brand-lime">{verifyStats.vehiclesReleasedCount}</p>
                            </div>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(0,200,80,0.3)', background: 'rgba(0,200,80,0.05)' }}>
                            <p className="text-sm font-bold" style={{ color: '#22c55e' }}>✓ {result.created.length} driver(s) processed successfully</p>
                            {result.created.length > 0 && (
                                <div className="mt-3 space-y-1 max-h-[200px] overflow-y-auto">
                                    {result.created.map((c, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs py-1" style={{ color: 'var(--text-muted)' }}>
                                            <span className="font-black px-2 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{c.driverId}</span>
                                            <span>{c.name}</span>
                                            {c.vehicleNumber && <span style={{ color: 'var(--text-dim)' }}>→ Vehicle: {c.vehicleNumber}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {result.errors.length > 0 && (
                            <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-bold" style={{ color: '#ef4444' }}>✗ {result.errors.length} error(s)</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => downloadInvalidRows('xlsx')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-300 border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 transition-all cursor-pointer shadow-sm"
                                        >
                                            <Download size={13} /> Download Failed Rows (Excel)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadInvalidRows('csv')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-300 border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 transition-all cursor-pointer shadow-sm"
                                        >
                                            <Download size={13} /> Download Failed Rows (CSV)
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
                                    {result.errors.map((e, i) => (
                                        <p key={i} className="text-xs" style={{ color: '#ef4444' }}>Row {e.row}: {e.message}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Submit Action Footer Bar */}
                <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-main)' }}>
                    <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        {result || verifyStats ? 'Done' : 'Cancel'}
                    </button>
                    {!result && !verifyStats && parsedRows.length > 0 && (
                        <button onClick={handleSubmit} disabled={uploading || validCount === 0}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50 shadow-lg border-none cursor-pointer font-black tracking-wide uppercase"
                            style={{ backgroundColor: uploadMode === 'VERIFY' ? 'var(--brand-lime)' : '#f59e0b', color: '#0A0A0A' }}>
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : uploadMode === 'VERIFY' ? <CheckCircle size={16} /> : <Database size={16} />}
                            {uploading ? (uploadMode === 'VERIFY' ? 'Verifying…' : 'Migrating…') : uploadMode === 'VERIFY' ? `Verify & Correct ${validCount} Record(s)` : `Migrate ${validCount} Record(s)`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DataMigrationUpload;


