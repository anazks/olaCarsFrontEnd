import { useState, useEffect } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3, AlertTriangle, List, Receipt, Landmark, Calculator, BookMarked } from 'lucide-react';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTasks, updateTaskStatus } from '../../../services/taskService';
import type { StaffTask } from '../../../services/taskService';
import { getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const FinanceDashboard = () => {
    const [recentEntries, setRecentEntries] = useState<LedgerEntry[]>([]);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [totals, setTotals] = useState({ income: 0, expense: 0 });
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const user = getUser();

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ledgerData, taskData] = await Promise.all([
                getLedgerEntries(),
                getTasks({ assignedTo: user?.id || user?._id })
            ]);
            
            const sorted = Array.isArray(ledgerData) 
                ? [...ledgerData].sort((a, b) => new Date(b.date || b.entryDate || '').getTime() - new Date(a.date || a.entryDate || '').getTime())
                : [];
            
            setRecentEntries(sorted.slice(0, 10));
            setTasks(Array.isArray(taskData) ? taskData.slice(0, 5) : []);

            const monthMap = new Map<string, { month: string; income: number; expense: number; netProfit: number }>();
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
                    amt = (entry.credit || 0) > 0 ? entry.credit : (entry.debit || 0);
                    isDebit = (entry.debit || 0) > 0;
                }

                const cat = entry.accountingCode?.category?.toUpperCase();
                let incomeToAdd = 0;
                let expenseToAdd = 0;

                if (cat === 'INCOME') incomeToAdd = isDebit ? -amt : amt;
                else if (cat === 'EXPENSE' || cat === 'ASSET') expenseToAdd = isDebit ? amt : -amt;
                else {
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

            const chartData = Array.from(monthMap.values()).reverse();
            setMonthlyData(chartData);
            setTotals({ income: totalIncome, expense: totalExpense });

        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleTaskUpdate = async (taskId: string, newStatus: string) => {
        try {
            let feedback = '';
            if (newStatus === 'COMPLETED') {
                feedback = window.prompt('Mission Feedback (Optional):') || '';
            }
            await updateTaskStatus(taskId, newStatus, feedback);
            toast.success('Mission status synchronized');
            fetchDashboardData();
        } catch (err) {
            toast.error('Synchronization failed');
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
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Finance Dashboard', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <BarChart3 size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Finance Command Center
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Institutional oversight of corporate liquidity and fiscal operations.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => navigate('../vouchers')}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Receipt size={14} /> Generate Invoice
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Navigation Shortcuts */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div 
                    onClick={() => navigate('../vouchers')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Receipt size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Voucher Management</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Manage payments & receipts</p>
                </div>

                <div 
                    onClick={() => navigate('../balance-sheet')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Landmark size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Balance Sheet</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>View assets & liabilities</p>
                </div>

                <div 
                    onClick={() => navigate('../taxes')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Calculator size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Tax Management</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Configure tax settings</p>
                </div>

                <div 
                    onClick={() => navigate('../chart-of-accounts')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <BookMarked size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Chart of Accounts</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Manage accounting codes</p>
                </div>

                <div 
                    onClick={() => navigate('../purchase-bills')}
                    className="p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors group-hover:bg-lime/20" style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <Receipt size={20} />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Purchase Bills</h4>
                    <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-dim)' }}>Track vendor bills</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summaryCards.map((card, idx) => (
                    <div key={idx} className="p-8 rounded-2xl border flex flex-col justify-between group transition-all hover:border-white/10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{card.title}</p>
                                <h3 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>
                                    <span className="text-sm text-dim mr-1 opacity-40">$</span>
                                    {card.value}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                                <card.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main Visuals */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Profit/Loss Chart */}
                        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                             <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-lime rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Fiscal Trajectory</h2>
                             </div>
                             
                             <div style={{ width: '100%', height: 300 }}>
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(255,255,255,0.02)'}}
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                                            />
                                            <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                            <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                             </div>
                        </div>

                        {/* Net Profit Trend */}
                        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Net Profit Trend</h2>
                            </div>
                            
                            <div style={{ width: '100%', height: 300 }}>
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                                            />
                                            <Line type="monotone" dataKey="netProfit" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Intelligence (Missions & New Tasks) */}
                <div className="space-y-6">
                    <div className="p-8 rounded-2xl border flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-lime flex items-center gap-2">
                                <Activity size={14} /> Assigned Missions
                            </h2>
                            <span className="text-[9px] font-bold opacity-40">{tasks.length} Active</span>
                        </div>

                        <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar">
                            {tasks.length === 0 ? (
                                <div className="py-12 text-center opacity-20 flex flex-col items-center gap-3">
                                    <List size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Operational Alerts</p>
                                </div>
                            ) : (
                                tasks.map((task) => (
                                    <div key={task._id} className="p-4 rounded-xl border border-white/5 bg-white/5 group hover:border-lime/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-black text-white group-hover:text-lime transition-colors">{task.title}</p>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => handleTaskUpdate(task._id!, 'COMPLETED')}
                                                    className="w-6 h-6 rounded bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 text-[10px] transition-all"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-dim font-medium line-clamp-2 mb-3">{task.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-dim">
                                                {task.status}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-30">
                                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Corporate Sync</p>
                                </div>
                                <p className="text-[10px] leading-relaxed text-dim italic">"Real-time mission tracking enabled. Ensure all fiscal directives from Central Management are acknowledged immediately."</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions (Full Width Table) */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-lime rounded-full" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>Global Transaction Ledger</h2>
                    </div>
                    <button 
                        onClick={() => navigate('../ledger')} 
                        className="text-[10px] font-black uppercase tracking-widest text-lime hover:opacity-70 transition-all px-4 py-2 bg-lime/5 rounded-lg border border-lime/10"
                    >
                        View System Ledger →
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Transaction Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Entry Description</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Fiscal Mapping</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Settlement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {recentEntries.map((entry) => {
                                    const entryDateStr = entry.entryDate || entry.date;
                                    const dateObj = new Date(entryDateStr);
                                    const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : entryDateStr;
                                    const amount = (entry.amount !== undefined && entry.amount !== null) ? entry.amount : ((entry.credit || 0) > 0 ? (entry.credit || 0) : (entry.debit || 0));
                                    const isDebit = (entry.amount !== undefined && entry.amount !== null) ? (entry.type === 'DEBIT') : ((entry.debit || 0) > 0);

                                    return (
                                        <tr key={entry._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-bold text-white">{formattedDate}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-medium text-dim group-hover:text-white transition-colors">{entry.description}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-dim">
                                                        {entry.accountingCode?.code}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-dim">{entry.accountingCode?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className={`text-sm font-black font-mono ${isDebit ? 'text-red-400' : 'text-green-400'}`}>
                                                    {isDebit ? '-' : '+'}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                                <p className="text-[9px] font-black opacity-30 uppercase">{isDebit ? 'Debit Entry' : 'Credit Entry'}</p>
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
