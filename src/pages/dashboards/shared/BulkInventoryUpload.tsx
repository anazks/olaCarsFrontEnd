import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Building2, Wrench } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkCreateParts } from '../../../services/inventoryService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getDecodedToken } from '../../../utils/auth';

interface ParsedPart {
    [key: string]: any;
    _resolvedName?: string;
    _resolvedNumber?: string;
    _rowErrors: string[];
}

interface BulkInventoryUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AUTO_ASSIGN_ROLES = ['operationstaff', 'financestaff', 'branchmanager', 'workshopstaff', 'workshopmanager'];

const CSV_COLUMNS = [
    'Item ID', 'Item Name', 'SKU', 'UPC', 'MPN', 'EAN', 'ISBN', 'Is Returnable Item', 'Brand',
    'Manufacturer', 'Description', 'Rate', 'Account', 'Account Code', 'Package Weight', 'Package Length',
    'Package Width', 'Package Height', 'Dimension Unit', 'Weight Unit', 'Is Receivable Service',
    'Tax Name', 'Tax Percentage', 'Tax Type', 'Purchase Tax Name', 'Purchase Tax Percentage',
    'Purchase Tax Type', 'Product Type', 'Source', 'Reference ID', 'Last Sync Time', 'Status',
    'Usage unit', 'Unit Name', 'Purchase Rate', 'Purchase Account', 'Purchase Account Code',
    'Purchase Description', 'Inventory Account', 'Inventory Account Code', 'Inventory Valuation Method',
    'Reorder Point', 'Vendor', 'Vendor Number', 'Location Name', 'Opening Stock', 'Opening Stock Value',
    'Stock On Hand', 'Item Type', 'Sellable', 'Purchasable', 'Track Inventory', 'TrackSerialNumber',
    'Track Batches', 'Enable Bin Tracking', 'p', 'CF.Item Name', 'CF.Fleet', 'CF.Brand',
    'CF.Model', 'CF.Color', 'CF.Vin', 'CF.Year', 'CF.Owner', 'CF.Insurance', 'CF.Insurance Validity',
    'CF.Insurance Number', 'CF.Revised Validity', 'CF.Arrival', 'CF.PRODUCT ACTIVE', 'CF.ESTATUS'
];

const SAMPLE_DATA = [
    {
        'Item ID': 'PART-001',
        'Item Name': 'Premium Front Brake Pads',
        'SKU': 'BRK-PAD-F-001',
        'Description': 'Ceramic brake pads for front axle disc brakes',
        'Rate': 45.00, // Selling price
        'Account': 'Sales Revenue',
        'Account Code': 'IN0008',
        'Purchase Rate': 25.00,
        'Purchase Account': 'Cost of Goods Sold',
        'Purchase Account Code': 'CGS0001',
        'Inventory Account': 'Inventory Asset',
        'Inventory Account Code': 'AST0001',
        'Tax Name': 'ITBMS 7%',
        'Tax Percentage': 7,
        'Tax Type': 'Taxable',
        'Unit Name': 'piece',
        'Reorder Point': 5,
        'Vendor': 'Panama Fleet Supplies',
        'Location Name': 'Panama Depot Warehouse',
        'Opening Stock': 20,
        'Stock On Hand': 20,
        'Item Type': 'Spare Parts'
    }
];

const BulkInventoryUpload = ({ isOpen, onClose, onSuccess }: BulkInventoryUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();
    const isAutoAssign = AUTO_ASSIGN_ROLES.includes(userRole);
    const needsBranchSelection = !isAutoAssign;

    const [parsedParts, setParsedParts] = useState<ParsedPart[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState<any | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [branchError, setBranchError] = useState<string | null>(null);

    const fetchBranches = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const data = await getAllBranches({ type: 'WORKSHOP', limit: 100 });
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

    const validateRow = useCallback((row: any): { resolvedName: string; resolvedNumber: string; errors: string[] } => {
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

        const partNameVal = row['Name'] || row['name'] || row['Item Name'] || row['CF.Item Name'] || row['item name'] || row['partName'] || row['part name'] || '';
        const partNumberVal = row['SKU'] || row['Item ID'] || row['partNumber'] || row['part number'] || row['sku'] || '';

        if (!partNameVal || !String(partNameVal).trim()) {
            errors.push('Missing required field: Item Name');
        }

        if (!partNumberVal || !String(partNumberVal).trim()) {
            errors.push('Missing required field: SKU or Item ID');
        }

        const resolvedName = partNameVal ? String(partNameVal).trim() : '';
        const resolvedNumber = partNumberVal ? String(partNumberVal).trim().toUpperCase() : '';

        // Validate Rate (selling price)
        const rateRaw = row['Selling Rate'] || row['selling rate'] || row['Rate'] || row['rate'] || row['Selling Price'] || row['unitCost'];
        const rateVal = cleanNumber(rateRaw);
        if (rateRaw === undefined || rateRaw === '') {
            errors.push('Missing required field: Rate (selling price)');
        } else if (rateVal === undefined) {
            errors.push('Rate must be a numeric value.');
        }

        // Validate Purchase Rate if present
        const purchaseRateRaw = row['Purchase Rate'] || row['purchaseRate'] || row['PurchaseRate'] || row['purchase rate'];
        const purchaseRateVal = cleanNumber(purchaseRateRaw);
        if (purchaseRateRaw !== undefined && purchaseRateRaw !== '' && purchaseRateVal === undefined) {
            errors.push('Purchase Rate must be a numeric value.');
        }

        // Validate Opening Stock / Stock On Hand if present
        const stockRaw = row['Stock On Hand'] || row['Opening Stock'] || row['StockOnHand'] || row['OpeningStock'] || row['quantityOnHand'];
        const stockVal = cleanNumber(stockRaw);
        if (stockRaw !== undefined && stockRaw !== '' && stockVal === undefined) {
            errors.push('Stock On Hand must be a numeric value.');
        }

        // Validate Reorder Point if present
        const reorderRaw = row['Reorder Level'] || row['reorder level'] || row['Reorder Point'] || row['ReorderPoint'] || row['reorderLevel'];
        const reorderVal = cleanNumber(reorderRaw);
        if (reorderRaw !== undefined && reorderRaw !== '' && reorderVal === undefined) {
            errors.push('Reorder Point must be a numeric value.');
        }

        return { resolvedName, resolvedNumber, errors };
    }, []);

    const parse2DArrayToObjects = (aoa: any[][]): any[] => {
        if (!aoa || aoa.length === 0) return [];

        // Look for the first row containing one of our key indicators
        const targetHeaders = ['item name', 'sku', 'item id', 'rate', 'part number', 'partname'];
        let headerRowIdx = -1;

        for (let i = 0; i < aoa.length; i++) {
            const row = aoa[i];
            if (Array.isArray(row)) {
                const hasHeader = row.some(cell => {
                    if (cell === undefined || cell === null) return false;
                    const cleanCell = String(cell).trim().toLowerCase();
                    return targetHeaders.includes(cleanCell);
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

                    const rows: ParsedPart[] = jsonData.map(row => {
                        const { resolvedName, resolvedNumber, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _resolvedNumber: resolvedNumber,
                            _rowErrors: errors,
                        };
                    });
                    setParsedParts(rows);
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
                    const rows: ParsedPart[] = jsonData.map(row => {
                        const { resolvedName, resolvedNumber, errors } = validateRow(row);
                        return {
                            ...row,
                            _resolvedName: resolvedName,
                            _resolvedNumber: resolvedNumber,
                            _rowErrors: errors,
                        };
                    });
                    setParsedParts(rows);
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Parts");
            XLSX.writeFile(workbook, 'inventory_bulk_template.xlsx');
            toast.success('Excel template downloaded!');
            return;
        }

        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory_bulk_template.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV template downloaded!');
    };

    const handleSubmit = async () => {
        const validParts = parsedParts.filter(p => p._rowErrors.length === 0);
        if (validParts.length === 0) {
            toast.error('No valid rows to upload. Please fix errors first.');
            return;
        }

        if (needsBranchSelection && !selectedBranch) {
            // Check if any row overrides the location
            const hasMissingLocation = validParts.some(p => !p['Location Name'] && !p['LocationName']);
            if (hasMissingLocation) {
                setBranchError('Please select a default branch before uploading.');
                toast.error('Please select a default branch for rows missing Location Name.');
                return;
            }
        }
        setBranchError(null);

        setUploading(true);
        setUploadProgress(0);

        try {
            // Strip out internal fields before sending to API
            const payload = validParts.map(({ _rowErrors, _resolvedName, _resolvedNumber, ...rest }) => rest);
            const branchToSend = needsBranchSelection ? selectedBranch : undefined;

            let allCreated: any[] = [];
            let allErrors: any[] = [];

            const chunkSize = 50;
            const totalChunks = Math.ceil(payload.length / chunkSize);

            for (let i = 0; i < totalChunks; i++) {
                const chunk = payload.slice(i * chunkSize, (i + 1) * chunkSize);
                try {
                    const res = await bulkCreateParts(chunk, branchToSend);
                    const resData = res.data || res;
                    if (resData.created) {
                        allCreated.push(...resData.created);
                    }
                    if (resData.errors) {
                        const adjustedErrors = resData.errors.map((e: any) => ({
                            ...e,
                            row: i * chunkSize + e.row
                        }));
                        allErrors.push(...adjustedErrors);
                    }
                } catch (chunkErr: any) {
                    const errorMsg = chunkErr?.response?.data?.message || "Chunk upload failed";
                    chunk.forEach((_, idx) => {
                        allErrors.push({
                            row: i * chunkSize + idx + 1,
                            message: errorMsg
                        });
                    });
                }
                setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
            }

            const finalResult = {
                created: allCreated,
                errors: allErrors
            };
            setResult(finalResult);

            const msg = `${allCreated.length} part(s) synced successfully${allErrors.length > 0 ? `, ${allErrors.length} error(s)` : ''}.`;
            toast.success(msg);
            if (allCreated.length > 0) {
                onSuccess();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const getFailedRows = useCallback(() => {
        const frontendFailed = parsedParts.filter(p => p._rowErrors.length > 0);
        const validParts = parsedParts.filter(p => p._rowErrors.length === 0);
        const backendFailed = (result?.errors || []).map((err: any) => {
            const part = validParts[err.row - 1];
            return part ? { ...part, _rowErrors: [err.message] } : null;
        }).filter(Boolean) as ParsedPart[];
        return [...frontendFailed, ...backendFailed];
    }, [parsedParts, result]);

    const downloadFailedRows = useCallback(() => {
        const failed = getFailedRows();
        if (failed.length === 0) {
            toast.error('No failed rows to download.');
            return;
        }

        const exportData = failed.map(({ _rowErrors, _resolvedName, _resolvedNumber, ...rest }) => ({
            ...rest,
            'Upload Errors': _rowErrors.join('; ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Failed Rows");
        XLSX.writeFile(workbook, 'failed_inventory_rows.xlsx');
        toast.success('Failed rows downloaded successfully.');
    }, [getFailedRows]);

    const handleReset = () => {
        setParsedParts([]);
        setFileName('');
        setResult(null);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        handleReset();
        setSelectedBranch('');
        onClose();
    };

    const validCount = parsedParts.filter(p => p._rowErrors.length === 0).length;
    const errorCount = parsedParts.filter(p => p._rowErrors.length > 0).length;

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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ backgroundColor: 'rgba(212,241,46,0.1)' }}>
                            <Wrench size={20} className="text-[#D4F12E]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                Bulk Inventory Upload
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                Sync and upload inventory spreadsheets. Matches accounting codes, taxes, locations, and vendors dynamically.
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg transition-all hover:scale-110 bg-transparent border-none outline-none cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Branch Selector (for Admin / Country Manager roles) */}
                    {needsBranchSelection && !uploading && !result && (
                        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(212,241,46,0.02)' }}>
                            <label className="block text-[10px] uppercase font-black tracking-widest mb-2" style={{ color: 'var(--text-dim)' }}>
                                Default Branch (for parts without location name) *
                            </label>

                            {branchesLoading && (
                                <div className="flex items-center gap-2 py-2">
                                    <Loader2 size={16} className="animate-spin text-brand-lime" />
                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading branches…</span>
                                </div>
                            )}

                            {!branchesLoading && branches.length === 0 && (
                                <div className="flex flex-col items-center gap-3 py-4">
                                    <p className="text-xs font-medium text-center" style={{ color: 'var(--text-dim)' }}>
                                        No branches found. Please create a branch first.
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
                                            className="w-full px-4 py-2.5 pr-10 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">— Select default branch —</option>
                                            {branches.map(b => (
                                                <option key={b._id} value={b._id}>{b.name}</option>
                                            ))}
                                        </select>
                                        <Building2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" style={{ color: 'var(--text-main)' }} />
                                    </div>
                                    {branchError && (
                                        <p className="text-xs font-semibold mt-2 ml-1" style={{ color: '#ef4444' }}>
                                            {branchError}
                                        </p>
                                    )}
                                    {selectedBranch && (
                                        <p className="text-[11px] font-medium mt-2" style={{ color: 'var(--brand-lime)' }}>
                                            ✓ Parts missing custom Location Name columns will be assigned to <strong>{selectedBranchName}</strong>
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Auto-assign info */}
                    {isAutoAssign && !uploading && !result && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'rgba(212,241,46,0.2)', background: 'rgba(212,241,46,0.02)' }}>
                            <CheckCircle size={16} className="text-[#D4F12E]" />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                All parts will be assigned to your workspace branch unless overridden by Location Name in the Excel sheet.
                            </span>
                        </div>
                    )}

                    {/* Template Downloads */}
                    {!uploading && !result && (
                        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                            <Info size={16} className="text-[#D4F12E]" />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                Download template files to conform to inventory upload columns:
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
                            <Loader2 size={32} className="animate-spin text-[#D4F12E]" />
                            <div className="space-y-2 w-full max-w-md">
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                    Uploading Inventory Records... {uploadProgress}%
                                </p>
                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                    <div className="bg-[#D4F12E] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <p className="text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>
                                    Resolving accounts payable/receivable, taxes, and supplier connections. Please wait.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Drop Zone */}
                    {parsedParts.length === 0 && !result && !uploading && (
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
                                <Upload size={28} className="text-[#D4F12E]" />
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
                    {parsedParts.length > 0 && !result && !uploading && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xs font-bold text-main">File Preview: {fileName}</h3>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                                            {validCount} Ready
                                        </span>
                                        {errorCount > 0 && (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                {errorCount} Errors
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3 items-center">
                                    {errorCount > 0 && (
                                        <button
                                            onClick={downloadFailedRows}
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer"
                                        >
                                            <Download size={12} /> Download Failed Rows
                                        </button>
                                    )}
                                    <button onClick={handleReset} className="text-xs font-bold text-rose-400 hover:underline bg-transparent border-none cursor-pointer">
                                        Clear File
                                    </button>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <table className="w-full text-left border-collapse whitespace-nowrap text-[11px]">
                                    <thead>
                                        <tr className="border-b sticky top-0 bg-[#141414]" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 font-semibold text-dim">Row</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Status</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Part Number / SKU</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Part Name</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Selling Price (Rate)</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Stock</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Location</th>
                                            <th className="px-4 py-3 font-semibold text-dim">Vendor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {parsedParts.map((row, idx) => {
                                            const hasErrors = row._rowErrors.length > 0;
                                            const pNum = row._resolvedNumber || '—';
                                            const pName = row._resolvedName || '—';
                                            const rawRate = row['Selling Rate'] || row['selling rate'] || row['Rate'] || row['rate'] || row['Selling Price'];
                                            const rate = rawRate !== undefined && rawRate !== null ? String(rawRate).replace(/^[\$\€\£\¥\s]+/, '').trim() : '—';
                                            const stock = row['Stock On Hand'] || row['Opening Stock'] || '0';
                                            const locationName = row['Location Name'] || row['LocationName'] || '—';
                                            const vendor = row['Vendor'] || '—';

                                            return (
                                                <tr key={idx} className={`hover:bg-white/[0.01] ${hasErrors ? 'bg-rose-500/[0.02]' : ''}`}>
                                                    <td className="px-4 py-2 font-mono text-[10px] text-dim">{idx + 1}</td>
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
                                                    <td className="px-4 py-2 font-mono font-bold text-main uppercase">{pNum}</td>
                                                    <td className="px-4 py-2 font-bold text-main">{pName}</td>
                                                    <td className="px-4 py-2 text-dim">${rate}</td>
                                                    <td className="px-4 py-2 text-dim">{stock}</td>
                                                    <td className="px-4 py-2 text-dim">{locationName}</td>
                                                    <td className="px-4 py-2 text-dim">{vendor}</td>
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
                                    <h4 className="text-base font-bold text-main">Import Synced Successfully</h4>
                                    <p className="text-xs text-dim">The parts inventory has been updated or newly added to the database.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-3">
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Processed Records</p>
                                    <p className="text-2xl font-black text-emerald-400 mt-1">{result.created.length}</p>
                                </div>
                                <div className="p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-black uppercase tracking-wider text-dim">Rejected Rows</p>
                                    <p className="text-2xl font-black text-rose-400 mt-1">{result.errors.length}</p>
                                </div>
                            </div>

                            {result.errors.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> Failed Rows Log ({result.errors.length}):
                                    </p>
                                    <div className="border rounded-xl max-h-[140px] overflow-y-auto p-4 space-y-1.5 bg-black/35" style={{ borderColor: 'var(--border-main)' }}>
                                        {result.errors.map((err: any, idx: number) => (
                                            <div key={idx} className="text-[11px] leading-relaxed flex items-start gap-2">
                                                <span className="font-mono text-dim shrink-0">Row {err.row}:</span>
                                                <span className="text-rose-300/95 font-medium">{err.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-3">
                                {getFailedRows().length > 0 && (
                                    <button
                                        onClick={downloadFailedRows}
                                        className="px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-rose-500/10 cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <Download size={12} className="inline mr-1" /> Download Failed Rows
                                    </button>
                                )}
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
                {parsedParts.length > 0 && !result && !uploading && (
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
                            {uploading ? 'Processing Commit...' : `Import ${validCount} Part(s)`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkInventoryUpload;
