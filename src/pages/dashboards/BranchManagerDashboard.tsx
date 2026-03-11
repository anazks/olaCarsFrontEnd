import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { CalendarRange, Car, UsersRound } from 'lucide-react';

const BranchManagerDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>
                        Branch Hub <span style={{ color: 'var(--brand-lime)', fontSize: '1.25rem', fontWeight: 'normal', marginLeft: '0.5rem' }}>— Mumbai Central</span>
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Your local fleet, staff, and daily targets.</p>
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
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Upcoming Handovers (Next 3 Hrs)</h4>
                    </div>
                    <div className="p-2">
                        {['10:30 AM', '11:00 AM', '12:15 PM'].map((time, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 text-center font-bold text-sm" style={{ color: 'var(--brand-lime)' }}>{time}</div>
                                    <div>
                                        <div className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>Customer: Arjun D.</div>
                                        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>MH-12-AB-{1000 + i} (Premium Sedan)</div>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 text-xs font-bold rounded cursor-pointer" style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}>Assign Key</button>
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
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Staff Task Board</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <div
                            className="p-3 rounded-lg border border-l-4 transition-colors"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', borderLeftColor: '#F97316' }}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Inspect returned SUV (Damage reported)</span>
                                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">High</span>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Assigned: Ops Team · Due in 30 mins</div>
                        </div>
                        <div
                            className="p-3 rounded-lg border border-l-4 transition-colors"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', borderLeftColor: 'var(--brand-lime)' }}
                        >
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Deposit yesterdays cash box</span>
                                <span className="text-xs bg-lime/20 text-lime px-2 py-0.5 rounded">Normal</span>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Assigned: Finance · Due 12:00 PM</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;
