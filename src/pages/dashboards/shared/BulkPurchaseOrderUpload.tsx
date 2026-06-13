import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadPurchaseOrders } from '../../../services/purchaseOrderService';
import { getAllSuppliers } from '../../../services/supplierService';

interface ParsedPORow {
    [key: string]: any;
    _rowErrors: string[];
}

interface BulkPurchaseOrderUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Purchase Order ID', 'Purchase Order Date', 'Location ID', 'Location Name', 'Delivery Date',
    'Purchase Order Number', 'Reference#', 'Purchase Order Status', 'Vendor Name', 'Vendor Number',
    'Is Inclusive Tax', 'Currency Code', 'Exchange Rate', 'Template Name', 'Reference No',
    'Account', 'Account Code', 'Item Price', 'Item Name', 'Product ID', 'Item Desc',
    'QuantityOrdered', 'QuantityCancelled', 'QuantityReceived', 'QuantityBilled', 'Usage unit',
    'Line Item Location Name', 'Discount Type', 'Is Discount Before Tax', 'Discount', 'Discount Amount',
    'Tax ID', 'Item Tax', 'Item Tax %', 'Item Tax Amount', 'Item Tax Type', 'Item Total', 'Total',
    'Adjustment', 'Adjustment Description', 'Entity Discount Percent', 'Entity Discount Amount',
    'Payment Terms', 'Payment Terms Label', 'Attention', 'Country'
];

const SAMPLE_DATA = [
    {
        'Purchase Order Number': 'PO-000101',
        'Purchase Order Date': '2026-06-12',
        'Vendor Name': 'Acme Car Parts',
        'Vendor Number': 'VEND-001',
        'Location Name': 'Downtown Branch',
        'Item Name': 'Synthetic Engine Oil 5W-30',
        'Item Price': '45.00',
        'QuantityOrdered': '10',
        'Item Desc': 'High performance synthetic oil',
        'Purchase Order Status': 'Approved',
        'Reference#': 'REF-12345',
        'Account': 'Cost of Goods Sold',
        'Account Code': '5000'
    },
    {
        'Purchase Order Number': 'PO-000101',
        'Purchase Order Date': '2026-06-12',
        'Vendor Name': 'Acme Car Parts',
        'Vendor Number': 'VEND-001',
        'Location Name': 'Downtown Branch',
        'Item Name': 'Premium Oil Filter',
        'Item Price': '12.50',
        'QuantityOrdered': '10',
        'Item Desc': 'OEM specification oil filter',
        'Purchase Order Status': 'Approved',
        'Reference#': 'REF-12345',
        'Account': 'Cost of Goods Sold',
        'Account Code': '5000'
    }
];

const parseFlexibleDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    
    if (typeof dateStr === 'number') {
        const date = new Date((dateStr - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }

    const str = dateStr.toString().trim();
    if (!str) return null;

    const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }

    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }

    return null;
};

const getRowVal = (r: any, possibleKeys: string[]): any => {
    if (!r) return undefined;
    for (const key of possibleKeys) {
        const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
        if (r[key] !== undefined) return r[key];
        for (const k of Object.keys(r)) {
            const cleanK = k.replace(/^\ufeff/, '').trim().toLowerCase();
            if (cleanK === cleanKey) {
                return r[k];
            }
        }
    }
    return undefined;
};

const normalizeRowDates = (row: any): any => {
    const updated = { ...row };
    const dateVal = getRowVal(row, ['Purchase Order Date', 'purchaseOrderDate', 'Date', 'date']);
    const dateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'purchase order date' || l === 'date';
    }) || 'Purchase Order Date';
    
    if (dateVal) {
        const parsed = parseFlexibleDate(dateVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[dateKey] = `${yyyy}-${mm}-${dd}`;
        }
    }

    const itemVal = getRowVal(row, ['Item Name', 'itemName']);
    const itemKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'item name' || l === 'itemname';
    }) || 'Item Name';

    if (!itemVal) {
        updated[itemKey] = 'No Item Details';
    }

    return updated;
};

const BulkPurchaseOrderUpload = ({ isOpen, onClose, onSuccess }: BulkPurchaseOrderUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedPORow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [availableSupplierNames, setAvailableSupplierNames] = useState<Set<string>>(new Set());
    const [availableSupplierNumbers, setAvailableSupplierNumbers] = useState<Set<string>>(new Set());
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingSuppliers(true);
            getAllSuppliers({ limit: 100000 })
                .then(res => {
                    const list = Array.isArray(res.data) ? res.data : [];
                    const names = new Set(list.map(s => s.name?.toLowerCase().trim().replace(/\s+/g, ' ')).filter((n): n is string => !!n));
                    const numbers = new Set(list.map(s => s.vendorNumber?.toLowerCase().trim()).filter((num): num is string => !!num));
                    setAvailableSupplierNames(names);
                    setAvailableSupplierNumbers(numbers);
                    console.log(`[BulkPurchaseOrderUpload] Loaded ${names.size} suppliers for verification.`);
                })
                .catch(err => {
                    console.error('Failed to load supplier registry for validation', err);
                })
                .finally(() => {
                    setLoadingSuppliers(false);
                });
        } else {
            setAvailableSupplierNames(new Set());
            setAvailableSupplierNumbers(new Set());
            setLoadingSuppliers(false);
            setParsedRows([]);
            setFileName('');
            setResult(null);
        }
    }, [isOpen]);

    const matchNameFlexibly = (inputName: string, dbNames: Set<string>): boolean => {
        const cleanInput = inputName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
        if (!cleanInput) return false;
        
        if (dbNames.has(cleanInput)) return true;
        
        for (const dbName of dbNames) {
            const cleanDb = dbName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ');
            if (cleanDb === cleanInput || cleanDb.includes(cleanInput) || cleanInput.includes(cleanDb)) {
                return true;
            }
        }
        return false;
    };

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        


        // 3. Validate Quantity
        const qty = getRowVal(row, ['QuantityOrdered', 'quantityOrdered', 'Quantity', 'quantity']);
        if (qty === undefined || qty === null || qty === '') {
            errors.push('Quantity is required');
        } else {
            const parsedQty = parseFloat(qty);
            if (isNaN(parsedQty) || parsedQty <= 0) {
                errors.push('Quantity must be greater than 0');
            }
        }

        // 4. Validate Price
        const price = getRowVal(row, ['Item Price', 'itemPrice', 'unitPrice']);
        if (price === undefined || price === null || price === '') {
            errors.push('Item Price is required');
        } else {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                errors.push('Item Price must be greater than or equal to 0');
            }
        }

        // 5. Validate Date
        const date = getRowVal(row, ['Purchase Order Date', 'purchaseOrderDate', 'Date', 'date']);
        if (!date) {
            errors.push('Purchase Order Date is required');
        } else {
            const parsed = parseFlexibleDate(date);
            if (!parsed) {
                errors.push('Invalid Purchase Order Date (expected YYYY-MM-DD)');
            }
        }

        return errors;
    }, [availableSupplierNames, availableSupplierNumbers]);

    useEffect(() => {
        if (parsedRows.length > 0) {
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [availableSupplierNames, availableSupplierNumbers, validateRow]);

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
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    const rows: ParsedPORow[] = (jsonData as any[]).map(row => {
                        const trimmedRow: any = {};
                        for (const key of Object.keys(row)) {
                            trimmedRow[key.trim()] = row[key];
                        }
                        const normalized = normalizeRowDates(trimmedRow);
                        return {
                            ...normalized,
                            _rowErrors: validateRow(normalized),
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found in the Excel file.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
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
                    const rows: ParsedPORow[] = (results.data as any[]).map(row => {
                        const normalized = normalizeRowDates(row);
                        return {
                            ...normalized,
                            _rowErrors: validateRow(normalized),
                        };
                    });
                    setParsedRows(rows);
                    if (rows.length === 0) toast.error('No data rows found in the file.');
                    else toast.success(`Parsed ${rows.length} row(s) from ${file.name}`);
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

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "PurchaseOrdersTemplate");
            XLSX.writeFile(workbook, `purchase_orders_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase_orders_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async () => {
        const validRows = parsedRows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) {
            toast.error('No valid rows to upload. Fix errors first.');
            return;
        }

        const totalRowsCount = validRows.length;
        setUploading(true);
        setUploadProgress(0);
        setUploadStatusText(`Uploading purchase orders (0 / ${totalRowsCount} items)...`);

        const CHUNK_SIZE = 50; // Process 50 rows at a time
        const chunks: any[][] = [];
        for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
            const chunk = validRows.slice(i, i + CHUNK_SIZE).map(({ _rowErrors, ...rest }) => rest);
            chunks.push(chunk);
        }

        const finalResult = {
            successCount: 0,
            updatedCount: 0,
            errorCount: 0,
            skippedCount: 0,
            errors: [] as string[],
            skipped: [] as string[],
            createdPOs: [] as string[]
        };

        try {
            let processedRowsCount = 0;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunk = chunks[chunkIdx];
                const res = await bulkUploadPurchaseOrders({ rows: chunk });
                const data = res.data || {};
                
                finalResult.successCount += data.successCount || 0;
                finalResult.updatedCount += data.updatedCount || 0;
                finalResult.errorCount += data.errorCount || 0;
                finalResult.skippedCount += data.skippedCount || 0;
                if (data.errors) finalResult.errors.push(...data.errors);
                if (data.skipped) finalResult.skipped.push(...data.skipped);
                if (data.createdPOs) finalResult.createdPOs.push(...data.createdPOs);

                processedRowsCount += chunk.length;
                setUploadProgress(Math.round((processedRowsCount / totalRowsCount) * 100));
                setUploadStatusText(`Uploading purchase orders (${processedRowsCount} / ${totalRowsCount})...`);
            }

            setResult(finalResult);

            if (finalResult.successCount > 0 || finalResult.updatedCount > 0) {
                const parts = [];
                if (finalResult.successCount > 0) parts.push(`${finalResult.successCount} created`);
                if (finalResult.updatedCount > 0) parts.push(`${finalResult.updatedCount} updated`);
                toast.success(`Purchase Orders: ${parts.join(', ')}.`);
                if (finalResult.errorCount === 0) {
                    onSuccess();
                }
            } else if (finalResult.errorCount > 0) {
                toast.error(`Completed with ${finalResult.errorCount} errors.`);
            } else {
                toast.success('Upload complete.');
                onSuccess();
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
            setUploadProgress(100);
            setUploadStatusText('');
        }
    };

    const handleReset = () => {
        setParsedRows([]);
        setFileName('');
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveRow = (index: number) => {
        setParsedRows(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    const errorRowsCount = parsedRows.filter(r => r._rowErrors.length > 0).length;
    const validRowsCount = parsedRows.length - errorRowsCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl animate-scale-up"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                        <div>
                            <h2 className="text-base font-black tracking-tight text-main">Purchase Order Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch purchase orders, resolve vendor matching, select line item locations, and parse custom fields into PO descriptions.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={uploading}
                        className="p-1.5 rounded-lg transition-colors hover:bg-input text-dim hover:text-main border-none bg-transparent cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Step 1: Upload / Template Section */}
                    {parsedRows.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Drag & Drop Area */}
                            <div className="md:col-span-2">
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer min-h-[260px] ${
                                        dragOver ? 'border-brand-lime bg-lime-500/5' : 'border-border bg-card hover:bg-input/30'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)' }}
                                >
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                    />
                                    {loadingSuppliers ? (
                                        <div className="space-y-3">
                                            <Loader2 className="h-10 w-10 animate-spin text-main mx-auto" />
                                            <p className="text-xs font-bold text-main">Caching supplier registry for validation...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                                                <Upload className="h-6 w-6" style={{ color: 'var(--brand-lime)' }} />
                                            </div>
                                            <h3 className="text-sm font-bold text-main mb-1">Upload your bulk purchase orders file</h3>
                                            <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                            <div className="text-[10px] text-dim/60 space-y-0.5">
                                                <p>Supports .xlsx, .xls, and .csv files.</p>
                                                <p>Groups items sharing the same Purchase Order Number or ID.</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Template Download Card */}
                            <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                                        <h3 className="text-sm font-black text-main">Bulk Data Templates</h3>
                                    </div>
                                    <p className="text-xs text-dim leading-relaxed">
                                        Please use our standard template headers. Match supplier records using either `Vendor Name` or `Vendor Number`.
                                    </p>
                                    <div className="bg-card/40 rounded-lg p-3 border space-y-1.5" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex justify-between text-[10px] font-bold text-dim">
                                            <span>Required Fields:</span>
                                            <span style={{ color: 'var(--brand-lime)' }}>Strict validation</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Purchase Order Number', 'Vendor Name', 'Item Name', 'Item Price', 'QuantityOrdered'].map(f => (
                                                <span key={f} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4">
                                    <button
                                        onClick={() => downloadTemplate('xlsx')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                    >
                                        <Download className="h-4 w-4" /> Download Excel Template
                                    </button>
                                    <button
                                        onClick={() => downloadTemplate('csv')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border hover:bg-input cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                    >
                                        <Download className="h-4 w-4" /> Download CSV Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Step 2: Data Review and Summary */
                        <div className="space-y-4">
                            {/* Summary Status Bar */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border" 
                                 style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                    <span className="text-dim">File: <strong className="text-main">{fileName}</strong></span>
                                    <span className="text-dim">Total Rows: <strong className="text-main">{parsedRows.length}</strong></span>
                                    <span className="text-green-500">Valid Rows: {validRowsCount}</span>
                                    {errorRowsCount > 0 && <span className="text-red-500">Errors: {errorRowsCount}</span>}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleReset}
                                        disabled={uploading}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer transition-colors bg-transparent text-main"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        Clear and Restart
                                    </button>
                                </div>
                            </div>

                            {/* Results Report Display */}
                            {result && (
                                <div className="rounded-xl border p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                    <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                                        <CheckCircle className="h-5 w-5" />
                                        <span>Upload Completed Successfully!</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4 text-xs">
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-green-500">{result.successCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Created</p>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-blue-500">{result.updatedCount || 0}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Updated (Items Added)</p>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-dim">{result.skippedCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Skipped</p>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            <p className="text-lg font-black text-red-500">{result.errorCount}</p>
                                            <p className="text-[9px] uppercase tracking-wider text-dim">Failed</p>
                                        </div>
                                    </div>
                                    {(result.errors.length > 0 || result.skipped.length > 0) && (
                                        <div className="mt-3 p-3 rounded-lg bg-input border space-y-2 max-h-[160px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                            {result.skipped.map((skip: string, idx: number) => (
                                                <div key={`skip-${idx}`} className="text-[10px] text-dim flex items-center gap-1.5">
                                                    <Info className="h-3 w-3 shrink-0 text-blue-500" />
                                                    <span>{skip}</span>
                                                </div>
                                            ))}
                                            {result.errors.map((err: string, idx: number) => (
                                                <div key={`err-${idx}`} className="text-[10px] text-red-500 flex items-center gap-1.5 font-medium">
                                                    <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                                                    <span>{err}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Upload Progress Loader */}
                            {uploading && (
                                <div className="space-y-2 p-4 rounded-xl border bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-main">{uploadStatusText}</span>
                                        <span style={{ color: 'var(--brand-lime)' }}>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden bg-input">
                                        <div 
                                            className="h-full rounded-full transition-all duration-300"
                                            style={{ backgroundColor: 'var(--brand-lime)', width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Table List of parsed rows */}
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="border-b" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                                <th className="p-3 font-bold">Row</th>
                                                <th className="p-3 font-bold">PO Number</th>
                                                <th className="p-3 font-bold">Vendor Name</th>
                                                <th className="p-3 font-bold">Item Name</th>
                                                <th className="p-3 font-bold">Qty</th>
                                                <th className="p-3 font-bold">Price</th>
                                                <th className="p-3 font-bold">Validation Status</th>
                                                <th className="p-3 font-bold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const poNumber = getRowVal(row, ['Purchase Order Number', 'purchaseOrderNumber', 'Purchase Order ID', 'purchaseOrderId']);
                                                const vName = getRowVal(row, ['Vendor Name', 'vendorName', 'supplier']);
                                                const itemName = getRowVal(row, ['Item Name', 'itemName']);
                                                const qtyVal = getRowVal(row, ['QuantityOrdered', 'quantityOrdered', 'Quantity', 'quantity']);
                                                const priceVal = getRowVal(row, ['Item Price', 'itemPrice', 'unitPrice']);

                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-main">{poNumber || 'Auto-generated'}</td>
                                                        <td className="p-3 text-main font-bold">{vName || <span className="text-red-500 font-bold">Missing</span>}</td>
                                                        <td className="p-3 text-main">{itemName || <span className="text-red-500">Missing</span>}</td>
                                                        <td className="p-3 text-main font-bold">{qtyVal || 0}</td>
                                                        <td className="p-3 text-main font-bold">${priceVal || 0}</td>
                                                        <td className="p-3">
                                                            {hasErrors ? (
                                                                <div className="space-y-1">
                                                                    {row._rowErrors.map((err, errIdx) => (
                                                                        <div key={errIdx} className="flex items-start gap-1 text-[10px] text-red-500 font-bold leading-tight">
                                                                            <AlertTriangle className="h-3 w-3 shrink-0 text-red-500 mt-0.5" />
                                                                            <span>{err}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 text-green-500 font-bold text-[10px]">
                                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                                    <span>Ready</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <button 
                                                                onClick={() => handleRemoveRow(idx)}
                                                                disabled={uploading}
                                                                className="p-1 rounded bg-transparent hover:bg-input text-dim hover:text-red-500 transition-colors border-none cursor-pointer disabled:opacity-50"
                                                                title="Remove row"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Control Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={result ? onClose : handleReset}
                                    disabled={uploading}
                                    className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer bg-transparent text-main"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    {result ? 'Close' : 'Cancel'}
                                </button>
                                {!result && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={uploading || parsedRows.length === 0 || errorRowsCount > 0}
                                        className="px-6 py-2 rounded-lg text-xs font-bold transition-all text-black hover:scale-[1.02] cursor-pointer disabled:opacity-50 disabled:scale-100"
                                        style={{ background: 'var(--brand-lime)' }}
                                    >
                                        {uploading ? (
                                            <span className="flex items-center gap-1.5">
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                Importing...
                                            </span>
                                        ) : (
                                            `Submit ${validRowsCount} Record(s)`
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkPurchaseOrderUpload;
