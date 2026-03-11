import { CheckSquare, AlertTriangle, KeySquare } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';

const BranchOpStaffDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Ground Operations</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Tasks, checklists, and vehicle condition reporting.</p>
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
                <div
                    className="rounded-2xl border shadow-lg flex flex-col h-full transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>My Checklist</h4>
                        <span className="text-xs px-2 py-1 rounded font-bold" style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}>18 Total</span>
                    </div>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {[
                            { title: 'Check-in: MH-12-KL-3333', desc: 'Verify fuel level & mileage', time: '10:30 AM', priority: 'High' },
                            { title: 'Handover: MH-14-XY-9087 to Mr. Sharma', desc: 'Customer waiting in lobby', time: '11:00 AM', priority: 'Critical' },
                            { title: 'Washing Bay', desc: 'Move 3 returned cars to cleaning', time: '11:30 AM', priority: 'Normal' },
                            { title: 'Sanitize Premium SUVs', desc: 'Wipe all touchpoints before dispatch', time: '1:00 PM', priority: 'Normal' },
                        ].map((task, i) => (
                            <div
                                key={i}
                                className="flex gap-4 p-4 rounded-xl border transition-all group cursor-default"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="mt-1">
                                    <div
                                        className="w-5 h-5 rounded border-2 flex justify-center items-center group-hover:border-lime cursor-pointer transition-colors"
                                        style={{ borderColor: 'var(--text-dim)' }}
                                    >
                                        {/* Checkmark icon placeholder */}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{task.title}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${task.priority === 'Critical' ? 'bg-red-500/20 text-red-500' : task.priority === 'High' ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-gray-400'}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    <div className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>{task.desc}</div>
                                    <div className="text-xs font-bold mt-1" style={{ color: 'var(--brand-lime)' }}>{task.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Panel */}
                <div
                    className="rounded-2xl border p-5 shadow-lg flex flex-col h-full transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h4 className="font-bold mb-6" style={{ color: 'var(--text-main)' }}>Quick Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-lime/10 hover:border-lime/40 cursor-pointer transition-all group"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <CheckSquare size={32} className="mb-3 group-hover:text-lime transition-colors" />
                            <span className="font-semibold text-sm group-hover:text-lime transition-colors">Start Handover</span>
                        </button>
                        <button
                            className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-lime/10 hover:border-lime/40 cursor-pointer transition-all group"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <CheckSquare size={32} className="mb-3 group-hover:text-lime transition-colors" />
                            <span className="font-semibold text-sm group-hover:text-lime transition-colors">Process Check-in</span>
                        </button>
                        <button
                            className="flex flex-col items-center justify-center p-6 border rounded-xl hover:bg-red-500/10 hover:border-red-500/50 cursor-pointer transition-all group text-red-400 sm:col-span-2"
                            style={{ background: 'var(--bg-input)', borderColor: 'rgba(239,68,68,0.2)' }}
                        >
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
