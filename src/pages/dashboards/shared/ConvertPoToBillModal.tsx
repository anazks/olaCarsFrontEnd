import React, { useState, useEffect } from 'react';
import { X, Receipt, Calendar, User, Landmark, Info, ArrowRight, ChevronDown } from 'lucide-react';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';
import { getAllDrivers, type Driver } from '../../../services/driverService';
import * as billService from '../../../services/billService';

interface ConvertPoToBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (billId: string) => void;
    poId: string;
    poNumber: string;
    items: any[];
    initialSupplier: string | Supplier;
    initialDueDate?: string;
}

const ConvertPoToBillModal: React.FC<ConvertPoToBillModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    poId,
    poNumber,
    items,
    initialSupplier,
    initialDueDate
}) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [accountingCodes, setAccountingCodes] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        supplier: typeof initialSupplier === 'object' ? initialSupplier._id : initialSupplier,
        customer: '', // This refers to Driver in our system
        dueDate: initialDueDate ? new Date(initialDueDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    const [itemAccounts, setItemAccounts] = useState<Record<string, string>>({});

    const [error, setError] = useState<string | null>(null);

    const missingItems = items.filter(item => !item.accountId);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        setFetching(true);
        try {
            const { getAllAccountingCodes } = await import('../../../services/accountingService');
            const [suppRes, drivRes, accRes] = await Promise.all([
                getAllSuppliers(),
                getAllDrivers({ limit: 1000 }),
                getAllAccountingCodes()
            ]);
            setSuppliers(suppRes.data || []);
            setDrivers(drivRes.data || []);
            setAccountingCodes(accRes || []);
        } catch (err) {
            console.error('Failed to fetch modal data:', err);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all items have accounts
        const allItemsAccounted = items.every(item => item.accountId || itemAccounts[item.itemName]);
        if (!allItemsAccounted) {
            setError("Some items are missing an accounting code. Please select one for each.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await billService.convertPoToBill(poId, {
                supplier: formData.supplier,
                customer: formData.customer || undefined,
                dueDate: formData.dueDate,
                itemAccounts: itemAccounts
            });
            if (res.success) {
                onSuccess(res.data._id);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Conversion failed');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-[var(--border-main)] flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-[#C8E600]/10 text-[#C8E600]">
                            <Receipt size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Convert to Bill</h3>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-50" style={{ color: 'var(--text-dim)' }}>PO: {poNumber}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-3">
                            <Info size={16} /> {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Vendor / Supplier */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Vendor / Supplier</label>
                            <div className="relative group">
                                <Landmark size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[#C8E600] transition-all" />
                                <select
                                    required
                                    value={formData.supplier}
                                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] outline-none text-sm focus:ring-2 focus:ring-[#C8E600]/50 transition-all font-bold appearance-none cursor-pointer hover:border-[#C8E600]/30"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <option value="">Select Vendor...</option>
                                    {suppliers.map(s => (
                                        <option key={s._id} value={s._id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Customer / Driver (Optional) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Customer / Driver (Optional)</label>
                            <div className="relative group">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[#C8E600] transition-all" />
                                <select
                                    value={formData.customer}
                                    onChange={e => setFormData({ ...formData, customer: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] outline-none text-sm focus:ring-2 focus:ring-[#C8E600]/50 transition-all font-bold appearance-none cursor-pointer hover:border-[#C8E600]/30"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <option value="">No Customer Associated</option>
                                    {drivers.map(d => (
                                        <option key={d._id} value={d._id}>{d.personalInfo.fullName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Missing Accounting Codes Section */}
                        {missingItems.length > 0 && (
                            <div className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 space-y-4">
                                <div className="flex items-center gap-2 text-yellow-500">
                                    <Info size={16} />
                                    <p className="text-[10px] font-black uppercase tracking-wider">Missing Accounting Codes</p>
                                </div>
                                <p className="text-[10px] opacity-70" style={{ color: 'var(--text-dim)' }}>
                                    The following items are missing an accounting code. Please assign them now to continue.
                                </p>
                                <div className="space-y-4 pt-2">
                                    {missingItems.map((item, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <label className="text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>
                                                {item.itemName} (Qty: {item.quantity})
                                            </label>
                                            <div className="relative group">
                                                <select
                                                    required
                                                    value={itemAccounts[item.itemName] || ''}
                                                    onChange={e => setItemAccounts({ ...itemAccounts, [item.itemName]: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-main)] outline-none text-xs focus:ring-2 focus:ring-yellow-500/50 transition-all font-bold appearance-none cursor-pointer"
                                                    style={{ color: 'var(--text-main)' }}
                                                >
                                                    <option value="">Select Account...</option>
                                                    {accountingCodes.map(code => (
                                                        <option key={code._id} value={code._id}>{code.code} - {code.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Due Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Payment Due Date</label>
                            <div className="relative group">
                                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[#C8E600] transition-all" />
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-main)] outline-none text-sm focus:ring-2 focus:ring-[#C8E600]/50 transition-all font-bold hover:border-[#C8E600]/30"
                                    style={{ color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl text-sm font-bold transition-all hover:bg-white/5 border border-white/10"
                            style={{ color: 'var(--text-dim)' }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || fetching}
                            className="flex-1 py-4 rounded-2xl text-sm font-black transition-all shadow-[0_8px_20px_rgba(200,230,0,0.15)] hover:shadow-[0_8px_30px_rgba(200,230,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Generate Bill <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#C8E600]/5 border border-[#C8E600]/10">
                        <Info size={16} className="text-[#C8E600] shrink-0 mt-0.5" />
                        <p className="text-[10px] leading-relaxed font-medium opacity-60" style={{ color: 'var(--text-dim)' }}>
                            Registering this bill will record a liability in <span className="font-bold text-[#C8E600]">Accounts Payable</span> and update your inventory/expense ledgers.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ConvertPoToBillModal;
