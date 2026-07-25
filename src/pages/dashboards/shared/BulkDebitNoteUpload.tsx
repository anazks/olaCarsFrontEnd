import { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { bulkUploadDebitNotes } from '../../../services/debitNoteService';

interface BulkDebitNoteUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const BulkDebitNoteUpload = ({ isOpen, onClose, onSuccess }: BulkDebitNoteUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedRows, setParsedRows] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    const processFile = (fileToProcess: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    toast.error('The selected file is empty.');
                    return;
                }

                setParsedRows(json);
                setPreviewMode(true);
                toast.success(`Successfully parsed ${json.length} rows.`);
            } catch (err: any) {
                console.error('Error parsing file:', err);
                toast.error('Failed to parse file. Please upload a valid Excel or CSV file.');
            }
        };
        reader.readAsArrayBuffer(fileToProcess);
    };

    const handleUpload = async () => {
        if (parsedRows.length === 0) {
            toast.error('No rows to upload.');
            return;
        }

        setUploading(true);
        const toastId = toast.loading('Uploading Debit Notes...');
        try {
            const res = await bulkUploadDebitNotes({ rows: parsedRows });
            toast.success(res.message || 'Debit Notes uploaded successfully!', { id: toastId });
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

    const downloadSampleTemplate = () => {
        const sampleData = [
            {
                "Customer": "CU-10001",
                "Amount": 150.00,
                "Reason": "Late Return Charge",
                "Notes": "Additional day rental debit fee",
                "Date": "2026-07-25"
            },
            {
                "Customer": "CU-10002",
                "Amount": 75.50,
                "Reason": "Cleaning Fee",
                "Notes": "Interior cleaning surcharge",
                "Date": "2026-07-25"
            }
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Debit_Notes_Template");
        XLSX.writeFile(wb, "bulk_debit_notes_template.xlsx");
        toast.success("Sample template downloaded!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2rem] shadow-2xl border animate-in fade-in duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(212,241,46,0.1)', border: '1px solid rgba(212,241,46,0.2)' }}>
                            <FileSpreadsheet size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Bulk Upload Debit Notes</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Upload Excel (.xlsx, .xls) or CSV files to bulk issue debit notes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl border transition-all hover:bg-white/10" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
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
                                <p className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>Supports XLSX, XLS, or CSV spreadsheets</p>
                            </div>

                            {/* Template Download */}
                            <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-3">
                                    <FileText size={18} style={{ color: 'var(--brand-lime)' }} />
                                    <div>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Need a formatted template?</p>
                                        <p className="text-[10px] text-dim">Download sample template with required headers</p>
                                    </div>
                                </div>
                                <button onClick={downloadSampleTemplate} className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 transition-all border cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    Download Template
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Parsed {parsedRows.length} Debit Note records</span>
                                </div>
                                <button onClick={() => { setPreviewMode(false); setParsedRows([]); }} className="text-xs font-bold text-rose-400 hover:underline">
                                    Change File
                                </button>
                            </div>

                            {/* Preview Table */}
                            <div className="border rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead style={{ background: 'var(--bg-input)' }}>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Customer / Driver</th>
                                            <th className="p-3">Amount ($)</th>
                                            <th className="p-3">Reason</th>
                                            <th className="p-3">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                        {parsedRows.slice(0, 10).map((row, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-main)' }}>
                                                <td className="p-3 text-dim">{idx + 1}</td>
                                                <td className="p-3 font-bold" style={{ color: 'var(--text-main)' }}>{row.Customer || row.customerId || row.Driver || 'N/A'}</td>
                                                <td className="p-3 font-bold text-amber-400">${Number(row.Amount || row.amount || 0).toFixed(2)}</td>
                                                <td className="p-3" style={{ color: 'var(--text-main)' }}>{row.Reason || row.reason || 'N/A'}</td>
                                                <td className="p-3 text-dim">{row.Notes || row.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedRows.length > 10 && (
                                <p className="text-[10px] text-dim text-center">... and {parsedRows.length - 10} more records</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-8 py-5 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/10 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        Cancel
                    </button>
                    {previewMode && (
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                            <span>{uploading ? 'Processing...' : 'Upload Debit Notes'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkDebitNoteUpload;
