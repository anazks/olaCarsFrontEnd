import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    X, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, 
    Loader2, Play, User, Building, CheckCircle2, ShieldAlert, 
    Trash2, Search, Table, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { getAllTaxes } from '../../../services/taxService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { bulkUploadManualJournals, getManualJournals } from '../../../services/ledgerService';
import toast from 'react-hot-toast';

import type { AccountingCode } from '../../../services/accountingService';

interface ParsedJournalRow {
    id: string;
    rowIndex: number; // Row # from Excel/CSV (starts from row 2)
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

    // Resolved entities
    matchedBranch?: any;
    contactModel?: 'Customer' | 'Supplier';
    contactId?: string;
    contactName?: string;
    matchedAccount?: AccountingCode | null;
    matchedTax?: any;

    // Validation results
    rowErrors: string[];
    journalErrors: string[];
    warnings: string[];
    isValid: boolean;
    isDuplicateRef?: boolean;
}

interface ValidationLine {
    rowId: string;
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
    isDuplicateRef?: boolean;
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
    const [uploadProgress, setUploadProgress] = useState<{ 
        current: number; 
        total: number; 
        percentage: number; 
        statusMessage?: string; 
    } | null>(null);

    // Parsed Data State
    const [parsedRows, setParsedRows] = useState<ParsedJournalRow[]>([]);
    const [parsedEntries, setParsedEntries] = useState<ValidationEntry[]>([]);
    const [existingReferences, setExistingReferences] = useState<Set<string>>(new Set());
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter and View State
    const [rowFilter, setRowFilter] = useState<'all' | 'valid' | 'skipped' | 'invalid'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'table' | 'grouped'>('table');

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [codesRes, branchesRes, taxesRes, customersRes, suppliersRes, journalsRes] = await Promise.allSettled([
                    getAllAccountingCodes({ limit: 1000 }),
                    getAllBranches(),
                    getAllTaxes(),
                    getAllCustomers(),
                    getAllSuppliers({ limit: 1000 }),
                    getManualJournals({ limit: 10000 })
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
                if (journalsRes.status === 'fulfilled') {
                    const rawVal = journalsRes.value as any;
                    const list = Array.isArray(rawVal) 
                        ? rawVal 
                        : (Array.isArray(rawVal?.data) ? rawVal.data : (Array.isArray(rawVal?.data?.data) ? rawVal.data.data : []));
                    const loadedRefs = new Set<string>();
                    list.forEach((j: any) => {
                        if (j.journalNumber) loadedRefs.add(String(j.journalNumber).trim().toLowerCase());
                        if (j.referenceNumber) loadedRefs.add(String(j.referenceNumber).trim().toLowerCase());
                    });
                    setExistingReferences(loadedRefs);
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

    const parseHeaderMapping = (headers: string[]): Record<string, number> => {
        const mapping: Record<string, number> = {
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

    /**
     * Finds an accounting code by account name or code with multiple fallback strategies.
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

        // 4. Substring match
        found = codesList.find(c => {
            const cName = c.name?.toLowerCase().trim() || '';
            return cName.includes(term) || term.includes(cName);
        });
        if (found) return found;

        return null;
    };

    /**
     * Validates individual rows and groups them into balanced double-entry manual journals.
     */
    const validateAndGroupRows = (
        rawItems: ParsedJournalRow[],
        currentBranches = branches,
        currentCodes = accountingCodes,
        currentTaxes = taxes,
        currentCustomers = customers,
        currentSuppliers = suppliers,
        currentExistingRefs = existingReferences
    ): { updatedRows: ParsedJournalRow[]; entries: ValidationEntry[] } => {
        // Step 1: Row-level validation and matching
        const preliminaryRows: ParsedJournalRow[] = rawItems.map(row => {
            const rowErrors: string[] = [];
            const warnings: string[] = [];

            // Match Branch
            let matchedBranch = (currentBranches || []).find(b => 
                b._id === row.branch || 
                b.code?.toLowerCase() === row.branch.toLowerCase() || 
                b.name?.toLowerCase() === row.branch.toLowerCase()
            );

            if (!matchedBranch && currentBranches.length > 0) {
                if (row.branch) {
                    rowErrors.push(`Branch "${row.branch}" not found in system.`);
                } else {
                    matchedBranch = currentBranches[0];
                }
            }

            // Match Driver vs Vendor
            const hasDriver = Boolean(row.driver && row.driver.trim());
            const hasVendor = Boolean(row.vendor && row.vendor.trim());

            if (hasDriver && hasVendor) {
                rowErrors.push("Conflicting party assignment: Both Driver and Vendor specified. Choose one.");
            }

            let contactId: string | undefined = undefined;
            let contactModel: 'Customer' | 'Supplier' | undefined = undefined;
            let contactName: string | undefined = undefined;

            if (hasDriver) {
                const searchD = row.driver!.trim().toLowerCase();
                const matchedCust = (currentCustomers || []).find(c => 
                    c._id === row.driver ||
                    c.customerId?.toLowerCase() === searchD ||
                    c.name?.toLowerCase() === searchD ||
                    c.name?.toLowerCase().includes(searchD) ||
                    (c.driver && (
                        (c.driver as any).name?.toLowerCase() === searchD ||
                        (c.driver as any).name?.toLowerCase().includes(searchD) ||
                        c.driver.driverId?.toLowerCase() === searchD
                    )) ||
                    c.phone?.trim() === row.driver!.trim() ||
                    c.email?.toLowerCase() === searchD
                );

                if (matchedCust) {
                    contactId = matchedCust._id;
                    contactModel = 'Customer';
                    contactName = matchedCust.name || (matchedCust.driver as any)?.name || row.driver;
                } else {
                    rowErrors.push(`Driver / Customer "${row.driver}" not found.`);
                }
            } else if (hasVendor) {
                const searchV = row.vendor!.trim().toLowerCase();
                const matchedSupp = (currentSuppliers || []).find(s => 
                    s._id === row.vendor ||
                    s.name?.toLowerCase() === searchV ||
                    s.name?.toLowerCase().includes(searchV) ||
                    s.companyName?.toLowerCase() === searchV ||
                    s.companyName?.toLowerCase().includes(searchV) ||
                    s.vendorNumber?.toLowerCase() === searchV ||
                    (s as any).supplierNumber?.toLowerCase() === searchV ||
                    s.phone?.trim() === row.vendor!.trim() ||
                    s.email?.toLowerCase() === searchV
                );

                if (matchedSupp) {
                    contactId = matchedSupp._id;
                    contactModel = 'Supplier';
                    contactName = matchedSupp.name || matchedSupp.companyName || row.vendor;
                } else {
                    rowErrors.push(`Vendor / Supplier "${row.vendor}" not found.`);
                }
            }

            // Match Account Name
            const matchedAccount = findAccountByName(row.accountName, currentCodes);
            if (!matchedAccount) {
                rowErrors.push(`Account "${row.accountName}" not found in Chart of Accounts.`);
            }

            // Debit / Credit checks
            if (row.debit > 0 && row.credit > 0) {
                rowErrors.push("Line cannot have both Debit and Credit amounts.");
            } else if (row.debit <= 0 && row.credit <= 0) {
                rowErrors.push("Line must have either a Debit or Credit amount greater than 0.");
            }

            // Cross-category validation rules based on party selection
            if (matchedAccount && contactModel === 'Customer') {
                const cat = (matchedAccount.category || '').toUpperCase();
                if (cat === 'ACCOUNTS PAYABLE' || (cat.includes('PAYABLE') && !cat.includes('TAX'))) {
                    rowErrors.push(`Cross-Category Violation: Uses Accounts Payable account for Driver "${contactName || row.driver}". Use Accounts Receivable or Revenue accounts.`);
                }
            } else if (matchedAccount && contactModel === 'Supplier') {
                const cat = (matchedAccount.category || '').toUpperCase();
                if (cat === 'ACCOUNTS RECEIVABLE' || cat.includes('RECEIVABLE')) {
                    rowErrors.push(`Cross-Category Violation: Uses Accounts Receivable account for Vendor "${contactName || row.vendor}". Use Accounts Payable or Expense accounts.`);
                }
            }

            // Match Tax
            let matchedTax: any = undefined;
            if (row.taxName) {
                matchedTax = (currentTaxes || []).find(t => 
                    t._id === row.taxName || 
                    t.name?.toLowerCase() === row.taxName?.toLowerCase()
                );
                if (!matchedTax) {
                    warnings.push(`Tax profile "${row.taxName}" not found. Will post without tax.`);
                }
            }

            // Date validation
            let formattedDate = row.date;
            const dateObj = new Date(row.date);
            if (isNaN(dateObj.getTime())) {
                rowErrors.push(`Invalid date format: "${row.date}". Expected YYYY-MM-DD.`);
            } else {
                formattedDate = dateObj.toISOString().split('T')[0];
            }

            return {
                ...row,
                date: formattedDate,
                matchedBranch,
                contactModel,
                contactId,
                contactName,
                matchedAccount,
                matchedTax,
                rowErrors,
                journalErrors: [],
                warnings,
                isValid: false // Will be set after group-level balance check
            };
        });

        // Step 2: Group rows into journals by Reference + Date + Branch
        const grouped: Record<string, ParsedJournalRow[]> = {};
        preliminaryRows.forEach(row => {
            const branchKey = row.matchedBranch?._id || row.branch || 'default';
            const groupKey = `${row.reference}__${row.date}__${branchKey}`;
            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(row);
        });

        const validationEntries: ValidationEntry[] = [];
        const groupErrorsMap: Record<string, string[]> = {};
        const groupDuplicateMap: Record<string, boolean> = {};
        const seenInFileRefs = new Set<string>();
        let entryIdx = 0;

        Object.keys(grouped).forEach(key => {
            const items = grouped[key];
            const first = items[0];
            const groupErrors: string[] = [];
            const groupWarnings: string[] = [];

            // Duplicate Reference check against system & inside upload file
            const rawRef = (first.reference || '').trim();
            const refLower = rawRef.toLowerCase();
            let isDuplicateRef = false;

            if (refLower) {
                if (currentExistingRefs.has(refLower)) {
                    isDuplicateRef = true;
                    groupWarnings.push(`Reference "${rawRef}" already exists in system. This entry will be skipped on import.`);
                } else if (seenInFileRefs.has(refLower)) {
                    isDuplicateRef = true;
                    groupWarnings.push(`Duplicate reference "${rawRef}" detected in upload file. Subsequent entries with this reference will be skipped.`);
                } else {
                    seenInFileRefs.add(refLower);
                }
            }

            groupDuplicateMap[key] = isDuplicateRef;

            // Aggregate debits and credits
            let totalDebit = 0;
            let totalCredit = 0;
            let debitsCount = 0;
            let creditsCount = 0;

            const lines: ValidationLine[] = items.map(item => {
                const isDebit = item.debit > 0;
                const amt = isDebit ? item.debit : item.credit;
                if (isDebit) {
                    totalDebit += amt;
                    debitsCount++;
                } else {
                    totalCredit += amt;
                    creditsCount++;
                }

                return {
                    rowId: item.id,
                    accountingCodeId: item.matchedAccount?._id || '',
                    accountingCodeStr: item.matchedAccount?.code || '—',
                    accountingCodeName: item.matchedAccount?.name || item.accountName,
                    accountingCodeCategory: item.matchedAccount?.category,
                    type: isDebit ? 'DEBIT' : 'CREDIT',
                    amount: amt,
                    description: item.lineDescription || first.journalDescription,
                    taxAppliedId: item.matchedTax?._id,
                    taxName: item.taxName
                };
            });

            // Group-level double entry balance rules
            if (debitsCount === 0 || creditsCount === 0) {
                groupErrors.push("Journal Entry must have at least one DEBIT and one CREDIT line.");
            }

            const balanceDiff = Math.abs(totalDebit - totalCredit);
            if (balanceDiff > 0.01) {
                groupErrors.push(
                    `Out of balance: Total Debits ($${totalDebit.toFixed(2)}) must equal Total Credits ($${totalCredit.toFixed(2)}). Difference of $${balanceDiff.toFixed(2)}.`
                );
            }

            // Aggregate any individual row errors or warnings into entry
            items.forEach(r => {
                r.warnings.forEach(w => {
                    if (!groupWarnings.includes(w)) groupWarnings.push(w);
                });
            });

            groupErrorsMap[key] = groupErrors;

            const isEntryValid = groupErrors.length === 0 && items.every(r => r.rowErrors.length === 0);

            validationEntries.push({
                index: entryIdx++,
                reference: first.reference || `REF-${entryIdx}`,
                date: first.date,
                description: first.journalDescription || 'Manual Bulk Adjustment',
                branchId: first.matchedBranch?._id || '',
                branchStr: first.matchedBranch ? `${first.matchedBranch.name} (${first.matchedBranch.country || ''})` : first.branch,
                driverStr: first.driver,
                vendorStr: first.vendor,
                contactId: first.contactId,
                contactModel: first.contactModel,
                contactName: first.contactName,
                autoSetOff: Boolean(first.contactModel),
                lines,
                isValid: isEntryValid,
                isDuplicateRef,
                errors: groupErrors,
                warnings: groupWarnings
            });
        });

        // Step 3: Link group errors back to rows and compute overall row validity
        const updatedRows: ParsedJournalRow[] = preliminaryRows.map(row => {
            const branchKey = row.matchedBranch?._id || row.branch || 'default';
            const groupKey = `${row.reference}__${row.date}__${branchKey}`;
            const journalErrors = groupErrorsMap[groupKey] || [];
            const isDuplicateRef = Boolean(groupDuplicateMap[groupKey]);
            const rowWarnings = [...row.warnings];
            if (isDuplicateRef && !rowWarnings.some(w => w.includes('already exists') || w.includes('Duplicate reference'))) {
                rowWarnings.push(`Reference "${row.reference}" already exists in system (will be skipped).`);
            }
            const isValid = row.rowErrors.length === 0 && journalErrors.length === 0;

            return {
                ...row,
                journalErrors,
                warnings: rowWarnings,
                isDuplicateRef,
                isValid
            };
        });

        return { updatedRows, entries: validationEntries };
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
                    const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
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

    const parseExcelDate = (val: any): string => {
        if (val === null || val === undefined || val === '') {
            return new Date().toISOString().split('T')[0];
        }
        if (val instanceof Date && !isNaN(val.getTime())) {
            // Compensate for SheetJS or libraries that subtract local timezone offset:
            // if UTC hours are in the second half of the day (>= 12), it was shifted back by offset arithmetic
            const adjusted = new Date(val.getTime() + (val.getUTCHours() >= 12 ? 12 * 3600 * 1000 : 0));
            const y = adjusted.getUTCFullYear();
            const m = String(adjusted.getUTCMonth() + 1).padStart(2, '0');
            const d = String(adjusted.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const num = Number(val);
        // Excel serial date range (20,000 to 100,000 corresponds to 1954 to 2173)
        if (!isNaN(num) && num > 20000 && num < 100000) {
            try {
                if (XLSX && XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
                    const parsedCode = XLSX.SSF.parse_date_code(num);
                    if (parsedCode && parsedCode.y && parsedCode.m && parsedCode.d) {
                        const y = String(parsedCode.y);
                        const m = String(parsedCode.m).padStart(2, '0');
                        const d = String(parsedCode.d).padStart(2, '0');
                        return `${y}-${m}-${d}`;
                    }
                }
            } catch (_) {}
            const totalDays = Math.floor(num);
            const jsDate = new Date(Math.round((totalDays - 25569) * 86400 * 1000));
            if (!isNaN(jsDate.getTime())) {
                const y = jsDate.getUTCFullYear();
                const m = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
                const d = String(jsDate.getUTCDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
        }
        const str = String(val).trim();
        // Check for DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
        const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (dmyMatch) {
            const d = dmyMatch[1].padStart(2, '0');
            const m = dmyMatch[2].padStart(2, '0');
            const y = dmyMatch[3];
            return `${y}-${m}-${d}`;
        }
        // Check for YYYY-MM-DD or YYYY/MM/DD
        const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (ymdMatch) {
            const y = ymdMatch[1];
            const m = ymdMatch[2].padStart(2, '0');
            const d = ymdMatch[3].padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime()) && parsed.getUTCFullYear() > 1900 && parsed.getUTCFullYear() < 2200) {
            const y = parsed.getUTCFullYear();
            const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
            const d = String(parsed.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        return str || new Date().toISOString().split('T')[0];
    };

    const processRawData = (rows: any[][]) => {
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

        const rawRows: ParsedJournalRow[] = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === '')) {
                continue;
            }

            const refVal = mapping.reference !== -1 ? String(row[mapping.reference] || '').trim() : '';
            const descVal = mapping.journalDescription !== -1 ? String(row[mapping.journalDescription] || '').trim() : '';

            const parsedRow: ParsedJournalRow = {
                id: `row-${i}-${Date.now()}`,
                rowIndex: i + 1, // 1-indexed Excel row number
                reference: refVal || descVal || `REF-${i}`,
                date: parseExcelDate(row[mapping.date]),
                journalDescription: descVal || refVal || 'Manual Journal',
                branch: mapping.branch !== -1 ? String(row[mapping.branch] || '').trim() : '',
                driver: mapping.driver !== -1 ? String(row[mapping.driver] || '').trim() : '',
                vendor: mapping.vendor !== -1 ? String(row[mapping.vendor] || '').trim() : '',
                accountName: String(row[mapping.accountName] || '').trim(),
                debit: Number(row[mapping.debit]) || 0,
                credit: Number(row[mapping.credit]) || 0,
                lineDescription: mapping.lineDescription !== -1 ? String(row[mapping.lineDescription] || '').trim() : '',
                taxName: mapping.taxName !== -1 ? String(row[mapping.taxName] || '').trim() : undefined,
                rowErrors: [],
                journalErrors: [],
                warnings: [],
                isValid: false
            };

            rawRows.push(parsedRow);
        }

        const { updatedRows, entries } = validateAndGroupRows(rawRows);
        setParsedRows(updatedRows);
        setParsedEntries(entries);
        setProcessing(false);
    };

    /**
     * Remove an individual row and re-evaluate validation for the remaining set.
     */
    const handleRemoveRow = (rowId: string) => {
        const remaining = parsedRows.filter(r => r.id !== rowId);
        const { updatedRows, entries } = validateAndGroupRows(remaining);
        setParsedRows(updatedRows);
        setParsedEntries(entries);
        toast.success("Row removed.");
    };

    /**
     * Filter out all rows that have errors (both row-level and journal-level).
     */
    const handleRemoveAllInvalid = () => {
        const validRows = parsedRows.filter(r => r.isValid);
        if (validRows.length === parsedRows.length) {
            toast("No invalid rows to remove.");
            return;
        }
        const removedCount = parsedRows.length - validRows.length;
        const { updatedRows, entries } = validateAndGroupRows(validRows);
        setParsedRows(updatedRows);
        setParsedEntries(entries);
        setRowFilter('all');
        toast.success(`Removed ${removedCount} invalid row(s).`);
    };

    /**
     * Download invalid rows with an added 'Error Reason' column for offline remediation.
     */
    const handleDownloadInvalid = (format: 'xlsx' | 'csv') => {
        const invalidRows = parsedRows.filter(r => !r.isValid);
        if (invalidRows.length === 0) {
            toast("No invalid rows to export.");
            return;
        }

        const exportData = invalidRows.map(row => {
            const allErrors = [...row.rowErrors, ...row.journalErrors].join(' | ');
            return {
                'Error Reason': allErrors || 'Unknown validation failure',
                'Reference': row.reference,
                'Date': row.date,
                'Branch': row.branch,
                'Driver': row.driver || '',
                'Vendor': row.vendor || '',
                'Account Name': row.accountName,
                'Debit': row.debit,
                'Credit': row.credit,
                'Line Description': row.lineDescription,
                'Tax Name': row.taxName || ''
            };
        });

        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Invalid Journal Rows");
            XLSX.writeFile(workbook, `invalid_journal_rows_${Date.now()}.xlsx`);
            toast.success(`Exported ${invalidRows.length} invalid rows to Excel.`);
            return;
        }

        const headers = ['Error Reason', 'Reference', 'Date', 'Branch', 'Driver', 'Vendor', 'Account Name', 'Debit', 'Credit', 'Line Description', 'Tax Name'];
        const csvRows = [
            headers.join(','),
            ...exportData.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invalid_journal_rows_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${invalidRows.length} invalid rows to CSV.`);
    };

    const handleReset = () => {
        setParsedRows([]);
        setParsedEntries([]);
        setFileName(null);
        setSearchQuery('');
        setRowFilter('all');
        setActiveView('table');
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            toast.error("No valid journal entries to import. Please resolve validation errors or remove invalid rows.");
            return;
        }

        const entriesToImport = validEntries.filter(e => !e.isDuplicateRef);
        const skippedRefCount = validEntries.filter(e => e.isDuplicateRef).length;

        if (entriesToImport.length === 0) {
            toast.error(`All ${skippedRefCount} journal entries have reference numbers that already exist in the system and will be skipped. Nothing new to import.`);
            return;
        }

        setProcessing(true);
        setUploadProgress({
            current: 0,
            total: entriesToImport.length,
            percentage: 0,
            statusMessage: `Starting import of ${entriesToImport.length} journals (${skippedRefCount} duplicate references will be skipped)...`
        });

        try {
            const journalsPayload = entriesToImport.map(entry => ({
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

            const result = await bulkUploadManualJournals(
                { journals: journalsPayload },
                (prog) => {
                    setUploadProgress({
                        current: prog.current || 0,
                        total: prog.total || entriesToImport.length,
                        percentage: prog.percentage || 0,
                        statusMessage: prog.statusMessage || `Processing journal ${prog.current} of ${prog.total}...`
                    });
                }
            );

            const data = result?.data || result;
            const backendCreated = data?.createdCount || 0;
            const backendSkipped = data?.skippedCount || 0;
            const totalSkipped = skippedRefCount + backendSkipped;

            if (backendCreated > 0) {
                if (totalSkipped > 0) {
                    toast.success(`Successfully posted ${backendCreated} journal entries. ${totalSkipped} existing reference(s) skipped.`);
                } else {
                    toast.success(`Successfully posted ${backendCreated} journal entries.`);
                }
            } else if (totalSkipped > 0) {
                toast(`Skipped ${totalSkipped} entries (reference numbers already exist in system).`);
            }

            if (data?.failedCount > 0) {
                toast.error(`${data.failedCount} journal entries failed to post.`);
            }

            if (backendCreated > 0) {
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

    // Filtered rows for the parsing table
    const filteredRows = useMemo(() => {
        return parsedRows.filter(row => {
            if (rowFilter === 'valid' && (!row.isValid || row.isDuplicateRef)) return false;
            if (rowFilter === 'skipped' && !row.isDuplicateRef) return false;
            if (rowFilter === 'invalid' && row.isValid) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const ref = (row.reference || '').toLowerCase();
                const acc = (row.accountName || '').toLowerCase();
                const party = (row.contactName || row.driver || row.vendor || '').toLowerCase();
                const desc = (row.lineDescription || row.journalDescription || '').toLowerCase();
                const branch = (row.branch || '').toLowerCase();
                const errors = [...row.rowErrors, ...row.journalErrors].join(' ').toLowerCase();

                return ref.includes(q) || acc.includes(q) || party.includes(q) || desc.includes(q) || branch.includes(q) || errors.includes(q);
            }
            return true;
        });
    }, [parsedRows, rowFilter, searchQuery]);

    // Filtered entries for the grouped journals view
    const filteredEntries = useMemo(() => {
        return parsedEntries.filter(entry => {
            if (rowFilter === 'valid' && (!entry.isValid || entry.isDuplicateRef)) return false;
            if (rowFilter === 'skipped' && !entry.isDuplicateRef) return false;
            if (rowFilter === 'invalid' && entry.isValid) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const ref = (entry.reference || '').toLowerCase();
                const desc = (entry.description || '').toLowerCase();
                const party = (entry.contactName || entry.driverStr || entry.vendorStr || '').toLowerCase();
                const branch = (entry.branchStr || '').toLowerCase();
                const errors = entry.errors.join(' ').toLowerCase();
                const lineAccs = entry.lines.map(l => l.accountingCodeName).join(' ').toLowerCase();

                return ref.includes(q) || desc.includes(q) || party.includes(q) || branch.includes(q) || errors.includes(q) || lineAccs.includes(q);
            }
            return true;
        });
    }, [parsedEntries, rowFilter, searchQuery]);

    // Summary statistics
    const validRowsCount = parsedRows.filter(r => r.isValid && !r.isDuplicateRef).length;
    const skippedRowsCount = parsedRows.filter(r => r.isDuplicateRef).length;
    const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;

    const validEntriesCount = parsedEntries.filter(e => e.isValid && !e.isDuplicateRef).length;
    const skippedEntriesCount = parsedEntries.filter(e => e.isDuplicateRef).length;
    const invalidEntriesCount = parsedEntries.filter(e => !e.isValid).length;

    const totalDebitSum = parsedRows.reduce((acc, r) => acc + (r.debit || 0), 0);
    const totalCreditSum = parsedRows.reduce((acc, r) => acc + (r.credit || 0), 0);

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-hidden max-w-7xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#C8E600]/10 border border-[#C8E600]/20">
                        <Upload size={20} className="text-[#C8E600]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                            Bulk Upload Manual Journals
                        </h2>
                        <p className="text-xs text-dim">
                            Multi-line double-entry manual journals with row parsing table, Driver & Vendor matching, and live balancing
                        </p>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    disabled={processing}
                    className="p-2 rounded-xl hover:bg-[var(--bg-card)] text-dim hover:text-[var(--text-main)] transition-colors cursor-pointer"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content area */}
            <div className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-6">
                {uploadProgress ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-6 text-center animate-fade-in min-h-[380px]">
                        <div className="relative flex items-center justify-center">
                            {/* Outer spinning ring */}
                            <div className="w-28 h-28 rounded-full border-4 border-dashed animate-spin border-[#C8E600] border-t-transparent" />
                            {/* Center percentage value */}
                            <span className="absolute text-2xl font-black text-[var(--text-main)] font-mono">{uploadProgress.percentage}%</span>
                        </div>
                        <div className="space-y-2 max-w-lg">
                            <h3 className="text-base font-black text-[var(--text-main)]">
                                {uploadProgress.statusMessage || `Processing journals...`}
                            </h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Please do not close this window or refresh the page. We are verifying double entries, executing automatic invoice/bill set-offs, and posting entries to the general ledger.
                            </p>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full max-w-md h-2.5 rounded-full overflow-hidden bg-[var(--bg-input)] relative border border-[var(--border-main)]">
                            <div 
                                className="h-full rounded-full transition-all duration-300 ease-out bg-[#C8E600]"
                                style={{ width: `${Math.max(2, uploadProgress.percentage)}%` }}
                            />
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2 text-left">
                            <div className="p-3 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-main)]">
                                <span className="block text-lg font-black text-[var(--text-main)] font-mono">
                                    {uploadProgress.current} / {uploadProgress.total}
                                </span>
                                <span className="text-[10px] uppercase font-black text-dim tracking-wider">Journals Processed</span>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                <span className="block text-lg font-black text-emerald-400 font-mono">
                                    {uploadProgress.percentage}%
                                </span>
                                <span className="text-[10px] uppercase font-black text-emerald-400/80 tracking-wider">Live Progress</span>
                            </div>
                            <div className="p-3 rounded-xl bg-[#C8E600]/5 border border-[#C8E600]/20 col-span-2 sm:col-span-1">
                                <span className="block text-lg font-black text-[#C8E600] font-mono">
                                    {Math.max(0, uploadProgress.total - uploadProgress.current)}
                                </span>
                                <span className="text-[10px] uppercase font-black text-[#C8E600]/80 tracking-wider">Remaining</span>
                            </div>
                        </div>
                    </div>
                ) : loadingMetadata ? (
                    <div className="flex flex-col items-center justify-center p-16 space-y-3">
                        <Loader2 className="animate-spin text-[#C8E600]" size={36} />
                        <span className="text-xs text-dim font-bold">Loading chart of accounts, branches & contacts...</span>
                    </div>
                ) : parsedRows.length === 0 ? (
                    /* Initial Upload Box */
                    <div className="space-y-6">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-[var(--border-main)] hover:border-[#C8E600]/60 rounded-2xl p-14 text-center cursor-pointer transition-all bg-[var(--bg-input)]/30 hover:bg-[var(--bg-input)]/60 flex flex-col items-center group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-input)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform border border-[var(--border-main)]">
                                <FileSpreadsheet className="text-dim group-hover:text-[#C8E600] transition-colors" size={32} />
                            </div>
                            <span className="text-sm font-bold text-[var(--text-main)] mb-1">
                                Drag & drop your journal file here, or <span className="text-[#C8E600] hover:underline">browse</span>
                            </span>
                            <span className="text-xs text-dim">Supports Excel (.xlsx, .xls) and CSV (.csv) spreadsheets</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                className="hidden" 
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)]/20 space-y-2">
                                <p className="text-xs font-bold text-[var(--text-main)]">Standard Template Columns:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Reference', 'Date', 'Branch', 'Driver', 'Vendor', 'Account Name', 'Debit', 'Credit', 'Line Description', 'Tax Name'].map(c => (
                                        <span key={c} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-[var(--text-main)]">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[11px] text-[#C8E600]/90 pt-1">
                                    • Multi-leg journals: rows sharing the same Reference, Date, and Branch will be automatically grouped into a single balanced voucher.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)]/40 flex flex-col justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-[var(--text-main)]">Need a template?</p>
                                    <p className="text-[11px] text-dim">Download pre-configured samples with Driver & Vendor set-off examples.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadTemplate('xlsx')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all cursor-pointer"
                                    >
                                        <Download size={13} /> Excel
                                    </button>
                                    <button
                                        onClick={() => downloadTemplate('csv')}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all cursor-pointer"
                                    >
                                        <Download size={13} /> CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Step 2: Parsed Rows & Journal Management */
                    <div className="space-y-4">
                        {/* Summary Status Bar & Actions */}
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-input)]/40">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-black text-[var(--text-main)]">{fileName}</span>
                                    <span className="text-dim">•</span>
                                    <span className="text-xs font-bold text-[var(--text-main)]">{parsedRows.length} Total Rows</span>
                                    <span className="text-dim">•</span>
                                    <span className="text-xs font-bold text-emerald-400">{validRowsCount} Valid</span>
                                    {skippedRowsCount > 0 && (
                                        <>
                                            <span className="text-dim">•</span>
                                            <span className="text-xs font-bold text-amber-400">{skippedRowsCount} Existing (Skipped)</span>
                                        </>
                                    )}
                                    {invalidRowsCount > 0 && (
                                        <>
                                            <span className="text-dim">•</span>
                                            <span className="text-xs font-bold text-rose-400">{invalidRowsCount} Invalid</span>
                                        </>
                                    )}
                                    <span className="text-dim">•</span>
                                    <span className="text-xs text-dim">
                                        Journals: <strong className="text-emerald-400">{validEntriesCount}</strong> Ready
                                        {skippedEntriesCount > 0 && (
                                            <> / <strong className="text-amber-400">{skippedEntriesCount}</strong> Skipped</>
                                        )}
                                        {invalidEntriesCount > 0 && (
                                            <> / <strong className="text-rose-400">{invalidEntriesCount}</strong> Errors</>
                                        )}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-dim">
                                    <span>Total Debits: <strong className="text-emerald-400 font-mono">${totalDebitSum.toFixed(2)}</strong></span>
                                    <span>•</span>
                                    <span>Total Credits: <strong className="text-rose-400 font-mono">${totalCreditSum.toFixed(2)}</strong></span>
                                    <span>•</span>
                                    <span className={Math.abs(totalDebitSum - totalCreditSum) < 0.01 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                        {Math.abs(totalDebitSum - totalCreditSum) < 0.01 ? '✓ Overall Batch Balanced' : `Batch Difference: $${Math.abs(totalDebitSum - totalCreditSum).toFixed(2)}`}
                                    </span>
                                </div>
                            </div>

                            {/* View Switcher Tabs */}
                            <div className="flex items-center gap-2">
                                <div className="flex rounded-xl p-1 bg-[var(--bg-input)] border border-[var(--border-main)]">
                                    <button
                                        onClick={() => setActiveView('table')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeView === 'table'
                                                ? 'bg-[#C8E600] text-black shadow-sm'
                                                : 'text-dim hover:text-[var(--text-main)]'
                                        }`}
                                    >
                                        <Table size={14} />
                                        Parsing Table ({parsedRows.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveView('grouped')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            activeView === 'grouped'
                                                ? 'bg-[#C8E600] text-black shadow-sm'
                                                : 'text-dim hover:text-[var(--text-main)]'
                                        }`}
                                    >
                                        <Layers size={14} />
                                        Grouped Journals ({parsedEntries.length})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Search, Filter Tabs & Batch Invalid Row Tools */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
                            <div className="flex flex-wrap items-center gap-2 flex-grow">
                                {/* Search */}
                                <div className="relative min-w-[240px] max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" size={14} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search rows, accounts, errors..."
                                        className="w-full pl-9 pr-7 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-main)] outline-none focus:border-[#C8E600]"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-dim hover:text-[var(--text-main)] cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Status Filter Tabs */}
                                <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)]">
                                    <button
                                        type="button"
                                        onClick={() => setRowFilter('all')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                            rowFilter === 'all' 
                                                ? 'bg-[#C8E600] text-black shadow-sm' 
                                                : 'text-dim hover:text-[var(--text-main)]'
                                        }`}
                                    >
                                        All ({parsedRows.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRowFilter('valid')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                            rowFilter === 'valid' 
                                                ? 'bg-emerald-500 text-white shadow-sm' 
                                                : 'text-emerald-400 hover:brightness-125'
                                        }`}
                                    >
                                        <CheckCircle size={12} /> Valid ({validRowsCount})
                                    </button>
                                    {skippedRowsCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setRowFilter('skipped')}
                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                rowFilter === 'skipped' 
                                                    ? 'bg-amber-500 text-black shadow-sm' 
                                                    : 'text-amber-400 hover:brightness-125'
                                            }`}
                                        >
                                            <AlertTriangle size={12} /> Skipped ({skippedRowsCount})
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setRowFilter('invalid')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                            rowFilter === 'invalid' 
                                                ? 'bg-rose-500 text-white shadow-sm' 
                                                : 'text-rose-400 hover:brightness-125'
                                        }`}
                                    >
                                        <AlertTriangle size={12} /> Invalid ({invalidRowsCount})
                                    </button>
                                </div>
                            </div>

                            {/* Batch Invalid Row Actions */}
                            <div className="flex flex-wrap items-center gap-2">
                                {invalidRowsCount > 0 && !processing && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadInvalid('xlsx')}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all cursor-pointer"
                                            title="Export all rows with errors into an Excel file"
                                        >
                                            <Download size={13} /> Export Invalid
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveAllInvalid}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                                            title="Filter out and remove all rows with errors"
                                        >
                                            <Trash2 size={13} /> Remove All Invalid
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={processing}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {/* VIEW 1: Parsing Table Showing All Rows */}
                        {activeView === 'table' && (
                            <div className="border border-[var(--border-main)] rounded-xl overflow-hidden bg-[var(--bg-card)]">
                                <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="sticky top-0 z-10 bg-[var(--bg-input)] border-b border-[var(--border-main)] text-dim uppercase tracking-wider text-[10px]">
                                            <tr>
                                                <th className="p-3 font-bold w-12 text-center">#</th>
                                                <th className="p-3 font-bold">Reference</th>
                                                <th className="p-3 font-bold">Date</th>
                                                <th className="p-3 font-bold">Branch</th>
                                                <th className="p-3 font-bold">Driver / Vendor</th>
                                                <th className="p-3 font-bold">Account Name</th>
                                                <th className="p-3 font-bold text-right">Debit</th>
                                                <th className="p-3 font-bold text-right">Credit</th>
                                                <th className="p-3 font-bold">Line Description</th>
                                                <th className="p-3 font-bold">Tax</th>
                                                <th className="p-3 font-bold">Validation Status</th>
                                                <th className="p-3 font-bold text-center w-12">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-main)]/40">
                                            {filteredRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={12} className="p-12 text-center text-dim font-medium">
                                                        No rows match the selected filter or search criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredRows.map((row) => {
                                                    const allErrors = [...row.rowErrors, ...row.journalErrors];
                                                    const hasErrors = allErrors.length > 0;

                                                    return (
                                                        <tr 
                                                            key={row.id}
                                                            className={`transition-colors hover:bg-[var(--bg-input)]/30 ${
                                                                hasErrors ? 'bg-rose-500/5' : ''
                                                            }`}
                                                        >
                                                            <td className="p-3 text-center text-dim font-mono font-medium">
                                                                {row.rowIndex}
                                                            </td>
                                                            <td className="p-3 font-mono font-bold text-[#C8E600] whitespace-nowrap">
                                                                {row.reference}
                                                            </td>
                                                            <td className="p-3 font-mono text-dim whitespace-nowrap">
                                                                {row.date}
                                                            </td>
                                                            <td className="p-3 whitespace-nowrap">
                                                                {row.matchedBranch ? (
                                                                    <span className="text-[var(--text-main)] font-medium">
                                                                        {row.matchedBranch.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-rose-400 font-medium">
                                                                        {row.branch || 'Missing'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 whitespace-nowrap">
                                                                {row.contactModel === 'Customer' ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-400/10 border border-sky-400/20 px-2 py-0.5 rounded-md">
                                                                        <User size={11} /> {row.contactName || row.driver}
                                                                    </span>
                                                                ) : row.contactModel === 'Supplier' ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">
                                                                        <Building size={11} /> {row.contactName || row.vendor}
                                                                    </span>
                                                                ) : row.driver || row.vendor ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded-md">
                                                                        {row.driver || row.vendor} (Unmatched)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-dim text-[11px]">General</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex flex-col">
                                                                    <span className={`font-bold ${row.matchedAccount ? 'text-[var(--text-main)]' : 'text-rose-400'}`}>
                                                                        {row.matchedAccount ? row.matchedAccount.name : row.accountName}
                                                                    </span>
                                                                    {row.matchedAccount?.code && (
                                                                        <span className="text-[10px] font-mono text-dim">
                                                                            Code: {row.matchedAccount.code} • {row.matchedAccount.category || 'Standard'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                                                {row.debit > 0 ? `$${row.debit.toFixed(2)}` : '—'}
                                                            </td>
                                                            <td className="p-3 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                                                                {row.credit > 0 ? `$${row.credit.toFixed(2)}` : '—'}
                                                            </td>
                                                            <td className="p-3 text-dim max-w-[200px] truncate" title={row.lineDescription || row.journalDescription}>
                                                                {row.lineDescription || row.journalDescription || '—'}
                                                            </td>
                                                            <td className="p-3 text-dim whitespace-nowrap">
                                                                {row.taxName || '—'}
                                                            </td>
                                                            <td className="p-3">
                                                                {row.isDuplicateRef ? (
                                                                    <div className="space-y-1">
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                                                            <AlertTriangle size={11} /> Existing Ref (Skipped)
                                                                        </span>
                                                                        <p className="text-[10px] text-amber-300/80 font-medium">Already exists in system</p>
                                                                    </div>
                                                                ) : row.isValid ? (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                                                                        <CheckCircle size={11} /> Valid
                                                                    </span>
                                                                ) : (
                                                                    <div className="space-y-1">
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 border border-rose-400/20 px-2 py-0.5 rounded-full">
                                                                            <AlertTriangle size={11} /> Invalid
                                                                        </span>
                                                                        <div className="text-[10px] text-rose-400 font-medium space-y-0.5 max-w-[280px]">
                                                                            {allErrors.map((err, idx) => (
                                                                                <div key={idx} className="flex items-start gap-1">
                                                                                    <span>•</span>
                                                                                    <span>{err}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRow(row.id)}
                                                                    className="p-1 rounded-lg hover:bg-rose-500/10 text-dim hover:text-rose-400 transition-colors cursor-pointer"
                                                                    title="Remove Row"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: Grouped Journals View */}
                        {activeView === 'grouped' && (
                            <div className="space-y-4">
                                {filteredEntries.length === 0 ? (
                                    <div className="p-12 text-center text-dim font-medium border border-[var(--border-main)] rounded-xl bg-[var(--bg-card)]">
                                        No journals match the selected filter or search criteria.
                                    </div>
                                ) : (
                                    filteredEntries.map((entry) => (
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
                                                    {entry.isDuplicateRef ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                                                            <AlertTriangle size={11} /> Existing Ref (Will Skip)
                                                        </span>
                                                    ) : entry.isValid ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                                            <CheckCircle size={11} /> Balanced &amp; Ready
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
                                )))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-[var(--border-main)] bg-[var(--bg-input)] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
                <div className="text-xs text-dim">
                    {uploadProgress ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin text-[#C8E600]" size={16} />
                            <span>Posting {uploadProgress.total} manual journals to general ledger...</span>
                        </div>
                    ) : processing ? (
                        <span>Validating rows...</span>
                    ) : parsedRows.length > 0 ? (
                        <span>
                            Ready to import <strong className="text-[#C8E600]">{validEntriesCount}</strong> new journal entries ({validRowsCount} balanced rows).
                            {skippedEntriesCount > 0 && (
                                <span className="text-amber-400 font-bold ml-1.5">({skippedEntriesCount} existing references will be skipped)</span>
                            )}
                        </span>
                    ) : (
                        <span>Select an Excel (.xlsx) or CSV file with manual journal rows to get started.</span>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-input)] text-[var(--text-main)] hover:brightness-110 border border-[var(--border-main)] transition-all disabled:opacity-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    {parsedRows.length > 0 && (
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={processing || validEntriesCount === 0}
                            className="px-8 py-2.5 rounded-xl text-xs font-bold bg-[#C8E600] text-black disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(200,230,0,0.2)] cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} /> Importing...
                                </>
                            ) : (
                                <>
                                    <Play size={14} fill="black" /> Import {validEntriesCount} Entries {skippedEntriesCount > 0 && `(${skippedEntriesCount} Skipped)`}
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
