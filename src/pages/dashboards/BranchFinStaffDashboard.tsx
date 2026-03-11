import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Banknote, CreditCard, Receipt } from 'lucide-react';

const BranchFinStaffDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>Branch Finance</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Petty cash, deposit logging, and payment verification.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Cash on Hand"
                    title="Till safe amount"
                    value="$1,240"
                    icon={<Banknote size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Today's Swipes"
                    title="Card machines"
                    value="$4,500"
                    icon={<CreditCard size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Petty Cash Blnc"
                    title="Allocated funds"
                    value="$350"
                    color="#F59E0B"
                />
                <StatCard
                    superTitle="Pending Recpts"
                    title="To upload"
                    value="4"
                    icon={<Receipt size={14} />}
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deposit Actions */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Register Cash Deposit</h4>
                    </div>
                    <div className="p-6">
                        <form className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm transition-colors" style={{ color: 'var(--text-dim)' }}>Deposit Amount ($)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full border rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-lime transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm transition-colors" style={{ color: 'var(--text-dim)' }}>Bank Reference / Notes</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Ref #1029384"
                                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-lime transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <button
                                className="w-full font-bold py-3.5 rounded-xl mt-4 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
                                style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                            >
                                Submit Cash Log to HQ
                            </button>
                        </form>
                    </div>
                </div>

                {/* Recent Local Transactions */}
                <div
                    className="rounded-2xl border shadow-lg flex flex-col h-full transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Today's Ledger (Local)</h4>
                    </div>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {[
                            { title: 'Vehicle Wash Supplies', amount: '- $50.00', type: 'Petty Cash', time: '10:15 AM' },
                            { title: 'Deposit to State Bank', amount: '- $2,400.00', type: 'Bank Drop', time: '09:00 AM' },
                            { title: 'Walk-in Cash Payment', amount: '+ $120.00', type: 'Revenue', time: '08:45 AM' },
                        ].map((tx, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b last:border-0 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <span className="block font-bold text-sm" style={{ color: 'var(--text-main)' }}>{tx.title}</span>
                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{tx.type} · {tx.time}</span>
                                </div>
                                <div className={`font-bold ${tx.amount.startsWith('+') ? 'text-green-400' : 'text-orange-400'}`}>
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchFinStaffDashboard;
