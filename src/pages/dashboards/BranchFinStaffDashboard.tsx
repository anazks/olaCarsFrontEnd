import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Banknote, CreditCard, Receipt } from 'lucide-react';

const BranchFinStaffDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Branch Finance</h1>
                    <p className="text-gray-400 text-sm">Petty cash, deposit logging, and payment verification.</p>
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
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-[#2A2A2A]">
                        <h4 className="font-bold text-white">Register Cash Deposit</h4>
                    </div>
                    <div className="p-6">
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Deposit Amount ($)</label>
                                <input type="number" placeholder="0.00" className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-lg font-bold outline-none focus:border-lime" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">Bank Reference / Notes</label>
                                <input type="text" placeholder="e.g. Ref #1029384" className="w-full bg-[#111111] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white outline-none focus:border-lime" />
                            </div>
                            <button className="w-full bg-lime text-black font-bold py-3.5 rounded-xl mt-4 hover:shadow-[0_4px_20px_rgba(200,230,0,0.3)] transition-shadow">Submit Cash Log to HQ</button>
                        </form>
                    </div>
                </div>

                {/* Recent Local Transactions */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg flex flex-col h-full">
                    <div className="p-5 border-b border-[#2A2A2A]">
                        <h4 className="font-bold text-white">Today's Ledger (Local)</h4>
                    </div>
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {[
                            { title: 'Vehicle Wash Supplies', amount: '- $50.00', type: 'Petty Cash', time: '10:15 AM' },
                            { title: 'Deposit to State Bank', amount: '- $2,400.00', type: 'Bank Drop', time: '09:00 AM' },
                            { title: 'Walk-in Cash Payment', amount: '+ $120.00', type: 'Revenue', time: '08:45 AM' },
                        ].map((tx, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b border-[#2A2A2A] last:border-0">
                                <div>
                                    <span className="block font-bold text-white text-sm">{tx.title}</span>
                                    <span className="text-xs text-gray-500">{tx.type} · {tx.time}</span>
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
