import { AlertTriangle, Settings, MapPin, Wrench as Tool, CheckCircle2 } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';

const OperationalAdminDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Operations Dashboard</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Real-time fleet tracking and maintenance hub.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all cursor-pointer hover:bg-lime/10"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}
                    >
                        <MapPin size={16} /> Open Fleet Map
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Total Vehicles"
                    title="Active Fleet"
                    value="450"
                    color="#4F46E5" // Indigo
                />
                <StatCard
                    superTitle="On the Road"
                    title="Live Tracking"
                    value="382"
                    color="#148F85" // Teal
                />
                <StatCard
                    superTitle="In Service"
                    title="Depot Maintenance"
                    value="45"
                    color="#F59E0B" // Amber
                />
                <AlertCard
                    title="Critical VOR"
                    count={23}
                    desc="Vehicle Off Road"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Status Table */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Live Operations</h4>
                        <button className="text-sm hover:underline" style={{ color: 'var(--brand-lime)' }}>View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm relative">
                            <thead>
                                <tr className="text-xs uppercase transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Driver</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">ETA/Est.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {[
                                    { v: 'MH-12-AB-1234 (SUV)', d: 'Ramesh K.', s: 'On Trip', sColor: 'text-green-400', e: '12 mins' },
                                    { v: 'MH-14-XY-9087 (Sedan)', d: 'Sunil J.', s: 'At Depot', sColor: 'text-gray-400', e: '-' },
                                    { v: 'MH-02-KL-4455 (Luxury)', d: 'Unassigned', s: 'Maintenance', sColor: 'text-orange-400', e: 'Tomorrow 10AM' },
                                    { v: 'MH-12-PQ-8899 (Economy)', d: 'Priya M.', s: 'Accident/VOR', sColor: 'text-red-400', e: 'Pending Auth' },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{row.v}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.d}</td>
                                        <td className={`px-6 py-4 font-bold ${row.sColor}`}>{row.s}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.e}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Maintenance Quick Actions */}
                <div
                    className="rounded-2xl border p-5 shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h4 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Maintenance Queue</h4>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {[
                            { title: 'Routine Servicing (Oil/Filters)', count: 12, icon: <Settings size={18} className="text-blue-400" />, time: 'Due Today' },
                            { title: 'Tyre Replacements', count: 5, icon: <CheckCircle2 size={18} className="text-green-400" />, time: 'Scheduled' },
                            { title: 'Engine Diagnostics', count: 8, icon: <Tool size={18} className="text-orange-400" />, time: 'Pending Bay' },
                            { title: 'Body Repair (Accidental)', count: 3, icon: <AlertTriangle size={18} className="text-red-400" />, time: 'Awaiting Parts' },
                        ].map((q, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="flex gap-4 items-center">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center border group-hover:bg-lime/10 group-hover:border-lime/30 transition-colors"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                                    >
                                        {q.icon}
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{q.title}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{q.time}</p>
                                    </div>
                                </div>
                                <div
                                    className="text-xl font-bold bg-white/5 w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 group-hover:border-lime/30 group-hover:text-lime transition-all"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    {q.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperationalAdminDashboard;
