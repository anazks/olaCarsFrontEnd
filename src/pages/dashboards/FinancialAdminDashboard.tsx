import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from 'lucide-react';
import { getLedgerEntries } from '../../services/ledgerService';
import { getAllBranches } from '../../services/branchService';

const FinancialAdminDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingCollections: 0,
        fleetExpenses: 0,
        overdueCount: 0
    });
    const [branchPerformance, setBranchPerformance] = useState<any[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [ledgerRes, branchesRes] = await Promise.allSettled([
                    getLedgerEntries({ limit: 1000 }),
                    getAllBranches({ limit: 100 })
                ]);

                let ledgerData: any[] = [];
                if (ledgerRes.status === 'fulfilled') {
                    const val = ledgerRes.value;
                    ledgerData = Array.isArray(val) ? val : (val as any).data || [];
                }

                let branches: any[] = [];
                if (branchesRes.status === 'fulfilled' && branchesRes.value?.data) {
                    branches = branchesRes.value.data;
                }

                // 1. Compute Stats
                let totalRev = 0;
                let totalExp = 0;
                let pending = 0;
                let overdue = 0;

                const branchRevMap: Record<string, number> = {};

                ledgerData.forEach((entry: any) => {
                    const cat = entry.accountingCode?.category?.toUpperCase();
                    const amt = entry.amount !== undefined ? entry.amount : (entry.debit || entry.credit || 0);
                    const isDebit = entry.amount !== undefined ? entry.type === 'DEBIT' : ((entry.debit || 0) > 0);
                    const bId = entry.branchId?._id || entry.branchId;

                    if (cat === 'INCOME') {
                        const val = isDebit ? -amt : amt;
                        totalRev += val;
                        if (bId) branchRevMap[bId] = (branchRevMap[bId] || 0) + val;
                    } else if (cat === 'EXPENSE' || cat === 'ASSET') {
                        totalExp += (isDebit ? amt : -amt);
                    }

                    if (entry.status === 'PENDING') pending += amt;
                });

                setStats({
                    totalRevenue: totalRev,
                    pendingCollections: pending,
                    fleetExpenses: totalExp,
                    overdueCount: overdue 
                });

                // 2. Branch Performance
                const bPerf = branches.map(b => {
                    const rev = branchRevMap[b._id] || 0;
                    const target = 50000; 
                    return {
                        name: b.name,
                        rev,
                        target,
                        percent: target > 0 ? (rev / target) * 100 : 0
                    };
                }).sort((a, b) => b.rev - a.rev).slice(0, 5);

                setBranchPerformance(bPerf);

                // 3. Recent Transactions
                setRecentTransactions(ledgerData.slice(0, 10).map(tx => ({
                    id: tx._id.slice(-8).toUpperCase(),
                    desc: tx.description || 'Transaction',
                    amount: `${tx.type === 'DEBIT' ? '-' : '+'} $${(tx.amount || 0).toLocaleString()}`,
                    status: tx.status,
                    type: tx.type === 'DEBIT' ? 'Debit' : 'Credit'
                })));

            } catch (error) {
                console.error("Financial Dashboard Data Fetch Error:", error);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.financial.title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.financial.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.financial.stats.totalRevenue')}
                    title="Total Gross Income"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={<ArrowUpRight size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.financial.stats.pendingCollections')}
                    title={t('dashboards.financial.stats.awaitingDeposit')}
                    value={`$${stats.pendingCollections.toLocaleString()}`}
                    icon={<DollarSign size={14} />}
                    color="#F59E0B"
                />
                <StatCard
                    superTitle={t('dashboards.financial.stats.fleetExpenses')}
                    title={t('dashboards.financial.stats.maintenanceLargely')}
                    value={`$${stats.fleetExpenses.toLocaleString()}`}
                    icon={<ArrowDownRight size={14} />}
                    color="#EF4444"
                />
                <AlertCard
                    title="System Alerts"
                    count={stats.overdueCount}
                    desc="Requires Reconciliation"
                    color="#F97316"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Branch Performance */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Top Branch Revenue</h4>
                    </div>
                    <div className="p-5 space-y-4">
                        {branchPerformance.map((branch, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>{branch.name}</span>
                                    <span className="font-bold" style={{ color: 'var(--text-dim)' }}>
                                        ${branch.rev.toLocaleString()} 
                                    </span>
                                </div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(branch.percent, 100)}%`,
                                            background: branch.percent >= 100 ? '#148F85' : branch.percent > 85 ? '#F59E0B' : '#C8E600'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        {branchPerformance.length === 0 && <div className="text-center py-4 text-dim text-xs">No data available</div>}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div
                    className="rounded-2xl border shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.financial.transactions.title')}</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 max-h-[400px]">
                        {recentTransactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b last:border-0 cursor-pointer" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'Debit' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                        <Wallet size={16} />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{tx.desc}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {tx.id} · {tx.status}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${tx.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                        {recentTransactions.length === 0 && <div className="text-center py-8 text-dim text-xs">No recent transactions</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialAdminDashboard;
