import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, UserCheck, AlertTriangle, Building2, ShieldCheck, Mail, Phone } from 'lucide-react';
import {
    getAllBranchManagers,
    createBranchManager,
    updateBranchManager,
    deleteBranchManager,
    type BranchManager,
    type CreateBranchManagerPayload,
    type UpdateBranchManagerPayload,
} from '../../../services/branchManagerService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageBranchManagers = () => {
    const [branchManagers, setBranchManagers] = useState<BranchManager[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedManager, setSelectedManager] = useState<BranchManager | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        branchId: '',
        status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
        twoFactorEnabled: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<BranchManager | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [managersData, branchesData] = await Promise.all([
                getAllBranchManagers(),
                getAllBranches()
            ]);
            setBranchManagers(Array.isArray(managersData) ? managersData : []);
            setBranches(Array.isArray(branchesData) ? branchesData : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedManager(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            branchId: '',
            status: 'ACTIVE',
            twoFactorEnabled: true
        });
        setFormError(null);
    };

    const openEditModal = (manager: BranchManager) => {
        setModalMode('edit');
        setSelectedManager(manager);
        setFormData({
            fullName: manager.fullName,
            email: manager.email,
            password: '',
            phone: manager.phone || '',
            branchId: manager.branchId,
            status: manager.status,
            twoFactorEnabled: manager.twoFactorEnabled
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedManager(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateBranchManagerPayload = {
                    ...formData,
                };
                await createBranchManager(payload);
            } else if (modalMode === 'edit' && selectedManager) {
                const payload: UpdateBranchManagerPayload = {
                    _id: selectedManager._id,
                    ...formData,
                };
                if (!payload.password) delete payload.password;

                await updateBranchManager(payload);
            }
            closeModal();
            fetchData();
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
            await deleteBranchManager(deleteTarget._id);
            setDeleteTarget(null);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredManagers = branchManagers.filter(
        (m) =>
            m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getBranchName = (branchId: string) => {
        const branch = branches.find(b => b._id === branchId);
        return branch ? branch.name : 'Unknown Branch';
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'INACTIVE': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <UserCheck size={28} style={{ color: '#C8E600' }} />
                        Manage Branch Managers
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Create and manage accounts for branch managers</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        <Plus size={18} /> Add Manager
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                />
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
                    ) : filteredManagers.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <UserCheck size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No branch managers found</p>
                            <p className="text-sm mt-1">Click "Add Manager" to create one</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Manager Info</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>2FA</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredManagers.map((manager) => {
                                    const sc = statusColor(manager.status);
                                    return (
                                        <tr
                                            key={manager._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold font-medium" style={{ color: 'var(--text-main)' }}>{manager.fullName}</span>
                                                    {/* <span className="text-xs" style={{ color: '#C8E600' }}>Manager ID: {manager._id.slice(-6)}</span> */}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} style={{ color: 'var(--text-dim)' }} />
                                                    <span style={{ color: 'var(--text-main)' }}>{getBranchName(manager.branchId)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col space-y-1">
                                                    <div className="flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                        <Mail size={12} style={{ color: 'var(--text-dim)' }} />
                                                        <span>{manager.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                        <Phone size={12} />
                                                        <span>{manager.phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                    {manager.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={16} style={{ color: manager.twoFactorEnabled ? '#22c55e' : 'var(--text-dim)' }} />
                                                    <span className="text-sm" style={{ color: manager.twoFactorEnabled ? '#22c55e' : 'var(--text-dim)' }}>
                                                        {manager.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(manager)}
                                                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-blue-500/20"
                                                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(manager)}
                                                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-red-500/20"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
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
            </div>

            {/* Modals */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-2xl w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? 'Add Branch Manager' : 'Edit Branch Manager'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@olacars.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                        {modalMode === 'create' ? 'Password' : 'New Password (Optional)'}
                                    </label>
                                    <input
                                        type="password"
                                        required={modalMode === 'create'}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Phone Number</label>
                                    <PhoneInput
                                        country={'in'}
                                        value={formData.phone}
                                        onChange={(phone) => setFormData({ ...formData, phone })}
                                        containerStyle={{ width: '100%' }}
                                        inputStyle={{
                                            width: '100%',
                                            height: '46px',
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-main)',
                                            color: 'var(--text-main)',
                                            borderRadius: '12px',
                                            fontSize: '14px'
                                        }}
                                        buttonStyle={{
                                            background: 'var(--bg-input)',
                                            border: '1px solid var(--border-main)',
                                            borderRadius: '12px 0 0 12px'
                                        }}
                                        dropdownStyle={{
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            border: '1px solid var(--border-main)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Assign Branch</label>
                                <select
                                    required
                                    value={formData.branchId}
                                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="" style={{ background: 'var(--bg-card)' }}>Select a branch</option>
                                    {branches.map((branch) => (
                                        <option key={branch._id} value={branch._id} style={{ background: 'var(--bg-card)' }}>
                                            {branch.name} ({branch.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="ACTIVE" style={{ background: 'var(--bg-card)' }}>ACTIVE</option>
                                        <option value="INACTIVE" style={{ background: 'var(--bg-card)' }}>INACTIVE</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={formData.twoFactorEnabled}
                                                onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                                            />
                                            <div className={`w-12 h-6 rounded-full transition-colors ${formData.twoFactorEnabled ? 'bg-[#C8E600]' : 'bg-gray-600'}`}></div>
                                            <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-medium group-hover:opacity-80 transition-opacity" style={{ color: 'var(--text-main)' }}>Two-Factor Authentication</span>
                                    </label>
                                </div>
                            </div>

                            {formError && (
                                <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-4 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                    style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-60"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-6 h-6 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                                        : modalMode === 'create' ? 'Create Manager' : 'Update Manager'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-md w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <Trash2 size={40} style={{ color: '#ef4444' }} />
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-3" style={{ color: 'var(--text-main)' }}>Confirm Deletion</h2>
                        <p className="text-center mb-8" style={{ color: 'var(--text-dim)' }}>
                            Are you absolutely sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.fullName}</strong>? This will permanently disable their access to the system.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deleteLoading
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : 'Confirm Delete'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBranchManagers;
