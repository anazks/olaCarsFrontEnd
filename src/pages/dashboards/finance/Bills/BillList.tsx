import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Receipt, 
    Search, 
    Filter, 
    ChevronRight, 
    Clock, 
    CheckCircle, 
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Plus
} from 'lucide-react';
import * as billService from '../../../../services/billService';
import type { Bill } from '../../../../services/billService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import CreateBillModal from './CreateBillModal';

const BillList = () => {
    const navigate = useNavigate();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await billService.getAllBills();
            setBills(res.data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch bills');
        } finally {
            setLoading(false);
        }
    };

    const statusColors: any = {
        OPEN: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={14} /> },
        PARTIALLY_PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <ArrowUpRight size={14} /> },
        PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={14} /> },
        VOID: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <AlertCircle size={14} /> }
    };

    const filteredBills = bills.filter(b => 
        b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        (typeof b.supplier === 'object' && b.supplier.name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '/admin/financial-admin' }, { label: 'Bills', active: true }]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Purchase Bills</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Manage and track your supplier bills</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-lg cursor-pointer"
                    style={{ background: '#C8E600', color: '#111' }}
                >
                    <Plus size={16} /> Create Bill
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                    <input
                        type="text"
                        placeholder="Search by bill number or supplier..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-[#C8E600]/50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <button className="px-6 py-3 rounded-2xl border flex items-center gap-2 font-bold transition-all hover:bg-white/5" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    <Filter size={18} /> Filters
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                    <p style={{ color: 'var(--text-dim)' }}>Loading bills...</p>
                </div>
            ) : filteredBills.length === 0 ? (
                <div className="py-20 text-center border rounded-3xl" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                    <Receipt size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold" style={{ color: 'var(--text-main)' }}>No bills found</p>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredBills.map((bill) => {
                        const s = statusColors[bill.status] || statusColors.OPEN;
                        return (
                            <div 
                                key={bill._id}
                                onClick={() => navigate(`${bill._id}`)}
                                className="group p-5 rounded-3xl border transition-all hover:scale-[1.01] active:scale-95 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                        <Receipt size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{bill.billNumber}</h3>
                                        <p className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                            {typeof bill.supplier === 'object' ? bill.supplier.name : 'Unknown Supplier'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:flex items-center gap-8 w-full md:w-auto">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Bill Date</p>
                                        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                            <Calendar size={12} className="opacity-50" />
                                            {new Date(bill.billDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-right md:text-left">
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Total Amount</p>
                                        <p className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                                            ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-black tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Balance Due</p>
                                        <p className="text-sm font-black text-[#C8E600]">
                                            ${bill.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-end">
                                        <div className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border"
                                            style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                            {s.icon} {bill.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                    <div className="hidden md:block pl-4 opacity-0 group-hover:opacity-100 transition-all">
                                        <ChevronRight size={20} style={{ color: 'var(--text-dim)' }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <CreateBillModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchBills}
            />
        </div>
    );
};

export default BillList;
