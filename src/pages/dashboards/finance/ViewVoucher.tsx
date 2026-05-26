import { useState, useEffect } from 'react';
import { 
    X, 
    Calendar, 
    Building2, 
    Hash, 
    Tag, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ArrowLeftRight, 
    FileText, 
    Receipt, 
    Printer, 
    AlertCircle, 
    Loader2 
} from 'lucide-react';
import { getVoucherById, type Voucher } from '../../../services/ledgerService';
import { useTheme } from '../../../context/ThemeContext';

interface ViewVoucherProps {
    voucherId: string;
    onClose: () => void;
}

const ViewVoucher = ({ voucherId, onClose }: ViewVoucherProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getVoucherById(voucherId);
                setVoucher(data);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch voucher details');
            } finally {
                setLoading(false);
            }
        };

        if (voucherId) {
            fetchDetails();
        }
    }, [voucherId]);

    if (loading) {
        return (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-brand-lime animate-spin" />
                <p className="text-xs text-[color:var(--text-dim)]">Loading voucher details...</p>
            </div>
        );
    }

    if (error || !voucher) {
        return (
            <div className="p-10 text-center space-y-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm flex items-center justify-center gap-3 max-w-md mx-auto">
                    <AlertCircle size={18} /> {error || 'Voucher not found'}
                </div>
                <button 
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-[color:var(--text-main)]"
                >
                    Close
                </button>
            </div>
        );
    }

    const typeConfig = {
        PAYMENT: { icon: ArrowUpRight, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        RECEIPT: { icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        JOURNAL: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        CONTRA: { icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        SALES: { icon: Receipt, color: 'text-[#C8E600]', bg: 'bg-[#C8E600]/10' },
        PURCHASE: { icon: Receipt, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
    };

    const ActiveIcon = typeConfig[voucher.type]?.icon || FileText;
    const typeColor = typeConfig[voucher.type]?.color || 'text-gray-500';
    const typeBg = typeConfig[voucher.type]?.bg || 'bg-gray-500/10';

    const borderStyle = { borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' };
    const textDimColor = isDark ? 'var(--text-dim)' : '#4B5563';


    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="overflow-hidden bg-transparent print:bg-white print:text-black" style={{ backgroundColor: 'var(--bg-card)' }}>
            {/* Header */}
            <div className="px-8 py-6 border-b flex justify-between items-center bg-white/[0.01] print:border-b-2 print:border-black" style={borderStyle}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 ${typeBg} rounded-2xl print:bg-black/5`}>
                        <ActiveIcon size={28} className={typeColor} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold tracking-tight text-[color:var(--text-main)] print:text-black">
                                {voucher.voucherNumber}
                            </h2>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                voucher.status === 'POSTED' ? 'bg-emerald-500/10 text-emerald-500' :
                                voucher.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                            } print:border print:border-black print:text-black print:bg-transparent`}>
                                {voucher.status}
                            </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: textDimColor }}>
                            {voucher.type.charAt(0) + voucher.type.slice(1).toLowerCase()} Voucher Details
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-[color:var(--text-main)]"
                        style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}
                    >
                        <Printer size={14} /> Print
                    </button>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[color:var(--text-dim)]"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="p-8 space-y-6">
                {/* General Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Calendar size={12} /> Date
                        </span>
                        <p className="text-sm font-semibold text-[color:var(--text-main)] print:text-black">
                            {new Date(voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Building2 size={12} /> Branch
                        </span>
                        <p className="text-sm font-semibold text-[color:var(--text-main)] print:text-black">
                            {voucher.branch?.name || 'Main Branch'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: textDimColor }}>
                            <Tag size={12} /> Narration
                        </span>
                        <p className="text-sm font-semibold text-[color:var(--text-main)] print:text-black italic">
                            "{voucher.narration}"
                        </p>
                    </div>
                </div>

                {/* Reference Info Section */}
                {voucher.referenceInfo && (voucher.referenceInfo.referenceNumber || voucher.referenceInfo.partyName) && (
                    <div className="p-6 border rounded-2xl space-y-4 print:border-black print:bg-transparent" style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#F3F4F6', borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: textDimColor }}>
                            <Hash size={12} /> Reference & Party Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                            {voucher.referenceInfo.referenceNumber && (
                                <div>
                                    <p style={{ color: textDimColor }}>Ref Number</p>
                                    <p className="font-bold mt-0.5 text-[color:var(--text-main)] print:text-black">{voucher.referenceInfo.referenceNumber}</p>
                                </div>
                            )}
                            {voucher.referenceInfo.partyName && (
                                <div>
                                    <p style={{ color: textDimColor }}>Party Name</p>
                                    <p className="font-bold mt-0.5 text-[color:var(--text-main)] print:text-black">{voucher.referenceInfo.partyName}</p>
                                </div>
                            )}
                            {voucher.referenceInfo.partyType && (
                                <div>
                                    <p style={{ color: textDimColor }}>Party Type</p>
                                    <p className="font-bold mt-0.5 text-[color:var(--text-main)] print:text-black">{voucher.referenceInfo.partyType}</p>
                                </div>
                            )}
                            {voucher.referenceInfo.partyId && (
                                <div>
                                    <p style={{ color: textDimColor }}>External ID</p>
                                    <p className="font-mono mt-0.5 text-[color:var(--text-main)] print:text-black">{voucher.referenceInfo.partyId}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Transaction Lines Table */}
                <div className="rounded-2xl border overflow-hidden print:border-black" style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <table className="w-full text-left border-collapse">
                        <thead style={{ backgroundColor: isDark ? 'var(--bg-input)' : '#F3F4F6' }}>
                            <tr className="border-b print:border-b-2 print:border-black" style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Account</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: textDimColor }}>Description</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-center" style={{ color: textDimColor }}>DR/CR</th>
                                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-right" style={{ color: textDimColor }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y print:divide-y-2 print:divide-black" style={{ borderColor: isDark ? 'var(--border-main)' : '#E5E7EB' }}>
                            {voucher.lines.map((line, index) => (
                                <tr key={index} className="hover:bg-white/[0.01]">
                                    <td className="px-5 py-4 w-1/3">
                                        <p className="text-xs font-bold text-[color:var(--text-main)] print:text-black">
                                            {(line.accountingCode as any)?.code || 'N/A'}
                                        </p>
                                        <p className="text-[10px] mt-0.5" style={{ color: textDimColor }}>
                                            {(line.accountingCode as any)?.name || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-[color:var(--text-main)] print:text-black">
                                        <div>{line.description || '—'}</div>
                                        {line.taxInfo && line.taxInfo.taxAmount !== undefined && line.taxInfo.taxAmount > 0 && (
                                            <div className="text-[10px] text-amber-500 mt-1 flex flex-wrap items-center gap-1">
                                                <span>Tax Applied:</span>
                                                <span className="font-bold">
                                                    {(line.taxInfo.taxApplied as any)?.name || 'Tax'} ({(line.taxInfo.taxApplied as any)?.rate || 0}%)
                                                </span>
                                                <span>—</span>
                                                <span>Amount: ${line.taxInfo.taxAmount.toFixed(2)}</span>
                                                <span>({line.taxInfo.isTaxInclusive ? 'Inclusive' : 'Exclusive'})</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                            line.type === 'DEBIT' 
                                                ? 'bg-emerald-500/10 text-emerald-500 print:text-black print:bg-transparent' 
                                                : 'bg-rose-500/10 text-rose-500 print:text-black print:bg-transparent'
                                        }`}>
                                            {line.type}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right font-mono text-xs font-bold text-[color:var(--text-main)] print:text-black">
                                        ${line.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-6 border-t print:border-t-2 print:border-black" style={{ borderColor: isDark ? 'var(--border-main)' : '#D1D5DB' }}>
                    <div className="text-xs space-y-1" style={{ color: textDimColor }}>
                        <p>
                            Created by: <span className="font-semibold text-[color:var(--text-main)] print:text-black">{voucher.createdBy?.personalInfo?.fullName || voucher.createdBy?.username || `User (${voucher.creatorRole})`}</span> on {new Date(voucher.createdAt).toLocaleString()}
                        </p>
                        {voucher.postedAt && (
                            <p>
                                Posted by: <span className="font-semibold text-[color:var(--text-main)] print:text-black">{voucher.postedBy?.personalInfo?.fullName || voucher.postedBy?.username || `User (${voucher.postedByRole || 'System'})`}</span> on {new Date(voucher.postedAt).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-8 self-end sm:self-auto">
                        <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: textDimColor }}>Total Amount</p>
                            <p className="text-lg font-mono font-bold text-emerald-500 print:text-black">
                                ${voucher.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewVoucher;
