import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Receipt, 
    Plus, 
    Search, 
    Filter, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowLeftRight, 
    FileText,
    Calendar,
    Building2,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw,
    Ban,
    Sparkles,
    AlertTriangle,
    Wallet
} from 'lucide-react';
import { 
    getVouchers, 
    getVoucherById, 
    cancelVoucher, 
    getVoucherStats, 
    type Voucher, 
    type VoucherType, 
    type VoucherStatsResponse 
} from '../../../services/ledgerService';
import CreateVoucher from './CreateVoucher';
import ViewVoucher from './ViewVoucher';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { useTheme } from '../../../context/ThemeContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const VoucherDashboard = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Default dates for 1-month range
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [stats, setStats] = useState<VoucherStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<VoucherType | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState(formatDate(oneMonthAgo));
    const [endDate, setEndDate] = useState(formatDate(today));
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
    const [voucherToCancel, setVoucherToCancel] = useState<Voucher | null>(null);
    const [cancelling, setCancelling] = useState(false);

    // Pagination states
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalVouchers, setTotalVouchers] = useState(0);
    const limit = 10;

    const fetchStats = useCallback(async () => {
        try {
            const data = await getVoucherStats({ startDate, endDate });
            setStats(data);
        } catch (err) {
            console.error('Failed to load voucher stats:', err);
        }
    }, [startDate, endDate]);

    const fetchVouchers = useCallback(async () => {
        setLoading(true);
        try {
            const filters: any = {
                page,
                limit,
            };
            if (typeFilter !== 'ALL') filters.type = typeFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (search) filters.search = search;

            const data = await getVouchers(filters);
            setVouchers(data.vouchers);
            setTotalPages(data.pagination?.pages || 1);
            setTotalVouchers(data.pagination?.total || data.vouchers.length);
        } catch (err: any) {
            console.error(err.message || 'Failed to fetch vouchers');
            toast.error('Failed to fetch vouchers');
        } finally {
            setLoading(false);
        }
    }, [page, limit, typeFilter, startDate, endDate, search]);

    // Debounce filters and reset page to 1
    useEffect(() => {
        const handler = setTimeout(() => {
            if (page !== 1) {
                setPage(1);
            } else {
                fetchVouchers();
            }
            fetchStats();
        }, 300);

        return () => clearTimeout(handler);
    }, [search, typeFilter, startDate, endDate, fetchStats]);

    // Fetch on page change
    useEffect(() => {
        fetchVouchers();
    }, [page, fetchVouchers]);

    const handleCancelVoucher = async () => {
        if (!voucherToCancel) return;
        setCancelling(true);
        try {
            await cancelVoucher(voucherToCancel._id);
            toast.success(`Voucher ${voucherToCancel.voucherNumber} has been cancelled and reversed`);
            setVoucherToCancel(null);
            fetchVouchers();
            fetchStats();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to cancel voucher');
        } finally {
            setCancelling(false);
        }
    };

    const handleDownloadPDF = async (voucherId: string) => {
        try {
            toast.loading('Generating PDF...', { id: 'pdf-gen' });
            const voucher = await getVoucherById(voucherId);
            
            const doc = new jsPDF();
            
            // Draw Voucher Header
            doc.setFontSize(20);
            doc.setTextColor(10, 10, 10);
            doc.text(`${voucher.type} VOUCHER`, 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Voucher Number: ${voucher.voucherNumber}`, 14, 28);
            doc.text(`Status: ${voucher.status}`, 14, 34);
            doc.text(`Date: ${new Date(voucher.date).toLocaleDateString('en-GB')}`, 14, 40);
            doc.text(`Branch: ${voucher.branch?.name || 'Main Branch'}`, 14, 46);
            
            // Reference Info
            let startY = 54;
            if (voucher.referenceInfo && (voucher.referenceInfo.referenceNumber || voucher.referenceInfo.partyName)) {
                doc.setFontSize(11);
                doc.setTextColor(10, 10, 10);
                doc.text("Reference & Party Info", 14, startY);
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text(`Ref Number: ${voucher.referenceInfo.referenceNumber || 'N/A'}`, 14, startY + 6);
                doc.text(`Party Name: ${voucher.referenceInfo.partyName || 'N/A'}`, 14, startY + 12);
                doc.text(`Party Type: ${voucher.referenceInfo.partyType || 'N/A'}`, 14, startY + 18);
                startY += 26;
            }

            // Set-off Info
            if (voucher.setOffSummary && voucher.setOffSummary.totalSetOff > 0) {
                doc.setFontSize(11);
                doc.setTextColor(10, 10, 10);
                doc.text("Auto Set-off Details", 14, startY);
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text(`Applied to Documents: $${voucher.setOffSummary.totalSetOff.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, startY + 6);
                if (voucher.setOffSummary.excessAmount > 0) {
                    doc.text(`Advance Booked: $${voucher.setOffSummary.excessAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, startY + 12);
                    startY += 18;
                } else {
                    startY += 12;
                }
            }
            
            // Narration
            doc.setFontSize(11);
            doc.setTextColor(10, 10, 10);
            doc.text("Narration", 14, startY);
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`"${voucher.narration}"`, 14, startY + 6);
            startY += 16;
            
            // Table of Lines
            const head = [['Account', 'Description', 'DR/CR', 'Amount']];
            const body = voucher.lines.map(line => [
                `${(line.accountingCode as any)?.code || 'N/A'} - ${(line.accountingCode as any)?.name || 'N/A'}`,
                line.description || '—',
                line.type,
                `$${line.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ]);
            
            autoTable(doc, {
                head,
                body,
                startY: startY,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] },
            });
            
            // Footer summary
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(12);
            doc.setTextColor(10, 10, 10);
            doc.text(`Total Amount: $${voucher.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
            
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`Generated on ${new Date().toLocaleString()}`, 14, finalY + 10);
            
            doc.save(`${voucher.voucherNumber}.pdf`);
            toast.success('PDF generated successfully!', { id: 'pdf-gen' });
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to generate PDF', { id: 'pdf-gen' });
        }
    };

    const getTypeIcon = (type: VoucherType) => {
        switch (type) {
            case 'PAYMENT': return <ArrowUpRight className="text-rose-500" size={16} />;
            case 'RECEIPT': return <ArrowDownLeft className="text-emerald-500" size={16} />;
            case 'CONTRA': return <ArrowLeftRight className="text-blue-500" size={16} />;
            case 'JOURNAL': return <FileText className="text-amber-500" size={16} />;
            case 'SALES': return <Receipt className="text-[#C8E600]" size={16} />;
            case 'PURCHASE': return <Receipt className="text-indigo-500" size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'POSTED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        <CheckCircle2 size={11} /> POSTED
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                        <Clock size={11} /> DRAFT
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                        <XCircle size={11} /> CANCELLED
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="container-responsive space-y-6 animate-in fade-in duration-700">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Voucher Management', active: true }]} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-main)' }}>
                        <Receipt size={22} className="text-[#C8E600]" />
                        Voucher Management & Auto Set-off
                    </h1>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Structured financial entries with automatic invoice & bill set-off
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => { fetchVouchers(); fetchStats(); }}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => navigate('create')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-[#C8E600] text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(200,230,0,0.25)] cursor-pointer"
                    >
                        <Plus size={15} strokeWidth={3} /> Create Voucher
                    </button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Receipts (Inflow)</span>
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><ArrowDownLeft size={16} /></div>
                    </div>
                    <p className="text-lg font-black font-mono mt-2 text-emerald-400">
                        ${(stats?.byType?.RECEIPT?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {stats?.byType?.RECEIPT?.count || 0} vouchers
                    </p>
                </div>

                <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Payments (Outflow)</span>
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400"><ArrowUpRight size={16} /></div>
                    </div>
                    <p className="text-lg font-black font-mono mt-2 text-rose-400">
                        ${(stats?.byType?.PAYMENT?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {stats?.byType?.PAYMENT?.count || 0} vouchers
                    </p>
                </div>

                <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contra Transfers</span>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400"><ArrowLeftRight size={16} /></div>
                    </div>
                    <p className="text-lg font-black font-mono mt-2 text-blue-400">
                        ${(stats?.byType?.CONTRA?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {stats?.byType?.CONTRA?.count || 0} vouchers
                    </p>
                </div>

                <div className="p-4 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Total Active Volume</span>
                        <div className="p-1.5 rounded-lg bg-[#C8E600]/10 text-[#C8E600]"><Wallet size={16} /></div>
                    </div>
                    <p className="text-lg font-black font-mono mt-2 text-[#C8E600]">
                        ${(stats?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        {stats?.totalVouchers || 0} total active vouchers
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={16} />
                    <input 
                        type="text" 
                        placeholder="Search voucher #, narration or party..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600]"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={16} />
                    <select 
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none appearance-none transition-all focus:border-[#C8E600] cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="ALL" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>All Voucher Types</option>
                        <option value="RECEIPT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Receipt (Inflow)</option>
                        <option value="PAYMENT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Payment (Outflow)</option>
                        <option value="CONTRA" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Contra (Bank/Cash)</option>
                        <option value="JOURNAL" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Journal</option>
                        <option value="SALES" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Sales</option>
                        <option value="PURCHASE" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Purchase</option>
                    </select>
                </div>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={16} />
                    <input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600]"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                        title="Start Date"
                    />
                </div>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={16} />
                    <input 
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full border rounded-xl pl-11 pr-4 py-2.5 text-xs outline-none transition-all focus:border-[#C8E600]"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                        title="End Date"
                    />
                </div>
            </div>

            {/* Vouchers Table */}
            <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.02)' }}>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Voucher</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date & Branch</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Party / Narration</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Set-off / Status</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Amount ($)</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b last:border-0" style={{ borderColor: 'var(--border-main)' }}>
                                        <td colSpan={6} className="px-5 py-6">
                                            <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--bg-input)' }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : vouchers.length > 0 ? (
                                vouchers.map((voucher) => (
                                    <tr key={voucher._id} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors group" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-input)' }}>
                                                    {getTypeIcon(voucher.type)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black font-mono" style={{ color: 'var(--text-main)' }}>{voucher.voucherNumber}</p>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5 inline-block" style={{ color: 'var(--text-dim)' }}>
                                                        {voucher.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-main)' }}>
                                                    <Calendar size={12} style={{ color: 'var(--text-dim)' }} />
                                                    {new Date(voucher.date).toLocaleDateString('en-GB')}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                                                    <Building2 size={11} />
                                                    {voucher.branch?.name || 'Main Branch'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                                                    {voucher.referenceInfo?.partyName || '—'}
                                                </p>
                                                <p className="text-[11px] truncate italic" style={{ color: 'var(--text-dim)' }}>
                                                    "{voucher.narration}"
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                {getStatusBadge(voucher.status)}
                                                {voucher.setOffSummary && voucher.setOffSummary.totalSetOff > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                                        <Sparkles size={10} /> Set-off: ${voucher.setOffSummary.totalSetOff.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-mono text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                            ${voucher.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => setSelectedVoucherId(voucher._id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" 
                                                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dim)' }} 
                                                    title="View Details & Ledger Entries"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadPDF(voucher._id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" 
                                                    style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dim)' }} 
                                                    title="Download PDF"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                {voucher.status === 'POSTED' && (
                                                    <button 
                                                        onClick={() => setVoucherToCancel(voucher)}
                                                        className="p-1.5 hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 rounded-lg transition-all cursor-pointer" 
                                                        title="Cancel / Void Voucher"
                                                    >
                                                        <Ban size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-dim)' }}>
                                            <Receipt size={40} strokeWidth={1} />
                                            <p className="text-xs font-medium">No vouchers found matching your filters</p>
                                            <button 
                                                onClick={() => navigate('create')}
                                                className="text-[#C8E600] text-xs font-bold hover:underline cursor-pointer"
                                            >
                                                Create a new voucher
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-5 py-3.5 border rounded-2xl mt-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        Showing Page <span className="font-bold text-[color:var(--text-main)]">{page}</span> of <span className="font-bold text-[color:var(--text-main)]">{totalPages}</span> ({totalVouchers} total vouchers)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            className="px-3 py-1.5 border rounded-xl text-xs font-bold transition-all hover:bg-white/5 disabled:opacity-30 cursor-pointer text-[color:var(--text-main)]"
                            style={{ borderColor: 'var(--border-main)' }}
                        >
                            Previous
                        </button>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            className="px-3 py-1.5 border rounded-xl text-xs font-bold transition-all hover:bg-white/5 disabled:opacity-30 cursor-pointer text-[color:var(--text-main)]"
                            style={{ borderColor: 'var(--border-main)' }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create Voucher Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}>
                        <CreateVoucher 
                            onClose={() => setShowCreateModal(false)} 
                            onSuccess={() => {
                                setShowCreateModal(false);
                                fetchVouchers();
                                fetchStats();
                            }} 
                        />
                    </div>
                </div>
            )}

            {/* View Voucher Modal */}
            {selectedVoucherId && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedVoucherId(null)} />
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}>
                        <ViewVoucher 
                            voucherId={selectedVoucherId} 
                            onClose={() => setSelectedVoucherId(null)} 
                        />
                    </div>
                </div>
            )}

            {/* Cancellation Confirmation Modal */}
            {voucherToCancel && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !cancelling && setVoucherToCancel(null)} />
                    <div className="relative w-full max-w-md p-6 rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3 text-rose-500">
                            <div className="p-2.5 rounded-xl bg-rose-500/10"><AlertTriangle size={24} /></div>
                            <div>
                                <h3 className="text-base font-bold text-[color:var(--text-main)]">Cancel Voucher</h3>
                                <p className="text-xs text-[color:var(--text-dim)]">{voucherToCancel.voucherNumber}</p>
                            </div>
                        </div>
                        <p className="text-xs text-[color:var(--text-muted)] leading-relaxed">
                            Are you sure you want to cancel this voucher? This will <strong>revert any invoice or bill set-offs</strong>, restore original balances/statuses, and delete associated ledger entries.
                        </p>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                disabled={cancelling}
                                onClick={() => setVoucherToCancel(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-white/5 transition-all cursor-pointer text-[color:var(--text-main)]"
                                style={{ borderColor: 'var(--border-main)' }}
                            >
                                Nevermind
                            </button>
                            <button
                                disabled={cancelling}
                                onClick={handleCancelVoucher}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all cursor-pointer"
                            >
                                {cancelling ? 'Reversing...' : 'Yes, Cancel & Revert'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherDashboard;
