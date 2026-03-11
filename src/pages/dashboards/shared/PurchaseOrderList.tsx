import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, FileText, AlertTriangle, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getAllPurchaseOrders } from '../../../services/purchaseOrderService';
import type { PurchaseOrder, POStatus } from '../../../services/purchaseOrderService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';

const StatusBadge = ({ status }: { status: POStatus }) => {
    const styles = {
        WAITING: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: <Clock size={12} />
        },
        APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
            icon: <CheckCircle size={12} />
        },
        REJECTED: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
            icon: <XCircle size={12} />
        }
    };

    const style = styles[status];

    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {style.icon}
            {status}
        </div>
    );
};

const PurchaseOrderList = () => {
    const [pos, setPos] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<POStatus | 'ALL'>('ALL');
    const navigate = useNavigate();
    const userRole = getUserRole();
    const canCreate = userRole === 'branchmanager' || userRole === 'countrymanager';

    const fetchPOs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllPurchaseOrders();
            setPos(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch purchase orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPOs();
    }, [fetchPOs]);

    const filteredPOs = pos.filter((po) => {
        const matchesSearch =
            po.purchaseOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (typeof po.supplier === 'object' ? po.supplier.name : '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (typeof po.branch === 'object' ? po.branch.name : '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <FileText size={28} style={{ color: '#C8E600' }} />
                        Purchase Orders
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Create and manage inventory purchase requests</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchPOs}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => navigate('create')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Plus size={18} /> Create PO
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by PO#, supplier, or branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="WAITING">Waiting</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                </select>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredPOs.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <FileText size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No purchase orders found</p>
                            <p className="text-sm mt-1">Try adjusting your filters or create a new PO</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>PO Number</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Purpose</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Total Amount</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Supplier</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPOs.map((po) => (
                                    <tr
                                        key={po._id}
                                        className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold font-medium" style={{ color: 'var(--text-main)' }}>{po.purchaseOrderNumber}</div>
                                            {po.isEdited && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-1 inline-block">EDITED</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={po.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-medium px-2 py-1 rounded-md inline-block" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-main)' }}>
                                                {po.purpose || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                ${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm" style={{ color: 'var(--text-main)' }}>
                                                {typeof po.supplier === 'object' ? po.supplier.name : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm" style={{ color: 'var(--text-main)' }}>
                                                {typeof po.branch === 'object' ? po.branch.name : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {new Date(po.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(po._id)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-lime/20"
                                                    style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600' }}
                                                    title="View Details"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderList;
