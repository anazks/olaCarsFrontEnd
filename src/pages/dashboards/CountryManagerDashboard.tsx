import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { Target, Users2, ShieldAlert } from 'lucide-react';

const CountryManagerDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">National Overview</h1>
                    <p className="text-gray-400 text-sm">Cross-region performance and critical national metrics.</p>
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
            <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg p-6">
                <h4 className="font-bold text-white mb-4">Regional Performance Grid</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['North Region', 'South Region', 'West Region', 'East Region'].map((region, i) => (
                        <div key={region} className="bg-[#111111] border border-[#2A2A2A] p-4 rounded-xl hover:border-lime transition-colors cursor-pointer">
                            <h5 className="text-lime font-bold mb-3">{region}</h5>
                            <div className="flex justify-between items-center bg-[#181818] p-2 rounded mb-1 text-sm">
                                <span className="text-gray-400">Branches:</span>
                                <span className="font-bold text-white">{4 + i * 2}</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#181818] p-2 rounded mb-1 text-sm">
                                <span className="text-gray-400">Yield:</span>
                                <span className="font-bold text-white">${(112000 - i * 15000).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#181818] p-2 rounded text-sm">
                                <span className="text-gray-400">Alerts:</span>
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
