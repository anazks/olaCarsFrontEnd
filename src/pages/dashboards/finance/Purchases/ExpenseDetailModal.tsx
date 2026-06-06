import { X, FolderOpen, User, ShoppingBag, Landmark, Tag, FileText, Printer, CheckCircle } from 'lucide-react';
import type { Expense } from '../../../../services/expenseService';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

interface Props {
    expense: Expense | null;
    onClose: () => void;
}

const ExpenseDetailModal = ({ expense, onClose }: Props) => {
    if (!expense) return null;

    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const printVoucher = async () => {
        if (!expense) return;
        const toastId = toast.loading("Preparing print layout...");
        try {
            const res = await api.get(`/api/expenses/${expense._id}/pdf`, { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            iframe.src = url;
            
            document.body.appendChild(iframe);
            
            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    window.URL.revokeObjectURL(url);
                }, 1000);
            };
            
            toast.success("Print dialog opened successfully", { id: toastId });
        } catch (err: any) {
            console.error("Failed to print PDF:", err);
            toast.error("Failed generating expense PDF document.", { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl max-h-[92vh] flex flex-col border rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* Header Actions */}
                <div className="flex items-center justify-between px-8 py-5 border-b flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <CheckCircle size={16} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black tracking-widest uppercase text-dim opacity-70">Expense Voucher</h2>
                            <p className="text-sm font-black text-white" style={{ color: 'var(--text-main)' }}>{expense.expenseNumber}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={printVoucher}
                            className="p-2.5 rounded-xl border hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            title="Print Voucher"
                        >
                            <Printer size={14} />
                        </button>
                        <button 
                            onClick={onClose} 
                            className="p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-colors" 
                            style={{ color: 'var(--text-dim)' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6 select-text">
                    
                    {/* Hero Amount Paid */}
                    <div className="relative rounded-3xl p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden" style={{ background: 'rgba(16, 185, 129, 0.04)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                        <div className="space-y-1">
                            <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                PAID (Immediate)
                            </span>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-dim mt-1.5 opacity-60">Amount Paid Through Cash/Bank</h3>
                            <p className="text-3xl font-black text-emerald-500">${fmt(expense.amount)}</p>
                        </div>
                        <div className="text-right sm:text-right font-medium">
                            <p className="text-[10px] font-black uppercase text-dim opacity-60">Date of Expense</p>
                            <p className="text-xs font-bold text-white mt-0.5" style={{ color: 'var(--text-main)' }}>
                                {new Date(expense.expenseDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Accounting Legs */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">Accounting Definition</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0">
                                        <Tag size={13} className="text-brand-lime" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-dim opacity-60">Debit Account (Expense Type)</span>
                                        <span className="text-xs font-bold text-white leading-tight" style={{ color: 'var(--text-main)' }}>
                                            {expense.expenseAccount?.code} — {expense.expenseAccount?.name}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-[#C8E600]/10 border border-[#C8E600]/20 flex items-center justify-center flex-shrink-0">
                                        <Landmark size={13} className="text-[#C8E600]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-dim opacity-60">Paid Through (Credit Account)</span>
                                        <span className="text-xs font-bold text-white leading-tight" style={{ color: 'var(--text-main)' }}>
                                            {expense.paidThroughAccount?.code} — {expense.paidThroughAccount?.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Operational Context */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">Operational details</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <FolderOpen size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase text-dim opacity-60">Branch Office</span>
                                        <span className="text-xs font-bold text-white leading-tight" style={{ color: 'var(--text-main)' }}>
                                            {expense.branch?.name} ({expense.branch?.code})
                                        </span>
                                    </div>
                                </div>
                                {expense.supplier && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                            <ShoppingBag size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-dim opacity-60">Vendor / Supplier</span>
                                            <span className="text-xs font-bold text-white leading-tight" style={{ color: 'var(--text-main)' }}>
                                                {expense.supplier?.name}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {expense.customer && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                            <User size={13} className="text-dim" style={{ color: 'var(--text-dim)' }} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase text-dim opacity-60">Customer / Driver</span>
                                            <span className="text-xs font-bold text-white leading-tight" style={{ color: 'var(--text-main)' }}>
                                                {expense.customer?.name || expense.customer?.firstName}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description Notes */}
                    <div className="space-y-2 p-5 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <h4 className="text-[9px] font-black uppercase tracking-widest text-dim opacity-60 flex items-center gap-1.5">
                            <FileText size={11} /> Notes / Memo
                        </h4>
                        <p className="text-xs text-white/90 leading-relaxed font-semibold" style={{ color: 'var(--text-main)' }}>
                            {expense.notes || 'No description notes logged for this immediate expense.'}
                        </p>
                    </div>

                    {/* Accountant Double Entry Ledger Leg Details */}
                    <div className="space-y-3.5 pt-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-dim opacity-60">General Ledger Journal Detail</h4>
                        <div className="border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                            <table className="w-full border-collapse text-left text-xs">
                                <thead style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-main)' }}>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <th className="py-3 px-4 font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Account</th>
                                        <th className="py-3 px-4 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Debit</th>
                                        <th className="py-3 px-4 text-right font-bold text-[9px] uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                    {/* Debit Line */}
                                    <tr className="border-b border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white" style={{ color: 'var(--text-main)' }}>{expense.expenseAccount?.name}</span>
                                                <span className="text-[9px] font-black uppercase text-brand-lime">{expense.expenseAccount?.code}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono text-emerald-500 font-bold">${fmt(expense.amount)}</td>
                                        <td className="py-3.5 px-4 text-right font-mono text-dim opacity-40">—</td>
                                    </tr>
                                    {/* Credit Line */}
                                    <tr>
                                        <td className="py-3.5 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white" style={{ color: 'var(--text-main)' }}>{expense.paidThroughAccount?.name}</span>
                                                <span className="text-[9px] font-black uppercase text-rose-400">{expense.paidThroughAccount?.code}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono text-dim opacity-40">—</td>
                                        <td className="py-3.5 px-4 text-right font-mono text-rose-400 font-bold">${fmt(expense.amount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>

                {/* Footer close */}
                <div className="px-8 py-5 border-t flex justify-end gap-3 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)', borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ExpenseDetailModal;
