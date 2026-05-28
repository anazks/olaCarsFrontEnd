import { useState, useRef, useCallback, useEffect } from 'react';
import { Database, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { dataMigrateDrivers, type DataMigrationResult } from '../../../services/driverService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getAllFinanceStaff, type FinanceStaff, getNextFleetNumber, checkFleetAvailability } from '../../../services/financeStaffService';
import { Plus } from 'lucide-react';
import { getDecodedToken } from '../../../utils/auth';

interface ParsedRow {
    fullName: string; email: string; phone: string;
    whatsappNumber?: string; dateOfBirth?: string; nationality?: string;
    idType?: string; idNumber?: string;
    licenseNumber?: string; licenseCountry?: string; licenseExpiry?: string;
    emergencyName?: string; emergencyRelationship?: string; emergencyPhone?: string;
    vehicleNumber: string;
    vehicleMake?: string; vehicleModel?: string; vehicleYear?: string;
    vehicleCategory?: string; vehicleFuelType?: string; vehicleColour?: string; vehicleVin?: string; vehicleSellingValue?: string;
    activationDate?: string; deactivationDate?: string; remarks?: string;
    _rowErrors: string[];
}

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void; }

const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager'];

const MIGRATION_COLUMNS = [
    'fullName','email','phone','whatsappNumber','dateOfBirth','nationality',
    'idType','idNumber','licenseNumber','licenseCountry','licenseExpiry',
    'emergencyName','emergencyRelationship','emergencyPhone',
    'vehicleNumber','vehicleMake','vehicleModel','vehicleYear',
    'vehicleCategory','vehicleFuelType','vehicleColour','vehicleVin','vehicleSellingValue',
    'activationDate','deactivationDate','remarks'
];

const SAMPLE_DATA = [{
    fullName:'John Smith', email:'john@example.com', phone:'+254700000001',
    whatsappNumber:'+254700000001', dateOfBirth:'1995-05-15', nationality:'Kenyan',
    idType:'National ID', idNumber:'ID-12345', licenseNumber:'DL-123',
    licenseCountry:'Kenya', licenseExpiry:'2028-12-31',
    emergencyName:'Jane Smith', emergencyRelationship:'Spouse', emergencyPhone:'+254700000002',
    vehicleNumber:'KAA 123A',
    vehicleMake:'Toyota', vehicleModel:'Corolla', vehicleYear:'2022',
    vehicleCategory:'Sedan', vehicleFuelType:'Petrol', vehicleColour:'White', vehicleVin:'', vehicleSellingValue:'15000',
    activationDate:'2024-01-15', deactivationDate:'', remarks:'Migrated from old system'
}];

const DataMigrationUpload = ({ isOpen, onClose, onSuccess }: Props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fleetInputRef = useRef<HTMLInputElement>(null);
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
    const [financeStaff, setFinanceStaff] = useState<FinanceStaff[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedStaffObj, setSelectedStaffObj] = useState<FinanceStaff | null>(null);
    const [selectedFleet, setSelectedFleet] = useState('');
    const [isAddingNewFleet, setIsAddingNewFleet] = useState(false);
    const [nextFleetLoading, setNextFleetLoading] = useState(false);
    const [fleetError, setFleetError] = useState<string | null>(null);
    const [isCheckingFleet, setIsCheckingFleet] = useState(false);

    useEffect(() => {
        if (isOpen && needsBranchSelection) {
            setBranchesLoading(true);
            getAllBranches().then(data => {
                setBranches(Array.isArray(data) ? data : (data as any)?.data ?? []);
            }).catch(() => {}).finally(() => setBranchesLoading(false));
        }
    }, [isOpen, needsBranchSelection]);

    // Load finance staff when branch changes
    useEffect(() => {
        const branchToUse = needsBranchSelection ? selectedBranch : (decoded?.branchId || '');
        if (!branchToUse) { setFinanceStaff([]); return; }
        setStaffLoading(true);
        getAllFinanceStaff({ branchId: branchToUse, limit: 200 })
            .then(res => setFinanceStaff(res.data || []))
            .catch(() => setFinanceStaff([]))
            .finally(() => setStaffLoading(false));
    }, [selectedBranch, isOpen]);

    // Fleet number uniqueness check
    useEffect(() => {
        if (!selectedFleet || !isAddingNewFleet) {
            setFleetError(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingFleet(true);
            try {
                const res = await checkFleetAvailability(selectedFleet);
                if (!res.available && res.staffId !== selectedStaff) {
                    setFleetError(`Fleet ${selectedFleet} is already assigned to ${res.assignedTo}`);
                } else {
                    setFleetError(null);
                }
            } catch (err) {
                console.error('Fleet check failed:', err);
            } finally {
                setIsCheckingFleet(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedFleet, isAddingNewFleet, selectedStaff]);

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        if (!row.fullName?.trim()) errors.push('Missing fullName');
        if (!row.vehicleNumber?.trim()) errors.push('Missing vehicleNumber');
        if (row.email && row.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
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
            const payload = valid.map(({ _rowErrors, ...rest }) => rest);
            const branchToSend = needsBranchSelection ? selectedBranch : undefined;
            const res = await dataMigrateDrivers(payload, branchToSend, selectedStaff || undefined, selectedFleet || undefined, updateExisting);
            setResult(res.data);
            toast.success(res.message);
            if (res.data.created.length > 0) onSuccess();
        } catch (err: any) {
            const serverMsg = err?.response?.data?.message;
            const errType = err?.response?.data?.errorType;
            
            if (errType === 'DUPLICATE_FLEET') {
                toast.error(serverMsg || 'Fleet number already in use');
                setFleetError(serverMsg);
                setIsAddingNewFleet(true);
                setTimeout(() => {
                    fleetInputRef.current?.focus();
                }, 100);
            } else {
                const rowErrors = err?.response?.data?.data?.errors;
                if (rowErrors && rowErrors.length > 0) {
                    toast.error(`Row ${rowErrors[0].row}: ${rowErrors[0].message}`);
                } else {
                    toast.error(serverMsg || 'Data migration failed.');
                }
                
                if (err?.response?.data?.data) {
                    setResult(err.response.data.data);
                }
            }
        } finally { setUploading(false); }
    };

    const handleReset = () => { setParsedRows([]); setFileName(''); setResult(null); setSelectedFleet(''); setIsAddingNewFleet(false); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const handleClose = () => { handleReset(); setSelectedBranch(''); setSelectedStaff(''); setSelectedStaffObj(null); onClose(); };

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
                                    <select value={selectedBranch} onChange={(e) => { setSelectedBranch(e.target.value); setSelectedStaff(''); }}
                                        className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 appearance-none"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="">— Select a branch —</option>
                                        {branches.map(b => <option key={b._id} value={b._id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
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

                    {/* Handling Staff Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Handling Staff (Finance Staff)</label>
                            {staffLoading ? (
                                <div className="flex items-center gap-2 py-2"><Loader2 size={14} className="animate-spin" style={{ color: '#f59e0b' }} /><span className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading staff…</span></div>
                            ) : financeStaff.length === 0 ? (
                                <p className="text-xs py-2" style={{ color: 'var(--text-dim)' }}>{needsBranchSelection && !selectedBranch ? 'Select a branch first to see available staff.' : 'No finance staff found for this branch.'}</p>
                            ) : (
                                <div className="relative">
                                    <select 
                                        value={selectedStaff} 
                                        onChange={(e) => {
                                            const sId = e.target.value;
                                            setSelectedStaff(sId);
                                            const staffObj = financeStaff.find(s => s._id === sId) || null;
                                            setSelectedStaffObj(staffObj);
                                            setIsAddingNewFleet(false);
                                            
                                            // Set first fleet if exists
                                            if (staffObj && staffObj.fleetNumbers && staffObj.fleetNumbers.length > 0) {
                                                setSelectedFleet(staffObj.fleetNumbers[0]);
                                            } else {
                                                setSelectedFleet('');
                                            }
                                        }}
                                        className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm font-bold appearance-none transition-all focus:ring-2 focus:ring-amber-500/20"
                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="">— Optional: Select handling staff —</option>
                                        {financeStaff.map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.fullName} {(s.fleetNumbers && s.fleetNumbers.length > 0) ? `(Fleets: ${s.fleetNumbers.join(', ')})` : '(No Fleet Assigned)'}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                </div>
                            )}
                        </div>

                        {/* Fleet Number Selector */}
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>Assign Fleet Number</label>
                            {!selectedStaff ? (
                                <div className="h-[48px] flex items-center px-4 rounded-xl border border-dashed text-xs italic" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    Select handling staff first
                                </div>
                            ) : (
                                <>
                                    {(!isAddingNewFleet && selectedStaffObj?.fleetNumbers && selectedStaffObj.fleetNumbers.length > 0) ? (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <select
                                                    value={selectedFleet}
                                                    onChange={(e) => setSelectedFleet(e.target.value)}
                                                    className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm font-bold appearance-none transition-all focus:ring-2 focus:ring-amber-500/20"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                >
                                                    <option value="">Select an existing fleet</option>
                                                    {selectedStaffObj.fleetNumbers.map((fn, idx) => (
                                                        <option key={idx} value={fn}>{fn}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={async () => {
                                                    setIsAddingNewFleet(true);
                                                    setNextFleetLoading(true);
                                                    setSelectedFleet('');
                                                    try {
                                                        const suggested = await getNextFleetNumber();
                                                        setSelectedFleet(suggested);
                                                    } catch (err) {
                                                        console.error('Failed to fetch next fleet number:', err);
                                                    } finally {
                                                        setNextFleetLoading(false);
                                                    }
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                                                style={{ color: '#f59e0b' }}
                                            >
                                                <Plus size={10} /> Add New Fleet Number
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder={nextFleetLoading ? "Fetching next number..." : "Enter new fleet number"}
                                                    readOnly={nextFleetLoading}
                                                    value={selectedFleet}
                                                    onChange={(e) => setSelectedFleet(e.target.value)}
                                                    ref={fleetInputRef}
                                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-amber-500/20"
                                                    style={{ 
                                                        background: 'var(--bg-card)', 
                                                        border: '1px solid var(--border-main)', 
                                                        color: 'var(--text-main)',
                                                        opacity: nextFleetLoading ? 0.6 : 1
                                                    }}
                                                />
                                                {(nextFleetLoading || isCheckingFleet) && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            {fleetError && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-wider px-1">
                                                    <AlertTriangle size={10} /> {fleetError}
                                                </div>
                                            )}
                                            {selectedStaffObj?.fleetNumbers && selectedStaffObj.fleetNumbers.length > 0 && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setIsAddingNewFleet(false);
                                                        setSelectedFleet(selectedStaffObj.fleetNumbers![0]);
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                                                    style={{ color: 'var(--text-dim)' }}
                                                >
                                                    Select from existing fleets
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

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
                    {parsedRows.length > 0 && !result && (
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
                                        <thead className="sticky top-0" style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>#</th>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Name</th>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Email</th>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Phone</th>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Vehicle #</th>
                                                <th className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Status</th>
                                                <th className="px-3 py-2 font-bold text-center" style={{ color: 'var(--text-dim)' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedRows.map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--border-main)', background: row._rowErrors.length > 0 ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                                                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                                    <td className="px-3 py-2" style={{ color: 'var(--text-main)' }}>{row.fullName || '—'}</td>
                                                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{row.email || '—'}</td>
                                                    <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{row.phone || '—'}</td>
                                                    <td className="px-3 py-2 font-bold" style={{ color: '#f59e0b' }}>{row.vehicleNumber || '—'}</td>
                                                    <td className="px-3 py-2">
                                                        {row._rowErrors.length === 0
                                                            ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,200,80,0.1)', color: '#22c55e' }}>OK</span>
                                                            : (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block w-fit" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                                                        {row._rowErrors.length} error(s)
                                                                    </span>
                                                                    <span className="text-[9px] text-red-400 break-words max-w-[150px]">{row._rowErrors.join(', ')}</span>
                                                                </div>
                                                            )
                                                        }
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button 
                                                            onClick={() => setParsedRows(prev => prev.filter((_, index) => index !== i))}
                                                            className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-red-400 hover:text-red-300"
                                                            title="Remove Entry"
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
                        <button onClick={handleSubmit} disabled={uploading || validCount === 0 || !!fleetError}
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
