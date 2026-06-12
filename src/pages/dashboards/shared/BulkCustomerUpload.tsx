import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, ChevronDown, Building2, Truck } from 'lucide-react';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkCreateCustomers, type BulkCustomerUploadResult } from '../../../services/customerService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getDecodedToken } from '../../../utils/auth';

interface ParsedCustomer {
    [key: string]: any;
    _resolvedName?: string;
    _vehicleNo?: string;
    _rowErrors: string[];
}

interface BulkCustomerUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager'];

const CSV_COLUMNS = [
    'Created Time', 'Last Modified Time', 'Display Name', 'Customer Number', 'Company Name',
    'Salutation', 'First Name', 'Last Name', 'Phone', 'Currency Code', 'Notes', 'Website',
    'Status', 'Created By', 'Accounts Receivable', 'Opening Balance', 'Opening Balance Exchange Rate',
    'Location ID', 'Location Name', 'Bank Account Payment', 'Portal Enabled', 'Credit Limit',
    'Customer Sub Type', 'Billing Attention', 'Billing Address', 'Billing Street2', 'Billing City',
    'Billing State', 'Billing Country', 'Billing County', 'Billing Code', 'Billing Phone',
    'Billing Fax', 'Billing Latitude', 'Billing Longitude', 'Shipping Attention', 'Shipping Address',
    'Shipping Street2', 'Shipping City', 'Shipping State', 'Shipping Country', 'Shipping County',
    'Shipping Code', 'Shipping Phone', 'Shipping Fax', 'Shipping Latitude', 'Shipping Longitude',
    'Skype Identity', 'Facebook', 'Twitter', 'Department', 'Designation', 'Price List',
    'Payment Terms', 'Payment Terms Label', 'Tax Type', 'Last Sync Time', 'Owner Name',
    'Primary Contact ID', 'EmailID', 'MobilePhone', 'Contact ID', 'Contact Name', 'Contact Type',
    'Taxable', 'Tax Name', 'Tax Percentage', 'Contact Address ID', 'Company ID',
    'CF.FLEET NO', 'CF.ACTIVE DATE', 'CF.VEHICLE NO :', 'CF.END DATE', 'CF.SECTION'
];

const SAMPLE_DATA = [
    {
        'Created Time': '2026-06-01 10:00:00',
        'Last Modified Time': '2026-06-01 10:05:00',
        'Display Name': 'Carlos Rodriguez',
        'Customer Number': 'CUST-001',
        'Company Name': 'Rodriguez Transport S.A.',
        'Salutation': 'Mr.',
        'First Name': 'Carlos',
        'Last Name': 'Rodriguez',
        'Phone': '+50766001122',
        'Currency Code': 'USD',
        'Notes': 'Fleet driver - Monday to Friday schedule',
        'Website': '',
        'Status': 'Active',
        'Created By': 'Admin',
        'Accounts Receivable': '',
        'Opening Balance': 0,
        'Opening Balance Exchange Rate': 1,
        'Location ID': '',
        'Location Name': '',
        'Bank Account Payment': '',
        'Portal Enabled': 'FALSE',
        'Credit Limit': '',
        'Customer Sub Type': 'Individual',
        'Billing Attention': 'Carlos Rodriguez',
        'Billing Address': 'Calle 50, Edificio Global',
        'Billing Street2': 'Apt 12B',
        'Billing City': 'Panama City',
        'Billing State': 'Panama',
        'Billing Country': 'Panama',
        'Billing County': '',
        'Billing Code': '0801',
        'Billing Phone': '+50766001122',
        'Billing Fax': '',
        'Billing Latitude': '',
        'Billing Longitude': '',
        'Shipping Attention': '',
        'Shipping Address': '',
        'Shipping Street2': '',
        'Shipping City': '',
        'Shipping State': '',
        'Shipping Country': '',
        'Shipping County': '',
        'Shipping Code': '',
        'Shipping Phone': '',
        'Shipping Fax': '',
        'Shipping Latitude': '',
        'Shipping Longitude': '',
        'Skype Identity': '',
        'Facebook': '',
        'Twitter': '',
        'Department': 'Operations',
        'Designation': 'Driver',
        'Price List': '',
        'Payment Terms': '7',
        'Payment Terms Label': 'Net 7',
        'Tax Type': '',
        'Last Sync Time': '',
        'Owner Name': 'Admin',
        'Primary Contact ID': '',
        'EmailID': 'carlos.rodriguez@example.com',
        'MobilePhone': '+50766001123',
        'Contact ID': '',
        'Contact Name': 'Carlos Rodriguez',
        'Contact Type': 'Customer',
        'Taxable': 'No',
        'Tax Name': '',
        'Tax Percentage': '',
        'Contact Address ID': '',
        'Company ID': 'COMP-OLA-01',
        'CF.FLEET NO': 'FLEET-001',
        'CF.ACTIVE DATE': '2026-01-15',
        'CF.VEHICLE NO :': 'KAA 123A',
        'CF.END DATE': '',
        'CF.SECTION': 'A'
    }
];

const BulkCustomerUpload = ({ isOpen, onClose, onSuccess }: BulkCustomerUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign;

    const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkCustomerUploadResult | null>(null);
    const [progressCurrent, setProgressCurrent] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchError, setBranchError] = useState<string | null>(null);

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
        }
    }, [isOpen, needsBranchSelection]);

    const validateRow = useCallback((row: any): { resolvedName: string; vehicleNo: string; errors: string[] } => {
        const errors: string[] = [];

        const displayName = row['Display Name'] || row['DisplayName'] || row['display name'] || '';
        const fName = row['First Name'] || row['FirstName'] || row['first name'] || '';
        const lName = row['Last Name'] || row['LastName'] || row['last name'] || '';
        const cName = row['Contact Name'] || row['ContactName'] || row['contact name'] || '';
        const compName = row['Company Name'] || row['CompanyName'] || row['company name'] || '';

        const nameVal = displayName ||
            (fName && lName ? `${fName} ${lName}`.trim() : '') ||
            cName || compName || fName || lName;

        if (!nameVal || !String(nameVal).trim()) {
            errors.push('Name is required (Display Name, First/Last Name, Contact Name, or Company Name).');
        }

        const resolvedName = nameVal ? String(nameVal).trim() : '';

        // Email validation
        const emailVal = row['EmailID'] || row['Email'] || row['emailID'] || row['email'] || '';
        if (emailVal && String(emailVal).trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(emailVal).trim())) {
                errors.push(`Invalid email format: "${emailVal}"`);
            }
        }

        // Opening Balance must be numeric
        const obVal = row['Opening Balance'] || row['OpeningBalance'];
        if (obVal !== undefined && obVal !== '' && isNaN(Number(obVal))) {
            errors.push('Opening Balance must be a number.');
        }

        // Tax Percentage must be numeric
        const taxPct = row['Tax Percentage'] || row['TaxPercentage'];
        if (taxPct !== undefined && taxPct !== '' && isNaN(Number(taxPct))) {
            errors.push('Tax Percentage must be a number.');
        }

        // Vehicle No extraction
        const vehicleNo = row['CF.VEHICLE NO :'] || row['CF.VEHICLE NO:'] || row['CF.VEHICLE NO'] ||
            row['cf.vehicle no :'] || row['cf.vehicle no:'] || row['cf.vehicle no'] || '';

        return { resolvedName, vehicleNo: String(vehicleNo).trim(), errors };
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

                    const rows: ParsedCustomer[] = (jsonData as any[]).map(row => {
                        const { resolvedName, vehicleNo, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _vehicleNo: vehicleNo,
                            _rowErrors: errors,
                        };
                    });
                    setParsedCustomers(rows);
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
                    const rows: ParsedCustomer[] = (results.data as any[]).map(row => {
                        const { resolvedName, vehicleNo, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _vehicleNo: vehicleNo,
                            _rowErrors: errors,
                        };
                    });
                    setParsedCustomers(rows);
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
            XLSX.writeFile(workbook, 'customer_bulk_template.xlsx');
            toast.success('Excel template downloaded!');
            return;
        }

        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'customer_bulk_template.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV template downloaded!');
    };

    const handleSubmit = async () => {
        const validCustomers = parsedCustomers.filter(c => c._rowErrors.length === 0);
        if (validCustomers.length === 0) {
            toast.error('No valid rows to upload. Please fix errors first.');
            return;
        }

        if (needsBranchSelection && !selectedBranch) {
            setBranchError('Please select a branch before uploading.');
            toast.error('Please select a branch before uploading.');
            return;
        }
        setBranchError(null);

        setUploading(true);
        setProgressTotal(validCustomers.length);
        setProgressCurrent(0);

        const CHUNK_SIZE = 100;
        const totalCustomers = validCustomers.length;
        const allCreated: any[] = [];
        const allWarnings: any[] = [];
        const allErrors: any[] = [];

        try {
            const payload = validCustomers.map(({ _rowErrors, _resolvedName, _vehicleNo, ...rest }) => rest);
            const branchToSend = needsBranchSelection ? selectedBranch : undefined;

            for (let i = 0; i < totalCustomers; i += CHUNK_SIZE) {
                const chunk = payload.slice(i, i + CHUNK_SIZE);
                const res = await bulkCreateCustomers(chunk, branchToSend);
                const data = res.data;

                const startRowOffset = i;
                if (data.created) {
                    allCreated.push(...data.created.map((c: any) => ({ ...c, row: c.row + startRowOffset })));
                }
                if (data.warnings) {
                    allWarnings.push(...data.warnings.map((w: any) => ({ ...w, row: w.row + startRowOffset })));
                }
                if (data.errors) {
                    allErrors.push(...data.errors.map((e: any) => ({ ...e, row: e.row + startRowOffset })));
                }

                setProgressCurrent(Math.min(i + chunk.length, totalCustomers));
            }

            const mergedResult: BulkCustomerUploadResult = {
                created: allCreated,
                warnings: allWarnings,
                errors: allErrors
            };

            setResult(mergedResult);
            const msg = `${allCreated.length} customer(s) created${allWarnings.length > 0 ? ` with ${allWarnings.length} warning(s)` : ''}${allErrors.length > 0 ? `, ${allErrors.length} error(s)` : ''}.`;
            toast.success(msg);
            if (allCreated.length > 0) {
                onSuccess();
            }
        } catch (err: any) {
            if (allCreated.length > 0 || allWarnings.length > 0 || allErrors.length > 0) {
                const mergedResult: BulkCustomerUploadResult = {
                    created: allCreated,
                    warnings: allWarnings,
                    errors: allErrors
                };
                setResult(mergedResult);
                if (allCreated.length > 0) {
                    onSuccess();
                }
            }
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setParsedCustomers([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        setSelectedBranch('');
        onClose();
    };

    const validCount = parsedCustomers.filter(c => c._rowErrors.length === 0).length;
    const errorCount = parsedCustomers.filter(c => c._rowErrors.length > 0).length;
    const vehicleLinkedCount = parsedCustomers.filter(c => c._vehicleNo && c._rowErrors.length === 0).length;

    if (!isOpen) return null;

    const selectedBranchName = branches.find(b => b._id === selectedBranch)?.name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div
                className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden select-text"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                            <Upload size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                Bulk Customer Upload
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Import Zoho-format Excel or CSV customer contacts. Rows with Vehicle No. auto-create linked Driver records.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Branch Selector (for Admin / Country Manager roles) */}
                    {needsBranchSelection && !uploading && !result && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.03)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
                                Assign Customers to Branch *
                            </label>

                            {branchesLoading && (
                                <div className="flex items-center gap-2 py-3">
                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--brand-lime)' }} />
                                    <span className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading branches…</span>
                                </div>
                            )}

                            {!branchesLoading && branches.length === 0 && (
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.08)' }}>
                                        <Building2 size={24} style={{ color: 'var(--brand-lime)' }} />
                                    </div>
                                    <p className="text-sm font-medium text-center" style={{ color: 'var(--text-dim)' }}>
                                        No branches found. Please create a branch first from the Branch Management section.
                                    </p>
                                </div>
                            )}

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
                                    {selectedBranch && (
                                        <p className="text-xs font-medium mt-2" style={{ color: 'var(--brand-lime)' }}>
                                            ✓ All uploaded customers will be assigned to <strong>{selectedBranchName}</strong>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Auto-assign info */}
                    {isAutoAssign && !uploading && !result && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'rgba(200,230,0,0.2)', background: 'rgba(200,230,0,0.03)' }}>
                            <CheckCircle size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                All uploaded customers will be automatically assigned to your branch.
                            </span>
                        </div>
                    )}

                    {/* Template Downloads */}
                    {!uploading && !result && (
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                Download the template to view the expected Zoho-format schema:
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
                            </div>
                        </div>
                    )}

                    {/* Vehicle Linking Info */}
                    {!uploading && !result && (
                        <div className="flex items-start gap-3 p-3 rounded-xl border" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.03)' }}>
                            <Truck size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                            <div>
                                <p className="text-xs font-bold text-blue-400">Auto Driver & Vehicle Linking</p>
                                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                    When <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono">CF.VEHICLE NO :</code> is populated, 
                                    the system will create a Driver record and link it to the matching vehicle by plate number.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Progress Indicator */}
                    {uploading && (
                        <div className="p-10 rounded-2xl border flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative bg-white/[0.02] border" style={{ borderColor: 'var(--border-main)' }}>
                                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand-lime)' }} />
                            </div>
                            <div className="space-y-3 w-full max-w-md">
                                <div className="flex justify-between text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                    <span>Uploading Customer Records</span>
                                    <span>{progressCurrent} / {progressTotal} ({Math.round((progressCurrent / (progressTotal || 1)) * 100)}%)</span>
                                </div>
                                <div className="w-full h-3 rounded-full overflow-hidden bg-black/40 border" style={{ borderColor: 'var(--border-main)' }}>
                                    <div 
                                        className="h-full rounded-full transition-all duration-300 ease-out" 
                                        style={{ 
                                            width: `${(progressCurrent / (progressTotal || 1)) * 100}%`,
                                            backgroundColor: 'var(--brand-lime)'
                                        }}
                                    />
                                </div>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                    Please keep this window open while we process the records. Saving profiles, registering drivers, and setting up vehicle connections...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Drop Zone */}
                    {parsedCustomers.length === 0 && !result && !uploading && (
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
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.08)' }}>
                                <FileText size={28} className="text-blue-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                    Drop your Zoho Excel or CSV file here
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
                    {parsedCustomers.length > 0 && !result && !uploading && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-bold text-main">File Preview: {fileName}</h3>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            {validCount} Ready
                                        </span>
                                        {errorCount > 0 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                {errorCount} Errors
                                            </span>
                                        )}
                                        {vehicleLinkedCount > 0 && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                {vehicleLinkedCount} Vehicle Links
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleReset} className="text-xs font-bold text-rose-400 hover:underline">
                                    Clear File
                                </button>
                            </div>

                            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                                    <thead>
                                        <tr className="border-b sticky top-0 bg-[#141414]" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 font-semibold text-dim">Row</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Status</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Resolved Name</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Email</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Phone</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Vehicle No</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Fleet No</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Section</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {parsedCustomers.map((row, idx) => {
                                            const hasErrors = row._rowErrors.length > 0;
                                            const fleetNo = row['CF.FLEET NO'] || row['cf.fleet no'] || '—';
                                            const section = row['CF.SECTION'] || row['cf.section'] || '—';

                                            return (
                                                <tr key={idx} className={`hover:bg-white/[0.01] ${hasErrors ? 'bg-rose-500/[0.02]' : ''}`}>
                                                    <td className="px-4 py-2 font-mono text-[10px] text-dim">{idx + 1}</td>
                                                    <td className="px-4 py-2">
                                                        {hasErrors ? (
                                                            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                                                <AlertTriangle size={14} className="shrink-0" />
                                                                <span className="max-w-[250px] overflow-hidden text-ellipsis block" title={row._rowErrors.join(', ')}>
                                                                    {row._rowErrors[0]}
                                                                    {row._rowErrors.length > 1 && ` (+${row._rowErrors.length - 1} more)`}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                                                <CheckCircle size={14} />
                                                                <span>Valid</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 font-bold text-main">{row._resolvedName || '—'}</td>
                                                    <td className="px-4 py-2 text-dim">{row['EmailID'] || row['Email'] || '—'}</td>
                                                    <td className="px-4 py-2 text-dim">{row['Phone'] || row['MobilePhone'] || '—'}</td>
                                                    <td className="px-4 py-2">
                                                        {row._vehicleNo ? (
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                                                                {row._vehicleNo}
                                                            </span>
                                                        ) : (
                                                            <span className="text-dim">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-dim">{fleetNo}</td>
                                                    <td className="px-4 py-2 text-dim">{section}</td>
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
                                    <h4 className="text-base font-bold text-main">Import Complete</h4>
                                    <p className="text-xs text-dim">The customer records have been processed and committed to the database.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-3">
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Created</p>
                                    <p className="text-2xl font-black text-emerald-400 mt-1">{result.created.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Warnings</p>
                                    <p className="text-2xl font-black text-amber-400 mt-1">{result.warnings.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Errors</p>
                                    <p className="text-2xl font-black text-rose-400 mt-1">{result.errors.length}</p>
                                </div>
                            </div>

                            {/* Driver/Vehicle linking summary */}
                            {result.created.some(c => c.driver) && (
                                <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.03)' }}>
                                    <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                                        <Truck size={14} /> Driver/Vehicle Links Created:
                                    </p>
                                    <div className="border rounded-xl max-h-[120px] overflow-y-auto p-3 space-y-1 bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                                        {result.created.filter(c => c.driver).map((c, idx) => (
                                            <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2">
                                                <span className="font-mono text-dim shrink-0">Row {c.row}:</span>
                                                <span className="text-blue-300/95 font-medium">
                                                    {c.name} → Driver {c.driver?.driverId}
                                                    {c.vehicle ? ` → Vehicle ${c.vehicle.registrationNumber}` : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Warnings ({result.warnings.length}):
                                    </p>
                                    <div className="border rounded-xl max-h-[140px] overflow-y-auto p-4 space-y-1.5 bg-black/35" style={{ borderColor: 'var(--border-main)' }}>
                                        {result.warnings.map((w, idx) => (
                                            <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2">
                                                <span className="font-mono text-dim shrink-0">Row {w.row}:</span>
                                                <span className="text-amber-300/95 font-medium">{w.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Error Logs ({result.errors.length}):
                                    </p>
                                    <div className="border rounded-xl max-h-[140px] overflow-y-auto p-4 space-y-1.5 bg-black/35" style={{ borderColor: 'var(--border-main)' }}>
                                        {result.errors.map((err, idx) => (
                                            <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2">
                                                <span className="font-mono text-dim shrink-0">Row {err.row}:</span>
                                                <span className="text-rose-300/95 font-medium">{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-white/5"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    Upload Another
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] transition-all hover:scale-105"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    Finish
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {parsedCustomers.length > 0 && !result && (
                    <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-topbar)' }}>
                        <button
                            disabled={uploading}
                            onClick={handleClose}
                            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-white/5 disabled:opacity-40"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={uploading || validCount === 0}
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:pointer-events-none"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            {uploading && <Loader2 size={14} className="animate-spin text-black" />}
                            {uploading ? 'Processing...' : `Import ${validCount} Customer(s)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkCustomerUpload;
