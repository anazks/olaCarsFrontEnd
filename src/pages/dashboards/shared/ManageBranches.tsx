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
        country: 'Panama',
        managerId: '',
        status: 'ACTIVE' as string
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Common countries list
    const countries = [
        "Panama", "United States", "United Kingdom", "Canada", "Australia", "Germany",
        "France", "India", "Nigeria", "South Africa", "United Arab Emirates"
    ];

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
            country: 'Panama',
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
            country: branch.country || 'Panama',
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
                    id: selectedBranch._id,
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
            b.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.country && b.country.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const statusColor = (s: string) => {
        switch (s) {
            case 'ACTIVE': return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' };
            case 'INACTIVE': return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' };
            case 'MAINTENANCE': return { bg: 'rgba(234,179,8,0.1)', text: '#eab308', border: 'rgba(234,179,8,0.3)' };
            default: return { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Building2 size={28} style={{ color: '#C8E600' }} />
                        Manage Branches
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Create and manage physical branch locations</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchBranches}
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
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
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
                    ) : filteredBranches.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No branches found</p>
                            <p className="text-sm mt-1">Click "Add Branch" to create one</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch Info</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Location</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBranches.map((branch) => {
                                    const sc = statusColor(branch.status);
                                    return (
                                        <tr
                                            key={branch._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold font-medium" style={{ color: 'var(--text-main)' }}>{branch.name}</div>
                                                <div className="text-xs" style={{ color: '#C8E600' }}>{branch.code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-2 max-w-[250px]">
                                                    <MapPin size={14} className="mt-1 flex-shrink-0" style={{ color: 'var(--text-dim)' }} />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm line-clamp-1" style={{ color: 'var(--text-main)' }}>{branch.address}</span>
                                                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{branch.city}, {branch.state}, {branch.country}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm" style={{ color: 'var(--text-main)' }}>{branch.email}</div>
                                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{branch.phone}</div>
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
                                                        className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-blue-500/20"
                                                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(branch)}
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(8px)"
                    }}
                >

                    <div
                        className="rounded-2xl p-5 max-w-5xl w-full mx-2 relative border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-main)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-4">
                            <h2
                                className="text-xl font-semibold"
                                style={{ color: "var(--text-main)" }}
                            >
                                {modalMode === "create"
                                    ? "Add New Branch"
                                    : "Edit Branch Detail"}
                            </h2>

                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-white/10 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* GRID SECTION */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                {/* Branch Name */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        Branch Name
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="Kochi Main"
                                    />
                                </div>

                                {/* Code */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        Branch Code
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.code}
                                        onChange={(e) =>
                                            setFormData({ ...formData, code: e.target.value })
                                        }
                                        placeholder="KOCHI01"
                                    />
                                </div>

                                {/* City */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        City
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.city}
                                        onChange={(e) =>
                                            setFormData({ ...formData, city: e.target.value })
                                        }
                                        placeholder="Kochi"
                                    />
                                </div>

                                {/* State */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        State
                                    </label>

                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.state}
                                        onChange={(e) =>
                                            setFormData({ ...formData, state: e.target.value })
                                        }
                                        placeholder="Kerala"
                                    />
                                </div>

                                {/* Country */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        Country
                                    </label>

                                    <select
                                        value={formData.country}
                                        onChange={(e) =>
                                            setFormData({ ...formData, country: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                    >
                                        {countries.map(c => (
                                            <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Email */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        Official Email
                                    </label>

                                    <input
                                        type="email"
                                        required
                                        className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                        style={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)"
                                        }}
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        placeholder="branch@olacars.com"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium"
                                        style={{ color: "var(--text-dim)" }}>
                                        Phone
                                    </label>

                                    <PhoneInput
                                        country={"in"}
                                        value={formData.phone}
                                        onChange={(phone) =>
                                            setFormData({ ...formData, phone })
                                        }
                                        containerStyle={{ width: "100%" }}
                                        inputStyle={{
                                            width: "100%",
                                            height: "36px",
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)",
                                            color: "var(--text-main)",
                                            borderRadius: "8px",
                                            fontSize: "14px"
                                        }}
                                        buttonStyle={{
                                            background: "var(--bg-input)",
                                            border: "1px solid var(--border-main)"
                                        }}
                                    />
                                </div>

                            </div>

                            {/* ADDRESS FULL WIDTH */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={{ color: "var(--text-dim)" }}>
                                    Full Address
                                </label>

                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-main)"
                                    }}
                                    value={formData.address}
                                    onChange={(e) =>
                                        setFormData({ ...formData, address: e.target.value })
                                    }
                                    placeholder="MG Road"
                                />
                            </div>

                            {/* STATUS */}
                            <div className="space-y-1">
                                <label
                                    className="text-xs font-medium"
                                    style={{ color: "var(--text-dim)" }}>
                                    Status
                                </label>

                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({ ...formData, status: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-lime"
                                    style={{
                                        background: "var(--bg-input)",
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-main)"
                                    }}
                                >
                                    <option>ACTIVE</option>
                                    <option>INACTIVE</option>
                                    <option>MAINTENANCE</option>
                                </select>
                            </div>

                            {/* ERROR */}
                            {formError && (
                                <div
                                    className="p-3 rounded-lg text-sm"
                                    style={{
                                        background: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                        color: "#ef4444"
                                    }}
                                >
                                    {formError}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex gap-3 pt-2">

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 rounded-lg text-sm"
                                    style={{
                                        border: "1px solid var(--border-main)",
                                        color: "var(--text-dim)"
                                    }}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-2.5 rounded-lg font-semibold flex justify-center items-center"
                                    style={{
                                        background: "#C8E600",
                                        color: "#0A0A0A"
                                    }}
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        modalMode === "create"
                                            ? "Create Branch"
                                            : "Update Branch"
                                    )}
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
                            Are you absolutely sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteTarget.name}</strong>? All associated data will be permanently removed.
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

export default ManageBranches;
