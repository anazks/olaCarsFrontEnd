import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, AlertTriangle, List } from 'lucide-react';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { useNavigate } from 'react-router-dom';

const FinanceDashboard = () => {
    const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            // In a real app, this might be a specialized /api/finance/dashboard endpoint.
            // But we will use the ledger for recent transactions.
            const ledgerData = await getLedgerEntries();
            
            // Assume the API returns chronologically or we sort them newest first.
            // Limit to 10 most recent for the dashboard view.
            const sorted = Array.isArray(ledgerData) 
                ? [...ledgerData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                : [];
            
            setRecentEntries(sorted.slice(0, 10));
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Calculate quick high level stats (Based on ALL recent entries fetched, or from a dedicated stats endpoint)
    // Here we'll just demonstrate the UI metrics based on the subset we loaded.
    const monthIncome = recentEntries
        .filter(e => e.accountingCode && e.accountingCode.category === 'INCOME')
        .reduce((sum, e) => sum + (e.credit || 0) - (e.debit || 0), 0);

    const monthExpense = recentEntries
        .filter(e => e.accountingCode && e.accountingCode.category === 'EXPENSE')
        .reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);

    const summaryCards = [
        {
            title: 'Monthly Income',
            value: monthIncome.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: ArrowUpRight,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.1)'
        },
        {
            title: 'Monthly Expenses',
            value: monthExpense.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: ArrowDownRight,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.1)'
        },
        {
            title: 'Net Profit',
            value: (monthIncome - monthExpense).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: Activity,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.1)'
        }
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <BarChart3 size={28} style={{ color: '#C8E600' }} />
                        Finance Dashboard
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Overview of financial health and recent activities</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-white/5"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {summaryCards.map((card, idx) => (
                    <div key={idx} className="p-6 rounded-2xl border transition-colors duration-300 flex items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                            <card.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-dim)' }}>{card.title}</p>
                            <h3 className="text-2xl font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                                {card.value}
                            </h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Transactions */}
            <div className="rounded-2xl border transition-colors duration-300 flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', minHeight: '400px' }}>
                <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <List size={20} style={{ color: '#C8E600' }} />
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Recent Transactions</h2>
                    </div>
                    {/* The navigation path relies on how the app routes are structured. E.g., navigating to "ledger" in the sidebar context */}
                    <button 
                        onClick={() => navigate('../ledger')} 
                        className="text-sm font-medium hover:underline transition-all"
                        style={{ color: '#C8E600' }}
                    >
                        View Full Ledger →
                    </button>
                </div>
                
                <div className="overflow-x-auto flex-grow">
                    {loading ? (
                        <div className="flex items-center justify-center h-full min-h-[300px]">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : recentEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px]" style={{ color: 'var(--text-dim)' }}>
                            <Activity size={48} className="mb-4 opacity-30" />
                            <p className="text-lg font-medium">No recent transactions</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Description</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEntries.map((entry) => {
                                    const dateObj = new Date(entry.date);
                                    const formattedDate = !isNaN(dateObj.getTime()) 
                                        ? `${dateObj.toLocaleDateString()}` 
                                        : entry.date;
                                        
                                    // Determine if this looks like cash in vs cash out for quick visual read
                                    // Credit on income = good, debit on expense = bad
                                    let amount = 0;
                                    
                                    if (entry.credit > 0) {
                                        amount = entry.credit;
                                    } else if (entry.debit > 0) {
                                        amount = entry.debit;
                                    }

                                    return (
                                        <tr key={entry._id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm" style={{ color: 'var(--text-main)' }}>{entry.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>
                                                    {entry.accountingCode?.code} - {entry.accountingCode?.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`font-mono text-sm font-bold ${entry.debit > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {entry.debit > 0 ? '-' : '+'}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] uppercase tracking-wider mt-0.5 opacity-60" style={{ color: 'var(--text-dim)' }}>
                                                    {entry.debit > 0 ? 'DR' : 'CR'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;
