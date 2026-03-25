import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getAllPayments,
    type PaymentTransaction
} from '../../../services/paymentService';
import {
    Receipt,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle
} from 'lucide-react';

const PurchaseBillList = () => {
    const { t } = useTranslation();
    const [payments, setPayments] = useState<PaymentTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllPayments({ transactionCategory: 'EXPENSE' });
            setPayments(data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.purchaseBills.fetchFailed', { defaultValue: 'Failed to fetch payments' }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const filteredPayments = payments.filter(p => {
        const matchesSearch =
            p.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const statusConfig = {
        PENDING: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} /> },
        COMPLETED: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', icon: <CheckCircle2 size={14} /> },
        FAILED: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> },
        CANCELLED: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', icon: <XCircle size={14} /> }
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Receipt size={28} className="text-[#C8E600]" />
                        {t('management.purchaseBills.title')}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>{t('management.purchaseBills.subtitle')}</p>
                </div>
                <button
                    onClick={fetchPayments}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/5 border border-[var(--border-main)]"
                    style={{ color: 'var(--text-dim)' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    {t('management.common.refresh')}
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" style={{ color: 'var(--text-main)' }} />
                    <input
                        type="text"
                        placeholder={t('management.purchaseBills.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] outline-none text-sm focus:ring-2 focus:ring-[#C8E600]/50 transition-all font-medium"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
                <div className="relative">
                    <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" style={{ color: 'var(--text-main)' }} />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] outline-none text-sm appearance-none focus:ring-2 focus:ring-[#C8E600]/50 transition-all font-bold"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="ALL">{t('management.common.allStatuses')}</option>
                        <option value="PENDING">{t('management.purchaseBills.statusLabels.PENDING')}</option>
                        <option value="COMPLETED">{t('management.purchaseBills.statusLabels.COMPLETED')}</option>
                        <option value="FAILED">{t('management.purchaseBills.statusLabels.FAILED')}</option>
                        <option value="CANCELLED">{t('management.purchaseBills.statusLabels.CANCELLED')}</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden shadow-sm">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium opacity-50">{t('management.purchaseBills.loading')}</p>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center space-y-4">
                        <AlertCircle size={48} className="mx-auto text-red-500 opacity-30" />
                        <p className="text-red-500 font-medium">{error}</p>
                        <button onClick={fetchPayments} className="px-6 py-2 bg-[#C8E600] text-black rounded-xl font-bold">{t('management.common.tryAgain', { defaultValue: 'Try Again' })}</button>
                    </div>
                ) : filteredPayments.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                        <Receipt size={64} className="mx-auto opacity-10" style={{ color: 'var(--text-main)' }} />
                        <p className="text-xl font-bold opacity-30">{t('management.purchaseBills.empty.noBills')}</p>
                        <p className="text-sm opacity-20">{t('management.purchaseBills.empty.refine')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-[var(--border-main)]">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">{t('management.purchaseBills.table.dateMethod')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">{t('management.purchaseBills.table.description')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50 text-right">{t('management.purchaseBills.table.amount')}</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-50">{t('management.common.table.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-main)]">
                                {filteredPayments.map(p => {
                                    const sc = statusConfig[p.status] || statusConfig.PENDING;
                                    return (
                                        <tr key={p._id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                                <p className="text-[10px] uppercase font-black opacity-40 mt-1">{p.paymentMethod.replace('_', ' ')}</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm font-medium line-clamp-1" style={{ color: 'var(--text-main)' }}>{p.notes || t('management.common.noDescription', { defaultValue: 'No description' })}</p>
                                                <p className="text-[10px] opacity-40 mt-1">ID: ...{p._id.slice(-8)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-base font-black text-[#C8E600]">${p.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                <p className="text-[10px] opacity-40 mt-1">{t('management.tax.title', { defaultValue: 'Tax' })}: ${p.taxAmount.toFixed(2)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border"
                                                    style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}33` }}>
                                                    {sc.icon} {t(`management.purchaseBills.statusLabels.${p.status}`)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseBillList;
