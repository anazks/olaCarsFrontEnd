import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkCreateSuppliers, type BulkSupplierUploadResult } from '../../../services/supplierService';
import { getAllAccountingCodes, type AccountingCode } from '../../../services/accountingService';

interface ParsedSupplier {
    // Excel original field mappings
    'Created Time'?: string;
    'Last Modified Time'?: string;
    'Contact ID'?: string;
    'Contact Name'?: string;
    'Vendor Number'?: string;
    'Company Name'?: string;
    'Display Name'?: string;
    'Salutation'?: string;
    'First Name'?: string;
    'Last Name'?: string;
    'EmailID'?: string;
    'Phone'?: string;
    'MobilePhone'?: string;
    'Currency Code'?: string;
    'Notes'?: string;
    'Website'?: string;
    'Status'?: string;
    'Created By'?: string;
    'Opening Balance'?: string | number;
    'Location ID'?: string;
    'Location Name'?: string;
    'Accounts Payable'?: string;
    'Payment Terms Label'?: string;
    'Payment Terms'?: string;
    'Taxable'?: string;
    'Tax Name'?: string;
    'Tax Percentage'?: string | number;
    'Tax Type'?: string;
    'Contact Address ID'?: string;
    'Billing Attention'?: string;
    'Billing Address'?: string;
    'Billing Street2'?: string;
    'Billing City'?: string;
    'Billing State'?: string;
    'Billing Country'?: string;
    'Billing Code'?: string;
    'Billing Phone'?: string;
    'Billing Fax'?: string;
    'Shipping Attention'?: string;
    'Shipping Address'?: string;
    'Shipping Street2'?: string;
    'Shipping City'?: string;
    'Shipping State'?: string;
    'Shipping Country'?: string;
    'Shipping Code'?: string;
    'Shipping Phone'?: string;
    'Shipping Fax'?: string;
    'Source'?: string;
    'Primary Contact ID'?: string;
    'Company ID'?: string;
    'CF.FLEET NO'?: string;
    'CF.ACTIVE DATE'?: string | number;
    'CF.RUC'?: string;
    'CF.DV'?: string;
    
    // Internal validation fields
    _resolvedName?: string;
    _rowErrors: string[];
}

interface BulkSupplierUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Created Time', 'Last Modified Time', 'Contact ID', 'Contact Name', 'Vendor Number',
    'Company Name', 'Display Name', 'Salutation', 'First Name', 'Last Name', 'EmailID',
    'Phone', 'MobilePhone', 'Currency Code', 'Notes', 'Website', 'Status', 'Created By',
    'Opening Balance', 'Location ID', 'Location Name', 'Accounts Payable', 'Payment Terms Label',
    'Payment Terms', 'Taxable', 'Tax Name', 'Tax Percentage', 'Tax Type', 'Contact Address ID',
    'Billing Attention', 'Billing Address', 'Billing Street2', 'Billing City', 'Billing State',
    'Billing Country', 'Billing Code', 'Billing Phone', 'Billing Fax', 'Shipping Attention',
    'Shipping Address', 'Shipping Street2', 'Shipping City', 'Shipping State', 'Shipping Country',
    'Shipping Code', 'Shipping Phone', 'Shipping Fax', 'Source', 'Primary Contact ID', 'Company ID',
    'CF.FLEET NO', 'CF.ACTIVE DATE', 'CF.RUC', 'CF.DV'
];

const SAMPLE_DATA = [
    {
        'Created Time': '2026-06-09 18:00:00',
        'Last Modified Time': '2026-06-09 18:05:00',
        'Contact ID': 'CON-9901',
        'Contact Name': 'Panama Fleet Supplies S.A.',
        'Vendor Number': 'VEND-2026-01',
        'Company Name': 'Panama Fleet Supplies S.A.',
        'Display Name': 'Panama Fleet Supplies',
        'Salutation': 'Mr.',
        'First Name': 'Carlos',
        'Last Name': 'Mendoza',
        'EmailID': 'sales@panamafleet.com',
        'Phone': '+50766001122',
        'MobilePhone': '+50766001123',
        'Currency Code': 'USD',
        'Notes': 'Primary supplier for workshop consumables and parts',
        'Website': 'https://www.panamafleet.com',
        'Status': 'Active',
        'Created By': 'Admin',
        'Opening Balance': 1500.00,
        'Location ID': 'LOC-PAN-01',
        'Location Name': 'Panama Depot Warehouse',
        'Accounts Payable': '2.1.01', // Matches default Accounts Payable code
        'Payment Terms Label': 'Net 30',
        'Payment Terms': '30 Days',
        'Taxable': 'Yes',
        'Tax Name': 'ITBMS 7%',
        'Tax Percentage': 7.00,
        'Tax Type': 'Taxable',
        'Contact Address ID': 'CADDR-8801',
        'Billing Attention': 'Accounts Payable Dept',
        'Billing Address': 'Avenida Balboa, Torre Las Americas',
        'Billing Street2': 'Suite 14B',
        'Billing City': 'Panama City',
        'Billing State': 'Panama',
        'Billing Country': 'Panama',
        'Billing Code': '0801',
        'Billing Phone': '+50766001122',
        'Billing Fax': '+50766001125',
        'Shipping Attention': 'Receiving Dock',
        'Shipping Address': 'Calle 50 y Via Brasil',
        'Shipping Street2': 'Warehouse Section B',
        'Shipping City': 'Panama City',
        'Shipping State': 'Panama',
        'Shipping Country': 'Panama',
        'Shipping Code': '0801',
        'Shipping Phone': '+50766001122',
        'Shipping Fax': '+50766001125',
        'Source': 'Direct Partner',
        'Primary Contact ID': 'CON-9901',
        'Company ID': 'COMP-OLA-01',
        'CF.FLEET NO': 'FLEET-5501',
        'CF.ACTIVE DATE': '2026-01-15',
        'CF.RUC': '8-765-4321',
        'CF.DV': '99'
    }
];

const BulkSupplierUpload = ({ isOpen, onClose, onSuccess }: BulkSupplierUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [parsedSuppliers, setParsedSuppliers] = useState<ParsedSupplier[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<BulkSupplierUploadResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [accounts, setAccounts] = useState<AccountingCode[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(false);

    // Fetch Chart of Accounts on mount
    useEffect(() => {
        if (isOpen) {
            setAccountsLoading(true);
            getAllAccountingCodes()
                .then(res => {
                    const list = Array.isArray(res) ? res : (res as any).data ?? [];
                    setAccounts(list);
                })
                .catch(err => {
                    console.error('Failed to load chart of accounts:', err);
                })
                .finally(() => {
                    setAccountsLoading(false);
                });
        }
    }, [isOpen]);

    const validateRow = useCallback((row: any, activeAccounts: AccountingCode[]): { resolvedName: string; errors: string[] } => {
        const errors: string[] = [];

        // 1. Resolve vendor name
        const nameVal = row['Display Name'] || row['DisplayName'] || 
                        row['Contact Name'] || row['ContactName'] || 
                        row['Company Name'] || row['CompanyName'] ||
                        (row['First Name'] && row['Last Name'] ? `${row['First Name']} ${row['Last Name']}`.trim() : '') ||
                        row['First Name'] || row['Last Name'] || row['name'] || row['Name'];

        if (!nameVal || !String(nameVal).trim()) {
            errors.push('Mandatory column missing: Display Name, Contact Name, or Company Name required to resolve Vendor Name.');
        }

        const resolvedName = nameVal ? String(nameVal).trim() : '';

        // 2. Validate email if present
        const emailVal = row['EmailID'] || row['Email'] || row['emailID'] || row['emailId'] || row['email'];
        if (emailVal && String(emailVal).trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(emailVal).trim())) {
                errors.push(`Invalid email format: "${emailVal}"`);
            }
        }

        // 3. Validate Accounts Payable mapping
        const apVal = row['Accounts Payable'] || row['AccountsPayable'] || row['accounts payable'];
        if (apVal && String(apVal).trim()) {
            const apStr = String(apVal).trim().toLowerCase();
            const matchedAccount = activeAccounts.find(acc => 
                acc.code.toLowerCase() === apStr || 
                acc.name.toLowerCase() === apStr
            );
            if (!matchedAccount) {
                errors.push(`Accounts Payable "${apVal}" not found in Chart of Accounts.`);
            }
        } else {
            // Check if standard Accounts Payable defaults are available in our system
            const defaultAP = activeAccounts.find(acc => 
                String(acc.category) === 'Accounts Payable' || 
                acc.name.toLowerCase() === 'accounts payable' || 
                acc.code === '2100' ||
                acc.code === '2.1.01'
            );
            if (!defaultAP) {
                errors.push('No Accounts Payable specified, and no default "Accounts Payable" account (Code 2.1.01) found in your Chart of Accounts.');
            }
        }

        // 4. Validate CF.ACTIVE DATE
        const activeDateVal = row['CF.ACTIVE DATE'] || row['CF.Active Date'] || row['cf.active date'] || row['Active Date'];
        if (activeDateVal) {
            let parsedDate;
            if (typeof activeDateVal === 'number') {
                // Serial Excel date conversion
                parsedDate = new Date((activeDateVal - 25569) * 86400 * 1000);
            } else {
                parsedDate = new Date(activeDateVal);
            }

            if (isNaN(parsedDate.getTime())) {
                errors.push(`Invalid Active Date: "${activeDateVal}". Expected format YYYY-MM-DD.`);
            }
        }

        // 5. Validate numbers
        const obVal = row['Opening Balance'] || row['OpeningBalance'] || row['opening balance'];
        if (obVal && isNaN(Number(obVal))) {
            errors.push('Opening Balance must be a numeric value.');
        }

        const taxPctVal = row['Tax Percentage'] || row['TaxPercentage'] || row['tax percentage'];
        if (taxPctVal && isNaN(Number(taxPctVal))) {
            errors.push('Tax Percentage must be a numeric value.');
        }

        return { resolvedName, errors };
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
                    
                    const rows: ParsedSupplier[] = (jsonData as any[]).map(row => {
                        const { resolvedName, errors } = validateRow(row, accounts);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _rowErrors: errors,
                        };
                    });
                    setParsedSuppliers(rows);
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
                    const rows: ParsedSupplier[] = (results.data as any[]).map(row => {
                        const { resolvedName, errors } = validateRow(row, accounts);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _rowErrors: errors,
                        };
                    });
                    setParsedSuppliers(rows);
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
            XLSX.writeFile(workbook, `vendor_bulk_template.xlsx`);
            toast.success('Excel Template downloaded!');
            return;
        }

        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vendor_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV Template downloaded!');
    };

    const handleSubmit = async () => {
        const validSuppliers = parsedSuppliers.filter(s => s._rowErrors.length === 0);
        if (validSuppliers.length === 0) {
            toast.error('No valid rows to upload. Please address errors first.');
            return;
        }

        setUploading(true);
        try {
            // Strip out internal fields before sending to API
            const payload = validSuppliers.map(({ _rowErrors, _resolvedName, ...rest }) => rest);
            const res = await bulkCreateSuppliers(payload);
            setResult(res.data);
            const successMessage = res.data.errors.length > 0
                ? res.message
                : `${res.data.created.length} vendor(s) created successfully.`;
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
        setParsedSuppliers([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const validCount = parsedSuppliers.filter(s => s._rowErrors.length === 0).length;
    const errorCount = parsedSuppliers.filter(s => s._rowErrors.length > 0).length;

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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                            <Upload size={20} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                Bulk Vendor Upload
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Upload Excel or CSV vendor spreadsheets to import multiple suppliers into your system directory
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    
                    {/* System State Warning */}
                    {accountsLoading && (
                        <div className="flex items-center gap-2 p-3 rounded-xl border bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                            <Loader2 size={16} className="animate-spin text-brand-lime" />
                            <span className="text-sm font-semibold text-dim">Fetching accounts configuration for local validation mappings...</span>
                        </div>
                    )}

                    {/* Template Downloads */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                            Download the template sheets to view the expected schema structure:
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

                    {/* Drop Zone */}
                    {parsedSuppliers.length === 0 && !result && (
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
                                    Drop your Excel or CSV file here
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
                    {parsedSuppliers.length > 0 && !result && (
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
                                            <th className="px-4 py-3 font-semibold text-dim">Accounts Payable</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Fleet No</th>
                                            <th className="px-4 py-3 font-semibold text-dim">RUC / DV</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {parsedSuppliers.map((row, idx) => {
                                            const anyRow = row as any;
                                            const hasErrors = row._rowErrors.length > 0;
                                            const apVal = row['Accounts Payable'] || anyRow['accounts payable'] || anyRow['AccountsPayable'] || '—';
                                            const fleetNo = row['CF.FLEET NO'] || anyRow['cf.fleet no'] || '—';
                                            const ruc = row['CF.RUC'] || anyRow['cf.ruc'] || '—';
                                            const dv = row['CF.DV'] || anyRow['cf.dv'] || '—';

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
                                                    <td className="px-4 py-2 text-dim">{row['EmailID'] || (row as any)['Email'] || '—'}</td>
                                                    <td className="px-4 py-2 text-dim">{row['Phone'] || row['MobilePhone'] || '—'}</td>
                                                    <td className="px-4 py-2 text-dim">{apVal}</td>
                                                    <td className="px-4 py-2 text-dim">{fleetNo}</td>
                                                    <td className="px-4 py-2 text-dim">{ruc}{dv !== '—' ? ` / ${dv}` : ''}</td>
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
                                    <h4 className="text-base font-bold text-main">Sync Process Completed</h4>
                                    <p className="text-xs text-dim">The bulk transaction payload has been verified and committed to the vendor registry.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-3">
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Created Records</p>
                                    <p className="text-2xl font-black text-emerald-400 mt-1">{result.created.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Failed Rows</p>
                                    <p className="text-2xl font-black text-rose-400 mt-1">{result.errors.length}</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Error Logs ({result.errors.length}):
                                    </p>
                                    <div className="border rounded-xl max-h-[180px] overflow-y-auto p-4 space-y-1.5 bg-black/35" style={{ borderColor: 'var(--border-main)' }}>
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
                                    className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] bg-brand-lime transition-all hover:scale-105"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    Finish
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {parsedSuppliers.length > 0 && !result && (
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
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-[#0A0A0A] bg-brand-lime transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:pointer-events-none"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            {uploading && <Loader2 size={14} className="animate-spin text-black" />}
                            {uploading ? 'Processing Commit...' : `Import ${validCount} Vendor(s)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkSupplierUpload;
