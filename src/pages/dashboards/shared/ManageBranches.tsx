import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Building2, AlertTriangle, MapPin } from 'lucide-react';
import {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    type Branch,
    type CreateBranchPayload,
    type UpdateBranchPayload,
} from '../../../services/branchService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

type ModalMode = 'create' | 'edit' | null;

const ManageBranches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        managerId: '',
        status: 'ACTIVE' as string
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllBranches();
            setBranches(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch branches');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedBranch(null);
        setFormData({
            name: '',
            code: '',
            address: '',
            city: '',
            state: '',
            phone: '',
            email: '',
            managerId: '',
            status: 'ACTIVE'
        });
        setFormError(null);
    };

    const openEditModal = (branch: Branch) => {
        setModalMode('edit');
        setSelectedBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            phone: branch.phone || '',
            email: branch.email,
            managerId: branch.managerId || '',
            status: branch.status
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedBranch(null);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === 'create') {
                const payload: CreateBranchPayload = {
                    ...formData,
                    status: formData.status as any
                };
                await createBranch(payload);
            } else if (modalMode === 'edit' && selectedBranch) {
                const payload: UpdateBranchPayload = {
                    _id: selectedBranch._id,
                    ...formData,
                    status: formData.status as any
                };
                await updateBranch(payload);
            }
            closeModal();
            fetchBranches();
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
            await deleteBranch(deleteTarget._id);
            setDeleteTarget(null);
            fetchBranches();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Delete failed');
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    const filteredBranches = branches.filter(
        (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'INACTIVE': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            case 'MAINTENANCE': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
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
                        <Building2 size={28} style={{ color: '#C8E600' }} />
                        Manage Branches
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Create and manage physical branch locations</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchBranches}
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
                        <Plus size={18} /> Add Branch
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by name, code, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
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
                ) : filteredBranches.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">No branches found</p>
                        <p className="text-sm mt-1">Click "Add Branch" to create one</p>
                    </div>
                ) : (
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead>
                            <tr style={{ background: '#111111', borderBottom: '1px solid #2A2A2A' }}>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Branch Info</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Location</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredBranches.map((branch) => {
                                const sc = statusColor(branch.status);
                                return (
                                    <tr
                                        key={branch._id}
                                        className="transition-colors border-b border-[#2A2A2A] last:border-0 hover:bg-white/[0.02]"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white">{branch.name}</span>
                                                <span className="text-xs text-[#C8E600] mt-0.5">{branch.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 max-w-[250px]">
                                                <MapPin size={14} className="text-gray-500 mt-1 flex-shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="text-gray-300 line-clamp-1">{branch.address}</span>
                                                    <span className="text-xs text-gray-500">{branch.city}, {branch.state}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col space-y-0.5">
                                                <span className="text-gray-300">{branch.email}</span>
                                                <span className="text-xs text-gray-500">{branch.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>
                                                {branch.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(branch)}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer"
                                                    style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(branch)}
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

            {/* Create / Edit Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-2xl rounded-2xl p-6 sm:p-8" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                {modalMode === 'create' ? <Plus style={{ color: '#C8E600' }} /> : <Pencil style={{ color: '#C8E600' }} />}
                                {modalMode === 'create' ? 'Add New Branch' : 'Edit Branch Detail'}
                            </h2>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-gray-500">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Branch Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Kochi Main Branch"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Branch Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        placeholder="KOCHI01"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Address</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Corporate Plaza, MG Road"
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                    style={inputStyle}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">City</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Kochi"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">State</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="Kerala"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Official Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="kochi@olacars.com"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:border-[#C8E600]"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number</label>
                                    <PhoneInput
                                        country={'in'}
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
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm cursor-pointer transition-colors focus:border-[#C8E600]"
                                    style={inputStyle}
                                >
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="INACTIVE">INACTIVE</option>
                                    <option value="MAINTENANCE">MAINTENANCE</option>
                                </select>
                            </div>

                            {formError && (
                                <div className="text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                    {formError}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-4 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5"
                                    style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-4 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60"
                                    style={{ background: '#C8E600', color: '#0A0A0A' }}
                                >
                                    {formLoading
                                        ? <div className="w-6 h-6 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                                        : modalMode === 'create' ? 'Create Branch' : 'Update Branch'
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-sm rounded-2xl p-8 text-center" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <Trash2 size={40} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Confirm Deletion</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Are you absolutely sure you want to delete <strong className="text-white">{deleteTarget.name}</strong>? All associated data will be permanently removed.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-white/5 transition-colors"
                                style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#9ca3af' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center"
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

export default ManageBranches;
