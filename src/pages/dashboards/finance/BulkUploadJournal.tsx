import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, 
    Loader2, Play, User, Building, CheckCircle2, ShieldAlert 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { getAllTaxes } from '../../../services/taxService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { bulkUploadManualJournals } from '../../../services/ledgerService';
import toast from 'react-hot-toast';

import type { AccountingCode } from '../../../services/accountingService';

interface ParsedRow {
    reference: string;
    date: string;
    journalDescription: string;
    branch: string;
    driver?: string;
    vendor?: string;
    accountName: string;
    debit: number;
    credit: number;
    lineDescription: string;
    taxName?: string;
}

interface ValidationLine {
    accountingCodeId: string;
    accountingCodeStr: string;
    accountingCodeName: string;
    accountingCodeCategory?: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    taxAppliedId?: string;
    taxName?: string;
}

interface ValidationEntry {
    index: number;
    reference: string;
    date: string;
    description: string;
    branchId: string;
    branchStr: string;
    driverStr?: string;
    vendorStr?: string;
    contactId?: string;
    contactModel?: 'Customer' | 'Supplier';
    contactName?: string;
    autoSetOff: boolean;
    lines: ValidationLine[];
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

const BulkUploadJournal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loadingMetadata, setLoadingMetadata] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

    const [parsedEntries, setParsedEntries] = useState<ValidationEntry[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [codesRes, branchesRes, taxesRes, customersRes, suppliersRes] = await Promise.allSettled([
                    getAllAccountingCodes({ limit: 1000 }),
                    getAllBranches(),
                    getAllTaxes(),
                    getAllCustomers(),
                    getAllSuppliers({ limit: 1000 })
                ]);

                if (codesRes.status === 'fulfilled') {
                    const rawVal = codesRes.value as any;
                    const list = Array.isArray(rawVal) 
                        ? rawVal 
                        : (Array.isArray(rawVal?.data) ? rawVal.data : (Array.isArray(rawVal?.data?.data) ? rawVal.data.data : []));
                    setAccountingCodes(list);
                }
                if (branchesRes.status === 'fulfilled') {
                    const rawVal = branchesRes.value as any;
                    const list = Array.isArray(rawVal) ? rawVal : (Array.isArray(rawVal?.data) ? rawVal.data : []);
                    setBranches(list);
                }
                if (taxesRes.status === 'fulfilled') {
                    const rawVal = taxesRes.value as any;
                    const list = Array.isArray(rawVal) ? rawVal : (Array.isArray(rawVal?.data) ? rawVal.data : []);
                    setTaxes(list);
                }
                if (customersRes.status === 'fulfilled') {
                    const rawVal = customersRes.value as any;
                    const list = Array.isArray(rawVal) ? rawVal : (Array.isArray(rawVal?.data) ? rawVal.data : []);
                    setCustomers(list);
                }
                if (suppliersRes.status === 'fulfilled') {
                    const rawVal = suppliersRes.value as any;
                    const list = Array.isArray(rawVal) ? rawVal : (Array.isArray(rawVal?.data) ? rawVal.data : []);
                    setSuppliers(list);
                }
            } catch (err) {
                console.error("Failed to load metadata for validation", err);
                toast.error("Failed to load validation metadata");
            } finally {
                setLoadingMetadata(false);
            }
        };
        fetchMetadata();
    }, []);

    const normalizeHeader = (header: string): string => {
        return header.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    const parseHeaderMapping = (headers: string[]): Record<keyof ParsedRow, number> => {
        const mapping: Record<keyof ParsedRow, number> = {
            reference: -1,
            date: -1,
            journalDescription: -1,
            branch: -1,
            driver: -1,
            vendor: -1,
            accountName: -1,
            debit: -1,
            credit: -1,
            lineDescription: -1,
            taxName: -1
        };

        headers.forEach((h, idx) => {
            const normalized = normalizeHeader(h);
            if (['reference', 'referencenumber', 'journalnumber', 'journalid', 'entryid', 'id'].includes(normalized)) {
                mapping.reference = idx;
            } else if (['date', 'journaldate', 'entrydate'].includes(normalized)) {
                mapping.date = idx;
            } else if (['journaldescription', 'description', 'narration', 'notes'].includes(normalized)) {
                mapping.journalDescription = idx;
            } else if (['branch', 'branchcode', 'branchname', 'location'].includes(normalized)) {
                mapping.branch = idx;
            } else if (['driver', 'drivername', 'customer', 'customername', 'drivercode'].includes(normalized)) {
                mapping.driver = idx;
            } else if (['vendor', 'vendorname', 'supplier', 'suppliername', 'vendornumber'].includes(normalized)) {
                mapping.vendor = idx;
            } else if (['accountname', 'account', 'accounttitle', 'accountdescription', 'accountcode', 'code'].includes(normalized)) {
                mapping.accountName = idx;
            } else if (['debit', 'dr', 'debitamount'].includes(normalized)) {
                mapping.debit = idx;
            } else if (['credit', 'cr', 'creditamount'].includes(normalized)) {
                mapping.credit = idx;
            } else if (['linedescription', 'linememo', 'memo', 'details', 'comment'].includes(normalized)) {
                mapping.lineDescription = idx;
            } else if (['taxname', 'tax', 'taxprofile', 'taxoption'].includes(normalized)) {
                mapping.taxName = idx;
            }
        });

        return mapping;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setProcessing(true);

        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            Papa.parse(file, {
                complete: (results) => {
                    processRawData(results.data as string[][]);
                },
                error: (err) => {
                    toast.error(`CSV Parse Error: ${err.message}`);
                    setProcessing(false);
                }
            });
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
                    processRawData(jsonRows);
                } catch (err: any) {
                    toast.error(`Excel Parse Error: ${err.message || err}`);
                    setProcessing(false);
                }
            };
            reader.readAsBinaryString(file);
        } else {
            toast.error("Unsupported file type. Please upload a .csv, .xls, or .xlsx file.");
            setProcessing(false);
        }
    };

    /**
     * Finds an accounting code by account name (case-insensitive substring and exact name match,
     * with fallback to code/combo format).
     */
    const findAccountByName = (rawName: string, codesList: AccountingCode[]): AccountingCode | null => {
        if (!rawName || !Array.isArray(codesList) || codesList.length === 0) return null;
        const term = rawName.trim().toLowerCase();

        // 1. Exact name match
        let found = codesList.find(c => c.name?.toLowerCase().trim() === term);
        if (found) return found;

        // 2. Exact code match
        found = codesList.find(c => c.code?.toLowerCase().trim() === term);
        if (found) return found;

        // 3. Format "1.1.03 - Accounts Receivable" match
        found = codesList.find(c => {
            const fullCombo = `${c.code} - ${c.name}`.toLowerCase();
            return fullCombo === term;
        });
        if (found) return found;

        // 4. Case-insensitive substring match
        found = codesList.find(c => {
            const cName = c.name?.toLowerCase().trim() || '';
            return cName.includes(term) || term.includes(cName);
        });
        if (found) return found;

        return null;
    };

    const processRawData = (rows: string[][]) => {
        if (!rows || rows.length < 2) {
            toast.error("The file is empty or contains no data rows.");
            setProcessing(false);
            return;
        }

        const headers = rows[0].map(h => String(h || '').trim());
        const mapping = parseHeaderMapping(headers);

        // Required check
        const missingFields: string[] = [];
        if (mapping.date === -1) missingFields.push('Date');
        if (mapping.accountName === -1) missingFields.push('Account Name');
        if (mapping.debit === -1) missingFields.push('Debit');
        if (mapping.credit === -1) missingFields.push('Credit');

        if (missingFields.length > 0) {
            toast.error(`Missing required columns: ${missingFields.join(', ')}`);
            setProcessing(false);
            return;
        }

        const rawRows: ParsedRow[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === '')) {
                continue;
            }

            const refVal = mapping.reference !== -1 ? String(row[mapping.reference] || '').trim() : '';
            const descVal = mapping.journalDescription !== -1 ? String(row[mapping.journalDescription] || '').trim() : '';

            const parsedRow: ParsedRow = {
                reference: refVal || descVal || `Row-${i}`,
                date: String(row[mapping.date] || '').trim(),
                journalDescription: descVal || refVal || 'Manual Journal',
                branch: mapping.branch !== -1 ? String(row[mapping.branch] || '').trim() : '',
                driver: mapping.driver !== -1 ? String(row[mapping.driver] || '').trim() : '',
                vendor: mapping.vendor !== -1 ? String(row[mapping.vendor] || '').trim() : '',
                accountName: String(row[mapping.accountName] || '').trim(),
                debit: Number(row[mapping.debit]) || 0,
                credit: Number(row[mapping.credit]) || 0,
                lineDescription: mapping.lineDescription !== -1 ? String(row[mapping.lineDescription] || '').trim() : '',
                taxName: mapping.taxName !== -1 ? String(row[mapping.taxName] || '').trim() : undefined
            };

            rawRows.push(parsedRow);
        }

        // Group rows into journal entries by Reference + Date + Branch
        const grouped: Record<string, ParsedRow[]> = {};
        rawRows.forEach(row => {
            const groupKey = `${row.reference}__${row.date}__${row.branch}`;
            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(row);
        });

        // Validate entries
        const validationEntries: ValidationEntry[] = [];
        let index = 0;

        Object.keys(grouped).forEach(key => {
            const items = grouped[key];
            const first = items[0];
            const errors: string[] = [];
            const warnings: string[] = [];

            // Match branch
            let matchedBranch = (branches || []).find(b => 
                b._id === first.branch || 
                b.code?.toLowerCase() === first.branch.toLowerCase() || 
                b.name?.toLowerCase() === first.branch.toLowerCase()
            );

            if (!matchedBranch && branches.length > 0) {
                if (first.branch) {
                    errors.push(`Branch "${first.branch}" not found in system.`);
                } else {
                    matchedBranch = branches[0];
                }
            }

            // Match Driver vs Vendor
            const hasDriver = Boolean(first.driver && first.driver.trim());
            const hasVendor = Boolean(first.vendor && first.vendor.trim());

            if (hasDriver && hasVendor) {
                errors.push("Conflicting party assignment: Row has both Driver and Vendor specified. Choose one.");
            }

            let contactId: string | undefined = undefined;
            let contactModel: 'Customer' | 'Supplier' | undefined = undefined;
            let contactName: string | undefined = undefined;

            if (hasDriver) {
                const searchD = first.driver!.trim().toLowerCase();
                const matchedCust = (customers || []).find(c => 
                    c._id === first.driver ||
                    c.customerId?.toLowerCase() === searchD ||
                    c.name?.toLowerCase() === searchD ||
                    c.name?.toLowerCase().includes(searchD) ||
                    (c.driver && (
                        c.driver.name?.toLowerCase() === searchD ||
                        c.driver.name?.toLowerCase().includes(searchD) ||
                        c.driver.driverId?.toLowerCase() === searchD
                    )) ||
                    c.phone?.trim() === first.driver!.trim() ||
                    c.email?.toLowerCase() === searchD
                );

                if (matchedCust) {
                    contactId = matchedCust._id;
                    contactModel = 'Customer';
                    contactName = matchedCust.name || matchedCust.driver?.name || first.driver;
                } else {
                    errors.push(`Driver / Customer "${first.driver}" not found in system.`);
                }
            } else if (hasVendor) {
                const searchV = first.vendor!.trim().toLowerCase();
                const matchedSupp = (suppliers || []).find(s => 
                    s._id === first.vendor ||
                    s.name?.toLowerCase() === searchV ||
                    s.name?.toLowerCase().includes(searchV) ||
                    s.companyName?.toLowerCase() === searchV ||
                    s.companyName?.toLowerCase().includes(searchV) ||
                    s.vendorNumber?.toLowerCase() === searchV ||
                    s.supplierNumber?.toLowerCase() === searchV ||
                    s.phone?.trim() === first.vendor!.trim() ||
                    s.email?.toLowerCase() === searchV
                );

                if (matchedSupp) {
                    contactId = matchedSupp._id;
                    contactModel = 'Supplier';
                    contactName = matchedSupp.name || matchedSupp.companyName || first.vendor;
                } else {
                    errors.push(`Vendor / Supplier "${first.vendor}" not found in system.`);
                }
            }

            // Auto Set-off: Automatically true if Driver or Vendor is filled!
            const autoSetOff = Boolean(contactModel);

            // Parse lines & match accounts by Name
            const entryLines: ValidationLine[] = [];
            let totalDebit = 0;
            let totalCredit = 0;

            items.forEach((item, lineIdx) => {
                const matchedCode = findAccountByName(item.accountName, accountingCodes);

                let codeId = '';
                let codeStr = '—';
                let codeName = item.accountName;
                let codeCat = '';

                if (!matchedCode) {
                    errors.push(`Row ${lineIdx + 2}: Account "${item.accountName}" not found in Chart of Accounts.`);
                } else {
                    codeId = matchedCode._id;
                    codeStr = matchedCode.code;
                    codeName = matchedCode.name;
                    codeCat = String(matchedCode.category || '').toUpperCase();
                }

                // Match tax if specified
                let taxId = undefined;
                if (item.taxName) {
                    const matchedTax = (taxes || []).find(t => 
                        t._id === item.taxName || 
                        t.name?.toLowerCase() === item.taxName?.toLowerCase()
                    );
                    if (matchedTax) {
                        taxId = matchedTax._id;
                    } else {
                        warnings.push(`Row ${lineIdx + 2}: Tax profile "${item.taxName}" not found. Uploading without tax.`);
                    }
                }

                if (item.debit > 0 && item.credit > 0) {
                    errors.push(`Row ${lineIdx + 2}: Line cannot have both Debit and Credit amounts.`);
                } else if (item.debit === 0 && item.credit === 0) {
                    errors.push(`Row ${lineIdx + 2}: Line must have either a Debit or Credit amount.`);
                }

                const type = item.debit > 0 ? 'DEBIT' : 'CREDIT';
                const amount = item.debit > 0 ? item.debit : item.credit;

                if (type === 'DEBIT') totalDebit += amount;
                else totalCredit += amount;

                // Cross-category validation check
                if (contactModel === 'Customer') {
                    if (codeCat === 'ACCOUNTS PAYABLE' || (codeCat.includes('PAYABLE') && !codeCat.includes('TAX')) || codeStr === '2.1.01') {
                        errors.push(`Cross-Category Violation: Line ${lineIdx + 1} uses Accounts Payable account ("${codeName}") for Customer (Driver) "${contactName}". Must use Accounts Receivable or asset/bank accounts.`);
                    }
                } else if (contactModel === 'Supplier') {
                    if (codeCat === 'ACCOUNTS RECEIVABLE' || codeCat.includes('RECEIVABLE') || codeStr === '1.1.03') {
                        errors.push(`Cross-Category Violation: Line ${lineIdx + 1} uses Accounts Receivable account ("${codeName}") for Vendor "${contactName}". Must use Accounts Payable or expense/bank accounts.`);
                    }
                }

                entryLines.push({
                    accountingCodeId: codeId,
                    accountingCodeStr: codeStr,
                    accountingCodeName: codeName,
                    accountingCodeCategory: codeCat,
                    type,
                    amount,
                    description: item.lineDescription || first.journalDescription,
                    taxAppliedId: taxId,
                    taxName: item.taxName
                });
            });

            // Double entry validation
            const debitsCount = entryLines.filter(l => l.type === 'DEBIT').length;
            const creditsCount = entryLines.filter(l => l.type === 'CREDIT').length;

            if (debitsCount === 0 || creditsCount === 0) {
                errors.push("Journal Entry must have at least one DEBIT and one CREDIT line.");
            }

            const diff = Math.abs(totalDebit - totalCredit);
            if (diff > 0.01) {
                errors.push(`Journal Entry is out of balance. Total Debits ($${totalDebit.toFixed(2)}) must equal Total Credits ($${totalCredit.toFixed(2)}). Out of balance by $${diff.toFixed(2)}.`);
            }

            // Date validation
            let formattedDate = first.date;
            const dateObj = new Date(first.date);
            if (isNaN(dateObj.getTime())) {
                errors.push(`Invalid date format: "${first.date}". Use YYYY-MM-DD.`);
            } else {
                formattedDate = dateObj.toISOString().split('T')[0];
            }

            validationEntries.push({
                index: index++,
                reference: first.reference || `REF-${index}`,
                date: formattedDate,
                description: first.journalDescription || 'Manual Bulk Adjustment',
                branchId: matchedBranch?._id || '',
                branchStr: matchedBranch ? `${matchedBranch.name} (${matchedBranch.country || ''})` : first.branch,
                driverStr: first.driver,
                vendorStr: first.vendor,
                contactId,
                contactModel,
                contactName,
                autoSetOff,
                lines: entryLines,
                isValid: errors.length === 0,
                errors,
                warnings
            });
        });

        setParsedEntries(validationEntries);
        setProcessing(false);
    };

    const downloadTemplate = (format: 'csv' | 'xlsx') => {
        const headers = [
            'Reference',
            'Date',
            'Branch',
            'Driver',
            'Vendor',
            'Account Name',
            'Debit',
            'Credit',
            'Line Description',
            'Tax Name'
        ];

        const sampleRows = [
            // Example 1: Customer (Driver) Invoices Auto Set-Off
            [
                'MJ-DRV-001', '2026-06-15', 'Panama Branch',
                'SAMUEL ALEJANDRO LLORENTE LEFRANC', '',
                'Banco General CT 600', '285.71', '0.00',
                'Driver invoice settlement', ''
            ],
            [
                'MJ-DRV-001', '2026-06-15', 'Panama Branch',
                'SAMUEL ALEJANDRO LLORENTE LEFRANC', '',
                'Accounts Receivable', '0.00', '285.71',
                'Driver invoice settlement', ''
            ],

            // Example 2: Vendor (Supplier) Bills Auto Set-Off
            [
                'MJ-VND-002', '2026-06-16', 'Panama Branch',
                '', 'Acme Fleet Supplies',
                'Accounts Payable', '450.00', '0.00',
                'Supplier bill payment set-off', ''
            ],
            [
                'MJ-VND-002', '2026-06-16', 'Panama Branch',
                '', 'Acme Fleet Supplies',
                'Banco General CT 600', '0.00', '450.00',
                'Supplier bill payment set-off', ''
            ],

            // Example 3: General Journal (Adjustment / Provision)
            [
                'MJ-GEN-003', '2026-06-17', 'Panama Branch',
                '', '',
                'Office Expense', '150.00', '0.00',
                'Monthly office supply provision', ''
            ],
            [
                'MJ-GEN-003', '2026-06-17', 'Panama Branch',
                '', '',
                'Petty Cash', '0.00', '150.00',
                'Monthly office supply provision', ''
            ]
        ];

        if (format === 'xlsx') {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Manual Journals Template");
            XLSX.writeFile(workbook, 'manual_journal_bulk_template.xlsx');
            toast.success("Excel template downloaded!");
            return;
        }

        const csvContent = [
            headers.join(','),
            ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'manual_journal_bulk_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV template downloaded!");
    };

    const handleImport = async () => {
        const validEntries = parsedEntries.filter(e => e.isValid);
        if (validEntries.length === 0) {
            toast.error("No valid journal entries to import. Please check validation errors.");
            return;
        }

        setProcessing(true);
        setUploadProgress({ current: 0, total: validEntries.length });

        try {
            const journalsPayload = validEntries.map(entry => ({
                reference: entry.reference,
                description: entry.description,
                date: entry.date,
                branch: entry.branchId,
                driver: entry.contactModel === 'Customer' ? entry.contactId : undefined,
                vendor: entry.contactModel === 'Supplier' ? entry.contactId : undefined,
                autoSetOff: entry.autoSetOff,
                lines: entry.lines.map(line => ({
                    accountingCode: line.accountingCodeId,
                    type: line.type,
                    amount: line.amount,
                    description: line.description,
                    taxInfo: line.taxAppliedId ? { taxApplied: line.taxAppliedId } : undefined
                }))
            }));

            const result = await bulkUploadManualJournals({ journals: journalsPayload });

            if (result.data?.createdCount > 0) {
                toast.success(`Successfully posted ${result.data.createdCount} journal entries.`);
            }
            if (result.data?.failedCount > 0) {
                toast.error(`${result.data.failedCount} journal entries failed to post.`);
            }

            if (result.data?.createdCount > 0) {
                onSuccess();
                onClose();
            }
        } catch (err: any) {
            console.error("Bulk upload manual journals failed:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to process bulk upload.");
        } finally {
            setProcessing(false);
            setUploadProgress(null);
        }
    };

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-hidden max-w-5xl w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Upload size={24} className="text-[#C8E600]" />
                        Bulk Upload Manual Journals
                    </h2>
                    <p className="text-xs text-dim mt-1">
                        Upload multi-line double-entry manual journals by Account Name with Driver & Vendor Auto Set-Off
                    </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-input)] text-dim hover:text-[var(--text-main)] transition-colors">
                    <X size={20} />
                </button>
            </div>

            {/* Content area */}
            <div className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-6">
                {loadingMetadata ? (
                    <div className="flex flex-col items-center justify-center p-12">
                        <Loader2 className="animate-spin text-[#C8E600] mb-2" size={32} />
                        <span className="text-xs text-dim">Loading chart of accounts, customers & suppliers...</span>
                    </div>
                ) : parsedEntries.length === 0 ? (
                    /* Initial Upload Box */
                    <div className="space-y-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-[var(--border-main)] hover:border-[#C8E600]/50 rounded-2xl p-12 text-center cursor-pointer transition-all bg-[var(--bg-input)]/30 hover:bg-[var(--bg-input)]/60 flex flex-col items-center group"
                        >
                            <FileSpreadsheet className="text-dim group-hover:text-[#C8E600] transition-colors mb-4" size={48} />
                            <span className="text-sm font-semibold text-[var(--text-main)] mb-1">
                                Drag & drop your journal file here, or <span className="text-[#C8E600] hover:underline">browse</span>
                            </span>
                            <span className="text-xs text-dim">Supports .xlsx, .xls, and .csv files</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                className="hidden" 
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)]/20">
                            <div className="text-xs text-dim space-y-1">
                                <p className="font-bold text-[var(--text-main)]">Excel Template Columns:</p>
                                <p>Reference, Date, Branch, Driver, Vendor, Account Name, Debit, Credit, Line Description, Tax Name</p>
                                <p className="text-[11px] text-[#C8E600]/80">
                                    • If Driver or Vendor is specified, Auto Set-Off against open invoices/bills is automatically enabled.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => downloadTemplate('xlsx')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all cursor-pointer"
                                >
                                    <Download size={14} /> Excel Template
                                </button>
                                <button
                                    onClick={() => downloadTemplate('csv')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all cursor-pointer"
                                >
                                    <Download size={14} /> CSV Template
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Preview and Validate Box */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                            <div className="text-sm">
                                File: <span className="font-bold text-[var(--text-main)]">{fileName}</span>
                                <span className="mx-2 text-dim">•</span>
                                Found <span className="font-bold text-[#C8E600]">{parsedEntries.length}</span> journals
                                <span className="mx-2 text-dim">•</span>
                                <span className="text-emerald-400 font-semibold">{parsedEntries.filter(e => e.isValid).length} Valid</span>
                                {parsedEntries.some(e => !e.isValid) && (
                                    <>
                                        <span className="mx-2 text-dim">•</span>
                                        <span className="text-rose-400 font-semibold">{parsedEntries.filter(e => !e.isValid).length} Invalid</span>
                                    </>
                                )}
                            </div>
                            <button 
                                onClick={() => { setParsedEntries([]); setFileName(null); }}
                                className="text-xs text-rose-400 font-bold hover:underline cursor-pointer"
                            >
                                Clear & Upload Another
                            </button>
                        </div>

                        {/* List of Grouped Journals */}
                        <div className="space-y-4">
                            {parsedEntries.map((entry) => (
                                <div 
                                    key={entry.index}
                                    className={`border rounded-xl overflow-hidden transition-all bg-[var(--bg-input)]/10 ${
                                        entry.isValid 
                                            ? 'border-[var(--border-main)]' 
                                            : 'border-rose-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                                    }`}
                                >
                                    {/* Header with Entity Badges */}
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/40 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)]/50">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono font-bold text-xs text-[#C8E600] bg-[#C8E600]/10 px-2 py-0.5 rounded border border-[#C8E600]/20">
                                                    {entry.reference}
                                                </span>
                                                <span className="font-bold text-sm text-[var(--text-main)]">{entry.description}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-input)] text-dim font-bold uppercase tracking-wider">
                                                    {entry.date}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-dim">
                                                <span>Branch: {entry.branchStr}</span>
                                                <span>•</span>

                                                {/* Entity Recognition Pill */}
                                                {entry.contactModel === 'Customer' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-full">
                                                        <User size={11} /> Driver: {entry.contactName}
                                                    </span>
                                                ) : entry.contactModel === 'Supplier' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                                        <Building size={11} /> Vendor: {entry.contactName}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-400/10 border border-slate-400/20 px-2 py-0.5 rounded-full">
                                                        General Journal
                                                    </span>
                                                )}

                                                {/* Auto Set-off Pill */}
                                                {entry.autoSetOff && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#C8E600] bg-[#C8E600]/10 border border-[#C8E600]/30 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 size={10} /> Auto Set-Off Active
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {entry.isValid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                                    <CheckCircle size={11} /> Ready to Post
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2.5 py-1 rounded-full border border-rose-400/20">
                                                    <AlertTriangle size={11} /> Validation Errors
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="p-4 space-y-3">
                                        {/* Errors list */}
                                        {entry.errors.map((err, idx) => (
                                            <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                                                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
                                                <span className="font-medium">{err}</span>
                                            </div>
                                        ))}

                                        {/* Warnings list */}
                                        {entry.warnings.map((warn, idx) => (
                                            <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                                <span>{warn}</span>
                                            </div>
                                        ))}

                                        {/* Lines Table */}
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-[var(--border-main)]/50 text-dim">
                                                    <th className="pb-2 font-bold uppercase">Account Name</th>
                                                    <th className="pb-2 font-bold uppercase">Line Description</th>
                                                    <th className="pb-2 font-bold uppercase text-right">Debits</th>
                                                    <th className="pb-2 font-bold uppercase text-right">Credits</th>
                                                    <th className="pb-2 font-bold uppercase">Tax</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-main)]/30">
                                                {entry.lines.map((line, lineIdx) => (
                                                    <tr key={lineIdx} className="hover:bg-[var(--bg-input)]/25">
                                                        <td className="py-2 pr-4">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-[var(--text-main)]">{line.accountingCodeName}</span>
                                                                {line.accountingCodeStr && line.accountingCodeStr !== '—' && (
                                                                    <span className="text-dim font-mono text-[10px]">({line.accountingCodeStr})</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 text-dim pr-4">{line.description}</td>
                                                        <td className="py-2 text-right pr-4 font-mono font-bold text-emerald-400">
                                                            {line.type === 'DEBIT' ? `$${line.amount.toFixed(2)}` : ''}
                                                        </td>
                                                        <td className="py-2 text-right pr-4 font-mono font-bold text-rose-400">
                                                            {line.type === 'CREDIT' ? `$${line.amount.toFixed(2)}` : ''}
                                                        </td>
                                                        <td className="py-2 text-dim">{line.taxName || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-main)] bg-[var(--bg-input)] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div className="text-xs text-dim">
                    {uploadProgress ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin text-[#C8E600]" size={16} />
                            <span>Posting journals...</span>
                        </div>
                    ) : processing ? (
                        <span>Validating rows...</span>
                    ) : parsedEntries.length > 0 ? (
                        <span>
                            Ready to import <span className="font-bold text-[#C8E600]">{parsedEntries.filter(e => e.isValid).length}</span> valid journal entries.
                        </span>
                    ) : (
                        <span>Please select an Excel (.xlsx) or CSV file to get started.</span>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-input)] text-[var(--text-main)] hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    {parsedEntries.length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={processing || parsedEntries.filter(e => e.isValid).length === 0}
                            className="px-8 py-2.5 rounded-xl text-xs font-bold bg-[#C8E600] text-black disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(200,230,0,0.2)] cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} /> Importing...
                                </>
                            ) : (
                                <>
                                    <Play size={14} fill="black" /> Import Valid Entries
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkUploadJournal;
