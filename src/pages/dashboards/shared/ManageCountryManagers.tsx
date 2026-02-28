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
                    _id: selectedManager._id,
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
                        <Globe size={28} style={{ color: '#C8E600' }} />
                        Manage Country Managers
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Create, update, and manage country manager accounts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchManagers}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer"
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
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm"
                    style={inputStyle}
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
                ) : filteredManagers.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Globe size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No country managers found</p>
                        <p className="text-sm mt-1">Click "Add Country Manager" to create one</p>
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead>
                            <tr style={{ background: '#111111', borderBottom: '1px solid #2A2A2A' }}>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email & Phone</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Country</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">2FA</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredManagers.map((manager) => {
                                const sc = statusColor(manager.status);
                                return (
                                    <tr
                                        key={manager._id}
                                        className="transition-colors hover:bg-white/5"
                                        style={{ borderBottom: '1px solid #2A2A2A' }}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(200,230,0,0.15)', color: '#C8E600' }}>
                                                    {manager.fullName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-white">{manager.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-gray-400">{manager.email}</span>
                                                <span className="text-gray-500">{manager.phone || 'No phone'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Globe size={14} className="text-[#C8E600]" />
                                                {manager.country || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                                                {manager.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {manager.twoFactorEnabled ? (
                                                <span className="text-green-400 text-xs font-bold">Enabled</span>
                                            ) : (
                                                <span className="text-gray-600 text-xs">Disabled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            {manager.createdAt ? new Date(manager.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(manager)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(manager)}
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

            {/* Modal & Delete Confirmation */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-lg my-auto rounded-2xl p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">
                                {modalMode === 'create' ? 'Add Country Manager' : 'Edit Country Manager'}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-lg cursor-pointer text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="manager@olacars.com"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Country</label>
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
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
                                            background: '#111111',
                                            border: '1px solid #2A2A2A',
                                            color: 'white',
                                            borderRadius: '12px',
                                            fontSize: '14px'
                                        }}
                                        buttonStyle={{
                                            background: '#111111',
                                            border: '1px solid #2A2A2A',
                                            borderRadius: '12px 0 0 12px'
                                        }}
                                        dropdownStyle={{
                                            background: '#1C1C1C',
                                            color: 'white',
                                            border: '1px solid #2A2A2A'
                                        }}
                                    />
                                </div>
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
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                    style={inputStyle}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="SUSPENDED">SUSPENDED</option>
                                        <option value="LOCKED">LOCKED</option>
                                    </select>
                                </div>

                                <div className="flex flex-col justify-end">
                                    <div
                                        onClick={() => setFormData({ ...formData, twoFactorEnabled: !formData.twoFactorEnabled })}
                                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                                        style={{ border: '1px solid #2A2A2A' }}
                                    >
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.twoFactorEnabled ? 'bg-[#C8E600]' : 'bg-gray-600'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.twoFactorEnabled ? 'right-1' : 'left-1'}`} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-300">2FA Enabled</span>
                                    </div>
                                </div>
                            </div>

                            {formError && (
                                <div className="text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all bg-[#111111] border border-[#2A2A2A] text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60 bg-[#C8E600] text-[#0A0A0A]"
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

            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-sm mx-4 rounded-2xl p-6 text-center" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <Trash2 size={24} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Country Manager?</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Are you sure you want to delete <strong className="text-white">{deleteTarget.fullName}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium cursor-pointer bg-[#111111] border border-[#2A2A2A] text-gray-400"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center disabled:opacity-60 bg-[#ef4444] text-white"
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
