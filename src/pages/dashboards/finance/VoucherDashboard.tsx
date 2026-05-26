import { useState, useEffect } from 'react';
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
    MoreVertical,
    Download,
    Eye,
    CheckCircle2,
    Clock,
    XCircle,
    RefreshCw
} from 'lucide-react';
import { getVouchers, type Voucher, type VoucherType } from '../../../services/ledgerService';
import CreateVoucher from './CreateVoucher';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { useTheme } from '../../../context/ThemeContext';

const VoucherDashboard = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<VoucherType | 'ALL'>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchVouchers = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (typeFilter !== 'ALL') filters.type = typeFilter;
            const data = await getVouchers(filters);
            setVouchers(data.vouchers);
        } catch (err: any) {
            console.error(err.message || 'Failed to fetch vouchers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, [typeFilter]);

    const getTypeIcon = (type: VoucherType) => {
        switch (type) {
            case 'PAYMENT': return <ArrowUpRight className="text-rose-500" size={18} />;
            case 'RECEIPT': return <ArrowDownLeft className="text-emerald-500" size={18} />;
            case 'CONTRA': return <ArrowLeftRight className="text-blue-500" size={18} />;
            case 'JOURNAL': return <FileText className="text-amber-500" size={18} />;
            case 'SALES': return <Receipt className="text-[#C8E600]" size={18} />;
            case 'PURCHASE': return <Receipt className="text-indigo-500" size={18} />;
            default: return <FileText size={18} />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'POSTED':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        <CheckCircle2 size={12} /> POSTED
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                        <Clock size={12} /> DRAFT
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold">
                        <XCircle size={12} /> CANCELLED
                    </span>
                );
            default:
                return null;
        }
    };

    const filteredVouchers = vouchers.filter(v => 
        v.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
        v.narration.toLowerCase().includes(search.toLowerCase()) ||
        (v.referenceInfo?.partyName?.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="container-responsive space-y-6 animate-in fade-in duration-700">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Voucher Dashboard', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Receipt size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Voucher Management
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Structured financial transaction records and audit trail</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={fetchVouchers}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Plus size={14} strokeWidth={3} /> Create Voucher
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by voucher #, narration or party..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full border rounded-2xl pl-12 pr-4 py-3 text-sm outline-none transition-all focus:border-[#C8E600]"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={18} />
                    <select 
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="w-full border rounded-2xl pl-12 pr-4 py-3 text-sm outline-none appearance-none transition-all focus:border-[#C8E600] cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="ALL" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>All Types</option>
                        <option value="PAYMENT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Payment</option>
                        <option value="RECEIPT" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Receipt</option>
                        <option value="CONTRA" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Contra</option>
                        <option value="JOURNAL" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Journal</option>
                        <option value="SALES" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Sales</option>
                        <option value="PURCHASE" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Purchase</option>
                    </select>
                </div>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} size={18} />
                    <input 
                        type="date"
                        className="w-full border rounded-2xl pl-12 pr-4 py-3 text-sm outline-none transition-all focus:border-[#C8E600]"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)', colorScheme: isDark ? 'dark' : 'light' }}
                    />
                </div>
            </div>

            {/* Vouchers Table */}
            <div className="border rounded-3xl overflow-hidden backdrop-blur-sm shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.02)' }}>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Voucher Info</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date & Branch</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Party / Narration</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse border-b last:border-0" style={{ borderColor: 'var(--border-main)' }}>
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 rounded w-full" style={{ backgroundColor: 'var(--bg-input)' }}></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredVouchers.length > 0 ? (
                                filteredVouchers.map((voucher) => (
                                    <tr key={voucher._id} className="border-b last:border-0 hover:bg-white/[0.02] transition-colors group" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg transition-colors" style={{ backgroundColor: 'var(--bg-input)' }}>
                                                    {getTypeIcon(voucher.type)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-main)' }}>{voucher.voucherNumber}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-tighter mt-0.5" style={{ color: 'var(--text-dim)' }}>{voucher.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    <Calendar size={12} style={{ color: 'var(--text-dim)' }} />
                                                    {new Date(voucher.date).toLocaleDateString('en-GB')}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    <Building2 size={12} style={{ color: 'var(--text-dim)' }} />
                                                    {voucher.branch?.name || 'Main Branch'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 max-w-xs">
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium truncate" style={{ color: 'var(--text-main)' }}>
                                                    {voucher.referenceInfo?.partyName || 'N/A'}
                                                </p>
                                                <p className="text-[11px] truncate italic" style={{ color: 'var(--text-dim)' }}>
                                                    "{voucher.narration}"
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-start gap-1">
                                                <p className="text-sm font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                                                    ${voucher.totalAmount.toLocaleString()}
                                                </p>
                                                {getStatusBadge(voucher.status)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-all" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dim)' }} title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-all" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dim)' }} title="Download PDF">
                                                    <Download size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-all" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-dim)' }}>
                                            <Receipt size={48} strokeWidth={1} />
                                            <p className="text-sm font-medium">No vouchers found</p>
                                            <button 
                                                onClick={() => setShowCreateModal(true)}
                                                className="text-brand-lime text-xs font-bold hover:underline"
                                            >
                                                Create your first voucher
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Voucher Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
                    <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar border rounded-3xl shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: isDark ? 'var(--border-main)' : '#9CA3AF' }}>
                        <CreateVoucher 
                            onClose={() => setShowCreateModal(false)} 
                            onSuccess={() => {
                                setShowCreateModal(false);
                                fetchVouchers();
                            }} 
                            type="PAYMENT"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherDashboard;
