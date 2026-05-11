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
    XCircle
} from 'lucide-react';
import { getVouchers, type Voucher, type VoucherType } from '../../../services/ledgerService';
import CreateVoucher from './CreateVoucher';

const VoucherDashboard = () => {
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
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-[#C8E600]/10 rounded-xl">
                            <Receipt size={24} className="text-[#C8E600]" />
                        </div>
                        Voucher Management
                    </h1>
                    <p className="text-sm text-white/40 mt-1">Structured financial transaction records and audit trail</p>
                </div>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#C8E600] text-black px-5 py-2.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(200,230,0,0.3)] transition-all active:scale-95"
                >
                    <Plus size={20} />
                    Create Voucher
                </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by voucher #, narration or party..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <select 
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none appearance-none transition-all"
                    >
                        <option value="ALL">All Types</option>
                        <option value="PAYMENT">Payment</option>
                        <option value="RECEIPT">Receipt</option>
                        <option value="CONTRA">Contra</option>
                        <option value="JOURNAL">Journal</option>
                        <option value="SALES">Sales</option>
                        <option value="PURCHASE">Purchase</option>
                    </select>
                </div>
                <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-[#C8E600] outline-none transition-all"
                    />
                </div>
            </div>

            {/* Vouchers Table */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-6 py-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Voucher Info</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Date & Branch</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Party / Narration</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-white/5 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredVouchers.length > 0 ? (
                                filteredVouchers.map((voucher) => (
                                    <tr key={voucher._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/5 rounded-lg group-hover:bg-white/10 transition-colors">
                                                    {getTypeIcon(voucher.type)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white font-mono">{voucher.voucherNumber}</p>
                                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter mt-0.5">{voucher.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-xs text-white/60">
                                                    <Calendar size={12} className="text-white/20" />
                                                    {new Date(voucher.date).toLocaleDateString('en-GB')}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-white/60">
                                                    <Building2 size={12} className="text-white/20" />
                                                    {voucher.branch?.name || 'Main Branch'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 max-w-xs">
                                            <div className="space-y-1">
                                                <p className="text-xs text-white font-medium truncate">
                                                    {voucher.referenceInfo?.partyName || 'N/A'}
                                                </p>
                                                <p className="text-[11px] text-white/40 truncate italic">
                                                    "{voucher.narration}"
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-start gap-1">
                                                <p className="text-sm font-bold text-[#C8E600] font-mono">
                                                    ${voucher.totalAmount.toLocaleString()}
                                                </p>
                                                {getStatusBadge(voucher.status)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <button className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all" title="Download PDF">
                                                    <Download size={16} />
                                                </button>
                                                <button className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-all">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-white/20">
                                            <Receipt size={48} strokeWidth={1} />
                                            <p className="text-sm font-medium">No vouchers found</p>
                                            <button 
                                                onClick={() => setShowCreateModal(true)}
                                                className="text-[#C8E600] text-xs font-bold hover:underline"
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
                    <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl">
                        <CreateVoucher 
                            onClose={() => setShowCreateModal(false)} 
                            onSuccess={() => {
                                setShowCreateModal(false);
                                fetchVouchers();
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default VoucherDashboard;
