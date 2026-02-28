import { AlertTriangle, Settings, MapPin, Wrench as Tool, CheckCircle2 } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';

const OperationalAdminDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Operations Dashboard</h1>
                    <p className="text-gray-400 text-sm">Real-time fleet tracking and maintenance hub.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-lime border-lime cursor-pointer hover:bg-lime/10">
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
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-[#2A2A2A] flex justify-between items-center bg-[#181818]">
                        <h4 className="font-bold text-white">Live Operations</h4>
                        <button className="text-lime text-sm hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400 relative">
                            <thead className="text-xs uppercase bg-[#111111] text-gray-500">
                                <tr>
                                    <th className="px-6 py-4">Vehicle</th>
                                    <th className="px-6 py-4">Driver</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">ETA/Est.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2A2A2A]">
                                {[
                                    { v: 'MH-12-AB-1234 (SUV)', d: 'Ramesh K.', s: 'On Trip', sColor: 'text-green-400', e: '12 mins' },
                                    { v: 'MH-14-XY-9087 (Sedan)', d: 'Sunil J.', s: 'At Depot', sColor: 'text-gray-400', e: '-' },
                                    { v: 'MH-02-KL-4455 (Luxury)', d: 'Unassigned', s: 'Maintenance', sColor: 'text-orange-400', e: 'Tomorrow 10AM' },
                                    { v: 'MH-12-PQ-8899 (Economy)', d: 'Priya M.', s: 'Accident/VOR', sColor: 'text-red-400', e: 'Pending Auth' },
                                ].map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{row.v}</td>
                                        <td className="px-6 py-4">{row.d}</td>
                                        <td className={`px-6 py-4 font-bold ${row.sColor}`}>{row.s}</td>
                                        <td className="px-6 py-4 text-gray-300">{row.e}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Maintenance Quick Actions */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-5 shadow-lg flex flex-col">
                    <h4 className="font-bold text-white mb-4">Maintenance Queue</h4>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                        {[
                            { title: 'Routine Servicing (Oil/Filters)', count: 12, icon: <Settings size={18} className="text-blue-400" />, time: 'Due Today' },
                            { title: 'Tyre Replacements', count: 5, icon: <CheckCircle2 size={18} className="text-green-400" />, time: 'Scheduled' },
                            { title: 'Engine Diagnostics', count: 8, icon: <Tool size={18} className="text-orange-400" />, time: 'Pending Bay' },
                            { title: 'Body Repair (Accidental)', count: 3, icon: <AlertTriangle size={18} className="text-red-400" />, time: 'Awaiting Parts' },
                        ].map((q, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-[#2A2A2A] bg-[#111111] hover:border-lime/50 transition-colors cursor-pointer group">
                                <div className="flex gap-4 items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#1C1C1C] flex items-center justify-center border border-[#2A2A2A] group-hover:bg-lime/10 group-hover:border-lime/30">
                                        {q.icon}
                                    </div>
                                    <div>
                                        <h5 className="text-white font-medium text-sm">{q.title}</h5>
                                        <p className="text-xs text-gray-500">{q.time}</p>
                                    </div>
                                </div>
                                <div className="text-xl font-bold text-white bg-white/5 w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 group-hover:border-lime/30 group-hover:text-lime">
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
