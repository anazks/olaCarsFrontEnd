import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle2, RefreshCw, FileText, Download, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { bulkUploadDebitNotes, getAllDebitNotes } from '../../../services/debitNoteService';
import { getAllCustomers } from '../../../services/customerService';
import { getAllSuppliers } from '../../../services/supplierService';
import { getInvoices } from '../../../services/invoiceService';

interface ParsedDebitNoteRow {
    [key: string]: any;
    _rowErrors?: string[];
}

interface BulkDebitNoteUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface InvoiceVerification {
    exists: boolean;
    customerId?: string;
    customerName?: string;
    driverId?: string;
    status?: string;
}

const CSV_COLUMNS = [
    'Debit Note Date', 'Debit Note Number', 'Customer Name', 'Customer ID', 'Customer Number',
    'Vendor Name', 'Vendor Number', 'Total', 'Reason', 'Notes', 'Applied Invoice Number',
    'Tax ID', 'Item Tax', 'Item Tax %', 'Item Tax Amount', 'Status', 'Is Deposit'
];

const SAMPLE_DATA = [
    {
        'Debit Note Date': '25.07.26',
        'Debit Note Number': 'DN-000101',
        'Customer Name': 'John Smith',
        'Customer ID': 'CU-10001',
        'Customer Number': '+254700000001',
        'Vendor Name': '',
        'Vendor Number': '',
        'Total': '150.00',
        'Reason': 'Late Return Charge',
        'Notes': 'Additional day rental debit fee',
        'Applied Invoice Number': '',
        'Tax ID': 'TAX16',
        'Item Tax': 'VAT 16%',
        'Item Tax %': '16',
        'Item Tax Amount': '24.00',
        'Status': 'PENDING',
        'Is Deposit': 'FALSE'
    },
    {
        'Debit Note Date': '25.07.26',
        'Debit Note Number': 'DP-000102',
        'Customer Name': 'Maria Garcia',
        'Customer ID': 'CU-10002',
        'Customer Number': '+254711223344',
        'Vendor Name': '',
        'Vendor Number': '',
        'Total': '75.50',
        'Reason': 'Damage / Repair Charge',
        'Notes': 'Interior detailing and scratch repair surcharge',
        'Applied Invoice Number': '',
        'Tax ID': '',
        'Item Tax': '',
        'Item Tax %': '0',
        'Item Tax Amount': '0.00',
        'Status': 'PENDING',
        'Is Deposit': 'TRUE'
    },
    {
        'Debit Note Date': '26.07.26',
        'Debit Note Number': 'DN-VND-001',
        'Customer Name': '',
        'Customer ID': '',
        'Customer Number': '',
        'Vendor Name': 'Acme Auto Supplies',
        'Vendor Number': 'VEND-001',
        'Total': '220.00',
        'Reason': 'Defective Parts Return',
        'Notes': 'Debit note issued for defective brake pads return',
        'Applied Invoice Number': '',
        'Tax ID': 'TAX16',
        'Item Tax': 'VAT 16%',
        'Item Tax %': '16',
        'Item Tax Amount': '35.20',
        'Status': 'PENDING',
        'Is Deposit': 'FALSE'
    }
];

const parseFlexibleDate = (dateVal: any): Date | null => {
    if (!dateVal && dateVal !== 0) return null;
    if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;

    // Check if it's a numeric Excel serial date (e.g. 46337 or "46337")
    const num = typeof dateVal === 'number' 
        ? dateVal 
        : (typeof dateVal === 'string' && /^\d{4,6}(\.\d+)?$/.test(dateVal.trim()) ? parseFloat(dateVal.trim()) : null);
    if (num !== null && !isNaN(num) && num > 10000 && num < 100000) {
        // Excel base date: 1899-12-30 (accounts for Excel 1900 leap year bug)
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        return isNaN(date.getTime()) ? null : date;
    }

    const str = dateVal.toString().trim();
    if (!str) return null;

    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymdRegex = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
    let match = str.match(ymdRegex);
    if (match) {
        return new Date(Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10)));
    }

    // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY or DD.MM.YY or DD-MM-YY
    const dmyRegex = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/;
    match = str.match(dmyRegex);
    if (match) {
        let yr = parseInt(match[3], 10);
        if (yr < 100) {
            yr += yr < 50 ? 2000 : 1900;
        }
        return new Date(Date.UTC(yr, parseInt(match[2], 10) - 1, parseInt(match[1], 10)));
    }

    const parsedDate = new Date(str);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDisplayDate = (dateVal: any): string => {
    const d = parseFlexibleDate(dateVal);
    if (!d) return dateVal ? String(dateVal) : '—';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = String(d.getUTCFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
};

const getRowVal = (r: any, possibleKeys: string[]): any => {
    if (!r) return undefined;
    const normalize = (s: string) => (s || '').toString().replace(/^\ufeff/, '').trim().toLowerCase().replace(/[\s\-_.:]/g, '');
    for (const key of possibleKeys) {
        const cleanKey = normalize(key);
        if (r[key] !== undefined && r[key] !== null && String(r[key]).trim() !== '') {
            return r[key];
        }
        for (const k of Object.keys(r)) {
            if (normalize(k) === cleanKey) {
                const val = r[k];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return val;
                }
            }
        }
    }
    return undefined;
};

const BulkDebitNoteUpload = ({ isOpen, onClose, onSuccess }: BulkDebitNoteUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<ParsedDebitNoteRow[]>([]);
    const [uploading, setUploading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState('');

    // Pre-fetched references for validation
    const [customerNames, setCustomerNames] = useState<Set<string>>(new Set());
    const [customerIds, setCustomerIds] = useState<Set<string>>(new Set());
    const [supplierNames, setSupplierNames] = useState<Set<string>>(new Set());
    const [supplierCodes, setSupplierCodes] = useState<Set<string>>(new Set());
    const [existingDebitNotes, setExistingDebitNotes] = useState<Set<string>>(new Set());
    const [batchDnCounts, setBatchDnCounts] = useState<Map<string, number>>(new Map());

    // Invoice Verification Map
    const [verifiedInvoices, setVerifiedInvoices] = useState<Map<string, InvoiceVerification>>(new Map());
    const [verifyingInvoices, setVerifyingInvoices] = useState(false);

    const computeBatchCounts = (rows: any[]) => {
        const counts = new Map<string, number>();
        rows.forEach(r => {
            const rawNo = getRowVal(r, ["Debit Note Number", "debitNoteNumber", "Debit Note ID", "debitNoteId", "Reference#", "reference"]);
            if (rawNo) {
                const isDep = String(getRowVal(r, ["Is Deposit", "isDeposit", "Deposit"])).toLowerCase() === 'true';
                let clean = rawNo.toString().trim().toLowerCase();
                if (isDep && !clean.startsWith('dp-')) clean = `dp-${clean}`;
                counts.set(clean, (counts.get(clean) || 0) + 1);
            }
        });
        return counts;
    };

    useEffect(() => {
        if (!isOpen) return;
        const fetchReferences = async () => {
            try {
                const [custRes, suppRes, dnRes] = await Promise.all([
                    getAllCustomers({ limit: 1000 }).catch(() => ({ data: [] })),
                    getAllSuppliers({ limit: 1000 } as any).catch(() => ({ data: [] })),
                    getAllDebitNotes({ limit: 10000 }).catch(() => ({ data: [] }))
                ]);

                const cNames = new Set<string>();
                const cIds = new Set<string>();
                (custRes?.data || []).forEach((c: any) => {
                    if (c.name) cNames.add(c.name.trim().toLowerCase().replace(/\s+/g, ' '));
                    if (c.customerId) cIds.add(c.customerId.trim().toLowerCase());
                    if (c.customerNumber) cIds.add(c.customerNumber.trim().toLowerCase());
                    if (c._id) cIds.add(c._id.toString().toLowerCase());
                });
                setCustomerNames(cNames);
                setCustomerIds(cIds);

                const sNames = new Set<string>();
                const sCodes = new Set<string>();
                (suppRes?.data || []).forEach((s: any) => {
                    if (s.name) sNames.add(s.name.trim().toLowerCase().replace(/\s+/g, ' '));
                    if (s.companyName) sNames.add(s.companyName.trim().toLowerCase().replace(/\s+/g, ' '));
                    if (s.supplierCode) sCodes.add(s.supplierCode.trim().toLowerCase());
                    if (s.vendorNumber) sCodes.add(s.vendorNumber.trim().toLowerCase());
                    if (s._id) sCodes.add(s._id.toString().toLowerCase());
                });
                setSupplierNames(sNames);
                setSupplierCodes(sCodes);

                const existingDn = new Set<string>();
                (dnRes?.data || []).forEach((d: any) => {
                    if (d.debitNoteNumber) existingDn.add(d.debitNoteNumber.trim().toLowerCase());
                });
                setExistingDebitNotes(existingDn);
            } catch (err) {
                console.error("Failed fetching reference data for validation:", err);
            }
        };

        fetchReferences();
    }, [isOpen]);

    const validateRow = useCallback((row: any, activeCounts?: Map<string, number>, activeExisting?: Set<string>): string[] => {
        const errors: string[] = [];

        // 1. Amount validation
        const amountVal = getRowVal(row, ["Total", "total", "Amount", "amount", "SubTotal", "subtotal", "Item Total"]);
        const amount = parseFloat(amountVal !== undefined && amountVal !== null ? amountVal : 0);
        if (amountVal === undefined || amountVal === null || amountVal === '') {
            errors.push('Total / Amount is required');
        } else if (isNaN(amount) || amount <= 0) {
            errors.push('Amount must be greater than 0');
        }

        // 2. Customer or Supplier validation
        const customerName = getRowVal(row, ["Customer Name", "customerName", "Customer", "customer"]);
        const customerId = getRowVal(row, ["Customer ID", "customerId", "Customer Number", "customerNumber"]);
        const driverName = getRowVal(row, ["Driver Name", "driverName", "Driver", "driver"]);
        const driverId = getRowVal(row, ["Driver ID", "driverId"]);
        const vendorName = getRowVal(row, ["Vendor Name", "vendorName", "Supplier Name", "supplierName", "Supplier", "supplier"]);
        const vendorCode = getRowVal(row, ["Vendor Number", "vendorNumber", "Supplier ID", "supplierId", "Supplier Code", "supplierCode"]);

        const hasCustomerRef = Boolean(customerName || customerId || driverName || driverId);
        const hasVendorRef = Boolean(vendorName || vendorCode);

        if (!hasCustomerRef && !hasVendorRef) {
            errors.push('Customer Name / ID or Vendor Name / Number is required');
        } else if (hasCustomerRef && customerNames.size > 0) {
            const cleanCName = (customerName || driverName || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
            const cleanCId = (customerId || driverId || '').toString().trim().toLowerCase();
            const matchedName = cleanCName ? customerNames.has(cleanCName) : false;
            const matchedId = cleanCId ? customerIds.has(cleanCId) : false;
            if (!matchedName && !matchedId && !hasVendorRef) {
                errors.push(`Customer "${customerName || customerId}" not recognized in database`);
            }
        } else if (hasVendorRef && supplierNames.size > 0) {
            const cleanVName = (vendorName || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
            const cleanVCode = (vendorCode || '').toString().trim().toLowerCase();
            const matchedName = cleanVName ? supplierNames.has(cleanVName) : false;
            const matchedCode = cleanVCode ? supplierCodes.has(cleanVCode) : false;
            if (!matchedName && !matchedCode) {
                errors.push(`Vendor "${vendorName || vendorCode}" not recognized in database`);
            }
        }

        // 3. Date validation
        const dateVal = getRowVal(row, ["Debit Note Date", "debitNoteDate", "Date", "date", "Invoice Date", "invoiceDate", "Issued Date"]);
        if (dateVal && !parseFlexibleDate(dateVal)) {
            errors.push('Invalid Date format (use DD.MM.YY, DD.MM.YYYY, or YYYY-MM-DD)');
        }

        // 4. Debit Note Number Duplicate Validation
        const dnNo = getRowVal(row, ["Debit Note Number", "debitNoteNumber", "Debit Note ID", "debitNoteId", "Reference#", "reference"]);
        if (dnNo) {
            const isDep = String(getRowVal(row, ["Is Deposit", "isDeposit", "Deposit"])).toLowerCase() === 'true';
            let cleanDn = dnNo.toString().trim().toLowerCase();
            if (isDep && !cleanDn.startsWith('dp-')) cleanDn = `dp-${cleanDn}`;

            const counts = activeCounts || batchDnCounts;
            const existing = activeExisting || existingDebitNotes;

            const countInBatch = counts.get(cleanDn) || 0;
            if (countInBatch > 1) {
                errors.push(`Duplicate Debit Note ID "${dnNo}" in upload file`);
            }
            if (existing.has(cleanDn)) {
                errors.push(`Debit Note ID "${dnNo}" already exists in database`);
            }
        }

        // 5. Applied Invoice Validation
        const appliedInvoice = getRowVal(row, ["Applied Invoice Number", "appliedInvoiceNumber", "Invoice Number", "invoiceNumber", "Invoice ID"]);
        if (appliedInvoice) {
            const invToken = appliedInvoice.toString().trim().toLowerCase();
            const verification = verifiedInvoices.get(invToken);
            if (verification) {
                if (!verification.exists) {
                    errors.push(`Applied Invoice "${appliedInvoice}" not found in database`);
                } else if (verification.status === 'CANCELLED' || verification.status === 'VOID') {
                    errors.push(`Applied Invoice "${appliedInvoice}" is ${verification.status}`);
                } else if (customerName || customerId) {
                    // Check if customer matches invoice
                    const cleanCustName = (customerName || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
                    const cleanCustId = (customerId || '').toString().trim().toLowerCase();
                    const invCustName = (verification.customerName || '').trim().toLowerCase().replace(/\s+/g, ' ');
                    const invCustId = (verification.customerId || '').trim().toLowerCase();

                    const matchesName = cleanCustName && invCustName && (invCustName.includes(cleanCustName) || cleanCustName.includes(invCustName));
                    const matchesId = cleanCustId && invCustId && invCustId === cleanCustId;

                    if (!matchesName && !matchesId && verification.customerName) {
                        errors.push(`Invoice "${appliedInvoice}" belongs to "${verification.customerName}", not "${customerName || customerId}"`);
                    }
                }
            }
        }

        return errors;
    }, [customerNames, customerIds, supplierNames, supplierCodes, verifiedInvoices, batchDnCounts, existingDebitNotes]);

    // Asynchronously verify parsed invoice numbers against database
    useEffect(() => {
        if (parsedRows.length === 0) return;

        const uniqueTokens = new Set<string>();
        parsedRows.forEach(row => {
            const rawInv = getRowVal(row, ["Applied Invoice Number", "appliedInvoiceNumber", "Invoice Number", "invoiceNumber", "Invoice ID"]) || '';
            if (rawInv) {
                const token = rawInv.toString().trim();
                if (token && !verifiedInvoices.has(token.toLowerCase())) {
                    uniqueTokens.add(token);
                }
            }
        });

        if (uniqueTokens.size === 0) return;

        const tokensToVerify = Array.from(uniqueTokens);
        const verifyInvoicesAsync = async () => {
            setVerifyingInvoices(true);
            const newVerifications = new Map<string, InvoiceVerification>();
            const CONCURRENCY = 5;

            for (let i = 0; i < tokensToVerify.length; i += CONCURRENCY) {
                const chunk = tokensToVerify.slice(i, i + CONCURRENCY);
                await Promise.all(chunk.map(async (token) => {
                    try {
                        const res = await getInvoices({ search: token, limit: 10 });
                        const matchedInvoice = res.data?.find((inv: any) => {
                            const dbNum = (inv.invoiceNumber || '').trim().toLowerCase();
                            const queryNum = token.trim().toLowerCase();
                            return dbNum === queryNum || dbNum.includes(queryNum) || queryNum.includes(dbNum);
                        });

                        if (matchedInvoice) {
                            const custId = matchedInvoice.customer?._id || matchedInvoice.customer;
                            newVerifications.set(token.toLowerCase(), {
                                exists: true,
                                customerId: custId ? String(custId) : undefined,
                                customerName: matchedInvoice.customer?.name || matchedInvoice.driver?.personalInfo?.fullName,
                                driverId: matchedInvoice.driver?._id ? String(matchedInvoice.driver._id) : undefined,
                                status: matchedInvoice.status
                            });
                        } else {
                            newVerifications.set(token.toLowerCase(), { exists: false });
                        }
                    } catch (err) {
                        console.error(`Error verifying invoice ${token}:`, err);
                        newVerifications.set(token.toLowerCase(), { exists: false });
                    }
                }));
            }

            setVerifiedInvoices(prev => {
                const updated = new Map(prev);
                newVerifications.forEach((val, key) => updated.set(key, val));
                return updated;
            });
            setVerifyingInvoices(false);
        };

        verifyInvoicesAsync();
    }, [parsedRows, verifiedInvoices]);

    // Re-validate rows whenever verification completes or reference data updates
    useEffect(() => {
        if (parsedRows.length > 0) {
            const counts = computeBatchCounts(parsedRows);
            setBatchDnCounts(counts);
            setParsedRows(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row, counts, existingDebitNotes)
            })));
        }
    }, [validateRow, existingDebitNotes, verifiedInvoices]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setSelectedFileName(selectedFile.name);
            setVerifiedInvoices(new Map());
            processFile(selectedFile);
        }
    };

    const processFile = (fileToProcess: File) => {
        const isCsv = fileToProcess.name.toLowerCase().endsWith('.csv');

        if (isCsv) {
            Papa.parse(fileToProcess, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (!results.data || results.data.length === 0) {
                        toast.error('The selected CSV file is empty.');
                        return;
                    }
                    const counts = computeBatchCounts(results.data);
                    setBatchDnCounts(counts);
                    const annotated = results.data.map((row: any) => ({
                        ...row,
                        _rowErrors: validateRow(row, counts, existingDebitNotes)
                    }));
                    setParsedRows(annotated);
                    setPreviewMode(true);
                    toast.success(`Successfully parsed ${annotated.length} records.`);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    toast.error('Failed to parse CSV file: ' + error.message);
                }
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (json.length === 0) {
                        toast.error('The selected Excel file is empty.');
                        return;
                    }

                    const counts = computeBatchCounts(json);
                    setBatchDnCounts(counts);
                    const annotated = json.map(row => ({
                        ...row,
                        _rowErrors: validateRow(row, counts, existingDebitNotes)
                    }));
                    setParsedRows(annotated);
                    setPreviewMode(true);
                    toast.success(`Successfully parsed ${annotated.length} records.`);
                } catch (err: any) {
                    console.error('Error parsing Excel file:', err);
                    toast.error('Failed to parse file. Please upload a valid Excel or CSV file.');
                }
            };
            reader.readAsArrayBuffer(fileToProcess);
        }
    };

    const handleUpload = async () => {
        if (parsedRows.length === 0) {
            toast.error('No rows to upload.');
            return;
        }

        const validRows = parsedRows.filter(r => !r._rowErrors || r._rowErrors.length === 0);
        if (validRows.length === 0) {
            toast.error('Cannot upload: all rows contain validation errors. Please check the preview table.');
            return;
        }

        setUploading(true);
        const toastId = toast.loading(`Uploading ${validRows.length} Debit Notes...`);
        try {
            const rowsToUpload = validRows.map(({ _rowErrors, ...row }) => {
                const rawDate = getRowVal(row, ["Debit Note Date", "debitNoteDate", "Date", "date", "Invoice Date"]);
                const formattedDate = rawDate ? formatDisplayDate(rawDate) : '';
                return {
                    ...row,
                    'Debit Note Date': formattedDate || rawDate
                };
            });
            const res = await bulkUploadDebitNotes({ rows: rowsToUpload });

            const createdCount = res.data?.createdCount ?? 0;
            if (createdCount === 0) {
                const firstErr = res.data?.errors?.[0] || res.message || 'No Debit Notes could be created.';
                toast.error(`Upload failed: ${firstErr}`, { id: toastId, duration: 6000 });
                return;
            }

            if (res.data?.errors && res.data.errors.length > 0) {
                toast.success(`Created ${createdCount} Debit Notes with ${res.data.errors.length} warnings.`, { id: toastId, duration: 5000 });
            } else {
                toast.success(res.message || `Successfully created ${createdCount} Debit Notes!`, { id: toastId });
            }

            setPreviewMode(false);
            setParsedRows([]);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed bulk upload:', err);
            toast.error(err?.response?.data?.message || err.message || 'Failed to upload Debit Notes.', { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const downloadSampleTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
        if (format === 'csv') {
            const csvContent = Papa.unparse(SAMPLE_DATA, { columns: CSV_COLUMNS });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'bulk_debit_notes_template.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Sample CSV template downloaded!");
        } else {
            const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA, { header: CSV_COLUMNS });
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Debit_Notes_Template");
            XLSX.writeFile(wb, "bulk_debit_notes_template.xlsx");
            toast.success("Sample Excel template downloaded!");
        }
    };

    const removeRow = (index: number) => {
        setParsedRows(prev => prev.filter((_, idx) => idx !== index));
    };

    const totalErrors = parsedRows.filter(r => r._rowErrors && r._rowErrors.length > 0).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] shadow-2xl border animate-in fade-in duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,241,46,0.1)', border: '1px solid rgba(212,241,46,0.2)' }}>
                            <FileSpreadsheet size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Bulk Upload Debit Notes</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                Bulk issue debit notes and debit adjustments for Customers, Drivers & Vendors
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl border transition-all hover:bg-white/10 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {!previewMode ? (
                        <div className="space-y-6">
                            {/* Upload Dropzone */}
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-brand-lime hover:bg-brand-lime/5 group text-center"
                                style={{ borderColor: 'var(--border-main)' }}
                            >
                                <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="hidden" />
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-main)' }}>
                                    <Upload size={24} style={{ color: 'var(--brand-lime)' }} />
                                </div>
                                <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-main)' }}>Click or drag file to upload</p>
                                <p className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>Supports Excel (.xlsx, .xls) and CSV spreadsheets</p>
                            </div>

                            {/* Template Download Box */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border gap-4" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3">
                                    <FileText size={20} style={{ color: 'var(--brand-lime)' }} />
                                    <div>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Need a formatted template?</p>
                                        <p className="text-[10px] text-dim">Download official sample template with full columns (Debit Note Date, Customer/Vendor, Total, Reason, Notes, Tax, etc.)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => downloadSampleTemplate('xlsx')} 
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-all border cursor-pointer" 
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <Download size={13} />
                                        <span>Excel (.xlsx)</span>
                                    </button>
                                    <button 
                                        onClick={() => downloadSampleTemplate('csv')} 
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-all border cursor-pointer" 
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <Download size={13} />
                                        <span>CSV</span>
                                    </button>
                                </div>
                            </div>

                            {/* Column Info Card */}
                            <div className="p-4 rounded-2xl border space-y-2 text-xs" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <p className="font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--brand-lime)' }}>Template Column Guide:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-dim">
                                    <div>• <strong className="text-white">Debit Note Date</strong>: Date of issuance (e.g. 25.07.26 or DD.MM.YY)</div>
                                    <div>• <strong className="text-white">Customer Name / ID</strong>: Driver or Customer identity</div>
                                    <div>• <strong className="text-white">Total / Amount</strong>: Debit charge value ($)</div>
                                    <div>• <strong className="text-white">Reason / Item Name</strong>: Mandatory penalty or charge reason</div>
                                    <div>• <strong className="text-white">Applied Invoice Number</strong>: Target invoice to adjust (validated on parsing)</div>
                                    <div>• <strong className="text-white">Vendor Name</strong>: If issuing debit note to vendor/supplier</div>
                                    <div>• <strong className="text-white">Is Deposit</strong>: Set TRUE for Security Deposit debits (DP-)</div>
                                    <div>• <strong className="text-white">Tax Details</strong>: Item Tax %, Item Tax, Tax ID</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <div>
                                        <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                            {parsedRows.length} rows loaded from <span className="text-brand-lime font-mono">{selectedFileName}</span>
                                        </span>
                                        {totalErrors > 0 && (
                                            <span className="ml-2 text-xs font-bold text-amber-400">
                                                ({totalErrors} with warnings)
                                            </span>
                                        )}
                                        {verifyingInvoices && (
                                            <span className="ml-2 text-xs text-brand-lime font-bold inline-flex items-center gap-1">
                                                <Loader2 size={12} className="animate-spin" /> Verifying invoices...
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setPreviewMode(false); setParsedRows([]); }} 
                                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                                >
                                    Upload Different File
                                </button>
                            </div>

                            {/* Preview Table */}
                            <div className="border rounded-2xl overflow-hidden max-h-72 overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead style={{ background: 'var(--bg-input)' }}>
                                        <tr className="border-b text-dim text-[10px] font-black uppercase tracking-wider" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Debit Note #</th>
                                            <th className="p-3">Target (Customer / Vendor)</th>
                                            <th className="p-3">Amount ($)</th>
                                            <th className="p-3">Reason</th>
                                            <th className="p-3">Applied Invoice</th>
                                            <th className="p-3">Deposit?</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {parsedRows.map((row, idx) => {
                                            const amount = parseFloat(getRowVal(row, ["Total", "total", "Amount", "amount"]) || 0);
                                            const customerTarget = getRowVal(row, ["Customer Name", "customerName", "Customer", "customer", "Customer ID", "customerId", "Customer Number", "customerNumber", "Driver Name", "driverName", "Driver", "driver"]);
                                            const vendorTarget = getRowVal(row, ["Vendor Name", "vendorName", "Supplier Name", "supplierName", "Supplier", "supplier", "Vendor Number", "vendorNumber", "Supplier ID", "supplierId", "Supplier Code", "supplierCode"]);
                                            const target = customerTarget || vendorTarget || 'N/A';
                                            const isVendorTarget = Boolean(!customerTarget && vendorTarget);
                                            const rawDate = getRowVal(row, ["Debit Note Date", "debitNoteDate", "Date", "date", "Invoice Date"]);
                                            const date = formatDisplayDate(rawDate);
                                            const dnNum = getRowVal(row, ["Debit Note Number", "debitNoteNumber", "Debit Note ID"]) || 'Auto-generate';
                                            const reason = getRowVal(row, ["Reason", "reason", "Subject", "Item Name"]) || 'Bulk Debit Note';
                                            const rawAppliedInv = getRowVal(row, ["Applied Invoice Number", "appliedInvoiceNumber", "Invoice Number", "invoiceNumber", "Invoice ID"]);
                                            const appliedInv = rawAppliedInv ? String(rawAppliedInv).trim() : '';
                                            const isDeposit = String(getRowVal(row, ["Is Deposit", "isDeposit", "Deposit"])).toLowerCase() === 'true';
                                            
                                            let cleanDn = dnNum !== 'Auto-generate' ? String(dnNum).trim().toLowerCase() : '';
                                            if (cleanDn && isDeposit && !cleanDn.startsWith('dp-')) cleanDn = `dp-${cleanDn}`;
                                            const isDuplicateInFile = cleanDn ? (batchDnCounts.get(cleanDn) || 0) > 1 : false;
                                            const isAlreadyInDb = cleanDn ? existingDebitNotes.has(cleanDn) : false;

                                            const hasErrors = row._rowErrors && row._rowErrors.length > 0;
                                            const invVerification = appliedInv ? verifiedInvoices.get(appliedInv.toLowerCase()) : undefined;

                                            return (
                                                <tr key={idx} className={isAlreadyInDb || isDuplicateInFile ? 'bg-rose-500/10' : hasErrors ? 'bg-amber-500/5' : ''} style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                    <td className="p-3 text-dim font-mono">{idx + 1}</td>
                                                    <td className="p-3 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>{String(date)}</td>
                                                    <td className="p-3 font-mono font-bold text-xs" style={{ color: 'var(--brand-lime)' }}>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={isAlreadyInDb || isDuplicateInFile ? 'text-rose-400 line-through' : ''}>{String(dnNum)}</span>
                                                            {isAlreadyInDb && (
                                                                <span className="w-fit px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                                    Already In DB
                                                                </span>
                                                            )}
                                                            {!isAlreadyInDb && isDuplicateInFile && (
                                                                <span className="w-fit px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                    Duplicate In File
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 font-bold" style={{ color: 'var(--text-main)' }}>
                                                        <div className="flex items-center gap-1.5">
                                                            {isVendorTarget && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">Vendor</span>
                                                            )}
                                                            <span>{String(target)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 font-bold text-amber-400 font-mono">${amount.toFixed(2)}</td>
                                                    <td className="p-3 max-w-[140px] truncate" style={{ color: 'var(--text-main)' }}>{String(reason)}</td>
                                                    <td className="p-3 font-mono">
                                                        {appliedInv ? (
                                                            verifyingInvoices && !invVerification ? (
                                                                <span className="flex items-center gap-1 text-dim text-[10px]">
                                                                    <Loader2 size={10} className="animate-spin text-brand-lime" />
                                                                    <span>{appliedInv}</span>
                                                                </span>
                                                            ) : invVerification?.exists ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" title={`Matched invoice (${invVerification.status}) for ${invVerification.customerName || 'Customer'}`}>
                                                                    <span>{appliedInv}</span>
                                                                    <span>✓</span>
                                                                </span>
                                                            ) : invVerification?.exists === false ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-400/10 text-rose-400 border border-rose-400/20" title="Invoice not found in system">
                                                                    <span className="line-through">{appliedInv}</span>
                                                                    <span>✗</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-dim text-[11px]">{appliedInv}</span>
                                                            )
                                                        ) : (
                                                            <span className="text-dim text-[11px]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        {isDeposit ? (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400/20 text-amber-400 border border-amber-400/30">DP</span>
                                                        ) : (
                                                            <span className="text-dim text-[10px]">No</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        {hasErrors ? (
                                                            <span className={`flex items-center gap-1 text-[10px] font-semibold ${isAlreadyInDb || isDuplicateInFile ? 'text-rose-400' : 'text-amber-400'}`} title={row._rowErrors?.join(', ')}>
                                                                <AlertTriangle size={12} className={`shrink-0 ${isAlreadyInDb || isDuplicateInFile ? 'text-rose-400' : 'text-amber-400'}`} />
                                                                <span className="truncate max-w-[150px]">{row._rowErrors?.[0]}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">Ready</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeRow(idx)} 
                                                            className="text-dim hover:text-rose-400 transition-colors p-1 cursor-pointer"
                                                            title="Remove row"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-5 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="text-[11px] text-dim">
                        {previewMode ? (
                            <span>Ready to post {parsedRows.filter(r => !r._rowErrors || r._rowErrors.length === 0).length} of {parsedRows.length} debit notes</span>
                        ) : (
                            <span>All uploads are logged with an audit trail</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/10 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            Cancel
                        </button>
                        {previewMode && (
                            <button
                                onClick={handleUpload}
                                disabled={uploading || parsedRows.filter(r => !r._rowErrors || r._rowErrors.length === 0).length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                                style={{ background: 'var(--brand-lime)', color: 'black' }}
                            >
                                {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                                <span>{uploading ? 'Processing...' : 'Upload Debit Notes'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkDebitNoteUpload;
