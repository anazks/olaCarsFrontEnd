import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Plus, Building2, UserCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkCreateDrivers, type BulkUploadResult } from '../../../services/driverService';
import { getAllBranches, createBranch, type Branch, type CreateBranchPayload } from '../../../services/branchService';
import { getAllCountryManagers, createCountryManager, type CountryManager, type CreateCountryManagerPayload } from '../../../services/countryManagerService';
import { getDecodedToken } from '../../../utils/auth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface ParsedDriver {
    fullName: string;
    email: string;
    phone: string;
    whatsappNumber?: string;
    dateOfBirth?: string;
    nationality?: string;
    idType?: string;
    idNumber?: string;
    licenseNumber?: string;
    licenseCountry?: string;
    licenseExpiry?: string;
    emergencyName?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    _rowErrors: string[];
}

interface BulkDriverUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Roles that get their branch auto-assigned from JWT
const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager'];

// CSV columns — branch is NEVER in the file
const CSV_COLUMNS = [
    'fullName', 'email', 'phone', 'whatsappNumber', 'dateOfBirth', 'nationality',
    'idType', 'idNumber', 'licenseNumber', 'licenseCountry', 'licenseExpiry',
    'emergencyName', 'emergencyRelationship', 'emergencyPhone'
];

const SAMPLE_DATA = [
    {
        fullName: 'John Smith', email: 'john.smith@example.com', phone: '+254700000001',
        whatsappNumber: '+254700000001', dateOfBirth: '1995-05-15', nationality: 'Kenyan',
        idType: 'National ID', idNumber: 'ID-12345678', licenseNumber: 'DL-123456',
        licenseCountry: 'Kenya', licenseExpiry: '2028-12-31',
        emergencyName: 'Jane Smith', emergencyRelationship: 'Spouse', emergencyPhone: '+254700000002'
    },
    {
        fullName: 'Maria Garcia', email: 'maria.garcia@example.com', phone: '+254711223344',
        whatsappNumber: '+254711223344', dateOfBirth: '1990-08-22', nationality: 'Kenyan',
        idType: 'Passport', idNumber: 'PP-88552211', licenseNumber: 'DL-789012',
        licenseCountry: 'Kenya', licenseExpiry: '2029-06-30',
        emergencyName: 'Carlos Garcia', emergencyRelationship: 'Brother', emergencyPhone: '+254722334455'
    }
];

const BulkDriverUpload = ({ isOpen, onClose, onSuccess }: BulkDriverUploadProps) => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign; // COUNTRYMANAGER, ADMIN, etc.

    const [parsedDrivers, setParsedDrivers] = useState<ParsedDriver[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkUploadResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchError, setBranchError] = useState<string | null>(null);
    const [showAddBranch, setShowAddBranch] = useState(false);
    const [addingBranch, setAddingBranch] = useState(false);
    const [countryManagers, setCountryManagers] = useState<CountryManager[]>([]);
    const [quickBranch, setQuickBranch] = useState({
        name: '', code: '', city: '', state: '', address: '', email: '', phone: '', countryManager: ''
    });

    // Inline CM creation state
    const [showAddCM, setShowAddCM] = useState(false);
    const [addingCM, setAddingCM] = useState(false);
    const [cmFormError, setCmFormError] = useState<string | null>(null);
    const [cmForm, setCmForm] = useState({
        fullName: '', email: '', password: '', phone: '', country: ''
    });

    // Common countries list
    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    // Load branches for dropdown (only for CM/Admin roles)
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
            // Also fetch country managers for the quick-add-branch form
            getAllCountryManagers({ limit: 100 })
                .then(res => setCountryManagers(res.data || []))
                .catch(() => { /* non-critical */ });
        }
    }, [isOpen, needsBranchSelection]);

    // Inline CM creation handler
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
            // Refresh country managers list
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

    // Quick-add a branch, then auto-select it
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
            // Refresh list and auto-select the new branch
            await fetchBranches();
            const newId = (created as any)?._id || (created as any)?.data?._id;
            if (newId) {
                setSelectedBranch(newId);
                setBranchError(null);
            }
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
        
        // Basic presence
        if (!row.fullName?.trim()) errors.push('Missing fullName');
        if (!row.email?.trim()) errors.push('Missing email');
        if (!row.phone?.trim()) errors.push('Missing phone');

        // Email format
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            errors.push('Invalid email format');
        }

        // Phone: 6-15 digits (allowing + at start)
        const phoneDigits = (row.phone || '').replace(/[^\d]/g, '');
        if (row.phone && (phoneDigits.length < 6 || phoneDigits.length > 15)) {
            errors.push('Phone must be 6-15 digits');
        }

        // WhatsApp: if provided, 6-15 digits
        if (row.whatsappNumber) {
            const waDigits = row.whatsappNumber.replace(/[^\d]/g, '');
            if (waDigits.length < 6 || waDigits.length > 15) {
                errors.push('WhatsApp must be 6-15 digits');
            }
        }

        // Emergency Phone: 6-15 digits
        if (row.emergencyPhone) {
            const epDigits = row.emergencyPhone.replace(/[^\d]/g, '');
            if (epDigits.length < 6 || epDigits.length > 15) {
                errors.push('Emergency phone must be 6-15 digits');
            }
        }

        // DOB: 14+ years ago
        if (row.dateOfBirth) {
            const dob = new Date(row.dateOfBirth);
            if (isNaN(dob.getTime())) {
                errors.push('Invalid dateOfBirth format (YYYY-MM-DD)');
            } else {
                const minAge = new Date();
                minAge.setFullYear(minAge.getFullYear() - 14);
                if (dob > minAge) errors.push('Driver must be at least 14 years old');
            }
        }

        // License Expiry: Future
        if (row.licenseExpiry) {
            const expiry = new Date(row.licenseExpiry);
            if (isNaN(expiry.getTime())) {
                errors.push('Invalid licenseExpiry format (YYYY-MM-DD)');
            } else if (expiry <= new Date()) {
                errors.push('License expiry must be in the future');
            }
        }

        return errors;
    }, []);

    // Parse file content
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
                    
                    const rows: ParsedDriver[] = (jsonData as any[]).map(row => ({
                        ...row,
                        _rowErrors: validateRow(row),
                    }));
                    setParsedDrivers(rows);
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
                    const rows: ParsedDriver[] = (results.data as any[]).map(row => ({
                        ...row,
                        _rowErrors: validateRow(row),
                    }));
                    setParsedDrivers(rows);
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

    // Download sample template
    const downloadTemplate = (format: 'csv' | 'txt' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Drivers");
            XLSX.writeFile(workbook, `driver_bulk_template.xlsx`);
            return;
        }

        let content: string;
        if (format === 'csv') {
            content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        } else {
            // Tab-delimited .txt
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
        a.download = `driver_bulk_template.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Submit to backend
    const handleSubmit = async () => {
        const validDrivers = parsedDrivers.filter(d => d._rowErrors.length === 0);
        if (validDrivers.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        if (needsBranchSelection && !selectedBranch) {
            setBranchError('Please select a branch before uploading.');
            toast.error('Please select a branch before uploading.');
            return;
        }
        setBranchError(null);

        setUploading(true);
        try {
            // Strip internal _rowErrors before sending
            const payload = validDrivers.map(({ _rowErrors, ...rest }) => rest);
            const branchToSend = needsBranchSelection ? selectedBranch : undefined;
            const res = await bulkCreateDrivers(payload, branchToSend);
            setResult(res.data);
            const successMessage = res.data.errors.length > 0
                ? res.message
                : `${res.data.created.length} driver(s) created successfully.`;
            toast.success(successMessage);
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
        setParsedDrivers([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        setSelectedBranch('');
        onClose();
    };

    const validCount = parsedDrivers.filter(d => d._rowErrors.length === 0).length;
    const errorCount = parsedDrivers.filter(d => d._rowErrors.length > 0).length;

    if (!isOpen) return null;

    const selectedBranchName = branches.find(b => b._id === selectedBranch)?.name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
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
                                {t('management.drivers.bulkUpload.title', 'Bulk Driver Upload')}
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                {t('management.drivers.bulkUpload.subtitle', 'Upload CSV or TXT files to create multiple driver applications at once')}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Branch Selector (for Country Manager / Admin roles) */}
                    {needsBranchSelection && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.03)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
                                Assign Drivers to Branch *
                            </label>

                            {/* Loading state */}
                            {branchesLoading && (
                                <div className="flex items-center gap-2 py-3">
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-lime)' }} />
                                    <span className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading branches…</span>
                                </div>
                            )}

                            {/* Empty state — no branches at all */}
                            {!branchesLoading && branches.length === 0 && !showAddBranch && (
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.08)' }}>
                                        <Building2 size={24} style={{ color: 'var(--brand-lime)' }} />
                                    </div>
                                    <p className="text-sm font-medium text-center" style={{ color: 'var(--text-dim)' }}>
                                        No branches found. Create one first to assign drivers.
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

                            {/* Dropdown + Add Branch link */}
                            {!branchesLoading && branches.length > 0 && (
                                <>
                                    <div className="relative">
                                        <select
                                            value={selectedBranch}
                                            onChange={(e) => {
                                                setSelectedBranch(e.target.value);
                                                if (branchError) setBranchError(null);
                                            }}
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
                                    {branchError && (
                                        <p className="text-xs font-semibold mt-2 ml-1" style={{ color: '#ef4444' }}>
                                            {branchError}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                        {selectedBranch ? (
                                            <p className="text-xs font-medium" style={{ color: 'var(--brand-lime)' }}>
                                                ✓ All uploaded drivers will be assigned to <strong>{selectedBranchName}</strong>
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

                            {/* Quick Add Branch Form */}
                            {showAddBranch && (
                                <div className="mt-3 p-4 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Quick Add Branch</p>

                                    {/* No Country Managers — inline creation form */}
                                    {countryManagers.length === 0 ? (
                                        <div className="space-y-3">
                                            {!showAddCM ? (
                                                /* Prompt */
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
                                                /* Inline CM form */
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
                                        /* Branch form — Country Managers available */
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
                                                {/* Phone */}
                                                <div>
                                                    <PhoneInput
                                                        country={"in"}
                                                        value={quickBranch.phone}
                                                        onChange={(phone) => setQuickBranch({ ...quickBranch, phone })}
                                                        containerStyle={{ width: '100%' }}
                                                        inputStyle={{
                                                            width: '100%', height: '40px',
                                                            background: 'var(--bg-card)', border: '1px solid var(--border-main)',
                                                            color: 'var(--text-main)', borderRadius: '8px', fontSize: '14px'
                                                        }}
                                                        buttonStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}
                                                    />
                                                </div>
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
                                                {/* Country Manager dropdown */}
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

                    {/* Auto-assign info for branch-level roles */}
                    {isAutoAssign && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.03)' }}>
                            <CheckCircle size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                All uploaded drivers will be automatically assigned to your branch.
                            </span>
                        </div>
                    )}

                    {/* Template Downloads */}
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
                    {parsedDrivers.length === 0 && !result && (
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
                                    {t('management.drivers.bulkUpload.dropzoneTitle', 'Drop your Excel, CSV or TXT file here')}
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                    {t('management.drivers.bulkUpload.dropzoneSubtitle', 'or click to browse. Supports .xlsx, .xls, .csv and .txt')}
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
                    {parsedDrivers.length > 0 && !result && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                        <FileText size={14} className="inline mr-1" /> {fileName}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,200,80,0.1)', color: '#22c55e' }}>
                                        <CheckCircle size={12} /> {validCount} valid
                                    </span>
                                    {errorCount > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,80,80,0.1)', color: '#ef4444' }}>
                                            <AlertTriangle size={12} /> {errorCount} errors
                                        </span>
                                    )}
                                </div>
                                <button onClick={handleReset} className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all hover:scale-105" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    Clear & Re-upload
                                </button>
                            </div>

                            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>#</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Full Name</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Email</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Phone</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Nationality</th>
                                                <th className="px-3 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>License #</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedDrivers.map((d, i) => {
                                                const hasError = d._rowErrors.length > 0;
                                                return (
                                                    <tr
                                                        key={i}
                                                        className="border-t"
                                                        style={{
                                                            borderColor: 'var(--border-main)',
                                                            background: hasError ? 'rgba(255,80,80,0.04)' : 'transparent'
                                                        }}
                                                        title={hasError ? d._rowErrors.join(', ') : ''}
                                                    >
                                                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                                        <td className="px-3 py-2">
                                                            {hasError
                                                                ? <AlertTriangle size={14} className="text-red-400" />
                                                                : <CheckCircle size={14} className="text-green-400" />}
                                                        </td>
                                                        <td className="px-3 py-2 font-medium" style={{ color: hasError ? '#ef4444' : 'var(--text-main)' }}>{d.fullName || '—'}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{d.email || '—'}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{d.phone || '—'}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{d.nationality || '—'}</td>
                                                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{d.licenseNumber || '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result Summary */}
                    {result && (
                        <div className="space-y-4">
                            <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'rgba(200,230,0,0.03)' }}>
                                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-main)' }}>Upload Results</h3>
                                <div className="flex gap-6">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle size={18} className="text-green-400" />
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{result.created.length} Created</span>
                                    </div>
                                    {result.errors.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={18} className="text-red-400" />
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{result.errors.length} Failed</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(255,80,80,0.2)', background: 'rgba(255,80,80,0.03)' }}>
                                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#ef4444' }}>
                                        Failed Rows
                                    </p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {result.errors.map((err, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                <span className="font-mono font-bold" style={{ color: '#ef4444' }}>Row {err.row}:</span>
                                                <span>{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button onClick={handleReset} className="text-xs font-bold px-4 py-2 rounded-lg border transition-all hover:scale-105" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                Upload Another File
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={handleClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all border"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)', background: 'var(--bg-input)' }}
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    {parsedDrivers.length > 0 && !result && (
                        <button
                            onClick={handleSubmit}
                            disabled={uploading || validCount === 0 || (needsBranchSelection && !selectedBranch)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50 disabled:hover:scale-100 border-none"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} /> Upload {validCount} Driver{validCount !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkDriverUpload;
