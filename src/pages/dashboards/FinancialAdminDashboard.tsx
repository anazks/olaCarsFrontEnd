import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { Download, ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from 'lucide-react';

const FinancialAdminDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Finance Hub</h1>
                    <p className="text-gray-400 text-sm">Revenue tracking, branch audits, and collections.</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-lime border-lime cursor-pointer hover:bg-lime/10">
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Total Revenue (MTD)"
                    title="Gross Payouts"
                    value="$142,500"
                    icon={<ArrowUpRight size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Pending Collections"
                    title="Awaiting Deposit"
                    value="$18,200"
                    icon={<DollarSign size={14} />}
                    color="#F59E0B"
                />
                <StatCard
                    superTitle="Fleet Expenses"
                    title="Maintenance largely"
                    value="$4,120"
                    icon={<ArrowDownRight size={14} />}
                    color="#EF4444"
                />
                <AlertCard
                    title="Overdue Invoices"
                    count={14}
                    desc="Corporate clients"
                    color="#F97316"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Branch Revenue */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg overflow-hidden">
                    <div className="p-5 border-b border-[#2A2A2A]">
                        <h4 className="font-bold text-white">Top Branches Revenue (MTD)</h4>
                    </div>
                    <div className="p-5 space-y-4">
                        {[
                            { name: 'Mumbai Central', rev: 45000, target: 50000, percent: 90 },
                            { name: 'Bangalore East', rev: 38000, target: 35000, percent: 108 },
                            { name: 'Delhi NCR Hub', rev: 32000, target: 40000, percent: 80 },
                            { name: 'Pune South', rev: 27500, target: 20000, percent: 137 },
                        ].map((branch, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-white font-medium">{branch.name}</span>
                                    <span className="text-gray-400 font-bold">${branch.rev.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ ${branch.target.toLocaleString()}</span></span>
                                </div>
                                <div className="w-full h-2 bg-[#111111] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(branch.percent, 100)}%`,
                                            background: branch.percent >= 100 ? '#148F85' : branch.percent > 85 ? '#F59E0B' : '#C8E600'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-lg flex flex-col">
                    <div className="p-5 border-b border-[#2A2A2A] flex justify-between items-center">
                        <h4 className="font-bold text-white">Latest Transactions & Deposits</h4>
                        <button className="text-lime text-sm hover:underline border-none bg-transparent cursor-pointer">View Ledger</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {[
                            { id: 'TXN-089A', desc: 'Corporate Lease - TechCorp', amount: '+ $5,400.00', status: 'Cleared', type: 'Credit' },
                            { id: 'DEP-BOM-01', desc: 'Branch Cash Deposit (Mumbai)', amount: '+ $1,200.00', status: 'Pending Verification', type: 'Deposit' },
                            { id: 'EXP-MNT-92', desc: 'Vendor Payment (AutoFixers)', amount: '- $850.00', status: 'Cleared', type: 'Debit' },
                            { id: 'TXN-088C', desc: 'Booking Revenue Batch A4', amount: '+ $3,120.50', status: 'Cleared', type: 'Credit' },
                        ].map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-[#2A2A2A] last:border-0 cursor-pointer">
                                <div className="flex gap-3 items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'Debit' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                        <Wallet size={16} />
                                    </div>
                                    <div>
                                        <h5 className="text-white text-sm font-medium">{tx.desc}</h5>
                                        <p className="text-xs text-gray-500">{tx.id} · {tx.status}</p>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold ${tx.type === 'Debit' ? 'text-red-400' : 'text-green-400'}`}>
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

export default FinancialAdminDashboard;
