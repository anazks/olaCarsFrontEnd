import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Globe, AlertTriangle } from 'lucide-react';
import {
    getAllCountryManagers,
    createCountryManager,
    updateCountryManager,
    deleteCountryManager,
    type CountryManager,
    type CreateCountryManagerPayload,
    type UpdateCountryManagerPayload,
} from '../../../services/countryManagerService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageCountryManagers = () => {
    const [managers, setManagers] = useState<CountryManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedManager, setSelectedManager] = useState<CountryManager | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        country: 'Panama',
        status: 'ACTIVE' as string,
        twoFactorEnabled: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Common countries list
    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<CountryManager | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchManagers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllCountryManagers();
            setManagers(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch country managers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchManagers();
    }, [fetchManagers]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedManager(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            country: 'Panama',
            status: 'ACTIVE',
            twoFactorEnabled: true
        });
        setFormError(null);
    };

    const openEditModal = (manager: CountryManager) => {
        setModalMode('edit');
        setSelectedManager(manager);
        setFormData({
            fullName: manager.fullName,
            email: manager.email,
            password: '',
            phone: manager.phone || '',
            country: manager.country || 'Panama',
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
                const payload: CreateCountryManagerPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    country: formData.country,
                    status: formData.status as any,
                    twoFactorEnabled: formData.twoFactorEnabled
                };
                await createCountryManager(payload);
            } else if (modalMode === 'edit' && selectedManager) {
                const payload: UpdateCountryManagerPayload = {
                    id: selectedManager._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    country: formData.country,
                    status: formData.status as any,
                    twoFactorEnabled: formData.twoFactorEnabled
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateCountryManager(payload);
            }
            closeModal();
            fetchManagers();
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
            await deleteCountryManager(deleteTarget._id);
            setDeleteTarget(null);
            fetchManagers();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredManagers = managers.filter(
        (m) =>
            m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (m.country && m.country.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Globe size={28} style={{ color: '#C8E600' }} />
                        Manage Country Managers
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Create, update, and manage country manager accounts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchManagers}
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
                        <Plus size={18} /> Add Country Manager
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by name, email, or country..."
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
                            <Globe size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No country managers found</p>
                            <p className="text-sm mt-1">Click "Add Country Manager" to create one</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Email & Phone</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Country</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>2FA</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Created</th>
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
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(200,230,0,0.15)', color: '#C8E600' }}>
                                                        {manager.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium" style={{ color: 'var(--text-main)' }}>{manager.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs space-y-0.5">
                                                    <span style={{ color: 'var(--text-main)' }}>{manager.email}</span>
                                                    <span style={{ color: 'var(--text-dim)' }}>{manager.phone || 'No phone'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    <Globe size={14} style={{ color: '#C8E600' }} />
                                                    {manager.country || '—'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                    {manager.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {manager.twoFactorEnabled ? (
                                                    <span className="text-xs font-bold" style={{ color: '#22c55e' }}>Enabled</span>
                                                ) : (
                                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Disabled</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString() : '—'}
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
                        className="rounded-3xl p-8 max-w-lg w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                                {modalMode === 'create' ? 'Add Country Manager' : 'Edit Country Manager'}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
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
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Email</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="manager@olacars.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Country</label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Phone Number</label>
                                    <PhoneInput
                                        country={({
                                            "Panama": "pa",
                                            "United States": "us",
                                            "United Kingdom": "gb",
                                            "Canada": "ca",
                                            "Australia": "au",
                                            "Germany": "de",
                                            "France": "fr",
                                            "India": "in",
                                            "Nigeria": "ng",
                                            "South Africa": "za",
                                            "United Arab Emirates": "ae"
                                        } as Record<string, string>)[formData.country] || 'pa'}
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

                            {modalMode === 'create' && (
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="ACTIVE" style={{ background: 'var(--bg-card)' }}>ACTIVE</option>
                                        <option value="SUSPENDED" style={{ background: 'var(--bg-card)' }}>SUSPENDED</option>
                                        <option value="LOCKED" style={{ background: 'var(--bg-card)' }}>LOCKED</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl transition-all hover:bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={formData.twoFactorEnabled}
                                                onChange={(e) => setFormData({ ...formData, twoFactorEnabled: e.target.checked })}
                                            />
                                            <div className={`w-10 h-5 rounded-full transition-colors ${formData.twoFactorEnabled ? 'bg-[#C8E600]' : 'bg-gray-600'}`}></div>
                                            <div className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>2FA Enabled</span>
                                    </label>
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                    style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center disabled:opacity-60"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                                        : modalMode === 'create' ? 'Create Manager' : 'Save Changes'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-sm w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors text-center"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={28} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Delete Country Manager?</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.fullName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center"
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

export default ManageCountryManagers;
