import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadPayments } from '../../../services/paymentReceivedService';
import { getAllCustomers } from '../../../services/customerService';
import { getInvoices } from '../../../services/invoiceService';

interface ParsedPaymentRow {
    [key: string]: any;
    _rowErrors?: string[];
}

interface BulkPaymentUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface TargetField {
    key: string;
    label: string;
    required: boolean;
    description: string;
    alternatives: string[];
}

const TARGET_FIELDS: TargetField[] = [
    { key: 'paymentNumber', label: 'Payment Number', required: true, description: 'Unique payment identifier (e.g. PR-000101)', alternatives: ['payment number', 'paymentnumber', 'payment_number', 'paymentNo', 'paymentno', 'payment id', 'paymentid'] },
    { key: 'customerName', label: 'Customer Name', required: true, description: 'Full name of the customer/driver', alternatives: ['customer name', 'customername', 'customer_name', 'customer', 'client', 'driver name', 'driver'] },
    { key: 'customerNumber', label: 'Customer ID / Phone', required: false, description: 'ID or phone number of the customer', alternatives: ['customer id', 'customerid', 'customer_id', 'customer number', 'customernumber', 'customer_number', 'phone'] },
    { key: 'amountReceived', label: 'Amount Received', required: true, description: 'Total payment amount received', alternatives: ['amount received', 'amountreceived', 'amount_received', 'amount', 'total amount', 'total'] },
    { key: 'paymentDate', label: 'Payment Date', required: true, description: 'Date the payment was received', alternatives: ['payment date', 'paymentdate', 'payment_date', 'date', 'created time', 'createdtime'] },
    { key: 'paymentMethod', label: 'Payment Method', required: false, description: 'Cash, Bank Transfer, Card, Mobile Money, etc.', alternatives: ['payment method', 'paymentmethod', 'payment_method', 'mode', 'payment type', 'paymenttype'] },
    { key: 'referenceNumber', label: 'Reference Number', required: false, description: 'Transaction reference, check or transfer ID', alternatives: ['reference number', 'referencenumber', 'reference_number', 'ref', 'ref_no', 'reference'] },
    { key: 'notes', label: 'Notes / Memo', required: false, description: 'Description or notes about the payment', alternatives: ['notes', 'memo', 'description', 'notes/memo'] },
    { key: 'invoiceNumber', label: 'Invoice Number', required: false, description: 'Invoice number to apply payment to', alternatives: ['invoice number', 'invoicenumber', 'invoice_number', 'invoice', 'invoice no', 'invoiceno'] },
    { key: 'amountApplied', label: 'Amount Applied to Invoice', required: false, description: 'Amount to apply to the invoice', alternatives: ['amount applied to invoice', 'amountapplied', 'amount_applied', 'amount applied', 'amountappliedtoinvoice'] },
    { key: 'depositTo', label: 'Deposit To Account Code', required: false, description: 'Bank/petty cash accounting code (e.g. 1020)', alternatives: ['deposit to', 'depositto', 'deposit_to', 'deposit to account code', 'deposittoaccountcode', 'account code', 'account'] },
    { key: 'branch', label: 'Branch / Location', required: false, description: 'Branch code or name', alternatives: ['branch', 'branch id', 'branchid', 'location name', 'locationname', 'location'] }
];

const SAMPLE_DATA = [
    {
        'Payment Number': 'PR-000101',
        'Customer Name': 'John Smith',
        'Customer ID / Phone': '+254700000001',
        'Amount Received': '180',
        'Payment Date': '2026-06-02',
        'Payment Method': 'Cash',
        'Reference Number': 'REF-12345',
        'Notes / Memo': 'Weekly lease payment',
        'Invoice Number': 'INV-000101',
        'Amount Applied to Invoice': '180',
        'Deposit To Account Code': '1020',
        'Branch / Location': 'Panama Branch'
    },
    {
        'Payment Number': 'PR-000102',
        'Customer Name': 'Maria Garcia',
        'Customer ID / Phone': '+254711223344',
        'Amount Received': '100',
        'Payment Date': '2026-06-03',
        'Payment Method': 'Bank Transfer',
        'Reference Number': 'REF-98765',
        'Notes / Memo': 'Maintenance recovery',
        'Invoice Number': 'INV-000102',
        'Amount Applied to Invoice': '100',
        'Deposit To Account Code': '1010',
        'Branch / Location': 'Panama Branch'
    }
];

const parseFlexibleDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    
    if (dateStr instanceof Date) {
        return isNaN(dateStr.getTime()) ? null : dateStr;
    }
    
    // Check if it's a number or can be parsed as a number (Excel serial date)
    const num = Number(dateStr);
    if (typeof dateStr !== 'object' && !isNaN(num) && dateStr !== '' && dateStr !== null && dateStr !== true && dateStr !== false) {
        if (num > 30000 && num < 3000000) {
            const date = new Date((num - 25569) * 86400 * 1000);
            return isNaN(date.getTime()) ? null : date;
        }
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

const formatDateForDisplay = (dateVal: any): string => {
    if (!dateVal) return '';
    const parsed = parseFlexibleDate(dateVal);
    if (!parsed) return String(dateVal);
    
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const cleanString = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
};

const BulkPaymentUpload = ({ isOpen, onClose, onSuccess }: BulkPaymentUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'upload' | 'mapping' | 'review' | 'result'>('upload');
    const [rawRows, setRawRows] = useState<ParsedPaymentRow[]>([]);
    const [, setFileHeaders] = useState<string[]>([]);
    const [fileName, setFileName] = useState('');
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatusText, setUploadStatusText] = useState('');
    const [autoDownloadFailed, setAutoDownloadFailed] = useState(true);
    const [runningStats, setRunningStats] = useState({
        total: 0,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0
    });
    
    const [availableCustomerNames, setAvailableCustomerNames] = useState<Set<string>>(new Set());
    const [availableCustomerIds, setAvailableCustomerIds] = useState<Set<string>>(new Set());
    const [availableInvoiceNumbers, setAvailableInvoiceNumbers] = useState<Set<string>>(new Set());
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Fetch customers & invoices lists for validation
    useEffect(() => {
        if (isOpen) {
            setLoadingCustomers(true);
            Promise.all([
                getAllCustomers({ limit: 100000 }),
                getInvoices({ limit: 100000 })
            ])
                .then(([custRes, invRes]) => {
                    const custList = Array.isArray(custRes.data) ? custRes.data : [];
                    const names = new Set<string>(custList.map((c: any) => cleanString(c.name || '')).filter(Boolean));
                    const ids = new Set<string>(custList.map((c: any) => cleanString(c.customerId || c.customerNumber || '')).filter(Boolean));
                    setAvailableCustomerNames(names);
                    setAvailableCustomerIds(ids);

                    const invList = Array.isArray(invRes.data) ? invRes.data : [];
                    const invs = new Set<string>(invList.map((i: any) => cleanString(i.invoiceNumber || '')).filter(Boolean));
                    setAvailableInvoiceNumbers(invs);

                    console.log(`[BulkPaymentUpload] Loaded ${names.size} customers and ${invs.size} invoice numbers for verification.`);
                })
                .catch(err => {
                    console.error('Failed to load validation registries', err);
                })
                .finally(() => {
                    setLoadingCustomers(false);
                });
        }
    }, [isOpen]);

    // Perform auto-mapping when headers are discovered
    const runAutoMapping = (headers: string[]) => {
        const mapping: Record<string, string> = {};
        const lowerHeaders = headers.map(h => h.toLowerCase().trim());

        TARGET_FIELDS.forEach(field => {
            // 1. Direct match by key
            let matchIdx = lowerHeaders.indexOf(field.key.toLowerCase());
            if (matchIdx !== -1) {
                mapping[field.key] = headers[matchIdx];
                return;
            }

            // 2. Direct match by label
            matchIdx = lowerHeaders.indexOf(field.label.toLowerCase());
            if (matchIdx !== -1) {
                mapping[field.key] = headers[matchIdx];
                return;
            }

            // 3. Match by alternatives
            for (const alt of field.alternatives) {
                matchIdx = lowerHeaders.indexOf(alt.toLowerCase());
                if (matchIdx !== -1) {
                    mapping[field.key] = headers[matchIdx];
                    return;
                }
            }

            // 4. Loose match (contains substring)
            matchIdx = headers.findIndex(h => {
                const normalized = h.toLowerCase().replace(/[^a-z]/g, '');
                return field.alternatives.some(alt => {
                    const altNorm = alt.toLowerCase().replace(/[^a-z]/g, '');
                    return normalized.includes(altNorm) || altNorm.includes(normalized);
                });
            });
            if (matchIdx !== -1) {
                mapping[field.key] = headers[matchIdx];
            }
        });

        setColumnMapping(mapping);
    };

    const parseFile = (file: File) => {
        setFileName(file.name);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (jsonData.length === 0) {
                        toast.error('No data found in the Excel sheet.');
                        return;
                    }

                    // Extract headers from first row
                    const headers = Object.keys(jsonData[0]);
                    setFileHeaders(headers);
                    setRawRows(jsonData);
                    runAutoMapping(headers);
                    setStep('review');
                    toast.success(`Successfully parsed ${jsonData.length} rows.`);
                } catch (err) {
                    toast.error('Failed to parse Excel file.');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length === 0) {
                        toast.error('No data found in the CSV file.');
                        return;
                    }
                    const headers = results.meta.fields || Object.keys(results.data[0] as object);
                    setFileHeaders(headers);
                    setRawRows(results.data as any[]);
                    runAutoMapping(headers);
                    setStep('review');
                    toast.success(`Successfully parsed ${results.data.length} rows.`);
                },
                error: (err: any) => {
                    toast.error(`Failed to parse CSV file: ${err.message}`);
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


    const getMappedRowValue = (row: any, targetKey: string) => {
        const fileCol = columnMapping[targetKey];
        return fileCol !== undefined ? row[fileCol] : undefined;
    };

    // Row-level validator based on current mapping
    const validateRow = useCallback((row: any): string[] => {
        const errors: string[] = [];
        
        const customerName = getMappedRowValue(row, 'customerName');
        const customerNumber = getMappedRowValue(row, 'customerNumber');
        const amountReceived = getMappedRowValue(row, 'amountReceived');
        const paymentDate = getMappedRowValue(row, 'paymentDate');
        const invoiceNumber = getMappedRowValue(row, 'invoiceNumber');

        // Customer Validation
        if (!customerName && !customerNumber) {
            errors.push('Customer Name or Customer ID is required.');
        } else {
            const hasNameMatch = customerName && availableCustomerNames.has(cleanString(customerName.toString()));
            const hasIdMatch = customerNumber && availableCustomerIds.has(cleanString(customerNumber.toString()));
            
            if (!hasNameMatch && !hasIdMatch && availableCustomerNames.size > 0) {
                errors.push(`Customer "${customerName || customerNumber}" not found in database.`);
            }
        }

        // Amount Validation
        if (amountReceived === undefined || amountReceived === null || amountReceived === '') {
            errors.push('Amount Received is required.');
        } else {
            const parsedAmt = parseFloat(amountReceived);
            if (isNaN(parsedAmt) || parsedAmt <= 0) {
                errors.push('Amount Received must be a positive number.');
            }
        }

        // Date Validation
        if (!paymentDate) {
            errors.push('Payment Date is required.');
        } else {
            const parsedDate = parseFlexibleDate(paymentDate);
            if (!parsedDate) {
                errors.push('Invalid Date format.');
            }
        }

        // Invoice Number Validation
        if (invoiceNumber) {
            const hasInvMatch = availableInvoiceNumbers.has(cleanString(invoiceNumber.toString()));
            if (!hasInvMatch && availableInvoiceNumbers.size > 0) {
                errors.push(`Invoice "${invoiceNumber}" not found in database.`);
            }
        }

        return errors;
    }, [columnMapping, availableCustomerNames, availableCustomerIds, availableInvoiceNumbers]);

    const handleReset = () => {
        setRawRows([]);
        setFileHeaders([]);
        setFileName('');
        setColumnMapping({});
        setResult(null);
        setStep('upload');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClose = () => {
        const hasResult = !!result;
        handleReset();
        if (hasResult) {
            onSuccess();
        } else {
            onClose();
        }
    };

    const handleRemoveRow = (index: number) => {
        setRawRows(prev => prev.filter((_, i) => i !== index));
    };

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(SAMPLE_DATA);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, `payments_received_bulk_template.xlsx`);
            return;
        }
        const content = Papa.unparse(SAMPLE_DATA);
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_received_bulk_template.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadImportSummaryReport = () => {
        if (!result) return;

        const reportData = rawRows.map((row, idx) => {
            const rowErrors = validateRow(row);
            const payNo = getMappedRowValue(row, 'paymentNumber') || 'Auto-generated';
            const customer = getMappedRowValue(row, 'customerName') || getMappedRowValue(row, 'customerNumber');
            const amount = getMappedRowValue(row, 'amountReceived');

            let status = 'Error';
            let message = rowErrors.join('; ');

            if (rowErrors.length === 0) {
                if (result.errors && result.errors.some((e: string) => e.includes(`PR-${payNo}`) || e.includes(payNo))) {
                    status = 'Failed';
                    const matchedErr = result.errors.find((e: string) => e.includes(payNo));
                    message = matchedErr || 'Backend import error';
                } else if (result.skipped && result.skipped.some((s: string) => s.includes(payNo))) {
                    status = 'Skipped (Duplicate)';
                    message = 'Payment already exists in DB';
                } else {
                    status = 'Success';
                    message = 'Reconciled / Imported successfully';
                }
            }

            return {
                'Row Number': idx + 2,
                'Payment Number': payNo,
                'Customer': customer,
                'Amount': amount,
                'Status': status,
                'Message / Errors': message
            };
        });

        const csvContent = Papa.unparse(reportData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment_import_reconciliation_report_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded detailed import report.');
    };

    const downloadInvoiceNotFoundExcel = () => {
        const targetRows = rawRows.filter(row => {
            const errors = validateRow(row);
            return errors.some(err => err.toLowerCase().includes('not found in database'));
        });

        if (targetRows.length === 0) {
            toast.error('No "Invoice Not Found" rows found.');
            return;
        }

        const exportData = targetRows.map(row => {
            const cleanRow = { ...row };
            delete cleanRow._rowErrors;
            return cleanRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice Not Found");
        XLSX.writeFile(workbook, `invoice_not_found_payments_${Date.now()}.xlsx`);
        toast.success(`Downloaded ${targetRows.length} "Invoice Not Found" rows.`);
    };

    const downloadFailedRowsExcel = (response: any) => {
        if (!response) return;

        const failedRows = rawRows.filter((row, idx) => {
            const localErrors = validateRow(row);
            if (localErrors.length > 0) return true;

            const isBackendError = response.errors && response.errors.some((err: string) => 
                err.startsWith(`Row ${idx + 2}:`) || err.includes(`Row ${idx + 2}:`)
            );
            if (isBackendError) return true;

            return false;
        });

        if (failedRows.length === 0) {
            return;
        }

        const exportData = failedRows.map(row => {
            const cleanRow = { ...row };
            delete cleanRow._rowErrors;
            return cleanRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Failed Rows");
        XLSX.writeFile(workbook, `failed_payment_rows_${Date.now()}.xlsx`);
        toast.success(`Automatically downloaded ${failedRows.length} failed rows.`);
    };

    const handleSubmit = async () => {
        // Group rows by Payment Number to keep all line items of the same payment together
        const paymentGroupsMap = new Map<string, any[]>();
        rawRows.forEach(row => {
            const payNo = getMappedRowValue(row, 'paymentNumber');
            const key = (payNo || `TEMP-${Date.now()}-${Math.random()}`).toString().trim();
            if (!paymentGroupsMap.has(key)) {
                paymentGroupsMap.set(key, []);
            }
            paymentGroupsMap.get(key)!.push(row);
        });

        const groupsArray = Array.from(paymentGroupsMap.values());
        const totalPayments = groupsArray.length;

        setUploading(true);
        setUploadProgress(0);
        setUploadStatusText(`Uploading payments (0 / ${totalPayments})...`);

        const stats = {
            total: totalPayments,
            processed: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            failed: 0
        };
        setRunningStats(stats);

        const CHUNK_PAYMENT_SIZE = 50; // process 50 payments at a time
        const chunks: any[][] = [];
        for (let i = 0; i < groupsArray.length; i += CHUNK_PAYMENT_SIZE) {
            const groupBatch = groupsArray.slice(i, i + CHUNK_PAYMENT_SIZE);
            const rowBatch = groupBatch.flat();
            chunks.push(rowBatch);
        }

        const finalResult = {
            successCount: 0,
            errorCount: 0,
            skippedCount: 0,
            errors: [] as string[],
            skipped: [] as string[]
        };

        try {
            let processedGroups = 0;
            for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
                const rowBatch = chunks[chunkIdx];
                
                // Calculate how many unique payments are in this batch
                const batchGroupsMap = new Map<string, any[]>();
                rowBatch.forEach(row => {
                    const payNo = getMappedRowValue(row, 'paymentNumber');
                    const key = (payNo || `TEMP-${Date.now()}-${Math.random()}`).toString().trim();
                    if (!batchGroupsMap.has(key)) {
                        batchGroupsMap.set(key, []);
                    }
                    batchGroupsMap.get(key)!.push(row);
                });
                const batchGroupCount = batchGroupsMap.size;

                const response = await bulkUploadPayments({
                    rows: rowBatch,
                    fieldMap: columnMapping
                });

                finalResult.successCount += response.successCount || 0;
                finalResult.errorCount += response.errorCount || 0;
                finalResult.skippedCount += response.skippedCount || 0;
                if (response.errors) finalResult.errors.push(...response.errors);
                if (response.skipped) finalResult.skipped.push(...response.skipped);

                processedGroups += batchGroupCount;
                
                // Update stats
                stats.processed = processedGroups;
                stats.created += response.summary?.createdCount || response.successCount || 0;
                stats.updated += response.summary?.updatedCount || 0;
                stats.skipped += response.skippedCount || 0;
                stats.failed += response.errorCount || 0;
                
                setRunningStats({ ...stats });
                setUploadProgress(Math.round((processedGroups / totalPayments) * 100));
                setUploadStatusText(`Uploading payments (${processedGroups} / ${totalPayments})...`);
            }

            setResult(finalResult);
            setStep('result');

            if (finalResult.successCount > 0) {
                toast.success(`Import complete! Reconciled ${finalResult.successCount} payments.`);
            } else if (finalResult.skippedCount > 0) {
                toast.success(`Import finished! ${finalResult.skippedCount} duplicate payments skipped.`);
            } else {
                toast.error('Import failed or skipped due to duplicates.');
            }

            if (autoDownloadFailed) {
                downloadFailedRowsExcel(finalResult);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Reconciliation failed.');
        } finally {
            setUploading(false);
            setUploadProgress(100);
            setUploadStatusText('');
        }
    };

    if (!isOpen) return null;


    // Review statistics
    const rowsWithErrors = rawRows.filter(r => validateRow(r).length > 0);
    const validRowsCount = rawRows.length - rowsWithErrors.length;

    // Group count
    const uniquePaymentCount = (() => {
        const validRows = rawRows.filter(r => validateRow(r).length === 0);
        const groupSet = new Set<string>();
        validRows.forEach(row => {
            const payNo = getMappedRowValue(row, 'paymentNumber');
            groupSet.add((payNo || `TEMP-${Math.random()}`).toString().trim());
        });
        return groupSet.size;
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl animate-scale-up animate-duration-200"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <Upload className="h-5 w-5" style={{ color: 'var(--brand-lime)' }} />
                        <div>
                            <h2 className="text-base font-black tracking-tight text-main">Payment Received Bulk Importer</h2>
                            <p className="text-[10px] text-dim font-medium">Reconcile Excel bank statements, match customers, and auto-apply outstanding balances.</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleClose} 
                        disabled={uploading}
                        className="p-1.5 rounded-lg transition-colors hover:bg-input text-dim hover:text-main border-none bg-transparent cursor-pointer disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {uploading ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 space-y-6 text-center animate-fade-in min-h-[350px]">
                            <div className="relative flex items-center justify-center">
                                {/* Outer spinning ring */}
                                <div className="w-28 h-28 rounded-full border-4 border-dashed animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                                {/* Center percentage value */}
                                <span className="absolute text-2xl font-black text-main">{uploadProgress}%</span>
                            </div>
                            <div className="space-y-2 max-w-md">
                                <h3 className="text-base font-black text-main">{uploadStatusText}</h3>
                                <p className="text-xs text-dim leading-relaxed">
                                    Please do not close this window or refresh the page. We are currently validating records, reconciling invoice balances, and writing ledger entries.
                                </p>
                            </div>
                            {/* Loading track */}
                            <div className="w-full max-w-xs h-2 rounded-full overflow-hidden bg-input relative border" style={{ borderColor: 'var(--border-main)' }}>
                                <div 
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ backgroundColor: 'var(--brand-lime)', width: `${uploadProgress}%` }}
                                />
                            </div>

                            {/* Running Statistics Breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg mt-4 p-4 rounded-xl border bg-card text-left" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="p-3 rounded-lg bg-input/20 border" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="block text-lg font-black text-main">{runningStats.processed} / {runningStats.total}</span>
                                    <span className="text-[9px] uppercase font-black text-dim tracking-wider">Payments Group</span>
                                </div>
                                <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                    <span className="block text-lg font-black text-emerald-500">{runningStats.created}</span>
                                    <span className="text-[9px] uppercase font-black text-emerald-500/80 tracking-wider">Newly Saved</span>
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                    <span className="block text-lg font-black text-blue-500">{runningStats.skipped}</span>
                                    <span className="text-[9px] uppercase font-black text-blue-500/80 tracking-wider">Skipped Dupes</span>
                                </div>
                                <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                    <span className="block text-lg font-black text-rose-500">{runningStats.failed}</span>
                                    <span className="text-[9px] uppercase font-black text-rose-500/80 tracking-wider">Failed Rows</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Upload File */}
                            {step === 'upload' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer min-h-[280px] ${
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
                                            {loadingCustomers ? (
                                                <div className="space-y-3">
                                                    <Loader2 className="h-10 w-10 animate-spin text-main mx-auto" />
                                                    <p className="text-xs font-bold text-main">Caching customer and invoice registries for validation...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                                                        <Upload className="h-6 w-6" style={{ color: 'var(--brand-lime)' }} />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-main mb-1">Upload your payments spreadsheet</h3>
                                                    <p className="text-xs text-dim mb-4">Drag and drop your file here, or click to browse</p>
                                                    <div className="text-[10px] text-dim/60 space-y-0.5">
                                                        <p>Supports .xlsx, .xls, and .csv files.</p>
                                                        <p>Row-level validation and matching will happen automatically on upload.</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-5 flex flex-col justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-main font-bold text-xs uppercase tracking-wider">
                                                <FileText className="h-4 w-4" style={{ color: 'var(--brand-lime)' }} />
                                                <span>Importers Guidelines</span>
                                            </div>
                                            <p className="text-[10px] text-dim leading-relaxed">
                                                Your spreadsheet must include columns corresponding to the following standard parameters:
                                            </p>
                                            <ul className="text-[10px] text-dim list-disc list-inside space-y-1 font-medium">
                                                <li><strong className="text-main">Payment Number:</strong> Match/link reference key</li>
                                                <li><strong className="text-main">Customer Name:</strong> DB registry customer match</li>
                                                <li><strong className="text-main">Amount Received:</strong> Total payment amount</li>
                                                <li><strong className="text-main">Payment Date:</strong> Valid date string or number</li>
                                                <li><strong className="text-main">Invoice Number:</strong> Link directly to specific invoice</li>
                                            </ul>
                                        </div>

                                        <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-main)' }}>
                                            <p className="text-[9px] text-dim font-bold">Download sample statement templates:</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => downloadTemplate('xlsx')}
                                                    className="flex-1 py-1.5 rounded bg-card hover:bg-input border text-[10px] font-bold text-main cursor-pointer"
                                                    style={{ borderColor: 'var(--border-main)' }}
                                                >
                                                    Excel Template (.xlsx)
                                                </button>
                                                <button
                                                    onClick={() => downloadTemplate('csv')}
                                                    className="flex-1 py-1.5 rounded bg-card hover:bg-input border text-[10px] font-bold text-main cursor-pointer"
                                                    style={{ borderColor: 'var(--border-main)' }}
                                                >
                                                    CSV Template (.csv)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Mapping Config (Bypassed but kept for schema alignment if needed) */}
                            {step === 'mapping' && (
                                <div className="space-y-6">
                                    <div className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <div className="space-y-1">
                                            <h3 className="text-xs font-black text-main">Column Mapping Configuration</h3>
                                            <p className="text-[10px] text-dim">Confirm mapping configuration matching spreadsheet headers to target database fields.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review and Validate */}
                            {step === 'review' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border" 
                                         style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                                            <span className="text-dim">File: <strong className="text-main">{fileName}</strong></span>
                                            <span className="text-dim">Total Rows: <strong className="text-main">{rawRows.length}</strong></span>
                                            <span className="text-green-500">Valid Rows: {validRowsCount}</span>
                                            <span style={{ color: 'var(--brand-lime)' }}>Unique Payments: {uniquePaymentCount}</span>
                                            {rowsWithErrors.length > 0 && <span className="text-red-500 font-extrabold">Validation Errors: {rowsWithErrors.length}</span>}
                                        </div>
                                        <button
                                            onClick={() => setStep('upload')}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer bg-transparent text-main flex items-center gap-1.5"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <ArrowLeft className="h-3.5 w-3.5" /> Upload Different File
                                        </button>
                                    </div>

                                    {rawRows.some(row => validateRow(row).some(err => err.toLowerCase().includes('not found in database'))) && (
                                        <div className="flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold bg-amber-500/5 border-amber-500/20">
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                                <span>Some rows reference invoice numbers that are not found in the database.</span>
                                            </div>
                                            <button
                                                onClick={downloadInvoiceNotFoundExcel}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-input cursor-pointer bg-transparent text-main text-[11px]"
                                                style={{ borderColor: 'var(--border-main)' }}
                                            >
                                                <Download className="h-3.5 w-3.5" /> Download "Invoice Not Found" Rows (.xlsx)
                                            </button>
                                        </div>
                                    )}

                                    {/* Table of Rows */}
                                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="overflow-x-auto max-h-[420px]">
                                            <table className="w-full border-collapse text-left text-xs">
                                                <thead>
                                                    <tr className="border-b" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                                        <th className="p-3 font-bold">Row</th>
                                                        <th className="p-3 font-bold">Payment Number</th>
                                                        <th className="p-3 font-bold">Customer Name</th>
                                                        <th className="p-3 font-bold">Date</th>
                                                        <th className="p-3 font-bold">Amount</th>
                                                        <th className="p-3 font-bold">Method</th>
                                                        <th className="p-3 font-bold">Applied Invoice</th>
                                                        <th className="p-3 font-bold">Status</th>
                                                        <th className="p-3 font-bold text-center">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                                    {rawRows.map((row, idx) => {
                                                        const errors = validateRow(row);
                                                        const hasErrors = errors.length > 0;
                                                        
                                                        const pNo = getMappedRowValue(row, 'paymentNumber');
                                                        const custName = getMappedRowValue(row, 'customerName') || getMappedRowValue(row, 'customerNumber');
                                                        const pDate = getMappedRowValue(row, 'paymentDate');
                                                        const pAmount = getMappedRowValue(row, 'amountReceived');
                                                        const pMethod = getMappedRowValue(row, 'paymentMethod');
                                                        const invNo = getMappedRowValue(row, 'invoiceNumber');

                                                        return (
                                                            <tr key={idx} className={`transition-colors hover:bg-input/20 ${hasErrors ? 'bg-red-500/5' : ''}`}>
                                                                <td className="p-3 text-dim font-medium">{idx + 2}</td>
                                                                <td className="p-3 font-bold text-main">{pNo || <span className="text-dim/50 italic">Auto-generated</span>}</td>
                                                                <td className="p-3 text-main font-bold truncate max-w-[150px]">
                                                                    {custName || <span className="text-red-500 font-bold">Missing</span>}
                                                                </td>
                                                                <td className="p-3 text-main">{formatDateForDisplay(pDate) || <span className="text-red-500">Missing</span>}</td>
                                                                <td className="p-3 text-main font-bold">${pAmount || 0}</td>
                                                                <td className="p-3 text-main">{pMethod || 'Cash'}</td>
                                                                <td className="p-3 text-main font-semibold">{invNo || <span className="text-dim/60 font-medium">Unapplied</span>}</td>
                                                                <td className="p-3">
                                                                    {hasErrors ? (
                                                                        <div className="space-y-1">
                                                                            {errors.map((err, errIdx) => (
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
                                                                        className="p-1 rounded text-dim hover:text-red-500 hover:bg-red-500/10 cursor-pointer border-none bg-transparent disabled:opacity-50"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Import Results Summary */}
                            {step === 'result' && result && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="rounded-xl border p-5 space-y-4" style={{ background: 'rgba(16,185,129,0.02)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                        <div className="flex items-center gap-2.5 text-green-500 font-bold text-sm">
                                            <CheckCircle className="h-5 w-5" />
                                            <span>Import & Reconciliation Complete!</span>
                                        </div>

                                        <div className={`grid grid-cols-1 ${result.extraCount > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
                                            <div className="p-4 rounded-xl border text-center bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                                <p className="text-2xl font-black text-green-500">{result.successCount || 0}</p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-dim mt-1">Reconciled Payments</p>
                                            </div>
                                            {result.extraCount > 0 && (
                                                <div className="p-4 rounded-xl border text-center bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                                    <p className="text-2xl font-black text-amber-500">{result.extraCount || 0}</p>
                                                    <p className="text-[10px] uppercase font-bold tracking-wider text-dim mt-1">Excess Payments (${(result.totalExtraAmount || 0).toFixed(2)})</p>
                                                </div>
                                            )}
                                            <div className="p-4 rounded-xl border text-center bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                                <p className="text-2xl font-black text-blue-500">{result.skippedCount || 0}</p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-dim mt-1">Skipped Duplicates</p>
                                            </div>
                                            <div className="p-4 rounded-xl border text-center bg-card" style={{ borderColor: 'var(--border-main)' }}>
                                                <p className="text-2xl font-black text-red-500">{result.errorCount || 0}</p>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-dim mt-1">Failed Rows</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center bg-input/40 p-4 rounded-xl border pt-3" style={{ borderColor: 'var(--border-main)' }}>
                                                <span className="text-xs text-main font-bold">Download the complete detailed summary report to review changes.</span>
                                                <button
                                                    onClick={downloadImportSummaryReport}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all border hover:bg-input cursor-pointer"
                                                    style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                                >
                                                    <Download className="h-4 w-4" /> Download Detailed Report
                                                </button>
                                            </div>

                                            {rawRows.some(row => validateRow(row).some(err => err.toLowerCase().includes('not found in database'))) && (
                                                <div className="flex justify-between items-center bg-amber-500/5 p-4 rounded-xl border pt-3" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                                                    <span className="text-xs text-main font-bold" style={{ color: 'var(--text-main)' }}>Some payments were skipped or had errors because their invoice numbers were not found.</span>
                                                    <button
                                                        onClick={downloadInvoiceNotFoundExcel}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all border hover:bg-input cursor-pointer"
                                                        style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                                    >
                                                        <Download className="h-4 w-4" /> Download "Invoice Not Found" Rows (.xlsx)
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Error Logs Detail */}
                                        {((result.errors && result.errors.length > 0) || (result.skipped && result.skipped.length > 0)) && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-main">Import Logs details</h4>
                                                <div className="p-4 rounded-xl bg-input border space-y-2 max-h-[220px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                                    {result.skipped?.map((skip: string, idx: number) => (
                                                        <div key={`skip-${idx}`} className="text-[11px] text-dim flex items-center gap-1.5">
                                                            <Info className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                            <span>{skip}</span>
                                                        </div>
                                                    ))}
                                                    {result.errors?.map((err: string, idx: number) => (
                                                        <div key={`err-${idx}`} className="text-[11px] text-red-500 flex items-start gap-1.5 font-medium leading-relaxed">
                                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500 mt-0.5" />
                                                            <span>{err}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal Footer Controls */}
                {!uploading && (
                    <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        {step === 'upload' && (
                            <span className="text-[10px] text-dim font-bold">Upload Excel/CSV statement to begin automated reconciliation.</span>
                        )}
                        {step === 'review' && (
                            <>
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-dim font-bold font-sans">
                                        {validRowsCount} valid rows → <span style={{ color: 'var(--brand-lime)' }}>{uniquePaymentCount} unique payments</span> to reconcile.
                                    </span>
                                    <label className="flex items-center gap-1.5 text-[10px] text-main font-bold cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoDownloadFailed}
                                            onChange={(e) => setAutoDownloadFailed(e.target.checked)}
                                            className="rounded border-gray-300 text-lime-500 focus:ring-lime-500 cursor-pointer accent-lime-500"
                                        />
                                        <span>Auto-download Failed Rows (.xlsx)</span>
                                    </label>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('upload')}
                                        className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-input cursor-pointer bg-transparent text-main flex items-center gap-1.5"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        <ArrowLeft className="h-3.5 w-3.5" /> Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={validRowsCount === 0}
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black transition-all border-none hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer disabled:opacity-50 disabled:scale-100"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        <Upload className="h-4 w-4" /> Start Import & Reconciliation
                                    </button>
                                </div>
                            </>
                        )}
                        {step === 'result' && (
                            <>
                                <span className="text-[10px] text-dim font-bold">Review any warnings or logs above before closing.</span>
                                <button
                                    onClick={handleClose}
                                    className="px-5 py-2 rounded-lg text-xs font-black transition-all border-none hover:scale-[1.02] active:scale-95 shadow-md cursor-pointer"
                                    style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                >
                                    Close Importer
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BulkPaymentUpload;
