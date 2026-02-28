import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, DollarSign, AlertTriangle } from 'lucide-react';
import {
    getAllFinancialAdmins,
    createFinancialAdmin,
    updateFinancialAdmin,
    deleteFinancialAdmin,
    type FinancialAdmin,
    type CreateFinancialAdminPayload,
    type UpdateFinancialAdminPayload,
} from '../../../services/financialAdminService';

type ModalMode = 'create' | 'edit' | null;

const ManageFinancialAdmins = () => {
    const [admins, setAdmins] = useState<FinancialAdmin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<FinancialAdmin | null>(null);
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '', status: 'ACTIVE' as string });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<FinancialAdmin | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchAdmins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllFinancialAdmins();
            setAdmins(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch financial admins');
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

    const openEditModal = (admin: FinancialAdmin) => {
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
                const payload: CreateFinancialAdminPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                };
                await createFinancialAdmin(payload);
            } else if (modalMode === 'edit' && selectedAdmin) {
                const payload: UpdateFinancialAdminPayload = {
                    _id: selectedAdmin._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    status: formData.status as any,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateFinancialAdmin(payload);
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
            await deleteFinancialAdmin(deleteTarget._id);
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

    const inputStyle = {
        background: '#111111',
        border: '1px solid #2A2A2A',
        color: 'white',
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <DollarSign size={28} style={{ color: '#C8E600' }} />
                        Manage Financial Admins
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Create, update, and manage financial administrator accounts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAdmins}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                        onMouseEnter={(e) => { (e.currentTarget).style.boxShadow = '0 8px 25px rgba(200,230,0,0.3)'; (e.currentTarget).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { (e.currentTarget).style.boxShadow = 'none'; (e.currentTarget).style.transform = 'translateY(0)'; }}
                    >
                        <Plus size={18} /> Add Financial Admin
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
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm"
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                />
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-x-auto" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No financial admins found</p>
                        <p className="text-sm mt-1">Click "Add Financial Admin" to create one</p>
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[800px]">
                        <thead>
                            <tr style={{ background: '#111111', borderBottom: '1px solid #2A2A2A' }}>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">2FA</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmins.map((admin) => {
                                const sc = statusColor(admin.status);
                                return (
                                    <tr
                                        key={admin._id}
                                        className="transition-colors"
                                        style={{ borderBottom: '1px solid #2A2A2A' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,230,0,0.02)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                                                    {admin.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-white">{admin.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">{admin.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                {admin.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {admin.twoFactorEnabled ? (
                                                <span className="text-green-400 text-xs font-bold">Enabled</span>
                                            ) : (
                                                <span className="text-gray-600 text-xs">Disabled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(admin)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-lg mx-4 rounded-2xl p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {modalMode === 'create' ? 'Add Financial Admin' : 'Edit Financial Admin'}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-lg cursor-pointer" style={{ color: '#9ca3af' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="Jane Smith"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                                    style={inputStyle}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="finance@olacars.com"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                                    style={inputStyle}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Password {modalMode === 'edit' && <span className="text-gray-500">(leave blank to keep unchanged)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={modalMode === 'create'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                                    style={inputStyle}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                                    onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                                />
                            </div>

                            {modalMode === 'edit' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer"
                                        style={inputStyle}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                        <option value="LOCKED">LOCKED</option>
                                    </select>
                                </div>
                            )}

                            {formError && (
                                <div className="text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all"
                                    style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Admin?</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Are you sure you want to delete <strong className="text-white">{deleteTarget.fullName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer"
                                style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center disabled:opacity-60"
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

export default ManageFinancialAdmins;
