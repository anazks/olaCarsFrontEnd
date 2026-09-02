import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadBills } from '../../../services/billService';
import { getAllSuppliers } from '../../../services/supplierService';
import { getAllAccountingCodes, type AccountingCode } from '../../../services/accountingService';
import { getAllTaxes, type Tax } from '../../../services/taxService';

interface ParsedBillRow {
    [key: string]: any;
    _rowErrors: string[];
}

interface BulkBillUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CSV_COLUMNS = [
    'Bill Number',
    'Bill Date',
    'Due Date',
    'Vendor Name',
    'Branch Name',
    'Purchase Type',
    'Debit Account',
    'Item Name',
    'Quantity',
    'Rate',
    'Item Tax',
    'Item Tax %',
    'Item Tax Type',
    'Description'
];

const SAMPLE_DATA = [
    {
        'Bill Number': 'BILL-000101',
        'Bill Date': '2026-06-12',
        'Due Date': '2026-07-12',
        'Vendor Name': 'Acme Car Parts',
        'Branch Name': 'Downtown Branch',
        'Purchase Type': 'Cash',
        'Debit Account': '6.1.09',
        'Item Name': 'Office Supplies',
        'Quantity': '5',
        'Rate': '50.00',
        'Item Tax': 'Standard Rate',
        'Item Tax %': '16',
        'Item Tax Type': 'TRUE',
        'Description': 'Stationery and paper supplies'
    },
    {
        'Bill Number': 'BILL-000102',
        'Bill Date': '2026-06-15',
        'Due Date': '2026-07-15',
        'Vendor Name': 'Tech Solutions Ltd',
        'Branch Name': 'Downtown Branch',
        'Purchase Type': 'Bank',
        'Debit Account': 'FA0001',
        'Item Name': 'Office Furniture',
        'Quantity': '1',
        'Rate': '1200.00',
        'Item Tax': 'Standard Rate',
        'Item Tax %': '16',
        'Item Tax Type': 'FALSE',
        'Description': 'Ergonomic office desk set'
    },
    {
        'Bill Number': 'BILL-000103',
        'Bill Date': '2026-06-18',
        'Due Date': '2026-08-18',
        'Vendor Name': 'Speedy Auto Parts',
        'Branch Name': 'Downtown Branch',
        'Purchase Type': 'Credit',
        'Debit Account': 'EXP0006',
        'Item Name': 'Brake Pads, Oil Filters, Spark Plugs',
        'Quantity': '20, 30, 50',
        'Rate': '25.00, 12.00, 8.00',
        'Item Tax': 'Standard Rate',
        'Item Tax %': '16',
        'Item Tax Type': 'FALSE',
        'Description': 'Bulk spare parts order on credit'
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
    
    // Normalize Bill Date
    const billDateVal = getRowVal(row, ['Bill Date', 'billDate', 'Date', 'date']);
    const billDateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'bill date' || l === 'date';
    }) || 'Bill Date';
    
    if (billDateVal) {
        const parsed = parseFlexibleDate(billDateVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[billDateKey] = `${yyyy}-${mm}-${dd}`;
        }
    }

    // Normalize Due Date
    const dueDateVal = getRowVal(row, ['Due Date', 'dueDate']);
    const dueDateKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'due date';
    }) || 'Due Date';
    
    if (dueDateVal) {
        const parsed = parseFlexibleDate(dueDateVal);
        if (parsed) {
            const yyyy = parsed.getFullYear();
            const mm = String(parsed.getMonth() + 1).padStart(2, '0');
            const dd = String(parsed.getDate()).padStart(2, '0');
            updated[dueDateKey] = `${yyyy}-${mm}-${dd}`;
        }
    }

    // Default item details - prioritize Item Name
    const itemVal = getRowVal(row, ['Item Name', 'itemName', 'Item', 'item', 'Description', 'description']);
    const itemKey = Object.keys(row).find(k => {
        const l = k.trim().toLowerCase();
        return l === 'item name' || l === 'itemname' || l === 'item' || l === 'description';
    }) || 'Item Name';

    if (!itemVal) {
        updated[itemKey] = 'No Item Details';
    }

    return updated;
};

const BulkBillUpload = ({ isOpen, onClose, onSuccess }: BulkBillUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedBillRow[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [availableSupplierNames, setAvailableSupplierNames] = useState<Set<string>>(new Set());
    const [availableSupplierNumbers, setAvailableSupplierNumbers] = useState<Set<string>>(new Set());
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [availableTaxes, setAvailableTaxes] = useState<Tax[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoadingSuppliers(true);
            Promise.all([
                getAllSuppliers({ limit: 100000 }),
                getAllAccountingCodes(),
                getAllTaxes()
            ])
                .then(([supRes, codeRes, taxRes]) => {
                    const list = Array.isArray(supRes.data) ? supRes.data : [];
                    const names = new Set(list.map(s => s.name?.toLowerCase().trim().replace(/\s+/g, ' ')).filter((n): n is string => !!n));
                    const numbers = new Set(list.map(s => s.vendorNumber?.toLowerCase().trim()).filter((num): num is string => !!num));
                    setAvailableSupplierNames(names);
                    setAvailableSupplierNumbers(numbers);
                    setAccountingCodes(codeRes || []);
                    setAvailableTaxes(Array.isArray(taxRes) ? taxRes : []);
                    console.log(`[BulkBillUpload] Loaded ${names.size} suppliers, ${(codeRes || []).length} accounting codes, and ${(Array.isArray(taxRes) ? taxRes : []).length} tax profiles.`);
                })
                .catch(err => {
                    console.error('Failed to load supplier/accounting/tax registries for validation', err);
                })
                .finally(() => {
                    setLoadingSuppliers(false);
                });
        } else {
            setAvailableSupplierNames(new Set());
            setAvailableSupplierNumbers(new Set());
            setAccountingCodes([]);
            setAvailableTaxes([]);
            setLoadingSuppliers(false);
            setParsedRows([]);
            setFileName('');
            setResult(null);
        }
    }, [isOpen]);

    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        
        // Validate Quantity (supports comma-separated)
        const qty = getRowVal(row, ['Quantity', 'quantity']);
        if (qty !== undefined && qty !== null && qty !== '') {
            const qtyParts = qty.toString().split(',').map((s: string) => s.trim()).filter(Boolean);
            for (const q of qtyParts) {
                const parsedQty = parseFloat(q);
                if (isNaN(parsedQty) || parsedQty <= 0) {
                    errors.push(`Quantity "${q}" must be greater than 0`);
                }
            }
        }

        // Validate Price/Rate (supports comma-separated)
        const price = getRowVal(row, ['Rate', 'rate', 'Item Price', 'itemPrice', 'unitPrice']);
        if (price !== undefined && price !== null && price !== '') {
            const priceParts = price.toString().split(',').map((s: string) => s.trim()).filter(Boolean);
            for (const p of priceParts) {
                const parsedPrice = parseFloat(p);
                if (isNaN(parsedPrice) || parsedPrice < 0) {
                    errors.push(`Rate "${p}" must be greater than or equal to 0`);
                }
            }
        }

        // Validate Bill Date
        const date = getRowVal(row, ['Bill Date', 'billDate', 'Date', 'date']);
        if (date) {
            const parsed = parseFlexibleDate(date);
            if (!parsed) {
                errors.push('Invalid Bill Date (expected YYYY-MM-DD)');
            }
        }

        // Validate Due Date
        const dueDate = getRowVal(row, ['Due Date', 'dueDate']);
        if (dueDate) {
            const parsed = parseFlexibleDate(dueDate);
            if (!parsed) {
                errors.push('Invalid Due Date (expected YYYY-MM-DD)');
            }
        }

        // Validate Debit Account
        const debitAccVal = getRowVal(row, ['Debit Account', 'debitAccount', 'Debit Account Code', 'debitAccountCode', 'Account Code', 'accountCode', 'Account']);
        if (!debitAccVal) {
            errors.push('Debit Account is required');
        } else if (accountingCodes.length > 0) {
            const cleanDebit = debitAccVal.toString().trim().toLowerCase();
            const foundDebit = accountingCodes.find(a => 
                a.code?.toLowerCase().trim() === cleanDebit || 
                a.name?.toLowerCase().trim().replace(/\s+/g, ' ') === cleanDebit
            );
            if (!foundDebit) {
                errors.push(`Debit Account "${debitAccVal}" not found in Chart of Accounts`);
            }
        }

        // Validate Purchase Type & Credit Account
        const purchaseType = getRowVal(row, ['Purchase Type', 'purchaseType', 'Bill Type', 'billType']);
        if (purchaseType) {
            const rawNormalized = purchaseType.toString().trim().toUpperCase();
            const validTypes = ['CASH', 'BANK', 'CREDIT', 'CASH PURCHASE', 'BANK PURCHASE', 'BANK TRANSFER', 'CREDIT PURCHASE', 'ON CREDIT', 'PAYABLE'];
            if (!validTypes.includes(rawNormalized)) {
                errors.push(`Invalid Purchase Type "${purchaseType}" (expected Cash, Bank, or Credit)`);
            }
        }

        // Credit Account is optional (defaults to 2.1.01 - Accounts Payable on creation)
        const creditAccVal = getRowVal(row, ['Credit Account', 'Credit Account Code', 'creditAccountCode', 'creditAccount', 'Accounts Payable']);
        if (creditAccVal && accountingCodes.length > 0) {
            const cleanCredit = creditAccVal.toString().trim().toLowerCase();
            const foundCredit = accountingCodes.find(a => 
                a.code?.toLowerCase().trim() === cleanCredit || 
                a.name?.toLowerCase().trim().replace(/\s+/g, ' ') === cleanCredit
            );
            if (!foundCredit) {
                errors.push(`Credit Account "${creditAccVal}" not found in Chart of Accounts`);
            }
        }

        // Validate Item Tax Profile, Tax %, and Tax Inclusivity
        const rawTaxName = getRowVal(row, ['Item Tax', 'itemTax', 'Tax Name', 'taxName', 'Tax Profile', 'taxProfile']);
        const rawTaxRate = getRowVal(row, ['Item Tax %', 'itemTaxPct', 'Tax Percentage', 'taxPercentage', 'taxRate']);
        const rawTaxType = getRowVal(row, ['Item Tax Type', 'itemTaxType', 'item_tax_type', 'Is Inclusive Tax', 'isInclusiveTax']);

        if (rawTaxType !== undefined && rawTaxType !== null && String(rawTaxType).trim() !== '') {
            const cleanType = String(rawTaxType).trim().toLowerCase();
            const validBooleans = ['true', 'false', '1', '0', 'yes', 'no', 'inclusive', 'exclusive'];
            if (!validBooleans.includes(cleanType)) {
                errors.push(`Invalid Item Tax Type "${rawTaxType}" (expected TRUE or FALSE)`);
            }
        }

        if (availableTaxes.length > 0) {
            if (rawTaxName && String(rawTaxName).trim() !== '') {
                const cleanTaxName = String(rawTaxName).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                const foundTax = availableTaxes.find(t => {
                    const norm = (t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return norm === cleanTaxName || norm.includes(cleanTaxName) || cleanTaxName.includes(norm);
                });
                if (!foundTax) {
                    errors.push(`Tax profile "${rawTaxName}" not found in system`);
                } else if (rawTaxRate !== undefined && rawTaxRate !== null && String(rawTaxRate).trim() !== '') {
                    let enteredRate = parseFloat(String(rawTaxRate));
                    if (!isNaN(enteredRate)) {
                        if (enteredRate > 0 && enteredRate < 1) enteredRate = enteredRate * 100;
                        if (Math.abs(foundTax.rate - enteredRate) > 0.01) {
                            errors.push(`Tax percentage ${enteredRate}% does not match "${foundTax.name}" profile rate (${foundTax.rate}%)`);
                        }
                    }
                }
            } else if (rawTaxRate !== undefined && rawTaxRate !== null && String(rawTaxRate).trim() !== '') {
                let enteredRate = parseFloat(String(rawTaxRate));
                if (!isNaN(enteredRate)) {
                    if (enteredRate > 0 && enteredRate < 1) enteredRate = enteredRate * 100;
                    const foundTaxByRate = availableTaxes.find(t => Math.abs(t.rate - enteredRate) < 0.01);
                    if (!foundTaxByRate) {
                        errors.push(`No tax profile found with rate ${enteredRate}%`);
                    }
                }
            }
        }

        return errors;
    }, [accountingCodes, availableTaxes]);

    useEffect(() => {
        if (parsedRows.length > 0) {
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [availableSupplierNames, availableSupplierNumbers, accountingCodes, availableTaxes, validateRow]);

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
                    
                    const rows: ParsedBillRow[] = (jsonData as any[]).map(row => {
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
                    const rows: ParsedBillRow[] = (results.data as any[]).map(row => {
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "BillsTemplate");
            XLSX.writeFile(workbook, `bills_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bills_bulk_template.csv`;
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
        setUploadStatusText(`Uploading bills (0 / ${totalRowsCount} items)...`);

        const CHUNK_SIZE = 50;
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
            createdBills: [] as string[]
        };

        try {
            let processedRowsCount = 0;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const chunk = chunks[chunkIdx];
                const res = await bulkUploadBills({ rows: chunk });
                const data = res.data || {};
                
                finalResult.successCount += data.successCount || 0;
                finalResult.updatedCount += data.updatedCount || 0;
                finalResult.errorCount += data.errorCount || 0;
                finalResult.skippedCount += data.skippedCount || 0;
                if (data.errors) finalResult.errors.push(...data.errors);
                if (data.skipped) finalResult.skipped.push(...data.skipped);
                if (data.createdBills) finalResult.createdBills.push(...data.createdBills);

                processedRowsCount += chunk.length;
                setUploadProgress(Math.round((processedRowsCount / totalRowsCount) * 100));
                setUploadStatusText(`Uploading bills (${processedRowsCount} / ${totalRowsCount})...`);
            }

            setResult(finalResult);

            if (finalResult.successCount > 0 || finalResult.updatedCount > 0) {
                const parts = [];
                if (finalResult.successCount > 0) parts.push(`${finalResult.successCount} created`);
                if (finalResult.updatedCount > 0) parts.push(`${finalResult.updatedCount} updated`);
                toast.success(`Bills: ${parts.join(', ')}.`);
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
                            <h2 className="text-base font-black tracking-tight text-main">Bill Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Upload batch Bills, resolve vendor matching, select accounts, and parse custom fields into bill notes.</p>
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
                                            <h3 className="text-sm font-bold text-main mb-1">Upload your bulk bills file</h3>
                                            <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                            <div className="text-[10px] text-dim/60 space-y-0.5">
                                                <p>Supports .xlsx, .xls, and .csv files.</p>
                                                <p>Groups items sharing the same Bill Number.</p>
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
                                            <span>Key Fields:</span>
                                            <span style={{ color: 'var(--brand-lime)' }}>Loose validation</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {['Bill Number', 'Vendor Name', 'Rate', 'Quantity'].map(f => (
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
                                                <th className="p-3 font-bold">Bill Number</th>
                                                <th className="p-3 font-bold">Vendor Name</th>
                                                <th className="p-3 font-bold">Item Name</th>
                                                <th className="p-3 font-bold">Qty</th>
                                                <th className="p-3 font-bold">Rate</th>
                                                <th className="p-3 font-bold">Purchase Type</th>
                                                <th className="p-3 font-bold">Debit Account</th>
                                                <th className="p-3 font-bold">Credit Account</th>
                                                <th className="p-3 font-bold">Tax Profile</th>
                                                <th className="p-3 font-bold">Validation Status</th>
                                                <th className="p-3 font-bold text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                            {parsedRows.map((row, idx) => {
                                                const hasErrors = row._rowErrors.length > 0;
                                                const billNumber = getRowVal(row, ['Bill Number', 'billNumber']);
                                                const vName = getRowVal(row, ['Vendor Name', 'vendorName', 'supplier']);
                                                const itemNameVal = getRowVal(row, ['Item Name', 'itemName', 'Item', 'item']);
                                                const descVal = getRowVal(row, ['Description', 'description']);
                                                const qtyVal = getRowVal(row, ['Quantity', 'quantity']);
                                                const priceVal = getRowVal(row, ['Rate', 'rate', 'unitPrice']);
                                                const debitAccCode = getRowVal(row, ['Debit Account', 'debitAccount', 'Debit Account Code', 'debitAccountCode', 'Account Code', 'accountCode', 'Account']);
                                                const pType = (getRowVal(row, ['Purchase Type', 'purchaseType', 'Bill Type', 'billType']) || 'Credit').toString().trim();
                                                const creditAccCode = getRowVal(row, ['Credit Account', 'creditAccount', 'Credit Account Code', 'creditAccountCode', 'Accounts Payable']);
                                                const taxNameVal = getRowVal(row, ['Item Tax', 'itemTax', 'Tax Name', 'taxName', 'Tax Profile', 'taxProfile']);
                                                const taxRateVal = getRowVal(row, ['Item Tax %', 'itemTaxPct', 'Tax Percentage', 'taxPercentage', 'taxRate']);
                                                const rawTaxType = getRowVal(row, ['Item Tax Type', 'itemTaxType', 'item_tax_type', 'Is Inclusive Tax', 'isInclusiveTax']);
                                                const isInc = (rawTaxType === true || rawTaxType === 1 || String(rawTaxType).toLowerCase() === 'true' || String(rawTaxType).toLowerCase() === 'yes' || String(rawTaxType).toLowerCase() === 'inclusive');
                                                const pTypeNorm = pType.toUpperCase().includes('CASH') ? 'Cash' : pType.toUpperCase().includes('BANK') ? 'Bank' : 'Credit';
                                                const pTypeBadgeStyle = pTypeNorm === 'Cash' ? { background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' } : pTypeNorm === 'Bank' ? { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' } : { background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };

                                                return (
                                                    <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                                                        <td className="p-3 text-dim font-medium">{idx + 1}</td>
                                                        <td className="p-3 font-bold text-main">{billNumber || 'Auto-generated'}</td>
                                                        <td className="p-3 text-main font-bold">{vName || <span className="text-dim/60 italic">Fallback (captured in notes)</span>}</td>
                                                        <td className="p-3 text-main">
                                                            <div className="font-bold">{itemNameVal || descVal || 'No Item Details'}</div>
                                                            {descVal && itemNameVal && descVal !== itemNameVal && (
                                                                <div className="text-[10px] text-dim/70 italic max-w-xs truncate">{descVal}</div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-main font-bold">{qtyVal || 1}</td>
                                                        <td className="p-3 text-main font-bold">${priceVal || 0}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={pTypeBadgeStyle}>{pTypeNorm}</span>
                                                        </td>
                                                        <td className="p-3 text-main text-[10px] font-medium">{debitAccCode || <span className="text-dim/60 italic">Default</span>}</td>
                                                        <td className="p-3 text-main text-[10px] font-medium">{creditAccCode || <span className="text-dim/80 italic font-normal">2.1.01 (Accounts Payable)</span>}</td>
                                                        <td className="p-3 text-main text-[10px]">
                                                            {taxNameVal || taxRateVal ? (
                                                                <div className="space-y-0.5">
                                                                    <div className="font-bold text-main">{taxNameVal || 'Tax Applied'}</div>
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        {taxRateVal !== undefined && taxRateVal !== null && taxRateVal !== '' && (
                                                                            <span className="font-bold text-[#C8E600]">{taxRateVal}%</span>
                                                                        )}
                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isInc ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
                                                                            {isInc ? 'Inclusive' : 'Exclusive'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-dim/60 italic">None</span>
                                                            )}
                                                        </td>
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

export default BulkBillUpload;
