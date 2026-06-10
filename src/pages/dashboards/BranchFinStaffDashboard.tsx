import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Receipt, Calculator, AlertCircle, ClipboardList, RefreshCw, BarChart3, Eye, CheckCircle } from 'lucide-react';
import { getLedgerEntries } from '../../services/ledgerService';
import { getTasks } from '../../services/taskService';
import type { StaffTask } from '../../services/taskService';
import { getUser } from '../../utils/auth';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getAllPurchaseOrders, approveRejectPurchaseOrder } from '../../services/purchaseOrderService';
import type { PurchaseOrder } from '../../services/purchaseOrderService';

const BranchFinStaffDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        cashOnHand: 0,
        pendingInvoices: 0,
        todaysRevenue: 0,
        discrepancy: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
    const user = getUser();

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const branchId = user?.branchId;
            if (!branchId) return;

            const [ledgerRes, taskData, poRes] = await Promise.all([
                getLedgerEntries({ branchId, limit: 500 }),
                getTasks({ assignedTo: user?.id || user?._id }),
                getAllPurchaseOrders({ status: 'PENDING_FINANCE_APPROVAL', limit: 1000 }).catch((err) => {
                    console.error("BranchFinStaffDashboard: Fetch POs failed:", err);
                    return { data: [] as PurchaseOrder[] };
                })
            ]);

            console.log("BranchFinStaffDashboard: PENDING_FINANCE_APPROVAL POs response:", poRes);
            const ledgerData = Array.isArray(ledgerRes) ? ledgerRes : (ledgerRes as any).data || [];
            const poList = Array.isArray(poRes?.data) ? poRes.data : (Array.isArray(poRes) ? poRes : []);
            setPendingPOs(poList);
            
            let cash = 0;
            let pending = 0;
            let todayRev = 0;
            const today = new Date().toISOString().split('T')[0];

            ledgerData.forEach((tx: any) => {
                const amt = tx.amount || 0;
                const date = (tx.entryDate || tx.createdAt || '').split('T')[0];
                const cat = tx.accountingCode?.category?.toUpperCase();
                const txStatus = tx.transaction?.status || 'UNKNOWN';

                if (['COMPLETED', 'CLEARED'].includes(txStatus) && cat === 'INCOME') {
                    cash += amt;
                    if (date === today) todayRev += amt;
                }
                if (txStatus === 'PENDING') pending++;
            });

            setStats({
                cashOnHand: cash,
                pendingInvoices: pending,
                todaysRevenue: todayRev,
                discrepancy: 0
            });

            setTransactions(ledgerData.slice(0, 15));
            const taskList = Array.isArray(taskData?.data) ? taskData.data : (Array.isArray(taskData) ? taskData : []);
            setTasks(taskList);

        } catch (error) {
            console.error("Branch Finance Dashboard Fetch Error:", error);
            toast.error("Critical synchronization error");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickApprovePO = async (poId: string) => {
        if (!window.confirm('Are you sure you want to approve this purchase order?')) return;
        try {
            await approveRejectPurchaseOrder(poId, { status: 'APPROVED' });
            toast.success('Purchase order approved successfully');
            fetchDashboardData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Approval failed');
        }
    };


    useEffect(() => {
        fetchDashboardData();
    }, []);

    const summaryCards = [
        {
            title: t('dashboards.branchFin.stats.cashOnHand'),
            value: `$${stats.cashOnHand.toLocaleString()}`,
            icon: Wallet,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.1)',
            onClick: undefined
        },
        {
            title: 'Pending Invoices',
            value: stats.pendingInvoices.toString(),
            icon: Receipt,
            color: '#ef4444',
            bg: 'rgba(239,68,68,0.1)',
            onClick: undefined
        },
        {
            title: 'Daily Collection',
            value: `$${stats.todaysRevenue.toLocaleString()}`,
            icon: Calculator,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.1)',
            onClick: undefined
        },
        {
            title: 'Reconciliation',
            value: stats.discrepancy.toString(),
            icon: AlertCircle,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.1)',
            onClick: undefined
        },
        {
            title: 'Assigned Missions',
            value: tasks.length.toString(),
            icon: ClipboardList,
            color: '#a855f7',
            bg: 'rgba(168,85,247,0.1)',
            onClick: () => navigate('my-tasks')
        }
    ];

    if (loading && transactions.length === 0) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <div className="p-2.5 rounded-xl" style={{ background: 'var(--brand-lime)', color: '#000' }}>
                            <BarChart3 size={24} />
                        </div>
                        {t('dashboards.branchFin.title')}
                    </h1>
                    <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-dim)' }}>
                        {t('dashboards.branchFin.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => navigate('invoices')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-lime text-black text-[11px] font-black uppercase tracking-widest shadow-xl shadow-lime/20 hover:scale-105 transition-all"
                    >
                        <Receipt size={16} /> Generate Invoice
                    </button>
                    <button
                        onClick={fetchDashboardData}
                        className="p-3 rounded-xl border border-white/5 transition-all hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {summaryCards.map((card, idx) => (
                    <div
                        key={idx}
                        onClick={card.onClick}
                        className={`p-6 rounded-2xl border flex flex-col justify-between group transition-all hover:border-white/10 ${card.onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{card.title}</p>
                                <h3 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{card.value}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                                <card.icon size={20} />
                            </div>
                        </div>
                        {card.onClick && (
                            <p className="text-[9px] font-black uppercase tracking-widest mt-3 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: card.color }}>View all →</p>
                        )}
                    </div>
                ))}
            </div>



            {/* Purchase Orders Pending Finance Approval */}
            {pendingPOs.length > 0 && (
                <div className="rounded-2xl border overflow-hidden mb-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-lime rounded-full" />
                            <h2 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>POs Awaiting Finance Approval</h2>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">PO Number</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Supplier</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Date</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Amount</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {pendingPOs.map((po) => (
                                    <tr key={po._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-black text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`purchase-orders/${po._id}`)}>
                                                {po.purchaseOrderNumber}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-medium text-dim">{typeof po.supplier === 'object' ? po.supplier.name : 'Unknown Supplier'}</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-medium text-dim">{new Date(po.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                                                ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <div className="flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`purchase-orders/${po._id}`)}
                                                    className="p-2 bg-white/5 border border-white/10 text-dim hover:text-brand-lime rounded-xl transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleQuickApprovePO(po._id)}
                                                    className="p-2 bg-white/5 border border-white/10 text-dim hover:text-emerald-400 rounded-xl transition-all"
                                                    title="Approve PO"
                                                >
                                                    <CheckCircle size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Global Transaction Ledger */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-lime rounded-full" />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>Global Transaction Ledger</h2>
                    </div>
                    <button 
                        onClick={() => navigate('ledger')} 
                        className="text-[10px] font-black uppercase tracking-widest text-lime hover:opacity-70 transition-all px-4 py-2 bg-lime/5 rounded-lg border border-lime/10"
                    >
                        View System Ledger →
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Transaction Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Entry Description</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Settlement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {transactions.map((tx) => {
                                const entryDateStr = tx.entryDate || tx.createdAt || tx.date;
                                const dateObj = new Date(entryDateStr);
                                const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : entryDateStr;
                                const isIncome = tx.accountingCode?.category?.toUpperCase() === 'INCOME';

                                return (
                                <tr key={tx?._id || Math.random().toString()} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{formattedDate}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs font-medium text-dim transition-colors">{tx?.description || 'System Entry'}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-mono text-dim">#{tx?._id?.slice(-6).toUpperCase() || 'TX'}</span>
                                        </div>
                                    </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className={`text-sm font-black font-mono ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                                                {isIncome ? '+' : '-'}${(tx.amount || 0).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">No Historical Data Synchronized</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BranchFinStaffDashboard;
