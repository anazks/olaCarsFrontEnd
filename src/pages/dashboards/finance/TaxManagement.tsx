import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Calculator, AlertTriangle, Check, X } from 'lucide-react';
import { getAllTaxes, createTax, updateTaxStatus, updateTax } from '../../../services/taxService';
import type { Tax, CreateTaxPayload } from '../../../services/taxService';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const TaxManagement = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddRouteActive, setIsAddRouteActive] = useState(false);
    
    // Add/Edit Form State
    const [newTax, setNewTax] = useState<CreateTaxPayload>({ name: '', rate: 0 });
    const [creating, setCreating] = useState(false);
    const [editingTaxId, setEditingTaxId] = useState<string | null>(null);

    const userRole = getUserRole() || '';
    const canManageTaxes = ['admin', 'financialadmin'].includes(userRole);

    const fetchTaxes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllTaxes();
            setTaxes(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch taxes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTaxes();
    }, [fetchTaxes]);

    const handleCreateTax = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            await createTax(newTax);
            setNewTax({ name: '', rate: 0 });
            setIsAddRouteActive(false);
            await fetchTaxes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create tax');
        } finally {
            setCreating(false);
        }
    };

    const handleEditTax = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTaxId) return;
        setCreating(true);
        setError(null);
        try {
            await updateTax(editingTaxId, { name: newTax.name, rate: newTax.rate });
            setNewTax({ name: '', rate: 0 });
            setEditingTaxId(null);
            setIsAddRouteActive(false);
            await fetchTaxes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update tax');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        if (!canManageTaxes) return;
        try {
            await updateTaxStatus(id, !currentStatus);
            await fetchTaxes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update tax status');
        }
    };

    return (
        <div className={isEmbedded ? "space-y-6" : "container-responsive space-y-6"}>
            {!isEmbedded && <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Tax Management', active: true }]} />}

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Calculator size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Tax Management
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Manage tax profiles and percentage rates</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchTaxes}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {canManageTaxes && !isAddRouteActive && (
                        <button
                            onClick={() => setIsAddRouteActive(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} /> Add Tax Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {isAddRouteActive && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                            {editingTaxId ? 'Edit Tax Profile' : 'Add New Tax Profile'}
                        </h2>
                        <button onClick={() => { setIsAddRouteActive(false); setEditingTaxId(null); setNewTax({ name: '', rate: 0 }); }} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={editingTaxId ? handleEditTax : handleCreateTax} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Profile Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. VAT 15%"
                                    value={newTax.name}
                                    onChange={e => setNewTax({ ...newTax, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Rate (%)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Enter percentage (e.g. 15)"
                                    value={newTax.rate || ''}
                                    onChange={e => setNewTax({ ...newTax, rate: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Enter as whole percentages (e.g., 15 for 15%)</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {creating ? (editingTaxId ? 'Saving...' : 'Creating...') : (editingTaxId ? 'Save Changes' : 'Create Tax Profile')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : taxes.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No tax profiles found</p>
                            <p className="text-sm mt-1">Add a new tax profile to get started.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Rate (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    {canManageTaxes && (
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {taxes.map((t) => (
                                    <tr key={t._id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>{t.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono" style={{ color: 'var(--text-main)' }}>{t.rate}%</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                                style={{ 
                                                    background: t.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', 
                                                    color: t.isActive ? '#22c55e' : '#6b7280', 
                                                    borderColor: t.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)' 
                                                }}
                                            >
                                                {t.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </td>
                                        {canManageTaxes && (
                                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setNewTax({ name: t.name, rate: t.rate });
                                                        setEditingTaxId(t._id);
                                                        setIsAddRouteActive(true);
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                                    style={{ 
                                                        background: 'var(--bg-sidebar)', 
                                                        border: '1px solid var(--border-main)',
                                                        color: 'var(--text-main)' 
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(t._id, t.isActive)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                                    style={{ 
                                                        background: 'var(--bg-sidebar)', 
                                                        border: '1px solid var(--border-main)',
                                                        color: t.isActive ? '#ef4444' : '#22c55e'
                                                    }}
                                                >
                                                    {t.isActive ? <X size={14} /> : <Check size={14} />}
                                                    {t.isActive ? 'Disable' : 'Enable'}
                                                </button>
                                            </td>
                                        )}
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

export default TaxManagement;
