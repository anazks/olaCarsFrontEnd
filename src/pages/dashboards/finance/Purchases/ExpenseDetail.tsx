import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Calendar, Landmark, Tag, FolderOpen, 
    ShoppingBag, User, FileText, Printer, CheckCircle, 
    AlertCircle, RefreshCw
} from 'lucide-react';
import * as expenseService from '../../../../services/expenseService';
import type { Expense } from '../../../../services/expenseService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';

const ExpenseDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [expense, setExpense] = useState<Expense | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isFinancialAdmin = window.location.pathname.includes('/financial-admin');
    const baseDashboardPath = isFinancialAdmin ? '/admin/financial-admin' : '/admin/admin';

    const fetchExpense = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await expenseService.getExpenseById(id);
            setExpense(res.data);
        } catch (err: any) {
            console.error('Failed to load expense:', err);
            setError(err.message || 'Failed to fetch expense details.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchExpense();
    }, [fetchExpense]);

    const printVoucher = () => {
        window.print();
    };

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (loading) {
        return (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-brand-lime" size={32} />
                <span className="text-[10px] font-black tracking-widest text-dim uppercase">Loading Expense Details...</span>
            </div>
        );
    }

    if (error || !expense) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-[2rem] border text-center space-y-4 my-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-rose-500 opacity-60 animate-bounce" />
                <h1 className="text-lg font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Expense Not Found</h1>
                <p className="text-xs font-semibold text-dim">{error || "The expense you are looking for does not exist or has been deleted."}</p>
                <button 
                    onClick={() => navigate(`${baseDashboardPath}/expenses`)} 
                    className="px-6 py-2.5 bg-white/5 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wide hover:bg-white/10 transition-all cursor-pointer"
                    style={{ color: 'var(--text-main)' }}
                >
                    Back to List
                </button>
            </div>
        );
    }

    return (
        <div className="container-responsive max-w-5xl space-y-6 pb-20 select-text">
            {/* Dynamic breadcrumbs context mapping */}
            <Breadcrumbs 
                items={[
                    { label: 'Purchases', path: '#' },
                    { label: 'Expenses', path: `${baseDashboardPath}/expenses` },
                    { label: expense.expenseNumber, active: true }
                ]} 
            />

            {/* Header / Actions row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate(`${baseDashboardPath}/expenses`)} 
                        className="p-2.5 rounded-xl border hover:bg-white/5 active:scale-95 transition-all text-brand-lime cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                {expense.expenseNumber}
                            </h1>
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                Paid (Immediate)
                            </span>
                        </div>
                        <p className="text-[10px] font-semibold text-dim mt-0.5">Recorded operational cash/bank transaction voucher</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={printVoucher}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-sm border hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Printer size={13} /> Print Voucher
                    </button>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Voucher Sheet */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Amount Banner */}
                    <div className="rounded-[2rem] p-8 border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-hidden shadow-sm" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.12)' }}>
                        <div className="space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim opacity-50">Transaction Value</span>
                            <p className="text-4xl font-black text-emerald-500 tracking-tight">${fmt(expense.amount)}</p>
                        </div>
                        <div className="font-medium text-right sm:text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim opacity-50 block">Payment Date</span>
                            <span className="text-xs font-bold text-white mt-1 block" style={{ color: 'var(--text-main)' }}>
                                {new Date(expense.expenseDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Accountant Double Entry Ledger Leg Details */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">General Ledger Journal Entry</h3>
                        <div className="border rounded-[2rem] overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <table className="w-full border-collapse text-left text-xs">
                                <thead style={{ background: 'rgba(0,0,0,0.08)', borderColor: 'var(--border-main)' }}>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <th className="py-4 px-6 font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Account Details</th>
                                        <th className="py-4 px-6 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                        <th className="py-4 px-6 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {/* Debit Line */}
                                    <tr className="border-b border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs" style={{ color: 'var(--text-main)' }}>{expense.expenseAccount?.name}</span>
                                                <span className="text-[9px] font-black uppercase text-brand-lime mt-0.5">{expense.expenseAccount?.code}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-emerald-500 font-black text-sm">${fmt(expense.amount)}</td>
                                        <td className="py-4 px-6 text-right font-mono text-dim opacity-40">—</td>
                                    </tr>
                                    {/* Credit Line */}
                                    <tr className="border-b border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-xs" style={{ color: 'var(--text-main)' }}>{expense.paidThroughAccount?.name}</span>
                                                <span className="text-[9px] font-black uppercase text-rose-400 mt-0.5">{expense.paidThroughAccount?.code}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono text-dim opacity-40">—</td>
                                        <td className="py-4 px-6 text-right font-mono text-rose-400 font-black text-sm">${fmt(expense.amount)}</td>
                                    </tr>
                                    {/* Totals */}
                                    <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                                        <td className="py-4 px-6 font-black uppercase tracking-wider text-[9px] text-dim">Balanced Ledger Total</td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-emerald-500 text-sm border-t" style={{ borderColor: 'var(--border-main)' }}>${fmt(expense.amount)}</td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-rose-400 text-sm border-t" style={{ borderColor: 'var(--border-main)' }}>${fmt(expense.amount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Memo / Notes Card */}
                    <div className="p-6 rounded-[2rem] border space-y-2.5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-dim opacity-60 flex items-center gap-1.5">
                            <FileText size={12} className="text-brand-lime" /> Notes / Memo
                        </h4>
                        <p className="text-xs text-white/90 leading-relaxed font-semibold" style={{ color: 'var(--text-main)' }}>
                            {expense.notes || 'No description memo recorded for this immediate cash/bank operational expense.'}
                        </p>
                    </div>

                </div>

                {/* Sidebar Details Panel */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">Transactional Context</h3>
                    
                    <div className="p-6 rounded-[2rem] border space-y-5 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        
                        {/* Branch */}
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FolderOpen size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Allocated Branch</span>
                                <span className="text-xs font-bold text-white mt-0.5 leading-tight" style={{ color: 'var(--text-main)' }}>
                                    {expense.branch?.name}
                                </span>
                                <span className="text-[9px] font-black uppercase text-brand-lime mt-0.5">{expense.branch?.code}</span>
                            </div>
                        </div>

                        {/* Vendor/Supplier */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <ShoppingBag size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Linked Vendor / Supplier</span>
                                {expense.supplier ? (
                                    <span className="text-xs font-bold text-white mt-0.5 leading-tight" style={{ color: 'var(--text-main)' }}>
                                        {expense.supplier?.name}
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-dim italic opacity-50 mt-0.5">No vendor associated</span>
                                )}
                            </div>
                        </div>

                        {/* Customer/Driver */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <User size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">Linked Customer / Driver</span>
                                {expense.customer ? (
                                    <span className="text-xs font-bold text-white mt-0.5 leading-tight" style={{ color: 'var(--text-main)' }}>
                                        {expense.customer?.name || expense.customer?.firstName}
                                    </span>
                                ) : (
                                    <span className="text-xs font-semibold text-dim italic opacity-50 mt-0.5">No customer associated</span>
                                )}
                            </div>
                        </div>

                        {/* Audit Details */}
                        <div className="flex items-start gap-3 border-t border-white/5 pt-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Calendar size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-dim opacity-60">System Registration</span>
                                <span className="text-[10px] font-semibold text-dim mt-0.5">
                                    Logged: {new Date(expense.createdAt).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-semibold text-dim mt-0.5">
                                    Last Updated: {new Date(expense.updatedAt).toLocaleString()}
                                </span>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExpenseDetail;
