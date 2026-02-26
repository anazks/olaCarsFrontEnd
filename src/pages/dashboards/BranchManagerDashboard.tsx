import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { CalendarRange, Car, UsersRound } from 'lucide-react';

const BranchManagerDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Branch Hub <span className="text-lime text-xl font-normal ml-2">— Mumbai Central</span></h1>
                    <p className="text-gray-400 text-sm">Your local fleet, staff, and daily targets.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Local Fleet"
                    title="Available vs Total"
                    value="42/50"
                    icon={<Car size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Today's Bookings"
                    title="Scheduled pickups"
                    value="18"
                    icon={<CalendarRange size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Staff On Shift"
                    title="Ops & Finance"
                    value="5/6"
                    icon={<UsersRound size={14} />}
                    color="#1F2937"
                />
                <AlertCard
                    title="Customer Wait"
                    count={2}
                    desc="> 15 mins at reception"
                    color="#F97316"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Today's Handovers */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-[#2A2A2A]">
                        <h4 className="font-bold text-white">Upcoming Handovers (Next 3 Hrs)</h4>
                    </div>
                    <div className="p-2">
                        {['10:30 AM', '11:00 AM', '12:15 PM'].map((time, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b border-[#2A2A2A] last:border-0 hover:bg-white/5 transition-colors cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 text-center font-bold text-lime text-sm">{time}</div>
                                    <div>
                                        <div className="text-white font-medium text-sm">Customer: Arjun D.</div>
                                        <div className="text-xs text-gray-500">MH-12-AB-{1000 + i} (Premium Sedan)</div>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 text-xs bg-lime text-black font-bold rounded">Assign Key</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff Tasks */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-[#2A2A2A]">
                        <h4 className="font-bold text-white">Staff Task Board</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="bg-[#111111] p-3 rounded-lg border border-[#2A2A2A] border-l-4 border-l-orange-500">
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-white text-sm">Inspect returned SUV (Damage reported)</span>
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">High</span>
                            </div>
                            <div className="text-xs text-gray-500">Assigned: Ops Team · Due in 30 mins</div>
                        </div>
                        <div className="bg-[#111111] p-3 rounded-lg border border-[#2A2A2A] border-l-4 border-l-lime">
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-white text-sm">Deposit yesterdays cash box</span>
                                <span className="text-xs bg-lime/20 text-lime px-2 py-0.5 rounded">Normal</span>
                            </div>
                            <div className="text-xs text-gray-500">Assigned: Finance · Due 12:00 PM</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;
