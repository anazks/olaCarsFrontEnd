import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Shield, AlertTriangle } from 'lucide-react';
import {
    getAllOperationalAdmins,
    createOperationalAdmin,
    updateOperationalAdmin,
    deleteOperationalAdmin,
    type OperationalAdmin,
    type CreateOperationalAdminPayload,
    type UpdateOperationalAdminPayload,
} from '../../../services/operationalAdminService';

type ModalMode = 'create' | 'edit' | null;

const ManageOperationalAdmins = () => {
    const [admins, setAdmins] = useState<OperationalAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<OperationalAdmin | null>(null);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', status: 'ACTIVE' as string });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<OperationalAdmin | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllOperationalAdmins();
            setAdmins(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch operational admins');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedAdmin(null);
        setFormData({ fullName: '', email: '', password: '', status: 'ACTIVE' });
        setFormError(null);
    };

    const openEditModal = (admin: OperationalAdmin) => {
        setModalMode('edit');
        setSelectedAdmin(admin);
        setFormData({
            fullName: admin.fullName,
            email: admin.email,
            password: '',
            status: admin.status,
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedAdmin(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateOperationalAdminPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                };
                await createOperationalAdmin(payload);
            } else if (modalMode === 'edit' && selectedAdmin) {
                const payload: UpdateOperationalAdminPayload = {
                    _id: selectedAdmin._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    status: formData.status as any,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateOperationalAdmin(payload);
            }
            closeModal();
            fetchAdmins();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || 'Operation failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteOperationalAdmin(deleteTarget._id);
            setDeleteTarget(null);
            fetchAdmins();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredAdmins = admins.filter(
        (a) =>
            a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'SUSPENDED': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
            case 'LOCKED': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <Shield size={28} style={{ color: 'var(--lime)' }} />
                        Manage Operational Admins
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>Create, update, and manage operational administrator accounts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAdmins}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        <Plus size={18} /> Add Operational Admin
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                />
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm transition-colors" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-x-auto transition-colors" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--lime)', borderTopColor: 'transparent' }} />
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="text-center py-20 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <Shield size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No operational admins found</p>
                        <p className="text-sm mt-1">Click "Add Operational Admin" to create one</p>
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr className="transition-colors" style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-main)' }}>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>Email</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>Status</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>2FA</th>
                                <th className="text-left px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>Created</th>
                                <th className="text-right px-6 py-4 text-xs font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            {filteredAdmins.map((admin) => {
                                const sc = statusColor(admin.status);
                                return (
                                    <tr
                                        key={admin._id}
                                        className="transition-colors hover:bg-lime/5"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors" style={{ background: 'rgba(200,230,0,0.15)', color: 'var(--lime)' }}>
                                                    {admin.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium transition-colors" style={{ color: 'var(--text-main)' }}>{admin.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 transition-colors" style={{ color: 'var(--text-dim)' }}>{admin.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold transition-colors" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                {admin.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {admin.twoFactorEnabled ? (
                                                <span className="text-green-400 text-xs font-bold">Enabled</span>
                                            ) : (
                                                <span className="text-xs transition-colors" style={{ color: 'var(--text-dim)', opacity: 0.5 }}>Disabled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-blue-500/20"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-red-500/20"
                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ───── Create / Edit Modal ───── */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-lg mx-4 rounded-2xl p-6 border shadow-2xl transition-colors animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold transition-colors" style={{ color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? 'Add Operational Admin' : 'Edit Operational Admin'}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5" style={{ color: 'var(--text-dim)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="admin@olacars.com"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>
                                    Password {modalMode === 'edit' && <span className="opacity-50">(leave blank to keep unchanged)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={modalMode === 'create'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {modalMode === 'edit' && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                        <option value="LOCKED">LOCKED</option>
                                    </select>
                                </div>
                            )}

                            {formError && (
                                <div className="text-red-400 text-sm p-3 rounded-xl transition-colors" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5 border"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0A0A0A', borderTopColor: 'transparent' }} />
                                        : modalMode === 'create' ? 'Create Admin' : 'Save Changes'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ───── Delete Confirmation Modal ───── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center border shadow-2xl transition-colors animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold transition-colors mb-2" style={{ color: 'var(--text-main)' }}>Delete Admin?</h3>
                        <p className="text-sm transition-colors mb-6" style={{ color: 'var(--text-dim)' }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.fullName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5 border"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center disabled:opacity-60 transition-all hover:bg-red-600 shadow-lg hover:-translate-y-0.5"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deleteLoading
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : 'Delete'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageOperationalAdmins;
