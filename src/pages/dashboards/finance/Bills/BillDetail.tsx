import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    ArrowLeft,
    Receipt,
    Calendar,
    Landmark,
    Clock,
    CheckCircle,
    AlertCircle,
    CreditCard,
    FileText,
    History,
    Package,
    ArrowUpRight
} from 'lucide-react';
import * as billService from '../../../../services/billService';
import type { Bill } from '../../../../services/billService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import RecordPaymentModal from './RecordPaymentModal';
import type { RootState } from '../../../../store';
import { setFinanceDashboardData } from '../../../../store/dashboardSlice';

const BillDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const financeState = useSelector((state: RootState) => state.dashboard.finance);
    const financeStateRef = useRef(financeState);

    // Keep ref updated with latest store values
    useEffect(() => {
        financeStateRef.current = financeState;
    }, [financeState]);

    const [bill, setBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const fetchBill = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await billService.getBillById(id);
            const fetchedBill = res.data;
            setBill(fetchedBill);

            // Sync to Redux cache if loaded
            const currentFinanceState = financeStateRef.current;
            if (currentFinanceState.isLoaded && fetchedBill) {
                const updatedBills = currentFinanceState.liveData.bills.map((b: any) =>
                    b._id === fetchedBill._id ? { ...b, ...fetchedBill } : b
                );
                dispatch(setFinanceDashboardData({
                    liveData: {
                        ...currentFinanceState.liveData,
                        bills: updatedBills
                    }
                }));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch bill');
        } finally {
            setLoading(false);
        }
    }, [id, dispatch]);

    useEffect(() => {
        fetchBill();
    }, [fetchBill]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading bill details...</p>
            </div>
        );
    }

    if (error || !bill) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-3xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertCircle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Bill Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The bill you're looking for doesn't exist."}</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    Back to List
                </button>
            </div>
        );
    }

    const statusColors: any = {
        OPEN: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={16} /> },
        PARTIALLY_PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <ArrowUpRight size={16} /> },
        PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={16} /> },
        VOID: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <AlertCircle size={16} /> }
    };

    const s = statusColors[bill.status] || statusColors.OPEN;

    return (
        <div className="space-y-6 pb-20">
            <Breadcrumbs items={[
                { label: 'Dashboard', path: '/admin/financial-admin' },
                { label: 'Bills', path: '/admin/financial-admin/bills' },
                { label: bill.billNumber, active: true }
            ]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600]">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>{bill.billNumber}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                {s.icon} {bill.status.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                </div>

                {bill.status !== 'PAID' && bill.status !== 'VOID' && (
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
                        style={{ background: '#C8E600', color: '#111' }}
                    >
                        <CreditCard size={18} /> Record Payment
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card */}
                    <div className="rounded-3xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Supplier</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {typeof bill.supplier === 'object' ? bill.supplier.name : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Purchase Order</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {bill.purchaseOrder && typeof bill.purchaseOrder === 'object' ? bill.purchaseOrder.purchaseOrderNumber : 'Standalone Bill'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Due Date</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'Not Specified'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-[#C8E600]">
                                    <Package size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Branch</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                                        {typeof bill.branch === 'object' ? bill.branch.name : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <FileText size={16} className="text-[#C8E600]" />
                            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Bill Items</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Item & Account</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Price</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Qty</th>
                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {bill.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{item.itemName}</div>
                                            <div className="text-[10px] mt-1 text-[#C8E600] font-black uppercase tracking-widest">
                                                {item.accountId && typeof item.accountId === 'object' ? `${item.accountId.code} - ${item.accountId.name}` : 'Unknown Account'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>${item.unitPrice.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>{item.quantity}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-right" style={{ color: 'var(--text-main)' }}>
                                            ${(item.unitPrice * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="rounded-3xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payment Summary</h3>
                        <div className="space-y-4">
                            {bill.isInclusiveTax && bill.taxAmount !== undefined && bill.taxAmount > 0 ? (
                                <>
                                    <div className="flex justify-between items-center text-sm">
                                        <span style={{ color: 'var(--text-dim)' }}>Amount (excl. Tax)</span>
                                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                            ${(bill.totalAmount - bill.taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span style={{ color: 'var(--text-dim)' }}>
                                            Tax Amount ({bill.taxPercentage || 0}% {bill.taxId && typeof bill.taxId === 'object' ? bill.taxId.name : ''})
                                        </span>
                                        <span className="font-bold text-[#C8E600]">
                                            ${bill.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                                        <span style={{ color: 'var(--text-dim)' }}>Total (incl. Tax)</span>
                                        <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                            ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between items-center text-sm">
                                    <span style={{ color: 'var(--text-dim)' }}>Total Amount</span>
                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                        ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-sm">
                                <span style={{ color: 'var(--text-dim)' }}>Amount Paid</span>
                                <span className="font-bold text-green-500">-${bill.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="font-bold" style={{ color: 'var(--text-main)' }}>Balance Due</span>
                                <span className="text-2xl font-black text-[#C8E600]">${bill.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-3xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase" style={{ color: '#C8E600' }}>
                            <History size={14} /> Audit Info
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Created At</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{new Date(bill.createdAt).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Last Updated</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{new Date(bill.updatedAt).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <RecordPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSuccess={fetchBill}
                bill={bill}
            />
        </div>
    );
};

export default BillDetail;
