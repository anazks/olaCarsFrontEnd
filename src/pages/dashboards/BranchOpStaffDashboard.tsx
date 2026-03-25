import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { ClipboardCheck, Key, Droplets, AlertTriangle, Play, CheckCircle } from 'lucide-react';

const BranchOpStaffDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="container-responsive space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchOp.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.branchOp.stats.myTasks')}
                    title={t('dashboards.branchOp.stats.completedToday')}
                    value="8 / 12"
                    icon={<ClipboardCheck size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.branchOp.stats.pendingKeys')}
                    title={t('dashboards.branchOp.stats.handoverRequired')}
                    value="4"
                    icon={<Key size={14} />}
                    color="#F59E0B"
                />
                <StatCard
                    superTitle={t('dashboards.branchOp.stats.cleanBay')}
                    title={t('dashboards.branchOp.stats.waitingForWash')}
                    value="2"
                    icon={<Droplets size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.branchOp.stats.reportedDamages')}
                    title={t('dashboards.branchOp.stats.sinceShiftStart')}
                    value="1"
                    icon={<AlertTriangle size={14} />}
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Checklist Section */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.checklist.title')}</h4>
                        <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10" style={{ color: 'var(--text-dim)' }}>
                            {t('dashboards.branchOp.checklist.total', { count: 3 })}
                        </span>
                    </div>
                    <div className="p-4 space-y-2">
                        {[
                            { task: 'Morning Inventory Check (All Keys)', status: 'complete' },
                            { task: 'Verify Cleaning Schedule', status: 'pending' },
                            { task: 'Log fuel levels for SUV batch AA', status: 'pending' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-white/5" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                {item.status === 'complete' ? (
                                    <CheckCircle size={20} className="text-green-400" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-white/20" />
                                )}
                                <span className={`text-sm ${item.status === 'complete' ? 'line-through' : ''}`} style={{ color: item.status === 'complete' ? 'var(--text-dim)' : 'var(--text-main)' }}>
                                    {item.task}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div
                    className="rounded-2xl border p-5 shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h4 className="font-bold mb-6" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.actions.title')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <button
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all hover:border-lime group"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="w-12 h-12 rounded-full bg-lime/10 flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                                <Play size={24} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.actions.startHandover')}</span>
                        </button>
                        <button
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all hover:border-blue-400 group"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                <ClipboardCheck size={24} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.actions.processCheckin')}</span>
                        </button>
                        <button
                            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all hover:border-red-400 group sm:col-span-2"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        >
                            <div className="w-12 h-12 rounded-full bg-red-400/10 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                                <AlertTriangle size={24} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.actions.reportDamage')}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchOpStaffDashboard;

