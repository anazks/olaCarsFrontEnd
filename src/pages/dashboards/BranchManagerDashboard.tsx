import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Car, Calendar, Users, Clock, ArrowRight } from 'lucide-react';

const BranchManagerDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branch.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branch.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.branch.stats.localFleet')}
                    title={t('dashboards.branch.stats.availableVsTotal')}
                    value="42 / 45"
                    icon={<Car size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.branch.stats.todayBookings')}
                    title={t('dashboards.branch.stats.scheduledPickups')}
                    value="12"
                    icon={<Calendar size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.branch.stats.staffOnShift')}
                    title={t('dashboards.branch.stats.opsFinance')}
                    value="6"
                    icon={<Users size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle={t('dashboards.branch.stats.customerWait')}
                    title={t('dashboards.branch.stats.customerWait')}
                    value="8 min"
                    icon={<Clock size={14} />}
                    color="#F59E0B"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Handovers */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.branch.handovers.title')}</h4>
                    </div>
                    <div className="p-2">
                        {[
                            { time: '10:30 AM', customer: 'Amit Sharma', vehicle: 'Swift (DZ-12)', status: 'Ready' },
                            { time: '11:15 AM', customer: 'Sania Khan', vehicle: 'City (KA-05)', status: 'Cleaning' },
                            { time: '12:00 PM', customer: 'John Doe', vehicle: 'Innova (MH-01)', status: 'Scheduled' },
                        ].map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b last:border-0 rounded-xl" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex gap-4 items-center">
                                    <div className="text-center w-16 px-2 py-1 rounded bg-white/5 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Time</p>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{h.time}</p>
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{h.customer}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{h.vehicle}</p>
                                    </div>
                                </div>
                                <button
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors hover:bg-lime/10"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}
                                >
                                    {t('dashboards.branch.handovers.assignKey')} <ArrowRight size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff Tasks */}
                <div
                    className="rounded-2xl border shadow-lg flex flex-col overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.branch.tasks.title')}</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        {[
                            { task: 'Inspect returned SUV (Damage reported)', staff: 'Ops Team', priority: t('dashboards.branch.tasks.high'), due: '30 mins' },
                            { task: 'Deposit yesterdays cash box', staff: 'Finance', priority: t('dashboards.branch.tasks.normal'), due: '12:00 PM' },
                        ].map((task, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-lg border border-l-4 transition-colors"
                                style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-main)',
                                    borderLeftColor: task.priority === t('dashboards.branch.tasks.high') ? '#F97316' : 'var(--brand-lime)'
                                }}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{task.task}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded font-bold ${task.priority === t('dashboards.branch.tasks.high') ? 'bg-orange-500/20 text-orange-400' : 'bg-lime/20 text-lime'}`}
                                    >
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                    {t('dashboards.branch.tasks.assigned')}: {task.staff} · {t('dashboards.branch.tasks.dueIn', { value: task.due })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;

