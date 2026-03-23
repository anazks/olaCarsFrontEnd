import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Wallet, Receipt, Calculator, AlertCircle, FileText, ArrowUpRight } from 'lucide-react';

const BranchFinStaffDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchFin.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.cashOnHand')}
                    title={t('dashboards.branchFin.stats.physicalVault')}
                    value="₹12,450"
                    icon={<Wallet size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.pendingInvoices')}
                    title={t('dashboards.branchFin.stats.awaitingPayment')}
                    value="5"
                    icon={<Receipt size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.todaysRevenue')}
                    title={t('dashboards.branchFin.stats.netCollection')}
                    value="₹45,200"
                    icon={<Calculator size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle={t('dashboards.branchFin.stats.discrepancy')}
                    title={t('dashboards.branchFin.stats.reconciliationAlerts')}
                    value="0"
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
                                {[
                                    { id: '#INV-9901', type: 'Booking Payment', amount: '₹4,500', status: 'Verified' },
                                    { id: '#INV-9902', type: 'Security Deposit', amount: '₹10,000', status: 'Pending' },
                                    { id: '#EXP-441', type: 'Fuel Reimbursement', amount: '₹1,200', status: 'Verified' },
                                ].map((tx, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold" style={{ color: 'var(--brand-lime)' }}>{tx.id}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-main)' }}>{tx.type}</td>
                                        <td className="px-6 py-4 font-bold" style={{ color: 'var(--text-main)' }}>{tx.amount}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${tx.status === 'Verified' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Financial Actions */}
                <div className="space-y-4">
                    <button
                        className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-dashed transition-all hover:border-lime group"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-10 h-10 rounded-full bg-lime/10 flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                                <Receipt size={20} />
                            </div>
                            <div>
                                <h5 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.actions.generateInvoice')}</h5>
                                <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchFin.actions.forCurrentBooking')}</p>
                            </div>
                        </div>
                        <ArrowUpRight size={18} style={{ color: 'var(--text-dim)' }} />
                    </button>

                    <button
                        className="w-full flex items-center justify-between p-5 rounded-2xl border-2 border-dashed transition-all hover:border-blue-400 group"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-10 h-10 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h5 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchFin.actions.reconcileCash')}</h5>
                                <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchFin.actions.closeDailyRegister')}</p>
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

