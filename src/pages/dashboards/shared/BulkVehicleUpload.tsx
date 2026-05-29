import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Plus, Building2, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkCreateVehicles, type BulkVehicleUploadResult } from '../../../services/vehicleService';
import { getAllBranches, createBranch, type Branch, type CreateBranchPayload } from '../../../services/branchService';
import { getAllCountryManagers, createCountryManager, type CountryManager, type CreateCountryManagerPayload } from '../../../services/countryManagerService';
import { getDecodedToken } from '../../../utils/auth';

interface ParsedVehicle {
    make: string;
    model: string;
    year: string | number;
    vin: string;
    registrationNumber: string;
    registrationExpiry?: string;
    category?: string;
    fuelType?: string;
    transmission?: string;
    colour?: string;
    odometer?: string | number;
    gpsSerialNumber?: string;
    purchasePrice?: string | number;
    vendorName?: string;
    purchaseDate?: string;
    paymentMethod?: string;
    weeklyRent?: string | number;
    sellingValue?: string | number;
    leaseDurationWeeks?: string | number;
    fleetNumber?: string;
    _rowErrors: string[];
}

interface BulkVehicleUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager'];

const CSV_COLUMNS = [
    'make', 'model', 'year', 'vin', 'registrationNumber', 'registrationExpiry',
    'category', 'fuelType', 'transmission', 'colour', 'odometer', 'gpsSerialNumber',
    'purchasePrice', 'vendorName', 'purchaseDate', 'paymentMethod', 'weeklyRent',
    'sellingValue', 'leaseDurationWeeks', 'fleetNumber'
];

const SAMPLE_DATA = [
    {
        make: 'Toyota', model: 'Corolla', year: 2022, vin: '1NXBR32E6NZ000001',
        registrationNumber: 'KCC 123A', registrationExpiry: '2027-12-31',
        category: 'Sedan', fuelType: 'Petrol', transmission: 'Automatic', colour: 'White',
        odometer: 15000, gpsSerialNumber: 'GPS-998811', purchasePrice: 18000,
        vendorName: 'Toyota Kenya', purchaseDate: '2023-01-15', paymentMethod: 'Cash',
        weeklyRent: 150, sellingValue: 14000, leaseDurationWeeks: 260, fleetNumber: 'FL-001'
    },
    {
        make: 'Nissan', model: 'X-Trail', year: 2021, vin: 'JN1TA0CP8LX000002',
        registrationNumber: 'KCD 456B', registrationExpiry: '2026-06-30',
        category: 'SUV', fuelType: 'Diesel', transmission: 'Automatic', colour: 'Silver',
        odometer: 42000, gpsSerialNumber: 'GPS-776622', purchasePrice: 22000,
        vendorName: 'Nissan Motors', purchaseDate: '2022-08-20', paymentMethod: 'Finance',
        weeklyRent: 200, sellingValue: 17500, leaseDurationWeeks: 260, fleetNumber: 'FL-002'
    }
];

const BulkVehicleUpload = ({ isOpen, onClose, onSuccess }: BulkVehicleUploadProps) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign;

    const [parsedVehicles, setParsedVehicles] = useState<ParsedVehicle[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkVehicleUploadResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [showAddBranch, setShowAddBranch] = useState(false);
    const [addingBranch, setAddingBranch] = useState(false);
    const [countryManagers, setCountryManagers] = useState<CountryManager[]>([]);
    const [quickBranch, setQuickBranch] = useState({
        name: '', code: '', city: '', state: '', address: '', email: '', phone: '', countryManager: ''
    });

    const [showAddCM, setShowAddCM] = useState(false);
    const [addingCM, setAddingCM] = useState(false);
    const [cmFormError, setCmFormError] = useState<string | null>(null);
    const [cmForm, setCmForm] = useState({
        fullName: '', email: '', password: '', phone: '', country: ''
    });

    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    const fetchBranches = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const data = await getAllBranches();
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            setBranches(list);
        } catch { /* non-critical */ }
        finally { setBranchesLoading(false); }
    }, []);

    useEffect(() => {
        if (isOpen && needsBranchSelection) {
            fetchBranches();
            getAllCountryManagers({ limit: 100 })
                .then(res => setCountryManagers(res.data || []))
                .catch(() => { /* non-critical */ });
        }
    }, [isOpen, needsBranchSelection]);

    const handleCreateCM = async () => {
        if (!cmForm.fullName.trim() || !cmForm.email.trim() || !cmForm.password.trim() || !cmForm.phone.trim() || !cmForm.country.trim()) {
            setCmFormError('All fields are required.');
            return;
        }
        setAddingCM(true);
        setCmFormError(null);
        try {
            const payload: CreateCountryManagerPayload = {
                fullName: cmForm.fullName.trim(),
                email: cmForm.email.trim(),
                password: cmForm.password,
                phone: cmForm.phone.trim(),
                country: cmForm.country.trim(),
                status: 'ACTIVE'
            };
            await createCountryManager(payload);
            toast.success(`Country Manager "${payload.fullName}" created!`);
            const response = await getAllCountryManagers({ limit: 100 });
            setCountryManagers(response.data || []);
            setShowAddCM(false);
            setCmForm({ fullName: '', email: '', password: '', phone: '', country: '' });
        } catch (err: any) {
            setCmFormError(err?.response?.data?.message || 'Failed to create Country Manager.');
        } finally {
            setAddingCM(false);
        }
    };

    const handleQuickAddBranch = async () => {
        if (!quickBranch.name.trim() || !quickBranch.code.trim() || !quickBranch.email.trim()) {
            toast.error('Branch name, code, and email are required.');
            return;
        }
        if (!quickBranch.countryManager) {
            toast.error('Please select a Country Manager.');
            return;
        }
        setAddingBranch(true);
        try {
            const selectedCM = countryManagers.find(cm => cm._id === quickBranch.countryManager);
            const payload: CreateBranchPayload = {
                name: quickBranch.name.trim(),
                code: quickBranch.code.trim(),
                city: quickBranch.city.trim(),
                state: quickBranch.state.trim(),
                address: quickBranch.address.trim() || quickBranch.city.trim(),
                email: quickBranch.email.trim(),
                phone: quickBranch.phone.trim(),
                country: selectedCM?.country || '',
                countryManager: quickBranch.countryManager,
                status: 'ACTIVE'
            };
            const created = await createBranch(payload);
            toast.success(`Branch "${payload.name}" created!`);
            await fetchBranches();
            const newId = (created as any)?._id || (created as any)?.data?._id;
            if (newId) setSelectedBranch(newId);
            setShowAddBranch(false);
            setQuickBranch({ name: '', code: '', city: '', state: '', address: '', email: '', phone: '', countryManager: '' });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create branch.');
        } finally {
            setAddingBranch(false);
        }
    };

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        
        if (!row.make?.trim()) errors.push('Missing make');
        if (!row.model?.trim()) errors.push('Missing model');
        if (!row.year || isNaN(Number(row.year))) errors.push('Missing or invalid year');
        if (!row.vin?.trim()) errors.push('Missing vin');
        if (!row.registrationNumber?.trim()) errors.push('Missing registrationNumber');

        if (row.year) {
            const yr = Number(row.year);
            const currentYear = new Date().getFullYear();
            if (yr < 1980 || yr > currentYear + 1) {
                errors.push(`Year must be between 1980 and ${currentYear + 1}`);
            }
        }

        if (row.vin && row.vin.trim().length !== 17) {
            errors.push('VIN must be exactly 17 characters');
        }

        if (row.odometer && isNaN(Number(row.odometer))) {
            errors.push('Odometer must be a number');
        }

        if (row.weeklyRent && isNaN(Number(row.weeklyRent))) {
            errors.push('Weekly rent must be a number');
        }

        if (row.purchasePrice && isNaN(Number(row.purchasePrice))) {
            errors.push('Purchase price must be a number');
        }

        return errors;
    }, []);

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
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    const rows: ParsedVehicle[] = (jsonData as any[]).map(row => ({
                        ...row,
                        _rowErrors: validateRow(row),
                    }));
                    setParsedVehicles(rows);
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
                header: true,
                skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    const rows: ParsedVehicle[] = (results.data as any[]).map(row => ({
                        ...row,
                        _rowErrors: validateRow(row),
                    }));
                    setParsedVehicles(rows);
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

    const downloadTemplate = (format: 'csv' | 'txt' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");
            XLSX.writeFile(workbook, `vehicle_bulk_template.xlsx`);
            return;
        }

        let content: string;
        if (format === 'csv') {
            content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        } else {
            const header = CSV_COLUMNS.join('\t');
            const rows = SAMPLE_DATA.map(row =>
                CSV_COLUMNS.map(col => (row as any)[col] ?? '').join('\t')
            );
            content = [header, ...rows].join('\n');
        }

        const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vehicle_bulk_template.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validVehicles = parsedVehicles.filter(v => v._rowErrors.length === 0);
        if (validVehicles.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        if (needsBranchSelection && !selectedBranch) {
            toast.error('Please select a branch before uploading.');
            return;
        }

        setUploading(true);
        try {
            const payload = validVehicles.map(({ _rowErrors, ...rest }) => rest);
            const branchToSend = needsBranchSelection ? selectedBranch : undefined;
            const res = await bulkCreateVehicles(payload, branchToSend);
            setResult(res.data);
            toast.success(res.message);
            if (res.data.created.length > 0) {
                onSuccess();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setParsedVehicles([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        setSelectedBranch('');
        onClose();
    };

    const validCount = parsedVehicles.filter(v => v._rowErrors.length === 0).length;
    const errorCount = parsedVehicles.filter(v => v._rowErrors.length > 0).length;

    if (!isOpen) return null;

    const selectedBranchName = branches.find(b => b._id === selectedBranch)?.name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div
                className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                            <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                {t('management.vehicles.bulkUpload.title', 'Bulk Vehicle Upload')}
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {t('management.vehicles.bulkUpload.subtitle', 'Upload CSV or TXT files to create multiple vehicle records at once')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Branch Selector */}
                    {needsBranchSelection && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.03)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
                                Assign Vehicles to Branch *
                            </label>

                            {branchesLoading && (
                                <div className="flex items-center gap-2 py-3">
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-lime)' }} />
                                    <span className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading branches…</span>
                                </div>
                            )}

                            {!branchesLoading && branches.length === 0 && !showAddBranch && (
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.08)' }}>
                                        <Building2 size={24} style={{ color: 'var(--brand-lime)' }} />
                                    </div>
                                    <p className="text-sm font-medium text-center" style={{ color: 'var(--text-dim)' }}>
                                        No branches found. Create one first to assign vehicles.
                                    </p>
                                    <button
                                        onClick={() => setShowAddBranch(true)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg border-none"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        <Plus size={16} /> Add Branch
                                    </button>
                                </div>
                            )}

                            {!branchesLoading && branches.length > 0 && (
                                <>
                                    <div className="relative">
                                        <select
                                            value={selectedBranch}
                                            onChange={(e) => setSelectedBranch(e.target.value)}
                                            className="w-full px-4 py-3 pr-10 rounded-xl outline-none text-sm font-bold transition-all focus:ring-2 focus:ring-lime appearance-none"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">— Select a branch —</option>
                                            {branches.map(b => (
                                                <option key={b._id} value={b._id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        {selectedBranch ? (
                                            <p className="text-xs font-medium" style={{ color: 'var(--brand-lime)' }}>
                                                ✓ All uploaded vehicles will be assigned to <strong>{selectedBranchName}</strong>
                                            </p>
                                        ) : <span />}
                                        <button
                                            type="button"
                                            onClick={() => setShowAddBranch(!showAddBranch)}
                                            className="flex items-center gap-1 text-xs font-bold transition-all hover:scale-105"
                                            style={{ color: 'var(--brand-lime)' }}
                                        >
                                            <Plus size={12} /> {showAddBranch ? 'Cancel' : 'Add New Branch'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {showAddBranch && (
                                <div className="mt-3 p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Quick Add Branch</p>

                                    {countryManagers.length === 0 ? (
                                        <div className="space-y-3">
                                            {!showAddCM ? (
                                                <div className="flex flex-col items-center gap-3 py-5">
                                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.1)' }}>
                                                        <UserCircle size={22} style={{ color: '#eab308' }} />
                                                    </div>
                                                    <p className="text-sm font-medium text-center" style={{ color: 'var(--text-dim)' }}>
                                                        No Country Managers found. Create one to continue.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAddCM(true)}
                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 border-none"
                                                        style={{ backgroundColor: '#eab308', color: '#0A0A0A' }}
                                                    >
                                                        <Plus size={14} /> Create Country Manager
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.03)' }}>
                                                    <div className="flex items-center gap-2">
                                                        <UserCircle size={16} style={{ color: '#eab308' }} />
                                                        <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#eab308' }}>Create Country Manager</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <input
                                                            type="text" placeholder="Full Name *"
                                                            value={cmForm.fullName}
                                                            onChange={e => setCmForm({ ...cmForm, fullName: e.target.value })}
                                                            className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                        />
                                                        <input
                                                            type="email" placeholder="Email *"
                                                            value={cmForm.email}
                                                            onChange={e => setCmForm({ ...cmForm, email: e.target.value })}
                                                            className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                        />
                                                        <input
                                                            type="password" placeholder="Password *"
                                                            value={cmForm.password}
                                                            onChange={e => setCmForm({ ...cmForm, password: e.target.value })}
                                                            className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                        />
                                                        <input
                                                            type="text" placeholder="Phone *"
                                                            value={cmForm.phone}
                                                            onChange={e => setCmForm({ ...cmForm, phone: e.target.value })}
                                                            className="px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                        />
                                                    </div>
                                                    <select
                                                        value={cmForm.country}
                                                        onChange={e => setCmForm({ ...cmForm, country: e.target.value })}
                                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                    >
                                                        <option value="">Select Country *</option>
                                                        {countries.map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                    {cmFormError && (
                                                        <div className="p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                                            {cmFormError}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setShowAddCM(false); setCmFormError(null); }}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                                        >
                                                            Back
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCreateCM}
                                                            disabled={addingCM}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50 border-none"
                                                            style={{ backgroundColor: '#eab308', color: '#0A0A0A' }}
                                                        >
                                                            {addingCM ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                            {addingCM ? 'Creating...' : 'Create & Continue'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                <input
                                                    type="text" placeholder="Branch Name *"
                                                    value={quickBranch.name}
                                                    onChange={e => setQuickBranch({ ...quickBranch, name: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <input
                                                    type="text" placeholder="Branch Code *"
                                                    value={quickBranch.code}
                                                    onChange={e => setQuickBranch({ ...quickBranch, code: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <input
                                                    type="email" placeholder="Email *"
                                                    value={quickBranch.email}
                                                    onChange={e => setQuickBranch({ ...quickBranch, email: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <input
                                                    type="text" placeholder="Phone"
                                                    value={quickBranch.phone}
                                                    onChange={e => setQuickBranch({ ...quickBranch, phone: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <input
                                                    type="text" placeholder="City"
                                                    value={quickBranch.city}
                                                    onChange={e => setQuickBranch({ ...quickBranch, city: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <input
                                                    type="text" placeholder="State"
                                                    value={quickBranch.state}
                                                    onChange={e => setQuickBranch({ ...quickBranch, state: e.target.value })}
                                                    className="px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                                <div className="relative">
                                                    <select
                                                        value={quickBranch.countryManager}
                                                        onChange={e => setQuickBranch({ ...quickBranch, countryManager: e.target.value })}
                                                        className="w-full px-3 py-2.5 pr-8 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime appearance-none"
                                                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                    >
                                                        <option value="">Country Manager *</option>
                                                        {countryManagers.map(cm => (
                                                            <option key={cm._id} value={cm._id}>{cm.fullName} ({cm.country})</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                                </div>
                                            </div>
                                            <input
                                                type="text" placeholder="Full Address"
                                                value={quickBranch.address}
                                                onChange={e => setQuickBranch({ ...quickBranch, address: e.target.value })}
                                                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddBranch(false)}
                                                    className="px-4 py-2 rounded-lg text-xs font-bold border transition-all"
                                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleQuickAddBranch}
                                                    disabled={addingBranch}
                                                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-50 border-none"
                                                    style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                                >
                                                    {addingBranch ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                    {addingBranch ? 'Creating…' : 'Create Branch'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {isAutoAssign && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.03)' }}>
                            <CheckCircle size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                All uploaded vehicles will be automatically assigned to your branch.
                            </span>
                        </div>
                    )}

                    {/* Templates */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                            Download the sample template to see the expected file format:
                        </span>
                        <div className="ml-auto flex gap-2">
                            <button
                                onClick={() => downloadTemplate('xlsx')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                            >
                                <Download size={14} /> Excel Template
                            </button>
                            <button
                                onClick={() => downloadTemplate('csv')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                            >
                                <Download size={14} /> CSV Template
                            </button>
                            <button
                                onClick={() => downloadTemplate('txt')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                            >
                                <Download size={14} /> TXT Template
                            </button>
                        </div>
                    </div>

                    {/* Drop Zone */}
                    {parsedVehicles.length === 0 && !result && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{
                                borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)',
                                background: dragOver ? 'rgba(200,230,0,0.05)' : 'transparent'
                            }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.08)' }}>
                                <FileText size={28} style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                    Drop your Excel, CSV or TXT file here
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                    or click to browse. Supports .xlsx, .xls, .csv and .txt
                                </p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv,.txt"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {/* Preview Table */}
                    {parsedVehicles.length > 0 && !result && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                        <FileText size={14} className="inline mr-1" /> {fileName}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,200,80,0.1)', color: '#22c55e' }}>
                                        {validCount} valid
                                    </span>
                                    {errorCount > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                                            {errorCount} invalid
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="text-xs font-bold transition-all hover:scale-105"
                                    style={{ color: 'var(--text-dim)' }}
                                >
                                    Clear File
                                </button>
                            </div>

                            <div className="border rounded-xl overflow-hidden max-h-60 overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-main)' }}>
                                            <th className="p-3 font-black text-dim uppercase">Row</th>
                                            <th className="p-3 font-black text-dim uppercase">Make</th>
                                            <th className="p-3 font-black text-dim uppercase">Model</th>
                                            <th className="p-3 font-black text-dim uppercase">Year</th>
                                            <th className="p-3 font-black text-dim uppercase">VIN</th>
                                            <th className="p-3 font-black text-dim uppercase">Registration</th>
                                            <th className="p-3 font-black text-dim uppercase text-right">Errors / Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedVehicles.map((row, idx) => (
                                            <tr key={idx} className="border-b last:border-0" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="p-3 font-medium text-dim">{idx + 1}</td>
                                                <td className="p-3 font-bold text-main">{row.make || '—'}</td>
                                                <td className="p-3 text-main">{row.model || '—'}</td>
                                                <td className="p-3 text-main">{row.year || '—'}</td>
                                                <td className="p-3 font-mono text-main">{row.vin || '—'}</td>
                                                <td className="p-3 text-main">{row.registrationNumber || '—'}</td>
                                                <td className="p-3 text-right">
                                                    {row._rowErrors.length > 0 ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            {row._rowErrors.map((err, errIdx) => (
                                                                <span key={errIdx} className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-500 flex items-center gap-1 font-semibold">
                                                                    <AlertTriangle size={10} /> {err}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-500 font-semibold">
                                                            Ready
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Upload Results */}
                    {result && (
                        <div className="space-y-4 p-5 rounded-2xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/10 text-green-500">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-main">Upload Completed</h3>
                                    <p className="text-xs text-dim">
                                        Successfully created {result.created.length} vehicle(s). {result.errors.length} error(s) occurred.
                                    </p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-red-500 flex items-center gap-1">
                                        <AlertTriangle size={14} /> Upload Failures ({result.errors.length})
                                    </p>
                                    <div className="max-h-40 overflow-y-auto border rounded-xl p-3 text-xs space-y-1.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                        {result.errors.map((err, idx) => (
                                            <div key={idx} className="flex gap-2 text-red-400 font-medium">
                                                <span className="font-bold text-dim">Row {err.row}:</span>
                                                <span>{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={handleReset}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                                >
                                    Upload Another File
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="px-5 py-2.5 rounded-xl text-sm font-bold border-none transition-all hover:scale-105 active:scale-95 shadow-lg"
                                    style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!result && (
                    <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            onClick={handleClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold border transition-all hover:scale-105"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={uploading || parsedVehicles.length === 0 || validCount === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border-none transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {uploading ? 'Uploading...' : `Upload ${validCount} Vehicle(s)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkVehicleUpload;
