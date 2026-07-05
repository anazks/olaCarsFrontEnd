import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    X, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet,
    Loader2, Play, Calendar, AlertCircle, History, Clock, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
    importLedger, getImportProgress, getImportHistory, getSampleExcelBlob, getAllAccountingCodes
} from '../../../services/accountingService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

interface LocalError {
    row: number;
    error: string;
}

interface ValidEntry {
    rowNum: number;
    date: string;
    accountName: string;
    type: string;
    amount: number;
    description: string;
    transactionType: string;
}

interface LocalValidationResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    errors: LocalError[];
    validEntries?: ValidEntry[];
    rows: any[];
}

const BulkLedgerUploadPage = () => {
    const navigate = useNavigate();

    // File upload states
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Metadata validation cache
    const [accounts, setAccounts] = useState<any[]>([]);

    const findAccount = useCallback((nameVal: any, codeVal: any) => {
        const nameStr = nameVal ? String(nameVal).trim() : "";
        const codeStr = codeVal ? String(codeVal).trim() : "";

        // 1. Try matching nameVal first if provided
        if (nameStr) {
            const searchKey = nameStr.toLowerCase();
            const searchKeyNorm = searchKey.replace(/[^a-z0-9]/g, "");
            // Try exact
            let found = accounts.find(a => a.name && a.name.toLowerCase().trim() === searchKey);
            if (found) return found;
            // Try normalized
            found = accounts.find(a => {
                const norm = (a.name || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
                return norm && norm === searchKeyNorm;
            });
            if (found) return found;
            // Try substring
            found = accounts.find(a => {
                const nameLower = (a.name || "").toLowerCase().trim();
                const nameNorm = nameLower.replace(/[^a-z0-9]/g, "");
                return nameNorm.includes(searchKeyNorm) || searchKeyNorm.includes(nameNorm);
            });
            if (found) return found;
        }

        // 2. Try matching codeVal if name check failed/not provided and codeVal is provided
        if (codeStr) {
            const searchKey = codeStr.toLowerCase();
            const searchKeyNorm = searchKey.replace(/[^a-z0-9]/g, "");
            return accounts.find(a => 
                (a.code && a.code.toLowerCase().trim() === searchKey) ||
                (a.code && a.code.toLowerCase().trim().replace(/[^a-z0-9]/g, "") === searchKeyNorm)
            ) || null;
        }

        return null;
    }, [accounts]);

    // Operation states
    const [isProcessing, setIsProcessing] = useState(false); // file reading
    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState(0);
    const [validationResult, setValidationResult] = useState<LocalValidationResult | null>(null);
    const [activeTab, setActiveTab] = useState<'errors' | 'valid'>('errors');

    // Import states
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<any>(null);
    const [skipDuplicates, setSkipDuplicates] = useState(true);

    // History and final states
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showSummary, setShowSummary] = useState(false);

    // Virtual list scroll state for errors
    const [errorScrollTop, setErrorScrollTop] = useState(0);
    const errorContainerHeight = 350;
    const errorItemHeight = 44;

    // Virtual list scroll state for valid entries
    const [validScrollTop, setValidScrollTop] = useState(0);

    // Load validation metadata & history
    const loadMetadataAndHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const [codes, historyList] = await Promise.allSettled([
                getAllAccountingCodes({ limit: 100000 }),
                getImportHistory()
            ]);

            if (codes.status === 'fulfilled') {
                // Handle different response shapes
                const cList = Array.isArray(codes.value) ? codes.value : (codes.value as any).data || [];
                setAccounts(cList);
            }
            if (historyList.status === 'fulfilled') {
                setHistory(historyList.value || []);
            }
        } catch (err) {
            console.error("Failed to load upload metadata", err);
            toast.error("Failed to initialize upload settings.");
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        loadMetadataAndHistory();
    }, [loadMetadataAndHistory]);

    // Handle template download
    const handleDownloadTemplate = async () => {
        try {
            const blob = await getSampleExcelBlob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'ledger_bulk_upload_sample.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Excel template downloaded.");
        } catch (err: any) {
            toast.error("Failed to download template: " + (err.message || err));
        }
    };

    // Client-side parser trigger
    const parseFile = (selectedFile: File) => {
        setFile(selectedFile);
        setFileName(selectedFile.name);
        setValidationResult(null);
        setShowSummary(false);
        setImportProgress(null);
        setIsProcessing(true);

        const reader = new FileReader();
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();

        if (extension === 'xlsx' || extension === 'xls') {
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, dateNF: 'yyyy-mm-dd' });
                    const filteredRows = rawRows.filter((row: any) =>
                        Object.values(row).some(val => val !== undefined && val !== null && String(val).trim() !== "")
                    );

                    setIsProcessing(false);
                    if (filteredRows.length === 0) {
                        toast.error("The Excel sheet is empty.");
                        resetState();
                    } else {
                        // Keep rows in memory to validate
                        setValidationResult({
                            totalRows: filteredRows.length,
                            validRows: 0,
                            invalidRows: 0,
                            duplicateRows: 0,
                            errors: [],
                            rows: filteredRows
                        });
                        toast.success(`Loaded ${filteredRows.length} rows. Click Validate File.`);
                    }
                } catch (err: any) {
                    setIsProcessing(false);
                    toast.error("Failed to read Excel workbook.");
                    resetState();
                }
            };
            reader.readAsArrayBuffer(selectedFile);
        } else if (extension === 'csv') {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    setIsProcessing(false);
                    const rawRows = results.data as any[];
                    const filteredRows = rawRows.filter((row: any) =>
                        Object.values(row).some(val => val !== undefined && val !== null && String(val).trim() !== "")
                    );

                    if (filteredRows.length === 0) {
                        toast.error("The CSV file is empty.");
                        resetState();
                    } else {
                        setValidationResult({
                            totalRows: filteredRows.length,
                            validRows: 0,
                            invalidRows: 0,
                            duplicateRows: 0,
                            errors: [],
                            rows: filteredRows
                        });
                        toast.success(`Loaded ${filteredRows.length} rows. Click Validate File.`);
                    }
                },
                error: (err: any) => {
                    setIsProcessing(false);
                    toast.error(`CSV parser error: ${err.message}`);
                    resetState();
                }
            });
        } else {
            setIsProcessing(false);
            toast.error("Unsupported file format. Please upload .xlsx, .xls, or .csv.");
            resetState();
        }
    };

    // Client-side row validator wrapper
    const validateRowData = (row: any, accountMap: Record<string, boolean>, localDups: Record<string, boolean>) => {
        const errorsList: string[] = [];

        // Fetch flex values matching standard names
        const getVal = (possibleKeys: string[]) => {
            for (const key of possibleKeys) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
                    return row[key];
                }
                const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
                for (const k of Object.keys(row)) {
                    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (normK === normKey) {
                        if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
                            return row[k];
                        }
                    }
                }
            }
            return undefined;
        };

        const accName = getVal(["Account Name", "account_name", "Account"]);
        const dateVal = getVal(["Entry Date", "entry_date", "date"]);
        const desc = getVal(["Description", "description", "transaction_details"]);
        const txnType = getVal(["Transaction Type", "transaction_type"]);

        // Resolve Amount (supporting both Debit/Credit columns or single Type/Amount columns)
        let amount = 0;
        const amountStr = getVal(["Amount", "amount"]);

        const debitVal = getVal(["debit", "debit_amount", "dr"]);
        const creditVal = getVal(["credit", "credit_amount", "cr"]);

        if (debitVal !== undefined && debitVal !== null && debitVal !== "") {
            const parsed = parseFloat(debitVal);
            if (!isNaN(parsed)) {
                amount = parsed;
            }
        } else if (creditVal !== undefined && creditVal !== null && creditVal !== "") {
            const parsed = parseFloat(creditVal);
            if (!isNaN(parsed)) {
                amount = parsed;
            }
        } else if (amountStr !== undefined && amountStr !== null && amountStr !== "") {
            const parsed = parseFloat(amountStr);
            amount = isNaN(parsed) ? 0 : parsed;
        }

        // Validate account
        const accCode = getVal(["accountingCode", "Account Code", "account_code", "Accounting Code", "accounting_code", "Account ID", "account_id"]);
        const foundAcc = findAccount(accName, accCode);
        if (!accName && !accCode) {
            errorsList.push("Account Name or Code is required.");
        } else if (!foundAcc) {
            errorsList.push(`Account "${accName || accCode}" not found.`);
        }

        // Validate Entry Date
        if (!dateVal) {
            errorsList.push("Entry Date is required.");
        } else {
            // Basic date check — just verify dateStr can produce a non-empty result
            const parsed = dateStr(dateVal);
            if (!parsed) {
                errorsList.push(`Invalid Entry Date: "${dateVal}".`);
            }
        }


        // Validate transaction type
        if (!txnType || !String(txnType).trim()) {
            errorsList.push("Transaction Type is required.");
        }

        // Validate duplicates internally in the file
        let isDuplicate = false;
        if (accName && dateStr(dateVal)) {
            const key = `${dateStr(dateVal)}_${String(accName).toLowerCase().trim()}_${amount}_${String(desc).toLowerCase().trim()}`;
            if (localDups[key]) {
                isDuplicate = true;
            }
            localDups[key] = true;
        }

        return {
            isValid: errorsList.length === 0,
            errors: errorsList.join(" "),
            isDuplicate
        };
    };

    const dateStr = (val: any): string => {
        if (!val) return "";
        // With raw:false + dateNF:'yyyy-mm-dd', dates arrive as strings like "2023-09-01"
        // Just clean and return the string directly — no JS Date object needed
        const str = String(val).trim();
        if (!str) return "";
        // Already in yyyy-mm-dd format from xlsx dateNF
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0].split(" ")[0];
        // Handle dd/mm/yyyy or mm/dd/yyyy or dd-mm-yyyy formats
        const parts = str.split(/[\/\-.]/);
        if (parts.length >= 3) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);
            if (parts[0].length === 4) {
                // yyyy-mm-dd already
                return `${parts[0]}-${String(p1).padStart(2,'0')}-${String(p2).padStart(2,'0')}`;
            }
            // dd/mm/yyyy or mm/dd/yyyy — assume dd/mm/yyyy, swap if month > 12
            let day = p0, month = p1;
            const year = p2 < 100 ? 2000 + p2 : p2;
            if (month > 12 && day <= 12) { day = p1; month = p0; }
            return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        }
        return str.split(" ")[0] || str;
    };

    // Asynchronous Validation Sequence
    const handleValidate = async () => {
        if (!validationResult || validationResult.rows.length === 0) return;

        setIsValidating(true);
        setValidationProgress(0);
        setErrorScrollTop(0);
        setValidScrollTop(0);

        const rows = validationResult.rows;
        const total = rows.length;
        const batchSize = 1000;
        let index = 0;

        const collectedErrors: LocalError[] = [];
        const collectedValid: ValidEntry[] = [];
        let validRowsCount = 0;
        let duplicateRowsCount = 0;

        // Build account map for instant local check
        const accountMap: Record<string, boolean> = {};
        accounts.forEach(a => {
            if (a.name) {
                const nameLower = a.name.toLowerCase().trim();
                accountMap[nameLower] = true;
                const nameNorm = nameLower.replace(/[^a-z0-9]/g, "");
                if (nameNorm) accountMap[nameNorm] = true;
            }
            if (a.code) {
                const codeLower = a.code.toLowerCase().trim();
                accountMap[codeLower] = true;
                const codeNorm = codeLower.replace(/[^a-z0-9]/g, "");
                if (codeNorm) accountMap[codeNorm] = true;
            }
        });

        const localDups: Record<string, boolean> = {};

        const processValidationBatch = () => {
            const limit = Math.min(index + batchSize, total);
            for (let i = index; i < limit; i++) {
                const row = rows[i];
                const res = validateRowData(row, accountMap, localDups);
                if (!res.isValid) {
                    collectedErrors.push({ row: i + 2, error: res.errors });
                } else {
                    validRowsCount++;

                    // Extract values matching standard names
                    const getVal = (possibleKeys: string[]) => {
                        for (const key of possibleKeys) {
                            if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
                                return row[key];
                            }
                            const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
                            for (const k of Object.keys(row)) {
                                const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                                if (normK === normKey) {
                                    if (row[k] !== undefined && row[k] !== null && row[k] !== "") {
                                        return row[k];
                                    }
                                }
                            }
                        }
                        return undefined;
                    };

                    const accName = getVal(["Account Name", "account_name", "Account"]) || "";
                    const accCode = getVal(["accountingCode", "Account Code", "account_code", "Accounting Code", "accounting_code", "Account ID", "account_id"]) || "";
                    const foundAcc = findAccount(accName, accCode);
                    const finalAccountName = foundAcc ? foundAcc.name : (accName || accCode || "");

                    const dateVal = getVal(["Entry Date", "entry_date", "date"]);
                    const desc = getVal(["Description", "description", "transaction_details"]) || "";
                    const txnType = getVal(["Transaction Type", "transaction_type"]) || "";

                    let type = "DEBIT";
                    let amount = 0;
                    const amountStr = getVal(["Amount", "amount"]);
                    const typeStr = getVal(["Type (Debit/Credit)", "type", "debit_credit"]);

                    const debitVal = getVal(["debit", "debit_amount", "dr"]);
                    const creditVal = getVal(["credit", "credit_amount", "cr"]);

                    if (debitVal !== undefined && debitVal !== null && debitVal !== "") {
                        const parsed = parseFloat(debitVal);
                        if (!isNaN(parsed)) {
                            type = "DEBIT";
                            amount = parsed;
                        }
                    } else if (creditVal !== undefined && creditVal !== null && creditVal !== "") {
                        const parsed = parseFloat(creditVal);
                        if (!isNaN(parsed)) {
                            type = "CREDIT";
                            amount = parsed;
                        }
                    } else if (amountStr !== undefined && amountStr !== null && amountStr !== "") {
                        const parsed = parseFloat(amountStr);
                        amount = isNaN(parsed) ? 0 : parsed;
                        if (typeStr) {
                            const normType = String(typeStr).toUpperCase().trim();
                            if (["CREDIT", "CR"].includes(normType)) {
                                type = "CREDIT";
                            }
                        }
                    }

                    collectedValid.push({
                        rowNum: i + 2,
                        date: dateStr(dateVal),
                        accountName: String(finalAccountName),
                        type,
                        amount,
                        description: String(desc),
                        transactionType: String(txnType)
                    });
                }
                if (res.isDuplicate) {
                    duplicateRowsCount++;
                }
            }

            index = limit;
            const progress = Math.floor((index / total) * 100);
            setValidationProgress(progress);

            if (index < total) {
                // Yield control to prevent freezing
                setTimeout(processValidationBatch, 0);
            } else {
                // Done
                const hasErrors = collectedErrors.length > 0;
                setValidationResult(prev => ({
                    totalRows: total,
                    validRows: validRowsCount,
                    invalidRows: collectedErrors.length,
                    duplicateRows: duplicateRowsCount,
                    errors: collectedErrors,
                    validEntries: collectedValid,
                    rows: prev?.rows || []
                }));
                setActiveTab(hasErrors ? 'errors' : 'valid');
                setIsValidating(false);
                toast.success(`Validation complete: ${validRowsCount} valid, ${collectedErrors.length} invalid.`);

            }
        };

        // Start async loop
        setTimeout(processValidationBatch, 0);
    };

    const downloadErrorsCSV = (errors: LocalError[], nameOfFile: string) => {
        if (!errors || errors.length === 0) return;

        // Extract all original headers from the parsed rows (if any rows were loaded)
        const originalKeys = validationResult?.rows?.length 
            ? Object.keys(validationResult.rows[0]) 
            : [];

        const csvHeaders = ["Row Number", ...originalKeys, "Validation Error Message"];
        const csvRows = errors.map(e => {
            const originalRow = validationResult?.rows?.[e.row - 2] || {};
            const rowValues = [
                String(e.row),
                ...originalKeys.map(key => {
                    const val = originalRow[key] !== undefined && originalRow[key] !== null ? originalRow[key] : "";
                    return `"${String(val).replace(/"/g, '""')}"`;
                }),
                `"${e.error.replace(/"/g, '""')}"`
            ];
            return rowValues.join(",");
        });

        const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = nameOfFile ? nameOfFile.split('.')[0] : 'ledger';
        link.setAttribute('download', `validation_errors_${name}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Validation error report downloaded.");
    };

    const downloadImportErrorsCSV = (errors: any[], nameOfFile: string) => {
        if (!errors || errors.length === 0) return;

        // Extract all original headers from the parsed rows (if any rows were loaded)
        const originalKeys = validationResult?.rows?.length 
            ? Object.keys(validationResult.rows[0]) 
            : [];

        const csvHeaders = ["Row Number", ...originalKeys, "Import Error Message"];
        const csvRows = errors.map(e => {
            const originalRow = (typeof e.row === 'number' && validationResult?.rows)
                ? (validationResult.rows[e.row - 2] || {})
                : {};
            const rowValues = [
                String(e.row || 'System'),
                ...originalKeys.map(key => {
                    const val = originalRow[key] !== undefined && originalRow[key] !== null ? originalRow[key] : "";
                    return `"${String(val).replace(/"/g, '""')}"`;
                }),
                `"${(e.error || e.reason || "").replace(/"/g, '""')}"`
            ];
            return rowValues.join(",");
        });

        const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const name = nameOfFile ? nameOfFile.split('.')[0] : 'ledger';
        link.setAttribute('download', `import_errors_${name}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Import error report downloaded.");
    };

    // Client-side CSV generator for invalid rows
    const handleDownloadErrorsCSV = () => {
        if (!validationResult || validationResult.errors.length === 0) return;
        downloadErrorsCSV(validationResult.errors, fileName);
    };

    // Upload & Import triggers
    const handleImport = async () => {
        if (!file) return;
        setIsImporting(true);
        setImportProgress({
            percent: 5,
            message: "Uploading file to server...",
            completedRows: 0,
            totalRows: validationResult?.totalRows || 0,
            failedRows: 0,
            errors: []
        });

        try {
            const res = await importLedger(file, skipDuplicates);
            if (res.success && res.importId) {
                // Start polling
                pollProgress(res.importId);
            } else {
                throw new Error(res.message || "Failed to trigger import.");
            }
        } catch (err: any) {
            console.error("Import failure:", err);
            toast.error(err.response?.data?.message || err.message || "Import failed.");
            setIsImporting(false);
        }
    };

    // Poll status from the server
    const pollProgress = (importId: string) => {
        const interval = setInterval(async () => {
            try {
                const data = await getImportProgress(importId);
                setImportProgress(data);

                if (data.status === "COMPLETED" || data.status === "FAILED") {
                    clearInterval(interval);
                    setIsImporting(false);
                    setShowSummary(true);

                    if (data.status === "COMPLETED") {
                        if (data.failedRows > 0) {
                            toast(`Import complete with ${data.failedRows} error(s).`, { icon: '⚠️' });
                            if (data.errors && data.errors.length > 0) {
                                downloadImportErrorsCSV(data.errors, fileName);
                            }
                        } else {
                            toast.success("All records imported successfully!");
                        }
                    } else {
                        toast.error("Database import failed.");
                        if (data.errors && data.errors.length > 0) {
                            downloadImportErrorsCSV(data.errors, fileName);
                        }
                    }

                    // Reload histories
                    getImportHistory().then(h => setHistory(h || []));
                }
            } catch (err) {
                console.error("Progress polling failed:", err);
            }
        }, 800);
    };

    const resetState = () => {
        setFile(null);
        setFileName('');
        setValidationResult(null);
        setImportProgress(null);
        setShowSummary(false);
        setIsProcessing(false);
        setIsValidating(false);
        setIsImporting(false);
        setErrorScrollTop(0);
        setValidScrollTop(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // File drop event handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) parseFile(droppedFile);
    };

    // Virtual list scroll math
    const totalErrorsCount = validationResult?.errors.length || 0;
    const virtualStartIndex = Math.max(0, Math.floor(errorScrollTop / errorItemHeight) - 3);
    const virtualEndIndex = Math.min(totalErrorsCount - 1, Math.floor((errorScrollTop + errorContainerHeight) / errorItemHeight) + 3);
    const visibleErrors = (validationResult?.errors || []).slice(virtualStartIndex, virtualEndIndex + 1);

    return (
        <div className="w-full min-h-screen p-6" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            {/* Header section */}
            <div className="flex flex-col gap-2 mb-6">
                <Breadcrumbs
                    items={[
                        { label: 'Accounting', path: '#' },
                        { label: 'Bulk Ledger Upload', path: '' }
                    ]}
                />
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            Bulk Ledger Entries Import
                        </h1>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            Import thousands of double-entry ledger lines safely with complete structural validation.
                        </p>
                    </div>
                    <button
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-lime bg-lime/10 border border-lime/20 px-4 py-2.5 rounded-xl hover:scale-105 transition-all hover:bg-lime/20 active:scale-95"
                        style={{ color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)' }}
                    >
                        <FileDown size={14} /> Download Sample Excel
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Operations Block */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Drag and Drop Box */}
                    {!file ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragOver
                                ? 'bg-lime/5 border-brand-lime scale-[0.99]'
                                : 'border-[var(--border-main)] hover:border-brand-lime bg-[var(--bg-card)]'
                                }`}
                            style={{ minHeight: '260px' }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                            />
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="animate-spin text-brand-lime" size={32} style={{ color: 'var(--brand-lime)' }} />
                                    <span className="text-sm font-bold">Reading excel workbook content...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center text-brand-lime border border-white/10" style={{ color: 'var(--brand-lime)' }}>
                                        <Upload size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">Drag and drop your spreadsheet here</p>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                            Supports Excel (.xlsx, .xls) and CSV files
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* File Loaded Screen */
                        <div className="rounded-2xl border p-5 space-y-5 bg-[var(--bg-card)]" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-lime/10 rounded-lg flex items-center justify-center text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold">{fileName}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {validationResult?.totalRows || 0} rows found in spreadsheet
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetState}
                                    disabled={isValidating || isImporting}
                                    className="p-1.5 rounded-lg border hover:bg-white/5 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-4 text-xs font-bold">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={skipDuplicates}
                                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                                        disabled={isValidating || isImporting}
                                        className="w-4 h-4 rounded border-gray-300 text-brand-lime accent-[#C8E600] cursor-pointer"
                                    />
                                    Skip Duplicate Entries (Recommended)
                                </label>
                            </div>

                            {/* Validation triggers */}
                            {!validationResult?.errors.length && !validationResult?.validRows && !isValidating && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleValidate}
                                        className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-brand-black bg-brand-lime px-4 py-3 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                        style={{ background: 'var(--brand-lime)' }}
                                    >
                                        <Play size={14} /> Validate File
                                    </button>
                                </div>
                            )}

                            {/* Local validations running progress bar */}
                            {isValidating && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Running async structural integrity rules...</span>
                                        <span>{validationProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-lime transition-all duration-200"
                                            style={{ width: `${validationProgress}%`, background: 'var(--brand-lime)' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Validation Result Summary Cards */}
                            {validationResult && !isValidating && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                        <div className="text-xl font-black">{validationResult.totalRows}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider mt-1" style={{ color: 'var(--text-dim)' }}>Total Rows</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-green-500/20 text-center bg-green-500/5">
                                        <div className="text-xl font-black text-green-500">{validationResult.validRows}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider mt-1 text-green-500/70">Valid Rows</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-red-500/20 text-center bg-red-500/5">
                                        <div className="text-xl font-black text-red-500">{validationResult.invalidRows}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider mt-1 text-red-500/70">Invalid Rows</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-orange-500/20 text-center bg-orange-500/5">
                                        <div className="text-xl font-black text-orange-500">{validationResult.duplicateRows}</div>
                                        <div className="text-[10px] uppercase font-bold tracking-wider mt-1 text-orange-500/70">Duplicates</div>
                                    </div>
                                </div>
                            )}

                            {/* Tabbed Validation Result Table */}
                            {validationResult && !isValidating && (
                                <div className="space-y-4">
                                    {/* Tabs Header */}
                                    <div className="flex border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        {validationResult.errors.length > 0 && (
                                            <button
                                                onClick={() => setActiveTab('errors')}
                                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'errors'
                                                        ? 'border-red-500 text-red-500'
                                                        : 'border-transparent text-dim hover:text-white'
                                                    }`}
                                            >
                                                Validation Errors ({validationResult.errors.length})
                                            </button>
                                        )}
                                        {validationResult.validRows > 0 && (
                                            <button
                                                onClick={() => setActiveTab('valid')}
                                                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'valid'
                                                        ? 'border-brand-lime text-brand-lime'
                                                        : 'border-transparent text-dim hover:text-white'
                                                    }`}
                                            >
                                                Parsed Valid Rows ({validationResult.validRows})
                                            </button>
                                        )}
                                    </div>

                                    {/* Errors Tab Content */}
                                    {activeTab === 'errors' && validationResult.errors.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-bold text-red-500">
                                                    <AlertCircle size={14} />
                                                    <span>Validation failed on {validationResult.errors.length} records. Please fix before importing.</span>
                                                </div>
                                                <button
                                                    onClick={handleDownloadErrorsCSV}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                                                >
                                                    <Download size={11} /> Download Error Report (CSV)
                                                </button>
                                            </div>

                                            {/* Error Virtual Scroll Container */}
                                            <div
                                                className="rounded-xl border overflow-hidden"
                                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}
                                            >
                                                <div className="flex border-b text-xs font-bold uppercase tracking-wider p-3" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                                    <div className="w-[20%] pl-2" style={{ color: 'var(--text-dim)' }}>Row</div>
                                                    <div className="w-[80%]" style={{ color: 'var(--text-dim)' }}>Validation Error Reason</div>
                                                </div>

                                                <div
                                                    key={`error-scroll-${validationResult.errors.length}`}
                                                    style={{ height: `${errorContainerHeight}px`, overflowY: 'auto', position: 'relative' }}
                                                    onScroll={(e) => setErrorScrollTop(e.currentTarget.scrollTop)}
                                                >
                                                    <div style={{ height: `${totalErrorsCount * errorItemHeight}px`, width: '100%' }}>
                                                        <div style={{ transform: `translateY(${virtualStartIndex * errorItemHeight}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
                                                            {visibleErrors.map((err, idx) => (
                                                                <div
                                                                    key={virtualStartIndex + idx}
                                                                    className="flex border-b items-center text-xs p-3 hover:bg-white/5"
                                                                    style={{ height: `${errorItemHeight}px`, borderColor: 'var(--border-main)' }}
                                                                >
                                                                    <div className="w-[20%] font-black text-white pl-2">Row {err.row}</div>
                                                                    <div className="w-[80%] text-red-400 truncate pr-2" title={err.error}>
                                                                        {err.error}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Valid Entries Preview Tab Content */}
                                    {activeTab === 'valid' && validationResult.validEntries && validationResult.validEntries.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="text-xs font-bold text-green-500 flex items-center gap-2">
                                                <CheckCircle size={14} />
                                                <span>Showing preview of parsed valid rows. Review details before importing.</span>
                                            </div>

                                            {/* Valid entries virtual table */}
                                            <div
                                                className="rounded-xl border overflow-hidden"
                                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}
                                            >
                                                <div className="flex border-b text-xs font-bold uppercase tracking-wider p-3" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                                    <div className="w-[10%] pl-2" style={{ color: 'var(--text-dim)' }}>Row</div>
                                                    <div className="w-[15%]" style={{ color: 'var(--text-dim)' }}>Date</div>
                                                    <div className="w-[20%]" style={{ color: 'var(--text-dim)' }}>Account</div>
                                                    <div className="w-[10%]" style={{ color: 'var(--text-dim)' }}>Type</div>
                                                    <div className="w-[15%]" style={{ color: 'var(--text-dim)' }}>Amount</div>
                                                    <div className="w-[30%]" style={{ color: 'var(--text-dim)' }}>Description</div>
                                                </div>

                                                <div
                                                    key={`valid-scroll-${validationResult.validEntries?.length || 0}`}
                                                    style={{ height: `350px`, overflowY: 'auto', position: 'relative' }}
                                                    onScroll={(e) => setValidScrollTop(e.currentTarget.scrollTop)}
                                                >
                                                    {(() => {
                                                        const totalValid = validationResult.validEntries.length;
                                                        const validStartIndex = Math.max(0, Math.floor(validScrollTop / 44) - 3);
                                                        const validEndIndex = Math.min(totalValid - 1, Math.floor((validScrollTop + 350) / 44) + 3);
                                                        const visibleValid = validationResult.validEntries.slice(validStartIndex, validEndIndex + 1);
                                                        return (
                                                            <div style={{ height: `${totalValid * 44}px`, width: '100%' }}>
                                                                <div style={{ transform: `translateY(${validStartIndex * 44}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
                                                                    {visibleValid.map((item, idx) => (
                                                                        <div
                                                                            key={validStartIndex + idx}
                                                                            className="flex border-b items-center text-xs p-3 hover:bg-white/5"
                                                                            style={{ height: `44px`, borderColor: 'var(--border-main)' }}
                                                                        >
                                                                            <div className="w-[10%] font-black text-white pl-2">Row {item.rowNum}</div>
                                                                            <div className="w-[15%] text-white">{item.date}</div>
                                                                            <div className="w-[20%] text-white truncate" title={item.accountName}>{item.accountName}</div>
                                                                            <div className="w-[10%]">
                                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.type === 'DEBIT' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                                                                                    {item.type}
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-[15%] text-white font-mono">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                                            <div className="w-[30%] text-white truncate pr-2" title={item.description}>{item.description}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Database Import triggers */}
                            {validationResult && validationResult.validRows > 0 && !isValidating && !isImporting && !showSummary && (
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleImport}
                                        className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-brand-black bg-brand-lime px-4 py-3.5 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                                        style={{ background: 'var(--brand-lime)' }}
                                    >
                                        <CheckCircle size={14} /> Import to Ledger
                                    </button>
                                    <button
                                        onClick={resetState}
                                        className="px-5 py-3 rounded-xl border text-xs font-black uppercase tracking-widest text-dim hover:bg-white/5 transition-all"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                    >
                                        Cancel Upload
                                    </button>
                                </div>
                            )}

                            {/* DB Import Progress indicator */}
                            {isImporting && importProgress && (
                                <div className="p-4 rounded-xl border space-y-4" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="animate-spin text-brand-lime" size={14} style={{ color: 'var(--brand-lime)' }} />
                                            <span>{importProgress.message}</span>
                                        </div>
                                        <span>{importProgress.percent}%</span>
                                    </div>

                                    {/* Double stats progress */}
                                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-lime transition-all duration-300"
                                            style={{ width: `${importProgress.percent}%`, background: 'var(--brand-lime)' }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>
                                        <span>Completed: {importProgress.completedRows} / {importProgress.totalRows}</span>
                                        <span>Errors: {importProgress.failedRows}</span>
                                    </div>
                                </div>
                            )}

                            {/* Final success/failure Import Report summary */}
                            {showSummary && importProgress && (
                                <div
                                    className={`p-5 rounded-xl border space-y-4 ${importProgress.status === "FAILED"
                                            ? 'border-red-500/20 bg-red-500/5'
                                            : 'border-brand-lime/20 bg-brand-lime/5'
                                        }`}
                                    style={{
                                        background: importProgress.status === "FAILED"
                                            ? 'rgba(239,68,68,0.03)'
                                            : 'rgba(200,230,0,0.03)'
                                    }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {importProgress.status === "FAILED" ? (
                                            <>
                                                <AlertTriangle size={20} className="text-red-500" />
                                                <span className="text-sm font-black uppercase tracking-wider text-red-500">Import Process Failed</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                                <span className="text-sm font-black uppercase tracking-wider text-brand-lime" style={{ color: 'var(--brand-lime)' }}>Import Completed Successfully</span>
                                            </>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                                        <div className="p-3 bg-white/5 rounded-lg border text-center" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="text-lg font-black text-white">{importProgress.totalRows}</div>
                                            <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Total Records</div>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border text-center" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="text-lg font-black text-green-400">{importProgress.completedRows}</div>
                                            <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Imported</div>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border text-center" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="text-lg font-black text-red-400">{importProgress.failedRows}</div>
                                            <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Failed</div>
                                        </div>
                                        <div className="p-3 bg-white/5 rounded-lg border text-center" style={{ borderColor: 'var(--border-main)' }}>
                                            <div className="text-lg font-black text-blue-400">{importProgress.duration}s</div>
                                            <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-dim)' }}>Execution Time</div>
                                        </div>
                                    </div>

                                    {/* Backend Execution Errors list */}
                                    {importProgress.errors && importProgress.errors.length > 0 && (
                                        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-red-400 uppercase tracking-wider">
                                                    Database Import Error Reasons:
                                                </div>
                                                <button
                                                    onClick={() => downloadImportErrorsCSV(importProgress.errors, fileName)}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all"
                                                >
                                                    <Download size={11} /> Download Import Error Report (CSV)
                                                </button>
                                            </div>
                                            <div
                                                className="max-h-[250px] overflow-y-auto rounded-xl border border-red-500/10 p-3 space-y-2 font-mono text-[11px] bg-black/20"
                                            >
                                                {importProgress.errors.map((err: any, idx: number) => (
                                                    <div key={idx} className="flex gap-2 text-red-300">
                                                        <span className="text-red-500/60 font-black">Row {err.row || 'System'}:</span>
                                                        <span className="whitespace-pre-wrap">{err.error}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action items */}
                                    <div className="flex gap-3 pt-2">
                                        {importProgress.status !== "FAILED" && (
                                            <button
                                                onClick={() => navigate('/admin/financial-admin/ledger')}
                                                className="px-4 py-2.5 rounded-xl border border-brand-lime/30 hover:border-brand-lime text-xs font-black uppercase tracking-widest text-brand-lime transition-all"
                                                style={{ color: 'var(--brand-lime)' }}
                                            >
                                                View General Ledger
                                            </button>
                                        )}
                                        <button
                                            onClick={resetState}
                                            className="px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest text-dim hover:bg-white/5 transition-all"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                        >
                                            {importProgress.status === "FAILED" ? "Close & Try Again" : "Upload Another File"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar History Panel */}
                <div className="space-y-6">
                    <div className="rounded-2xl border p-5 bg-[var(--bg-card)] space-y-4" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <History size={18} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                                Previous Uploads
                            </h2>
                        </div>

                        {loadingHistory ? (
                            <div className="flex items-center justify-center p-8 gap-2">
                                <Loader2 className="animate-spin text-brand-lime" size={16} style={{ color: 'var(--brand-lime)' }} />
                                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading histories...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center p-8 text-xs" style={{ color: 'var(--text-dim)' }}>
                                No previous imports found.
                            </div>
                        ) : (
                            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                                {history.map((h, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-xl border text-xs space-y-2 bg-[var(--bg-sidebar)]"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="font-bold truncate max-w-[150px] text-white" title={h.fileName}>
                                                {h.fileName || "unknown_ledger_import.xlsx"}
                                            </div>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${h.status === 'COMPLETED'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}
                                            >
                                                {h.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-1.5 text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={11} />
                                                <span>{new Date(h.startTime).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-end">
                                                <Clock size={11} />
                                                <span>{h.duration || 0}s duration</span>
                                            </div>
                                            <div>Imported: <span className="text-white font-bold">{h.completedRows}</span></div>
                                            <div className="text-right">Errors: <span className={h.failedRows > 0 ? "text-red-400 font-bold" : "text-white"}>{h.failedRows}</span></div>
                                        </div>

                                        {h.startedBy && (
                                            <div className="text-[10px] border-t pt-1.5 flex items-center justify-between" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                                <span>Uploaded by:</span>
                                                <span className="text-white">{h.startedBy.name}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkLedgerUploadPage;
