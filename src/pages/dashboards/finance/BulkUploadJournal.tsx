import { useState, useEffect, useRef } from 'react';
import { X, Upload, Download, AlertTriangle, CheckCircle, FileSpreadsheet, Loader2, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { getAllBranches } from '../../../services/branchService';
import { getAllTaxes } from '../../../services/taxService';
import { createManualJournal } from '../../../services/ledgerService';
import toast from 'react-hot-toast';

import type { AccountingCode } from '../../../services/accountingService';

interface ParsedRow {
    date: string;
    journalDescription: string;
    branch: string;
    accountCode: string;
    debit: number;
    credit: number;
    lineDescription: string;
    taxName?: string;
}

interface ValidationLine {
    accountingCodeId: string;
    accountingCodeStr: string;
    accountingCodeName: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    description: string;
    taxAppliedId?: string;
    taxName?: string;
}

interface ValidationEntry {
    index: number;
    date: string;
    description: string;
    branchId: string;
    branchStr: string;
    lines: ValidationLine[];
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

const BulkUploadJournal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
    const [accountingCodes, setAccountingCodes] = useState<AccountingCode[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [loadingMetadata, setLoadingMetadata] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

    const [parsedEntries, setParsedEntries] = useState<ValidationEntry[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [codesRes, branchesRes, taxesRes] = await Promise.allSettled([
                    getAllAccountingCodes(),
                    getAllBranches(),
                    getAllTaxes()
                ]);

                if (codesRes.status === 'fulfilled') {
                    setAccountingCodes(codesRes.value);
                }
                if (branchesRes.status === 'fulfilled') {
                    setBranches(branchesRes.value.data || []);
                }
                if (taxesRes.status === 'fulfilled') {
                    setTaxes(taxesRes.value);
                }
            } catch (err) {
                console.error("Failed to load metadata for validation", err);
                toast.error("Failed to load account validation metadata");
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
            date: -1,
            journalDescription: -1,
            branch: -1,
            accountCode: -1,
            debit: -1,
            credit: -1,
            lineDescription: -1,
            taxName: -1
        };

        headers.forEach((h, idx) => {
            const normalized = normalizeHeader(h);
            if (['date', 'journaldate', 'entrydate'].includes(normalized)) {
                mapping.date = idx;
            } else if (['journaldescription', 'entryreference', 'reference', 'description', 'journalref', 'entryref'].includes(normalized)) {
                mapping.journalDescription = idx;
            } else if (['branch', 'branchcode', 'branchname'].includes(normalized)) {
                mapping.branch = idx;
            } else if (['accountcode', 'account', 'accountnumber', 'code'].includes(normalized)) {
                mapping.accountCode = idx;
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

    const processRawData = (rows: string[][]) => {
        if (!rows || rows.length < 2) {
            toast.error("The file is empty or contains no data rows.");
            setProcessing(false);
            return;
        }

        const headers = rows[0].map(h => String(h || '').trim());
        const mapping = parseHeaderMapping(headers);

        // Check required fields
        const missingFields: string[] = [];
        if (mapping.date === -1) missingFields.push('Date');
        if (mapping.journalDescription === -1) missingFields.push('Journal Description / Reference');
        if (mapping.branch === -1) missingFields.push('Branch');
        if (mapping.accountCode === -1) missingFields.push('Account Code');
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
            // Skip empty rows
            if (!row || row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === '')) {
                continue;
            }

            const parsedRow: ParsedRow = {
                date: String(row[mapping.date] || '').trim(),
                journalDescription: String(row[mapping.journalDescription] || '').trim(),
                branch: String(row[mapping.branch] || '').trim(),
                accountCode: String(row[mapping.accountCode] || '').trim(),
                debit: Number(row[mapping.debit]) || 0,
                credit: Number(row[mapping.credit]) || 0,
                lineDescription: mapping.lineDescription !== -1 ? String(row[mapping.lineDescription] || '').trim() : '',
                taxName: mapping.taxName !== -1 ? String(row[mapping.taxName] || '').trim() : undefined
            };

            rawRows.push(parsedRow);
        }

        // Group rows into journal entries by JournalDescription + Date
        const grouped: Record<string, ParsedRow[]> = {};
        rawRows.forEach(row => {
            const groupKey = `${row.journalDescription}__${row.date}__${row.branch}`;
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
            let matchedBranch = branches.find(b => 
                b._id === first.branch || 
                b.code?.toLowerCase() === first.branch.toLowerCase() || 
                b.name?.toLowerCase() === first.branch.toLowerCase()
            );

            if (!matchedBranch) {
                errors.push(`Branch "${first.branch}" not found in system.`);
            }

            // Parse lines
            const entryLines: ValidationLine[] = [];
            let totalDebit = 0;
            let totalCredit = 0;

            items.forEach((item, lineIdx) => {
                // Match account code
                const matchedCode = accountingCodes.find(c => 
                    c._id === item.accountCode || 
                    c.code?.toLowerCase() === item.accountCode.toLowerCase() || 
                    c.name?.toLowerCase() === item.accountCode.toLowerCase()
                );

                let codeId = '';
                let codeStr = item.accountCode;
                let codeName = 'Unknown Account';

                if (!matchedCode) {
                    errors.push(`Row ${lineIdx + 2}: Account "${item.accountCode}" not found.`);
                } else {
                    codeId = matchedCode._id;
                    codeStr = matchedCode.code;
                    codeName = matchedCode.name;
                }

                // Match tax if specified
                let taxId = undefined;
                if (item.taxName) {
                    const matchedTax = taxes.find(t => 
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

                entryLines.push({
                    accountingCodeId: codeId,
                    accountingCodeStr: codeStr,
                    accountingCodeName: codeName,
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
                date: formattedDate,
                description: first.journalDescription || 'Manual Bulk Adjustment',
                branchId: matchedBranch?._id || '',
                branchStr: matchedBranch ? `${matchedBranch.name} (${matchedBranch.country})` : first.branch,
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
        // Generate template headers and sample rows
        const headers = ['Date', 'Journal Description', 'Branch', 'Account Code', 'Debit', 'Credit', 'Line Description', 'Tax Name'];
        const sampleRows = [
            ['2026-05-21', 'Bulk Rent Adjustment', 'Panama Branch', '1010', '150.00', '0.00', 'Rent collection setup', ''],
            ['2026-05-21', 'Bulk Rent Adjustment', 'Panama Branch', '4000', '0.00', '150.00', 'Rental Income Account', '']
        ];

        if (format === 'xlsx') {
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Journal Entries");
            XLSX.writeFile(workbook, 'journal_bulk_upload_template.xlsx');
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
        link.setAttribute('download', 'journal_bulk_upload_template.csv');
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

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < validEntries.length; i++) {
            const entry = validEntries[i];
            try {
                const payload = {
                    description: entry.description,
                    date: entry.date,
                    branch: entry.branchId,
                    lines: entry.lines.map(line => ({
                        accountingCode: line.accountingCodeId,
                        type: line.type,
                        amount: line.amount,
                        description: line.description,
                        ...(line.taxAppliedId ? { taxInfo: { taxApplied: line.taxAppliedId } } : {})
                    }))
                };

                await createManualJournal(payload);
                successCount++;
            } catch (err: any) {
                console.error(`Failed to import journal ${entry.description}:`, err);
                failCount++;
            }

            setUploadProgress({ current: i + 1, total: validEntries.length });
        }

        setProcessing(false);
        setUploadProgress(null);

        if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} journal entries.`);
        }
        if (failCount > 0) {
            toast.error(`Failed to import ${failCount} journal entries.`);
        }

        if (successCount > 0) {
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] overflow-hidden max-w-5xl w-full max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                        <Upload size={24} className="text-[#C8E600]" />
                        Bulk Upload Journal Entries
                    </h2>
                    <p className="text-xs text-dim mt-1">Upload multiple manual journal adjustments via CSV or Excel sheets</p>
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
                        <span className="text-xs text-dim">Loading matching metadata...</span>
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
                                <p className="font-bold text-[var(--text-main)]">Template Headers Format:</p>
                                <p>Date, Journal Description, Branch, Account Code, Debit, Credit, Line Description, Tax Name</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => downloadTemplate('xlsx')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all"
                                >
                                    <Download size={14} /> Excel Template
                                </button>
                                <button
                                    onClick={() => downloadTemplate('csv')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-input)] hover:brightness-110 text-[var(--text-main)] rounded-xl border border-[var(--border-main)] transition-all"
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
                                Found <span className="font-bold text-[#C8E600]">{parsedEntries.length}</span> entries
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
                                className="text-xs text-rose-400 font-bold hover:underline"
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
                                    {/* Header */}
                                    <div className="px-4 py-3 bg-[var(--bg-input)]/40 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)]/50">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-[var(--text-main)]">{entry.description}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-input)] text-dim font-bold uppercase tracking-wider">
                                                    {entry.date}
                                                </span>
                                            </div>
                                            <div className="text-xs text-dim">Branch: {entry.branchStr}</div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {entry.isValid ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                                    <CheckCircle size={10} /> Valid
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full">
                                                    <AlertTriangle size={10} /> Errors
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="p-4 space-y-3">
                                        {/* Errors list */}
                                        {entry.errors.map((err, idx) => (
                                            <div key={idx} className="flex items-start gap-1.5 text-xs text-rose-400 bg-rose-500/5 p-2 rounded-lg border border-rose-500/10">
                                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                                <span>{err}</span>
                                            </div>
                                        ))}

                                        {/* Warnings list */}
                                        {entry.warnings.map((warn, idx) => (
                                            <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                                <span>{warn}</span>
                                            </div>
                                        ))}

                                        {/* Lines Table */}
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-[var(--border-main)]/50 text-dim">
                                                    <th className="pb-2 font-bold uppercase">Account</th>
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
                                                            <span className="font-bold text-[var(--text-main)]">{line.accountingCodeStr}</span>
                                                            <span className="text-dim block text-[10px]">{line.accountingCodeName}</span>
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
                            <span>Importing: {uploadProgress.current} / {uploadProgress.total} journals posted...</span>
                        </div>
                    ) : processing ? (
                        <span>Validating rows...</span>
                    ) : parsedEntries.length > 0 ? (
                        <span>
                            Ready to import <span className="font-bold text-[#C8E600]">{parsedEntries.filter(e => e.isValid).length}</span> valid journal entries.
                        </span>
                    ) : (
                        <span>Please select a valid CSV or Excel file to get started.</span>
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-input)] text-[var(--text-main)] hover:brightness-110 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    {parsedEntries.length > 0 && (
                        <button
                            onClick={handleImport}
                            disabled={processing || parsedEntries.filter(e => e.isValid).length === 0}
                            className="px-8 py-2.5 rounded-xl text-xs font-bold bg-[#C8E600] text-black disabled:opacity-30 disabled:grayscale transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(200,230,0,0.2)]"
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
