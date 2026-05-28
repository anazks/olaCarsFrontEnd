import { useState, useEffect, useRef } from 'react';
import {
    Plus, FileText, Clock, CheckCircle, XCircle, Banknote,
    Upload, Trash2, Eye, ChevronDown, ChevronUp, Calendar,
    DollarSign, AlertCircle, Search, Filter, RefreshCw, X
} from 'lucide-react';
import {
    createPaymentRequest,
    getPaymentRequests,
    deletePaymentRequest,
    type PaymentRequest,
    type CreatePaymentRequestPayload,
} from '../../../services/paymentRequestService';
import { getUser } from '../../../utils/auth';
import { format } from 'date-fns';

const CATEGORIES = [
    'OPERATIONAL',
    'MAINTENANCE',
    'STAFF',
    'MARKETING',
    'PROCUREMENT',
    'OTHER',
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    INITIATED: { label: 'Initiated', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: <Clock size={12} /> },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: <AlertCircle size={12} /> },
    APPROVED: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle size={12} /> },
    REJECTED: { label: 'Rejected', color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: <XCircle size={12} /> },
    PAID: { label: 'Paid', color: 'bg-[#C8E600]/15 text-[#C8E600] border-[#C8E600]/30', icon: <Banknote size={12} /> },
};

// ─── CREATE FORM MODAL ──────────────────────────────────────────────────────
interface CreateModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const CreatePaymentRequestModal = ({ onClose, onSuccess }: CreateModalProps) => {
    const currentUser = getUser();
    const [submitting, setSubmitting] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState<CreatePaymentRequestPayload>({
        amount: 0,
        reason: '',
        expectedPaymentDate: '',
        currency: 'USD',
        additionalNotes: '',
        category: 'OPERATIONAL',
        country: currentUser?.country || '',
    });
    const [file, setFile] = useState<File | null>(null);

    const handleChange = (key: string, value: any) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleFile = (f: File) => {
        if (f.size > 10 * 1024 * 1024) {
            alert('File size must be under 10MB.');
            return;
        }
        setFile(f);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.amount || form.amount <= 0) return alert('Please enter a valid amount.');
        if (!form.reason.trim()) return alert('Please enter a reason.');
        if (!form.expectedPaymentDate) return alert('Please select an expected payment date.');

        setSubmitting(true);
        try {
            await createPaymentRequest({
                ...form,
                supportingDocument: file || undefined,
            });
            onSuccess();
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div
                className="w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div
                    className="px-8 py-5 border-b flex items-center justify-between"
                    style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center">
                            <DollarSign size={20} className="text-[#C8E600]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>New Payment Request</h2>
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Submit a payment request to the Financial Admin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
                        <X size={20} style={{ color: 'var(--text-dim)' }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {/* Amount + Currency row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                Amount <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.amount || ''}
                                    onChange={e => handleChange('amount', parseFloat(e.target.value) || 0)}
                                    className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-semibold bg-transparent focus:outline-none focus:ring-2 focus:ring-[#C8E600]/40 transition"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Currency</label>
                            <select
                                value={form.currency}
                                onChange={e => handleChange('currency', e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border text-sm font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/40 transition"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                            >
                                {['USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR'].map(c => (
                                    <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleChange('category', cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.category === cat
                                        ? 'bg-[#C8E600] text-black border-[#C8E600]'
                                        : 'border-[var(--border-main)] hover:border-[#C8E600]/50'}`}
                                    style={{ color: form.category === cat ? 'black' : 'var(--text-dim)' }}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                            Reason / Purpose <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={form.reason}
                            onChange={e => handleChange('reason', e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/40 transition"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                            placeholder="Describe the purpose and justification for this payment request..."
                            required
                        />
                    </div>

                    {/* Expected Payment Date */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                            Expected Payment Date <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                            <input
                                type="date"
                                value={form.expectedPaymentDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => handleChange('expectedPaymentDate', e.target.value)}
                                className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C8E600]/40 transition"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)', colorScheme: 'dark' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                            Additional Notes <span className="text-xs font-normal normal-case">(optional)</span>
                        </label>
                        <textarea
                            value={form.additionalNotes}
                            onChange={e => handleChange('additionalNotes', e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/40 transition"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                            placeholder="Any additional context, urgency notes, or references..."
                        />
                    </div>

                    {/* Supporting Document Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                            Supporting Document <span className="text-xs font-normal normal-case">(optional — PDF or Image, max 10MB)</span>
                        </label>
                        {file ? (
                            <div
                                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <FileText size={18} className="text-[#C8E600]" />
                                    <div>
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{file.name}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-all ${dragOver
                                    ? 'border-[#C8E600] bg-[#C8E600]/5'
                                    : 'hover:border-[#C8E600]/40 hover:bg-white/2'}`}
                                style={{ borderColor: dragOver ? '#C8E600' : 'var(--border-main)' }}
                            >
                                <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Drop file here or click to browse</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>PDF, JPG, PNG — max 10MB</p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex items-center gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl border text-sm font-bold transition-all hover:bg-white/5"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 px-6 py-3 rounded-xl bg-[#C8E600] text-black text-sm font-black transition-all hover:bg-[#d4f533] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Submitting...</>
                            ) : (
                                <><Plus size={16} /> Submit Request</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────
const PaymentRequestPage = () => {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await getPaymentRequests({ status: statusFilter || undefined });
            setRequests(res.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, [statusFilter]);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this payment request?')) return;
        setDeletingId(id);
        try {
            await deletePaymentRequest(id);
            setRequests(prev => prev.filter(r => r._id !== id));
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = requests.filter(r =>
        r.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = requests.reduce((s, r) => s + r.amount, 0);
    const initiatedCount = requests.filter(r => r.status === 'INITIATED').length;
    const approvedCount = requests.filter(r => r.status === 'APPROVED').length;

    return (
        <div className="p-4 sm:p-8 min-h-full transition-colors" style={{ background: 'var(--bg-main)' }}>

            {/* Create Modal */}
            {showCreate && (
                <CreatePaymentRequestModal
                    onClose={() => setShowCreate(false)}
                    onSuccess={() => {
                        setShowCreate(false);
                        fetchRequests();
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <div className="w-10 h-10 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center">
                            <DollarSign size={20} className="text-[#C8E600]" />
                        </div>
                        Payment Requests
                    </h1>
                    <p className="text-sm mt-1 ml-13" style={{ color: 'var(--text-dim)' }}>
                        Submit and track payment requests to the Financial Admin
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#C8E600] text-black font-black text-sm hover:bg-[#d4f533] transition-all hover:-translate-y-0.5 shadow-lg shadow-[#C8E600]/20"
                >
                    <Plus size={16} />
                    New Request
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total Requested', value: `$${totalAmount.toLocaleString()}`, icon: <DollarSign size={18} />, color: '#C8E600' },
                    { label: 'Pending Review', value: initiatedCount.toString(), icon: <Clock size={18} />, color: '#3B82F6' },
                    { label: 'Approved', value: approvedCount.toString(), icon: <CheckCircle size={18} />, color: '#10B981' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl p-5 border shadow-sm flex items-center gap-4 transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{stat.value}</div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder="Search by reason, reference, or category..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[#C8E600]/30"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                    />
                </div>
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="pl-9 pr-8 py-2.5 rounded-xl border text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#C8E600]/30 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                    >
                        <option value="">All Statuses</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={fetchRequests}
                    className="p-2.5 rounded-xl border transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border-main)' }}
                    title="Refresh"
                >
                    <RefreshCw size={15} style={{ color: 'var(--text-dim)' }} />
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 rounded-3xl border border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                    <DollarSign size={40} className="mx-auto mb-4" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-lg font-bold" style={{ color: 'var(--text-dim)' }}>No payment requests found</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Click "New Request" to submit your first payment request</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="mt-4 px-5 py-2.5 rounded-xl bg-[#C8E600] text-black font-bold text-sm"
                    >
                        Create First Request
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(req => {
                        const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.INITIATED;
                        const isExpanded = expandedId === req._id;

                        return (
                            <div
                                key={req._id}
                                className="rounded-2xl border transition-all shadow-sm overflow-hidden"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                            >
                                {/* Row Header */}
                                <div className="p-5 flex items-center gap-4">
                                    {/* Status Dot */}
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${statusCfg.color}`}>
                                        {statusCfg.icon}
                                    </div>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black" style={{ color: 'var(--text-main)' }}>{req.requestNumber}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                                                {statusCfg.label}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                                {req.category}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>{req.reason}</p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        <div className="text-lg font-black text-[#C8E600]">
                                            {req.currency} {req.amount.toLocaleString()}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            Due: {format(new Date(req.expectedPaymentDate), 'dd MMM yyyy')}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : req._id)}
                                            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                                            title="View details"
                                        >
                                            {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-dim)' }} />}
                                        </button>
                                        {req.status === 'INITIATED' && (
                                            <button
                                                onClick={() => handleDelete(req._id)}
                                                disabled={deletingId === req._id}
                                                className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-50"
                                                title="Delete request"
                                            >
                                                {deletingId === req._id ? (
                                                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Detail Panel */}
                                <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                            {/* Left */}
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Amount</p>
                                                    <p className="text-lg font-black text-[#C8E600]">{req.currency} {req.amount.toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Expected Payment Date</p>
                                                    <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                                        <Calendar size={13} /> {format(new Date(req.expectedPaymentDate), 'EEEE, dd MMMM yyyy')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Submitted</p>
                                                    <p className="text-sm" style={{ color: 'var(--text-main)' }}>{format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                                                </div>
                                                {req.additionalNotes && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>Additional Notes</p>
                                                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>{req.additionalNotes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right */}
                                            <div className="space-y-3">
                                                {req.supportingDocument && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Supporting Document</p>
                                                        <a
                                                            href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${req.supportingDocument.url}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-[#C8E600]/50 transition-colors"
                                                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                                                        >
                                                            <FileText size={16} className="text-[#C8E600] flex-shrink-0" />
                                                            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                                                                {req.supportingDocument.name}
                                                            </span>
                                                            <Eye size={14} className="ml-auto flex-shrink-0" style={{ color: 'var(--text-dim)' }} />
                                                        </a>
                                                    </div>
                                                )}

                                                {/* Review Info */}
                                                {req.reviewNotes && (
                                                    <div className={`p-3 rounded-xl ${req.status === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'} border`}>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: req.status === 'APPROVED' ? '#10B981' : '#EF4444' }}>
                                                            {req.status === 'APPROVED' ? '✓ Approved' : '✗ Review Note'}
                                                        </p>
                                                        <p className="text-sm" style={{ color: 'var(--text-main)' }}>{req.reviewNotes}</p>
                                                    </div>
                                                )}

                                                {/* Status History */}
                                                {req.statusHistory && req.statusHistory.length > 0 && (
                                                    <div>
                                                        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>Status History</p>
                                                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                                                            {[...req.statusHistory].reverse().map((h, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[h.status]?.color.split(' ')[0] || 'bg-gray-400'}`} />
                                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{STATUS_CONFIG[h.status]?.label || h.status}</span>
                                                                    <span style={{ color: 'var(--text-dim)' }}>·</span>
                                                                    <span style={{ color: 'var(--text-dim)' }}>{format(new Date(h.timestamp), 'dd MMM, HH:mm')}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PaymentRequestPage;
