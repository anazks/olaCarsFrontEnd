import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { Target, Users2, ShieldAlert } from 'lucide-react';

const CountryManagerDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>National Overview</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Cross-region performance and critical national metrics.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Total Branches"
                    title="Active nationwide"
                    value="24"
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="National Goal"
                    title="Fleet utilization"
                    value="88%"
                    icon={<Target size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Total Staff"
                    title="Across all regions"
                    value="1,204"
                    icon={<Users2 size={14} />}
                    color="#1F2937"
                />
                <AlertCard
                    title="Compliance Flags"
                    count={3}
                    desc="Regulatory / Audits"
                    color="#EF4444"
                />
            </div>

            {/* Region Map & Stats Placeholder */}
            <div
                className="rounded-2xl border shadow-lg p-6 transition-colors"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <h4 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Regional Performance Grid</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['North Region', 'South Region', 'West Region', 'East Region'].map((region, i) => (
                        <div
                            key={region}
                            className="border p-4 rounded-xl hover:border-lime transition-all cursor-pointer group"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        >
                            <h5 className="font-bold mb-3 transition-colors" style={{ color: 'var(--brand-lime)' }}>{region}</h5>
                            <div className="flex justify-between items-center p-2 rounded mb-1 text-sm transition-colors" style={{ background: 'var(--bg-card)' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Branches:</span>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>{4 + i * 2}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded mb-1 text-sm transition-colors" style={{ background: 'var(--bg-card)' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Yield:</span>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>${(112000 - i * 15000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 rounded text-sm transition-colors" style={{ background: 'var(--bg-card)' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Alerts:</span>
                                <span className="font-bold text-red-500 flex items-center gap-1"><ShieldAlert size={12} /> {i}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CountryManagerDashboard;
