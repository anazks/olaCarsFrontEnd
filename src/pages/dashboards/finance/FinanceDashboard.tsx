import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, AlertTriangle, List } from 'lucide-react';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinanceDashboard = () => {
    const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [totals, setTotals] = useState({ income: 0, expense: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const ledgerData = await getLedgerEntries();
            
            const sorted = Array.isArray(ledgerData) 
                ? [...ledgerData].sort((a, b) => new Date(b.date || b.entryDate || '').getTime() - new Date(a.date || a.entryDate || '').getTime())
                : [];
            
            // Keep the last 10 entries for the bottom table preview
            setRecentEntries(sorted.slice(0, 10));

            // Aggregate all historical ledger entries for charts & global totals
            const monthMap = new Map<string, { month: string; income: number; expense: number }>();
            
            let totalIncome = 0;
            let totalExpense = 0;

            sorted.forEach((entry: any) => {
                const eDate = new Date(entry.entryDate || entry.date);
                if (isNaN(eDate.getTime())) return;
                
                const monthKey = eDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                
                let amt = 0;
                let isDebit = false;
                
                if (entry.amount !== undefined) {
                    amt = entry.amount;
                    isDebit = entry.type === 'DEBIT';
                } else {
                    if ((entry.credit || 0) > 0) {
                        amt = entry.credit || 0;
                        isDebit = false;
                    } else if ((entry.debit || 0) > 0) {
                        amt = entry.debit || 0;
                        isDebit = true;
                    }
                }

                // Determine effective money directional flow utilizing Accounting Codes
                const cat = entry.accountingCode?.category?.toUpperCase();
                
                let incomeToAdd = 0;
                let expenseToAdd = 0;

                // Broaden expense calculation to include Assets (like vehicle purchases) 
                // and fallback to transaction type if category is missing
                if (cat === 'INCOME') {
                    incomeToAdd = isDebit ? -amt : amt; // debit to income account decreases overall income
                } else if (cat === 'EXPENSE' || cat === 'ASSET') {
                    expenseToAdd = isDebit ? amt : -amt; // credit to expense/asset account decreases overall expense
                } else {
                    // Fallback to cash basis
                    if (isDebit) expenseToAdd = amt;
                    else incomeToAdd = amt;
                }

                totalIncome += incomeToAdd;
                totalExpense += expenseToAdd;

                const current = monthMap.get(monthKey) || { month: monthKey, income: 0, expense: 0, netProfit: 0 };
                current.income += incomeToAdd;
                current.expense += expenseToAdd;
                current.netProfit = current.income - current.expense;
                monthMap.set(monthKey, current);
            });

            // Convert to array and reverse so the oldest month plots on the left
            const chartData = Array.from(monthMap.values()).reverse();
            setMonthlyData(chartData);
            setTotals({ income: totalIncome, expense: totalExpense });

        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const summaryCards = [
        {
            title: 'Overall Income',
            value: totals.income.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: ArrowUpRight,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.1)'
        },
        {
            title: 'Overall Expenses',
            value: totals.expense.toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: ArrowDownRight,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.1)'
        },
        {
            title: 'Overall Net Profit',
            value: (totals.income - totals.expense).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            icon: Activity,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.1)'
        }
    ];

    return (
        <div className="container-responsive space-y-6">
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

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profit/Loss Chart */}
                <div className="rounded-2xl border transition-colors duration-300 flex flex-col p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <BarChart3 size={20} style={{ color: '#C8E600' }} />
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Monthly Profit & Loss</h2>
                        </div>
                     </div>
                     
                     <div style={{ width: '100%', height: 350 }}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : monthlyData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-dim)' }}>
                                No financial data available to chart
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                        contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)' }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                     </div>
                </div>

                {/* Net Profit Trend Line Chart */}
                <div className="rounded-2xl border transition-colors duration-300 flex flex-col p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Activity size={20} style={{ color: '#C8E600' }} />
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Net Profit Trend</h2>
                        </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 350 }}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : monthlyData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-dim)' }}>
                                No financial data available to chart
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)' }}
                                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                    <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "var(--bg-card)" }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
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
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Accounting Code</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEntries.map((entry) => {
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    const formattedDate = !isNaN(dateObj.getTime()) 
                                        ? `${dateObj.toLocaleDateString()}` 
                                        : entryDateStr;
                                        
                                    let amount = 0;
                                    let isDebit = false;

                                    if (entry.amount !== undefined) {
                                        amount = entry.amount;
                                        isDebit = entry.type === 'DEBIT';
                                    } else {
                                        if ((entry.credit || 0) > 0) {
                                            amount = entry.credit || 0;
                                            isDebit = false;
                                        } else if ((entry.debit || 0) > 0) {
                                            amount = entry.debit || 0;
                                            isDebit = true;
                                        }
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
                                                <div className={`font-mono text-sm font-bold ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                                                    {isDebit ? '-' : '+'}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-[10px] uppercase tracking-wider mt-0.5 opacity-60" style={{ color: 'var(--text-dim)' }}>
                                                    {isDebit ? 'DR' : 'CR'}
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
