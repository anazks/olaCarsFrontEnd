import { useState, useRef } from 'react';
import { Upload, FileText, X, Download, AlertTriangle, CheckCircle, Loader2, Info, Trash2, Link2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkImportLedgerRows } from '../../../services/ledgerService';

interface BulkLedgerUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TEMPLATE_HEADERS = [
    'date', 'account_name', 'transaction_details', 'transaction_id',
    'reference_transaction_id', 'offset_account_id', 'offset_account_type',
    'transaction_type', 'debit', 'credit', 'contact_id', 'account_id',
    'project_ids', 'description', 'currency_code', 'account_group',
    'account_type', 'location_name'
];

const SAMPLE_ROW = {
    date: '2026-06-01',
    account_name: 'Petty Cash',
    transaction_details: 'Office supplies purchase',
    transaction_id: 'TXN-001',
    reference_transaction_id: 'REF-001',
    offset_account_id: '2100',
    offset_account_type: 'Liability',
    transaction_type: 'expense',
    debit: '150.00',
    credit: '',
    contact_id: '',
    account_id: '1020',
    project_ids: '',
    description: 'Monthly stationery',
    currency_code: 'USD',
    account_group: 'Expense',
    account_type: 'Cash',
    location_name: 'Panama Branch'
};

const getRowVal = (r: any, keys: string[]): any => {
    if (!r) return undefined;
    for (const key of keys) {
        const cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
        if (r[key] !== undefined && r[key] !== '') return r[key];
        for (const k of Object.keys(r)) {
            if (k.replace(/^\ufeff/, '').trim().toLowerCase() === cleanKey) {
                if (r[k] !== undefined && r[k] !== '') return r[k];
            }
        }
    }
    return undefined;
};

const BulkLedgerUpload = ({ isOpen, onClose, onSuccess }: BulkLedgerUploadProps) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [, setFile] = useState<File | null>(null);
    const [rows, setRows] = useState<any[]>([]);
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);

    const validateRow = (row: any): string[] => {
        const errors: string[] = [];
        const accountId = getRowVal(row, ['account_id', 'Account ID']);
        const accountName = getRowVal(row, ['account_name', 'Account Name']);
        if (!accountId && !accountName) errors.push('Missing account_id and account_name');
        return errors;
    };

    const parseFile = (f: File) => {
        setResult(null);
        setFile(f);
        setFileName(f.name);
        const ext = f.name.split('.').pop()?.toLowerCase();

        const processData = (jsonData: any[]) => {
            const parsed = jsonData.map(row => {
                const trimmed: any = {};
                for (const key of Object.keys(row)) trimmed[key.trim()] = row[key];
                return { ...trimmed, _rowErrors: validateRow(trimmed) };
            });
            setRows(parsed);
            if (parsed.length === 0) toast.error('No data rows found.');
            else toast.success(`Parsed ${parsed.length} row(s) from ${f.name}`);
        };

        if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    processData(XLSX.utils.sheet_to_json(ws));
                } catch { toast.error('Failed to parse Excel file.'); }
            };
            reader.readAsArrayBuffer(f);
        } else {
            // CSV via XLSX
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target?.result, { type: 'string' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    processData(XLSX.utils.sheet_to_json(ws));
                } catch { toast.error('Failed to parse CSV file.'); }
            };
            reader.readAsText(f);
        }
    };

    const handleSubmit = async () => {
        if (rows.length === 0) return;
        const validRows = rows.filter(r => r._rowErrors.length === 0);
        if (validRows.length === 0) { toast.error('No valid rows to upload.'); return; }

        setUploading(true);
        setUploadProgress(0);

        // Strip UI-only helper keys like _rowErrors
        const rowsToUpload = validRows.map(({ _rowErrors, ...rest }) => rest);

        const batchSize = 50;
        const totalRows = rowsToUpload.length;
        let inserted = 0;
        let linked = 0;
        const allErrors: any[] = [];

        try {
            for (let i = 0; i < totalRows; i += batchSize) {
                const chunk = rowsToUpload.slice(i, i + batchSize);
                const res = await bulkImportLedgerRows(chunk);
                const data = res.data || res;
                inserted += data.inserted || 0;
                linked += data.linked || 0;
                if (data.errors && data.errors.length > 0) {
                    const mappedErrors = data.errors.map((err: any) => ({
                        ...err,
                        row: err.row + i
                    }));
                    allErrors.push(...mappedErrors);
                }
                const progressVal = Math.min(Math.round(((i + chunk.length) / totalRows) * 100), 100);
                setUploadProgress(progressVal);
            }

            setResult({
                inserted,
                linked,
                errors: allErrors
            });

            if (inserted > 0) {
                toast.success(`${inserted} ledger entries imported!`);
                onSuccess();
            } else {
                toast.error('No entries were imported.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Import failed.');
            setResult({ inserted: 0, errors: [{ row: 0, reason: err?.response?.data?.message || err.message }] });
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (format: 'xlsx' | 'csv') => {
        const ws = XLSX.utils.json_to_sheet([SAMPLE_ROW], { header: TEMPLATE_HEADERS });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ledger Template');
        XLSX.writeFile(wb, `ledger_bulk_template.${format}`);
        toast.success('Template downloaded!');
    };

    const handleReset = () => {
        setRows([]); setFile(null); setFileName(''); setResult(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    if (!isOpen) return null;

    const validCount = rows.filter(r => r._rowErrors.length === 0).length;
    const errorCount = rows.filter(r => r._rowErrors.length > 0).length;
    const txnIdCount = rows.filter(r => getRowVal(r, ['transaction_id', 'Transaction ID'])).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                            <FileText size={20} style={{ color: '#eab308' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Bulk Ledger Import</h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Upload Excel to import ledger entries & link with invoices</p>
                        </div>
                    </div>
                    <button onClick={() => { handleReset(); onClose(); }} className="p-2 rounded-lg transition-all hover:scale-110" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-4 rounded-xl border" style={{ borderColor: 'rgba(234, 179, 8, 0.2)', background: 'rgba(234, 179, 8, 0.03)' }}>
                        <Link2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#eab308' }} />
                        <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                            Entries with a <strong>transaction_id</strong> will be automatically linked to invoices whose <strong>invoiceID</strong> matches. Unmapped columns are stored in the description.
                        </p>
                    </div>

                    {/* Template download */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} style={{ color: 'var(--brand-lime)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Download template:</span>
                        <div className="ml-auto flex gap-2">
                            <button onClick={() => downloadTemplate('xlsx')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <Download size={14} /> Excel
                            </button>
                            <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <Download size={14} /> CSV
                            </button>
                        </div>
                    </div>

                    {/* Drop zone */}
                    {rows.length === 0 && !result && (
                        <div
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); }}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileRef.current?.click()}
                            className={`flex flex-col items-center justify-center gap-3 p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'scale-[1.01]' : ''}`}
                            style={{ borderColor: dragOver ? 'var(--brand-lime)' : 'var(--border-main)', background: dragOver ? 'rgba(200,230,0,0.05)' : 'transparent' }}
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(234, 179, 8, 0.08)' }}>
                                <Upload size={28} style={{ color: '#eab308' }} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-main">Drop your Excel or CSV file here</p>
                                <p className="text-xs mt-1 text-dim">or click to browse — .xlsx, .xls, .csv supported</p>
                            </div>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
                        </div>
                    )}

                    {/* Preview */}
                    {rows.length > 0 && !result && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                                        <FileText size={20} style={{ color: '#eab308' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-main">{fileName}</p>
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span className="text-emerald-500 font-bold">{validCount} valid</span>
                                            {errorCount > 0 && <span className="text-rose-500 font-bold">{errorCount} errors</span>}
                                            {txnIdCount > 0 && <span className="font-bold" style={{ color: '#eab308' }}>{txnIdCount} linkable to invoices</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleReset} disabled={uploading} className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-black/5 disabled:opacity-40" style={{ borderColor: 'var(--border-main)' }}>
                                        Change File
                                    </button>
                                    <button onClick={handleSubmit} disabled={uploading || validCount === 0}
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold disabled:opacity-50 border-none hover:scale-[1.02]"
                                        style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        {uploading ? 'Importing...' : `Import ${validCount} Entries`}
                                    </button>
                                </div>
                            </div>

                            {uploading && (
                                <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <div className="flex justify-between items-center text-xs font-bold text-main">
                                        <span>Importing ledger entries...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full h-2 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--brand-lime)' }} />
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-main)' }}>
                                            <tr>
                                                <th className="py-3 px-4">Date</th>
                                                <th className="py-3 px-4">Account</th>
                                                <th className="py-3 px-4">Debit</th>
                                                <th className="py-3 px-4">Credit</th>
                                                <th className="py-3 px-4">Txn ID</th>
                                                <th className="py-3 px-4">Description</th>
                                                <th className="py-3 px-4">Validation</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                            {rows.map((row, idx) => (
                                                <tr key={idx} style={{ background: row._rowErrors.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                                    <td className="py-3 px-4">{getRowVal(row, ['date', 'Date']) || '-'}</td>
                                                    <td className="py-3 px-4">{getRowVal(row, ['account_name', 'Account Name']) || getRowVal(row, ['account_id', 'Account ID']) || '-'}</td>
                                                    <td className="py-3 px-4 font-bold text-rose-500">{getRowVal(row, ['debit', 'Debit']) || '-'}</td>
                                                    <td className="py-3 px-4 font-bold text-emerald-500">{getRowVal(row, ['credit', 'Credit']) || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {getRowVal(row, ['transaction_id', 'Transaction ID']) ? (
                                                            <span className="flex items-center gap-1" style={{ color: '#eab308' }}>
                                                                <Link2 size={12} /> {getRowVal(row, ['transaction_id', 'Transaction ID'])}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 max-w-[200px] truncate">{getRowVal(row, ['transaction_details', 'Transaction Details']) || getRowVal(row, ['description', 'Description']) || '-'}</td>
                                                    <td className="py-3 px-4">
                                                        {row._rowErrors.length > 0 ? (
                                                            <div className="flex flex-col text-rose-500" title={row._rowErrors.join(', ')}>
                                                                <div className="flex items-center gap-1.5 font-bold"><AlertTriangle size={14} /> Error</div>
                                                                <span className="text-[10px] text-rose-400 mt-0.5 max-w-[180px] break-words">{row._rowErrors.join(', ')}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle size={14} /> Valid</div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <button onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 rounded-lg hover:bg-rose-50 text-dim hover:text-rose-500 transition-colors border-none" title="Remove Row">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="space-y-4 animate-fade-in text-center py-8">
                            <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${(result.errors?.length || 0) === 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {(result.errors?.length || 0) === 0 ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-main mb-2">Import Complete</h3>
                                <p className="text-sm text-dim">
                                    Created <span className="font-bold text-emerald-500">{result.inserted || 0}</span> ledger entries.
                                    {(result.linked || 0) > 0 && <span className="font-bold" style={{ color: '#eab308' }}> Linked {result.linked} to invoices.</span>}
                                    {(result.errors?.length || 0) > 0 && <span className="text-rose-500"> {result.errors.length} row errors.</span>}
                                </p>
                            </div>

                            {result.errors?.length > 0 && (
                                <div className="mt-4 text-left max-w-lg mx-auto p-4 rounded-xl border bg-rose-500/5 border-rose-500/20">
                                    <p className="text-xs font-bold text-rose-500 mb-2 uppercase tracking-wider">Error Log:</p>
                                    <ul className="text-xs space-y-1 text-dim max-h-32 overflow-y-auto custom-scrollbar">
                                        {result.errors.map((err: any, i: number) => (
                                            <li key={i}>• Row {err.row}: {err.reason}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-6">
                                <button onClick={() => { handleReset(); onClose(); }} className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all border-none" style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}>
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkLedgerUpload;
