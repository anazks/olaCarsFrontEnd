import { useTranslation } from 'react-i18next';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { Download, ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from 'lucide-react';

const FinancialAdminDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="container-responsive space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.financial.title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.financial.subtitle')}</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all cursor-pointer hover:bg-lime/10"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}
                    >
                        <Download size={16} /> {t('common.exportCsv')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.financial.stats.totalRevenue')}
                    title={t('dashboards.financial.stats.grossPayouts')}
                    value="$142,500"
                    icon={<ArrowUpRight size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.financial.stats.pendingCollections')}
                    title={t('dashboards.financial.stats.awaitingDeposit')}
                    value="$18,200"
                    icon={<DollarSign size={14} />}
                    color="#F59E0B"
                />
                <StatCard
                    superTitle={t('dashboards.financial.stats.fleetExpenses')}
                    title={t('dashboards.financial.stats.maintenanceLargely')}
                    value="$4,120"
                    icon={<ArrowDownRight size={14} />}
                    color="#EF4444"
                />
                <AlertCard
                    title={t('dashboards.financial.stats.overdueInvoices')}
                    count={14}
                    desc={t('dashboards.financial.stats.corporateClients')}
                    color="#F97316"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Branch Revenue */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.financial.branchRevenue.title')}</h4>
                    </div>
                    <div className="p-5 space-y-4">
                        {[
                            { name: 'Mumbai Central', rev: 45000, target: 50000, percent: 90 },
                            { name: 'Bangalore East', rev: 38000, target: 35000, percent: 108 },
                            { name: 'Delhi NCR Hub', rev: 32000, target: 40000, percent: 80 },
                            { name: 'Pune South', rev: 27500, target: 20000, percent: 137 },
                        ].map((branch, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>{branch.name}</span>
                                    <span className="font-bold" style={{ color: 'var(--text-dim)' }}>
                                        ${branch.rev.toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--text-dim)' }}>/ ${branch.target.toLocaleString()}</span>
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
                    </div>
                </div>

                {/* Recent Transactions */}
                <div
                    className="rounded-2xl border shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.financial.transactions.title')}</h4>
                        <button className="text-sm hover:underline border-none bg-transparent cursor-pointer" style={{ color: 'var(--brand-lime)' }}>{t('dashboards.financial.transactions.viewLedger')}</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {[
                            { id: 'TXN-089A', desc: 'Corporate Lease - TechCorp', amount: '+ $5,400.00', status: 'Cleared', type: 'Credit' },
                            { id: 'DEP-BOM-01', desc: 'Branch Cash Deposit (Mumbai)', amount: '+ $1,200.00', status: 'Pending Verification', type: 'Deposit' },
                            { id: 'EXP-MNT-92', desc: 'Vendor Payment (AutoFixers)', amount: '- $850.00', status: 'Cleared', type: 'Debit' },
                            { id: 'TXN-088C', desc: 'Booking Revenue Batch A4', amount: '+ $3,120.50', status: 'Cleared', type: 'Credit' },
                        ].map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b last:border-0 cursor-pointer" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'Debit' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                        <Wallet size={16} />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{tx.desc}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {tx.id} · {tx.status === 'Cleared' ? t('dashboards.financial.transactions.cleared') : t('dashboards.financial.transactions.pendingVerification')}
                                        </p>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${tx.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialAdminDashboard;

