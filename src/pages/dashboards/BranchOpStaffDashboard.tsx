import { CheckSquare, AlertTriangle, KeySquare } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';

const BranchOpStaffDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Ground Operations</h1>
                    <p className="text-gray-400 text-sm">Tasks, checklists, and vehicle condition reporting.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="My Tasks"
                    title="Completed today"
                    value="12/18"
                    icon={<CheckSquare size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Pending Keys"
                    title="Handover required"
                    value="4"
                    icon={<KeySquare size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Clean Bay"
                    title="Waiting for wash"
                    value="3"
                    color="#1F2937"
                />
                <AlertCard
                    title="Reported Damages"
                    count={1}
                    desc="Since 9:00 AM Shift start"
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Assigned Tasks */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg flex flex-col h-full">
                    <div className="p-5 border-b border-[#2A2A2A] flex justify-between items-center">
                        <h4 className="font-bold text-white">My Checklist</h4>
                        <span className="text-xs bg-lime text-black px-2 py-1 rounded font-bold">18 Total</span>
                    </div>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {[
                            { title: 'Check-in: MH-12-KL-3333', desc: 'Verify fuel level & mileage', time: '10:30 AM', priority: 'High' },
                            { title: 'Handover: MH-14-XY-9087 to Mr. Sharma', desc: 'Customer waiting in lobby', time: '11:00 AM', priority: 'Critical' },
                            { title: 'Washing Bay', desc: 'Move 3 returned cars to cleaning', time: '11:30 AM', priority: 'Normal' },
                            { title: 'Sanitize Premium SUVs', desc: 'Wipe all touchpoints before dispatch', time: '1:00 PM', priority: 'Normal' },
                        ].map((task, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl border border-[#2A2A2A] bg-[#111111] hover:border-lime/50 transition-colors group">
                                <div className="mt-1">
                                    <div className="w-5 h-5 rounded border-2 border-gray-600 flex justify-center items-center group-hover:border-lime cursor-pointer">
                                        {/* Checkmark icon placeholder */}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-white text-sm">{task.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.priority === 'Critical' ? 'bg-red-500/20 text-red-500' : task.priority === 'High' ? 'bg-orange-500/20 text-orange-500' : 'bg-[#1C1C1C] text-gray-400'}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">{task.desc}</div>
                                    <div className="text-xs font-bold text-lime mt-1">{task.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Panel */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] p-5 shadow-lg flex flex-col h-full">
                    <h4 className="font-bold text-white mb-6">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex flex-col items-center justify-center p-6 bg-[#111111] border border-[#2A2A2A] rounded-xl hover:bg-lime/10 hover:border-lime/40 cursor-pointer transition-colors text-white hover:text-lime">
                            <CheckSquare size={32} className="mb-3" />
                            <span className="font-semibold text-sm">Start Handover</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-6 bg-[#111111] border border-[#2A2A2A] rounded-xl hover:bg-lime/10 hover:border-lime/40 cursor-pointer transition-colors text-white hover:text-lime">
                            <CheckSquare size={32} className="mb-3" />
                            <span className="font-semibold text-sm">Process Check-in</span>
                        </button>
                        <button className="flex flex-col items-center justify-center p-6 bg-[#111111] border border-red-500/20 rounded-xl hover:bg-red-500/10 hover:border-red-500/50 cursor-pointer transition-colors text-red-400">
                            <AlertTriangle size={32} className="mb-3" />
                            <span className="font-semibold text-sm">Report Damage</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BranchOpStaffDashboard;
