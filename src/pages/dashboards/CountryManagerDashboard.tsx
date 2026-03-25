import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Globe, Users, TrendingUp, AlertCircle } from 'lucide-react';

const CountryManagerDashboard = () => {
    const { t } = useTranslation();

    return (
        <div className="container-responsive space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.country.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.country.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.country.stats.totalBranches')}
                    title={t('dashboards.country.stats.activeNationwide')}
                    value="12"
                    icon={<Globe size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.nationalGoal')}
                    title={t('dashboards.country.stats.fleetUtilization')}
                    value="92%"
                    icon={<TrendingUp size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.totalStaff')}
                    title={t('dashboards.country.stats.acrossRegions')}
                    value="184"
                    icon={<Users size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.complianceFlags')}
                    title={t('dashboards.country.stats.regulatoryAudits')}
                    value="2"
                    icon={<AlertCircle size={14} />}
                    color="#EF4444"
                />
            </div>

            <div
                className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                    <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.country.performance.title')}</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs uppercase transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                <th className="px-6 py-4">Region</th>
                                <th className="px-6 py-4">{t('dashboards.country.performance.branches')}</th>
                                <th className="px-6 py-4">Revenue (MTD)</th>
                                <th className="px-6 py-4">{t('dashboards.country.performance.yield')}</th>
                                <th className="px-6 py-4">{t('dashboards.country.performance.alerts')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {[
                                { r: 'North India', b: 4, rev: '$240k', y: '+4.2%', a: 12 },
                                { r: 'South India', b: 5, rev: '$310k', y: '+6.1%', a: 8 },
                                { r: 'West India', b: 2, rev: '$120k', y: '-1.5%', a: 15 },
                                { r: 'East India', b: 1, rev: '$45k', y: '+0.8%', a: 3 },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{row.r}</td>
                                    <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.b}</td>
                                    <td className="px-6 py-4 font-bold" style={{ color: 'var(--text-main)' }}>{row.rev}</td>
                                    <td className={`px-6 py-4 font-bold ${row.y.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{row.y}</td>
                                    <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.a}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CountryManagerDashboard;
