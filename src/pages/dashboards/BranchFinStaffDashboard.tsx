import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Wallet, Receipt, Calculator, AlertCircle, ArrowUpRight } from 'lucide-react';
import { getLedgerEntries } from '../../services/ledgerService';
import { getUser } from '../../utils/auth';

const BranchFinStaffDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        cashOnHand: 0,
        pendingInvoices: 0,
        todaysRevenue: 0,
        discrepancy: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const user = getUser();
                const branchId = user?.branchId;

                if (!branchId) {
                    setLoading(false);
                    return;
                }

                const ledgerRes = await getLedgerEntries({ branchId, limit: 500 });
                const ledgerData = Array.isArray(ledgerRes) ? ledgerRes : (ledgerRes as any).data || [];

                let cash = 0;
                let pending = 0;
                let todayRev = 0;
                const today = new Date().toISOString().split('T')[0];

                ledgerData.forEach((tx: any) => {
                    const amt = tx.amount || 0;
                    const date = (tx.entryDate || tx.createdAt || '').split('T')[0];
                    const cat = tx.accountingCode?.category?.toUpperCase();

                    if (tx.status === 'CLEARED' && cat === 'INCOME') {
                        cash += amt;
                        if (date === today) todayRev += amt;
                    }
                    
                    if (tx.status === 'PENDING') pending++;
                });

                setStats({
                    cashOnHand: cash,
                    pendingInvoices: pending,
                    todaysRevenue: todayRev,
                    discrepancy: 0
                });

                setTransactions(ledgerData.slice(0, 10).map(tx => ({
                    id: tx._id.slice(-6).toUpperCase(),
                    type: tx.description || 'Entry',
                    amount: `₹${(tx.amount || 0).toLocaleString()}`,
                    status: tx.status
                })));

            } catch (error) {
                console.error("Branch Finance Dashboard Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#148F85] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchFin.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.cashOnHand')}
                    title="Available Balance"
                    value={`₹${stats.cashOnHand.toLocaleString()}`}
                    icon={<Wallet size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.pendingInvoices')}
                    title={t('dashboards.branchFin.stats.awaitingPayment')}
                    value={stats.pendingInvoices.toString()}
                    icon={<Receipt size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.todaysRevenue')}
                    title="Collection Today"
                    value={`₹${stats.todaysRevenue.toLocaleString()}`}
                    icon={<Calculator size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle="Reconciliation"
                    title="Alerts"
                    value={stats.discrepancy.toString()}
                    icon={<AlertCircle size={14} />}
                    color="#10B981"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions */}
                <div
                    className="lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.transactions.title')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs uppercase transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <th className="px-6 py-4">{t('dashboards.branchFin.transactions.id')}</th>
                                    <th className="px-6 py-4">{t('dashboards.branchFin.transactions.type')}</th>
                                    <th className="px-6 py-4">{t('dashboards.branchFin.transactions.amount')}</th>
                                    <th className="px-6 py-4">{t('dashboards.branchFin.transactions.status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {transactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold" style={{ color: 'var(--brand-lime)' }}>#{tx.id}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-main)' }}>{tx.type}</td>
                                        <td className="px-6 py-4 font-bold" style={{ color: 'var(--text-main)' }}>{tx.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.status === 'CLEARED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-dim text-xs font-bold uppercase">No transactions found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-dashed transition-all hover:border-lime group cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-10 h-10 rounded-full bg-lime/10 flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                                <Receipt size={20} />
                            </div>
                            <div>
                                <h5 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.actions.generateInvoice')}</h5>
                            </div>
                        </div>
                        <ArrowUpRight size={18} style={{ color: 'var(--text-dim)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BranchFinStaffDashboard;
