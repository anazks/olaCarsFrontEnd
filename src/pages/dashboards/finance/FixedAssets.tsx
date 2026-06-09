import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Layers, Clipboard, AlertTriangle, ArrowUpRight, Search } from 'lucide-react';
import { getAllFixedAssets } from '../../../services/fixedAssetService';
import type { FixedAsset } from '../../../services/fixedAssetService';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'Draft': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.3)' }, // Gray
    'Pending': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }, // Yellow/Orange
    'Active': { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' }, // Green
    'Inactive': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }, // Red
};

const FixedAssets = () => {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const userRole = getUserRole() || '';
    const isFinancialAdmin = ['admin', 'financeadmin', 'financialadmin'].includes(userRole.toLowerCase());

    const getRolePath = () => {
        const role = userRole.toLowerCase();
        if (role === 'admin') return 'admin';
        return 'financial-admin';
    };

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const data = await getAllFixedAssets(params);
            setAssets(data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch fixed assets');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAssets();
        }, searchQuery ? 400 : 0);
        return () => clearTimeout(timer);
    }, [fetchAssets, searchQuery, statusFilter]);

    const getBookValue = (asset: FixedAsset) => {
        if (asset.depreciationSchedule && asset.depreciationSchedule.length > 0) {
            // Find last posted entry
            const posted = asset.depreciationSchedule
                .filter(e => e.status === 'Posted')
                .sort((a, b) => b.periodIndex - a.periodIndex);
            if (posted.length > 0) return posted[0].bookValue;
        }
        return asset.purchasePrice;
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Fixed Assets', active: true }]} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Layers size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Fixed Assets
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Track capitalization, residual value, and run depreciation schedules</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchAssets}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isFinancialAdmin && (
                        <button
                            onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/new`)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} /> Capitalize Asset
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border p-4 rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by asset name or code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-colors focus:ring-1 focus:ring-lime"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="flex gap-1 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
                    {['ALL', 'Draft', 'Pending', 'Active', 'Inactive'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                            style={{
                                background: statusFilter === status ? '#C8E600' : 'rgba(255,255,255,0.02)',
                                color: statusFilter === status ? '#000' : 'var(--text-dim)',
                                border: statusFilter === status ? '1px solid #C8E600' : '1px solid var(--border-main)',
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assets Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-3 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading asset registry...</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="text-center py-20 border rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <Clipboard size={40} className="mx-auto text-gray-600 opacity-40" />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>No Fixed Assets Found</h3>
                    <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-dim)' }}>
                        Draft assets are created automatically when bills are paid or purchase orders are received. You can also capitalize assets manually.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Asset Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Purchase Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Useful Life</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Original Cost</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Book Value</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assets.map((asset) => {
                                const styles = STATUS_STYLES[asset.status] || STATUS_STYLES.Draft;
                                const originalCost = asset.purchasePrice;
                                const bookValue = getBookValue(asset);
                                return (
                                    <tr
                                        key={asset._id}
                                        onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/${asset._id}`)}
                                        className="hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{asset.name}</div>
                                            <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>{asset.code}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                            {typeof asset.fixedAssetAccount === 'object' ? asset.fixedAssetAccount.name : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(asset.purchaseDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {asset.usefulLifeYears} Years ({asset.depreciationInterval})
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                            ${originalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold" style={{ color: '#C8E600' }}>
                                            ${bookValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                                                style={{ background: styles.bg, color: styles.text, borderColor: styles.border }}
                                            >
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/${asset._id}`)}
                                                className="p-2 bg-white/5 rounded-xl border border-white/10 hover:border-[#C8E600] text-dim hover:text-[#C8E600] transition-all cursor-pointer"
                                            >
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FixedAssets;
