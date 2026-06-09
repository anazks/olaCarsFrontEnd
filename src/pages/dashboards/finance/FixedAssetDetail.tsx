import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, DollarSign, Calendar, Wrench, FileText, Play, Trash2, Edit2, Archive } from 'lucide-react';
import { getFixedAssetById, updateFixedAsset, postDepreciationEntry, deleteFixedAsset } from '../../../services/fixedAssetService';
import type { FixedAsset, FixedAssetStatus } from '../../../services/fixedAssetService';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<FixedAssetStatus, { bg: string; text: string; icon: React.ReactNode }> = {
    'Draft': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <Clock size={14} /> },
    'Pending': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={14} /> },
    'Active': { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={14} /> },
    'Inactive': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', icon: <AlertTriangle size={14} /> }
};

const FixedAssetDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [asset, setAsset] = useState<FixedAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const userRole = getUserRole() || '';
    const isFinancialAdmin = ['admin', 'financeadmin', 'financialadmin'].includes(userRole.toLowerCase());

    const getRolePath = () => {
        const role = userRole.toLowerCase();
        if (role === 'admin') return 'admin';
        return 'financial-admin';
    };

    const fetchAsset = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getFixedAssetById(id);
            setAsset(data);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch asset details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchAsset();
    }, [fetchAsset]);

    // Transition Status (e.g. Activate)
    const handleStatusTransition = async (newStatus: FixedAssetStatus) => {
        if (!asset || !id) return;
        setActionLoading(true);
        try {
            await updateFixedAsset(id, { status: newStatus });
            toast.success(`Asset marked as ${newStatus}`);
            await fetchAsset();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to update asset status');
        } finally {
            setActionLoading(false);
        }
    };

    // Post depreciation schedule entry
    const handlePostDepreciation = async (periodIndex: number) => {
        if (!asset || !id) return;
        if (!window.confirm(`Are you sure you want to post depreciation for Period #${periodIndex}? This will create ledger entries.`)) return;

        setActionLoading(true);
        try {
            await postDepreciationEntry(id, periodIndex);
            toast.success(`Depreciation posted for Period #${periodIndex}!`);
            await fetchAsset();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to post depreciation');
        } finally {
            setActionLoading(false);
        }
    };

    // Delete asset
    const handleDeleteAsset = async () => {
        if (!id || !window.confirm('Are you sure you want to delete this Fixed Asset? This cannot be undone.')) return;
        setActionLoading(true);
        try {
            await deleteFixedAsset(id);
            toast.success('Asset deleted successfully.');
            navigate(`/admin/${getRolePath()}/fixed-assets`);
        } catch (err: any) {
            toast.error('Failed to delete asset.');
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Fixed Assets', path: '#' }, { label: 'Loading...', active: true }]} />
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading asset details...</p>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div className="max-w-2xl mx-auto p-8 rounded-2xl border text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <AlertTriangle size={48} className="mx-auto text-red-500 opacity-50" />
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Asset Not Found</h1>
                <p style={{ color: 'var(--text-dim)' }}>{error || "The fixed asset details couldn't be loaded."}</p>
                <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all cursor-pointer">
                    Back to Registry
                </button>
            </div>
        );
    }

    // Determine the next index to post (first index where status is Pending)
    const sortedSchedule = [...(asset.depreciationSchedule || [])].sort((a, b) => a.periodIndex - b.periodIndex);
    const nextIndexToPost = sortedSchedule.find(e => e.status === 'Pending')?.periodIndex || null;

    // Calculate totals
    const totalDepreciated = sortedSchedule
        .filter(e => e.status === 'Posted')
        .reduce((sum, e) => sum + e.depreciationAmount, 0);

    const bookValue = asset.purchasePrice - totalDepreciated;

    const styles = STATUS_STYLES[asset.status] || STATUS_STYLES.Draft;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <Breadcrumbs items={[
                { label: 'Dashboard', path: '#' },
                { label: 'Fixed Assets', path: `/admin/${getRolePath()}/fixed-assets` },
                { label: asset.code, active: true }
            ]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets`)} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600] cursor-pointer">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                            {asset.name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                style={{ background: styles.bg, color: styles.text, borderColor: styles.text + '33' }}>
                                {styles.icon} {asset.status}
                            </div>
                            <span className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>Code: {asset.code}</span>
                        </div>
                    </div>
                </div>

                {isFinancialAdmin && (
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {asset.status === 'Draft' && (
                            <>
                                <button
                                    onClick={() => handleStatusTransition('Active')}
                                    disabled={actionLoading}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                                    style={{ background: '#C8E600', color: '#111' }}
                                >
                                    <Play size={14} /> Activate Asset
                                </button>
                                <button
                                    onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/new/${asset._id}`)}
                                    disabled={actionLoading}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <Edit2 size={14} /> Edit
                                </button>
                            </>
                        )}
                        {asset.status === 'Active' && (
                            <button
                                onClick={() => handleStatusTransition('Inactive')}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-red-500/20 bg-red-900/10 text-red-400 hover:bg-red-900/20 transition-all cursor-pointer"
                            >
                                <Archive size={14} /> Retire Asset
                            </button>
                        )}
                        {asset.status === 'Inactive' && (
                            <button
                                onClick={() => handleStatusTransition('Active')}
                                disabled={actionLoading}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border border-[#C8E600]/20 bg-[#C8E600]/10 text-[#C8E600] hover:bg-[#C8E600]/20 transition-all cursor-pointer"
                            >
                                <Play size={14} /> Reactivate Asset
                            </button>
                        )}
                        <button
                            onClick={handleDeleteAsset}
                            disabled={actionLoading}
                            className="flex-1 md:flex-none flex items-center justify-center p-2.5 rounded-xl text-red-500 border border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer"
                            title="Delete Asset"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Content Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left side detail panel */}
                <div className="lg:col-span-1 space-y-6">
                    {/* financial values */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Asset Valuation</h2>
                        
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Original Cost</span>
                                <span className="font-bold text-main" style={{ color: 'var(--text-main)' }}>${asset.purchasePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Salvage / Residual Value</span>
                                <span className="font-bold text-main" style={{ color: 'var(--text-main)' }}>${asset.residualValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Depreciated to Date</span>
                                <span className="font-bold text-red-400">-${totalDepreciated.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-1">
                                <span style={{ color: 'var(--text-dim)' }}>Book Value</span>
                                <span className="text-lg font-black text-[#C8E600]">${bookValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* asset properties */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Asset Specifications</h2>

                        <div className="space-y-3 pt-2 text-xs">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Asset Type</span>
                                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{asset.fixedAssetType || 'Vehicles'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Location</span>
                                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{asset.location || 'Head Office'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Serial Number</span>
                                <span className="font-mono font-semibold" style={{ color: 'var(--text-main)' }}>{asset.serialNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Purchase Qty</span>
                                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{asset.purchaseQuantity || 1}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span style={{ color: 'var(--text-dim)' }}>Current Qty</span>
                                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{asset.currentQuantity || 1}</span>
                            </div>
                            {asset.warrantyExpirationDate && (
                                <div className="flex justify-between border-b border-white/5 pb-2">
                                    <span style={{ color: 'var(--text-dim)' }}>Warranty Exp.</span>
                                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{new Date(asset.warrantyExpirationDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            {asset.description && (
                                <div className="pt-1">
                                    <span className="block mb-1 font-bold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Description</span>
                                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-main)' }}>{asset.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* depreciation details */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Depreciation Policy</h2>

                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-[#C8E600]" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Purchase & Start Dates</p>
                                    <p className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                        Purchased: {new Date(asset.purchaseDate).toLocaleDateString()}
                                        {asset.depreciationStartDate && ` | Starts: ${new Date(asset.depreciationStartDate).toLocaleDateString()}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock size={18} className="text-[#C8E600]" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Useful Asset Life</p>
                                    <p className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                        {asset.assetLife ? `${asset.assetLife} ${asset.assetLifeUnit}` : `${asset.usefulLifeYears} Years`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <FileText size={18} className="text-[#C8E600]" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Method & Computation</p>
                                    <p className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                        {asset.depreciationMethod} ({asset.depreciationInterval || 'Monthly'})
                                        {asset.computationType && ` | ${asset.computationType}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ledger accounts */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Ledger Mapping</h2>

                        <div className="space-y-4 pt-2">
                            <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: 'var(--text-dim)' }}>Fixed Asset Account</span>
                                <span className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                    {typeof asset.fixedAssetAccount === 'object' ? `${asset.fixedAssetAccount.code} - ${asset.fixedAssetAccount.name}` : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: 'var(--text-dim)' }}>Accumulated Depreciation</span>
                                <span className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                    {typeof asset.accumulatedDepreciationAccount === 'object' ? `${asset.accumulatedDepreciationAccount.code} - ${asset.accumulatedDepreciationAccount.name}` : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold block" style={{ color: 'var(--text-dim)' }}>Depreciation Expense</span>
                                <span className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>
                                    {typeof asset.depreciationExpenseAccount === 'object' ? `${asset.depreciationExpenseAccount.code} - ${asset.depreciationExpenseAccount.name}` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* asset links */}
                    {(asset.linkedVehicle || asset.originalBill || asset.originalPO) && (
                        <div className="rounded-2xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Relationships</h2>

                            <div className="space-y-4 pt-2">
                                {asset.linkedVehicle && (
                                    <div className="flex items-center gap-3">
                                        <Wrench size={18} className="text-[#C8E600]" />
                                        <div>
                                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Linked Fleet Car</p>
                                            <p className="font-semibold text-xs text-main hover:underline cursor-pointer"
                                                onClick={() => navigate(`/admin/${getRolePath()}/vehicles/${typeof asset.linkedVehicle === 'object' ? asset.linkedVehicle._id : asset.linkedVehicle}`)}
                                                style={{ color: 'var(--text-main)' }}>
                                                {typeof asset.linkedVehicle === 'object' 
                                                    ? `${asset.linkedVehicle.basicDetails?.make} ${asset.linkedVehicle.basicDetails?.model} (${asset.linkedVehicle.legalDocs?.registrationNumber || 'No Plate'})` 
                                                    : 'View Car Details'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {asset.originalBill && (
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-[#C8E600]" />
                                        <div>
                                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Original Invoice Bill</p>
                                            <p className="font-semibold text-xs hover:underline cursor-pointer text-[#C8E600]"
                                                onClick={() => navigate(`/admin/${getRolePath()}/bills/${typeof asset.originalBill === 'object' ? asset.originalBill._id : asset.originalBill}`)}>
                                                {typeof asset.originalBill === 'object' ? asset.originalBill.billNumber : 'View Bill'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {asset.originalPO && (
                                    <div className="flex items-center gap-3">
                                        <FileText size={18} className="text-[#C8E600]" />
                                        <div>
                                            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Purchase Order Ref</p>
                                            <p className="font-semibold text-xs hover:underline cursor-pointer text-[#C8E600]"
                                                onClick={() => navigate(`/admin/${getRolePath()}/purchase-orders/${typeof asset.originalPO === 'object' ? asset.originalPO._id : asset.originalPO}`)}>
                                                {typeof asset.originalPO === 'object' ? asset.originalPO.purchaseOrderNumber : 'View PO'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* notes */}
                    {asset.notes && (
                        <div className="rounded-2xl border p-6 space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-[#C8E600]">Internal Notes</h2>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>{asset.notes}</p>
                        </div>
                    )}
                </div>

                {/* Right side schedule table */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                                <DollarSign size={16} className="text-[#C8E600]" />
                                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Depreciation Schedule</h3>
                            </div>
                            {asset.status === 'Active' && nextIndexToPost && (
                                <span className="text-[10px] px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold">
                                    Next Posting: Period #{nextIndexToPost}
                                </span>
                            )}
                        </div>

                        {sortedSchedule.length === 0 ? (
                            <div className="text-center py-16 text-dim space-y-2" style={{ color: 'var(--text-dim)' }}>
                                <AlertTriangle size={32} className="mx-auto opacity-30 text-gray-500" />
                                <p className="text-xs">Schedule is generated once the asset is marked as Active.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[800px] md:min-w-full">
                                    <thead className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Period</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Date</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Depreciation</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Accumulated</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Book Value</th>
                                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: 'var(--text-dim)' }}>Status</th>
                                            {isFinancialAdmin && asset.status === 'Active' && (
                                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Ledger Posting</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedSchedule.map((entry) => {
                                            const isNextToPost = nextIndexToPost === entry.periodIndex;
                                            const isPosted = entry.status === 'Posted';
                                            return (
                                                <tr key={entry.periodIndex} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-sm" style={{ color: 'var(--text-main)' }}>#{entry.periodIndex}</td>
                                                    <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                        {new Date(entry.periodDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-main)' }}>
                                                        ${entry.depreciationAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                        ${entry.accumulatedDepreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-bold" style={{ color: '#C8E600' }}>
                                                        ${entry.bookValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isPosted ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                        }`}>
                                                            {entry.status}
                                                        </span>
                                                    </td>
                                                    {isFinancialAdmin && asset.status === 'Active' && (
                                                        <td className="px-6 py-4 text-right">
                                                            {isPosted ? (
                                                                <span className="text-[10px] text-dim font-mono" style={{ color: 'var(--text-dim)' }}>
                                                                    Posted on {entry.postedDate ? new Date(entry.postedDate).toLocaleDateString() : 'N/A'}
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handlePostDepreciation(entry.periodIndex)}
                                                                    disabled={!isNextToPost || actionLoading}
                                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                                        isNextToPost 
                                                                            ? 'bg-[#C8E600] text-black hover:scale-105 active:scale-95 shadow-md' 
                                                                            : 'bg-white/5 text-dim border border-white/10 opacity-30 cursor-not-allowed'
                                                                    }`}
                                                                >
                                                                    Post Depreciation
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FixedAssetDetail;
