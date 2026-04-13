import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, BookMarked, AlertTriangle, X, Edit2, Trash2 } from 'lucide-react';
import { getAllAccountingCodes, createAccountingCode, updateAccountingCode, deleteAccountingCode } from '../../../services/accountingService';
import type { AccountingCode, CreateAccountingCodePayload, AccountingCategory } from '../../../services/accountingService';
import { getUserRole } from '../../../utils/auth';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }, // Green
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }, // Red
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }, // Blue
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' }, // Orange
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }, // Purple
};

const CATEGORIES: AccountingCategory[] = ['INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'];

const ChartOfAccounts = () => {
    const [codes, setCodes] = useState<AccountingCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddRouteActive, setIsAddRouteActive] = useState(false);
    
    // Filters
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<AccountingCategory | 'ALL'>('ALL');

    // Add Form State
    const [newCode, setNewCode] = useState<CreateAccountingCodePayload>({ code: '', name: '', category: 'INCOME' });
    const [creating, setCreating] = useState(false);

    // Edit Form State
    const [editingCode, setEditingCode] = useState<AccountingCode | null>(null);
    const [editPayload, setEditPayload] = useState<CreateAccountingCodePayload>({ code: '', name: '', category: 'INCOME' });
    const [isEditing, setIsEditing] = useState(false);

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const userRole = getUserRole() || '';
    const canManageCodes = ['admin', 'financeadmin'].includes(userRole);

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllAccountingCodes();
            setCodes(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch accounting codes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            await createAccountingCode(newCode);
            setNewCode({ code: '', name: '', category: 'INCOME' });
            setIsAddRouteActive(false);
            await fetchCodes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create accounting code');
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = (code: AccountingCode) => {
        setEditingCode(code);
        setEditPayload({ code: code.code, name: code.name, category: code.category });
        setIsAddRouteActive(false);
    };

    const handleUpdateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCode) return;
        setIsEditing(true);
        setError(null);
        try {
            const targetId = editingCode._id || (editingCode as any).id;
            await updateAccountingCode(targetId, editPayload);
            setEditingCode(null);
            await fetchCodes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update: ' + (typeof err === 'object' ? JSON.stringify(err.response?.data || err.message) : err));
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        setError(null);
        try {
            await deleteAccountingCode(deletingId);
            await fetchCodes();
            setDeletingId(null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to delete: ' + (typeof err === 'object' ? JSON.stringify(err.response?.data || err.message) : err));
            setDeletingId(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredCodes = codes.filter(c => activeCategoryFilter === 'ALL' || c.category === activeCategoryFilter);

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <BookMarked size={28} style={{ color: '#C8E600' }} />
                        Chart of Accounts
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Manage financial buckets and accounting codes</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchCodes}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {canManageCodes && !isAddRouteActive && (
                        <button
                            onClick={() => setIsAddRouteActive(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Plus size={18} /> Add Code
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

            {/* Create Form */}
            {isAddRouteActive && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Add Accounting Code</h2>
                        <button onClick={() => setIsAddRouteActive(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleCreateCode} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Code</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 4000"
                                    value={newCode.code}
                                    onChange={e => setNewCode({ ...newCode, code: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rental Income"
                                    value={newCode.name}
                                    onChange={e => setNewCode({ ...newCode, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Category</label>
                                <select
                                    required
                                    value={newCode.category}
                                    onChange={e => setNewCode({ ...newCode, category: e.target.value as AccountingCategory })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {creating ? 'Creating...' : 'Create Accounting Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Form */}
            {editingCode && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Edit Accounting Code</h2>
                        <button onClick={() => setEditingCode(null)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUpdateCode} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Code</label>
                                <input
                                    readOnly
                                    type="text"
                                    placeholder="e.g. 4000"
                                    value={editPayload.code}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors cursor-not-allowed opacity-60"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rental Income"
                                    value={editPayload.name}
                                    onChange={e => setEditPayload({ ...editPayload, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Category</label>
                                <select
                                    required
                                    value={editPayload.category}
                                    onChange={e => setEditPayload({ ...editPayload, category: e.target.value as AccountingCategory })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isEditing}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {isEditing ? 'Updating...' : 'Update Accounting Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeletingId(null)}>
                    <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                        </div>
                        <p className="text-[#A0A0A0] text-sm mb-6">
                            Are you sure you want to delete this accounting code? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Delete 
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 rounded-xl w-max" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {(['ALL', ...CATEGORIES] as const).map((cat) => {
                    const isActive = activeCategoryFilter === cat;
                    const count = cat === 'ALL' ? codes.length : codes.filter(c => c.category === cat).length;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategoryFilter(cat)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                            style={{
                                background: isActive ? 'rgba(200,230,0,0.15)' : 'transparent',
                                color: isActive ? '#C8E600' : 'var(--text-dim)',
                                fontWeight: isActive ? 700 : 500,
                            }}
                        >
                            {cat}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                background: isActive ? 'rgba(200,230,0,0.2)' : 'var(--bg-sidebar)',
                                color: isActive ? '#C8E600' : 'var(--text-dim)',
                            }}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredCodes.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <BookMarked size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No accounting codes found</p>
                            <p className="text-sm mt-1">Adjust your filters or add a new code.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Code</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Category</th>
                                    {canManageCodes && <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCodes.map((c) => {
                                    const style = CATEGORY_STYLES[c.category] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent' };
                                    const codeId = c._id || (c as any).id;
                                    return (
                                        <tr key={codeId} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-sm font-bold" style={{ color: 'var(--text-main)' }}>{c.code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{c.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                                    style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                                                    {c.category}
                                                </div>
                                            </td>
                                            {canManageCodes && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleEditClick(c)}
                                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                            style={{ color: 'var(--text-dim)' }}
                                                            title="Edit Code"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteClick(codeId)}
                                                            disabled={deletingId === codeId}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                            style={{ color: '#ef4444' }}
                                                            title="Delete Code"
                                                        >
                                                            {deletingId === codeId && isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChartOfAccounts;
