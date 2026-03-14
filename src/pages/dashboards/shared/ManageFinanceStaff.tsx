import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, ShieldCheck, Mail, Phone, Building2, AlertTriangle } from 'lucide-react';
import {
    getAllFinanceStaff,
    createFinanceStaff,
    updateFinanceStaff,
    deleteFinanceStaff,
    type FinanceStaff,
    type CreateFinanceStaffPayload,
    type UpdateFinanceStaffPayload,
} from '../../../services/financeStaffService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageFinanceStaff = () => {
    const [financeStaff, setFinanceStaff] = useState<FinanceStaff[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedStaff, setSelectedStaff] = useState<FinanceStaff | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        branchId: '',
        status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'LOCKED',
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<FinanceStaff | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [staffData, branchesData] = await Promise.all([
                getAllFinanceStaff(),
                getAllBranches()
            ]);
            setFinanceStaff(Array.isArray(staffData) ? staffData : []);
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
        setSelectedStaff(null);
        setFormData({
            fullName: '',
            email: '',
            password: '',
            phone: '',
            branchId: '',
            status: 'ACTIVE',
        });
        setFormError(null);
    };

    const openEditModal = (staff: FinanceStaff) => {
        setModalMode('edit');
        setSelectedStaff(staff);
        setFormData({
            fullName: staff.fullName,
            email: staff.email,
            password: '',
            phone: staff.phone || '',
            branchId: typeof staff.branchId === 'object' ? staff.branchId?._id || '' : staff.branchId,
            status: staff.status,
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedStaff(null);
        setFormError(null);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateFinanceStaffPayload = {
                    fullName: formData.fullName,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    branchId: formData.branchId,
                    status: formData.status
                };
                await createFinanceStaff(payload);
            } else if (modalMode === 'edit' && selectedStaff) {
                const payload: UpdateFinanceStaffPayload = {
                    id: selectedStaff._id,
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    branchId: formData.branchId,
                    status: formData.status,
                };
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateFinanceStaff(payload);
                console.log(payload);

            }
            fetchData();
            closeModal();
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
            await deleteFinanceStaff(deleteTarget._id);
            fetchData();
            setDeleteTarget(null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredStaff = financeStaff.filter(staff =>
        staff.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 transition-colors duration-300" style={{ background: 'var(--bg-main)' }}>
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <ShieldCheck size={28} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                        Manage Finance Staff
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>Create, update, and manage branch finance staff accounts</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 rounded-xl border transition-all hover:bg-lime/5 disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title="Refresh data"
                        disabled={loading}
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        <Plus size={20} /> Add Finance Staff
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>Total Staff</p>
                    <h3 className="text-3xl font-black transition-colors" style={{ color: 'var(--text-main)' }}>{financeStaff.length}</h3>
                </div>
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>Active Accounts</p>
                    <h3 className="text-3xl font-black text-lime transition-colors" style={{ color: 'var(--brand-lime)' }}>{financeStaff.filter(s => s.status === 'ACTIVE').length}</h3>
                </div>
                <div className="p-5 rounded-2xl border transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-xs uppercase font-black tracking-widest transition-colors mb-1" style={{ color: 'var(--text-dim)' }}>Total Branches</p>
                    <h3 className="text-3xl font-black transition-colors" style={{ color: 'var(--text-main)' }}>{branches.length}</h3>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 rounded-2xl border mb-6 flex flex-col md:flex-row gap-4 transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" size={18} style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden transition-colors shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-bottom text-xs uppercase font-black tracking-wider transition-colors" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                <th className="px-6 py-4">Full Name</th>
                                <th className="px-6 py-4">Contact Info</th>
                                <th className="px-6 py-4">Branch</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <RefreshCw size={24} className="animate-spin inline-block mb-2 text-lime" />
                                        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Loading finance staff...</p>
                                    </td>
                                </tr>
                            ) : filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>No staff found.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((staff) => (
                                    <tr key={staff._id} className="hover:bg-black/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold font-medium" style={{ color: 'var(--text-main)' }}>{staff.fullName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                                                    <Mail size={14} style={{ color: 'var(--text-dim)' }} />
                                                    {staff.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                    <Phone size={14} />
                                                    {staff.phone || 'No phone'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                                                <Building2 size={16} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                                {typeof staff.branchId === 'object' ? staff.branchId?.name : (branches.find(b => b._id === staff.branchId)?.name || staff.branchId)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${staff.status === 'ACTIVE' ? 'bg-lime/10 text-lime' :
                                                staff.status === 'SUSPENDED' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {staff.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(staff)}
                                                    className="p-2 rounded-lg hover:bg-lime/10 transition-colors"
                                                    style={{ color: 'var(--text-dim)' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(staff)}
                                                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-6 right-6 flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-500 text-white shadow-2xl animate-slide-up z-[100]">
                    <AlertTriangle size={20} />
                    <span className="font-bold text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-4 hover:scale-110 active:scale-95 transition-transform">
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
                    <div
                        className="relative w-full max-w-xl p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black transition-colors uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    {modalMode === 'create' ? 'Add Finance Staff' : 'Edit Finance Staff'}
                                </h2>
                                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                                    {modalMode === 'create' ? 'Create a new branch finance staff account' : `Update account for ${selectedStaff?.fullName}`}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="p-2 rounded-full hover:bg-black/10 transition-transform hover:rotate-90"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl text-sm flex items-center gap-3 font-medium">
                                <AlertTriangle size={18} />
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleFormSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        placeholder="Enter full name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {modalMode === 'create' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                required
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                            Phone Number
                                        </label>
                                        <PhoneInput
                                            country={'in'}
                                            value={formData.phone}
                                            onChange={phone => setFormData({ ...formData, phone })}
                                            containerStyle={{ width: '100%' }}
                                            inputStyle={{
                                                width: '100%',
                                                height: '48px',
                                                borderRadius: '12px',
                                                background: 'var(--bg-input)',
                                                border: '1px solid var(--border-main)',
                                                color: 'var(--text-main)'
                                            }}
                                            buttonStyle={{
                                                background: 'var(--bg-input)',
                                                border: '1px solid var(--border-main)',
                                                borderRadius: '12px 0 0 12px'
                                            }}
                                            dropdownStyle={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        Assigned Branch
                                    </label>
                                    <select
                                        required
                                        value={formData.branchId}
                                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">Select a branch</option>
                                        {branches.map(branch => (
                                            <option key={branch._id} value={branch._id}>{branch.name} ({branch.city})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest px-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                                        Account Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                        className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="LOCKED">Locked</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:bg-black/5"
                                    style={{ color: 'var(--text-dim)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-lg disabled:opacity-50"
                                    style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                                >
                                    {formLoading ? <RefreshCw className="animate-spin" size={18} /> : (modalMode === 'create' ? 'Create Staff' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div
                        className="relative w-full max-w-sm p-8 rounded-3xl border shadow-2xl transition-all animate-in zoom-in-95 duration-200 text-center"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h2 className="text-xl font-black mb-2 transition-colors uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>Delete Account?</h2>
                        <p className="text-sm mb-8 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            Are you sure you want to delete <span className="font-bold text-red-400">{deleteTarget.fullName}</span>? This action cannot be undone.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="w-full py-3.5 rounded-xl bg-red-500 text-white font-black text-sm transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
                            >
                                {deleteLoading ? <RefreshCw className="animate-spin inline mr-2" size={18} /> : 'YES, PERMANENTLY DELETE'}
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:bg-black/5"
                                style={{ color: 'var(--text-dim)' }}
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageFinanceStaff;
